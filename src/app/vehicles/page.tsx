"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeslaVehicle } from "@/lib/tesla/types";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<TeslaVehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tesla/vehicles")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load vehicles");
        setVehicles(data.vehicles ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="shell">
      <h1>Vehicles</h1>
      <p className="muted">Wake a car, inspect charge and location, then plan a trip.</p>
      {error ? <p className="error">{error}</p> : null}
      {vehicles.map((vehicle) => (
        <section className="panel" key={vehicle.vin}>
          <h2>{vehicle.display_name || vehicle.vin}</h2>
          <p className="muted">
            {vehicle.vin} · {vehicle.state}
          </p>
          <div className="row">
            <Link className="button" href={`/trips?vin=${encodeURIComponent(vehicle.vin)}`}>
              Map a trip
            </Link>
          </div>
        </section>
      ))}
      {!error && vehicles.length === 0 ? <p className="muted">No vehicles returned yet.</p> : null}
    </main>
  );
}
