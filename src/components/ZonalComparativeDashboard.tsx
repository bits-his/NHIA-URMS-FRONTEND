import * as React from "react";
import {
  AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw,
  TrendingDown, TrendingUp, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeDashboardApi } from "@/lib/api";
import type { AuthUser } from "@/src/store/authSlice";
import { ClickableKpi, DrillHint, COLORS } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { RoleDashboardFilters, useRoleDashboardFilters } from "@/components/dashboard/RoleDashboardFilters";
import StateOfficeDrillReportReview from "@/components/dashboard/StateOfficeDrillReportReview";
import { parseDrillReportRecord } from "@/components/dashboard/stateOfficeDrillUtils";
import type { DrillRow } from "@/components/dashboard/DashboardDrillPanel";
import type { StateOfficeReportType } from "@/src/components/stateOffice/constants";

interface Props {
  user?: AuthUser;
  zoneName?: string;
  onReviewReports?: () => void;
  onNavigate?: (path: string) => void;
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

/** Zonal Director — Comparative Oversight across states in the zone */
export default function ZonalComparativeDashboard({
  user, zoneName = "Zone", onReviewReports, onNavigate,
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
      toast.error("Failed to load zonal dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { load(); }, [load]);

  const cmp = data?.comparative;
  const op = data?.operational;
  const summary = cmp?.summary;
  const allStates: any[] = cmp?.states ?? [];
  const states = React.useMemo(
    () => (filters.band === "all" ? allStates : allStates.filter((s) => s.band === filters.band)),
    [allStates, filters.band],
  );

  const drillCtx = { subtitle: zoneName, breadcrumbs: ["Zonal Director"] };
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
  const drillState = (stateId: number | string, stateName: string) => {
    drill.openDrill(
      { segment: "all_reports", state_id: String(stateId) },
      { title: stateName, subtitle: `${zoneName} · reports`, breadcrumbs: ["Zonal Director", "By State"] },
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
        subtitle: r.zone_name || r.subtitle || "Needs support",
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

  const bandPie = React.useMemo(() => ([
    { name: "Performing", value: summary?.performing ?? 0, color: "#25a872", band: "performing" },
    { name: "Lagging", value: summary?.lagging ?? 0, color: "#f59e0b", band: "lagging" },
    { name: "Needs intervention", value: summary?.needs_intervention ?? 0, color: "#ef4444", band: "needs_intervention" },
  ].filter((d) => d.value > 0)), [summary]);

  const compareChart = React.useMemo(() =>
    states.map((s) => ({
      name: s.state_name?.length > 12 ? `${s.state_name.slice(0, 11)}…` : s.state_name,
      full: s.state_name,
      state_id: s.state_id,
      completion: s.completion_rate,
      implementation: s.implementation_rate,
      reports: s.reports,
    })),
  [states]);

  const interventionList = (cmp?.needs_intervention ?? []).filter(
    (s: any) => filters.band === "all" || filters.band === "needs_intervention",
  );
  const laggingList = (cmp?.lagging ?? []).filter(
    (s: any) => filters.band === "all" || filters.band === "lagging",
  );
  const performingList = (cmp?.performing ?? []).filter(
    (s: any) => filters.band === "all" || filters.band === "performing",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Zonal Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {zoneName}
            {cmp?.period?.label ? ` · ${cmp.period.label}` : ""}
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
          <span className="text-sm">Comparing state performance…</span>
        </div>
      ) : !cmp ? (
        <Card className="rounded-2xl border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No zonal comparative data available yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ClickableKpi
              label="States in scope"
              value={states.length}
              detail={`${summary.performing} performing · ${summary.lagging} lagging`}
              icon={<MapPin className="w-5 h-5 text-[#145c3f]" />}
              onClick={() => drill.openDrill(
                { segment: "state_breakdown", record_segment: "all_reports" },
                { title: "States in zone", subtitle: zoneName, breadcrumbs: ["Zonal Director", "By State"] },
                { resetStack: true },
              )}
            />
            <ClickableKpi
              label="Zone avg completion"
              value={`${summary.zone_avg_completion}%`}
              detail={`vs prior ${op?.previous?.completion_rate ?? "—"}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              onClick={() => drillReports("Zone reports — completion")}
            />
            <ClickableKpi
              label="Zone avg implementation"
              value={`${summary.zone_avg_implementation}%`}
              detail="Plan vs conducted across states"
              icon={<Users className="w-5 h-5 text-blue-600" />}
              onClick={() => drillReports("Zone reports — implementation")}
            />
            <ClickableKpi
              label="Need intervention"
              value={summary.needs_intervention}
              detail={`${summary.lagging} also lagging behind peers`}
              icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
              onClick={() => drillStateRows(
                cmp.intervention_states ?? cmp.needs_intervention ?? [],
                "Need intervention",
              )}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-3">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">State performance comparison</CardTitle>
                  <CardDescription>Click a state bar to drill into reports</CardDescription>
                </div>
                <DrillHint label="All reports" onClick={() => drillReports("All zone reports")} />
              </CardHeader>
              <CardContent className="h-[300px]">
                {compareChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No states in scope</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={compareChart}
                      barGap={4}
                      barSize={14}
                      className="cursor-pointer"
                      onClick={(e: any) => {
                        const row = e?.activePayload?.[0]?.payload;
                        if (row?.state_id) drillState(row.state_id, row.full);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="completion" name="Completion %" fill="#25a872" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="implementation" name="Implementation %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Band distribution</CardTitle>
                <CardDescription>Click a slice to filter</CardDescription>
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
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Performing
                </CardTitle>
                <CardDescription>On track vs peers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {performingList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">None classified as performing</p>
                ) : performingList.map((s: any) => (
                  <button
                    key={s.state_id}
                    type="button"
                    onClick={() => drillState(s.state_id, s.state_name)}
                    className="w-full flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-left hover:border-emerald-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.state_name}</p>
                      <p className="text-[11px] text-slate-500">{s.completion_rate}% complete · {s.reports} reports</p>
                    </div>
                    <Progress value={s.completion_rate} className="w-16 h-1.5" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-600" /> Lagging
                </CardTitle>
                <CardDescription>Behind zone average / plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {laggingList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No lagging states</p>
                ) : laggingList.map((s: any) => (
                  <button
                    key={s.state_id}
                    type="button"
                    onClick={() => drillState(s.state_id, s.state_name)}
                    className="w-full flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-left hover:border-amber-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.state_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.completion_rate}% · impl {s.implementation_rate}% · {s.drafts} drafts
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Need intervention
                </CardTitle>
                <CardDescription>Priority support required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {interventionList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    <p className="text-xs text-slate-500">No urgent interventions</p>
                  </div>
                ) : interventionList.map((s: any) => (
                  <button
                    key={s.state_id}
                    type="button"
                    onClick={() => drillState(s.state_id, s.state_name)}
                    className="w-full flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-left hover:border-rose-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.state_name}</p>
                      <p className="text-[11px] text-rose-600">
                        Score {s.intervention_score} · {s.submitted} pending · {s.open_actionables} actionables
                        {s.reports === 0 ? " · no reports" : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recurring regional problems</CardTitle>
                <CardDescription>Issues appearing across multiple states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(cmp.recurring_problems ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No recurring patterns detected</p>
                ) : (cmp.recurring_problems as any[]).map((p, i) => (
                  <button
                    key={p.key || p.label}
                    type="button"
                    onClick={() => drillRecurringProblem(p)}
                    className="w-full flex items-center gap-3 rounded-xl border border-[#e8f5ee] bg-[#f8fdfb] px-3 py-2.5 text-left hover:border-[#1a7a52]/40 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-white border border-[#d4e8dc] text-[10px] font-bold flex items-center justify-center text-slate-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{p.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {p.states_affected} state{p.states_affected === 1 ? "" : "s"}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Common challenge themes</CardTitle>
                  <CardDescription>Most frequent challenge categories in zone</CardDescription>
                </div>
                <DrillHint label="Challenges" onClick={() => drill.openRecordDrill("reports", "Challenges", drillCtx, { report_type: "challenges" })} />
              </CardHeader>
              <CardContent className="h-[240px]">
                {(cmp.challenge_patterns ?? []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No challenge themes yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(cmp.challenge_patterns as any[]).slice(0, 6)}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                      className="cursor-pointer"
                      onClick={() => drill.openRecordDrill("reports", "Challenges", drillCtx, { report_type: "challenges" })}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                      <Bar dataKey="count" name="Occurrences" radius={[0, 6, 6, 0]} barSize={14}>
                        {(cmp.challenge_patterns as any[]).slice(0, 6).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All states — scorecard</CardTitle>
              <CardDescription>Click a row to drill into that state · {zoneName}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                    {["State", "Band", "Reports", "Submitted", "Approved", "Completion", "Impl. %", "Actionables", "Challenges"].map((h) => (
                      <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {states.map((s) => (
                    <TableRow
                      key={s.state_id}
                      className="hover:bg-[#f8fdfb] cursor-pointer"
                      onClick={() => drillState(s.state_id, s.state_name)}
                    >
                      <TableCell className="text-sm font-semibold text-[#145c3f]">{s.state_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${bandBadge(s.band)}`}>
                          {bandLabel(s.band)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{s.reports}</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.submitted}</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.approved}</TableCell>
                      <TableCell className="tabular-nums text-sm font-semibold">{s.completion_rate}%</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.implementation_rate}%</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.open_actionables}</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.open_challenges}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
