import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/tesla/auth";
import { teslaConfig } from "@/lib/tesla/config";
import { saveTeslaSession } from "@/lib/tesla/session";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/?tesla_error=${encodeURIComponent(error)}`, url.origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("tesla_oauth_state")?.value;
  store.delete("tesla_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/?tesla_error=invalid_oauth_state", url.origin));
  }

  try {
    teslaConfig();
    const tokens = await exchangeAuthorizationCode(code);
    await saveTeslaSession(tokens);
    return NextResponse.redirect(new URL("/vehicles", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(
      new URL(`/?tesla_error=${encodeURIComponent(message)}`, url.origin),
    );
  }
}
