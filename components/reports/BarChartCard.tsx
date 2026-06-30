"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { formatHours } from "@/lib/hours";
import { WeeklyHoursPoint } from "@/lib/types";

interface BarChartCardProps {
  id: string;
  data: WeeklyHoursPoint[];
  totalHours: number;
  onRemove: () => void;
}

export function BarChartCard({ id, data, totalHours, onRemove }: BarChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const chartData = data.map((w) => ({
    label: format(parseISO(w.weekStart), "MMM d"),
    billable: w.billable,
    nonBillable: Math.max(0, round2(w.hours - w.billable)),
  }));

  const hasBillable = data.some((w) => w.billable > 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-gray-300 hover:text-gray-400 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">Hours</span>
        <span className="text-xs text-gray-400">by</span>
        <span className="text-xs font-medium text-gray-600">Week</span>
        <button
          onClick={onRemove}
          className="ml-auto rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
          title="Remove chart"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Chart */}
      {totalHours === 0 ? (
        <div className="flex h-44 items-center justify-center text-sm text-gray-400">
          No data for this period
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barSize={20}
              margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  formatHours(value as number),
                  name === "billable" ? "Billable" : "Non-billable",
                ]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              />
              {hasBillable && (
                <Bar dataKey="billable" stackId="a" fill="#1B6B3A" name="billable" />
              )}
              <Bar
                dataKey="nonBillable"
                stackId="a"
                fill="#D1FAE5"
                name="nonBillable"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {totalHours > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-3 text-xs">
          {hasBillable && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1B6B3A]" />
              <span className="text-gray-500">Billable</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100" />
            <span className="text-gray-500">Non-billable</span>
          </div>
          <span className="ml-auto font-semibold text-gray-800">
            {formatHours(totalHours)} total
          </span>
        </div>
      )}
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
