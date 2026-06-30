"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { weekStart, weekStartISO, shiftWeek, weekRangeLabel, weekDays } from "@/lib/week";
import { formatHours } from "@/lib/hours";
import { buildLockedSet, isMonthLocked } from "@/lib/month-lock";
import { Button } from "@/components/ui/button";
import { CalendarWeek } from "./CalendarWeek";
import { CalendarDay } from "./CalendarDay";
import { CalendarMonth } from "./CalendarMonth";
import { EntryModal, ModalState } from "./EntryModal";
import { WelcomeCard } from "./WelcomeCard";
import { SubmitWeekButton } from "./SubmitWeekButton";
import { SubmittedBadge } from "./SubmittedBadge";
import { TimeEntry, Project, MonthLockRow, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(user: UserProfile): string {
  if (user.full_name) return user.full_name.split(" ")[0];
  const localPart = user.email.split("@")[0];
  const firstSegment = localPart.split(/[._-]/)[0];
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

interface HoursShellProps {
  initialEntries: TimeEntry[];
  projects: Project[];
  lockRows: MonthLockRow[];
  user: UserProfile;
}

export function HoursShell({ initialEntries, projects, lockRows, user }: HoursShellProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [currentWeek, setCurrentWeek] = useState(() => weekStart(new Date()));
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dismissed, setDismissed] = useState(user.dismissed_welcome);
  const [loading, setLoading] = useState(false);

  const lockedMonths = buildLockedSet(lockRows);
  const isWeekSubmitted =
    entries.length > 0 && entries.every((e) => e.status === "submitted");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchEntries = useCallback(async (monday: Date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?weekStart=${weekStartISO(monday)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load entries");
      setEntries(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(currentWeek);
  }, [currentWeek, fetchEntries]);

  function navigate(delta: number) {
    setCurrentWeek((prev) => shiftWeek(prev, delta));
  }

  function goToday() {
    setCurrentWeek(weekStart(new Date()));
  }

  function openNew(date: string) {
    setModal({ mode: "create", date });
  }

  function openEntry(entry: TimeEntry) {
    const dayDate = new Date(entry.date + "T00:00:00");
    const locked = isMonthLocked(dayDate, lockedMonths);
    const submitted = entry.status === "submitted";
    setModal({
      mode: locked || submitted ? "readonly" : "edit",
      date: entry.date,
      entry,
    });
  }

  function handleSaved(saved: TimeEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      return idx >= 0
        ? prev.map((e) => (e.id === saved.id ? saved : e))
        : [...prev, saved];
    });
  }

  function handleDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSubmitted() {
    setEntries((prev) => prev.map((e) => ({ ...e, status: "submitted" as const })));
  }

  async function handleCopy(entry: TimeEntry, toDate: string) {
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: entry.project_id,
          date: toDate,
          hours: entry.hours,
          rawNotes: entry.raw_notes,
          aiDescription: entry.ai_description,
          tagIds: entry.tag_ids,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Copy failed");
        return;
      }
      // If target date is in current week, add to local state
      const toWeekStart = weekStartISO(weekStart(new Date(toDate + "T00:00:00")));
      if (toWeekStart === weekStartISO(currentWeek)) {
        setEntries((prev) => [...prev, json.data]);
      }
      toast.success("Entry copied.");
    } catch {
      toast.error("Copy failed — please try again.");
    }
  }

  async function handleMove(entry: TimeEntry, toDate: string) {
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: toDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Move failed");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      const toWeekStart = weekStartISO(weekStart(new Date(toDate + "T00:00:00")));
      if (toWeekStart === weekStartISO(currentWeek)) {
        setEntries((prev) => [...prev, json.data]);
      }
      toast.success("Entry moved.");
    } catch {
      toast.error("Move failed — please try again.");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const entry = active.data.current?.entry as TimeEntry | undefined;
    const toDate = over.data.current?.date as string | undefined;
    if (!entry || !toDate || entry.date === toDate) return;

    const targetDay = new Date(toDate + "T00:00:00");
    if (isMonthLocked(targetDay, lockedMonths)) {
      toast.error("That month is locked — cannot move entries there.");
      return;
    }

    await handleMove(entry, toDate);
  }

  const weekDaysList = weekDays(currentWeek);
  const weekTotal = entries.reduce((s, e) => s + e.hours, 0);
  const isCurrentWeek = weekStartISO(currentWeek) === weekStartISO(weekStart(new Date()));

  const showWelcome =
    !dismissed && entries.length === 0 && view === "week";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Personal greeting hero */}
      <div className="-mx-4 -mt-4 mb-6 md:-mx-6 md:-mt-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/70 via-emerald-50/40 to-[#F8FAFB] px-4 py-7 md:px-6">
          {/* Decorative accent dots */}
          <div className="pointer-events-none absolute right-20 top-5 h-3 w-3 rounded-full bg-indigo-300/40" />
          <div className="pointer-events-none absolute right-36 top-10 h-2 w-2 rounded-full bg-emerald-400/40" />
          <div className="pointer-events-none absolute right-10 top-14 h-1.5 w-1.5 rounded-full bg-amber-400/50" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {getGreeting()},{" "}
            <span className="text-primary">{getFirstName(user)}</span>! 👋
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {weekRangeLabel(currentWeek)} &middot;{" "}
            {weekTotal > 0 ? (
              <><span className="font-medium text-primary">{formatHours(weekTotal)}</span> logged so far</>
            ) : (
              "Start logging your hours for this week"
            )}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* View toggle — pill style */}
        <div className="flex items-center rounded-lg bg-muted p-0.5 text-sm">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 capitalize font-medium transition-all",
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-lg rounded-r-none" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[130px] px-1 text-center text-sm font-medium">
            {view === "month"
              ? format(currentWeek, "MMMM yyyy")
              : weekRangeLabel(currentWeek)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-lg rounded-l-none" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek && (
          <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs">
            Today
          </Button>
        )}

        {/* Week total + submit */}
        {view === "week" && (
          <div className="ml-auto flex items-center gap-2">
            {weekTotal > 0 && (
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                {formatHours(weekTotal)} this week
              </span>
            )}
            {isWeekSubmitted ? (
              <SubmittedBadge />
            ) : (
              <SubmitWeekButton
                weekStart={currentWeek}
                entries={entries}
                onSubmitted={handleSubmitted}
              />
            )}
          </div>
        )}
      </div>

      {loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
      )}

      {!loading && (
        <>
          {showWelcome && <WelcomeCard onDismiss={() => setDismissed(true)} />}

          {view === "week" && (
            <CalendarWeek
              weekStart={currentWeek}
              entries={entries}
              projects={projects}
              lockedMonths={lockedMonths}
              onNewEntry={openNew}
              onEntryClick={openEntry}
            />
          )}
          {view === "day" && (
            <CalendarDay
              date={weekDaysList[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? weekDaysList[0]}
              entries={entries}
              projects={projects}
              lockedMonths={lockedMonths}
              onNewEntry={openNew}
              onEntryClick={openEntry}
            />
          )}
          {view === "month" && (
            <CalendarMonth
              monthDate={currentWeek}
              entries={entries}
              projects={projects}
              lockedMonths={lockedMonths}
              onNewEntry={openNew}
              onEntryClick={openEntry}
            />
          )}
        </>
      )}

      {modal && (
        <EntryModal
          state={modal}
          projects={projects}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCopy={handleCopy}
          onMove={handleMove}
        />
      )}
    </DndContext>
  );
}
