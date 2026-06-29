"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNav, isActive } from "./nav-items";

/** Desktop / tablet left sidebar (hidden on mobile — see MobileNav). */
export function Sidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  const items = visibleNav(role);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand font-bold text-brand-foreground">
          C
        </div>
        <span className="text-lg font-semibold">Cadence</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? item.brand
                    ? "bg-brand/10 text-brand"
                    : "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                item.brand && !active && "text-brand/80 hover:text-brand",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
