"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNav, isActive } from "./nav-items";

const STORAGE_KEY = "cadence_sidebar";

function getInitials(email: string): string {
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return prefix.slice(0, 2).toUpperCase();
}

interface SidebarProps {
  role: string | null;
  email?: string | null;
}

export function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname();
  const items = visibleNav(role);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setExpanded(stored === "true");
    } catch {}
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }

  const initials = email ? getInitials(email) : "U";

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col transition-[width] duration-200 ease-in-out md:flex",
        "border-r border-white/[0.05]",
        expanded ? "w-[220px]" : "w-[52px]"
      )}
      style={{ background: "linear-gradient(180deg, #0f1d2a 0%, #0b1620 55%, #07101a 100%)" }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/[0.07]",
          expanded ? "gap-3 px-4" : "justify-center"
        )}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground ring-1 ring-brand/40"
          style={{ boxShadow: "0 0 18px rgba(27,107,58,0.55)" }}
        >
          C
        </div>
        {expanded && (
          <span className="text-[15px] font-semibold tracking-tight text-white">Cadence</span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex flex-1 flex-col gap-0.5 py-3", expanded ? "px-3" : "px-2")}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={cn(
                "group relative flex items-center rounded-lg transition-all duration-150",
                expanded ? "gap-3 px-3 py-2 text-sm font-medium" : "justify-center p-3",
                active
                  ? item.brand
                    ? "bg-emerald-500/[0.18] text-emerald-200"
                    : "bg-white/[0.12] text-white"
                  : item.brand
                  ? "text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-300"
                  : "text-slate-400/70 hover:bg-white/[0.07] hover:text-slate-200"
              )}
              style={active && item.brand ? { boxShadow: "0 0 20px rgba(52,211,153,0.10)" } : undefined}
            >
              {/* Active left accent bar */}
              {active && (
                <span
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full",
                    item.brand ? "h-5 w-[3px] bg-emerald-400" : "h-5 w-[3px] bg-white/60"
                  )}
                />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                  "group-hover:scale-110",
                  active
                    ? item.brand ? "text-emerald-300" : "text-white"
                    : item.brand
                    ? "text-emerald-400/60 group-hover:text-emerald-300"
                    : "text-slate-500/80 group-hover:text-slate-200"
                )}
              />
              {expanded && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: avatar + expand toggle */}
      <div
        className={cn(
          "flex shrink-0 flex-col border-t border-white/[0.07] py-3",
          expanded ? "px-3 gap-1" : "items-center px-2 gap-2"
        )}
      >
        {/* Avatar initials */}
        <div
          title={email ?? undefined}
          className={cn(
            "flex items-center justify-center rounded-full text-[11px] font-bold text-white",
            "h-8 w-8 shrink-0 ring-1 ring-white/10",
            expanded && "self-start ml-1"
          )}
          style={{ background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)", boxShadow: "0 0 10px rgba(27,107,58,0.4)" }}
        >
          {initials}
        </div>

        {/* Expand / collapse toggle */}
        <button
          onClick={toggle}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex items-center justify-center rounded-md text-slate-500/70 transition-all duration-150 hover:bg-white/[0.07] hover:text-slate-300",
            expanded ? "h-7 w-full gap-1.5 text-[11px]" : "h-8 w-8"
          )}
        >
          {expanded ? (
            <>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
