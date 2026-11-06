import * as React from "react";
import { useSelector } from "react-redux";
import { ArrowRightLeft, Baby, Building2, Loader2, RefreshCw, UserPlus, Users } from "lucide-react";
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
import { beneficiaryDashboardApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { formatCount, monthLabel } from "./constants";

const BRAND = "#145c3f";
const PALETTE = ["#145c3f", "#0ea5e9", "#25a872", "#f59e0b", "#64748b", "#0891b2", "#0f766e"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  additional_dependant: UserPlus,
  extra_dependant: Users,
  hcp_change: ArrowRightLeft,
  hmo_change: ArrowRightLeft,
  mda_hmo_selection: Building2,
};

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
  sc: { title: "State Coordinator", blurb: "State-level beneficiary requests by activity type.", queueTitle: "Coordinator attention queue" },
  zd: { title: "Zonal Director", blurb: "Compare states and coordinate support across the zone.", queueTitle: "Zonal coordination queue" },
  sdo: { title: "SDO / HQ", blurb: "National and zonal patterns, volumes and escalations.", queueTitle: "Management attention" },
  dg: { title: "Director-General", blurb: "National demand, major patterns and management decisions.", queueTitle: "Executive attention required" },
};

export default function BeneficiaryDashboard({
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
  const [period, setPeriod] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(resolvedZoneCode ?? "all");
  const [filterState, setFilterState] = React.useState(resolvedStateCode ?? "all");
  const [activityType, setActivityType] = React.useState("all");
  const [programme, setProgramme] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  // Change-specific filters — shown only for change activities.
  const [changeType, setChangeType] = React.useState("all");
  const [reason, setReason] = React.useState("all");
  const [currentProvider, setCurrentProvider] = React.useState("all");
  const [newProvider, setNewProvider] = React.useState("all");

  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any | null>(null);
  const [face, setFace] = React.useState<"overview" | "analysis">("overview");

  const isChangeView = activityType === "hcp_change" || activityType === "hmo_change";

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
      if (activityType !== "all") filters.activity_type = activityType;
      if (programme !== "all") filters.programme = programme;
      if (status !== "all") filters.status = status;
      if (isChangeView) {
        if (changeType !== "all") filters.change_type = changeType;
        if (reason !== "all") filters.reason = reason;
        if (currentProvider !== "all") filters.current_provider = currentProvider;
        if (newProvider !== "all") filters.new_provider = newProvider;
      }
      const res = await beneficiaryDashboardApi.dashboard(filters);
      setData(res.data || null);
    } catch (err: any) {
      setData(null);
      toast.error(err?.message || "Could not load beneficiary dashboard");
    } finally {
      setLoading(false);
    }
  }, [dashRole, year, period, filterZone, filterState, activityType, programme, status,
    isChangeView, changeType, reason, currentProvider, newProvider,
    lockState, lockZone, resolvedStateCode, resolvedZoneCode]);

  React.useEffect(() => { void load(); }, [load]);

  if (!dashRole || !meta) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-2 rounded-sm border border-[#d4e8dc] bg-white p-8">
          <h2 className="text-lg font-bold text-[#0f3d2e]">Dashboard not available</h2>
          <p className="text-sm text-slate-500">
            The Beneficiary Management dashboard is limited to State Coordinator, Zonal Director, SDO and DG.
          </p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const byActivity: any[] = data?.by_activity || [];
  const byState: any[] = data?.by_state || [];
  const byZone: any[] = data?.by_zone || [];
  const byProgramme: any[] = data?.by_programme || [];
  const byReason: any[] = data?.by_reason || [];
  const byStatus: any[] = data?.by_status || [];
  const newProviders: any[] = data?.new_providers || [];
  const trend: any[] = data?.trend || [];
  const queue: any[] = data?.queue || [];
  const catalogue = data?.catalogue || {};
  const activityOptions = byActivity.map((a) => ({ key: a.key, label: a.label }));
  const programmeOptions: string[] = catalogue.programmes || byProgramme.map((p: any) => p.name);
  const statusOptions: string[] = catalogue.statuses || [];
  const reasonOptions: string[] = catalogue.reasons || byReason.map((r: any) => r.name);
  const providerOptions: string[] = catalogue.providers || [];

  const periodValue = period === "all" ? `y-${year}` : period.startsWith("q") ? `${year}-${period}` : `${year}-m${period}`;

  return (
    <ScrollArea className="flex-1">
      <div className="w-full p-3 sm:p-4 space-y-3.5">
        <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <FilterField label="Reporting Period">
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

            <FilterField label="Activity Type">
              <Select value={activityType} onValueChange={(v) => { setActivityType(v); setChangeType("all"); setReason("all"); setCurrentProvider("all"); setNewProvider("all"); }}>
                <SelectTrigger displayValue={activityType === "all" ? "All Activities" : activityOptions.find((a) => a.key === activityType)?.label || activityType}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  {activityOptions.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Programme">
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger displayValue={programme === "all" ? "All Applicable" : programme}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applicable</SelectItem>
                  {programmeOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>

            {showZoneFilter && (
              <FilterField label="Zone">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                  <SelectTrigger displayValue={filterZone === "all" ? "All Zones" : zones.find((z) => String(z.zonal_code || z.id) === String(filterZone))?.description || filterZone}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map((z) => <SelectItem key={z.zonal_code || z.id} value={String(z.zonal_code || z.id)}>{z.description || z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {showStateFilter && (
              <FilterField label="State">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger displayValue={filterState === "all" ? "All States" : states.find((x) => String(x.code || x.id) === String(filterState))?.description || filterState}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
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

            <FilterField label="Request Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger displayValue={status === "all" ? "All Statuses" : status}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          {isChangeView && (
            <div className="mt-3 pt-3 border-t border-[#e8f3ec] grid gap-3 grid-cols-2 md:grid-cols-4">
              <FilterField label="Change Type">
                <Select value={changeType} onValueChange={setChangeType}>
                  <SelectTrigger displayValue={changeType === "all" ? "All Change Types" : changeType.toUpperCase()}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Change Types</SelectItem>
                    <SelectItem value="hcp">HCP</SelectItem>
                    <SelectItem value="hmo">HMO</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Reason for Change">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger displayValue={reason === "all" ? "All Reasons" : reason}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    {reasonOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Current HCP / HMO">
                <Select value={currentProvider} onValueChange={setCurrentProvider}>
                  <SelectTrigger displayValue={currentProvider === "all" ? "All Providers" : currentProvider}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providerOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Requested New HCP / HMO">
                <Select value={newProvider} onValueChange={setNewProvider}>
                  <SelectTrigger displayValue={newProvider === "all" ? "All Providers" : newProvider}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providerOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          )}
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
                <Panel title="Requests by programme" subtitle="Programme recorded on the request">
                  <RankList items={byProgramme.slice(0, 10).map((p) => ({ name: p.name, value: p.value }))} empty="No programme recorded" />
                </Panel>
                <Panel title="Requests by status">
                  <RankList items={byStatus.slice(0, 10).map((x) => ({ name: x.name, value: x.value }))} empty="No status data" />
                </Panel>
                <Panel title="Change-of-provider reasons" subtitle="Reason categories on HCP/HMO change requests">
                  <RankList items={byReason.slice(0, 10).map((r) => ({ name: r.name, value: r.value }))} empty="No provider-change reasons recorded" />
                </Panel>
                <Panel title="Provider movement" subtitle="Most requested current → new providers">
                  <RankList items={newProviders.slice(0, 8).map((p) => ({ name: `→ ${p.name}`, value: p.value }))} empty="No provider movement recorded" />
                </Panel>
                <Panel title="Monthly request trend" className="xl:col-span-2">
                  <ChartFrame>
                    {trend.some((t) => t.activities) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="activities" name="Requests" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart message="No activity trend for this period" />}
                  </ChartFrame>
                </Panel>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {byActivity.map((a) => {
                const Icon = ACTIVITY_ICONS[a.key] || Baby;
                return (
                  <div key={a.key} className="rounded-sm border border-[#d4e8dc] border-l-4 border-l-[#145c3f] bg-white p-3.5 shadow-[0_1px_0_rgba(15,61,46,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{a.label}</p>
                      <Icon className="w-4 h-4 text-[#1a7a52] shrink-0" />
                    </div>
                    <p className="text-2xl font-black text-[#0f3d2e] tabular-nums mt-1.5 tracking-tight">{formatCount(a.value)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {s.total ? `${Math.round((a.value / s.total) * 100)}% of requests` : "in selected period"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              {(dashRole === "sc") && (
                <>
                  <Panel title="Request mix" subtitle="Requests by activity type" className="xl:col-span-3">
                    <ChartFrame>
                      {byActivity.some((a) => a.value) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byActivity} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="value" name="Requests" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No requests recorded for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="Monthly request trend" className="xl:col-span-2">
                    <ChartFrame>
                      {trend.some((t) => t.activities) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="activities" name="Requests" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No monthly activity to chart" />}
                    </ChartFrame>
                  </Panel>
                </>
              )}

              {dashRole === "zd" && (
                <>
                  <Panel title="Requests by state" className="xl:col-span-3">
                    <ChartFrame>
                      {byState.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byState} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="state_name" width={130} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="activities" name="Requests" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No state activity for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="Change-of-provider reasons" className="xl:col-span-2">
                    <RankList items={byReason.slice(0, 8).map((r) => ({ name: r.name, value: r.value }))} empty="No provider-change reasons recorded" />
                  </Panel>
                </>
              )}

              {(dashRole === "sdo" || dashRole === "dg") && (
                <>
                  <Panel title="Requests by zone" className="xl:col-span-3">
                    <ChartFrame>
                      {byZone.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={byZone} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="value" name="Requests" fill={BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="No zone activity for this period" />}
                    </ChartFrame>
                  </Panel>
                  <Panel title="Requests by programme" subtitle="Programme recorded on the request" className="xl:col-span-2">
                    <RankList items={byProgramme.slice(0, 8).map((p) => ({ name: p.name, value: p.value }))} empty="No programme recorded" />
                  </Panel>
                </>
              )}
            </div>

            <Panel title={meta.queueTitle} subtitle={meta.blurb}>
              <SimpleTable
                headers={dashRole === "sdo" ? ["Management attention", "Evidence / scale", "Suggested action", "Lead / referral"] : ["Issue / signal", "Count", "Suggested action"]}
                rows={dashRole === "sdo"
                  ? queue.map((x) => [x.issue, x.count ?? "—", x.action, "Responsible unit"])
                  : queue.map((x) => [x.issue, x.count ?? "—", x.action])}
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
