import * as React from "react";
import {
  AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Clock, Columns2,
  FileText, LayoutGrid, LineChart as LineChartIcon, Loader2, MapPin,
  MessageSquare, RefreshCw, Rows3, Table2, Target, TrendingDown,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { stateOfficeDashboardApi } from "@/lib/api";
import type { AuthUser } from "@/src/store/authSlice";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { RoleDashboardFilters, useRoleDashboardFilters } from "@/components/dashboard/RoleDashboardFilters";
import StateOfficeDrillReportReview from "@/components/dashboard/StateOfficeDrillReportReview";
import { parseDrillReportRecord } from "@/components/dashboard/stateOfficeDrillUtils";
import type { StateOfficeReportType } from "@/components/stateOffice/constants";
import type { DrillRow } from "@/components/dashboard/DashboardDrillPanel";

interface Props {
  user?: AuthUser;
  zoneName?: string;
  onReviewReports?: () => void;
  onNavigate?: (path: string) => void;
}

const DESIGN_KEY = "urms.zc.dashboard.design";
const CHART_KEY = "urms.zc.dashboard.chart";
const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#25a872"];

const DESIGNS = [
  {
    id: "focus",
    label: "Focus",
    icon: Rows3,
    blurb: "Zone actions and state bands first. Pin a month, status, pack, or state.",
  },
  {
    id: "compare",
    label: "Compare",
    icon: Columns2,
    blurb: "State-by-state performance plus period and plan vs conducted.",
  },
  {
    id: "cards",
    label: "Cards",
    icon: LayoutGrid,
    blurb: "Scan zone KPIs, then open one for the supporting chart.",
  },
  {
    id: "ledger",
    label: "Table",
    icon: Table2,
    blurb: "State scorecard for hand-off. Open a row to drill that state.",
  },
] as const;

const CHARTS = [
  { id: "bar", label: "Bars", icon: BarChart3 },
  { id: "line", label: "Lines", icon: LineChartIcon },
  { id: "area", label: "Area", icon: AreaChartIcon },
] as const;

type DesignId = (typeof DESIGNS)[number]["id"];
type ChartId = (typeof CHARTS)[number]["id"];

function AreaChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 17l6-6 4 3 8-8" />
      <path d="M3 17h18" opacity="0.4" />
      <path d="M3 17l6-6 4 3 8-8v11H3z" fill="currentColor" opacity="0.15" stroke="none" />
    </svg>
  );
}

function storedChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  } catch { /* */ }
  return fallback;
}

function remember(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* */ }
}

