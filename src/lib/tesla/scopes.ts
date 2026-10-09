export const TESLA_SCOPES = [
  "openid",
  "offline_access",
  "vehicle_device_data",
  "vehicle_location",
  "vehicle_cmds",
  "vehicle_charging_cmds",
] as const;

export const TESLA_SCOPE_STRING = TESLA_SCOPES.join(" ");

export const TESLA_AUTH_AUTHORIZE_URL =
  "https://auth.tesla.com/oauth2/v3/authorize";
export const TESLA_AUTH_TOKEN_URL =
  "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";
export const TESLA_VIRTUAL_KEY_BASE = "https://tesla.com/_ak";
