"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/trips", label: "Trips" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href="/" className="brand-link">
          TripMapper
        </Link>
      </header>
      <div className="app-body">{children}</div>
      <nav className="tabbar" aria-label="Primary">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "tab active" : "tab"}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
