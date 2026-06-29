"use client";

import { useEffect, useRef, useState } from "react";
import { QUICK_HOURS, formatHours, parseHours } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HoursInputProps {
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}

export function HoursInput({ value, onChange, disabled }: HoursInputProps) {
  const [inputStr, setInputStr] = useState(value > 0 ? formatHours(value) : "");
  const isFocused = useRef(false);

  // Sync display when value changes from outside (quick button click)
  useEffect(() => {
    if (!isFocused.current) {
      setInputStr(value > 0 ? formatHours(value) : "");
    }
  }, [value]);

  function handleFocus() {
    isFocused.current = true;
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    isFocused.current = false;
    const parsed = parseHours(e.target.value);
    if (parsed > 0) {
      onChange(parsed);
      setInputStr(formatHours(parsed));
    } else {
      setInputStr(value > 0 ? formatHours(value) : "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="e.g. 45m or 1h 30m"
        value={inputStr}
        onChange={(e) => setInputStr(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
