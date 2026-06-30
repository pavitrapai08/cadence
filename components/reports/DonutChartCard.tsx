"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatHours } from "@/lib/hours";
import { ReportChartItem } from "@/lib/types";

interface DonutChartCardProps {
  id: string;
  title: string;
  items: ReportChartItem[];
  totalHours: number;
  totalLabel: string;
  onRemove: () => void;
}

const MAX_LEGEND = 8;

export function DonutChartCard({
  id,
  title,
  items,
  totalHours,
  totalLabel,
  onRemove,
}: DonutChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Cap legend at MAX_LEGEND; bundle the rest as "Other"
  const top = items.slice(0, MAX_LEGEND);
  const rest = items.slice(MAX_LEGEND);
  const otherHours = rest.reduce((s, i) => s + i.hours, 0);
  const chartData: ReportChartItem[] =
    rest.length > 0
      ? [
          ...top,
          {
            id: "__other__",
            name: "Other",
            colour: "#D1D5DB",
            hours: otherHours,
            percentage:
              totalHours > 0 ? Math.round((otherHours / totalHours) * 100) : 0,
          },
        ]
      : top;

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
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="text-xs text-gray-400">by</span>
        <span className="text-xs font-medium text-gray-600">Hours</span>
        <button
          onClick={onRemove}
          className="ml-auto rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
          title="Remove chart"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Chart body */}
      {chartData.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-sm text-gray-400">
          No data for this period
        </div>
      ) : (
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="hours"
                  strokeWidth={0}
                >
                  {chartData.map((item) => (
                    <Cell key={item.id} fill={item.colour} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [formatHours(value as number), "Hours"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-bold leading-tight text-gray-900">
                {formatHours(totalHours)}
              </span>
              <span className="text-[10px] text-gray-400">{totalLabel}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {chartData.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.colour }}
                />
                <span className="flex-1 truncate text-gray-600">{item.name}</span>
                <span className="shrink-0 font-medium text-gray-800">
                  {formatHours(item.hours)}
                </span>
                <span className="shrink-0 w-9 text-right text-gray-400">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
