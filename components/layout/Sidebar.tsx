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
        "hidden shrink-0 flex-col bg-[#0F1923] transition-[width] duration-200 ease-in-out md:flex",
        expanded ? "w-[220px]" : "w-[52px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          expanded ? "gap-3 px-4" : "justify-center"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground shadow-sm">
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
                "group flex items-center rounded-md transition-colors",
                expanded ? "gap-3 px-3 py-2 text-sm font-medium" : "justify-center p-3",
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
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active
                    ? item.brand ? "text-emerald-300" : "text-white"
                    : item.brand
                    ? "text-emerald-400/70 group-hover:text-emerald-300"
                    : "text-slate-500 group-hover:text-slate-300"
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
          "flex shrink-0 flex-col border-t border-white/10 py-3",
          expanded ? "px-3 gap-1" : "items-center px-2 gap-2"
        )}
      >
        {/* Avatar initials */}
        <div
          title={email ?? undefined}
          className={cn(
            "flex items-center justify-center rounded-full text-[11px] font-bold text-white",
            "h-8 w-8 shrink-0",
            expanded && "self-start ml-1"
          )}
          style={{ background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)" }}
        >
          {initials}
        </div>

        {/* Expand / collapse toggle */}
        <button
          onClick={toggle}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300",
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
