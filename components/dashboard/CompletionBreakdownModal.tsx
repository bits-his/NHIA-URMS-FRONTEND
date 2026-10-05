import * as React from "react";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type ZoneRow = {
  zone_id?: number | string | null;
  zone_name: string;
  states: number;
  reports: number;
  approved: number;
  submitted: number;
  drafts: number;
  completion_rate: number;
  implementation_rate?: number;
};

type StateRow = {
  state_id?: number | string;
  state_name: string;
  zone_name?: string;
  reports: number;
  approved: number;
  submitted: number;
  drafts: number;
  completion_rate: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  nationalCompletion: number;
  nationalImplementation?: number;
  periodLabel?: string;
  zones: ZoneRow[];
  states?: StateRow[];
  onZoneClick?: (zone: ZoneRow) => void;
  onStatusClick?: (status: "approved" | "submitted" | "draft") => void;
}

const STATUS_COLORS = {
  approved: "#25a872",
  submitted: "#3b82f6",
  draft: "#f59e0b",
};

/** Graphical explanation of how national completion % is derived */
export default function CompletionBreakdownModal({
  open, onClose, nationalCompletion, nationalImplementation,
  periodLabel, zones, states = [], onZoneClick, onStatusClick,
}: Props) {
  const totals = React.useMemo(() => {
    const approved = zones.reduce((s, z) => s + (z.approved || 0), 0);
    const submitted = zones.reduce((s, z) => s + (z.submitted || 0), 0);
    const drafts = zones.reduce((s, z) => s + (z.drafts || 0), 0);
    return { approved, submitted, drafts };
  }, [zones]);

  const statusPie = React.useMemo(() => ([
    { name: "Approved", value: totals.approved, color: STATUS_COLORS.approved, status: "approved" as const },
    { name: "Submitted", value: totals.submitted, color: STATUS_COLORS.submitted, status: "submitted" as const },
    { name: "Draft", value: totals.drafts, color: STATUS_COLORS.draft, status: "draft" as const },
  ].filter((d) => d.value > 0)), [totals]);

  const zoneChart = React.useMemo(() =>
    [...zones]
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .map((z) => ({
        name: z.zone_name?.length > 14 ? `${z.zone_name.slice(0, 13)}…` : z.zone_name,
        full: z.zone_name,
        zone_id: z.zone_id,
        completion: z.completion_rate,
        reports: z.reports,
        approved: z.approved,
        raw: z,
      })),
  [zones]);

  const topStates = React.useMemo(() =>
    [...states].sort((a, b) => b.completion_rate - a.completion_rate).slice(0, 6),
  [states]);
  const bottomStates = React.useMemo(() =>
    [...states].sort((a, b) => a.completion_rate - b.completion_rate).slice(0, 6),
  [states]);

  return (
    <AnimatePresence>
      {open && (
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
            className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-[#d4e8dc] flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-4 border-b border-[#d4e8dc] bg-[#f0fdf7] rounded-t-3xl shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a7a52]">How the % is calculated</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  National completion · <span className="text-[#145c3f]">{nationalCompletion}%</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[periodLabel, typeof nationalImplementation === "number" ? `Impl. avg ${nationalImplementation}%` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#d4e8dc] text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 rounded-2xl border border-[#d4e8dc] p-4">
                  <p className="text-sm font-bold text-slate-800 mb-1">Report status mix</p>
                  <p className="text-[11px] text-slate-500 mb-3">Building blocks of completion · click a slice to open records</p>
                  {statusPie.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">No reports in period</div>
                  ) : (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusPie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            className={onStatusClick ? "cursor-pointer" : undefined}
                            onClick={(_: unknown, idx: number) => {
                              const slice = statusPie[idx];
                              if (slice) onStatusClick?.(slice.status);
                            }}
                          >
                            {statusPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 rounded-2xl border border-[#d4e8dc] p-4">
                  <p className="text-sm font-bold text-slate-800 mb-1">Completion by zone</p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Zone rate = average of its states · click a bar to drill that zone
                  </p>
                  {zoneChart.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">No zone data</div>
                  ) : (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={zoneChart}
                          margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
                          className={onZoneClick ? "cursor-pointer" : undefined}
                          onClick={(e: any) => {
                            const row = e?.activePayload?.[0]?.payload?.raw as ZoneRow | undefined;
                            if (row) onZoneClick?.(row);
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }}
                            formatter={(value: number, _n, item: any) => [
                              `${value}% (${item?.payload?.approved ?? 0}/${item?.payload?.reports ?? 0} approved)`,
                              "Completion",
                            ]}
                            labelFormatter={(_l, items) => items?.[0]?.payload?.full || ""}
                          />
                          <Bar dataKey="completion" name="Completion %" radius={[6, 6, 0, 0]} barSize={28}>
                            {zoneChart.map((z, i) => (
                              <Cell
                                key={String(z.zone_id ?? i)}
                                fill={z.completion >= 75 ? "#25a872" : z.completion >= 50 ? "#f59e0b" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {states.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#d4e8dc] p-4">
                    <p className="text-sm font-bold text-slate-800 mb-2">Highest state rates</p>
                    <div className="space-y-2">
                      {topStates.map((s) => (
                        <div key={String(s.state_id ?? s.state_name)} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{s.state_name}</p>
                            <p className="text-[10px] text-slate-400">{s.approved}/{s.reports} approved</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 tabular-nums">{s.completion_rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#d4e8dc] p-4">
                    <p className="text-sm font-bold text-slate-800 mb-2">Lowest state rates</p>
                    <div className="space-y-2">
                      {bottomStates.map((s) => (
                        <div key={String(s.state_id ?? s.state_name)} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{s.state_name}</p>
                            <p className="text-[10px] text-slate-400">{s.approved}/{s.reports} approved</p>
                          </div>
                          <span className="text-sm font-bold text-rose-700 tabular-nums">{s.completion_rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(onZoneClick || onStatusClick) && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 justify-center pb-1">
                  Charts are interactive <ChevronRight className="w-3 h-3" /> click to open matching records
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
