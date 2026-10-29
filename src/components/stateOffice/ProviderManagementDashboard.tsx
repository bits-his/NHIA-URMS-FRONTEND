import * as React from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Loader2, RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { stateOfficeApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { PROVIDER_FORM_TYPES, PROVIDER_RELATED_PROGRAMMES } from "./providerManagementTypes";
import ActivityAnalysisPanel from "./ProviderManagementActivityAnalysis";
import ProviderManagementOverview from "./ProviderManagementOverview";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

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
    1: "Operational view for planning, execution and follow-up within the assigned state.",
    2: "Compare state delivery and identify where coordination or follow-up is needed.",
    3: "National monitoring across zones, programmes and activity types.",
    4: "Executive overview with distinct programme and activity outputs, trends and priority decisions.",
  } as const)[level];
}

export default function ProviderManagementDashboard({
  onBack, defaultZoneId, defaultStateId,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = user?.role || "";
  const level = levelFromRole(role);
  const blurb = levelMeta(level);
  const lockZone = !!(defaultZoneId && (level === 1 || level === 2 || isDeptZonalCoordinator(role) || isDeptStateCoordinator(role)));
  const lockState = !!(defaultStateId && level === 1);

  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [quarter, setQuarter] = React.useState("all");
  /** DG Level 4 period preset — matches PPTX “Year to date”. */
  const [periodPreset, setPeriodPreset] = React.useState<"ytd" | "year" | "q1" | "q2" | "q3" | "q4">("ytd");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [programme, setProgramme] = React.useState("all");
  const [activity, setActivity] = React.useState("all");
  const [activityStatus, setActivityStatus] = React.useState("all");
  const [mainTab, setMainTab] = React.useState<"overview" | "analysis">("overview");
  /** SDO Level 3: national overview vs accreditation/reaccreditation pipeline (both mockups). */
  const [sdoView, setSdoView] = React.useState<"national" | "pipeline">("national");
  const [outputMeasure, setOutputMeasure] = React.useState<"accredited" | "reaccredited" | "awaiting" | "covered">("accredited");
  const [compareWith, setCompareWith] = React.useState<"none" | "previous">(
    () => (levelFromRole(user?.role || "") === 4 ? "previous" : "none"),
  );
  const [trendSeries, setTrendSeries] = React.useState({
    fsship_accreditation: true,
    fsship_reaccreditation: true,
    bhcpf_accreditation: true,
    bhcpf_reaccreditation: false, // Level 4 mockup shows three series by default
  });

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    const zoneArg = lockZone ? (defaultZoneId ?? undefined) : (filterZone === "all" ? undefined : filterZone);
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, lockZone, defaultZoneId]);

  const scope = React.useMemo(() => {
    // Pipeline view keeps Acc + Re-acc KPIs together (mockup 2); do not narrow to one activity.
    const activityFilter = (level === 3 && sdoView === "pipeline")
      ? "all"
      : activity;

    let periodMonth = month === "all" ? undefined : month;
    let periodQuarter = quarter === "all" ? undefined : quarter;
    let period: string | undefined;
    if (level === 4) {
      if (periodPreset === "ytd") {
        period = "ytd";
        periodMonth = undefined;
        periodQuarter = undefined;
      } else if (periodPreset === "year") {
        period = undefined;
        periodMonth = undefined;
        periodQuarter = undefined;
      } else {
        period = undefined;
        periodMonth = undefined;
        periodQuarter = periodPreset.replace("q", "");
      }
    }

    return {
      level,
      year,
      month: periodMonth,
      quarter: periodQuarter,
      period,
      zone_id: lockZone ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
      state_id: lockState ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
      programme,
      activity: activityFilter,
      activity_status: activityStatus,
      compare_with: level === 4 && compareWith === "previous" ? "previous" : undefined,
    };
  }, [level, sdoView, year, month, quarter, periodPreset, lockZone, lockState, defaultZoneId, defaultStateId, filterZone, filterState, programme, activity, activityStatus, compareWith]);

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
  const lockedStateLabel = React.useMemo(() => {
    if (!lockState || !defaultStateId) return null;
    const fromList = states.find((s) => String(s.id) === String(defaultStateId) || String(s.code) === String(defaultStateId));
    if (fromList?.description) return String(fromList.description);
    if (user?.state?.description) return String(user.state.description);
    return String(defaultStateId);
  }, [lockState, defaultStateId, states, user?.state?.description]);
  const displayBlurb = sdoPipeline
    ? "National monitoring by zone, programme and activity type, with distinct pipelines."
    : level === 1 && lockedStateLabel
      ? `Operational view for ${lockedStateLabel}: plan, execute and follow up. Other states appear at zonal and national levels as they report.`
      : blurb;

  const monthlyTrend = React.useMemo(() => {
    return ((byMonth as any[]) || []).map((r) => ({
      ...r,
      label: r.label || r.period,
      planned: Number(r.planned_records ?? 0),
      completed: Number(r.completed_records ?? r.completed ?? 0),
    }));
  }, [byMonth]);

  const hasMonthlyTrend = monthlyTrend.some((r) => r.planned > 0 || r.completed > 0);

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
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Provider Management Dashboard</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-3xl">{displayBlurb}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-5 space-y-5 pb-12 max-w-[1400px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${level === 4 ? "xl:grid-cols-5" : "xl:grid-cols-6"}`}>
              {level === 4 ? (
                <>
                  <FilterField label="Period">
                    <Select
                      value={periodPreset}
                      onValueChange={(v) => setPeriodPreset(v as typeof periodPreset)}
                    >
                      <SelectTrigger
                        displayValue={
                          ({
                            ytd: "Year to date",
                            year: `Full year (${year})`,
                            q1: "Q1",
                            q2: "Q2",
                            q3: "Q3",
                            q4: "Q4",
                          } as const)[periodPreset]
                        }
                      >
                        <SelectValue placeholder="Year to date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ytd">Year to date</SelectItem>
                        <SelectItem value="year">Full year ({year})</SelectItem>
                        <SelectItem value="q1">Q1</SelectItem>
                        <SelectItem value="q2">Q2</SelectItem>
                        <SelectItem value="q3">Q3</SelectItem>
                        <SelectItem value="q4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Geography">
                    <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                      <SelectTrigger
                        displayValue={
                          filterZone === "all"
                            ? "National"
                            : (zones.find((z) => String(z.id) === String(filterZone))?.description || filterZone)
                        }
                      >
                        <SelectValue placeholder="National" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">National</SelectItem>
                        {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Programme">
                    <Select value={programme} onValueChange={setProgramme}>
                      <SelectTrigger displayValue={programme === "all" ? "FSSHIP / BHCPF" : programme}>
                        <SelectValue placeholder="FSSHIP / BHCPF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">FSSHIP / BHCPF</SelectItem>
                        {PROVIDER_RELATED_PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Activity type">
                    <Select value={activity} onValueChange={setActivity}>
                      <SelectTrigger
                        displayValue={
                          activity === "all"
                            ? "Select activity"
                            : (PROVIDER_FORM_TYPES.find((f) => f.key === activity)?.label || activity)
                        }
                      >
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select activity</SelectItem>
                        {PROVIDER_FORM_TYPES.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Compare with">
                    <Select value={compareWith} onValueChange={(v) => setCompareWith(v as "none" | "previous")}>
                      <SelectTrigger
                        displayValue={compareWith === "previous" ? "Previous period" : "No comparison"}
                      >
                        <SelectValue placeholder="Previous period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No comparison</SelectItem>
                        <SelectItem value="previous">Previous period</SelectItem>
                      </SelectContent>
                    </Select>
                  </FilterField>
                </>
              ) : (
                <>
                  <FilterField label="Reporting period · Year">
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger displayValue={year}><SelectValue /></SelectTrigger>
                      <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Quarter">
                    <Select value={quarter} onValueChange={(v) => { setQuarter(v); if (v !== "all") setMonth("all"); }}>
                      <SelectTrigger displayValue={quarter === "all" ? "All quarters" : `Q${quarter}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All quarters</SelectItem>
                        {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Month">
                    <Select value={month} onValueChange={(v) => { setMonth(v); if (v !== "all") setQuarter("all"); }}>
                      <SelectTrigger displayValue={MONTHS.find((m) => m.v === month)?.l || month}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{MONTHS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </FilterField>
                  {!lockZone && level >= 2 && (
                    <FilterField label="Zone">
                      <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                        <SelectTrigger
                          displayValue={
                            filterZone === "all"
                              ? "All zones"
                              : (zones.find((z) => String(z.id) === String(filterZone))?.description || filterZone)
                          }
                        >
                          <SelectValue placeholder="All zones" />
                        </SelectTrigger>
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
                        <SelectTrigger
                          displayValue={
                            lockState
                              ? (states.find((s) => String(s.id) === String(filterState))?.description || "Assigned state")
                              : filterState === "all"
                                ? "All states"
                                : (states.find((s) => String(s.id) === String(filterState))?.description || filterState)
                          }
                        >
                          <SelectValue placeholder={lockState ? "Assigned state" : "All states"} />
                        </SelectTrigger>
                        <SelectContent>
                          {!lockState && <SelectItem value="all">All states</SelectItem>}
                          {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterField>
                  )}
                  <FilterField label="Programme">
                    <Select value={programme} onValueChange={setProgramme}>
                      <SelectTrigger displayValue={programme === "all" ? "All programmes" : programme}>
                        <SelectValue />
                      </SelectTrigger>
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
                      <SelectTrigger
                        displayValue={
                          activity === "all"
                            ? "All activities"
                            : (PROVIDER_FORM_TYPES.find((f) => f.key === activity)?.label || activity)
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
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
                        <SelectTrigger
                          displayValue={sdoView === "pipeline" ? "Pipeline (Acc / Re-acc)" : "National / zone"}
                        >
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger
                          displayValue={
                            ({
                              accredited: "Facilities accredited",
                              reaccredited: "Facilities re-accredited",
                              awaiting: "Awaiting",
                              covered: "Facilities covered",
                            } as const)[outputMeasure]
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger
                          displayValue={activityStatus === "all" ? "All activity statuses" : activityStatus}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s === "all" ? "All activity statuses" : s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                  )}
                </>
              )}
            </div>
          </motion.div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setMainTab("overview")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mainTab === "overview"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setMainTab("analysis")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mainTab === "analysis"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Activity analysis
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          ) : !data ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              No dashboard data for this scope.
            </div>
          ) : mainTab === "analysis" ? (
            <ActivityAnalysisPanel
              items={activityAnalysis}
              scope={{
                level,
                scopeLabel: lockedStateLabel
                  || (filterState !== "all"
                    ? (states.find((s) => String(s.id) === String(filterState))?.description || filterState)
                    : null),
                statesInScope: Number(data?.states_in_scope || 0),
                actionQueue: actionQueue,
              }}
            />
          ) : (
            <ProviderManagementOverview
              level={level}
              scopeLabel={lockedStateLabel
                || (filterState !== "all"
                  ? (states.find((s) => String(s.id) === String(filterState))?.description || filterState)
                  : null)}
              showPipelineDrill={showPipelineDrill}
              isReacc={isReacc}
              sdoPipeline={sdoPipeline}
              programme={programme}
              kpis={kpis}
              byActivity={byActivity}
              byStatus={byStatus}
              byState={byState}
              zoneChartData={zoneChartData}
              monthlyTrend={monthlyTrend}
              hasMonthlyTrend={hasMonthlyTrend}
              pipelineBars={pipelineBars}
              programmeOutputs={programmeOutputs}
              execTrend={execTrend}
              priorities={priorities}
              actionQueue={actionQueue}
              sdoZoneBarKey={sdoZoneBarKey}
              sdoZoneBarLabel={sdoZoneBarLabel}
              statesInScope={Number(data?.states_in_scope || 0)}
              trendSeries={trendSeries}
              onTrendSeriesChange={setTrendSeries}
            />
          )}
        </div>
      </ScrollArea>
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
