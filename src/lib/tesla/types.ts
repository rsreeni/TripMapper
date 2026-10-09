export type TeslaTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export type TeslaVehicle = {
  id: number;
  vehicle_id: number;
  vin: string;
  display_name: string;
  state: string;
};

export type ChargeState = {
  battery_level?: number;
  battery_range?: number;
  charging_state?: string;
  charge_limit_soc?: number;
  est_battery_range?: number;
};

export type DriveState = {
  latitude?: number;
  longitude?: number;
  heading?: number;
  shift_state?: string | null;
  speed?: number | null;
};

export type VehicleData = {
  vin?: string;
  display_name?: string;
  charge_state?: ChargeState;
  drive_state?: DriveState;
};

export type ChargingSite = {
  location?: { lat: number; long: number };
  name?: string;
  type?: string;
  distance_miles?: number;
  available_stalls?: number;
  total_stalls?: number;
};

export type NearbyChargingSites = {
  superchargers?: ChargingSite[];
  destination_charging?: ChargingSite[];
};
