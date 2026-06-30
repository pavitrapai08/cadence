"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ExportColumn {
  key: string;
  label: string;
}

interface ExportButtonProps {
  rows: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  disabled?: boolean;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportCSV(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  const { default: Papa } = await import("papaparse");
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      out[col.label] = row[col.key] ?? "";
    }
    return out;
  });
  const csv = Papa.unparse(data, { header: true, quotes: true });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

async function exportPDF(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(13);
  doc.text(filename, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleDateString()}`, 40, 56);

  const head = [columns.map((c) => c.label)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      return v === null || v === undefined ? "" : String(v);
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    head,
    body,
    startY: 68,
    theme: "grid",
    headStyles: {
      fillColor: [27, 107, 58],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: 50 },
    alternateRowStyles: { fillColor: [248, 250, 251] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${filename}.pdf`);
}

export function ExportButton({
  rows,
  columns,
  filename,
  disabled = false,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function handleExport(format: "csv" | "pdf") {
    if (exporting || rows.length === 0) return;
    setExporting(format);
    try {
      if (format === "csv") {
        await exportCSV(rows, columns, filename);
      } else {
        await exportPDF(rows, columns, filename);
      }
      toast.success(`${format.toUpperCase()} downloaded.`);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  }

  const isDisabled = disabled || rows.length === 0;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-gray-400 mr-1">Export:</span>
      {(["csv", "pdf"] as const).map((fmt) => (
        <button
          key={fmt}
          onClick={() => handleExport(fmt)}
          disabled={isDisabled || !!exporting}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting === fmt ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
