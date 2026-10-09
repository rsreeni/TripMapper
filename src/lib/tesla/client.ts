import { readTeslaSession, saveTeslaSession } from "./session";
import { refreshTeslaTokens } from "./auth";
import { teslaConfig } from "./config";
import type { NearbyChargingSites, TeslaVehicle, VehicleData } from "./types";

async function accessToken() {
  const session = await readTeslaSession();
  if (!session) {
    throw new Error("Not connected to Tesla");
  }
  if (session.expiresAt > Date.now() + 30_000) {
    return session.accessToken;
  }
  if (!session.refreshToken) {
    throw new Error("Tesla session expired. Connect again.");
  }
  const next = await refreshTeslaTokens(session.refreshToken);
  await saveTeslaSession(next);
  return next.accessToken;
}

async function teslaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { fleetApiBase } = teslaConfig();
  const token = await accessToken();
  const res = await fetch(`${fleetApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Tesla API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function listVehicles() {
  const data = await teslaFetch<{ response: TeslaVehicle[] }>("/api/1/vehicles");
  return data.response ?? [];
}

export async function wakeVehicle(vin: string) {
  return teslaFetch(`/api/1/vehicles/${encodeURIComponent(vin)}/wake_up`, {
    method: "POST",
  });
}

export async function getVehicleData(vin: string) {
  const encoded = encodeURIComponent(vin);
  const data = await teslaFetch<{ response: VehicleData }>(
    `/api/1/vehicles/${encoded}/vehicle_data?endpoints=charge_state%3Bdrive_state%3Bvehicle_state%3Blocation_data`,
  );
  return data.response;
}

export async function getNearbyChargers(vin: string) {
  const encoded = encodeURIComponent(vin);
  const data = await teslaFetch<{ response: NearbyChargingSites }>(
    `/api/1/vehicles/${encoded}/nearby_charging_sites`,
  );
  return data.response;
}

export async function sendNavigationRequest(
  vin: string,
  payload: {
    type: "share_ext_content_raw";
    locale: string;
    timestamp_ms: string;
    value: { "android.intent.extra.TEXT": string };
  },
) {
  return teslaFetch(`/api/1/vehicles/${encodeURIComponent(vin)}/command/navigation_request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendWaypoints(
  vin: string,
  waypoints: Array<{ lat: number; lon: number; label?: string }>,
) {
  return teslaFetch(
    `/api/1/vehicles/${encodeURIComponent(vin)}/command/navigation_waypoints_request`,
    {
      method: "POST",
      body: JSON.stringify({ waypoints }),
    },
  );
}
