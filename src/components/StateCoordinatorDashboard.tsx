import * as React from "react";
import {
  Activity, AlertTriangle, CheckCircle2, ClipboardList, Clock,
  FileText, Loader2, RefreshCw, Target,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { stateOfficeDashboardApi } from "@/lib/api";
import type { AuthUser } from "@/src/store/authSlice";
import { ClickableKpi, DrillHint, COLORS } from "@/components/dashboard/dashboardUi";
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

function severityCls(s: string) {
  if (s === "high") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/** State Coordinator — Operational Control home dashboard */
export default function StateCoordinatorDashboard({
  user, stateName = "State", zoneName = "Zone", onNavigate,
}: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewTarget, setReviewTarget] = React.useState<{
    reportType: StateOfficeReportType;
    reportId: number;
    reference?: string | null;
  } | null>(null);

  const filters = useRoleDashboardFilters({
    lockZoneId: user?.zone_id ? String(user.zone_id) : null,
    lockStateId: user?.state_id ? String(user.state_id) : null,
  });

  const openReportFromDrill = React.useCallback((row: DrillRow) => {
    const parsed = parseDrillReportRecord(row);
    if (!parsed) {
      toast.info("Open this record from the Monitoring Visits module.");
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
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { load(); }, [load]);

  const op = data?.operational;
  const needs = op?.needs_action;
  const current = op?.current;
  const previous = op?.previous;
  const vs = op?.vs_previous;
  const drillCtx = { subtitle: `${stateName} · ${zoneName}`, breadcrumbs: ["State Coordinator"] };

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
      { name: "Approved", value: current.approved || 0, color: "#25a872", status: "approved" },
      { name: "Submitted", value: current.submitted || 0, color: "#3b82f6", status: "submitted" },
      { name: "Draft", value: current.drafts || 0, color: "#f59e0b", status: "draft" },
    ].filter((d) => d.value > 0);
  }, [current]);

  const planChart = React.useMemo(() => {
    if (!op) return [];
    return [
      { name: "Planned", value: op.planned_activities || 0, fill: "#94a3b8" },
      { name: "Conducted", value: op.activities_conducted || 0, fill: "#25a872" },
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

  const topTypes = (data?.reports_by_type ?? []).slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">State Coordinator Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stateName} · {zoneName}
            {op?.current_period?.label ? ` · ${op.current_period.label}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <RoleDashboardFilters filters={filters} />

      {loading ? (
        <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading performance overview…</span>
        </div>
      ) : !data || !op ? (
        <Card className="rounded-2xl border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No operational data available for this state yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ClickableKpi
              label="Completion rate"
              value={`${current.completion_rate}%`}
              detail={`${current.approved} approved of ${current.reports}`}
              icon={<Target className="w-5 h-5 text-[#145c3f]" />}
              onClick={() => drillReports("All reports — completion")}
            />
            <ClickableKpi
              label="Implementation vs plan"
              value={`${op.implementation_rate}%`}
              detail={`${op.activities_conducted} conducted · ${op.planned_activities} planned`}
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              onClick={() => {
                drill.openLocalDrill([
                  { id: "enrolment_drive", title: "Enrolment Drive", subtitle: "Plan vs conducted", meta: "report_type:enrolment_drive" },
                  { id: "stakeholder", title: "Stakeholder Engagement", subtitle: "Plan vs conducted", meta: "report_type:stakeholder" },
                ], { title: "Implementation sources", subtitle: drillCtx.subtitle, breadcrumbs: drillCtx.breadcrumbs });
              }}
            />
            <ClickableKpi
              label="Needs your action"
              value={needs.total}
              detail={`${needs.pending_review} review · ${needs.open_actionables} actionables`}
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              onClick={() => drillReports("Needs action — submitted", { status: "submitted" })}
            />
            <ClickableKpi
              label="Reports this period"
              value={current.reports}
              detail={`vs ${previous.reports} in ${op.previous_period.label}${typeof vs?.reports_delta_pct === "number" ? ` (${vs.reports_delta_pct > 0 ? "+" : ""}${vs.reports_delta_pct}%)` : ""}`}
              icon={<FileText className="w-5 h-5 text-emerald-600" />}
              onClick={() => drillReports("Reports this period")}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What needs my action?</CardTitle>
                <CardDescription>Immediate items for {stateName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Pending review", value: needs.pending_review, icon: Clock, path: null as string | null, color: "#3b82f6", drill: () => drillReports("Pending review", { status: "submitted" }) },
                  { label: "Draft reports", value: needs.draft_reports, icon: FileText, path: "/zonal/enrolment", color: "#f59e0b", drill: () => drillReports("Draft reports", { status: "draft" }) },
                  { label: "Open actionables", value: needs.open_actionables, icon: ClipboardList, path: "/soc/weekly-actionable", color: "#ef4444", drill: () => drillReportType("weekly_actionable", "Weekly Actionable") },
                  { label: "Open challenges", value: needs.open_challenges, icon: AlertTriangle, path: "/zonal/challenges", color: "#8b5cf6", drill: () => drillReportType("challenges", "Challenges") },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => (item.value > 0 ? item.drill() : item.path && onNavigate?.(item.path))}
                    className="w-full flex items-center gap-3 rounded-xl border border-[#e8f5ee] bg-[#f8fdfb] px-3 py-2.5 text-left hover:border-[#1a7a52]/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-slate-900">{item.value}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-3">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Off-track & attention</CardTitle>
                  <CardDescription>Where performance is slipping against plan</CardDescription>
                </div>
                <DrillHint label="All reports" onClick={() => drillReports("All reports")} />
              </CardHeader>
              <CardContent>
                {(op.off_track ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">All clear</p>
                    <p className="text-xs text-slate-500">No off-track items flagged for this period.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
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
                        className="w-full flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left hover:border-[#1a7a52]/40"
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
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Performance vs previous period</CardTitle>
                <CardDescription>
                  {op.current_period.label} compared with {op.previous_period.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareChart} barGap={6} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                    <XAxis dataKey="metric" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="previous" name={op.previous_period.label} fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="current" name={op.current_period.label} fill="#25a872" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Plan vs conducted</CardTitle>
                <CardDescription>Enrolment drives & stakeholder activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={planChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                        {planChart.map((e) => <Cell key={e.name} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Implementation rate</span>
                    <span className="font-bold text-slate-800">{op.implementation_rate}%</span>
                  </div>
                  <Progress value={Math.min(100, op.implementation_rate)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">6-month activity trend</CardTitle>
                  <CardDescription>Click a month to drill into that period</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={op.period_trend ?? []}
                    onClick={(e: any) => {
                      const m = e?.activePayload?.[0]?.payload?.month;
                      if (m) drillReports(`Reports — ${m}`, { month: m });
                    }}
                    className="cursor-pointer"
                  >
                    <defs>
                      <linearGradient id="scReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#25a872" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#25a872" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="reports" name="Reports" stroke="#25a872" fill="url(#scReports)" strokeWidth={2} />
                    <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Status mix</CardTitle>
                <CardDescription>Click a slice to filter</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {statusPie.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No reports this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        className="cursor-pointer"
                        onClick={(_: any, idx: number) => {
                          const slice = statusPie[idx];
                          if (slice) drillReports(slice.name, { status: slice.status });
                        }}
                      >
                        {statusPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">What is happening in {stateName}?</CardTitle>
                <CardDescription>Active report types — click a bar to drill</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-[280px]">
              {topTypes.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No report activity yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTypes}
                    layout="vertical"
                    margin={{ left: 12, right: 16 }}
                    onClick={(e: any) => {
                      const row = e?.activePayload?.[0]?.payload;
                      if (row?.key) drillReportType(row.key, row.label);
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Bar dataKey="total" name="Reports" radius={[0, 6, 6, 0]} barSize={14}>
                      {topTypes.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

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
