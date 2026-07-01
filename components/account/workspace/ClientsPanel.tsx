"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  is_active: boolean;
}

export function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const json = await res.json();
      if (res.ok) setClients(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function addClient() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to add."); return; }
      setClients((prev) => [...prev, json.data]);
      setNewName("");
      toast.success("Client added.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(client: Client) {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !client.is_active }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to update."); return; }
      setClients((prev) => prev.map((c) => c.id === client.id ? json.data : c));
    } catch {
      toast.error("Something went wrong.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addClient()}
          placeholder="New client name…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A]"
        />
        <button
          onClick={addClient}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[#1B6B3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#155530] transition-colors disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>

      {/* Client list */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No clients yet.</p>
        ) : (
          clients.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <span className={`text-sm font-medium ${c.is_active ? "text-gray-800" : "text-gray-400 line-through"}`}>
                {c.name}
              </span>
              <button
                onClick={() => toggleActive(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  c.is_active
                    ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                {c.is_active ? "Archive" : "Restore"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
