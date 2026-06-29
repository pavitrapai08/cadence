"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableDayProps {
  date: string;
  locked: boolean;
  children: React.ReactNode;
}

export function DroppableDay({ date, locked, children }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: date,
    disabled: locked,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 transition-colors duration-100",
        isOver && !locked && "bg-primary/[0.04]"
      )}
    >
      {children}
    </div>
  );
}
