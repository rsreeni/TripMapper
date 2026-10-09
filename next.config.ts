import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/.well-known/appspecific/com.tesla.3p.public-key.pem",
        headers: [
          { key: "Content-Type", value: "application/x-pem-file" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
