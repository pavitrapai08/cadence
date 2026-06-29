"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNav, isActive } from "./nav-items";

export function Sidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  const items = visibleNav(role);

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-slate-900 md:flex">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-sm text-brand-foreground shadow-sm">
          C
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">Cadence</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? item.brand
                    ? "bg-brand/20 text-emerald-300"
                    : "bg-white/10 text-white"
                  : item.brand
                  ? "text-emerald-400/70 hover:bg-brand/10 hover:text-emerald-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? item.brand ? "text-emerald-300" : "text-white"
                    : item.brand ? "text-emerald-400/70 group-hover:text-emerald-300" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom separator */}
      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-[11px] text-slate-600">DecisionFoundry</p>
      </div>
    </aside>
  );
}
