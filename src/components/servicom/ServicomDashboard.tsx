/**
 * SERVICOM Staff dashboard — single page, three sections:
 * 1) Citizens' Comment Card
 * 2) HCF Customer Satisfaction Survey
 * 3) Complaint Register
 */
import * as React from "react";
import {
  RefreshCw, Loader2, TrendingDown, AlertTriangle, TrendingUp,
  Smile, MessageSquare, FileText, ArrowLeft, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell, ReferenceLine,
} from "recharts";
import ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import { toast } from "sonner";
import { servicomApi } from "@/lib/api";
import { zonesApi, statesApi } from "@/lib/adminApi";
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { satisfactionCategoryLabel } from "./servicomSurveyConstants";
import ComplaintRegisterDashboard from "./ComplaintRegisterDashboard";
import SatisfactionDashboardTab from "./SatisfactionDashboardTab";

const CATEGORY_CHART_COLORS = ["#145c3f", "#1a7a52", "#25a872", "#3d9b6e", "#7eb89a"];

/** Distinct palette for indicator bars — cycles if there are more indicators than colors. */
const INDICATOR_CHART_COLORS = [
  "#145c3f", "#2563eb", "#d97706", "#7c3aed", "#0891b2",
  "#db2777", "#059669", "#ea580c", "#4f46e5", "#0d9488",
  "#c026d3", "#ca8a04", "#0284c7", "#e11d48", "#65a30d",
  "#9333ea", "#f59e0b", "#0ea5e9", "#be123c", "#16a34a",
];

