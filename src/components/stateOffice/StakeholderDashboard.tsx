import * as React from "react";
import { useSelector } from "react-redux";
import { Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { formatCount, monthLabel } from "./constants";

const BRAND = "#145c3f";
const PALETTE = ["#145c3f", "#0ea5e9", "#25a872", "#f59e0b", "#64748b", "#0891b2", "#0f766e"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

type DashRole = "sc" | "zd" | "sdo" | "dg";

function resolveRole(role: string, reportScope?: string | null, hasState?: boolean): DashRole | null {
  const r = String(role || "").trim().toLowerCase().replace(/_/g, "-");
  if (r === "dg-ceo") return "dg";
  if (r === "sdo" || r === "admin" || r === "hq-department") return "sdo";
  if (r === "zonal-coordinator" || r === "zc" || r.endsWith("-zonal-coordinator") || (isDeptZonalCoordinator(role) && reportScope !== "national")) return "zd";
  if (hasState || r === "state-coordinator" || r.endsWith("-state-coordinator") || (isDeptStateCoordinator(role) && reportScope === "state") || r.includes("state")) return "sc";
  return null;
}

const ROLE_META: Record<DashRole, { title: string; blurb: string; queueTitle: string }> = {
  sc: { title: "State Coordinator", blurb: "State-level activity coverage, report endorsement, follow-up and data quality.", queueTitle: "Coordinator attention queue" },
  zd: { title: "Zonal Director", blurb: "Compare states, spot gaps and coordinate support across the zone.", queueTitle: "Zonal coordination queue" },
  sdo: { title: "SDO / HQ", blurb: "National and zonal performance, patterns, risks and escalations.", queueTitle: "SDO / HQ intervention queue" },
  dg: { title: "Director-General", blurb: "Strategic outcomes, geographic gaps and decisions requiring leadership.", queueTitle: "Executive attention required" },
};

export default function StakeholderDashboard({
  defaultZoneId,
  defaultStateId,
}: {
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}) {
  const user = useSelector((s: RootState) => s.auth.user);
  const reportScope = user?.role_config?.report_scope ?? null;
  const resolvedStateCode = String(defaultStateId || user?.state_code || (user as any)?.state?.code || "").trim() || null;
  const resolvedZoneCode = String(defaultZoneId || user?.zonal_code || (user as any)?.zone?.zonal_code || "").trim() || null;
  const dashRole = resolveRole(user?.role || "", reportScope, !!resolvedStateCode);
  const meta = dashRole ? ROLE_META[dashRole] : null;

  const lockState = dashRole === "sc" && !!resolvedStateCode;
  const lockZone = dashRole === "zd" && !!resolvedZoneCode;
  const showZoneFilter = dashRole === "sdo" || dashRole === "dg";
  const showStateFilter = !lockState && (dashRole === "sdo" || dashRole === "dg" || dashRole === "zd");

  const [year, setYear] = React.useState(String(currentYear));
  const [period, setPeriod] = React.useState("all"); // "all" | month "1".."12" | "q1".."q4"
  const [filterZone, setFilterZone] = React.useState(resolvedZoneCode ?? "all");
  const [filterState, setFilterState] = React.useState(resolvedStateCode ?? "all");
  const [category, setCategory] = React.useState("all");
  const [programme, setProgramme] = React.useState("all");

  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any | null>(null);
  const [face, setFace] = React.useState<"overview" | "analysis">("overview");

  React.useEffect(() => {
    stockApi.getZones().then((res) => setZones(res.data || [])).catch(() => setZones([]));
  }, []);
  React.useEffect(() => {
    const zoneArg = lockState || lockZone ? (resolvedZoneCode ?? undefined)
      : filterZone === "all" ? undefined : filterZone;
    stockApi.getStates(zoneArg).then((res) => setStates(res.data || [])).catch(() => setStates([]));
  }, [filterZone, lockState, lockZone, resolvedZoneCode]);

  const load = React.useCallback(async () => {
    if (!dashRole) { setLoading(false); setData(null); return; }
    setLoading(true);
    try {
      const filters: Record<string, string> = { year };
      if (period.startsWith("q")) filters.quarter = period.slice(1);
      else if (period !== "all") filters.month = period;
      if (lockState && resolvedStateCode) filters.state_code = resolvedStateCode;
      else if (lockZone && resolvedZoneCode) {
        filters.zonal_code = resolvedZoneCode;
        if (filterState !== "all") filters.state_code = filterState;
      } else {
        if (filterZone !== "all") filters.zonal_code = filterZone;
        if (filterState !== "all") filters.state_code = filterState;
      }
      if (category !== "all") filters.category = category;
      if (programme !== "all") filters.programme = programme;
      const res = await stateOfficeApi.stakeholder.dashboard(filters);
      setData(res.data || null);
    } catch (err: any) {
      setData(null);
      toast.error(err?.message || "Could not load stakeholder dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashRole, year, period, filterZone, filterState, category, programme, lockState, lockZone, resolvedStateCode, resolvedZoneCode]);

  React.useEffect(() => { void load(); }, [load]);

  if (!dashRole || !meta) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-2 rounded-sm border border-[#d4e8dc] bg-white p-8">
          <h2 className="text-lg font-bold text-[#0f3d2e]">Dashboard not available</h2>
          <p className="text-sm text-slate-500">
            The Stakeholder Engagement dashboard is limited to State Coordinator, Zonal Director, SDO and DG.
          </p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const byCategory: any[] = data?.by_category || [];
  const byProgramme: any[] = data?.by_programme || [];
  const byStakeholder: any[] = data?.by_stakeholder || [];
  const byState: any[] = data?.by_state || [];
  const byZone: any[] = data?.by_zone || [];
  const outcomes: any[] = data?.outcomes || [];
  const trend: any[] = data?.trend || [];
  const queue: any[] = data?.queue || [];
  const categoryOptions = byCategory.map((c) => c.name);
  const programmeOptions = byProgramme.map((p) => p.name);
  const completedPct = s.activities ? Math.round((Number(s.completed || 0) / Number(s.activities)) * 100) : 0;

  const kpis = (() => {
    if (dashRole === "sc") return [
      { label: "Activities recorded", value: formatCount(s.activities || 0), sub: "in selected period" },
      { label: "Completed", value: formatCount(s.completed || 0), sub: `${completedPct}% of activities` },
      { label: "Follow-ups required", value: formatCount(s.follow_ups_required || 0), sub: "activity records" },
      { label: "Follow-ups outstanding", value: formatCount(s.follow_ups_outstanding || 0), sub: "action needed" },
      { label: "Reports awaiting endorsement", value: formatCount(s.awaiting_endorsement || 0), sub: "review queue" },
    ];
    if (dashRole === "zd") return [
      { label: "Activities across zone", value: formatCount(s.activities || 0), sub: "in selected period" },
      { label: "States reporting", value: `${s.states_reporting || 0} / ${s.states_total || 0}`, sub: s.states_total - (s.states_reporting || 0) ? "some states outstanding" : "full coverage" },
      { label: "Follow-ups outstanding", value: formatCount(s.follow_ups_outstanding || 0), sub: "across states" },
      { label: "Activities completed", value: formatCount(s.completed || 0), sub: `${completedPct}% of records` },
      { label: "States needing support", value: formatCount(s.states_needing_support || 0), sub: "based on indicators" },
    ];
    if (dashRole === "sdo") return [
      { label: "National activities", value: formatCount(s.activities || 0), sub: "in selected period" },
      { label: "Reporting states", value: `${s.states_reporting || 0} / ${s.states_total || 0}`, sub: "coverage in period" },
      { label: "Follow-ups outstanding", value: formatCount(s.follow_ups_outstanding || 0), sub: "national total" },
      { label: "Outcome categories used", value: formatCount(s.outcome_categories || 0), sub: "mapped outcomes" },
      { label: "Escalations flagged", value: formatCount(s.escalations || 0), sub: "requires review" },
    ];
    return [
      { label: "Engagement activities", value: formatCount(s.activities || 0), sub: "in selected period" },
      { label: "Stakeholder groups reached", value: formatCount(s.stakeholder_groups || 0), sub: "distinct categories" },
      { label: "Partnerships / MoUs", value: formatCount(s.partnerships || 0), sub: "recorded outcomes" },
      { label: "Implementation issues addressed", value: formatCount(s.issues_addressed || 0), sub: "recorded outcomes" },
      { label: "Follow-ups outstanding", value: formatCount(s.follow_ups_outstanding || 0), sub: "management attention" },
    ];
  })();

  const periodValue = period === "all" ? `y-${year}` : period.startsWith("q") ? `${year}-${period}` : `${year}-m${period}`;

  return (
    <ScrollArea className="flex-1">
      <div className="w-full p-2 space-y-2">
        <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <FilterField label="Period">
              <Select value={periodValue} onValueChange={(v) => {
                if (v.startsWith("y-")) { setYear(v.slice(2)); setPeriod("all"); }
                else {
                  const [y, p] = v.split("-");
                  setYear(y);
                  setPeriod(p.startsWith("q") ? p : p.slice(1));
                }
              }}>
                <SelectTrigger displayValue={
                  period === "all" ? `${year} · All months`
                    : period.startsWith("q") ? `${period.toUpperCase()} ${year}`
                    : `${monthLabel(Number(period))} ${year}`
                }><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <React.Fragment key={y}>
                      <SelectItem value={`y-${y}`}>{y} · All months</SelectItem>
                      {QUARTERS.map((q) => (
                        <SelectItem key={`${y}-${q.toLowerCase()}`} value={`${y}-${q.toLowerCase()}`}>{q} {y}</SelectItem>
                      ))}
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={`${y}-m${i + 1}`} value={`${y}-m${i + 1}`}>{monthLabel(i + 1)} {y}</SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            {showZoneFilter && (
              <FilterField label="Zone">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                  <SelectTrigger displayValue={filterZone === "all" ? "All zones" : zones.find((z) => String(z.zonal_code || z.id) === String(filterZone))?.description || filterZone}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.zonal_code || z.id} value={String(z.zonal_code || z.id)}>{z.description || z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {showStateFilter && (
              <FilterField label="State">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger displayValue={filterState === "all" ? "All states" : states.find((x) => String(x.code || x.id) === String(filterState))?.description || filterState}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {states.map((x) => (
                      <SelectItem key={x.code || x.id} value={String(x.code || x.id)}>{x.description || x.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {lockState && (
              <FilterField label="State">
                <div className="h-10 px-3.5 flex items-center rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] text-sm font-medium text-[#0f3d2e]">
                  {states.find((x) => String(x.code) === String(resolvedStateCode))?.description || resolvedStateCode || "Assigned state"}
                </div>
              </FilterField>
            )}

            <FilterField label="Engagement category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger displayValue={category === "all" ? "All categories" : category}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  {category !== "all" && !categoryOptions.includes(category) && <SelectItem value={category}>{category}</SelectItem>}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Programme">
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger displayValue={programme === "all" ? "All programmes" : programme}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programmes</SelectItem>
                  {programmeOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#d4e8dc] bg-white p-1 shadow-2xs w-full sm:w-fit">
          {([
            { id: "overview" as const, label: "Overview" },
            { id: "analysis" as const, label: "Analysis" },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFace(item.id)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                face === item.id ? "bg-[#145c3f] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading dashboard…
          </div>
        ) : (
          <motion.div key={`${dashRole}-${face}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="space-y-4">
            {face === "analysis" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Panel title="Engagement by category" subtitle="Distinct engagement records per category">
                  <RankList items={byCategory.slice(0, 10).map((c) => ({ name: c.name, value: c.value }))} empty="No categories recorded" />
                </Panel>
                <Panel title="Engagement by programme" subtitle="Distinct engagement records per programme — multi-select counts overlap">
                  <RankList items={byProgramme.slice(0, 10).map((p) => ({ name: p.name, value: p.value }))} empty="No programme linkage recorded" />
                </Panel>
                <Panel title="Engagement by stakeholder" subtitle="Distinct engagement records per stakeholder group — multi-select counts overlap">
                  <RankList items={byStakeholder.slice(0, 10).map((x) => ({ name: x.name, value: x.value }))} empty="No stakeholder groups recorded" />
                </Panel>
                <Panel title="Outcome areas recorded" subtitle="Distinct engagement records per outcome category">
                  <RankList items={outcomes.slice(0, 10).map((o) => ({ name: o.name, value: o.value }))} empty="No outcomes recorded" />
                </Panel>
                <Panel title="Monthly activity trend" className="xl:col-span-2">
                  <ChartFrame>
                    {trend.some((t) => t.activities) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="activities" name="Activities" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart message="No activity trend for this period" />}
                  </ChartFrame>
                </Panel>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-sm border border-[#d4e8dc] border-l-4 border-l-[#145c3f] bg-white p-3.5 shadow-[0_1px_0_rgba(15,61,46,0.04)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{kpi.label}</p>
                  <p className="text-2xl font-black text-[#0f3d2e] tabular-nums mt-1.5 tracking-tight">{kpi.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              {dashRole === "sc" && (
                <>
                  <Panel title="Activities by engagement category" className="xl:col-span-3">
                    <ChartFrame>
                      {byCategory.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byCategory.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="value" name="Activities" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No activities recorded for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="Monthly activities recorded" className="xl:col-span-2">
                    <ChartFrame>
                      {trend.some((t) => t.activities) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="activities" name="Activities" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No monthly activity to chart" />}
                    </ChartFrame>
                  </Panel>
                </>
              )}

              {dashRole === "zd" && (
                <>
                  <Panel title="Activities by state" className="xl:col-span-3">
                    <ChartFrame>
                      {byState.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byState} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="state_name" width={130} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="activities" name="Activities" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No state activity for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="Follow-ups outstanding by state" className="xl:col-span-2">
                    <ChartFrame>
                      {byState.some((x) => x.followups_outstanding) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[...byState].sort((a, b) => b.followups_outstanding - a.followups_outstanding)} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                            <XAxis dataKey="state_name" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="followups_outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No outstanding follow-ups" />}
                    </ChartFrame>
                  </Panel>
                </>
              )}

              {dashRole === "sdo" && (
                <>
                  <Panel title="Activities by zone" className="xl:col-span-3">
                    <ChartFrame>
                      {byZone.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byZone} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="value" name="Activities" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No zone activity for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="National engagement activity trend" className="xl:col-span-2">
                    <ChartFrame>
                      {trend.some((t) => t.activities) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="activities" name="Activities" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No activity trend for this period" />}
                    </ChartFrame>
                  </Panel>
                </>
              )}

              {dashRole === "dg" && (
                <>
                  <Panel title="Top recorded outcome areas" className="xl:col-span-3">
                    <RankList items={outcomes.slice(0, 8).map((o) => ({ name: o.name, value: o.value }))} empty="No outcomes recorded for this period" />
                  </Panel>
                  <Panel title="Activities by zone" className="xl:col-span-2">
                    <RankList items={byZone.map((z) => ({ name: z.name, value: z.value }))} empty="No zone activity for this period" />
                  </Panel>
                </>
              )}
            </div>

            <Panel title={meta.queueTitle} subtitle={meta.blurb}>
              <SimpleTable
                headers={["Issue / signal", "Count", "Suggested action"]}
                rows={queue.map((q) => [q.issue, q.count ?? "—", q.action])}
                empty="Nothing needs attention for this period."
              />
            </Panel>
            </>
            )}
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white border border-[#d4e8dc] rounded-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-[#d4e8dc] bg-gradient-to-r from-[#f8fdfb] to-white">
        <h2 className="text-sm font-bold text-[#0f3d2e]">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-[260px]">{children}</div>;
}

function RankList({ items, empty }: { items: { name: string; value: string | number }[]; empty: string }) {
  if (!items.length) return <EmptyChart message={empty} />;
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);
  return (
    <div className="space-y-2.5">
      {items.slice(0, 8).map((item, i) => {
        const numeric = Number(item.value) || 0;
        const width = Math.max(6, Math.round((numeric / max) * 100));
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-slate-700 font-medium">{item.name}</span>
              <span className="font-bold tabular-nums text-[#0f3d2e] shrink-0">{formatCount(numeric)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e8f3ec] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500 py-8 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-4 -mb-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f4f7f5]">
            {headers.map((h) => <TableHead key={h} className="text-xs font-bold text-[#0f3d2e]">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-[#f8fdfb]">
              {row.map((cell, j) => (
                <TableCell key={j} className={`text-sm ${j === 0 ? "font-semibold text-[#0f3d2e]" : "text-slate-700"}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="h-full min-h-[120px] flex items-center justify-center text-xs text-slate-400 text-center px-4">{message}</div>;
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-white p-2.5 shadow-sm text-xs">
      <p className="font-bold text-[#0f3d2e] mb-1">{label || payload[0].name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-600 flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-bold tabular-nums">{Number(p.value).toLocaleString()}{unit != null ? unit : ""}</span>
        </p>
      ))}
    </div>
  );
}
