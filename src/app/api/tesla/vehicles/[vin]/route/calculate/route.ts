import { NextRequest, NextResponse } from "next/server";
import { getVehicleData } from "@/lib/tesla/client";
import { readTeslaSession } from "@/lib/tesla/session";

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

function haversine(a: [number, number], b: [number, number]) {
  const R = 3958.8;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function osrmRoute(a: [number, number], b: [number, number]) {
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`);
    const json = await res.json();
    const r = json?.routes?.[0];
    if (!r) return { geometry: [] as [number, number][], miles: 0 };
    return {
      geometry: (r.geometry?.coordinates || []).map((c: number[]) => [c[1], c[0]] as [number, number]),
      miles: (r.distance || 0) / 1609.34,
    };
  } catch {
    return { geometry: [] as [number, number][], miles: haversine(a, b) };
  }
}

async function geocode(q: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, { headers: { "User-Agent": "TripMapper/1.0" } });
    const json = await res.json();
    if (Array.isArray(json) && json[0]) return [parseFloat(json[0].lat), parseFloat(json[0].lon)];
  } catch {}
  return null;
}

async function findCharger(lat: number, lon: number): Promise<{ name: string; lat: number; lon: number } | null> {
  if (!GOOGLE_KEY) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.displayName,places.location,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: "Tesla Supercharger",
        locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: 48280 } },
        maxResultCount: 1,
      }),
    });
    const json = await res.json();
    const r = json?.places?.[0];
    if (r) return { name: r.formattedAddress || r.displayName?.text || "Tesla Supercharger", lat: r.location.latitude, lon: r.location.longitude };
  } catch {}
  return null;
}

function pointAtDistance(geometry: [number, number][], targetMiles: number): [number, number] {
  if (geometry.length < 2) return geometry[0] || [0, 0];
  let acc = 0;
  for (let i = 1; i < geometry.length; i++) {
    const seg = haversine(geometry[i - 1], geometry[i]);
    if (acc + seg >= targetMiles) {
      const remain = targetMiles - acc;
      const t = seg > 0 ? remain / seg : 0;
      return [geometry[i - 1][0] + (geometry[i][0] - geometry[i - 1][0]) * t, geometry[i - 1][1] + (geometry[i][1] - geometry[i - 1][1]) * t];
    }
    acc += seg;
  }
  return geometry[geometry.length - 1];
}

export async function POST(request: NextRequest, context: { params: Promise<{ vin: string }> }) {
  if (!(await readTeslaSession())) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { vin } = await context.params;
  const body = (await request.json()) as { destination?: string };
  const destination = body.destination || "";

  try {
    const vehicleData = await getVehicleData(vin);
    if (!vehicleData) throw new Error("Failed to get vehicle data");

    const vLat = vehicleData.drive_state?.latitude;
    const vLon = vehicleData.drive_state?.longitude;
    const batteryLevel = vehicleData.charge_state?.battery_level ?? 0;
    const batteryRange = vehicleData.charge_state?.battery_range ?? 0;
    const minDestPercent = 20;
    const maxChargePercent = 80;

    const dest = await geocode(destination);
    if (!dest) return NextResponse.json({ error: "Could not geocode destination" }, { status: 400 });

    const start: [number, number] = [vLat as number, vLon as number];
    const usableMiles = batteryRange * ((batteryLevel - minDestPercent) / 100);

    const stops: Array<{ name: string; type: string; lat?: number; lon?: number; batteryAtArrival?: number; chargeToPercent?: number; chargeMinutes?: number; distance?: number }> = [];
    stops.push({ name: "Current Location", type: "start_point", lat: vLat, lon: vLon, batteryAtArrival: batteryLevel });

    let geometry: [number, number][] = [];
    let current: [number, number] = start;
    let currentBattery = batteryLevel;
    let currentRange = batteryRange;
    let remainingRoute = await osrmRoute(current, dest);
    let remainingMiles = remainingRoute.miles;
    let guard = 0;

    while (remainingMiles > (currentRange * ((currentBattery - minDestPercent) / 100)) && guard < 8) {
      guard++;
      const usable = currentRange * ((currentBattery - minDestPercent) / 100);
      const targetPoint = pointAtDistance(remainingRoute.geometry, usable);
      const charger = await findCharger(targetPoint[0], targetPoint[1]);
      if (!charger) break;
      const chargerLoc: [number, number] = [charger.lat, charger.lon];
      const r1 = await osrmRoute(current, chargerLoc);
      const r2 = await osrmRoute(chargerLoc, dest);
      geometry = geometry.length ? [...geometry, ...r1.geometry.slice(1), ...r2.geometry.slice(1)] : [...r1.geometry, ...r2.geometry.slice(1)];
      const milesToCharger = r1.miles;
      const batteryAtCharger = Math.max(minDestPercent, currentBattery - (milesToCharger / currentRange) * 100);
      const chargeNeeded = maxChargePercent - batteryAtCharger;
      const chargeMinutes = Math.round(chargeNeeded * 1.5);
      stops.push({
        name: charger.name,
        type: "charging_stop",
        lat: charger.lat,
        lon: charger.lon,
        batteryAtArrival: Math.round(batteryAtCharger),
        chargeToPercent: maxChargePercent,
        chargeMinutes,
        distance: milesToCharger,
      });
      current = chargerLoc;
      currentBattery = maxChargePercent;
      currentRange = batteryRange * (maxChargePercent / batteryLevel || 1);
      remainingRoute = await osrmRoute(current, dest);
      remainingMiles = remainingRoute.miles;
    }

    if (geometry.length === 0) geometry = remainingRoute.geometry;
    stops.push({ name: destination, type: "destination", lat: dest[0], lon: dest[1], batteryAtArrival: Math.round(currentBattery - (remainingMiles / currentRange) * 100) });

    return NextResponse.json({ routeWithStops: stops, routeGeometry: geometry, distanceMiles: remainingMiles, batteryRange });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate route";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}