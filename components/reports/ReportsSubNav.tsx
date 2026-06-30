"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/reports" },
  { label: "Clients & Projects", href: "/reports/clients" },
  { label: "Timesheets", href: "/reports/timesheets" },
];

export function ReportsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm w-fit">
      {TABS.map(({ label, href }) => {
        const active =
          href === "/reports" ? pathname === "/reports" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[#1B6B3A] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
