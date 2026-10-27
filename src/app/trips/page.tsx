"use client";

import { useEffect, useRef, useState } from "react";
import type { TeslaVehicle, VehicleData } from "@/lib/tesla/types";

type Stop = { name: string; type: string; distance?: number; lat?: number; lon?: number; batteryAtArrival?: number; chargeToPercent?: number; chargeMinutes?: number };

function TripPlanner() {
  const [vehicles, setVehicles] = useState<TeslaVehicle[]>([]);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [selectedVin, setSelectedVin] = useState<string>("");
  const [routeWithStops, setRouteWithStops] = useState<Stop[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/tesla/vehicles");
        if (!response.ok) throw new Error(`Failed to fetch vehicles: ${response.status}`);
        const data = await response.json();
        setVehicles(data.vehicles || []);
        if (data.vehicles && data.vehicles.length > 0) setSelectedVin(data.vehicles[0].vin);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
        setError("Failed to fetch Tesla vehicles");
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!selectedVin) return;
    fetch(`/api/tesla/vehicles/${selectedVin}`)
      .then((r) => r.json())
      .then((d) => setVehicleData(d.vehicle || null))
      .catch(() => setVehicleData(null));
  }, [selectedVin]);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tryRender = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || routeWithStops.length === 0) return false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      const points = routeWithStops.filter((s) => s.lat != null && s.lon != null);
      if (points.length === 0) return true;
      const map = L.map(mapRef.current);
      mapInstance.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
    points.forEach((s) => {
      const ll: [number, number] = [s.lat as number, s.lon as number];
      L.marker(ll).addTo(map).bindPopup(`${s.name} (${s.type})`).bindTooltip(s.name, { permanent: true, direction: "top" });
    });
    const latlngs: [number, number][] = routeGeometry.length > 1 ? routeGeometry : points.map((s) => [s.lat as number, s.lon as number]);
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "blue" }).addTo(map);
      }
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
      return true;
    };
    if (tryRender()) return;
    const interval = setInterval(() => {
      if (cancelled) return;
      if (tryRender()) clearInterval(interval);
    }, 300);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [routeWithStops, routeGeometry]);

  const calculateRoute = async (destination: string) => {
    if (!selectedVin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tesla/vehicles/${selectedVin}/route/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      if (!response.ok) throw new Error(`Failed to calculate route: ${response.status}`);
      const data = await response.json();
      setRouteWithStops(data.routeWithStops || []);
      setRouteGeometry(data.routeGeometry || []);
    } catch (err) {
      console.error("Error calculating route:", err);
      setError("Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const destination = formData.get("destination") as string;
    if (destination) calculateRoute(destination);
  };

  return (
    <main className="container">
      <h1>Trip Planner</h1>
      {error && <div className="error">{error}</div>}
      {vehicleData && (
        <section className="panel">
          <h2>Vehicle Details</h2>
          <p><strong>Name:</strong> {selectedVin}</p>
          <p><strong>Location:</strong> {vehicleData.drive_state?.latitude}, {vehicleData.drive_state?.longitude}</p>
          <p><strong>Battery:</strong> {vehicleData.charge_state?.battery_level}% ({vehicleData.charge_state?.battery_range} mi range)</p>
          <p><strong>Charging:</strong> {vehicleData.charge_state?.charging_state}</p>
          <p><strong>Efficiency:</strong> not available from Tesla API</p>
          {vehicleData.drive_state?.latitude != null && vehicleData.drive_state?.longitude != null && (
            <iframe
              title="Vehicle location"
              width="100%"
              height="250"
              style={{ border: 0, marginTop: 8 }}
              loading="lazy"
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAHQLKvRaSvYzWmIk0TuTigKp8RkjndAic"}&q=${vehicleData.drive_state.latitude},${vehicleData.drive_state.longitude}`}
            />
          )}
        </section>
      )}

      {vehicles.length > 0 ? (
        <form onSubmit={handleCalculate}>
          <div className="form-group">
            <label htmlFor="vin">Vehicle:</label>
            <select id="vin" value={selectedVin} onChange={(e) => setSelectedVin(e.target.value)} className="form-control">
              {vehicles.map((vehicle) => (
                <option key={vehicle.vin} value={vehicle.vin}>
                  {vehicle.display_name || vehicle.vin}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="destination">Destination:</label>
            <input type="text" id="destination" name="destination" placeholder="Enter destination address" className="form-control" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Calculating..." : "Calculate Route"}
          </button>
        </form>
      ) : (
        <p>No Tesla vehicles found. Please connect your Tesla account.</p>
      )}

      {routeWithStops.length > 0 && (
        <section className="panel">
          <h2>Calculated Route</h2>
          <p className="muted">Route stops with charging locations:</p>
          <div ref={mapRef} style={{ height: 400, width: "100%", marginBottom: 16 }} />
          <ul className="site-list">
            {routeWithStops.map((stop, index) => (
              <li key={`${stop.name}-${index}`}>
                <strong>{stop.name}</strong>
                <div className="muted">
                  {stop.type}
                  {stop.distance != null ? ` · ${stop.distance.toFixed(1)} mi` : ""}
                  {stop.batteryAtArrival != null ? ` · arrival battery ${stop.batteryAtArrival}%` : ""}
                  {stop.chargeToPercent != null ? ` · charge to ${stop.chargeToPercent}%` : ""}
                  {stop.chargeMinutes != null ? ` · ~${stop.chargeMinutes} min` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default TripPlanner;
