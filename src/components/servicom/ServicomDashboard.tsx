/**
 * SERVICOM Staff dashboard — single page, three sections:
 * 1) Citizens' Comment Card
 * 2) HCF Customer Satisfaction Survey
 * 3) Complaint Register
 */
import * as React from "react";
import {
  RefreshCw, Loader2, TrendingDown, AlertTriangle, TrendingUp,
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

const CATEGORY_CHART_COLORS = ["#145c3f", "#1a7a52", "#25a872", "#3d9b6e", "#7eb89a"];

/** Distinct palette for indicator bars — cycles if there are more indicators than colors. */
const INDICATOR_CHART_COLORS = [
  "#145c3f", "#2563eb", "#d97706", "#7c3aed", "#0891b2",
  "#db2777", "#059669", "#ea580c", "#4f46e5", "#0d9488",
  "#c026d3", "#ca8a04", "#0284c7", "#e11d48", "#65a30d",
  "#9333ea", "#f59e0b", "#0ea5e9", "#be123c", "#16a34a",
];

interface Props {
  onBack: () => void;
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

export default function ServicomDashboard({ defaultStateId, defaultZoneId }: Props) {
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
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-30 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#145c3f]">SERVICOM</p>
            <h1 className="text-lg font-semibold text-slate-900">Service Delivery Dashboard</h1>
            <ul className="mt-1 text-xs text-slate-500 space-y-0.5 list-disc list-inside">
              <li>Identify service delivery gaps</li>
              <li>Compare performance across states and facilities</li>
              <li>Determine where corrective action is required</li>
            </ul>
            {data && (
              <p className="mt-2 text-[11px] text-slate-500">
                Live from database
                {" · "}
                {data.comment_cards ?? data.meta?.counts?.comment_cards ?? 0} comment cards
                {" · "}
                {data.satisfaction_surveys ?? data.meta?.counts?.satisfaction_surveys ?? 0} satisfaction surveys
                {" · "}
                {data.complaints_received ?? data.meta?.counts?.complaints ?? 0} complaints
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
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

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-5 space-y-12 max-w-[1400px]">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading SERVICOM dashboard…
            </div>
          ) : (
            <>
              {/* ── 1. Citizens' Comment Card ── */}
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

              {/* ── 2. HCF Customer Satisfaction Survey ── */}
              <section className="space-y-4">
                <SectionTitle
                  title="Healthcare facility customer satisfaction survey"
                  note="Filters: reporting period, location (state), facility/provider, survey date. Yes = positive response."
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl">
                  <Filter label="Facility / Provider">
                    <Input
                      className="h-9"
                      placeholder="Provider name"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    />
                  </Filter>
                  <Filter label="Survey date">
                    <Input
                      className="h-9"
                      type="date"
                      value={surveyDate}
                      onChange={(e) => setSurveyDate(e.target.value)}
                    />
                  </Filter>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
                  <DashKpi
                    label="Facilities surveyed"
                    value={survey?.facilities_surveyed ?? 0}
                    detail={`${survey?.surveys ?? 0} survey records`}
                    onClick={() => openSurveys("Facilities surveyed — satisfaction surveys")}
                  />
                  <DashKpi
                    label="Overall response rate"
                    value={survey?.overall_response_rate != null ? `${survey.overall_response_rate}%` : "—"}
                    detail="Share of Yes answers"
                    onClick={() => openSurveys("Overall response rate — surveys")}
                  />
                  <DashKpi
                    label="Strongest category"
                    value={survey?.strongest_category ? satisfactionCategoryLabel(survey.strongest_category.name) : "—"}
                    detail={survey?.strongest_category ? `${survey.strongest_category.rate}% positive` : "Needs survey data"}
                    onClick={() => openSurveys(
                      survey?.strongest_category
                        ? `Strongest: ${satisfactionCategoryLabel(survey.strongest_category.name)}`
                        : "Satisfaction surveys",
                    )}
                  />
                  <DashKpi
                    label="Priority category"
                    value={survey?.priority_category ? satisfactionCategoryLabel(survey.priority_category.name) : "—"}
                    detail={survey?.priority_category ? `${survey.priority_category.rate}% positive` : "Lowest category appears here"}
                    onClick={() => openSurveys(
                      survey?.priority_category
                        ? `Priority: ${satisfactionCategoryLabel(survey.priority_category.name)}`
                        : "Satisfaction surveys",
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                  <CategoryRadialChart
                    rows={survey?.by_category ?? []}
                    categoryFocus={categoryFocus}
                    onSelectCategory={setCategoryFocus}
                  />

                  <DashChartCard title="Indicator-level positive response">
                    {indicators.length === 0 ? (
                      <ChartEmpty message="No indicators in this view." />
                    ) : (
                      <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between gap-2 mb-1 px-1">
                          <p className="text-[11px] text-slate-500">
                            {categoryFocus ? satisfactionCategoryLabel(categoryFocus) : "All categories"}
                            {" · each bar is a unique indicator · dashed line = 50%"}
                          </p>
                          {categoryFocus && (
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-[#145c3f] shrink-0"
                              onClick={() => setCategoryFocus(null)}
                            >
                              Show all
                            </button>
                          )}
                        </div>
                        <div
                          className="w-full"
                          style={{ height: Math.max(300, indicators.length * 28 + 48) }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={indicators.map((row: any, index: number) => ({
                                id: row.id,
                                question: row.question,
                                rate: row.positive_rate != null ? Number(row.positive_rate) : 0,
                                low: !!row.low,
                                repeated_low: !!row.repeated_low,
                                color: indicatorColor(index),
                              }))}
                              layout="vertical"
                              margin={{ left: 4, right: 16, top: 8, bottom: 4 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                              <XAxis
                                type="number"
                                domain={[0, 100]}
                                tick={{ fontSize: 11 }}
                                unit="%"
                              />
                              <YAxis
                                type="category"
                                dataKey="id"
                                width={42}
                                tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
                              />
                              <Tooltip
                                formatter={(value: any, _n, item: any) => {
                                  const flag = item?.payload?.repeated_low
                                    ? "Repeated low"
                                    : item?.payload?.low
                                      ? "Low"
                                      : "OK";
                                  return [`${value}% · ${flag}`, "Positive rate"];
                                }}
                                labelFormatter={(_label, payload) =>
                                  payload?.[0]?.payload?.question
                                    ? `${payload[0].payload.id}: ${payload[0].payload.question}`
                                    : String(_label)
                                }
                                contentStyle={{
                                  borderRadius: 10,
                                  border: "1px solid #d4e8dc",
                                  fontSize: 12,
                                  maxWidth: 280,
                                }}
                              />
                              <ReferenceLine
                                x={50}
                                stroke="#94a3b8"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                              />
                              <Bar dataKey="rate" radius={[0, 6, 6, 0]} maxBarSize={18}>
                                {indicators.map((row: any, index: number) => (
                                  <Cell key={row.id} fill={indicatorColor(index)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </DashChartCard>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                  <StateComparePanel topStates={topStates} lowStates={lowStates} className="xl:col-span-2" />
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <p className="text-sm font-semibold text-slate-800">Repeated low indicators</p>
                    </div>
                    {repeatedLow.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">No repeated low indicators flagged.</p>
                    ) : (
                      <ul className="space-y-2 max-h-[240px] overflow-auto">
                        {repeatedLow.map((f: any) => (
                          <li key={f.id} className="rounded-lg bg-white border border-amber-100 px-3 py-2">
                            <p className="text-[11px] font-semibold text-amber-800">
                              {f.id} · {satisfactionCategoryLabel(f.category || "")}
                            </p>
                            <p className="text-xs text-slate-700 mt-0.5">{f.question}</p>
                            <p className="text-[11px] tabular-nums text-slate-500 mt-1">
                              {f.positive_rate != null ? `${f.positive_rate}% positive` : "—"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              {/* ── 3. Complaint Register ── */}
              <section className="space-y-4">
                <SectionTitle
                  title="Complaint register"
                  note="Filters: Period (date / month / year) · Location (state / zone / HQ) · Programs · Case attributes (priority, category, type, route, status)."
                />
                <ComplaintRegisterDashboard
                  embedded
                  defaultStateId={defaultStateId}
                  defaultZoneId={defaultZoneId}
                  lockLocation={!!(defaultStateId || defaultZoneId)}
                />
              </section>
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
