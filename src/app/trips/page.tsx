"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ChargingSite, NearbyChargingSites, TeslaVehicle, VehicleData } from "@/lib/tesla/types";

function TripPlanner() {
  const searchParams = useSearchParams();
  const vinFromQuery = searchParams.get("vin") ?? "";
  const [vehicles, setVehicles] = useState<TeslaVehicle[]>([]);
  const [vin, setVin] = useState(vinFromQuery);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [sites, setSites] = useState<NearbyChargingSites | null>(null);
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tesla/vehicles")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load vehicles");
        const list = (data.vehicles ?? []) as TeslaVehicle[];
        setVehicles(list);
        if (!vinFromQuery && list[0]) setVin(list[0].vin);
      })
      .catch((err: Error) => setError(err.message));
  }, [vinFromQuery]);

  useEffect(() => {
    if (!vin) return;
    setError(null);
    Promise.all([
      fetch(`/api/tesla/vehicles/${encodeURIComponent(vin)}`).then((res) => res.json()),
      fetch(`/api/tesla/vehicles/${encodeURIComponent(vin)}/chargers`).then((res) => res.json()),
    ])
      .then(([vehicleRes, chargerRes]) => {
        if (vehicleRes.error) throw new Error(vehicleRes.error);
        if (chargerRes.error) throw new Error(chargerRes.error);
        setVehicle(vehicleRes.vehicle);
        setSites(chargerRes.sites);
      })
      .catch((err: Error) => setError(err.message));
  }, [vin]);

  const lat = vehicle?.drive_state?.latitude;
  const lon = vehicle?.drive_state?.longitude;
  const mapSrc = useMemo(() => {
    if (lat == null || lon == null) return null;
    const bbox = `${lon - 0.35},${lat - 0.2},${lon + 0.35},${lat + 0.2}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [lat, lon]);

  const chargers: ChargingSite[] = [
    ...(sites?.superchargers ?? []),
    ...(sites?.destination_charging ?? []),
  ];

  async function sendToCar() {
    if (!vin || !destination) return;
    setStatus("Sending destination to the vehicle...");
    setError(null);
    const res = await fetch(`/api/tesla/vehicles/${encodeURIComponent(vin)}/navigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Navigation request failed");
      setStatus(null);
      return;
    }
    setStatus("Destination sent. Check the car's navigation screen.");
  }

  return (
    <main className="shell">
      <h1>Trip planner</h1>
      <p className="muted">
        Uses live vehicle location and nearby Tesla charging sites. Sending a route requires
        virtual-key pairing after Tesla app registration.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {status ? <p>{status}</p> : null}

      <section className="panel">
        <label htmlFor="vin">Vehicle</label>
        <select
          id="vin"
          value={vin}
          onChange={(event) => setVin(event.target.value)}
          style={{ width: "100%", marginTop: 8, marginBottom: 16 }}
          className="select"
        >
          {vehicles.map((item) => (
            <option key={item.vin} value={item.vin}>
              {item.display_name || item.vin}
            </option>
          ))}
        </select>
        <div className="stats">
          <div className="stat">
            <span className="muted">Battery</span>
            <strong>{vehicle?.charge_state?.battery_level ?? "—"}%</strong>
          </div>
          <div className="stat">
            <span className="muted">Rated range</span>
            <strong>{vehicle?.charge_state?.battery_range?.toFixed?.(0) ?? "—"} mi</strong>
          </div>
          <div className="stat">
            <span className="muted">Charge</span>
            <strong>{vehicle?.charge_state?.charging_state ?? "—"}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Map</h2>
        {mapSrc ? (
          <iframe className="map-frame" title="Vehicle map" src={mapSrc} />
        ) : (
          <p className="muted">Location appears after the vehicle wakes and shares location_data.</p>
        )}
        <p className="muted">
          {lat != null && lon != null ? `Current position: ${lat.toFixed(5)}, ${lon.toFixed(5)}` : null}
        </p>
      </section>

      <section className="panel">
        <h2>Destination</h2>
        <textarea
          rows={3}
          placeholder="Address, place name, or lat,lon"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" onClick={sendToCar} disabled={!destination}>
            Send to Tesla navigation
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Nearby charging</h2>
        <ul className="site-list">
          {chargers.map((site, index) => (
            <li key={`${site.name}-${index}`}>
              <strong>{site.name ?? "Unnamed site"}</strong>
              <div className="muted">
                {site.type ?? "charger"}
                {site.distance_miles != null ? ` · ${site.distance_miles.toFixed(1)} mi` : ""}
                {site.available_stalls != null
                  ? ` · ${site.available_stalls}/${site.total_stalls ?? "?"} stalls`
                  : ""}
              </div>
              {site.location ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    setDestination(
                      `${site.name ?? "Charger"} ${site.location!.lat},${site.location!.long}`,
                    )
                  }
                >
                  Use as destination
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {chargers.length === 0 ? <p className="muted">No nearby sites loaded yet.</p> : null}
      </section>
    </main>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<main className="shell">Loading trip planner…</main>}>
      <TripPlanner />
    </Suspense>
  );
}
