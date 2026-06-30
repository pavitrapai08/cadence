"use client";

import { useState } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { formatHours } from "@/lib/hours";

interface DonutChartProps {
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
}

const BILLABLE_COLOR = "#1B6B3A";
const NB_COLOR = "#D1FAE5";

export function DonutChart({ billableHours, nonBillableHours, totalHours }: DonutChartProps) {
  const [hovered, setHovered] = useState<{ name: string; value: number } | null>(null);

  if (totalHours === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No hours logged yet
      </div>
    );
  }

  const data = [
    { name: "Billable", value: billableHours, color: BILLABLE_COLOR },
    { name: "Non-billable", value: nonBillableHours, color: NB_COLOR },
  ].filter((d) => d.value > 0);

  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  return (
    <div className="flex items-center gap-6">
      {/* Donut — hover changes the centre label instead of showing a tooltip */}
      <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
        <PieChart width={148} height={148}>
          <Pie
            data={data}
            cx={74}
            cy={74}
            innerRadius={46}
            outerRadius={66}
            paddingAngle={data.length > 1 ? 2 : 0}
            dataKey="value"
            strokeWidth={0}
            onMouseEnter={(entry) => setHovered({ name: entry.name as string, value: entry.value as number })}
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={hovered && hovered.name !== entry.name ? 0.5 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              />
            ))}
          </Pie>
        </PieChart>

        {/* Centre — shows hovered slice info, otherwise shows overall billable % */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hovered ? (
            <>
              <span className="text-sm font-bold text-gray-900 leading-tight">
                {formatHours(hovered.value)}
              </span>
              <span className="mt-0.5 max-w-[72px] truncate text-center text-[9px] leading-tight text-gray-500">
                {hovered.name}
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-gray-900">{billablePct}%</span>
              <span className="text-[10px] text-gray-400">billable</span>
            </>
          )}
        </div>
      </div>

      {/* Legend — also interactive: hovering a legend row highlights the slice */}
      <div className="space-y-2.5">
        <div
          className="flex cursor-default items-center gap-2.5"
          onMouseEnter={() => billableHours > 0 && setHovered({ name: "Billable", value: billableHours })}
          onMouseLeave={() => setHovered(null)}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full transition-transform duration-150"
            style={{
              backgroundColor: BILLABLE_COLOR,
              transform: hovered?.name === "Billable" ? "scale(1.35)" : "scale(1)",
            }}
          />
          <div>
            <p className="text-xs font-medium text-gray-900">{formatHours(billableHours)}</p>
            <p className="text-[11px] text-gray-400">Billable</p>
          </div>
        </div>
        <div
          className="flex cursor-default items-center gap-2.5"
          onMouseEnter={() => nonBillableHours > 0 && setHovered({ name: "Non-billable", value: nonBillableHours })}
          onMouseLeave={() => setHovered(null)}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-emerald-200 transition-transform duration-150"
            style={{
              backgroundColor: NB_COLOR,
              transform: hovered?.name === "Non-billable" ? "scale(1.35)" : "scale(1)",
            }}
          />
          <div>
            <p className="text-xs font-medium text-gray-900">{formatHours(nonBillableHours)}</p>
            <p className="text-[11px] text-gray-400">Non-billable</p>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs font-semibold text-gray-700">{formatHours(totalHours)}</p>
          <p className="text-[11px] text-gray-400">Total</p>
        </div>
      </div>
    </div>
  );
}
