import {
  Clock,
  FolderKanban,
  Users,
  BarChart3,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only shown to managers and admins. */
  managerOnly?: boolean;
  /** AI tab gets the green brand treatment. */
  brand?: boolean;
  /** Active-state match prefix when href is a sub-route. */
  matchPrefix?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Hours", href: "/hours", icon: Clock },
  { label: "Projects", href: "/projects", icon: FolderKanban, matchPrefix: "/projects" },
  { label: "People", href: "/people", icon: Users, managerOnly: true },
  { label: "Reports", href: "/reports", icon: BarChart3, matchPrefix: "/reports" },
  { label: "AI", href: "/ai", icon: Sparkles, brand: true },
  { label: "Account", href: "/account", icon: Settings },
];

/** Filter the nav by role. Unknown role (null) shows everything (preview mode). */
export function visibleNav(role: string | null | undefined): NavItem[] {
  if (role === "employee") return NAV_ITEMS.filter((i) => !i.managerOnly);
  return NAV_ITEMS;
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
