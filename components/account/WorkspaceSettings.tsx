"use client";

import { useState } from "react";
import { Users, Building2, Tag } from "lucide-react";
import { UsersPanel } from "./workspace/UsersPanel";
import { ClientsPanel } from "./workspace/ClientsPanel";
import { TagGroupsPanel } from "./workspace/TagGroupsPanel";

type WorkspaceTab = "users" | "clients" | "tags";

const TABS: { key: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "Users", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "clients", label: "Clients", icon: <Building2 className="h-3.5 w-3.5" /> },
  { key: "tags", label: "Tag Groups", icon: <Tag className="h-3.5 w-3.5" /> },
];

export function WorkspaceSettings() {
  const [tab, setTab] = useState<WorkspaceTab>("users");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "users" && <UsersPanel />}
      {tab === "clients" && <ClientsPanel />}
      {tab === "tags" && <TagGroupsPanel />}
    </div>
  );
}
