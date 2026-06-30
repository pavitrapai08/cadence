"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatHours } from "@/lib/hours";

interface DonutChartProps {
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
}

const BILLABLE_COLOR = "#1B6B3A";
const NB_COLOR = "#D1FAE5";

export function DonutChart({ billableHours, nonBillableHours, totalHours }: DonutChartProps) {
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
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={data.length > 1 ? 2 : 0}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatHours(Number(value))}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{billablePct}%</span>
          <span className="text-[10px] text-gray-400">billable</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: BILLABLE_COLOR }} />
          <div>
            <p className="text-xs font-medium text-gray-900">{formatHours(billableHours)}</p>
            <p className="text-[11px] text-gray-400">Billable</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full border border-emerald-200 shrink-0" style={{ backgroundColor: NB_COLOR }} />
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
