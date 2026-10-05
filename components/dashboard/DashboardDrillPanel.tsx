import * as React from "react";
import { X, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

/** Centered drill-down dialog — same pattern as SDO Performance modals */
export default function DashboardDrillPanel({
  open, context, rows, loading, onClose, onBack, onRowClick, onStatClick,
}: Props) {
  const stats = React.useMemo(() => computeDrillStats(rows), [rows]);
  const breakdown = rows.length > 0 && rows.every((r) => isNestedDrillRow(r.meta));

  return (
    <AnimatePresence>
      {open && context && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#d4e8dc] flex flex-col"
            style={{ maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#d4e8dc] bg-[#f0fdf7] rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#d4e8dc] transition-colors text-[#145c3f] shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0">
                  {context.breadcrumbs?.length ? (
                    <p className="text-[10px] text-[#5a7a6a] font-semibold uppercase tracking-wider mb-0.5 truncate">
                      {context.breadcrumbs.join(" › ")}
                    </p>
                  ) : null}
                  <p className="text-sm font-black text-slate-900 truncate">{context.title}</p>
                  {context.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{context.subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#d4e8dc] transition-colors text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-[#25a872] font-semibold px-6 py-2 border-b border-[#e8f5ee] bg-white shrink-0">
              {loading ? "Loading records…" : `${rows.length} record(s)`}
              {!loading && rows.length > 0 && onRowClick && (
                <span className="text-[#5a7a6a] font-normal">
                  {rows.some((r) => isReportRecordRow(r.meta))
                    ? " · select a report to open"
                    : rows.some((r) => isNestedDrillRow(r.meta))
                      ? " · select a row to continue"
                      : ""}
                </span>
              )}
            </p>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-24 text-center text-sm text-slate-400">No records match this filter.</div>
              ) : (
                <>
                  <DrillStatBar stats={stats} onStatClick={onStatClick} loading={loading} />
                  <div className="rounded-2xl border border-[#d4e8dc] overflow-hidden mx-4 mb-4">
                    <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 260px)" }}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7] sticky top-0 z-10">
                            <TableHead className="text-xs">Reference</TableHead>
                            <TableHead className="text-xs">Details</TableHead>
                            <TableHead className="text-xs">Zone</TableHead>
                            <TableHead className="text-xs">State</TableHead>
                            <TableHead className="text-xs">{breakdown ? "Count" : "Status"}</TableHead>
                            <TableHead className="text-xs text-right">Date</TableHead>
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
                                        className="inline-flex items-center gap-1 rounded-lg border border-[#25a872]/40 bg-[#f0fdf7] px-2 py-0.5 text-xs font-black text-[#145c3f] hover:bg-[#d4e8dc] transition-colors"
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
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
