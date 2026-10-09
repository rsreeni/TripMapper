import { NextResponse } from "next/server";
import { clearTeslaSession } from "@/lib/tesla/session";

export async function POST() {
  await clearTeslaSession();
  return NextResponse.json({ ok: true });
}
