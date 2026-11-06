import * as React from "react";
import { useSelector } from "react-redux";
import { Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { challengesSupportApi, stockApi } from "@/lib/api";
import { ChartTypeToggle, SwitchableChart, useChartType } from "./ChartTypeChart";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { formatCount, formatDate, monthLabel } from "./constants";

const BRAND = "#145c3f";
const PALETTE = ["#145c3f", "#0ea5e9", "#25a872", "#f59e0b", "#64748b", "#0891b2", "#0f766e"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

type DashRole = "state" | "zd" | "sdo" | "dg";

function resolveRole(role: string, reportScope?: string | null, hasState?: boolean): DashRole | null {
  const r = String(role || "").trim().toLowerCase().replace(/_/g, "-");
  if (r === "dg-ceo") return "dg";
  if (r === "sdo" || r === "admin" || r === "hq-department") return "sdo";
  if (r === "zonal-coordinator" || r === "zc" || r.endsWith("-zonal-coordinator") || (isDeptZonalCoordinator(role) && reportScope !== "national")) return "zd";
  if (hasState || r === "state-coordinator" || r.endsWith("-state-coordinator") || (isDeptStateCoordinator(role) && reportScope === "state") || r.includes("state") || r.includes("officer")) return "state";
  return null;
}

const ROLE_META: Record<DashRole, { title: string; blurb: string; queueTitle: string }> = {
  state: { title: "State Office", blurb: "Monitor own reported challenges, requests, assigned actions and resolution.", queueTitle: "Outstanding items & required-by dates" },
  zd: { title: "Zonal Coordinator", blurb: "Compare states within the zone; coordinate support and escalate unresolved issues.", queueTitle: "Zonal priority queue" },
  sdo: { title: "SDO / HQ", blurb: "Compare all zones, categories, departments, severity and outstanding support.", queueTitle: "National intervention queue" },
  dg: { title: "Director-General", blurb: "National risk signals, critical challenges, stalled requests and decisions required.", queueTitle: "Executive action queue" },
};

const SEV_TONE: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

interface Props {
  onBack?: () => void;
  embedded?: boolean;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function ChallengesSupportDashboard({ embedded = false, defaultZoneId, defaultStateId }: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const reportScope = user?.role_config?.report_scope ?? null;
  const resolvedStateCode = String(defaultStateId || user?.state_code || (user as any)?.state?.code || "").trim() || null;
  const resolvedZoneCode = String(defaultZoneId || user?.zonal_code || (user as any)?.zone?.zonal_code || "").trim() || null;
  const dashRole = resolveRole(user?.role || "", reportScope, !!resolvedStateCode);
  const meta = dashRole ? ROLE_META[dashRole] : null;

  const lockState = dashRole === "state" && !!resolvedStateCode;
  const lockZone = dashRole === "zd" && !!resolvedZoneCode;
  const showZoneFilter = dashRole === "sdo" || dashRole === "dg";
  const showStateFilter = !lockState && (dashRole === "sdo" || dashRole === "dg" || dashRole === "zd");

  const [year, setYear] = React.useState(String(currentYear));
  const [period, setPeriod] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(resolvedZoneCode ?? "all");
  const [filterState, setFilterState] = React.useState(resolvedStateCode ?? "all");
  const [severity, setSeverity] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [chStatus, setChStatus] = React.useState("all");
  const [suStatus, setSuStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [department, setDepartment] = React.useState("all");

  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [catalogue, setCatalogue] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any | null>(null);
  const [face, setFace] = React.useState<"overview" | "analysis">("overview");
  const [chartType, setChartType] = useChartType("challenges");

  React.useEffect(() => {
    stockApi.getZones().then((res) => setZones(res.data || [])).catch(() => setZones([]));
    challengesSupportApi.catalogue().then((res) => setCatalogue(res.data || null)).catch(() => setCatalogue(null));
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
      if (severity !== "all") filters.severity = severity;
      if (category !== "all") filters.category = category;
      if (chStatus !== "all") filters.challenge_status = chStatus;
      if (suStatus !== "all") filters.support_status = suStatus;
      if (priority !== "all") filters.priority = priority;
      if (department !== "all") filters.department = department;
      const res = await challengesSupportApi.dashboard(filters);
      setData(res.data || null);
    } catch (err: any) {
      setData(null);
      toast.error(err?.message || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashRole, year, period, filterZone, filterState, severity, category, chStatus, suStatus, priority, department,
    lockState, lockZone, resolvedStateCode, resolvedZoneCode]);

  React.useEffect(() => { void load(); }, [load]);

  if (!dashRole || !meta) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-2 rounded-sm border border-[#d4e8dc] bg-white p-8">
          <h2 className="text-lg font-bold text-[#0f3d2e]">Dashboard not available</h2>
          <p className="text-sm text-slate-500">
            The Challenges &amp; Support dashboard is limited to State Office, Zonal Coordinator, SDO and DG.
          </p>
        </div>
      </div>
    );
  }

  const ck = data?.challenge_kpis || {};
  const sk = data?.support_kpis || {};
  const byCategory: any[] = data?.challenges_by_category || [];
  const bySeverity: any[] = data?.challenges_by_severity || [];
  const byChStatus: any[] = data?.challenges_by_status || [];
  const byChState: any[] = data?.challenges_by_state || [];
  const byChZone: any[] = data?.challenges_by_zone || [];
  const bySuStatus: any[] = data?.support_by_status || [];
  const byOwner: any[] = data?.support_by_owner || [];
  const byDept: any[] = data?.support_by_department || [];
  const bySuCat: any[] = data?.support_by_category || [];
  const queue: any[] = data?.queue || [];

  const categoryOptions: string[] = catalogue?.challenge_categories?.map((c: any) => c.label || c) || byCategory.map((c) => c.name);
  const chStatusOptions: string[] = catalogue?.challenge_statuses || byChStatus.map((c) => c.name);
  const suStatusOptions: string[] = catalogue?.support_statuses || bySuStatus.map((c) => c.name);
  const deptOptions: string[] = catalogue?.departments || byDept.map((d) => d.name);

  const kpis = (() => {
    if (dashRole === "dg") return [
      { label: "Challenges reported", value: formatCount(ck.reported || 0), sub: "national total" },
      { label: "Critical challenges", value: formatCount(ck.critical_high || 0), sub: "immediate oversight" },
      { label: "Support requests open", value: formatCount(sk.open || 0), sub: "awaiting action" },
      { label: "Overdue actions", value: formatCount(sk.overdue || 0), sub: "past required-by date" },
    ];
    const first = dashRole === "state" ? "Challenges reported" : dashRole === "zd" ? "Zone challenges" : "National challenges";
    const last = dashRole === "zd" ? "Awaiting action" : dashRole === "sdo" ? "Unresolved support" : "Open support";
    return [
      { label: first, value: formatCount(ck.reported || 0), sub: "unique Challenge IDs" },
      { label: "Critical / High", value: formatCount(ck.critical_high || 0), sub: "priority attention" },
      { label: "Support requests", value: formatCount(sk.requests || 0), sub: "unique Support IDs" },
      { label: last, value: formatCount(sk.open || 0), sub: "not yet resolved / closed" },
    ];
  })();

  const rateChips = [
    { label: "Resolution rate", value: ck.resolution_rate != null ? `${ck.resolution_rate}%` : "—" },
    { label: "Escalation rate", value: ck.escalation_rate != null ? `${ck.escalation_rate}%` : "—" },
    { label: "Avg resolution time", value: sk.avg_resolution_days != null ? `${sk.avg_resolution_days}d` : "—" },
    { label: "Linked request share", value: sk.linked_share != null ? `${sk.linked_share}%` : "—" },
  ];

  const periodValue = period === "all" ? `y-${year}` : period.startsWith("q") ? `${year}-${period}` : `${year}-m${period}`;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="w-full p-2 space-y-2">
          <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              <FilterField label="Period">
                <Select value={periodValue} onValueChange={(v) => {
                  if (v.startsWith("y-")) { setYear(v.slice(2)); setPeriod("all"); }
                  else { const [y, p] = v.split("-"); setYear(y); setPeriod(p.startsWith("q") ? p : p.slice(1)); }
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
                        {QUARTERS.map((q) => <SelectItem key={`${y}-${q.toLowerCase()}`} value={`${y}-${q.toLowerCase()}`}>{q} {y}</SelectItem>)}
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
                    <SelectTrigger displayValue={filterZone === "all" ? "All zones" : zones.find((z) => String(z.zonal_code || z.id) === String(filterZone))?.description || filterZone}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      {zones.map((z) => <SelectItem key={z.zonal_code || z.id} value={String(z.zonal_code || z.id)}>{z.description || z.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {showStateFilter && (
                <FilterField label="State">
                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger displayValue={filterState === "all" ? "All states" : states.find((x) => String(x.code || x.id) === String(filterState))?.description || filterState}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states</SelectItem>
                      {states.map((x) => <SelectItem key={x.code || x.id} value={String(x.code || x.id)}>{x.description || x.name}</SelectItem>)}
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
              {lockZone && (
                <FilterField label="Zone">
                  <div className="h-10 px-3.5 flex items-center rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] text-sm font-medium text-[#0f3d2e]">
                    {zones.find((z) => String(z.zonal_code) === String(resolvedZoneCode))?.description || resolvedZoneCode || "Assigned zone"}
                  </div>
                </FilterField>
              )}

              <FilterField label="Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger displayValue={category === "all" ? "All categories" : category}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Severity">
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger displayValue={severity === "all" ? "All levels" : severity}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {["Critical", "High", "Medium", "Low"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Challenge status">
                <Select value={chStatus} onValueChange={setChStatus}>
                  <SelectTrigger displayValue={chStatus === "all" ? "All statuses" : chStatus}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {chStatusOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Support status">
                <Select value={suStatus} onValueChange={setSuStatus}>
                  <SelectTrigger displayValue={suStatus === "all" ? "All statuses" : suStatus}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {suStatusOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>

              {(dashRole === "zd" || dashRole === "sdo" || dashRole === "dg") && (
                <FilterField label="Priority">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger displayValue={priority === "all" ? "All levels" : priority}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      {["Critical", "High", "Medium", "Low"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {dashRole === "sdo" && (
                <FilterField label="Department">
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger displayValue={department === "all" ? "All departments" : department}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {deptOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <ChartTypeToggle type={chartType} onChange={setChartType} />
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-24 text-slate-500 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading dashboard…
            </div>
          ) : (
            <motion.div key={`${dashRole}-${face}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="space-y-4">
              {face === "analysis" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Panel title="Challenge severity profile" subtitle="Count of challenges by severity">
                    <RankList items={bySeverity.map((x) => ({ name: x.name, value: x.value }))} empty="No severity data" />
                  </Panel>
                  <Panel title="Challenge status distribution" subtitle="Status values from the Challenges worksheet">
                    <RankList items={byChStatus.map((x) => ({ name: x.name, value: x.value }))} empty="No challenges" />
                  </Panel>
                  <Panel title="Requests by support category" subtitle="Count of Support IDs">
                    <RankList items={bySuCat.map((x) => ({ name: x.name, value: x.value }))} empty="No support requests" />
                  </Panel>
                  <Panel title="Requests by action required from" subtitle="Count by responsible action owner">
                    <RankList items={byOwner.map((x) => ({ name: x.name, value: x.value }))} empty="No support requests" />
                  </Panel>
                  <Panel title="Support requests by status" subtitle="Count of support records" className="xl:col-span-2">
                    <ChartFrame>{bySuStatus.length ? <SwitchableChart type={chartType} data={bySuStatus} name="Count" color={"#f59e0b"} /> : <EmptyChart message="No support requests for this period" />}</ChartFrame>
                  </Panel>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-sm border border-[#d4e8dc] border-l-4 border-l-[#145c3f] bg-white p-3.5 shadow-[0_1px_0_rgba(15,61,46,0.04)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{kpi.label}</p>
                    <p className="text-2xl font-black text-[#0f3d2e] tabular-nums mt-1.5 tracking-tight">{kpi.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {rateChips.map((c) => (
                  <div key={c.label} className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-3.5 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
                    <span className="text-sm font-black text-[#145c3f] tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                {dashRole === "state" && (
                  <>
                    <Panel title="Challenges by category" subtitle="Count of challenge records" className="xl:col-span-3">
                      <ChartFrame>{byCategory.length ? <SwitchableChart type={chartType} data={byCategory} name="Count" color={BRAND} /> : <EmptyChart message="No challenges for this period" />}</ChartFrame>
                    </Panel>
                    <Panel title="Support requests by status" subtitle="Count of support records" className="xl:col-span-2">
                      <ChartFrame>{bySuStatus.length ? <SwitchableChart type={chartType} data={bySuStatus} name="Count" color={"#f59e0b"} /> : <EmptyChart message="No support requests for this period" />}</ChartFrame>
                    </Panel>
                  </>
                )}
                {dashRole === "zd" && (
                  <>
                    <Panel title="Challenges by state" subtitle="Within assigned zone" className="xl:col-span-3">
                      <ChartFrame>{byChState.length ? <SwitchableChart type={chartType} data={byChState.map((x) => ({ name: x.state_name, value: x.challenges }))} name="Count" color={BRAND} /> : <EmptyChart message="No challenges in zone" />}</ChartFrame>
                    </Panel>
                    <Panel title="Support requests by action owner" subtitle="Where intervention has been requested" className="xl:col-span-2">
                      <ChartFrame>{byOwner.length ? <SwitchableChart type={chartType} data={byOwner} name="Count" color={"#f59e0b"} /> : <EmptyChart message="No support requests" />}</ChartFrame>
                    </Panel>
                  </>
                )}
                {dashRole === "sdo" && (
                  <>
                    <Panel title="Challenges by zone" subtitle="Compare challenge volume and risk" className="xl:col-span-3">
                      <ChartFrame>{byChZone.length ? <SwitchableChart type={chartType} data={byChZone.map((x) => ({ name: x.zone_name, value: x.challenges }))} name="Count" color={BRAND} /> : <EmptyChart message="No challenges recorded" />}</ChartFrame>
                    </Panel>
                    <Panel title="Support requests by department" subtitle="Requests routed to each action owner" className="xl:col-span-2">
                      <ChartFrame>{byDept.length ? <SwitchableChart type={chartType} data={byDept} name="Count" color={"#f59e0b"} /> : <EmptyChart message="No support requests" />}</ChartFrame>
                    </Panel>
                  </>
                )}
                {dashRole === "dg" && (
                  <>
                    <Panel title="Top national challenge themes" subtitle="Priority and recurring issues" className="xl:col-span-3">
                      <RankList items={byCategory.slice(0, 8).map((x) => ({ name: x.name, value: x.value }))} empty="No challenges recorded" />
                    </Panel>
                    <Panel title="Challenge severity profile" className="xl:col-span-2">
                      <RankList items={bySeverity.map((x) => ({ name: x.name, value: x.value }))} empty="No severity data" />
                    </Panel>
                  </>
                )}
              </div>

              <Panel title={meta.queueTitle} subtitle={meta.blurb}>
                <QueueTable rows={queue} />
              </Panel>
              </>
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
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

function HBars({ data, width = 130, fill = BRAND }: { data: any[]; width?: number; fill?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 9)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={width} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Count" fill={fill} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
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

function QueueTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-sm text-slate-500 py-8 text-center">No items in scope for this period.</p>;
  return (
    <div className="overflow-x-auto -mx-4 -mb-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f4f7f5]">
            {["Priority", "Reference", "Type", "Item", "State", "Action owner", "Status", "Required by"].map((h) => (
              <TableHead key={h} className="text-xs font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className="hover:bg-[#f8fdfb]">
              <TableCell>
                <span className={`inline-flex px-2 py-0.5 rounded-sm border text-[10px] font-bold ${SEV_TONE[String(r.priority).toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {r.priority}
                </span>
              </TableCell>
              <TableCell className="text-xs font-bold text-[#145c3f] whitespace-nowrap">{r.reference}</TableCell>
              <TableCell className="text-xs text-slate-500">{r.kind}</TableCell>
              <TableCell className="text-sm font-semibold text-[#0f3d2e] max-w-[16rem] truncate">{r.title}</TableCell>
              <TableCell className="text-sm text-slate-700 whitespace-nowrap">{r.state}</TableCell>
              <TableCell className="text-sm text-slate-700 whitespace-nowrap">{r.owner}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{r.status}</TableCell>
              <TableCell className={`text-xs whitespace-nowrap ${r.overdue ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                {r.required_by ? formatDate(r.required_by) : "—"}{r.overdue ? " · overdue" : ""}
              </TableCell>
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-white p-2.5 shadow-sm text-xs">
      <p className="font-bold text-[#0f3d2e] mb-1">{label || payload[0].name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-600 flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-bold tabular-nums">{Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}
