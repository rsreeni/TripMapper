export default function OfflinePage() {
  return (
    <main className="shell">
      <h1>You are offline</h1>
      <p className="muted">
        TripMapper needs a network connection to talk to Tesla. Reconnect, then try Vehicles or
        Trips again.
      </p>
    </main>
  );
}
