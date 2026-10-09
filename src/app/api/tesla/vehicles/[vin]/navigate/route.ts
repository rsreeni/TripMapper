import { NextRequest, NextResponse } from "next/server";
import { sendNavigationRequest, sendWaypoints } from "@/lib/tesla/client";
import { readTeslaSession } from "@/lib/tesla/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vin: string }> },
) {
  if (!(await readTeslaSession())) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
  const { vin } = await context.params;
  const body = (await request.json()) as {
    destination?: string;
    waypoints?: Array<{ lat: number; lon: number; label?: string }>;
  };

  try {
    if (body.waypoints?.length) {
      const result = await sendWaypoints(vin, body.waypoints);
      return NextResponse.json({ result });
    }
    if (!body.destination) {
      return NextResponse.json({ error: "destination or waypoints required" }, { status: 400 });
    }
    const result = await sendNavigationRequest(vin, {
      type: "share_ext_content_raw",
      locale: "en-US",
      timestamp_ms: Date.now().toString(),
      value: { "android.intent.extra.TEXT": body.destination },
    });
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send navigation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
