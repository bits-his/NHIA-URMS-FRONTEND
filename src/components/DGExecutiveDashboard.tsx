import * as React from "react";
import {
  AlertTriangle, CheckCircle2, Flag, Loader2, RefreshCw,
  ShieldAlert, Target, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { stateOfficeDashboardApi } from "@/lib/api";
import { ClickableKpi, DrillHint } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { RoleDashboardFilters, useRoleDashboardFilters } from "@/components/dashboard/RoleDashboardFilters";

/** DG/CEO — Strategic performance, risk & executive decisions (exception-focused) */
export default function DGExecutiveDashboard() {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  const filters = useRoleDashboardFilters({
    showZone: true,
    showBand: true,
  });

  const drill = useDashboardDrill(
    (params) => stateOfficeDashboardApi.getDashboardDrill(params),
    filters.drillScope,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeDashboardApi.getDashboard(filters.apiFilters);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load executive dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filters.apiFilters]);

  React.useEffect(() => { load(); }, [load]);

  const cmp = data?.comparative;
  const op = data?.operational;
  const summary = cmp?.summary;
  const zones: any[] = React.useMemo(() => {
    const list = cmp?.zones ?? [];
    if (filters.band === "all") return list;
    // Zone-level: keep zones with matching state pressure
    return list.filter((z) => {
      if (filters.band === "needs_intervention") return z.needs_intervention > 0;
      if (filters.band === "lagging") return z.lagging > 0;
      if (filters.band === "performing") return z.performing > 0;
      return true;
    });
  }, [cmp?.zones, filters.band]);

  const drillCtx = { subtitle: "DG strategic view", breadcrumbs: ["DG / CEO"] };
  const drillReports = (title: string, extra?: Record<string, string>) => {
    drill.openRecordDrill("all_reports", title, drillCtx, extra);
  };
  const drillZone = (zoneId: number | string, zoneName: string) => {
    drill.openDrill(
      { segment: "state_breakdown", zone_id: String(zoneId), record_segment: "all_reports" },
      { title: zoneName, subtitle: "Zone exception drill-down", breadcrumbs: ["DG / CEO", "By Zone"] },
      { resetStack: true },
    );
  };

  const dgEscalations = React.useMemo(
    () => (cmp?.escalations ?? []).filter((e: any) => e.tier === "dg" || e.tier === "department"),
    [cmp],
  );

  const majorRisks = React.useMemo(() => {
    const risks: { title: string; detail: string; severity: "critical" | "high" | "medium"; zone_id?: string | number }[] = [];
    const systemic = (cmp?.recurring_problems ?? []).filter((p: any) => p.states_affected >= 3);
    systemic.slice(0, 4).forEach((p: any) => {
      risks.push({
        title: p.label,
        detail: `Affecting ${p.states_affected} states — systemic / cross-cutting`,
        severity: p.states_affected >= 8 ? "critical" : p.states_affected >= 5 ? "high" : "medium",
      });
    });
    const weakZones = zones
      .filter((z) => z.needs_intervention > 0 || z.completion_rate < 60)
      .sort((a, b) => b.needs_intervention - a.needs_intervention || a.completion_rate - b.completion_rate)
      .slice(0, 3);
    weakZones.forEach((z) => {
      risks.push({
        title: `${z.zone_name} underperforming`,
        detail: `${z.needs_intervention} states need intervention · ${z.completion_rate}% zone completion`,
        severity: z.completion_rate < 50 || z.needs_intervention >= 3 ? "critical" : "high",
        zone_id: z.zone_id,
      });
    });
    if ((summary?.escalated_actionables ?? 0) > 0) {
      risks.push({
        title: "Escalated operational issues",
        detail: `${summary.escalated_actionables} escalated actionable items awaiting higher-level resolution`,
        severity: summary.escalated_actionables >= 10 ? "critical" : "high",
      });
    }
    const order = { critical: 0, high: 1, medium: 2 };
    return risks
      .sort((a, b) => order[a.severity] - order[b.severity])
      .slice(0, 6);
  }, [cmp, zones, summary]);

  const zoneExceptions = React.useMemo(
    () => zones
      .filter((z) => z.completion_rate < 70 || z.needs_intervention > 0)
      .sort((a, b) => a.completion_rate - b.completion_rate)
      .slice(0, 5),
    [zones],
  );

  const zoneChart = React.useMemo(
    () => zones.map((z) => ({
      name: z.zone_name?.length > 12 ? `${z.zone_name.slice(0, 11)}…` : z.zone_name,
      full: z.zone_name,
      zone_id: z.zone_id,
      completion: z.completion_rate,
      risk: z.needs_intervention,
    })),
    [zones],
  );

  const resultsOnTrack = (summary?.national_avg_completion ?? 0) >= 75
    && (summary?.needs_intervention ?? 0) <= Math.max(2, Math.floor((summary?.states_total ?? 0) * 0.15));

  const sevCls = (s: string) => {
    if (s === "critical") return "bg-rose-100 text-rose-800 border-rose-200";
    if (s === "high") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1a7a52]">
            Strategic Performance · Risk · Executive Decisions
          </p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DG Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            {cmp?.period?.label ? `${cmp.period.label} · ` : ""}
            Are we achieving results, where are the major risks, and what requires management decision?
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <RoleDashboardFilters filters={filters} />

      {loading ? (
        <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading strategic overview…</span>
        </div>
      ) : !cmp ? (
        <Card className="rounded-2xl border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No national strategic data available yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className={`rounded-2xl ${resultsOnTrack ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                resultsOnTrack ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                {resultsOnTrack
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  : <AlertTriangle className="w-6 h-6 text-amber-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900">
                  {resultsOnTrack
                    ? "National results are broadly on track"
                    : "National results require management attention"}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {summary.national_avg_completion}% average completion · {summary.performing} states performing ·{" "}
                  {summary.needs_intervention} need intervention · {dgEscalations.length} items for management decision
                </p>
              </div>
              <DrillHint label="National reports" onClick={() => drillReports("National strategic reports")} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ClickableKpi
              label="National completion"
              value={`${summary.national_avg_completion}%`}
              detail={`Implementation avg ${summary.national_avg_implementation}%${typeof op?.vs_previous?.completion_delta_pp === "number" ? ` · ${op.vs_previous.completion_delta_pp > 0 ? "+" : ""}${op.vs_previous.completion_delta_pp}pp` : ""}`}
              icon={<Target className="w-5 h-5 text-[#145c3f]" />}
              onClick={() => drillReports("National completion")}
            />
            <ClickableKpi
              label="States needing intervention"
              value={summary.needs_intervention}
              detail={`Of ${summary.states_total} states · ${summary.zones_total} zones`}
              icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
              onClick={() => filters.setBand("needs_intervention")}
            />
            <ClickableKpi
              label="Management decisions"
              value={dgEscalations.length}
              detail="DG / departmental exceptions in queue"
              icon={<Flag className="w-5 h-5 text-amber-600" />}
              onClick={() => drill.openRecordDrill("reports", "Escalated issues", drillCtx, { report_type: "challenges" })}
            />
            <ClickableKpi
              label="Period activity"
              value={op?.current?.reports ?? 0}
              detail={`${op?.current?.approved ?? 0} approved · ${op?.current?.submitted ?? 0} awaiting review`}
              icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              onClick={() => drillReports("Period reports")}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-3">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">National trend</CardTitle>
                <CardDescription>Click a month to drill into that period</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
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
                      <linearGradient id="dgTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#145c3f" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#145c3f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="#25a872" fill="url(#dgTrend)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="reports" name="Total reports" stroke="#94a3b8" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What requires management decision?</CardTitle>
                <CardDescription>Click to open the related zone/state</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 max-h-[280px] overflow-y-auto">
                {dgEscalations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">No executive exceptions</p>
                    <p className="text-xs text-slate-500">Nothing currently queued for DG / departmental decision.</p>
                  </div>
                ) : dgEscalations.slice(0, 8).map((e: any, i: number) => (
                  <button
                    key={`${e.state_id}-${e.tier}-${i}`}
                    type="button"
                    onClick={() => {
                      if (e.zone_id) drillZone(e.zone_id, e.zone_name || "Zone");
                      else drillReports(e.label || "Exception");
                    }}
                    className="w-full text-left rounded-xl border border-slate-100 bg-white px-3.5 py-3 hover:border-[#1a7a52]/40"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        e.tier === "dg" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-violet-100 text-violet-700 border-violet-200"
                      }`}>
                        {e.tier === "dg" ? "DG-level" : "Department"}
                      </Badge>
                      <span className="text-[11px] text-slate-400 truncate">{e.zone_name}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{e.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{e.state_name} · {e.reason}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Major risks & systemic issues</CardTitle>
                <CardDescription>Cross-cutting problems and zone-level exceptions — click to drill</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {majorRisks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm text-slate-600">No major systemic risks flagged</p>
                  </div>
                ) : majorRisks.map((r) => (
                  <button
                    key={r.title}
                    type="button"
                    onClick={() => {
                      if (r.zone_id) drillZone(r.zone_id, r.title);
                      else drillReports(r.title);
                    }}
                    className="w-full flex items-start gap-3 rounded-xl border border-slate-100 px-3.5 py-3 bg-white text-left hover:border-[#1a7a52]/40"
                  >
                    <Badge variant="outline" className={`text-[10px] shrink-0 capitalize ${sevCls(r.severity)}`}>
                      {r.severity}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.detail}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Zone results snapshot</CardTitle>
                <CardDescription>Click a zone to drill (strategic view)</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {zoneChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No zone data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zoneChart}
                      layout="vertical"
                      margin={{ left: 4, right: 12 }}
                      className="cursor-pointer"
                      onClick={(e: any) => {
                        const row = e?.activePayload?.[0]?.payload;
                        if (row?.zone_id) drillZone(row.zone_id, row.full);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ee" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }}
                        labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
                      />
                      <Bar dataKey="completion" name="Completion %" radius={[0, 6, 6, 0]} barSize={14}>
                        {zoneChart.map((z) => (
                          <Cell key={z.full} fill={z.completion >= 75 ? "#25a872" : z.completion >= 60 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {zoneExceptions.length > 0 && (
            <Card className="rounded-2xl border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Zone exceptions requiring attention</CardTitle>
                <CardDescription>Only zones with material underperformance — click to drill</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {zoneExceptions.map((z) => (
                    <button
                      key={z.zone_id ?? z.zone_name}
                      type="button"
                      onClick={() => z.zone_id && drillZone(z.zone_id, z.zone_name)}
                      className="rounded-xl border border-amber-100 bg-white px-4 py-3 text-left hover:border-amber-300"
                    >
                      <p className="text-sm font-bold text-slate-900">{z.zone_name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {z.completion_rate}% completion · {z.needs_intervention} states at risk · {z.escalated_actionables} escalated
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
}
