import { NextRequest, NextResponse } from "next/server";
import { getVehicleData, wakeVehicle } from "@/lib/tesla/client";
import { readTeslaSession } from "@/lib/tesla/session";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vin: string }> },
) {
  if (!(await readTeslaSession())) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
  const { vin } = await context.params;
  try {
    await wakeVehicle(vin);
    const vehicle = await getVehicleData(vin);
    return NextResponse.json({ vehicle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load vehicle";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
