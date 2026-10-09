import { teslaConfig } from "./config";
import { TESLA_AUTH_AUTHORIZE_URL, TESLA_AUTH_TOKEN_URL, TESLA_SCOPE_STRING } from "./scopes";
import type { TeslaTokens } from "./types";

export function randomState() {
  return crypto.randomUUID();
}

export function buildAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = teslaConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    locale: "en-US",
    prompt: "login",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: TESLA_SCOPE_STRING,
    state,
    prompt_missing_scopes: "true",
    require_requested_scopes: "true",
    show_keypair_step: "true",
  });
  return `${TESLA_AUTH_AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

function toTokens(data: TokenResponse): TeslaTokens {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<TeslaTokens> {
  const { clientId, clientSecret, redirectUri, fleetApiBase } = teslaConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    audience: fleetApiBase,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TESLA_AUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Tesla code exchange failed: ${res.status} ${await res.text()}`);
  }
  return toTokens((await res.json()) as TokenResponse);
}

export async function refreshTeslaTokens(refreshToken: string): Promise<TeslaTokens> {
  const { clientId } = teslaConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });
  const res = await fetch(TESLA_AUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Tesla refresh failed: ${res.status} ${await res.text()}`);
  }
  return toTokens((await res.json()) as TokenResponse);
}
