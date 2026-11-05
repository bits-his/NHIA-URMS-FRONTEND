import * as React from "react";
import {
  AlertTriangle, CheckCircle2, ClipboardList, Clock, FileText,
  Loader2, MessageSquare, RefreshCw,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { officeAccommodationApi, stateOfficeDashboardApi } from "@/lib/api";
import type { AuthUser } from "@/src/store/authSlice";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { RoleDashboardFilters, useRoleDashboardFilters } from "@/components/dashboard/RoleDashboardFilters";
import StateOfficeDrillReportReview from "@/components/dashboard/StateOfficeDrillReportReview";
import { parseDrillReportRecord } from "@/components/dashboard/stateOfficeDrillUtils";
import type { StateOfficeReportType } from "@/components/stateOffice/constants";
import type { DrillRow } from "@/components/dashboard/DashboardDrillPanel";
import { ChartTooltip, DashChartCard, DashKpi } from "@/components/dashboard/dashboardUi";

interface Props {
  user?: AuthUser;
  stateName?: string;
  zoneName?: string;
  onNavigate?: (path: string) => void;
}

const RENT_SOON_DAYS = 90;
const STATUS_COLORS: Record<string, string> = {
  approved: "#1a7a52",
  submitted: "#0284c7",
  draft: "#d97706",
};

type RentStatus = "expired" | "due";

interface RentAlert {
  id: number;
  state: string;
  status: RentStatus;
  days: number;
  dateLabel: string;
  ownership: string;
}

function fmtNum(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString();
}

function formatLeaseDate(iso: string) {
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function rentPhrase(alert: RentAlert) {
  if (alert.days < 0) {
    const n = Math.abs(alert.days);
    return `expired ${n} day${n === 1 ? "" : "s"} ago`;
  }
  if (alert.days === 0) return "expires today";
  return `expires in ${alert.days} day${alert.days === 1 ? "" : "s"}`;
}

/** Latest rented or co-habiting lease per state. Owned offices have no expiry. */
function leaseAlerts(rows: any[]): RentAlert[] {
  const latest = new Map<string, any>();
  for (const row of rows) {
    if (!row?.rent_expiry_date) continue;
    if (row.ownership_status === "NHIA-owned") continue;
    const key = String(row.state_code || row.id);
    const prev = latest.get(key);
    const year = Number(row.reporting_year) || 0;
    const prevYear = Number(prev?.reporting_year) || 0;
    if (!prev || year > prevYear || (year === prevYear && Number(row.id) > Number(prev.id))) {
      latest.set(key, row);
    }
  }

  const alerts: RentAlert[] = [];
  for (const row of latest.values()) {
    const days = daysUntil(String(row.rent_expiry_date));
    if (days > RENT_SOON_DAYS) continue;
    alerts.push({
      id: Number(row.id),
      state: row.state?.description || row.state_code || "State office",
      status: days < 0 ? "expired" : "due",
      days,
      dateLabel: formatLeaseDate(String(row.rent_expiry_date)),
      ownership: row.ownership_status || "Rented",
    });
  }
  alerts.sort((a, b) => a.days - b.days);
  return alerts;
}

function severityCls(s: string) {
  if (s === "high") return "bg-rose-50 text-rose-800 border-rose-200";
  if (s === "medium") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

/** State Coordinator — operational home. One layout, with office-rent watch. */
export default function StateCoordinatorDashboard({
  user, stateName = "State", zoneName = "Zone", onNavigate,
}: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [leases, setLeases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reviewTarget, setReviewTarget] = React.useState<{
    reportType: StateOfficeReportType;
    reportId: number | string;
    reference?: string | null;
  } | null>(null);

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
      const [dash, acc] = await Promise.all([
        stateOfficeDashboardApi.getDashboard(filters.apiFilters),
        officeAccommodationApi.list({
          state_id: filters.apiFilters.state_id,
          zone_id: filters.apiFilters.zone_id,
        }).catch(() => ({ data: [] as any[] })),
      ]);
      setData(dash.data);
      setLeases(acc.data || []);
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
  const rent = React.useMemo(() => leaseAlerts(leases), [leases]);
  const expiredCount = rent.filter((item) => item.status === "expired").length;

  const openAccommodation = () => onNavigate?.("/soc/office-profile?tab=accommodation");

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
      { name: "Approved", value: current.approved || 0, status: "approved" },
      { name: "Submitted", value: current.submitted || 0, status: "submitted" },
      { name: "Draft", value: current.drafts || 0, status: "draft" },
    ].filter((d) => d.value > 0);
  }, [current]);

  const compareChart = React.useMemo(() => {
    if (!current || !previous) return [];
    return [
      { metric: "Reports", current: current.reports, previous: previous.reports },
      { metric: "Submitted", current: current.submitted, previous: previous.submitted },
      { metric: "Approved", current: current.approved, previous: previous.approved },
    ];
  }, [current, previous]);

  const topTypes = React.useMemo(() => (
    (data?.reports_by_type ?? []).map((r: any) => ({
      ...r,
      total: Number(r.total ?? r.reports ?? 0),
    })).slice(0, 8)
  ), [data?.reports_by_type]);

  const trend = op?.period_trend ?? [];

  const actionItems = [
    { label: "Pending review", value: needs?.pending_review ?? 0, icon: Clock, path: null as string | null, drill: () => drillReports("Pending review", { status: "submitted" }) },
    { label: "Draft reports", value: needs?.draft_reports ?? 0, icon: FileText, path: "/zonal/enrolment", drill: () => drillReports("Draft reports", { status: "draft" }) },
    { label: "Open actionables", value: needs?.open_actionables ?? 0, icon: ClipboardList, path: "/soc/weekly-actionable", drill: () => drillReportType("weekly_actionable", "Weekly Actionable") },
    { label: "Open challenges", value: needs?.open_challenges ?? 0, icon: AlertTriangle, path: "/zonal/challenges", drill: () => drillReportType("challenges", "Challenges") },
    {
      label: "Complaints register",
      value: null as number | null,
      icon: MessageSquare,
      path: "/zonal/complaints-register",
      drill: null as (() => void) | null,
      hint: "View submitted complaints and assign officers",
    },
  ];

  const rentKpiValue = rent.length === 0
    ? "Current"
    : expiredCount > 0
      ? (expiredCount === 1 ? "Expired" : `${expiredCount} expired`)
      : (rent.length === 1 ? `${rent[0].days}d` : `${rent.length} due`);
  const rentKpiDetail = rent.length === 0
    ? "No lease inside the 90-day window"
    : rent[0].status === "expired"
      ? `${rent[0].state} ${rentPhrase(rent[0])}`
      : `${rent[0].state} ${rentPhrase(rent[0])}`;

  return (
    <div className="flex flex-col h-full min-h-0 rounded-sm overflow-hidden w-full">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-5 py-2.5 sticky top-0 z-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900">
              State Coordinator Dashboard
            </h1>
            <p className="text-xs text-slate-500 truncate">{scopeLine}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <RoleDashboardFilters filters={filters} compact />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 md:px-4 py-4 space-y-4 pb-8 w-full">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading operational dashboard…</span>
            </div>
          ) : !data || !op || !current || !needs ? (
            <div className="rounded-sm border border-dashed border-[#d4e8dc] bg-white py-12 text-center text-sm text-slate-500">
              No operational data for this state yet. Approved packs appear here as reports are submitted.
            </div>
          ) : (
            <>
              {rent.length > 0 && (
                <section
                  className={`rounded-sm border px-3.5 py-3 ${
                    expiredCount > 0 ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${expiredCount > 0 ? "text-rose-950" : "text-amber-950"}`}>
                        {expiredCount > 0 ? "Office rent has expired" : "Office rent is about to expire"}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {rent.map((item) => (
                          <li key={item.id} className={`text-xs ${expiredCount > 0 ? "text-rose-900" : "text-amber-950"}`}>
                            <span className="font-semibold">{item.state}</span>
                            {" · "}
                            {item.ownership}
                            {" · "}
                            {rentPhrase(item)}
                            {" · "}
                            {item.dateLabel}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openAccommodation}
                      className="h-8.5 shrink-0 text-xs font-bold rounded-sm border-slate-300 bg-white"
                    >
                      Open accommodation
                    </Button>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-stretch">
                <DashKpi
                  label="Completion rate"
                  value={`${current.completion_rate}%`}
                  detail={`${current.approved} approved of ${current.reports}`}
                  onClick={() => drillReports("All reports — completion")}
                />
                <DashKpi
                  label="Implementation vs plan"
                  value={`${op.implementation_rate}%`}
                  detail={`${op.activities_conducted} conducted · ${op.planned_activities} planned`}
                  onClick={() => drillReports("Reports this period")}
                />
                <DashKpi
                  label="Needs your action"
                  value={needs.total}
                  detail={`${needs.pending_review} review · ${needs.open_actionables} actionables`}
                  onClick={() => drillReports("Needs action — submitted", { status: "submitted" })}
                />
                <DashKpi
                  label="Reports this period"
                  value={current.reports}
                  detail={`vs ${previous.reports} in ${op.previous_period.label}${typeof vs?.reports_delta_pct === "number" ? ` (${vs.reports_delta_pct > 0 ? "+" : ""}${vs.reports_delta_pct}%)` : ""}`}
                  onClick={() => drillReports("Reports this period")}
                />
                <DashKpi
                  label="Office rent"
                  value={rentKpiValue}
                  detail={rentKpiDetail}
                  onClick={openAccommodation}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
                <DashChartCard
                  title="What needs action"
                  subtitle={`Immediate items for ${stateName}`}
                  className="xl:col-span-2"
                  minHeight="min-h-0"
                  bodyClassName="p-3 flex-1 flex flex-col w-full"
                >
                  <div className="space-y-2">
                    {actionItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            if (item.drill && typeof item.value === "number" && item.value > 0) item.drill();
                            else if (item.path) onNavigate?.(item.path);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-sm border border-[#d4e8dc] bg-white px-2.5 py-2 text-left hover:border-[#1a7a52] transition-colors"
                        >
                          <Icon className="w-4 h-4 text-[#1a7a52] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            {"hint" in item && item.hint ? (
                              <p className="text-[11px] text-slate-500 truncate">{item.hint}</p>
                            ) : null}
                          </div>
                          {typeof item.value === "number" ? (
                            <span className="text-lg font-black tabular-nums text-slate-900">{item.value}</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#1a7a52]">Open</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </DashChartCard>

                <DashChartCard
                  title="Off-track and attention"
                  subtitle="Where performance is slipping against plan"
                  className="xl:col-span-3"
                  minHeight="min-h-0"
                  bodyClassName="p-3 flex-1 flex flex-col w-full"
                  action={(
                    <button type="button" onClick={() => drillReports("All reports")} className="text-[11px] font-semibold text-[#1a7a52] hover:underline">
                      All reports
                    </button>
                  )}
                >
                  {(op?.off_track ?? []).length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center gap-2">
                      <CheckCircle2 className="w-7 h-7 text-[#1a7a52]" />
                      <p className="text-sm font-medium text-slate-800">All clear</p>
                      <p className="text-xs text-slate-500">No off-track items for this period.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                          className="w-full flex items-start gap-2.5 rounded-sm border border-[#d4e8dc] bg-white px-2.5 py-2 text-left hover:border-[#1a7a52] transition-colors"
                        >
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${severityCls(item.severity)}`}>
                            {item.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                          </div>
                          <span className="text-base font-black tabular-nums text-slate-900">
                            {item.count}{item.key === "implementation" ? "%" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </DashChartCard>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                <DashChartCard title="Six-month activity" subtitle="Click a month to open that period">
                  {trend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">No trend yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trend}
                        onClick={(e: any) => {
                          const month = e?.activePayload?.[0]?.payload?.month;
                          if (month) drillReports(`Reports — ${month}`, { month });
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="reports" name="Reports" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="submitted" name="Submitted" fill="#25a872" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="approved" name="Approved" fill="#7eb89a" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </DashChartCard>

                <DashChartCard title="Status mix" subtitle="Click a slice to open that status">
                  {statusPie.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">No reports this period</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={3}
                          className="cursor-pointer"
                          onClick={(_: any, idx: number) => {
                            const slice = statusPie[idx];
                            if (!slice) return;
                            drillReports(slice.name, { status: slice.status });
                          }}
                        >
                          {statusPie.map((entry) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.status] || "#1a7a52"} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </DashChartCard>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                <DashChartCard
                  title={`This period against ${op.previous_period?.label || "the previous period"}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="previous" name={op.previous_period?.label || "Previous"} fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="current" name={op.current_period?.label || "Current"} fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </DashChartCard>

                <DashChartCard title={`Activity in ${stateName}`} subtitle="Click a pack to open it">
                  {topTypes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">No report activity yet</div>
                  ) : (
                    <div className="flex h-full flex-col">
                      <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topTypes}
                            layout="vertical"
                            margin={{ left: 8, right: 12 }}
                            onClick={(e: any) => {
                              const row = e?.activePayload?.[0]?.payload;
                              if (row?.key) drillReportType(row.key, row.label);
                            }}
                            className="cursor-pointer"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total" name="Reports" fill="#1a7a52" radius={[0, 4, 4, 0]} maxBarSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500">Implementation rate</span>
                          <span className="font-bold text-slate-800">{op.implementation_rate ?? 0}%</span>
                        </div>
                        <Progress value={Math.min(100, Number(op.implementation_rate || 0))} className="h-1.5" />
                        <p className="mt-1 text-[11px] text-slate-500">
                          {fmtNum(op.activities_conducted)} conducted of {fmtNum(op.planned_activities)} planned
                        </p>
                      </div>
                    </div>
                  )}
                </DashChartCard>
              </div>
            </>
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
        reportId={Number(reviewTarget?.reportId ?? 0)}
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