interface Props {
  onBack?: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

const currentYear = new Date().getFullYear();
const YEARS = ["all", ...Array.from({ length: 5 }, (_, i) => String(currentYear - i))];

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

function indicatorColor(index: number) {
  return INDICATOR_CHART_COLORS[index % INDICATOR_CHART_COLORS.length];
}

function fmtScore(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[11px] text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-b border-[#d4e8dc] pb-2">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{note}</p>
    </div>
  );
}

export default function ServicomDashboard({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [activeTab, setActiveTab] = React.useState<"comment-card" | "complaints" | "satisfaction">("comment-card");
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [surveysLoading, setSurveysLoading] = React.useState(false);

  const zoneLocked = !!defaultZoneId && !defaultStateId;
  const stateLocked = !!defaultStateId;
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [quarter, setQuarter] = React.useState("all");
  const [locationLevel, setLocationLevel] = React.useState<"all" | "hq" | "zone" | "state">(
    stateLocked ? "state" : zoneLocked ? "zone" : "all",
  );
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [provider, setProvider] = React.useState("");
  const [surveyDate, setSurveyDate] = React.useState("");
  const [categoryFocus, setCategoryFocus] = React.useState<string | null>(null);

  const loadSurveys = React.useCallback(async () => {
    setSurveysLoading(true);
    try {
      const res = await servicomApi.listSatisfactionSurveys({
        state_code: defaultStateId ? defaultStateId : (filterState !== "all" ? filterState : undefined),
        zonal_code: defaultZoneId ? defaultZoneId : (filterZone !== "all" ? filterZone : undefined),
      });
      setSurveys(res.data || []);
    } catch {
      setSurveys([]);
    } finally {
      setSurveysLoading(false);
    }
  }, [defaultStateId, defaultZoneId, filterState, filterZone]);

  React.useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  React.useEffect(() => {
    zonesApi.list().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (stateLocked) return;
    const zoneArg = filterZone === "all" ? undefined : filterZone;
    statesApi.list(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, stateLocked]);

  const scope = React.useMemo(() => {
    const isHq = locationLevel === "hq";
    const zonal = !isHq
      ? (defaultZoneId || (filterZone !== "all" ? filterZone : undefined))
      : undefined;
    const state = !isHq
      ? (defaultStateId || (filterState !== "all" ? filterState : undefined))
      : undefined;

    return {
      location: isHq ? "hq" : undefined,
      zonal_code: zonal,
      state_code: state,
      zone_id: zonal,
      state_id: state,
      year: year === "all" ? undefined : year,
      quarter: quarter === "all" ? undefined : quarter,
      provider: provider.trim() || undefined,
      survey_date: surveyDate || undefined,
    };
  }, [
    locationLevel, defaultZoneId, defaultStateId,
    filterZone, filterState, year, quarter, provider, surveyDate,
  ]);

  const drillScope = React.useMemo(() => ({
    state_id: scope.state_id,
    zone_id: scope.zone_id,
    year: scope.year,
    month: undefined as string | undefined,
    quarter: scope.quarter,
    location: scope.location,
    provider: scope.provider,
    survey_date: scope.survey_date,
    zonal_code: scope.zonal_code,
    state_code: scope.state_code,
  }), [scope]);

  const drill = useDashboardDrill(
    (params) => servicomApi.getDashboardDrill(params),
    drillScope,
  );

  const drillCtx = React.useMemo(() => ({
    subtitle: [
      scope.year ? `Year ${scope.year}` : "All years",
      scope.quarter ? `Q${scope.quarter}` : null,
      scope.state_code || scope.zonal_code || (scope.location === "hq" ? "HQ" : "All locations"),
    ].filter(Boolean).join(" · "),
    breadcrumbs: ["SERVICOM Dashboard"],
  }), [scope]);

  const openCards = React.useCallback((title: string) => {
    drill.openRecordDrill("comment_cards", title, drillCtx);
  }, [drill, drillCtx]);

  const openSurveys = React.useCallback((title: string, extra?: Record<string, string>) => {
    drill.openRecordDrill("surveys", title, drillCtx, extra);
  }, [drill, drillCtx]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.getDashboard(scope);
      setData(res.data ?? null);
    } catch (err: any) {
      toast.error("Failed to load SERVICOM dashboard", { description: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const card = data?.quality?.comment_card;
  const survey = data?.quality?.satisfaction;
  const indicators = (survey?.indicators ?? []).filter((row: any) =>
    !categoryFocus || row.category === categoryFocus,
  );
  const topStates = data?.top_states ?? [];
  const lowStates = data?.low_states ?? [];
  const repeatedLow = data?.repeated_low_indicators ?? [];

  const zoneLabel = filterZone === "all"
    ? "All zones"
    : (zones.find((z) => String(z.zonal_code) === filterZone)?.description || filterZone);
  const stateLabel = filterState === "all"
    ? "All states"
    : (states.find((s) => String(s.code) === filterState)?.description || filterState);

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* 1. Master Header */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-sm hover:bg-[#e8f5ee] text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">
              SERVICOM Dashboard
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Unified service delivery intelligence across Customer Satisfaction Surveys, Complaints Management &amp; Citizens' Comment Cards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void load(); void loadSurveys(); }}
            disabled={loading || surveysLoading}
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || surveysLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* 2. Unified Tab Navigation Bar (in sidebar order: Citizens' Comment Card, Complaints, Satisfaction Survey) */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "comment-card"}
            onClick={() => setActiveTab("comment-card")}
            className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
              activeTab === "comment-card"
                ? "border-[#145c3f] text-[#145c3f]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <FileText className="size-4 shrink-0" />
            <span>Citizens' Comment Card</span>
            <span
              className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                activeTab === "comment-card"
                  ? "bg-[#e8f6ee] text-[#145c3f]"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              }`}
            >
              {data?.comment_cards ?? data?.meta?.counts?.comment_cards ?? 0}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "complaints"}
            onClick={() => setActiveTab("complaints")}
            className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
              activeTab === "complaints"
                ? "border-[#145c3f] text-[#145c3f]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <MessageSquare className="size-4 shrink-0" />
            <span>Complaints Dashboard</span>
            <span
              className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                activeTab === "complaints"
                  ? "bg-[#e8f6ee] text-[#145c3f]"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              }`}
            >
              {data?.complaints_received ?? data?.meta?.counts?.complaints ?? 0}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "satisfaction"}
            onClick={() => setActiveTab("satisfaction")}
            className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
              activeTab === "satisfaction"
                ? "border-[#145c3f] text-[#145c3f]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Smile className="size-4 shrink-0" />
            <span>Customer Satisfaction Survey</span>
            <span
              className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                activeTab === "satisfaction"
                  ? "bg-[#e8f6ee] text-[#145c3f]"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              }`}
            >
              {surveys.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Main Body Content */}
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5 max-w-7xl mx-auto space-y-6">
          {/* TAB 1: Citizens' Comment Card */}
          {activeTab === "comment-card" && (
            <div className="space-y-6">
              {/* Comment Card Filter Bar */}
              <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  <Filter label="Reporting year">
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y === "all" ? "All years" : y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Filter>
                  <Filter label="Reporting period">
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All quarters</SelectItem>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </Filter>
                  {!zoneLocked && !stateLocked && (
                    <Filter label="Location">
                      <Select
                        value={locationLevel}
                        onValueChange={(v: "all" | "hq" | "zone" | "state") => {
                          setLocationLevel(v);
                          if (v === "hq" || v === "all") {
                            setFilterZone("all");
                            setFilterState("all");
                          }
                          if (v === "zone") setFilterState("all");
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All locations</SelectItem>
                          <SelectItem value="hq">HQ</SelectItem>
                          <SelectItem value="zone">Zone</SelectItem>
                          <SelectItem value="state">State</SelectItem>
                        </SelectContent>
                      </Select>
                    </Filter>
                  )}
                  {!stateLocked && locationLevel !== "hq" && (
                    <Filter label="Zone">
                      <Select
                        value={filterZone}
                        onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}
                        disabled={zoneLocked}
                      >
                        <SelectTrigger className="h-9" displayValue={zoneLabel}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All zones</SelectItem>
                          {zones.map((z) => (
                            <SelectItem key={z.zonal_code} value={String(z.zonal_code)}>{z.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Filter>
                  )}
                  {locationLevel !== "hq" && (
                    <Filter label="State">
                      <Select value={filterState} onValueChange={setFilterState} disabled={stateLocked}>
                        <SelectTrigger className="h-9" displayValue={stateLabel}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All states</SelectItem>
                          {states.map((s) => (
                            <SelectItem key={s.code} value={String(s.code)}>{s.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Filter>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading Citizens' Comment Card analytics…
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Citizens' Comment Card */}
                  <section className="space-y-4">
                    <SectionTitle
                      title="Citizens' Comment Card"
                      note="Filters: reporting period (Q1–Q4) and location (HQ / Zone / State). Reception and overall use the 1–5 scale."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                      <DashKpi
                        label="Count of responses"
                        value={card?.responses ?? 0}
                        detail="Comment cards in this period"
                        onClick={() => openCards("Comment card responses")}
                      />
                      <DashKpi
                        label="Reception average"
                        value={fmtScore(card?.reception_average)}
                        detail="Mean of the reception question (1–5)"
                        onClick={() => openCards("Reception average — comment cards")}
                      />
                      <DashKpi
                        label="Overall rating"
                        value={fmtScore(card?.overall_rating)}
                        detail="Mean of the overall question (1–5)"
                        onClick={() => openCards("Overall rating — comment cards")}
                      />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                      <DashChartCard title="Average score by question">
                        {(card?.avg_by_question ?? []).every((q: any) => !q.responses) ? (
                          <ChartEmpty message="No comment cards in this period." />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={card?.avg_by_question ?? []} margin={{ left: 4, right: 8, top: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                              <Tooltip
                                formatter={(value: any, _n, item: any) => [
                                  `${value}% · avg ${item?.payload?.average ?? "—"} / ${item?.payload?.max}`,
                                  "Score",
                                ]}
                              />
                              <Bar dataKey="percent" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={42} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </DashChartCard>
                      <DashChartCard title="Response distribution: reception vs overall">
                        {(card?.distribution ?? []).every((d: any) => !d.reception && !d.overall) ? (
                          <ChartEmpty message="No reception or overall scores yet." />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={card?.distribution ?? []} margin={{ left: 4, right: 8, top: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Bar dataKey="reception" name="Reception" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={28} />
                              <Bar dataKey="overall" name="Overall" fill="#7eb89a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </DashChartCard>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Complaints Dashboard */}
          {activeTab === "complaints" && (
            <ComplaintRegisterDashboard
              defaultStateId={defaultStateId}
              defaultZoneId={defaultZoneId}
              lockLocation={!!(defaultStateId || defaultZoneId)}
            />
          )}

          {/* TAB 3: Satisfaction Survey Dashboard */}
          {activeTab === "satisfaction" && (
            <SatisfactionDashboardTab
              surveys={surveys}
              zones={zones}
              states={states}
              loading={surveysLoading}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
              onDrillDownState={(stCode) => {
                setFilterState(stCode);
              }}
            />
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
    </div>
  );
}

function CategoryRadialChart({
  rows,
  categoryFocus,
  onSelectCategory,
}: {
  rows: any[];
  categoryFocus: string | null;
  onSelectCategory: (category: string | null) => void;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<ApexCharts | null>(null);
  const focusRef = React.useRef(categoryFocus);
  const selectRef = React.useRef(onSelectCategory);

  React.useEffect(() => { focusRef.current = categoryFocus; }, [categoryFocus]);
  React.useEffect(() => { selectRef.current = onSelectCategory; }, [onSelectCategory]);

  const categories = React.useMemo(
    () => rows.map((row) => ({
      key: String(row.category),
      label: satisfactionCategoryLabel(row.category),
      rate: row.positive_rate != null ? Number(row.positive_rate) : null,
    })),
    [rows],
  );

  const series = React.useMemo(
    () => categories.map((c) => (c.rate == null ? 0 : c.rate)),
    [categories],
  );
  const labels = React.useMemo(() => categories.map((c) => c.label), [categories]);
  const overallAvg = React.useMemo(() => {
    const scored = categories.filter((c) => c.rate != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, c) => sum + (c.rate || 0), 0) / scored.length);
  }, [categories]);

  const empty = categories.every((c) => c.rate == null);

  React.useEffect(() => {
    if (empty || !hostRef.current) return;

    const options: ApexOptions = {
      chart: {
        type: "radialBar",
        fontFamily: "inherit",
        height: 320,
        toolbar: { show: false },
        animations: { enabled: true, speed: 700 },
        events: {
          dataPointSelection(_event, _ctx, config) {
            const key = categories[config.dataPointIndex]?.key;
            if (!key) return;
            selectRef.current(focusRef.current === key ? null : key);
          },
          legendClick(_chart, seriesIndex) {
            const key = categories[seriesIndex]?.key;
            if (!key) return;
            selectRef.current(focusRef.current === key ? null : key);
          },
        },
      },
      colors: CATEGORY_CHART_COLORS,
      plotOptions: {
        radialBar: {
          offsetY: 8,
          startAngle: -135,
          endAngle: 225,
          hollow: {
            margin: 8,
            size: "42%",
            background: "transparent",
          },
          track: {
            background: "#eef6f1",
            strokeWidth: "100%",
            margin: 4,
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748b",
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
              offsetY: 8,
              formatter: (val) => `${Math.round(Number(val) || 0)}%`,
            },
            total: {
              show: true,
              label: "Overall",
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748b",
              formatter: () => (overallAvg != null ? `${overallAvg}%` : "—"),
            },
          },
        },
      },
      stroke: { lineCap: "round" },
      labels,
      legend: {
        show: true,
        floating: false,
        position: "bottom",
        fontSize: "12px",
        fontWeight: 600,
        markers: { size: 7, offsetX: -2 },
        itemMargin: { horizontal: 8, vertical: 4 },
        formatter: (seriesName, opts) => `${seriesName}  ${series[opts.seriesIndex]}%`,
        onItemClick: { toggleDataSeries: false },
      },
      tooltip: {
        enabled: true,
        y: { formatter: (val) => `${Math.round(Number(val) || 0)}% positive` },
      },
    };

    const chart = new ApexCharts(hostRef.current, { ...options, series });
    chartRef.current = chart;
    void chart.render();

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [categories, empty, labels, overallAvg, series]);

  React.useEffect(() => {
    if (!chartRef.current || empty) return;
    const label = categoryFocus
      ? (categories.find((c) => c.key === categoryFocus)?.label || "Selected")
      : "Overall";
    const value = categoryFocus
      ? (() => {
          const hit = categories.find((c) => c.key === categoryFocus);
          return hit?.rate != null ? `${Math.round(hit.rate)}%` : "—";
        })()
      : (overallAvg != null ? `${overallAvg}%` : "—");

    void chartRef.current.updateOptions({
      plotOptions: {
        radialBar: {
          dataLabels: {
            total: {
              show: true,
              label,
              formatter: () => value,
            },
          },
        },
      },
    }, false, false);
  }, [categoryFocus, categories, empty, overallAvg]);

  if (empty) {
    return (
      <DashChartCard title="Positive response rate by category">
        <ChartEmpty message="No satisfaction surveys in this period." />
      </DashChartCard>
    );
  }

  return (
    <DashChartCard title="Positive response rate by category">
      <div className="flex h-full flex-col">
        <p className="text-[11px] text-slate-500 mb-1 px-1">
          Click a ring or legend item to filter indicators by category.
        </p>
        <div className="flex-1 min-h-[300px] -mt-1" ref={hostRef} />
      </div>
    </DashChartCard>
  );
}

function StateComparePanel({
  topStates, lowStates, className = "",
}: {
  topStates: any[];
  lowStates: any[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch ${className}`}>
      <div className="rounded-xl border border-[#d4e8dc] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#145c3f]" />
          <p className="text-sm font-semibold text-slate-800">Top performing states</p>
        </div>
        {topStates.length === 0 ? (
          <ChartEmpty message="No ranked states yet." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={topStates.map((s: any) => ({
                name: s.state_name || s.state_code,
                score: s.avg_score,
              }))}
              margin={{ left: 4, right: 8, top: 8, bottom: 28 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-700" />
          <p className="text-sm font-semibold text-slate-800">Priority states (corrective action)</p>
        </div>
        {lowStates.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No low-performing states in this period.</p>
        ) : (
          <ul className="space-y-2">
            {lowStates.map((s: any) => (
              <li
                key={s.state_code || s.state_id}
                className="flex items-baseline justify-between gap-3 rounded-lg bg-white border border-rose-100 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800">{s.state_name || s.state_code}</span>
                <span className="text-sm font-semibold tabular-nums text-rose-700">{fmtScore(s.avg_score)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
