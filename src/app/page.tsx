import Link from "next/link";
import { teslaConfigOrNull } from "@/lib/tesla/config";
import { readTeslaSession } from "@/lib/tesla/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tesla_error?: string }>;
}) {
  const { tesla_error: teslaError } = await searchParams;
  const configured = Boolean(teslaConfigOrNull());
  const connected = Boolean(await readTeslaSession());

  return (
    <main className="shell">
      <h1>Plan Tesla trips without walking to the car.</h1>
      <p className="muted">
        Connect a Tesla account from this phone or desktop, pull live vehicle stats, map a
        destination with Supercharger stops, then send the route to the car.
      </p>

      {teslaError ? <p className="error">Tesla sign-in failed: {teslaError}</p> : null}

      <section className="panel">
        <h2>Status</h2>
        <p>Tesla developer credentials: {configured ? "configured" : "missing (.env.local)"}</p>
        <p>Vehicle account: {connected ? "connected" : "not connected"}</p>
        <div className="row">
          {connected ? (
            <>
              <Link className="button" href="/vehicles">
                Open vehicles
              </Link>
              <Link className="button secondary" href="/trips">
                Plan a trip
              </Link>
            </>
          ) : (
            <a className="button" href="/api/auth/tesla">
              Connect Tesla
            </a>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>What this baseline includes</h2>
        <ul className="muted">
          <li>OAuth sign-in against Tesla Fleet API</li>
          <li>Vehicle list, wake, charge, and location stats</li>
          <li>Nearby Superchargers from the vehicle</li>
          <li>Send a destination or waypoints to in-car navigation</li>
          <li>Public-key path Tesla requires at /.well-known/appspecific/</li>
          <li>Installable Android PWA, plus an optional Capacitor APK wrapper</li>
        </ul>
      </section>
    </main>
  );
}
