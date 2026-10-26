import * as React from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Loader2, RefreshCw, Layers, Building2, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, PieChart, Pie, Cell,
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

const COLORS = ["#1a7a52", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const MONTHS = [
  { v: "all", l: "All months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    v: String(i + 1),
    l: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
  })),
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
      eyebrow: "Level 1 · State Coordinator",
      title: "Provider Management — State Operations",
      blurb: "Plan execution, facility coverage and follow-up within your assigned state.",
    },
    2: {
      eyebrow: "Level 2 · Zonal Director",
      title: "Provider Management — Zonal Oversight",
      blurb: "Compare state delivery and prioritise coordination before escalation.",
    },
    3: {
      eyebrow: "Level 3 · SDO / Headquarters",
      title: "Provider Management — National Monitoring",
      blurb: "National patterns across zones, programmes and activity pipelines.",
    },
    4: {
      eyebrow: "Level 4 · Director-General",
      title: "Provider Management — Executive Overview",
      blurb: "Strategic programme outputs, trends and priority decisions.",
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

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (lockState) return;
    const zoneArg = lockZone ? (defaultZoneId ?? undefined) : (filterZone === "all" ? undefined : filterZone);
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, lockZone, lockState, defaultZoneId]);

  const scope = React.useMemo(() => ({
    level,
    year,
    month: month === "all" ? undefined : month,
    quarter: quarter === "all" ? undefined : quarter,
    zone_id: lockZone ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
    state_id: lockState ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
    programme,
    activity,
  }), [level, year, month, quarter, lockZone, lockState, defaultZoneId, defaultStateId, filterZone, filterState, programme, activity]);

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
  const byProgramme = data?.by_programme || [];
  const actionQueue = data?.action_queue || [];
  const priorities = data?.priority_areas || [];

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_#f0fdf7_0%,_#f8fafc_45%,_#f1f5f9_100%)]">
      <div className="bg-white/90 backdrop-blur border-b border-[#d4e8dc] px-4 md:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0 mt-0.5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a7a52]">{meta.eyebrow}</p>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 truncate">{meta.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{meta.blurb}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-4 space-y-4 pb-10 max-w-[1400px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#d4e8dc] bg-white/90 p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <FilterField label="Year">
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
              {!lockZone && (
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
              {!lockState && level !== 4 && (
                <FilterField label="State">
                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states</SelectItem>
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
              <FilterField label="Activity">
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All activities</SelectItem>
                    {PROVIDER_FORM_TYPES.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#1a7a52]" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          ) : !data ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 text-center text-sm text-slate-500">
              No dashboard data for this scope.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <DashKpi label="Activities planned" value={fmtNum(kpis.activities_planned)} detail="Activity records in period" />
                <DashKpi label="Completed activities" value={fmtNum(kpis.activities_completed)} detail={`${fmtPct(kpis.activity_completion_rate)} completion`} />
                <DashKpi label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="Covered ÷ planned facilities" />
                <DashKpi label="Facility coverage" value={fmtPct(kpis.facility_coverage_rate)} detail="Covered ÷ state facility stock" />
                <DashKpi label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail={`${fmtNum(kpis.facilities_planned)} planned`} />
                {level >= 3 ? (
                  <DashKpi label="Accredited / Re-accredited" value={`${fmtNum(kpis.accredited)} / ${fmtNum(kpis.reaccredited)}`} detail="Separate pipelines" />
                ) : (
                  <DashKpi label="Awaiting accreditation" value={fmtNum(kpis.awaiting_accreditation)} detail={`${fmtNum(kpis.accredited)} accredited`} />
                )}
              </div>

              {level === 4 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ExecStat icon={<Building2 className="w-4 h-4" />} label="FSSHIP accredited" value={fmtNum(byProgramme.find((p: any) => p.name === "FSSHIP")?.accredited ?? kpis.accredited)} />
                  <ExecStat icon={<Building2 className="w-4 h-4" />} label="FSSHIP re-accredited" value={fmtNum(byProgramme.find((p: any) => p.name === "FSSHIP")?.reaccredited ?? kpis.reaccredited)} />
                  <ExecStat icon={<Layers className="w-4 h-4" />} label="BHCPF PHCs accredited" value={fmtNum(kpis.bhcpf_phcs_accredited)} />
                  <ExecStat icon={<Layers className="w-4 h-4" />} label="BHCPF PHCs re-accredited" value={fmtNum(kpis.bhcpf_phcs_reaccredited)} />
                </div>
              )}

              <div className={`grid gap-4 ${level === 1 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                <DashChartCard title="Planned vs covered by activity" className={level === 1 ? "" : "lg:col-span-2"}>
                  {byActivity.length === 0 ? <ChartEmpty message="No activity mix for this filter set" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byActivity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle()} />
                        <Legend />
                        <Bar dataKey="planned" name="Planned" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="covered" name="Covered" fill="#1a7a52" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </DashChartCard>

                <DashChartCard title="Activity status mix">
                  {byStatus.length === 0 ? <ChartEmpty message="No status breakdown" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                          {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </DashChartCard>
              </div>

              {(level === 2 || level === 3) && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title={level === 2 ? "State comparison — plan achievement" : "Performance by zone"}>
                    {(level === 2 ? byState : byZone).length === 0 ? <ChartEmpty message="No geo comparison yet" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={(level === 2 ? byState : byZone).slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={tooltipStyle()} formatter={(v: any) => fmtPct(Number(v))} />
                          <Bar dataKey="plan_achievement" name="Plan achievement %" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Monthly planned vs covered">
                    {byMonth.length === 0 ? <ChartEmpty message="No monthly trend" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={byMonth}>
                          <defs>
                            <linearGradient id="pmCovered" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1a7a52" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#1a7a52" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          <Area type="monotone" dataKey="planned" name="Planned" stroke="#94a3b8" fill="transparent" strokeWidth={2} />
                          <Area type="monotone" dataKey="covered" name="Covered" stroke="#1a7a52" fill="url(#pmCovered)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              {level >= 3 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <DashChartCard title="Accreditation vs reaccreditation trend">
                    {byMonth.length === 0 ? <ChartEmpty message="No pipeline trend" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={byMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          <Area type="monotone" dataKey="accredited" name="Accredited" stroke="#1a7a52" fill="#1a7a5233" strokeWidth={2} />
                          <Area type="monotone" dataKey="reaccredited" name="Re-accredited" stroke="#8b5cf6" fill="#8b5cf633" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Programme outputs">
                    {byProgramme.length === 0 ? <ChartEmpty message="No programme breakdown" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byProgramme}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle()} />
                          <Legend />
                          <Bar dataKey="accredited" name="Accredited" fill="#1a7a52" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="reaccredited" name="Re-accredited" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#d4e8dc] bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-slate-800">
                      {level === 1 ? "State action queue" : level === 2 ? "Zonal follow-up" : level === 3 ? "National exceptions" : "Executive decisions"}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {(level >= 4
                      ? [
                          "Direct follow-up by programme and activity",
                          "Request time-bound improvement plans from zones",
                          "Monitor accreditation and reaccreditation separately",
                          ...actionQueue.slice(0, 2),
                        ]
                      : actionQueue
                    ).map((item: string) => (
                      <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#1a7a52] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#d4e8dc] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#d4e8dc] bg-[#f8fdfb]">
                    <p className="text-sm font-semibold text-slate-800">
                      {level === 4 ? "Priority areas for attention" : "Pipeline snapshot"}
                    </p>
                  </div>
                  {level === 4 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs">Area</TableHead>
                          <TableHead className="text-xs">Signal</TableHead>
                          <TableHead className="text-xs">Management focus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priorities.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-sm text-slate-400 text-center py-8">No priority signals</TableCell></TableRow>
                        ) : priorities.map((p: any) => (
                          <TableRow key={p.area}>
                            <TableCell className="text-sm font-medium">{p.area}</TableCell>
                            <TableCell className="text-sm">{p.signal}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p.focus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 p-4">
                      <MiniStat label="Awaiting accreditation" value={fmtNum(kpis.awaiting_accreditation)} />
                      <MiniStat label="Accredited this period" value={fmtNum(kpis.accredited)} />
                      <MiniStat label="Awaiting reaccreditation" value={fmtNum(kpis.awaiting_reaccreditation)} />
                      <MiniStat label="Re-accredited this period" value={fmtNum(kpis.reaccredited)} />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                Rates use summed numerators ÷ summed denominators (not averages of percentages). Forms sold / returned are excluded from performance ranking.
              </p>
            </>
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

function ExecStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d4e8dc] bg-white p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-[#e8f6ee] text-[#145c3f] flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8fdfb] border border-[#e5f3eb] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900 mt-1">{value}</p>
    </div>
  );
}
