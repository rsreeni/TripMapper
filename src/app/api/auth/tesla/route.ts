import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { teslaConfigOrNull } from "@/lib/tesla/config";
import { buildAuthorizeUrl, randomState } from "@/lib/tesla/auth";

export async function GET() {
  const config = teslaConfigOrNull();
  if (!config) {
    return NextResponse.json(
      { error: "Tesla credentials are not configured. Copy .env.example to .env.local." },
      { status: 500 },
    );
  }

  const state = randomState();
  const store = await cookies();
  store.set("tesla_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
