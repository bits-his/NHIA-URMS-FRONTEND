import * as React from "react";
import {
  AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Clock,
  Columns2, FileText, LayoutGrid, LineChart as LineChartIcon, Loader2,
  MessageSquare, RefreshCw, Rows3, Table2, Target,
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
  stateName?: string;
  zoneName?: string;
  onNavigate?: (path: string) => void;
}

const DESIGN_KEY = "urms.sc.dashboard.design";
const CHART_KEY = "urms.sc.dashboard.chart";
const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#25a872"];

const DESIGNS = [
  {
    id: "focus",
    label: "Focus",
    icon: Rows3,
    blurb: "KPIs and follow-ups first. Click a month, status, or pack to pin the slice.",
  },
  {
    id: "compare",
    label: "Compare",
    icon: Columns2,
    blurb: "Period vs previous, plan vs conducted, and pack mix side by side.",
  },
  {
    id: "cards",
    label: "Cards",
    icon: LayoutGrid,
    blurb: "Scan the four control KPIs, then open one for the supporting chart.",
  },
  {
    id: "ledger",
    label: "Table",
    icon: Table2,
    blurb: "Sortable figures for hand-off. Open a row for the month trend.",
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
  accent: "blue" | "teal" | "amber" | "green" | "purple";
  onClick?: () => void;
  active?: boolean;
}) {
  const border = {
    blue: "border-l-sky-500",
    teal: "border-l-teal-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    purple: "border-l-violet-500",
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

/** State Coordinator — Operational Control home dashboard */
export default function StateCoordinatorDashboard({
  user, stateName = "State", zoneName = "Zone", onNavigate,
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
  const [openCard, setOpenCard] = React.useState<"completion" | "implementation" | "action" | "reports">("action");

  const lockZone = user?.zonal_code || user?.zone_id || user?.zone?.zonal_code || null;
  const lockState = user?.state_code || user?.state_id || user?.state?.code || null;

  const filters = useRoleDashboardFilters({
    lockZoneId: lockZone ? String(lockZone) : null,
    lockStateId: lockState ? String(lockState) : null,
  });

  const openReportFromDrill = React.useCallback((row: DrillRow) => {
    const parsed = parseDrillReportRecord(row);
    if (!parsed) {
      toast.info("Open this record from its module list.");
      return;
    }
    setReviewTarget({
      reportType: parsed.reportType,
      reportId: parsed.reportId,
      reference: row.reference,
    });
  }, []);

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
      toast.error("Failed to load operational dashboard", { description: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { void load(); }, [load]);

  const op = data?.operational;
  const needs = op?.needs_action;
  const current = op?.current;
  const previous = op?.previous;
  const vs = op?.vs_previous;
  const periodLabel = op?.current_period?.label;
  const scopeLine = `${stateName} · ${zoneName}${periodLabel ? ` · ${periodLabel}` : ""}`;
  const drillCtx = { subtitle: scopeLine, breadcrumbs: ["State Coordinator"] };
  const activeDesign = DESIGNS.find((d) => d.id === design) || DESIGNS[0];

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

  const compareChart = React.useMemo(() => {
    if (!current || !previous) return [];
    return [
      { metric: "Reports", current: current.reports, previous: previous.reports },
      { metric: "Submitted", current: current.submitted, previous: previous.submitted },
      { metric: "Approved", current: current.approved, previous: previous.approved },
    ];
  }, [current, previous]);

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
    { label: "Draft reports", value: needs?.draft_reports ?? 0, icon: FileText, path: "/zonal/enrolment", color: "#f59e0b", drill: () => drillReports("Draft reports", { status: "draft" }) },
    { label: "Open actionables", value: needs?.open_actionables ?? 0, icon: ClipboardList, path: "/soc/weekly-actionable", color: "#ef4444", drill: () => drillReportType("weekly_actionable", "Weekly Actionable") },
    { label: "Open challenges", value: needs?.open_challenges ?? 0, icon: AlertTriangle, path: "/zonal/challenges", color: "#8b5cf6", drill: () => drillReportType("challenges", "Challenges") },
    {
      label: "Complaints register",
      value: null as number | null,
      icon: MessageSquare,
      path: "/zonal/complaints-register",
      color: "#0f766e",
      drill: null as (() => void) | null,
      hint: "View submitted complaints & assign officers",
    },
  ];

  const trendChart = (
    <ChartShell
      title="6-month activity trend"
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
              <linearGradient id="scReports" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="reports" name="Reports" stroke="#14b8a6" fill="url(#scReports)" strokeWidth={2} />
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
    <ChartShell title={`What is happening in ${stateName}?`} hint="Click a pack to pin and drill." height={280}>
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

  const actionQueue = (
    <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-semibold text-slate-800">What needs my action?</p>
      <p className="mb-3 text-xs text-slate-500">Immediate items for {stateName}</p>
      <div className="space-y-2 flex-1">
        {actionItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.drill && typeof item.value === "number" && item.value > 0) item.drill();
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
          <p className="text-xs text-slate-500">Where performance is slipping against plan</p>
        </div>
        <button type="button" onClick={() => drillReports("All reports")} className="text-[11px] font-semibold text-teal-700 hover:underline">
          All reports
        </button>
      </div>
      {(op?.off_track ?? []).length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700">All clear</p>
          <p className="text-xs text-slate-500">No off-track items flagged for this period.</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {op.off_track.map((item: any) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === "drafts") drillReports("Draft reports", { status: "draft" });
                else if (item.key === "pending_review") drillReports("Pending review", { status: "submitted" });
                else if (item.key === "actionables") drillReportType("weekly_actionable", "Weekly Actionable");
                else if (item.key === "challenges") drillReportType("challenges", "Challenges");
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
        </div>
      )}
    </div>
  );

  const compareBlock = (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <ChartShell
          title="Performance vs previous period"
          hint={`${op?.current_period?.label} compared with ${op?.previous_period?.label}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareChart} barGap={6} barSize={22}>
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

  const kpiRow = current && op && needs ? (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AccentKpi
        accent="teal"
        label="Completion rate"
        value={`${current.completion_rate}%`}
        detail={`${current.approved} approved of ${current.reports}`}
        active={openCard === "completion"}
        onClick={() => { setOpenCard("completion"); drillReports("All reports — completion"); }}
      />
      <AccentKpi
        accent="blue"
        label="Implementation vs plan"
        value={`${op.implementation_rate}%`}
        detail={`${op.activities_conducted} conducted · ${op.planned_activities} planned`}
        active={openCard === "implementation"}
        onClick={() => setOpenCard("implementation")}
      />
      <AccentKpi
        accent="amber"
        label="Needs your action"
        value={needs.total}
        detail={`${needs.pending_review} review · ${needs.open_actionables} actionables`}
        active={openCard === "action"}
        onClick={() => { setOpenCard("action"); drillReports("Needs action — submitted", { status: "submitted" }); }}
      />
      <AccentKpi
        accent="green"
        label="Reports this period"
        value={current.reports}
        detail={`vs ${previous.reports} in ${op.previous_period.label}${typeof vs?.reports_delta_pct === "number" ? ` (${vs.reports_delta_pct > 0 ? "+" : ""}${vs.reports_delta_pct}%)` : ""}`}
        active={openCard === "reports"}
        onClick={() => { setOpenCard("reports"); drillReports("Reports this period"); }}
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
                State Coordinator Dashboard
              </h1>
              <span className="hidden sm:inline rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 shrink-0">
                State
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
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-5 py-4 space-y-4 pb-12 max-w-[1400px] mx-auto w-full">

          {(pinnedMonth || pinnedStatus || pinnedPack) ? (
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
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-sm">Loading performance overview…</span>
            </div>
          ) : !data || !op || !current || !needs ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              No operational data available for this state yet. Approved packs will appear here as reports are submitted.
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
                compareBlock
              ) : openCard === "reports" ? (
                packsChart
              ) : (
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">{trendChart}</div>
                  {statusChart}
                </div>
              )}
            </div>
          ) : design === "ledger" ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Metric</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Previous</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Reports", current.reports, previous.reports, op.current_period.label],
                      ["Submitted / awaiting review", current.submitted, previous.submitted, "Needs coordinator action"],
                      ["Approved / endorsed", current.approved, previous.approved, `${current.completion_rate}% completion`],
                      ["Drafts", current.drafts, previous.drafts, "Still in draft"],
                      ["Planned volume", op.planned_activities, "—", "Across approved packs"],
                      ["Conducted volume", op.activities_conducted, "—", `${op.implementation_rate}% implementation`],
                    ].map(([metric, cur, prev, note]) => (
                      <tr key={String(metric)} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{metric}</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold">{fmtNum(Number(cur))}</td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-500">{prev === "—" ? "—" : fmtNum(Number(prev))}</td>
                        <td className="px-3 py-2.5 text-slate-500">{note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {packsChart}
              <div className="grid lg:grid-cols-2 gap-4 items-stretch">
                <div className="h-full min-h-0">{actionQueue}</div>
                <div className="h-full min-h-0">{offTrack}</div>
              </div>
            </div>
          ) : design === "compare" ? (
            <div className="space-y-4">
              {kpiRow}
              {compareBlock}
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
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">{trendChart}</div>
                {statusChart}
              </div>
              {packsChart}
              <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Scoped to {stateName}. Other states appear for zonal and national roles as they report.
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
