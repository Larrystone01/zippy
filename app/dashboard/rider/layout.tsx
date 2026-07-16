"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/rider", label: "Overview" },
  { href: "/dashboard/rider/profile", label: "Profile & vehicle" },
];

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="lux-shell">
      <p className="lux-label">Fleet</p>
      <h1 className="lux-page-title mt-1">Rider dashboard</h1>

      <div className="lux-tab-bar mt-6">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "lux-tab-bar-item-active" : "lux-tab-bar-item"}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
