import * as React from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Loader2, RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";
import { PROVIDER_FORM_TYPES, PROVIDER_RELATED_PROGRAMMES } from "./providerManagementTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];
const ANALYSIS_COLORS: Record<string, string> = {
  accreditation: "#0ea5e9",
  reaccreditation: "#14b8a6",
  "qa-inspections": "#f59e0b",
  "medical-audits": "#8b5cf6",
};
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const MONTHS = [
  { v: "all", l: "All months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    v: String(i + 1),
    l: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
  })),
];
const ACTIVITY_STATUSES = [
  "all", "Completed", "In Progress", "Not Conducted", "Deferred", "Not Applicable", "Cancelled",
];

function levelFromRole(role: string): 1 | 2 | 3 | 4 {
  if (role === "dg-ceo") return 4;
  if (role === "sdo" || role === "admin") return 3;
  if (isDeptZonalCoordinator(role)) return 2;
  if (isDeptStateCoordinator(role)) return 1;
  return 1;
}

function levelMeta(level: 1 | 2 | 3 | 4) {
  return ({
    1: {
      title: "Dashboard 1 — State Coordinator",
      blurb: "Operational view for planning, execution and follow-up within the assigned state.",
    },
    2: {
      title: "Dashboard 2 — Zonal Director",
      blurb: "Compare state delivery and identify where coordination or follow-up is needed.",
    },
    3: {
      title: "Dashboard 3 — SDO / Headquarters",
      blurb: "National monitoring across zones, programmes and activity types.",
    },
    4: {
      title: "Level 4 — Director-General",
      blurb: "Executive overview with distinct programme and activity outputs, trends and priority decisions.",
    },
  } as const)[level];
}

function fmtPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(Number(v) % 1 ? 1 : 0)}%`;
}

function fmtNum(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString();
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

function tooltipStyle() {
  return {
    borderRadius: 12,
    border: "1px solid #d4e8dc",
    boxShadow: "0 8px 24px rgba(15,61,46,0.08)",
    fontSize: 12,
  };
}

export default function ProviderManagementDashboard({
  onBack, defaultZoneId, defaultStateId,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = user?.role || "";
  const level = levelFromRole(role);
  const meta = levelMeta(level);
  const lockZone = !!(defaultZoneId && (level === 1 || level === 2 || isDeptZonalCoordinator(role) || isDeptStateCoordinator(role)));
  const lockState = !!(defaultStateId && level === 1);

  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [quarter, setQuarter] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [programme, setProgramme] = React.useState("all");
  const [activity, setActivity] = React.useState("all");
  const [activityStatus, setActivityStatus] = React.useState("all");
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  /** SDO Level 3: national overview vs accreditation/reaccreditation pipeline (both mockups). */
  const [sdoView, setSdoView] = React.useState<"national" | "pipeline">("national");
  const [outputMeasure, setOutputMeasure] = React.useState<"accredited" | "reaccredited" | "awaiting" | "covered">("accredited");

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (lockState) return;
    const zoneArg = lockZone ? (defaultZoneId ?? undefined) : (filterZone === "all" ? undefined : filterZone);
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, lockZone, lockState, defaultZoneId]);

  const scope = React.useMemo(() => {
    // Pipeline view keeps Acc + Re-acc KPIs together (mockup 2); do not narrow to one activity.
    const activityFilter = (level === 3 && sdoView === "pipeline")
      ? "all"
      : activity;
    return {
      level,
      year,
      month: month === "all" ? undefined : month,
      quarter: quarter === "all" ? undefined : quarter,
      zone_id: lockZone ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
      state_id: lockState ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
      programme,
      activity: activityFilter,
      activity_status: activityStatus,
    };
  }, [level, sdoView, year, month, quarter, lockZone, lockState, defaultZoneId, defaultStateId, filterZone, filterState, programme, activity, activityStatus]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeApi.accreditation.getDashboard(scope);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load Provider Management dashboard", { description: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { void load(); }, [load]);

  const kpis = data?.kpis || {};
  const byActivity = data?.by_activity || [];
  const byStatus = data?.by_status || [];
  const byState = data?.by_state || [];
  const byZone = data?.by_zone || [];
  const byMonth = data?.by_month || [];
  const pipelineBars = data?.pipeline_bars || [];
  const programmeOutputs = data?.programme_activity_outputs || [];
  const execTrend = data?.exec_trend || [];
  const activityAnalysis = data?.activity_analysis || [];
  const actionQueue = data?.action_queue || [];
  const priorities = data?.priority_areas || [];
  const showPipelineDrill = level === 1 && (activity === "accreditation" || activity === "reaccreditation");
  const isReacc = activity === "reaccreditation";
  const sdoPipeline = level === 3 && sdoView === "pipeline";
  const displayTitle = sdoPipeline
    ? "Level 3 — SDO / Headquarters"
    : meta.title;
  const displayBlurb = sdoPipeline
    ? "National monitoring by zone, programme and activity type, with distinct pipelines."
    : meta.blurb;

  const sdoZoneBarKey = outputMeasure === "reaccredited"
    ? "reaccredited"
    : outputMeasure === "awaiting"
      ? "awaiting"
      : outputMeasure === "covered"
        ? "covered"
        : "accredited";
  const sdoZoneBarLabel = {
    accredited: "Facilities accredited",
    reaccredited: "Facilities re-accredited",
    awaiting: "Awaiting",
    covered: "Facilities covered",
  }[outputMeasure];

  const zoneChartData = React.useMemo(() => {
    return (byZone as any[]).map((z) => ({
      ...z,
      awaiting: (z.awaiting_accreditation || 0) + (z.awaiting_reaccreditation || 0),
    }));
  }, [byZone]);

  return (
    <div className="flex flex-col h-full bg-[#f7fafc]">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-30">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0 mt-0.5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{displayTitle}</h2>
              <span className="inline-flex items-center rounded-full bg-teal-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Level {level}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{displayBlurb}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showAnalysis ? "default" : "outline"}
              size="sm"
              className={showAnalysis ? "bg-teal-700 hover:bg-teal-800" : ""}
              onClick={() => setShowAnalysis((v) => !v)}
            >
              Activity analysis
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-5 space-y-5 pb-12 max-w-[1400px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <FilterField label="Reporting period · Year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Quarter">
                <Select value={quarter} onValueChange={(v) => { setQuarter(v); if (v !== "all") setMonth("all"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All quarters</SelectItem>
                    {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Month">
                <Select value={month} onValueChange={(v) => { setMonth(v); if (v !== "all") setQuarter("all"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                </Select>
              </FilterField>
              {!lockZone && level >= 2 && (
                <FilterField label="Zone">
                  <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                    <SelectTrigger><SelectValue placeholder="All zones" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
              {!lockState && level <= 2 && (
                <FilterField label="State">
                  <Select value={filterState} onValueChange={setFilterState} disabled={lockState}>
                    <SelectTrigger><SelectValue placeholder={lockState ? "Assigned state" : "All states"} /></SelectTrigger>
                    <SelectContent>
                      {!lockState && <SelectItem value="all">All states</SelectItem>}
                      {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
              <FilterField label="Programme">
                <Select value={programme} onValueChange={setProgramme}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programmes</SelectItem>
                    {PROVIDER_RELATED_PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={level === 3 && sdoPipeline ? "Activity type" : "Activity"}>
                <Select
                  value={activity}
                  onValueChange={(v) => {
                    setActivity(v);
                    if (level === 3 && (v === "accreditation" || v === "reaccreditation")) {
                      setSdoView("pipeline");
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All activities</SelectItem>
                    {PROVIDER_FORM_TYPES.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              {level === 3 && (
                <FilterField label="View">
                  <Select
                    value={sdoView}
                    onValueChange={(v) => {
                      const next = v as "national" | "pipeline";
                      setSdoView(next);
                      if (next === "pipeline" && activity === "all") setActivity("accreditation");
                      if (next === "national") setActivity("all");
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National / zone</SelectItem>
                      <SelectItem value="pipeline">Pipeline (Acc / Re-acc)</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
              {level === 3 && sdoPipeline && (
                <FilterField label="Output measure">
                  <Select value={outputMeasure} onValueChange={(v) => setOutputMeasure(v as typeof outputMeasure)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accredited">Facilities accredited</SelectItem>
                      <SelectItem value="reaccredited">Facilities re-accredited</SelectItem>
                      <SelectItem value="awaiting">Awaiting</SelectItem>
                      <SelectItem value="covered">Facilities covered</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
              {level <= 2 && (
                <FilterField label="Status">
                  <Select value={activityStatus} onValueChange={setActivityStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s === "all" ? "All activity statuses" : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          ) : !data ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              No dashboard data for this scope.
            </div>
          ) : showAnalysis ? (
            <ActivityAnalysisPanel items={activityAnalysis} />
          ) : (
            <>
              {/* ── Level KPI rows ── */}
              {level === 1 && !showPipelineDrill && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <DashKpi label="Activities planned" value={fmtNum(kpis.activities_planned)} detail="Selected reporting period" />
                  <DashKpi label="Completed activities" value={fmtNum(kpis.activities_completed)} detail={`${fmtPct(kpis.activity_completion_rate)} of planned activities`} />
                  <DashKpi label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="Facilities covered ÷ planned" />
                  <DashKpi label="Facility coverage" value={fmtPct(kpis.facility_coverage_rate)} detail="Facilities covered ÷ state total" />
                </div>
              )}

              {level === 1 && showPipelineDrill && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <AccentKpi accent="blue" label="Facilities awaiting" value={fmtNum(isReacc ? kpis.awaiting_reaccreditation : kpis.awaiting_accreditation)} detail={`${programme === "all" ? "All programmes" : programme} · selected period`} />
                  <AccentKpi accent="teal" label={isReacc ? "Facilities re-accredited" : "Facilities accredited"} value={fmtNum(isReacc ? kpis.reaccredited : kpis.accredited)} detail="Selected period" />
                  <AccentKpi accent="amber" label="Facilities planned" value={fmtNum(kpis.facilities_planned)} detail="Activity plan" />
                  <AccentKpi accent="green" label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="From this plan’s period" />
                </div>
              )}

              {level === 2 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <DashKpi label="States in zone" value={fmtNum(data.states_in_scope)} detail="States with activity in scope" />
                  <DashKpi label="Activities completed" value={fmtNum(kpis.activities_completed)} detail="Across states in selected period" />
                  <DashKpi label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="Aggregate numerator ÷ denominator" />
                  <DashKpi label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="Activity-level reported count" />
                </div>
              )}

              {level === 3 && !sdoPipeline && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <AccentKpi accent="blue" label="Activities planned" value={fmtNum(kpis.activities_planned)} detail="Across reporting states" />
                  <AccentKpi accent="teal" label="Activities completed" value={fmtNum(kpis.activities_completed)} detail={`${fmtPct(kpis.activity_completion_rate)} completion rate`} />
                  <AccentKpi accent="amber" label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="National aggregate rate" />
                  <AccentKpi accent="green" label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="Sum of valid reported coverage" />
                </div>
              )}

              {level === 3 && sdoPipeline && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <AccentKpi accent="teal" label="Awaiting accreditation" value={fmtNum(kpis.awaiting_accreditation)} detail="Selected programme / activity" />
                  <AccentKpi accent="teal" label="Accredited this period" value={fmtNum(kpis.accredited)} detail="Selected programme / activity" />
                  <AccentKpi accent="amber" label="Awaiting reaccreditation" value={fmtNum(kpis.awaiting_reaccreditation)} detail="Separate reaccreditation queue" />
                  <AccentKpi accent="purple" label="Reaccredited this period" value={fmtNum(kpis.reaccredited)} detail="Separate reaccreditation output" />
                </div>
              )}

              {level === 4 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <AccentKpi accent="blue" label="FSSHIP facilities accredited" value={fmtNum(kpis.fsship_accredited)} detail="Illustrative · selected period" />
                  <AccentKpi accent="teal" label="FSSHIP facilities re-accredited" value={fmtNum(kpis.fsship_reaccredited)} detail="Separate output" />
                  <AccentKpi accent="amber" label="BHCPF PHCs accredited" value={fmtNum(kpis.bhcpf_phcs_accredited)} detail="BHCPF only" />
                  <AccentKpi accent="purple" label="BHCPF PHCs re-accredited" value={fmtNum(kpis.bhcpf_phcs_reaccredited)} detail="BHCPF only" />
                </div>
              )}

              {/* ── Charts by level ── */}
              {level === 1 && !showPipelineDrill && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title="Planned facilities vs facilities covered">
                    {byActivity.length === 0 ? <ChartEmpty message="No activity mix for this filter set" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...byActivity].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          <Bar dataKey="covered" name="Covered" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="planned" name="Planned" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Activity status">
                    {byStatus.length === 0 ? <ChartEmpty message="No status breakdown" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                            {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              {level === 1 && showPipelineDrill && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title={`Accreditation pipeline${programme !== "all" ? ` — ${programme}` : ""}`}>
                    {pipelineBars.every((b: any) => !b.value) ? <ChartEmpty message="No pipeline counts" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...pipelineBars].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Bar dataKey="value" name="Count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Period outputs by programme and activity">
                    {programmeOutputs.every((b: any) => !b.value) ? <ChartEmpty message="No programme outputs" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...programmeOutputs].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Bar dataKey="value" name="Output" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              {level === 2 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title="State comparison — plan achievement">
                    {byState.length === 0 ? <ChartEmpty message="No state comparison yet" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...byState].slice(0, 10).reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={tooltipStyle()} formatter={(v: any) => fmtPct(Number(v))} />
                          <Bar dataKey="plan_achievement" name="Plan achievement %" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Activity mix by type">
                    {byActivity.length === 0 ? <ChartEmpty message="No activity mix" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={byActivity} dataKey="count" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                            {byActivity.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              {level === 3 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title={sdoPipeline ? "Outputs by zone — selected programme / activity" : "Performance by zone"}>
                    {zoneChartData.length === 0 ? <ChartEmpty message="No zone comparison" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...zoneChartData].slice(0, 10).reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} domain={sdoPipeline ? [0, "auto"] : [0, 100]} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={tooltipStyle()}
                            formatter={(v: any) => (sdoPipeline ? fmtNum(Number(v)) : fmtPct(Number(v)))}
                          />
                          <Bar
                            dataKey={sdoPipeline ? sdoZoneBarKey : "plan_achievement"}
                            name={sdoPipeline ? sdoZoneBarLabel : "Plan achievement %"}
                            fill="#14b8a6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title={sdoPipeline ? "Accreditation vs reaccreditation trend" : "Monthly activity trend"}>
                    {byMonth.length === 0 ? <ChartEmpty message="No monthly trend" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={byMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          {sdoPipeline ? (
                            <>
                              <Line type="monotone" dataKey="accredited" name="Accredited" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="reaccredited" name="Re-accredited" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                            </>
                          ) : (
                            <>
                              <Line type="monotone" dataKey="planned" name="Planned" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="completed" name="Completed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              {level === 4 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title="Programme and activity output trend">
                    {execTrend.length === 0 ? <ChartEmpty message="No executive trend" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={execTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          <Line type="monotone" dataKey="bhcpf_accreditation" name="BHCPF PHC accreditation" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="fsship_reaccreditation" name="FSSHIP reaccreditation" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="fsship_accreditation" name="FSSHIP accreditation" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">Priority areas for attention</p>
                      <p className="text-xs text-slate-500 mt-0.5">Operational signals from the activity register</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Area</TableHead>
                          <TableHead className="text-xs">Signal</TableHead>
                          <TableHead className="text-xs">Management focus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priorities.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-sm text-slate-400 text-center py-8">No priority signals</TableCell></TableRow>
                        ) : priorities.slice(0, 6).map((p: any) => (
                          <TableRow key={p.area}>
                            <TableCell className="text-sm font-medium">{p.area}</TableCell>
                            <TableCell className="text-sm">{p.signal}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p.focus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* ── Action / exceptions panel ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    {level === 1 ? "State action queue" : level === 2 ? "Zonal follow-up" : level === 3 ? "National exceptions" : "Executive decisions"}
                  </p>
                </div>
                {level === 1 && showPipelineDrill ? (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Review initial accreditation and reaccreditation pipelines separately. Drill down by facility, programme and activity record.
                  </p>
                ) : level === 3 && sdoPipeline ? (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Highlight zones with high pending workloads or low outputs for the selected programme/activity. Use BHCPF PHC-specific fields when BHCPF is selected.
                  </p>
                ) : level === 3 && !sdoPipeline ? (
                  <ul className="space-y-2">
                    {[
                      "Identify zones with sustained low plan achievement",
                      "Separate accreditation and reaccreditation outputs",
                      "Review programme-specific BHCPF PHC counts",
                      "Escalate recurring operational barriers",
                    ].map((item) => (
                      <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {actionQueue.map((item: string) => (
                      <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Rates use summed numerators ÷ summed denominators (not averages of percentages). Forms sold / returned are excluded from performance ranking.
              </p>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ActivityAnalysisPanel({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Activity analysis — accreditation, reaccreditation, QA and medical audit</h3>
        <p className="text-sm text-slate-500 mt-1">Use separate pipelines and measures; this page can be accessed from the four dashboards.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item) => {
          const color = ANALYSIS_COLORS[item.key] || "#64748b";
          const rate = Math.min(100, Math.max(0, Number(item.plan_achievement) || 0));
          return (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide" style={{ color }}>{item.title}</p>
              <ul className="mt-3 space-y-2">
                {(item.bullets || []).map((b: string) => (
                  <li key={b} className="text-sm text-slate-700 flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-rose-600 font-medium">
        Do not include forms sold or completed forms returned in state performance ranking. Treat these as contextual process measures only, if retained.
      </p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

function AccentKpi({
  label, value, detail, accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent: "blue" | "teal" | "amber" | "green" | "purple";
}) {
  const border = {
    blue: "border-l-sky-500",
    teal: "border-l-teal-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    purple: "border-l-violet-500",
  }[accent];
  return (
    <div className={`h-full min-h-[108px] rounded-xl border border-slate-200 border-l-4 ${border} bg-white p-4 flex flex-col`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight min-h-[28px]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 leading-tight">{value}</p>
      <p className="mt-auto pt-2 text-xs text-slate-500 leading-snug">{detail || " "}</p>
    </div>
  );
}