function severityCls(s: string) {
  if (s === "high") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function bandBadge(band: string) {
  if (band === "performing") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (band === "lagging") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function bandLabel(band: string) {
  if (band === "performing") return "Performing";
  if (band === "lagging") return "Lagging";
  return "Needs intervention";
}

function tipStyle() {
  return {
    borderRadius: 12,
    border: "1px solid #d4e8dc",
    boxShadow: "0 8px 24px rgba(15,61,46,0.08)",
    fontSize: 12,
  };
}

function fmtNum(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString();
}

function Segmented<T extends string>({
  value, options, onChange, ariaLabel,
}: {
  value: T;
  options: readonly { id: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              on ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AccentKpi({
  label, value, detail, accent, onClick, active,
}: {
  label: string;
  value: string | number;
  detail?: string;
  accent: "blue" | "teal" | "amber" | "green" | "purple" | "rose";
  onClick?: () => void;
  active?: boolean;
}) {
  const border = {
    blue: "border-l-sky-500",
    teal: "border-l-teal-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    purple: "border-l-violet-500",
    rose: "border-l-rose-500",
  }[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full min-h-[108px] rounded-xl border border-slate-200 border-l-4 ${border} bg-white p-4 flex flex-col text-left hover:shadow-sm transition-shadow ${
        active ? "ring-2 ring-teal-600/30" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight min-h-[28px]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 leading-tight">{value}</p>
      <p className="mt-auto pt-2 text-xs text-slate-500 leading-snug">{detail || " "}</p>
    </button>
  );
}

function ChartShell({
  title, hint, children, height = 260,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div style={{ height }} className="w-full">{children}</div>
    </div>
  );
}

/** Zonal Coordinator — comparative oversight home dashboard */
export default function ZonalComparativeDashboard({
  user, zoneName = "Zone", onReviewReports, onNavigate,
}: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewTarget, setReviewTarget] = React.useState<{
    reportType: StateOfficeReportType;
    reportId: number | string;
    reference?: string | null;
  } | null>(null);

  const [design, setDesign] = React.useState<DesignId>(() => storedChoice(DESIGN_KEY, DESIGNS.map((d) => d.id), "focus"));
  const [chart, setChart] = React.useState<ChartId>(() => storedChoice(CHART_KEY, CHARTS.map((c) => c.id), "area"));
  const [pinnedMonth, setPinnedMonth] = React.useState<string | null>(null);
  const [pinnedStatus, setPinnedStatus] = React.useState<string | null>(null);
  const [pinnedPack, setPinnedPack] = React.useState<string | null>(null);
  const [pinnedState, setPinnedState] = React.useState<string | null>(null);
  const [openCard, setOpenCard] = React.useState<"completion" | "implementation" | "action" | "states">("action");

  const lockZone = user?.zonal_code || user?.zone_id || user?.zone?.zonal_code || null;

  const filters = useRoleDashboardFilters({
    lockZoneId: lockZone ? String(lockZone) : null,
    showState: true,
    showBand: true,
  });

  const openReportFromDrill = React.useCallback((row: DrillRow) => {
    const parsed = parseDrillReportRecord(row);
    if (!parsed) {
      const stateId = (row as any).state_id;
      if (stateId) {
        filters.setStateId(String(stateId));
        return;
      }
      toast.info("Open this record from its module list.");
      return;
    }
    setReviewTarget({
      reportType: parsed.reportType,
      reportId: parsed.reportId,
      reference: row.reference,
    });
  }, [filters]);

  const drill = useDashboardDrill(
    (params) => stateOfficeDashboardApi.getDashboardDrill(params),
    filters.drillScope,
    { onReportRecord: openReportFromDrill },
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeDashboardApi.getDashboard(filters.apiFilters);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load zonal dashboard", { description: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { void load(); }, [load]);

  const op = data?.operational;
  const cmp = data?.comparative;
  const needs = op?.needs_action;
  const current = op?.current;
  const previous = op?.previous;
  const vs = op?.vs_previous;
  const summary = cmp?.summary;
  const periodLabel = op?.current_period?.label || cmp?.period?.label;
  const scopeLine = `${zoneName}${periodLabel ? ` · ${periodLabel}` : ""}`;
  const drillCtx = { subtitle: scopeLine, breadcrumbs: ["Zonal Coordinator"] };
  const activeDesign = DESIGNS.find((d) => d.id === design) || DESIGNS[0];

  const allStates: any[] = cmp?.states ?? [];
  const states = React.useMemo(() => {
    let rows = allStates;
    if (filters.band !== "all") rows = rows.filter((s) => s.band === filters.band);
    if (pinnedState) rows = rows.filter((s) => String(s.state_id) === pinnedState);
    return rows;
  }, [allStates, filters.band, pinnedState]);

  const drillReports = (title: string, extra?: Record<string, string>) => {
    drill.openRecordDrill("all_reports", title, drillCtx, extra);
  };

  const drillReportType = (key: string, label: string) => {
    drill.openDrill(
      { segment: "reports", report_type: key },
      { title: label, subtitle: drillCtx.subtitle, breadcrumbs: [...drillCtx.breadcrumbs, label] },
      { resetStack: true },
    );
  };

  const drillState = (stateId: number | string, stateName: string) => {
    setPinnedState(String(stateId));
    drill.openDrill(
      { segment: "all_reports", state_id: String(stateId) },
      { title: stateName, subtitle: `${zoneName} · reports`, breadcrumbs: ["Zonal Coordinator", "By State"] },
      { resetStack: true },
    );
  };

  const drillStates = () => {
    drill.openDrill(
      { segment: "state_breakdown", record_segment: "all_reports" },
      { title: "States in zone", subtitle: zoneName, breadcrumbs: ["Zonal Coordinator", "By State"] },
      { resetStack: true },
    );
  };

  const statusPie = React.useMemo(() => {
    if (!current) return [];
    return [
      { name: "Approved", value: current.approved || 0, color: "#14b8a6", status: "approved" },
      { name: "Submitted", value: current.submitted || 0, color: "#0ea5e9", status: "submitted" },
      { name: "Draft", value: current.drafts || 0, color: "#f59e0b", status: "draft" },
    ].filter((d) => d.value > 0);
  }, [current]);

  const planChart = React.useMemo(() => {
    if (!op) return [];
    return [
      { name: "Planned", value: op.planned_activities || 0, fill: "#94a3b8" },
      { name: "Conducted", value: op.activities_conducted || 0, fill: "#14b8a6" },
    ];
  }, [op]);

  const periodCompareChart = React.useMemo(() => {
    if (!current || !previous) return [];
    return [
      { metric: "Reports", current: current.reports, previous: previous.reports },
      { metric: "Submitted", current: current.submitted, previous: previous.submitted },
      { metric: "Approved", current: current.approved, previous: previous.approved },
    ];
  }, [current, previous]);

  const stateCompareChart = React.useMemo(() =>
    states.map((s) => ({
      name: s.state_name?.length > 12 ? `${s.state_name.slice(0, 11)}…` : s.state_name,
      full: s.state_name,
      state_id: s.state_id,
      completion: s.completion_rate,
      implementation: s.implementation_rate,
      reports: s.reports,
    })),
  [states]);

  const bandPie = React.useMemo(() => ([
    { name: "Performing", value: summary?.performing ?? 0, color: "#25a872", band: "performing" },
    { name: "Lagging", value: summary?.lagging ?? 0, color: "#f59e0b", band: "lagging" },
    { name: "Needs intervention", value: summary?.needs_intervention ?? 0, color: "#ef4444", band: "needs_intervention" },
  ].filter((d) => d.value > 0)), [summary]);

  const topTypes = React.useMemo(() => {
    const rows = (data?.reports_by_type ?? []).map((r: any) => ({
      ...r,
      total: Number(r.total ?? r.reports ?? 0),
    }));
    return pinnedPack ? rows.filter((r: any) => r.key === pinnedPack) : rows.slice(0, 8);
  }, [data?.reports_by_type, pinnedPack]);

  const trend = op?.period_trend ?? [];
  const pinnedTrend = trend.find((t: any) => t.month === pinnedMonth) || null;

  const chooseDesign = (id: DesignId) => {
    setDesign(id);
    remember(DESIGN_KEY, id);
  };
  const chooseChart = (id: ChartId) => {
    setChart(id);
    remember(CHART_KEY, id);
  };

  const actionItems = [
    { label: "Pending review", value: needs?.pending_review ?? 0, icon: Clock, path: null as string | null, color: "#0ea5e9", drill: () => drillReports("Pending review", { status: "submitted" }) },
    { label: "Draft reports", value: needs?.draft_reports ?? 0, icon: FileText, path: null as string | null, color: "#f59e0b", drill: () => drillReports("Draft reports", { status: "draft" }) },
    { label: "Open actionables", value: needs?.open_actionables ?? 0, icon: ClipboardList, path: "/soc/weekly-actionable", color: "#ef4444", drill: () => drillReportType("weekly_actionable", "Weekly Actionable") },
    { label: "Review queue", value: null as number | null, icon: CheckCircle2, path: null as string | null, color: "#145c3f", drill: null as (() => void) | null, hint: "Validate state submissions", onClick: () => onReviewReports?.() },
    { label: "Complaints register", value: null as number | null, icon: MessageSquare, path: "/sdo/servicom/complaints", color: "#0f766e", drill: null as (() => void) | null, hint: "Zonal office inbox" },
  ];

  const trendChart = (
    <ChartShell
      title="6-month zone activity trend"
      hint={pinnedTrend
        ? `${pinnedTrend.label}: ${fmtNum(pinnedTrend.reports)} reports · ${fmtNum(pinnedTrend.submitted)} submitted · ${fmtNum(pinnedTrend.approved)} approved. Click again to clear.`
        : "Click a month to pin it, or drill into that period."}
    >
      {trend.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">No trend yet</div>
      ) : chart === "line" ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trend}
            onClick={(e: any) => {
              const m = e?.activePayload?.[0]?.payload?.month;
              if (!m) return;
              setPinnedMonth((cur) => (cur === m ? null : m));
            }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
            <Tooltip contentStyle={tipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {pinnedMonth ? <ReferenceLine x={pinnedTrend?.label} stroke="#0f3d2e" strokeDasharray="4 4" /> : null}
            <Line type="monotone" dataKey="reports" name="Reports" stroke="#14b8a6" strokeWidth={2.4} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="approved" name="Approved" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : chart === "bar" ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={trend}
            onClick={(e: any) => {
              const m = e?.activePayload?.[0]?.payload?.month;
              if (!m) return;
              setPinnedMonth((cur) => (cur === m ? null : m));
            }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
            <Tooltip contentStyle={tipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="reports" name="Reports" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="submitted" name="Submitted" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="approved" name="Approved" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trend}
            onClick={(e: any) => {
              const m = e?.activePayload?.[0]?.payload?.month;
              if (m) {
                setPinnedMonth((cur) => (cur === m ? null : m));
                drillReports(`Reports — ${m}`, { month: m });
              }
            }}
            className="cursor-pointer"
          >
            <defs>
              <linearGradient id="zcReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
            <Tooltip contentStyle={tipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {pinnedMonth ? <ReferenceLine x={pinnedTrend?.label} stroke="#0f3d2e" strokeDasharray="4 4" /> : null}
            <Area type="monotone" dataKey="reports" name="Reports" stroke="#14b8a6" fill="url(#zcReports)" strokeWidth={2} />
            <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#0ea5e9" fill="transparent" strokeWidth={2} />
            <Area type="monotone" dataKey="approved" name="Approved" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );

  const statusChart = (
    <ChartShell title="Status mix" hint="Click a slice to drill that status.">
      {statusPie.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">No reports this period</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pinnedStatus ? statusPie.filter((s) => s.status === pinnedStatus) : statusPie}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              className="cursor-pointer"
              onClick={(_: any, idx: number) => {
                const slice = (pinnedStatus ? statusPie.filter((s) => s.status === pinnedStatus) : statusPie)[idx];
                if (!slice) return;
                setPinnedStatus((cur) => (cur === slice.status ? null : slice.status));
                drillReports(slice.name, { status: slice.status });
              }}
            >
              {(pinnedStatus ? statusPie.filter((s) => s.status === pinnedStatus) : statusPie).map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tipStyle()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );

  const packsChart = (
    <ChartShell title={`What is happening in ${zoneName}?`} hint="Click a pack to pin and drill." height={280}>
      {topTypes.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">No report activity yet</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topTypes}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
            onClick={(e: any) => {
              const row = e?.activePayload?.[0]?.payload;
              if (!row?.key) return;
              setPinnedPack((cur) => (cur === row.key ? null : row.key));
              drillReportType(row.key, row.label);
            }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tipStyle()} />
            <Bar dataKey="total" name="Reports" radius={[0, 6, 6, 0]} barSize={14}>
              {topTypes.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={!pinnedPack || topTypes[i]?.key === pinnedPack ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );

  const statesCompareBlock = (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3">
        <ChartShell title="State performance comparison" hint="Click a state bar to drill into its reports" height={300}>
          {stateCompareChart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">No states in scope</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stateCompareChart}
                barGap={4}
                barSize={14}
                className="cursor-pointer"
                onClick={(e: any) => {
                  const row = e?.activePayload?.[0]?.payload;
                  if (row?.state_id) drillState(row.state_id, row.full);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle()} labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completion" name="Completion %" fill="#25a872" radius={[4, 4, 0, 0]} />
                <Bar dataKey="implementation" name="Implementation %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>
      </div>
      <div className="lg:col-span-2">
        <ChartShell title="Band distribution" hint="Click a slice to filter the band" height={300}>
          {bandPie.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">No band data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bandPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={3}
                  className="cursor-pointer"
                  onClick={(_: any, idx: number) => {
                    const slice = bandPie[idx];
                    if (slice) filters.setBand(slice.band);
                  }}
                >
                  {bandPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle()} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartShell>
      </div>
    </div>
  );

  const bandLists = (
    <div className="grid lg:grid-cols-3 gap-4">
      {([
        { key: "performing", title: "Performing", icon: CheckCircle2, iconCls: "text-emerald-600", rows: (cmp?.performing ?? []).filter((s: any) => filters.band === "all" || filters.band === "performing") },
        { key: "lagging", title: "Lagging", icon: TrendingDown, iconCls: "text-amber-600", rows: (cmp?.lagging ?? []).filter((s: any) => filters.band === "all" || filters.band === "lagging") },
        { key: "needs_intervention", title: "Need intervention", icon: AlertTriangle, iconCls: "text-rose-600", rows: (cmp?.needs_intervention ?? []).filter((s: any) => filters.band === "all" || filters.band === "needs_intervention") },
      ] as const).map((col) => (
        <div key={col.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center gap-2">
            <col.icon className={`w-4 h-4 ${col.iconCls}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{col.title}</p>
              <p className="text-xs text-slate-500">{col.rows.length} state{col.rows.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {col.rows.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">None in this band</p>
            ) : col.rows.map((s: any) => (
              <button
                key={s.state_id}
                type="button"
                onClick={() => drillState(s.state_id, s.state_name)}
                className="w-full flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-left hover:border-teal-300/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.state_name}</p>
                  <p className="text-[11px] text-slate-500">
                    {s.completion_rate}% complete · impl {s.implementation_rate}% · {s.reports} reports
                  </p>
                </div>
                {col.key === "performing" ? <Progress value={s.completion_rate} className="w-16 h-1.5" /> : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const actionQueue = (
    <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-semibold text-slate-800">What needs my action?</p>
      <p className="mb-3 text-xs text-slate-500">Immediate items across {zoneName}</p>
      <div className="space-y-2 flex-1">
        {actionItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if ("onClick" in item && item.onClick) item.onClick();
              else if (item.drill && typeof item.value === "number" && item.value > 0) item.drill();
              else if (item.path) onNavigate?.(item.path);
            }}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left hover:border-teal-300/60 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              {"hint" in item && item.hint ? <p className="text-[11px] text-slate-500 truncate">{item.hint}</p> : null}
            </div>
            {typeof item.value === "number" ? (
              <span className="text-lg font-bold tabular-nums text-slate-900">{item.value}</span>
            ) : (
              <span className="text-xs font-semibold text-teal-800">Open →</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const offTrack = (
    <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Off-track & attention</p>
          <p className="text-xs text-slate-500">Where zone performance is slipping</p>
        </div>
        <button type="button" onClick={() => drillReports("All reports")} className="text-[11px] font-semibold text-teal-700 hover:underline">
          All reports
        </button>
      </div>
      {(op?.off_track ?? []).length === 0 && !(cmp?.recurring_problems?.length) ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700">All clear</p>
          <p className="text-xs text-slate-500">No off-track items flagged for this period.</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {(op?.off_track ?? []).map((item: any) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === "drafts") drillReports("Draft reports", { status: "draft" });
                else if (item.key === "pending_review") drillReports("Pending review", { status: "submitted" });
                else drillReports(item.label);
              }}
              className="w-full flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-left hover:border-teal-300/60"
            >
              <Badge variant="outline" className={`text-[10px] shrink-0 ${severityCls(item.severity)}`}>
                {item.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
              </div>
              <span className="text-base font-bold tabular-nums text-slate-900">
                {item.count}{item.key === "implementation" ? "%" : ""}
              </span>
            </button>
          ))}
          {(cmp?.recurring_problems ?? []).map((p: any) => (
            <button
              key={p.key || p.label}
              type="button"
              onClick={() => {
                if (p.key === "pending_review") drillReports("Pending review", { status: "submitted" });
                else if (p.key === "draft_backlog") drillReports("Draft backlog", { status: "draft" });
                else if (p.key === "no_reports") drillStates();
                else drillReports(p.label);
              }}
              className="w-full flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left hover:border-teal-300/60"
            >
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                <p className="text-[11px] text-slate-500">Recurring across states</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {p.states_affected} state{p.states_affected === 1 ? "" : "s"}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const periodCompareBlock = (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <ChartShell
          title="Performance vs previous period"
          hint={`${op?.current_period?.label} compared with ${op?.previous_period?.label}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodCompareChart} barGap={6} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle()} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="previous" name={op?.previous_period?.label} fill="#94a3b8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="current" name={op?.current_period?.label} fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
      <ChartShell title="Plan vs conducted" hint="Approved packs with plan / completion signals">
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle()} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                  {planChart.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Implementation rate</span>
              <span className="font-bold text-slate-800">{op?.implementation_rate ?? 0}%</span>
            </div>
            <Progress value={Math.min(100, Number(op?.implementation_rate || 0))} className="h-2" />
          </div>
        </div>
      </ChartShell>
    </div>
  );

  const scorecard = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">All states — scorecard</p>
        <p className="text-xs text-slate-500">Click a row to drill into that state · {zoneName}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["State", "Band", "Reports", "Submitted", "Approved", "Completion", "Impl. %"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-400">No states match the current filters</td>
              </tr>
            ) : states.map((s) => (
              <tr
                key={s.state_id}
                className="border-t border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                onClick={() => drillState(s.state_id, s.state_name)}
              >
                <td className="px-3 py-2.5 font-semibold text-teal-800">{s.state_name}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className={`text-[10px] ${bandBadge(s.band)}`}>
                    {bandLabel(s.band)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{s.reports}</td>
                <td className="px-3 py-2.5 tabular-nums">{s.submitted}</td>
                <td className="px-3 py-2.5 tabular-nums">{s.approved}</td>
                <td className="px-3 py-2.5 tabular-nums font-semibold">{s.completion_rate}%</td>
                <td className="px-3 py-2.5 tabular-nums">{s.implementation_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const kpiRow = current && op && needs ? (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AccentKpi
        accent="teal"
        label="Zone completion"
        value={`${summary?.zone_avg_completion ?? current.completion_rate}%`}
        detail={`${current.approved} approved of ${current.reports}`}
        active={openCard === "completion"}
        onClick={() => { setOpenCard("completion"); drillReports("All zone reports — completion"); }}
      />
      <AccentKpi
        accent="blue"
        label="Zone implementation"
        value={`${summary?.zone_avg_implementation ?? op.implementation_rate}%`}
        detail={`${op.activities_conducted} conducted · ${op.planned_activities} planned`}
        active={openCard === "implementation"}
        onClick={() => setOpenCard("implementation")}
      />
      <AccentKpi
        accent="amber"
        label="Needs your action"
        value={needs.total}
        detail={`${needs.pending_review} review · ${needs.draft_reports} drafts`}
        active={openCard === "action"}
        onClick={() => { setOpenCard("action"); drillReports("Needs action — submitted", { status: "submitted" }); }}
      />
      <AccentKpi
        accent="rose"
        label="States to support"
        value={summary?.needs_intervention ?? 0}
        detail={`${summary?.states_in_scope ?? states.length} in scope · ${summary?.lagging ?? 0} lagging`}
        active={openCard === "states"}
        onClick={() => { setOpenCard("states"); drillStates(); }}
      />
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f7fafc] -m-1 md:-m-2 rounded-xl overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 md:px-5 py-2 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 shrink-0">
                Zonal Coordinator Dashboard
              </h1>
              <span className="hidden sm:inline rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 shrink-0">
                Zone
              </span>
              <span className="text-xs text-slate-500 truncate hidden md:inline">{scopeLine}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate md:hidden">{scopeLine}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <RoleDashboardFilters filters={filters} compact />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="h-8 w-8 p-0 shrink-0"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Segmented value={design} options={DESIGNS} onChange={chooseDesign} ariaLabel="Dashboard design" />
          {(design === "focus" || design === "compare" || design === "cards") ? (
            <Segmented value={chart} options={CHARTS} onChange={chooseChart} ariaLabel="Chart style" />
          ) : (
            <p className="text-[11px] text-slate-400 hidden sm:block">{activeDesign.blurb}</p>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-5 py-4 space-y-4 pb-12 max-w-[1400px] mx-auto w-full">

          {(pinnedMonth || pinnedStatus || pinnedPack || pinnedState) ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Pinned:</span>
              {pinnedMonth ? (
                <button type="button" onClick={() => setPinnedMonth(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                  Month {pinnedTrend?.label || pinnedMonth} ×
                </button>
              ) : null}
              {pinnedStatus ? (
                <button type="button" onClick={() => setPinnedStatus(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                  Status {pinnedStatus} ×
                </button>
              ) : null}
              {pinnedPack ? (
                <button type="button" onClick={() => setPinnedPack(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                  Pack {topTypes.find((t: any) => t.key === pinnedPack)?.label || pinnedPack} ×
                </button>
              ) : null}
              {pinnedState ? (
                <button type="button" onClick={() => setPinnedState(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                  State {allStates.find((s) => String(s.state_id) === pinnedState)?.state_name || pinnedState} ×
                </button>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-sm">Comparing state performance…</span>
            </div>
          ) : !data || !op || !current || !needs ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              No operational data available for this zone yet. Approved packs from states will appear here as they report.
            </div>
          ) : design === "cards" ? (
            <div className="space-y-4">
              {kpiRow}
              {openCard === "action" ? (
                <div className="grid lg:grid-cols-5 gap-4 items-stretch">
                  <div className="lg:col-span-2 min-h-0 h-full">{actionQueue}</div>
                  <div className="lg:col-span-3 min-h-0 h-full">{offTrack}</div>
                </div>
              ) : openCard === "implementation" ? (
                periodCompareBlock
              ) : openCard === "states" ? (
                <>
                  {statesCompareBlock}
                  {bandLists}
                </>
              ) : (
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">{trendChart}</div>
                  {statusChart}
                </div>
              )}
            </div>
          ) : design === "ledger" ? (
            <div className="space-y-4">
              {kpiRow}
              {scorecard}
              <div className="grid lg:grid-cols-2 gap-4 items-stretch">
                <div className="h-full min-h-0">{actionQueue}</div>
                <div className="h-full min-h-0">{offTrack}</div>
              </div>
            </div>
          ) : design === "compare" ? (
            <div className="space-y-4">
              {kpiRow}
              {statesCompareBlock}
              {bandLists}
              {periodCompareBlock}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">{trendChart}</div>
                {statusChart}
              </div>
              {packsChart}
            </div>
          ) : (
            <div className="space-y-4">
              {kpiRow}
              <div className="grid lg:grid-cols-5 gap-4 items-stretch">
                <div className="lg:col-span-2 min-h-0 h-full">{actionQueue}</div>
                <div className="lg:col-span-3 min-h-0 h-full">{offTrack}</div>
              </div>
              {statesCompareBlock}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">{trendChart}</div>
                {statusChart}
              </div>
              {packsChart}
              <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Scoped to {zoneName}. Filter by state or band to narrow the view.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <DashboardDrillPanel
        open={drill.open}
        context={drill.context}
        rows={drill.rows}
        loading={drill.loading}
        onClose={drill.close}
        onBack={drill.canGoBack ? drill.back : undefined}
        onRowClick={drill.handleNestedRow}
        onStatClick={drill.handleStatClick}
      />

      <StateOfficeDrillReportReview
        open={!!reviewTarget}
        reportType={reviewTarget?.reportType ?? "enrolment"}
        reportId={reviewTarget?.reportId ?? 0}
        reference={reviewTarget?.reference}
        user={user}
        onClose={() => setReviewTarget(null)}
        onReviewed={() => {
          setReviewTarget(null);
          void load();
        }}
      />
    </div>
  );
}
