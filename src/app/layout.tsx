import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { PwaClient } from "@/components/PwaClient";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripMapper",
  description: "Plan Tesla trips and Supercharger stops from your phone or desktop.",
  applicationName: "TripMapper",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TripMapper",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaClient />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
