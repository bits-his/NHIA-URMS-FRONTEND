import * as React from "react";
import { ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { computeDrillStats, type DrillStatChip } from "./drillStats";
import { DrillStatBar } from "./DrillStatBar";

export type DrillRow = {
  id: string | number;
  reference?: string | null;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  date?: string | null;
  state_name?: string | null;
  zone_name?: string | null;
  state_id?: string | number | null;
  zone_id?: string | number | null;
  meta?: string | null;
};

export type DrillContext = {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
};

interface Props {
  open: boolean;
  context: DrillContext | null;
  rows: DrillRow[];
  loading?: boolean;
  onClose: () => void;
  onBack?: () => void;
  onRowClick?: (row: DrillRow) => void;
  onStatClick?: (stat: DrillStatChip) => void;
}

const statusColor = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v.includes("approv") || v.includes("clos") || v.includes("resolv")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v.includes("submit")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (v.includes("draft") || v.includes("pend")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (v.includes("escal") || v.includes("reject")) return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const displayMeta = (meta?: string | null) => {
  if (!meta) return null;
  if (meta.startsWith("segment:") || meta.startsWith("report_type:") || meta.startsWith("zone:") || meta.startsWith("state:")) return null;
  return meta;
};

const isNestedDrillRow = (meta?: string | null) =>
  !!meta && (meta.startsWith("zone:") || meta.startsWith("state:") || meta.startsWith("segment:") || meta.startsWith("report_type:"));

const isReportRecordRow = (meta?: string | null) => !!meta && meta.startsWith("record:");

/** Standard shadcn Dialog for drill-down details */
export default function DashboardDrillPanel({
  open, context, rows, loading, onClose, onBack, onRowClick, onStatClick,
}: Props) {
  const stats = React.useMemo(() => computeDrillStats(rows), [rows]);
  const breakdown = rows.length > 0 && rows.every((r) => isNestedDrillRow(r.meta));

  return (
    <Dialog open={open && !!context} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] p-0 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-3.5 border-b border-[#d4e8dc] bg-[#f4f7f5] space-y-0 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-8">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={onBack}
                className="w-8 h-8 rounded-sm hover:bg-[#d4e8dc] text-[#145c3f] shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="min-w-0">
              {context?.breadcrumbs?.length ? (
                <p className="text-[10px] text-[#1a7a52] font-bold uppercase tracking-wider mb-0.5 truncate">
                  {context.breadcrumbs.join(" › ")}
                </p>
              ) : null}
              <DialogTitle className="text-base font-black text-slate-900 truncate">
                {context?.title || "Record Drill-down"}
              </DialogTitle>
              {context?.subtitle && (
                <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate">
                  {context.subtitle}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 border-b border-slate-100 bg-[#f8faf9] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-[#1a7a52]">
            {loading ? "Loading records…" : `${rows.length} record(s)`}
            {!loading && rows.length > 0 && onRowClick && (
              <span className="text-slate-500 font-normal">
                {rows.some((r) => isReportRecordRow(r.meta))
                  ? " · select a report to open"
                  : rows.some((r) => isNestedDrillRow(r.meta))
                    ? " · select a row to continue"
                    : ""}
              </span>
            )}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading records…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400">No records match this filter.</div>
          ) : (
            <>
              <DrillStatBar stats={stats} onStatClick={onStatClick} loading={loading} />
              <div className="rounded-sm border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f4f7f5]">
                      <TableHead className="text-xs font-bold text-slate-700">Reference</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Details</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Zone</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">State</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">{breakdown ? "Count" : "Status"}</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const meta = displayMeta(row.meta);
                      const count = parseInt(String(row.status ?? ""), 10);
                      const countIsDrill = breakdown && isNestedDrillRow(row.meta) && Number.isFinite(count);
                      return (
                        <TableRow
                          key={row.id}
                          className={onRowClick ? "cursor-pointer hover:bg-[#f0fdf7]" : undefined}
                          onClick={() => onRowClick?.(row)}
                        >
                          <TableCell className="text-xs font-mono font-bold text-[#145c3f]">
                            {row.reference || "—"}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{row.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {[row.subtitle, meta].filter(Boolean).join(" · ")}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs text-[#145c3f] font-semibold whitespace-nowrap">
                            {row.zone_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-medium whitespace-nowrap">
                            {row.state_name || "—"}
                          </TableCell>
                          <TableCell>
                            {row.status ? (
                              countIsDrill ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowClick?.(row);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm border border-[#25a872]/40 bg-[#f0fdf7] px-2 py-0.5 text-xs font-black text-[#145c3f] hover:bg-[#d4e8dc] transition-colors"
                                >
                                  {row.status}
                                  <ChevronRight className="w-3 h-3 opacity-70" />
                                </button>
                              ) : (
                                <Badge variant="outline" className={`text-[10px] ${statusColor(row.status)}`}>
                                  {row.status}
                                </Badge>
                              )
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground whitespace-nowrap">
                            {row.date ? String(row.date).slice(0, 10) : "—"}
                            {onRowClick && (isNestedDrillRow(row.meta) || isReportRecordRow(row.meta)) && (
                              <ChevronRight className="w-3 h-3 inline ml-1 text-[#25a872] opacity-60" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
