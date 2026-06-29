"use client";

import { QUICK_HOURS, formatHours, parseHours } from "@/lib/hours";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HoursInputProps {
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}

export function HoursInput({ value, onChange, disabled }: HoursInputProps) {
  const display = value > 0 ? String(value) : "";

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseHours(e.target.value);
    if (parsed > 0) onChange(parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const parsed = parseHours((e.target as HTMLInputElement).value);
      if (parsed > 0) onChange(parsed);
    }
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        placeholder="e.g. 1.5 or 1h 30m"
        defaultValue={display}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex gap-2">
        {QUICK_HOURS.map((h) => (
          <Button
            key={h}
            type="button"
            variant={value === h ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange(h)}
            className={cn("flex-1 text-xs", value === h && "bg-primary text-primary-foreground")}
          >
            {formatHours(h)}
          </Button>
        ))}
      </div>
    </div>
  );
}
