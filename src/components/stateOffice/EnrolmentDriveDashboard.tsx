import * as React from "react";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enrolmentDrivesApi as api, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { formatCount, monthLabel } from "./constants";

const BRAND = "#145c3f";
const PALETTE = ["#145c3f", "#0ea5e9", "#25a872", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

export interface EnrolmentDriveDashboardProps {
  embedded?: boolean;
  onBack?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onRecordAction?: (stateCode?: string, issue?: string) => void;
  onViewReport?: (reportId: string) => void;
}

type TabKey = "overview" | "states" | "followups";

function scopeLabel(role: string, lockState: boolean, lockZone: boolean) {
  if (lockState || isDeptStateCoordinator(role)) return "Assigned state";
  if (lockZone || isDeptZonalCoordinator(role) || /zonal/i.test(role)) return "Assigned zone";
  return "National";
}

function pct(part: number, whole: number) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function emptySummary() {
  return {
    planned: 0,
    recorded: 0,
    conducted: 0,
    reached: 0,
    leads: 0,
    enrolled: 0,
    offices_total: 0,
    offices_reporting: 0,
    offices_needing_follow_up: 0,
    conversion_rate: null as number | null,
    lead_rate: null as number | null,
  };
}

export default function EnrolmentDriveDashboard({
  embedded = false,
  onBack,
  defaultZoneId,
  defaultStateId,
  onRecordAction,
}: EnrolmentDriveDashboardProps) {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = user?.role || "";
  const lockZone = !!(defaultZoneId && (isDeptZonalCoordinator(role) || isDeptStateCoordinator(role) || /zonal/i.test(role)));
  const lockState = !!(defaultStateId && isDeptStateCoordinator(role));

  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [tab, setTab] = React.useState<TabKey>("overview");

  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any | null>(null);

  React.useEffect(() => {
    stockApi.getZones().then((res) => setZones(res.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    const zoneArg = lockZone ? (defaultZoneId ?? undefined) : filterZone === "all" ? undefined : filterZone;
    stockApi.getStates(zoneArg).then((res) => setStates(res.data || [])).catch(() => setStates([]));
  }, [filterZone, lockZone, defaultZoneId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = { year };
      if (month !== "all") filters.month = month;
      const zone = lockZone ? defaultZoneId : filterZone !== "all" ? filterZone : null;
      const state = lockState ? defaultStateId : filterState !== "all" ? filterState : null;
      if (zone) filters.zonal_code = String(zone);
      if (state) filters.state_code = String(state);
      const res = await api.analytics(filters);
      setData(res.data || null);
    } catch (error: any) {
      setData(null);
      toast.error(error?.message || "Could not load enrolment drive analytics");
    } finally {
      setLoading(false);
    }
  }, [year, month, filterZone, filterState, lockZone, lockState, defaultZoneId, defaultStateId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary || emptySummary();
  const statesRows: any[] = data?.states || [];
  const zoneRows: any[] = data?.zones || [];
  const byActivity: any[] = data?.by_activity || [];
  const byLocation: any[] = data?.by_location || [];
  const byAudience: any[] = (data?.by_audience || []).slice(0, 8);
  const programmes: any[] = (data?.programmes || []).slice(0, 6);
  const exceptions: any[] = data?.exceptions || [];
  const followUps: any[] = data?.follow_ups || [];
  const trend = (data?.enrolment_trend || []).map((row: any) => ({
    label: `${monthLabel(Number(row.reporting_month)).slice(0, 3)} ${row.reporting_year}`,
    enrolled: Number(row.enrolled || 0),
  }));

  const reportingCoverage = pct(summary.offices_reporting || 0, summary.offices_total || 0);
  const showZoneFilter = !lockZone && !lockState;
  const showStateFilter = !lockState;

  const kpis = [
    {
      label: "Activities",
      value: formatCount(summary.recorded || 0),
      sub: `${formatCount(summary.conducted || 0)} completed · ${formatCount(summary.planned || 0)} planned`,
      accent: "border-l-[#145c3f]",
    },
    {
      label: "Audience reached",
      value: formatCount(summary.reached || 0),
      sub: summary.lead_rate != null ? `${summary.lead_rate}% became leads` : "From recorded drives",
      accent: "border-l-[#0ea5e9]",
      icon: <Users className="w-4 h-4 text-[#0ea5e9]" />,
    },
    {
      label: "Leads → enrolled",
      value: formatCount(summary.enrolled || 0),
      sub: summary.conversion_rate != null
        ? `${formatCount(summary.leads || 0)} leads · ${summary.conversion_rate}% conversion`
        : `${formatCount(summary.leads || 0)} leads`,
      accent: "border-l-[#25a872]",
      icon: <CheckCircle2 className="w-4 h-4 text-[#25a872]" />,
    },
    {
      label: "Offices reporting",
      value: `${summary.offices_reporting || 0}/${summary.offices_total || 0}`,
      sub: reportingCoverage != null
        ? `${reportingCoverage}% coverage · ${summary.offices_needing_follow_up || 0} need follow-up`
        : `${summary.offices_needing_follow_up || 0} need follow-up`,
      accent: (summary.offices_needing_follow_up || 0) > 0 ? "border-l-[#ef4444]" : "border-l-[#145c3f]",
      icon: (summary.offices_needing_follow_up || 0) > 0
        ? <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
        : <CheckCircle2 className="w-4 h-4 text-[#145c3f]" />,
    },
  ];

  const comparisonData = zoneRows.length > 1
    ? zoneRows.map((z) => ({
        name: z.description || z.zonal_code,
        enrolled: Number(z.enrolled || 0),
        leads: Number(z.leads || 0),
        conducted: Number(z.conducted || 0),
        rate: z.lead_rate ?? 0,
      }))
    : statesRows
        .slice()
        .sort((a, b) => Number(b.enrolled || 0) - Number(a.enrolled || 0))
        .slice(0, 12)
        .map((s) => ({
          name: s.description || s.code,
          enrolled: Number(s.enrolled || 0),
          leads: Number(s.leads || 0),
          conducted: Number(s.conducted || 0),
          rate: s.lead_rate ?? 0,
        }));

  return (
    <div className={`flex flex-col h-full bg-[#f4f7f5] ${embedded ? "" : ""}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-[#0f3d2e]" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                Enrolment Drives Dashboard
              </h1>
              <p className="text-xs text-slate-500 truncate">
                Live reporting for {scopeLabel(role, lockState, lockZone).toLowerCase()} scope
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
            className="gap-1.5 border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          {/* Filters */}
          <div className="bg-white border border-[#d4e8dc] rounded-sm p-3.5">
            <div className={`grid gap-3 grid-cols-2 ${showZoneFilter ? "md:grid-cols-4" : showStateFilter ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <FilterField label="Year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger size="sm" displayValue={year}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Month">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger size="sm" displayValue={month === "all" ? "All months" : monthLabel(Number(month))}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{monthLabel(i + 1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              {showZoneFilter && (
                <FilterField label="Zone">
                  <Select
                    value={filterZone}
                    onValueChange={(v) => {
                      setFilterZone(v);
                      setFilterState("all");
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={
                        filterZone === "all"
                          ? "All zones"
                          : zones.find((z) => String(z.zonal_code || z.id) === String(filterZone))?.description || filterZone
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.zonal_code || z.id} value={String(z.zonal_code || z.id)}>
                          {z.description || z.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {showStateFilter && (
                <FilterField label="State">
                  <Select value={filterState} onValueChange={setFilterState} disabled={lockState}>
                    <SelectTrigger
                      size="sm"
                      displayValue={
                        lockState
                          ? "Assigned state"
                          : filterState === "all"
                            ? "All states"
                            : states.find((s) => String(s.code || s.id) === String(filterState))?.description || filterState
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s.code || s.id} value={String(s.code || s.id)}>
                          {s.description || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#d4e8dc]">
            {([
              { id: "overview", label: "Overview" },
              { id: "states", label: zoneRows.length > 1 ? "States & zones" : "State register" },
              { id: "followups", label: `Follow-ups${exceptions.length || followUps.length ? ` (${exceptions.length || followUps.length})` : ""}` },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                  tab === item.id
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-24 text-slate-500 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
            </div>
          ) : (
            <>
              {/* KPIs — always visible */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-sm border border-[#d4e8dc] border-l-4 ${kpi.accent} bg-white p-3.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                      {kpi.icon}
                    </div>
                    <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{kpi.value}</p>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {tab === "overview" && (
                <div className="space-y-4">
                  {/* Funnel */}
                  <div className="bg-white border border-[#d4e8dc] rounded-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold text-[#0f3d2e]">Enrolment funnel</h2>
                      <span className="text-[11px] text-slate-500">
                        Yield{" "}
                        <strong className="text-[#0f3d2e]">
                          {pct(summary.enrolled || 0, summary.reached || 0) ?? "—"}%
                        </strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FunnelStep
                        step="1"
                        title="Audience reached"
                        value={summary.reached || 0}
                        hint="People engaged in drives"
                        tone="green"
                      />
                      <FunnelStep
                        step="2"
                        title="Leads generated"
                        value={summary.leads || 0}
                        hint={summary.lead_rate != null ? `${summary.lead_rate}% of audience` : "Interest captured"}
                        tone="blue"
                      />
                      <FunnelStep
                        step="3"
                        title="Beneficiaries enrolled"
                        value={summary.enrolled || 0}
                        hint={summary.conversion_rate != null ? `${summary.conversion_rate}% of leads` : "Linked enrolments"}
                        tone="emerald"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Trend */}
                    <Panel title="Enrolment trend" subtitle="Linked enrolments by reporting month">
                      <div className="h-[260px]">
                        {trend.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                              <Tooltip content={<ChartTooltip />} />
                              <Line type="monotone" dataKey="enrolled" name="Enrolled" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyChart message="No linked enrolment trend for this period" />
                        )}
                      </div>
                    </Panel>

                    {/* Comparison */}
                    <Panel
                      title={zoneRows.length > 1 ? "Lead rate by zone" : "Enrolments by state"}
                      subtitle={zoneRows.length > 1 ? "Leads ÷ audience reached" : "Top states by linked enrolments"}
                    >
                      <div className="h-[260px]">
                        {comparisonData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -10, bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-25} textAnchor="end" interval={0} height={50} />
                              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                              <Tooltip content={<ChartTooltip />} />
                              {zoneRows.length > 1 ? (
                                <Bar dataKey="rate" name="Lead rate %" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                                  {comparisonData.map((row, i) => (
                                    <Cell key={row.name} fill={row.rate >= 30 ? BRAND : PALETTE[i % PALETTE.length]} />
                                  ))}
                                </Bar>
                              ) : (
                                <Bar dataKey="enrolled" name="Enrolled" fill={BRAND} radius={[4, 4, 0, 0]} />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyChart message="No state or zone activity for this period" />
                        )}
                      </div>
                    </Panel>

                    {/* Activity mix */}
                    <Panel title="By activity type" subtitle="Activities and linked enrolments">
                      <div className="h-[260px]">
                        {byActivity.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byActivity.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="enrolled" name="Enrolled" fill={BRAND} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyChart message="No activity categories recorded" />
                        )}
                      </div>
                    </Panel>

                    {/* Location / audience */}
                    <Panel title="Location mix" subtitle="Share of recorded activities">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[260px]">
                        <div className="min-h-[180px]">
                          {byLocation.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={byLocation}
                                  dataKey="percentage"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={48}
                                  outerRadius={78}
                                  paddingAngle={2}
                                >
                                  {byLocation.map((entry, i) => (
                                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip unit="%" />} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <EmptyChart message="No location data" />
                          )}
                        </div>
                        <div className="space-y-2 overflow-y-auto pr-1">
                          {(byLocation.length ? byLocation : byAudience).map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                <span className="truncate text-slate-700">{item.name}</span>
                              </div>
                              <span className="font-bold tabular-nums text-[#0f3d2e] shrink-0">
                                {item.percentage != null ? `${item.percentage}%` : formatCount(item.count || 0)}
                              </span>
                            </div>
                          ))}
                          {!byLocation.length && !byAudience.length && (
                            <p className="text-xs text-slate-400 py-8 text-center">No breakdown available</p>
                          )}
                        </div>
                      </div>
                    </Panel>
                  </div>

                  {programmes.length > 0 && (
                    <Panel title="Programme contribution" subtitle="Linked enrolments attributed via selected programmes">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {programmes.map((p, i) => (
                          <div key={p.name} className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-[#0f3d2e] truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-500">{p.pct}%</span>
                            </div>
                            <p className="text-lg font-bold text-[#145c3f] tabular-nums">{formatCount(p.enrolled || 0)}</p>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, p.pct || 0)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}
                </div>
              )}

              {tab === "states" && (
                <div className="bg-white border border-[#d4e8dc] rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#d4e8dc] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#0f3d2e]">State performance</h2>
                    <span className="text-[11px] text-slate-500">{statesRows.length} offices</span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f4f7f5]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">State</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Zone</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Reports</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Completed</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Reached</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Leads</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Enrolled</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Conversion</TableHead>
                          {onRecordAction && (
                            <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statesRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={onRecordAction ? 9 : 8} className="text-center text-sm text-slate-500 py-10">
                              No state activity for the selected filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          statesRows
                            .slice()
                            .sort((a, b) => Number(b.enrolled || 0) - Number(a.enrolled || 0))
                            .map((st) => (
                              <TableRow key={st.code} className="hover:bg-[#f8fdfb]">
                                <TableCell className="text-sm font-semibold text-[#0f3d2e]">{st.description || st.code}</TableCell>
                                <TableCell className="text-xs text-slate-600">{st.zone_name || st.zonal_code || "—"}</TableCell>
                                <TableCell className="text-xs">
                                  {st.reports
                                    ? `${st.finalised || 0}/${st.reports} submitted`
                                    : <span className="text-rose-600 font-medium">None</span>}
                                </TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{st.conducted ?? 0}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatCount(st.reached)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatCount(st.leads)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums font-bold text-[#145c3f]">{formatCount(st.enrolled)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">
                                  {st.conversion_rate != null ? `${st.conversion_rate}%` : "—"}
                                </TableCell>
                                {onRecordAction && (
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                                      onClick={() => onRecordAction(st.code, "Review enrolment drive performance")}
                                    >
                                      Follow-up
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {tab === "followups" && (
                <div className="space-y-4">
                  <div className="bg-white border border-[#d4e8dc] rounded-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#d4e8dc]">
                      <h2 className="text-sm font-bold text-[#0f3d2e]">Offices needing attention</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Derived from missing/late reports, deferred activities, or low conversion
                      </p>
                    </div>
                    {exceptions.length === 0 ? (
                      <p className="text-sm text-slate-500 px-4 py-10 text-center">No exceptions for this period</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f4f7f5]">
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Office</TableHead>
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Zone</TableHead>
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Issue</TableHead>
                              {onRecordAction && (
                                <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exceptions.map((ex) => (
                              <TableRow key={ex.state_code}>
                                <TableCell className="text-sm font-semibold text-[#0f3d2e]">{ex.office}</TableCell>
                                <TableCell className="text-xs text-slate-600">{ex.zone || "—"}</TableCell>
                                <TableCell className="text-xs text-slate-700">{ex.issue}</TableCell>
                                {onRecordAction && (
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                                      onClick={() => onRecordAction(ex.state_code, ex.issue)}
                                    >
                                      Record action
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-[#d4e8dc] rounded-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#d4e8dc]">
                      <h2 className="text-sm font-bold text-[#0f3d2e]">Logged follow-up actions</h2>
                    </div>
                    {followUps.length === 0 ? (
                      <p className="text-sm text-slate-500 px-4 py-10 text-center">No follow-up actions logged for this period</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f4f7f5]">
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Issue</TableHead>
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Owner</TableHead>
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Deadline</TableHead>
                              <TableHead className="text-xs font-bold text-[#0f3d2e]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {followUps.map((action) => (
                              <TableRow key={action.reference_id}>
                                <TableCell className="text-sm text-slate-800 max-w-md">
                                  <p className="font-medium line-clamp-2">{action.issue}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{action.agreed_action}</p>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600">{action.accountable_owner || "—"}</TableCell>
                                <TableCell className="text-xs tabular-nums">{action.deadline || "—"}</TableCell>
                                <TableCell className="text-xs font-semibold">{action.status || "Open"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#d4e8dc] rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d4e8dc]">
        <h2 className="text-sm font-bold text-[#0f3d2e]">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FunnelStep({
  step,
  title,
  value,
  hint,
  tone,
}: {
  step: string;
  title: string;
  value: number;
  hint: string;
  tone: "green" | "blue" | "emerald";
}) {
  const tones = {
    green: "bg-[#f8fdfb] border-[#d4e8dc] text-[#145c3f]",
    blue: "bg-[#f0f9ff] border-sky-100 text-sky-700",
    emerald: "bg-[#f0fdf4] border-emerald-100 text-emerald-700",
  }[tone];
  return (
    <div className={`rounded-sm border p-3.5 ${tones}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Step {step}</p>
      <p className="text-xs font-bold text-slate-800 mt-0.5">{title}</p>
      <p className="text-2xl font-black tabular-nums mt-1">{formatCount(value)}</p>
      <p className="text-[11px] opacity-80 mt-1">{hint}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center px-4">{message}</div>;
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-white p-2.5 shadow-sm text-xs">
      <p className="font-bold text-[#0f3d2e] mb-1">{label || payload[0].name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-600 flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-bold tabular-nums">
            {Number(p.value).toLocaleString()}{unit ? ` ${unit}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}
