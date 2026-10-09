function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function teslaConfig() {
  return {
    clientId: required("TESLA_CLIENT_ID"),
    clientSecret: required("TESLA_CLIENT_SECRET"),
    redirectUri: required("TESLA_REDIRECT_URI"),
    appOrigin: required("TESLA_APP_ORIGIN"),
    fleetApiBase: required("TESLA_FLEET_API_BASE").replace(/\/$/, ""),
    sessionSecret: required("TESLA_SESSION_SECRET"),
  };
}

export function teslaConfigOrNull() {
  try {
    return teslaConfig();
  } catch {
    return null;
  }
}
