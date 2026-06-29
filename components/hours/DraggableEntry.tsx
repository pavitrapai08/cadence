"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { EntryCard } from "./EntryCard";
import { TimeEntry, Project } from "@/lib/types";

interface DraggableEntryProps {
  entry: TimeEntry;
  project: Project | undefined;
  locked: boolean;
  onClick: () => void;
}

export function DraggableEntry({ entry, project, locked, onClick }: DraggableEntryProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    disabled: locked || entry.status === "submitted",
    data: { entry },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <EntryCard
        entry={entry}
        project={project}
        locked={locked}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onClick={onClick}
      />
    </div>
  );
}
