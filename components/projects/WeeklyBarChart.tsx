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
import { format, parseISO } from "date-fns";
import { formatHours } from "@/lib/hours";

interface WeeklyBarChartProps {
  data: { weekStart: string; hours: number }[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  if (data.every((d) => d.hours === 0)) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        No hours in the last 5 weeks
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: format(parseISO(d.weekStart), "MMM d"),
    hours: d.hours,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          formatter={(value) => [formatHours(Number(value)), "Hours"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: "rgba(27,107,58,0.04)" }}
        />
        <Bar dataKey="hours" fill="#1B6B3A" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
