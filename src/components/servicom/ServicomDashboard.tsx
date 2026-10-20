import * as React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import { servicomApi, stockApi } from "@/lib/api";
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";
import { pickGeoLabel } from "./servicomConstants";
import { satisfactionCategoryLabel } from "./servicomSurveyConstants";

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

function rateTone(rate: number) {
  if (rate >= 70) return "#1a7a52";
  if (rate >= 50) return "#d97706";
  return "#e11d48";
}

function fmtScore(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

export default function ServicomDashboard({ defaultStateId, defaultZoneId }: Props) {
  const geoLocked = !!(defaultZoneId && defaultStateId);
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [quarter, setQuarter] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [provider, setProvider] = React.useState("");
  const [surveyDate, setSurveyDate] = React.useState("");
  const [categoryFocus, setCategoryFocus] = React.useState<string | null>(null);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (geoLocked) return;
    const zoneArg = filterZone === "all" ? undefined : filterZone;
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, geoLocked]);

  const scope = React.useMemo(() => ({
    state_id: geoLocked ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
    zone_id: geoLocked ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
    year: year === "all" ? undefined : year,
    quarter: quarter === "all" ? undefined : quarter,
    provider: provider.trim() || undefined,
    survey_date: surveyDate || undefined,
  }), [geoLocked, defaultStateId, defaultZoneId, filterState, filterZone, year, quarter, provider, surveyDate]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.getDashboard(scope);
      setData(res.data?.quality ?? null);
    } catch (err: any) {
      toast.error("Failed to load SERVICOM dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const card = data?.comment_card;
  const survey = data?.satisfaction;
  const indicators = (survey?.indicators ?? []).filter((row: any) =>
    !categoryFocus || row.category === categoryFocus,
  );

  const zoneLabel = filterZone === "all" ? "All zones" : pickGeoLabel(zones, filterZone, "Zone");
  const stateLabel = filterState === "all" ? "All states" : pickGeoLabel(states, filterState, "State");

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-30 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">SERVICOM</h1>
            <p className="text-xs text-slate-500">Service delivery gaps across comment cards and facility surveys</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <Filter label="Year">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y === "all" ? "All years" : y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Quarter">
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
          {!geoLocked && (
            <>
              <Filter label="Zone">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                  <SelectTrigger className="h-9" displayValue={zoneLabel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="State">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="h-9" displayValue={stateLabel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Filter>
            </>
          )}
          <Filter label="Facility">
            <Input className="h-9" placeholder="Provider name" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </Filter>
          <Filter label="Survey date">
            <Input className="h-9" type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
          </Filter>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-5 space-y-8 max-w-[1400px]">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard…
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <SectionTitle title="Citizens' Comment Card" note="Reception and overall use the 1–5 scale. The other questions stay on 1–4 and are shown as a percent of their own scale." />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                  <DashKpi label="Count of responses" value={card?.responses ?? 0} detail="Comment cards in this period" />
                  <DashKpi label="Reception average" value={fmtScore(card?.reception_average)} detail="Mean of the reception question (1–5)" />
                  <DashKpi label="Overall rating" value={fmtScore(card?.overall_rating)} detail="Mean of the overall question (1–5)" />
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
                          <Tooltip formatter={(value: any, _n, item: any) => [`${value}% · avg ${item?.payload?.average ?? "—"} / ${item?.payload?.max}`, "Score"]} />
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

              <section className="space-y-4">
                <SectionTitle title="Healthcare facility customer satisfaction" note="A Yes answer is a positive response. Facility and survey date apply to this section." />
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
                  <DashKpi label="Facilities surveyed" value={survey?.facilities_surveyed ?? 0} detail={`${survey?.surveys ?? 0} survey records`} />
                  <DashKpi label="Overall response rate" value={survey?.overall_response_rate != null ? `${survey.overall_response_rate}%` : "—"} detail="Share of Yes answers" />
                  <DashKpi label="Strongest category" value={survey?.strongest_category ? satisfactionCategoryLabel(survey.strongest_category.name) : "—"} detail={survey?.strongest_category ? `${survey.strongest_category.rate}% positive` : "Needs survey data"} />
                  <DashKpi label="Priority category" value={survey?.priority_category ? satisfactionCategoryLabel(survey.priority_category.name) : "—"} detail={survey?.priority_category ? `${survey.priority_category.rate}% positive` : "Lowest category appears here"} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  <div className="rounded-xl border border-[#d4e8dc] bg-white p-4">
                    <p className="text-sm font-semibold text-slate-800">Positive response rate by category</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Select a category to filter the indicators.</p>
                    {(survey?.by_category ?? []).every((c: any) => c.positive_rate == null) ? (
                      <ChartEmpty message="No satisfaction surveys in this period." />
                    ) : (
                      <div className="space-y-2.5">
                        {(survey?.by_category ?? []).map((row: any) => {
                          const rate = Number(row.positive_rate) || 0;
                          const selected = categoryFocus === row.category;
                          return (
                            <button
                              key={row.category}
                              type="button"
                              onClick={() => setCategoryFocus(selected ? null : row.category)}
                              className={`w-full rounded-lg px-2 py-1.5 text-left ${selected ? "bg-[#e8f6ee]" : "hover:bg-slate-50"}`}
                            >
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="text-sm font-medium text-slate-800">{satisfactionCategoryLabel(row.category)}</span>
                                <span className="text-sm font-semibold tabular-nums text-slate-800">{rate}%</span>
                              </span>
                              <span className="mt-1.5 block h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                <span
                                  className="block h-full rounded-full"
                                  style={{ width: `${Math.max(0, Math.min(100, rate))}%`, background: rateTone(rate) }}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-[#d4e8dc] bg-white p-4 flex flex-col min-h-[320px]">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-slate-800">Indicator-level positive response</p>
                      {categoryFocus && (
                        <button type="button" className="text-[11px] font-semibold text-[#145c3f]" onClick={() => setCategoryFocus(null)}>
                          Show all
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      {categoryFocus ? satisfactionCategoryLabel(categoryFocus) : "All categories"}. Repeated means under 50% Yes in two or more quarters.
                    </p>
                    <div className="flex-1 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Indicator</TableHead>
                            <TableHead className="text-xs text-right">Positive</TableHead>
                            <TableHead className="text-xs">Flag</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indicators.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-xs text-slate-500">No indicators in this view.</TableCell></TableRow>
                          ) : indicators.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs">
                                <span className="font-medium text-slate-700">{row.id}</span>
                                <span className="block text-slate-500">{row.question}</span>
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{row.positive_rate != null ? `${row.positive_rate}%` : "—"}</TableCell>
                              <TableCell className="text-xs">
                                {row.repeated_low ? (
                                  <span className="text-rose-700 font-semibold">Repeated low</span>
                                ) : row.low ? (
                                  <span className="text-amber-700 font-semibold">Low</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
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
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{note}</p>
    </div>
  );
}
