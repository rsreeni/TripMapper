import { NextResponse } from "next/server";
import { listVehicles } from "@/lib/tesla/client";
import { readTeslaSession } from "@/lib/tesla/session";

export async function GET() {
  if (!(await readTeslaSession())) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
  try {
    const vehicles = await listVehicles();
    return NextResponse.json({ vehicles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list vehicles";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
