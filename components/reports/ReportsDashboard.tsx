"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startOfMonth, addMonths, subMonths, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  PieChart as PieIcon,
  BarChart3,
  Tag,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { DonutChartCard } from "./DonutChartCard";
import { BarChartCard } from "./BarChartCard";
import { ReportsSubNav } from "./ReportsSubNav";
import { ReportsSummaryData } from "@/lib/types";
import { formatHours } from "@/lib/hours";

type WidgetType = "clients" | "projects" | "hours" | "tags";
interface Widget {
  id: string;
  type: WidgetType;
}

const WIDGET_META: Record<WidgetType, { label: string; icon: React.ReactNode }> = {
  clients: { label: "Clients",  icon: <PieIcon  className="h-4 w-4" /> },
  projects: { label: "Projects", icon: <BarChart3 className="h-4 w-4" /> },
  hours:    { label: "Hours",    icon: <BarChart3 className="h-4 w-4" /> },
  tags:     { label: "Tags",     icon: <Tag       className="h-4 w-4" /> },
};

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-full border border-gray-200 bg-white pl-3 pr-7 text-xs font-medium text-gray-600 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-[#1B6B3A]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export function ReportsDashboard({ role }: { role: string }) {
  const [month, setMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "clients", type: "clients" },
    { id: "projects", type: "projects" },
  ]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [data, setData] = useState<ReportsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const dateFrom = startOfMonth(month).toISOString().slice(0, 10);
  const dateTo = startOfMonth(addMonths(month, 1)).toISOString().slice(0, 10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (statusFilter) params.set("status", statusFilter);
    if (projectFilter) params.set("projectId", projectFilter);
    if (tagFilter) params.set("tagId", tagFilter);
    if (userFilter) params.set("userId", userFilter);
    try {
      const res = await fetch(`/api/reports/summary?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch {
      // silently fail — empty state shows instead
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, projectFilter, tagFilter, userFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close add-menu on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    if (showAddMenu) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showAddMenu]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  }

  function toggleWidget(type: WidgetType) {
    setWidgets((prev) =>
      prev.some((w) => w.type === type)
        ? prev.filter((w) => w.type !== type)
        : [...prev, { id: type, type }]
    );
  }

  const isManager = role === "manager" || role === "admin";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50/70 via-emerald-50/40 to-[#F8FAFB] px-4 py-7 md:px-6">
          <div className="pointer-events-none absolute right-16 top-4 h-16 w-16 rounded-full bg-violet-100/40" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Insights across time, projects, and team
          </p>
        </div>
      </div>

      <ReportsSubNav />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Month nav */}
        <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-sm">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[66px] text-center text-xs font-semibold text-gray-700">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="State"
          options={[
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
          ]}
        />

        {isManager && (
          <FilterSelect
            value={userFilter}
            onChange={setUserFilter}
            placeholder="Anyone"
            options={(data?.availableUsers ?? []).map((u) => ({
              value: u.id,
              label: u.full_name ?? u.email.split("@")[0],
            }))}
          />
        )}

        <FilterSelect
          value={projectFilter}
          onChange={setProjectFilter}
          placeholder="Any project"
          options={(data?.availableProjects ?? []).map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />

        <FilterSelect
          value={tagFilter}
          onChange={setTagFilter}
          placeholder="Any tag"
          options={(data?.availableTags ?? []).map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />

        {/* Summary pill */}
        {!loading && data && (
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {formatHours(data.totalHours)} total
          </span>
        )}
      </div>

      {/* Add charts button */}
      <div className="flex justify-center">
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            className="flex items-center gap-2 rounded-full bg-[#1B6B3A] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#155530] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add charts and tables
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showAddMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showAddMenu && (
            <div className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
              {(Object.entries(WIDGET_META) as [WidgetType, (typeof WIDGET_META)[WidgetType]][]).map(
                ([type, meta]) => {
                  const active = widgets.some((w) => w.type === type);
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        toggleWidget(type);
                        setShowAddMenu(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <span className="text-gray-400">{meta.icon}</span>
                      {meta.label}
                      {active && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart cards */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : widgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          Click &ldquo;Add charts and tables&rdquo; above to add a chart
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {widgets.map((widget) => {
                if (widget.type === "hours") {
                  return (
                    <div key={widget.id} className="md:col-span-2">
                      <BarChartCard
                        id={widget.id}
                        data={data?.byWeek ?? []}
                        totalHours={data?.totalHours ?? 0}
                        onRemove={() => toggleWidget(widget.type)}
                      />
                    </div>
                  );
                }
                const donutItems =
                  widget.type === "clients"
                    ? (data?.byClient ?? [])
                    : widget.type === "projects"
                    ? (data?.byProject ?? [])
                    : (data?.byTag ?? []);
                const count = donutItems.length;
                const noun =
                  widget.type === "clients" ? "client"
                  : widget.type === "projects" ? "project"
                  : "tag";
                return (
                  <DonutChartCard
                    key={widget.id}
                    id={widget.id}
                    title={WIDGET_META[widget.type].label}
                    items={donutItems}
                    totalHours={data?.totalHours ?? 0}
                    totalLabel={`${count} ${noun}${count !== 1 ? "s" : ""}`}
                    onRemove={() => toggleWidget(widget.type)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Quick links to detailed reports */}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        {[
          {
            href: "/reports/clients",
            title: "Clients & Projects",
            subtitle: "Week-by-week breakdown table with export",
            icon: <BarChart3 className="h-5 w-5 text-violet-400" />,
          },
          {
            href: "/reports/timesheets",
            title: "Timesheets",
            subtitle: "Detailed entry list with CSV and PDF export",
            icon: <FileText className="h-5 w-5 text-emerald-500" />,
          },
        ].map(({ href, title, subtitle, icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="mt-0.5 text-xs text-gray-400 truncate">{subtitle}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
