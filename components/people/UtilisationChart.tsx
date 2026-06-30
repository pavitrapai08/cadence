"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatHours } from "@/lib/hours";
import { PersonUtilisation } from "@/lib/types";

interface UtilisationChartProps {
  weeks: string[];
  users: PersonUtilisation[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  totalCapacity: number;
}

function CustomTooltip({ active, payload, label, totalCapacity }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const billable = payload.find((p) => p.dataKey === "billable")?.value ?? 0;
  const nonBillable =
    payload.find((p) => p.dataKey === "nonBillable")?.value ?? 0;
  const logged = billable + nonBillable;
  const billablePct = logged > 0 ? Math.round((billable / logged) * 100) : 0;
  const freeCapacity = Math.max(0, totalCapacity - logged);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-400">
        Capacity:{" "}
        <span className="font-medium text-gray-700">
          {formatHours(totalCapacity)}
        </span>
      </p>
      <p className="text-gray-400">
        Logged:{" "}
        <span className="font-medium text-gray-700">{formatHours(logged)}</span>
      </p>
      <p className="text-emerald-700">
        Billable: <span className="font-medium">{billablePct}%</span>
      </p>
      <p className="text-gray-400">
        Non-billable:{" "}
        <span className="font-medium text-gray-600">
          {formatHours(nonBillable)}
        </span>
      </p>
      <p className="text-gray-400">
        Free:{" "}
        <span className="font-medium text-gray-600">
          {formatHours(freeCapacity)}
        </span>
      </p>
    </div>
  );
}

export function UtilisationChart({ weeks, users }: UtilisationChartProps) {
  const totalCapacity = users.reduce((s, u) => s + u.capacityHours, 0);

  const data = weeks.map((weekStart) => {
    let billable = 0;
    let total = 0;
    for (const u of users) {
      const wd = u.weeklyData.find((w) => w.weekStart === weekStart);
      if (wd) {
        total += wd.hours;
        billable += wd.billable;
      }
    }
    const nonBillable = Math.max(0, total - billable);
    return {
      weekStart,
      label: format(parseISO(weekStart), "MMM d"),
      billable: Math.round(billable * 100) / 100,
      nonBillable: Math.round(nonBillable * 100) / 100,
    };
  });

  const hasData = data.some((d) => d.billable + d.nonBillable > 0);
  if (!hasData) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        No hours logged in this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
        barSize={20}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          content={<CustomTooltip totalCapacity={totalCapacity} />}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        {totalCapacity > 0 && (
          <ReferenceLine
            y={totalCapacity}
            stroke="#d1d5db"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
        <Bar dataKey="billable" stackId="a" fill="#1B6B3A" radius={[0, 0, 0, 0]} name="Billable" />
        <Bar dataKey="nonBillable" stackId="a" fill="#D1FAE5" radius={[3, 3, 0, 0]} name="Non-billable" />
      </BarChart>
    </ResponsiveContainer>
  );
}
