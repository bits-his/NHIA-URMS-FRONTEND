import * as React from "react";
import {
  AlertTriangle, Building2, CheckCircle2, Flag, Loader2,
  MapPin, RefreshCw, ShieldAlert, TrendingDown, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeDashboardApi } from "@/lib/api";
import { ClickableKpi, DrillHint, COLORS } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { RoleDashboardFilters, useRoleDashboardFilters } from "@/components/dashboard/RoleDashboardFilters";
import StateOfficeDrillReportReview from "@/components/dashboard/StateOfficeDrillReportReview";
import CompletionBreakdownModal from "@/components/dashboard/CompletionBreakdownModal";
import { parseDrillReportRecord } from "@/components/dashboard/stateOfficeDrillUtils";
import type { DrillRow } from "@/components/dashboard/DashboardDrillPanel";
import type { StateOfficeReportType } from "@/src/components/stateOffice/constants";
import type { AuthUser } from "@/src/store/authSlice";

interface Props {
  user?: AuthUser;
  onNavigate?: (path: string) => void;
}

function tierBadge(tier: string) {
  if (tier === "dg") return "bg-rose-100 text-rose-700 border-rose-200";
  if (tier === "department") return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function tierLabel(tier: string) {
  if (tier === "dg") return "DG / Dept";
  if (tier === "department") return "Department";
  return "SDO";
}

function bandCls(band: string) {
  if (band === "performing") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (band === "lagging") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

/** SDO — National Coordination, Escalation & Comparative Performance */
export default function SDONationalDashboard({ user, onNavigate }: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewTarget, setReviewTarget] = React.useState<{
    reportType: StateOfficeReportType;
    reportId: number;
    reference?: string | null;
  } | null>(null);
  const [completionOpen, setCompletionOpen] = React.useState(false);

  const filters = useRoleDashboardFilters({
    showZone: true,
    showState: true,
    showBand: true,
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
      toast.error("Failed to load national dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { load(); }, [load]);

  const cmp = data?.comparative;
  const op = data?.operational;
  const summary = cmp?.summary;
  const zones: any[] = cmp?.zones ?? [];
  const reportTypes: any[] = data?.reports_by_type ?? [];

  const drillCtx = { subtitle: "National SDO view", breadcrumbs: ["SDO"] };
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
  const drillRecurringProblem = (problem: { key?: string; label: string }) => {
    const key = problem.key || problem.label;
    if (key === "pending_review" || key === "Pending review") {
      drillReports("Pending review", { status: "submitted" });
      return;
    }
    if (key === "draft_backlog" || key === "Draft backlog") {
      drillReports("Draft backlog", { status: "draft" });
      return;
    }
    if (key === "open_actionables" || key === "Open actionables") {
      drillReportType("weekly_actionable", "Open actionables");
      return;
    }
    if (key === "escalated_actionables" || key === "Escalated actionables") {
      drillReportType("weekly_actionable", "Escalated actionables");
      return;
    }
    if (key === "low_implementation" || key === "Low implementation vs plan") {
      drill.openLocalDrill([
        { id: "enrolment_drive", title: "Enrolment Drive", subtitle: "Plan vs conducted", meta: "report_type:enrolment_drive" },
        { id: "stakeholder", title: "Stakeholder Engagement", subtitle: "Plan vs conducted", meta: "report_type:stakeholder" },
      ], { title: "Low implementation vs plan", subtitle: drillCtx.subtitle, breadcrumbs: drillCtx.breadcrumbs });
      return;
    }
    if (key === "no_reports" || key === "No reports this month") {
      drillReports("Reports this period");
      return;
    }
    drillReports(problem.label);
  };
  const drillZone = (zoneId: number | string, zoneName: string) => {
    drill.openDrill(
      { segment: "state_breakdown", zone_id: String(zoneId), record_segment: "all_reports" },
      { title: zoneName, subtitle: "States in zone", breadcrumbs: ["SDO", "By Zone"] },
      { resetStack: true },
    );
  };
  const drillState = (stateId: number | string, stateName: string, zoneName?: string) => {
    drill.openDrill(
      { segment: "all_reports", state_id: String(stateId) },
      { title: stateName, subtitle: zoneName || "State reports", breadcrumbs: ["SDO", "By State"] },
      { resetStack: true },
    );
  };
  const drillStateRows = (rows: any[], title: string) => {
    const unique = new Map<string | number, any>();
    (rows || []).forEach((r) => {
      const id = r.state_id ?? r.id;
      if (id == null || unique.has(id)) return;
      unique.set(id, {
        id,
        title: r.state_name || r.title,
        subtitle: r.zone_name || r.subtitle || r.reason || r.label,
        status: r.status ?? (r.completion_rate != null ? `${r.completion_rate}%` : String(r.count ?? "")),
        zone_name: r.zone_name,
        state_name: r.state_name || r.title,
        state_id: id,
        zone_id: r.zone_id,
        meta: `state:${id}`,
        reference: null,
        date: null,
      });
    });
    drill.openLocalDrill(
      [...unique.values()],
      { title, subtitle: drillCtx.subtitle, breadcrumbs: [...drillCtx.breadcrumbs, title] },
      { resetStack: true },
    );
  };

  const zoneChart = React.useMemo(() =>
    zones.map((z) => ({
      name: z.zone_name?.length > 14 ? `${z.zone_name.slice(0, 13)}…` : z.zone_name,
      full: z.zone_name,
      zone_id: z.zone_id,
      completion: z.completion_rate,
      implementation: z.implementation_rate,
      compliance: z.compliance_rate,
      reports: z.reports,
    })),
  [zones]);

  const bandPie = React.useMemo(() => ([
    { name: "Performing", value: summary?.performing ?? 0, color: "#25a872", band: "performing" },
    { name: "Lagging", value: summary?.lagging ?? 0, color: "#f59e0b", band: "lagging" },
    { name: "Needs intervention", value: summary?.needs_intervention ?? 0, color: "#ef4444", band: "needs_intervention" },
  ].filter((d) => d.value > 0)), [summary]);

  const implAreas = React.useMemo(() =>
    reportTypes.slice(0, 8).map((r: any) => {
      const approved = (r.by_status || []).find((s: any) => s.status === "approved")?.count || 0;
      const submitted = (r.by_status || [])
        .filter((s: any) => s.status === "submitted" || s.status === "reviewed")
        .reduce((a: number, s: any) => a + (Number(s.count) || 0), 0);
      const drafts = (r.by_status || []).find((s: any) => s.status === "draft")?.count || 0;
      const rate = r.total > 0 ? Math.round((approved / r.total) * 100) : 0;
      return {
        key: r.key,
        label: r.label,
        total: r.total,
        approved,
        submitted,
        drafts,
        completion_rate: rate,
      };
    }).sort((a: any, b: any) => b.completion_rate - a.completion_rate),
  [reportTypes]);

  const highAreas = implAreas.filter((a: any) => a.completion_rate >= 75).slice(0, 5);
  const lowAreas = [...implAreas].sort((a: any, b: any) => a.completion_rate - b.completion_rate).slice(0, 5);

  const filteredTop = React.useMemo(() => {
    const list = (cmp?.top_states ?? []).filter((s: any) => filters.band === "all" || s.band === filters.band);
    return list;
  }, [cmp?.top_states, filters.band]);

  const filteredBottom = React.useMemo(() => {
    const list = (cmp?.bottom_states ?? []).filter((s: any) => filters.band === "all" || s.band === filters.band);
    return list;
  }, [cmp?.bottom_states, filters.band]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">SDO Dashboard</h1>
          {cmp?.period?.label && (
            <p className="text-sm text-slate-500 mt-0.5">{cmp.period.label}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <RoleDashboardFilters filters={filters} />

      {loading ? (
        <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading national oversight…</span>
        </div>
      ) : !cmp ? (
        <Card className="rounded-2xl border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No national operational data available yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <ClickableKpi
              label="States covered"
              value={summary.states_total}
              detail={`${summary.zones_total} zones`}
              icon={<MapPin className="w-5 h-5 text-[#145c3f]" />}
              onClick={() => drill.openDrill(
                { segment: "zone_breakdown", record_segment: "all_reports" },
                { title: "National coverage — by Zone", subtitle: drillCtx.subtitle, breadcrumbs: ["SDO", "By Zone"] },
                { resetStack: true },
              )}
            />
            <ClickableKpi
              label="National completion"
              value={`${summary.national_avg_completion}%`}
              detail={`Impl. avg ${summary.national_avg_implementation}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              hint="How %"
              onClick={() => setCompletionOpen(true)}
            />
            <ClickableKpi
              label="Performing states"
              value={summary.performing}
              detail={`${summary.lagging} lagging`}
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              onClick={() => drillStateRows(
                (cmp.states ?? []).filter((s: any) => s.band === "performing"),
                "Performing states",
              )}
            />
            <ClickableKpi
              label="Need intervention"
              value={summary.needs_intervention}
              detail="States requiring support"
              icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
              onClick={() => drillStateRows(
                cmp.intervention_states ?? cmp.needs_intervention ?? [],
                "Need intervention",
              )}
            />
            <ClickableKpi
              label="Escalation queue"
              value={summary.escalations_total}
              detail={`${summary.escalated_actionables} escalated items`}
              icon={<Flag className="w-5 h-5 text-amber-600" />}
              onClick={() => drillStateRows(cmp.escalations ?? [], "Escalation queue")}
            />
            <ClickableKpi
              label="Reports (period)"
              value={op?.current?.reports ?? data.total_reports ?? 0}
              detail={`${op?.current?.submitted ?? 0} pending review`}
              icon={<Building2 className="w-5 h-5 text-blue-600" />}
              onClick={() => drillReports("Period reports")}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Zone comparison</CardTitle>
                  <CardDescription>Completion, implementation & compliance by zone</CardDescription>
                </div>
                <DrillHint label="All reports" onClick={() => drillReports("All national reports")} />
              </CardHeader>
              <CardContent className="h-[300px]">
                {zoneChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No zone data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zoneChart}
                      barGap={3}
                      barSize={12}
                      className="cursor-pointer"
                      onClick={(e: any) => {
                        const row = e?.activePayload?.[0]?.payload;
                        if (row?.zone_id) drillZone(row.zone_id, row.full);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }}
                        labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="completion" name="Completion %" fill="#25a872" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="implementation" name="Implementation %" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="compliance" name="Compliance %" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">National band mix</CardTitle>
                <CardDescription>Share of states by performance band</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {bandPie.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bandPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={88}
                        paddingAngle={3}
                        className="cursor-pointer"
                        onClick={(_: any, idx: number) => {
                          const slice = bandPie[idx];
                          if (slice) filters.setBand(slice.band);
                        }}
                      >
                        {bandPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">6-month national trend</CardTitle>
                <CardDescription>Reports submitted and approved over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={op?.period_trend ?? []}
                    className="cursor-pointer"
                    onClick={(e: any) => {
                      const m = e?.activePayload?.[0]?.payload?.month;
                      if (m) drillReports(`Reports — ${m}`, { month: m });
                    }}
                  >
                    <defs>
                      <linearGradient id="sdoReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#25a872" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#25a872" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="reports" name="Reports" stroke="#25a872" fill="url(#sdoReports)" strokeWidth={2} />
                    <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Escalation & support
                </CardTitle>
                <CardDescription>States needing coordination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[260px] overflow-y-auto">
                {(cmp.escalations ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-1">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    <p className="text-xs text-slate-500">No escalations queued</p>
                  </div>
                ) : (cmp.escalations as any[]).slice(0, 12).map((e) => (
                  <button
                    key={String(e.state_id)}
                    type="button"
                    onClick={() => {
                      if (e.state_id) drillState(e.state_id, e.state_name, e.zone_name);
                    }}
                    className="w-full text-left rounded-xl border border-slate-100 bg-white px-3 py-2.5 hover:border-[#1a7a52]/40"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${tierBadge(e.tier)}`}>
                        {tierLabel(e.tier)}
                      </Badge>
                      <span className="text-[11px] text-slate-400 truncate">{e.zone_name}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{e.state_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{e.label} · {e.reason}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> High-performing areas
                </CardTitle>
                <CardDescription>Report types with strong approval rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {highAreas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No high-performing areas yet</p>
                ) : highAreas.map((a: any) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => drill.openRecordDrill("reports", a.label, drillCtx, { report_type: a.key })}
                    className="w-full flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-left hover:border-emerald-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.label}</p>
                      <p className="text-[11px] text-slate-500">{a.approved}/{a.total} approved</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums">{a.completion_rate}%</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" /> Low-performing areas
                </CardTitle>
                <CardDescription>Report types with weak approval rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowAreas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No low-performing areas flagged</p>
                ) : lowAreas.map((a: any) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => drill.openRecordDrill("reports", a.label, drillCtx, { report_type: a.key })}
                    className="w-full flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2 text-left hover:border-rose-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.label}</p>
                      <p className="text-[11px] text-slate-500">{a.drafts} drafts · {a.submitted} submitted</p>
                    </div>
                    <span className="text-sm font-bold text-rose-700 tabular-nums">{a.completion_rate}%</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cross-cutting problems</CardTitle>
                <CardDescription>Recurring across states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {(cmp.recurring_problems ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No recurring problems</p>
                ) : (cmp.recurring_problems as any[]).map((p, i) => (
                  <button
                    key={p.key || p.label}
                    type="button"
                    onClick={() => drillRecurringProblem(p)}
                    className="w-full flex items-center gap-2 rounded-xl border border-[#e8f5ee] bg-[#f8fdfb] px-3 py-2 text-left hover:border-[#1a7a52]/40 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-white border text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{p.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{p.states_affected} states</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Support requirements</CardTitle>
                <CardDescription>Most requested support types</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                {(cmp.support_requirements ?? []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No support requests logged</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(cmp.support_requirements as any[]).slice(0, 6)} layout="vertical" margin={{ left: 4, right: 12 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={12}>
                        {(cmp.support_requirements as any[]).slice(0, 6).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Departmental load</CardTitle>
                <CardDescription>Challenges routed to departments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {(cmp.department_load ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No departmental assignments</p>
                ) : (cmp.department_load as any[]).map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => drill.openRecordDrill("reports", "Challenges", drillCtx, { report_type: "challenges" })}
                    className="w-full flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2 text-left hover:border-violet-300"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{d.label}</p>
                    <span className="text-sm font-bold tabular-nums text-violet-700">{d.count}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top performing states</CardTitle>
                <CardDescription>Highest completion this period</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      {["State", "Zone", "Band", "Completion", "Reports"].map((h) => (
                        <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTop.map((s: any) => (
                      <TableRow key={s.state_id} className="cursor-pointer hover:bg-[#f8fdfb]" onClick={() => drillState(s.state_id, s.state_name, s.zone_name)}>
                        <TableCell className="text-sm font-semibold text-[#145c3f]">{s.state_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{s.zone_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${bandCls(s.band)}`}>{s.band.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="tabular-nums font-semibold">{s.completion_rate}%</TableCell>
                        <TableCell className="tabular-nums">{s.reports}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lowest performing states</CardTitle>
                <CardDescription>Priority coordination this period</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      {["State", "Zone", "Band", "Completion", "Escalated"].map((h) => (
                        <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBottom.map((s: any) => (
                      <TableRow key={s.state_id} className="cursor-pointer hover:bg-[#f8fdfb]" onClick={() => drillState(s.state_id, s.state_name, s.zone_name)}>
                        <TableCell className="text-sm font-semibold text-[#145c3f]">{s.state_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{s.zone_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${bandCls(s.band)}`}>{s.band.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="tabular-nums font-semibold">{s.completion_rate}%</TableCell>
                        <TableCell className="tabular-nums">{s.escalated_actionables || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Zone compliance scorecard</CardTitle>
              <CardDescription>Zone summary for this period</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                    {["Zone", "States", "Reports", "Approved", "Compliance", "Impl. %", "Performing", "Lagging", "Intervention", "Escalated"].map((h) => (
                      <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow
                      key={z.zone_id ?? z.zone_name}
                      className="hover:bg-[#f8fdfb] cursor-pointer"
                      onClick={() => z.zone_id && drillZone(z.zone_id, z.zone_name)}
                    >
                      <TableCell className="text-sm font-semibold text-[#145c3f]">{z.zone_name}</TableCell>
                      <TableCell className="tabular-nums text-sm">{z.states}</TableCell>
                      <TableCell className="tabular-nums text-sm">{z.reports}</TableCell>
                      <TableCell className="tabular-nums text-sm">{z.approved}</TableCell>
                      <TableCell className="tabular-nums text-sm font-semibold">{z.compliance_rate}%</TableCell>
                      <TableCell className="tabular-nums text-sm">{z.implementation_rate}%</TableCell>
                      <TableCell className="tabular-nums text-sm text-emerald-700">{z.performing}</TableCell>
                      <TableCell className="tabular-nums text-sm text-amber-700">{z.lagging}</TableCell>
                      <TableCell className="tabular-nums text-sm text-rose-700">{z.needs_intervention}</TableCell>
                      <TableCell className="tabular-nums text-sm">{z.escalated_actionables}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <CompletionBreakdownModal
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        nationalCompletion={summary?.national_avg_completion ?? 0}
        nationalImplementation={summary?.national_avg_implementation}
        periodLabel={cmp?.period?.label}
        zones={zones}
        states={cmp?.states ?? []}
        onZoneClick={(zone) => {
          setCompletionOpen(false);
          if (zone.zone_id != null) drillZone(zone.zone_id, zone.zone_name);
          else drillReports(`${zone.zone_name} reports`);
        }}
        onStatusClick={(status) => {
          setCompletionOpen(false);
          drillReports(
            status === "approved" ? "Approved reports" : status === "submitted" ? "Pending review" : "Draft reports",
            { status },
          );
        }}
      />

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
