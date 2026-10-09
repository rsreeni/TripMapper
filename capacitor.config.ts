import type { CapacitorConfig } from "@capacitor/cli";

const hostedUrl = process.env.CAPACITOR_SERVER_URL ?? process.env.TESLA_APP_ORIGIN;

const config: CapacitorConfig = {
  appId: "app.tripmapper.android",
  appName: "TripMapper",
  webDir: "native/www",
  server: hostedUrl
    ? {
        url: hostedUrl.replace(/\/$/, ""),
        androidScheme: "https",
        allowNavigation: [
          "auth.tesla.com",
          "*.tesla.com",
          "fleet-auth.prd.vn.cloud.tesla.com",
        ],
      }
    : undefined,
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0d10",
  },
};

export default config;
