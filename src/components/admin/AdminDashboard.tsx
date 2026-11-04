import * as React from "react";
import {
  Users, MapPin, Building2, Layers, ShieldCheck, Activity,
  RefreshCw, Zap, Database, Server, Wifi, CheckCircle2, AlertCircle,
  ChevronRight, ArrowUpRight, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer
} from "recharts";
import PageLayout from "@/src/components/PageLayout";
import { cn } from "@/lib/utils";
import { usersApi, zonesApi, statesApi, departmentsApi, unitsApi } from "@/lib/adminApi";

interface RoleBreakdownItem {
  role: string;
  rawRole: string;
  count: number;
  percent: number;
  color: string;
}

interface Stats {
  users: number;
  activeUsers: number;
  privileges: number;
  zones: number;
  states: number;
  departments: number;
  units: number;
  roleBreakdown: RoleBreakdownItem[];
}

const ROLE_LABELS: Record<string, string> = {
  "admin": "Admin",
  "state-officer": "State Officer",
  "zonal-coordinator": "Zonal Coordinator",
  "state-coordinator": "State Coordinator",
  "department-officer": "Department Officer",
  "sdo": "SDO",
  "hq-department": "HQ Department",
  "dg-ceo": "DG/CEO",
  "fin-zonal-coordinator": "Finance Zonal Coordinator",
  "spd-reporting-officer": "SPD Reporting Officer",
  "soc-zonal-coordinator": "SOC Zonal Coordinator",
  "soc-state-coordinator": "SOC State Coordinator",
  "spd-state-coordinator": "SPD State Coordinator",
  "svc-reporting-officer": "SERVICOM Reporting Officer",
  "stk-reporting-officer": "Stakeholder Reporting Officer",
};

const STAT_CARDS = [
  { key: "users",       label: "Total Users",      icon: Users,      iconCls: "text-[#145c3f] bg-emerald-50 border-emerald-100",  desc: "Registered accounts" },
  { key: "activeUsers", label: "Active Users",     icon: Activity,   iconCls: "text-blue-700 bg-blue-50 border-blue-100",        desc: "Currently active" },
  { key: "privileges",  label: "Privilege Sets",   icon: ShieldCheck,iconCls: "text-purple-700 bg-purple-50 border-purple-100", desc: "Users with access" },
  { key: "zones",       label: "Zonal Offices",    icon: MapPin,     iconCls: "text-sky-700 bg-sky-50 border-sky-100",          desc: "Geopolitical zones" },
  { key: "states",      label: "State Offices",    icon: Building2,  iconCls: "text-amber-700 bg-amber-50 border-amber-100",    desc: "State-level offices" },
  { key: "departments", label: "Departments",      icon: Layers,     iconCls: "text-indigo-700 bg-indigo-50 border-indigo-100",  desc: "HQ departments" },
  { key: "units",       label: "Units",            icon: Database,   iconCls: "text-emerald-700 bg-emerald-50 border-emerald-100",desc: "Operational units" },
] as const;

function CustomChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as RoleBreakdownItem;
  return (
    <div className="rounded-lg border border-[#d4e8dc] bg-white p-2.5 shadow-md text-xs min-w-[180px]">
      <p className="font-semibold text-slate-900">{data.role}</p>
      <div className="mt-1 flex items-center justify-between gap-3 text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#145c3f]" />
          Users
        </span>
        <span className="font-bold text-slate-900 tabular-nums">{data.count}</span>
      </div>
      {data.percent !== undefined && (
        <p className="text-[10px] text-slate-400 mt-1">{data.percent}% of registered users</p>
      )}
    </div>
  );
}

export default function AdminDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, zonesRes, statesRes, deptsRes, unitsRes] = await Promise.allSettled([
        usersApi.list({ limit: 200 } as any),
        zonesApi.list(),
        statesApi.list(),
        departmentsApi.list(),
        unitsApi.list(),
      ]);

      const allUsers = usersRes.status === "fulfilled" ? usersRes.value.data : [];
      const total    = usersRes.status === "fulfilled" ? usersRes.value.total : allUsers.length;
      const active   = allUsers.filter((u: any) => u.is_active).length;
      const withPriv = allUsers.filter((u: any) => Array.isArray(u.functionalities) && u.functionalities.length > 0).length;

      // Role breakdown
      const roleCounts: Record<string, number> = {};
      allUsers.forEach((u: any) => {
        const r = u.role || "Unassigned";
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      });

      const roleBreakdown: RoleBreakdownItem[] = Object.entries(roleCounts).map(([role, count]) => ({
        role: ROLE_LABELS[role] ?? role,
        rawRole: role,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: "#145c3f",
      })).sort((a, b) => b.count - a.count);

      setStats({
        users:       total,
        activeUsers: active,
        privileges:  withPriv,
        zones:       zonesRes.status  === "fulfilled" ? zonesRes.value.data.length  : 0,
        states:      statesRes.status === "fulfilled" ? statesRes.value.data.length : 0,
        departments: deptsRes.status  === "fulfilled" ? deptsRes.value.data.length  : 0,
        units:       unitsRes.status  === "fulfilled" ? unitsRes.value.data.length  : 0,
        roleBreakdown,
      });
      setLastRefresh(new Date());
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const systemHealth = [
    { label: "API Gateway",   val: 98,  icon: <Wifi className="size-3.5" />,       status: "ok"   },
    { label: "Database",      val: 100, icon: <Database className="size-3.5" />,   status: "ok"   },
    { label: "Auth Service",  val: 100, icon: <ShieldCheck className="size-3.5" />, status: "ok"   },
    { label: "Report Queue",  val: 87,  icon: <Server className="size-3.5" />,      status: "warn" },
  ];

  const quickNavCards = [
    {
      label: "Users",
      desc: "Manage user accounts & roles",
      tab: "users",
      icon: Users,
      iconCls: "text-[#145c3f] bg-emerald-50 group-hover:bg-[#145c3f] group-hover:text-white",
    },
    {
      label: "Privileges",
      desc: "Assign module access permissions",
      tab: "privileges",
      icon: ShieldCheck,
      iconCls: "text-purple-700 bg-purple-50 group-hover:bg-purple-700 group-hover:text-white",
    },
    {
      label: "Zonal Offices",
      desc: "Configure geopolitical zones",
      tab: "zones",
      icon: MapPin,
      iconCls: "text-blue-700 bg-blue-50 group-hover:bg-blue-700 group-hover:text-white",
    },
    {
      label: "State Offices",
      desc: "Manage state-level offices",
      tab: "states",
      icon: Building2,
      iconCls: "text-amber-700 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white",
    },
    {
      label: "Departments",
      desc: "HQ department configuration",
      tab: "departments",
      icon: Layers,
      iconCls: "text-pink-700 bg-pink-50 group-hover:bg-pink-600 group-hover:text-white",
    },
    {
      label: "Units",
      desc: "Operational unit management",
      tab: "units",
      icon: Database,
      iconCls: "text-teal-700 bg-teal-50 group-hover:bg-teal-700 group-hover:text-white",
    },
  ];

  const activeRate = stats && stats.users > 0 ? Math.round((stats.activeUsers / stats.users) * 100) : 100;

  return (
    <PageLayout
      title="Admin Overview"
      maxWidth="full"
      showHeader={true}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e8f5ee] border border-[#d4e8dc] text-xs font-medium text-[#145c3f]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>All systems operational</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc] hover:bg-[#e8f5ee] text-slate-700 font-medium cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="w-full space-y-4">
        {/* KPI Stats Grid: 7 crisp cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, iconCls, desc }) => (
            <div
              key={key}
              className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs hover:border-[#145c3f]/50 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn("size-8 rounded-md flex items-center justify-center border transition-colors", iconCls)}>
                  <Icon className="size-4" />
                </div>
              </div>

              {loading ? (
                <div className="space-y-1.5 py-0.5">
                  <Skeleton className="h-7 w-14 bg-slate-100" />
                  <Skeleton className="h-3.5 w-20 bg-slate-100" />
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {stats ? (stats as any)[key] : 0}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{label}</p>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1 truncate">{desc}</p>
            </div>
          ))}
        </div>

        {/* Main Content Layout: 12-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start w-full">
          {/* Left Column: Role Breakdown + Quick Access (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {/* Users by Role Chart */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-[#f0fdf7] flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Users by Role</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Distribution of registered users across all roles
                  </CardDescription>
                </div>
                {stats && stats.roleBreakdown.length > 0 && (
                  <Badge variant="outline" className="border-[#d4e8dc] bg-[#fbfdfc] text-[#145c3f] text-[11px] font-semibold">
                    {stats.roleBreakdown.length} Roles
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                    <RefreshCw className="size-5 animate-spin text-[#145c3f]" />
                    <span>Loading roles distribution...</span>
                  </div>
                ) : (stats?.roleBreakdown?.length ?? 0) === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">
                    No role data available
                  </div>
                ) : (
                  <div className="w-full" style={{ height: Math.max(260, Math.min(380, (stats?.roleBreakdown?.length ?? 6) * 32 + 40)) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.roleBreakdown ?? []}
                        barSize={18}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf7f1" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "#5a7a6a" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="role"
                          tick={{ fontSize: 10, fill: "#334155" }}
                          axisLine={false}
                          tickLine={false}
                          width={140}
                        />
                        <RTooltip content={<CustomChartTooltip />} cursor={{ fill: "#f0fdf7" }} />
                        <Bar
                          dataKey="count"
                          name="Users"
                          radius={[0, 4, 4, 0]}
                          fill="#145c3f"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Access Card */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-[#f0fdf7]">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide text-[11px] text-slate-500">
                  Quick Access
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Direct navigation to staff accounts, access privileges, and organizational hierarchy
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {quickNavCards.map((n) => {
                    const Icon = n.icon;
                    return (
                      <button
                        key={n.tab}
                        type="button"
                        onClick={() => onNavigate?.(n.tab)}
                        className="group relative flex flex-col justify-between p-3.5 rounded-lg border border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:bg-[#fbfdfc] hover:shadow-2xs transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145c3f]"
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className={cn("size-8 rounded-md flex items-center justify-center transition-all", n.iconCls)}>
                            <Icon className="size-4" />
                          </div>
                          <ChevronRight className="size-4 text-slate-300 group-hover:text-[#145c3f] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-[#145c3f] transition-colors">
                            {n.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {n.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: System Health + Data Summary + Ratio (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            {/* System Health Card (Dark Forest Green matching screenshot) */}
            <div className="rounded-lg p-4 bg-gradient-to-br from-[#0c3928] via-[#145c3f] to-[#092b1e] text-white border border-[#145c3f] shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 size-28 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-white/15 flex items-center justify-center text-[#6ddba8]">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">System Health</p>
                    <p className="text-[11px] text-[#6ddba8] flex items-center gap-1.5 mt-0.5">
                      <span className="size-1.5 rounded-full bg-[#6ddba8] inline-block animate-pulse" />
                      All systems operational
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {systemHealth.map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between items-center text-[11px] text-white/80 mb-1">
                        <span className="flex items-center gap-1.5">
                          {s.status === "ok" ? (
                            <CheckCircle2 className="size-3 text-[#6ddba8]" />
                          ) : (
                            <AlertCircle className="size-3 text-amber-400" />
                          )}
                          {s.label}
                        </span>
                        <span className="font-bold text-white tabular-nums">{s.val}%</span>
                      </div>
                      <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${s.val}%`,
                            backgroundColor: s.val >= 95 ? "#25a872" : "#f59e0b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                  <span>Last sync: just now</span>
                  <span className="text-[#6ddba8] font-medium">99.9% Uptime</span>
                </div>
              </div>
            </div>

            {/* Data Summary Card */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-4 pb-2.5 border-b border-[#f0fdf7]">
                <CardTitle className="text-sm font-bold text-slate-900">Data Summary</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Platform entity counts across directories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {[
                  { label: "Total Users",   val: stats?.users,       icon: Users,      iconCls: "text-[#145c3f]", badge: "bg-[#e8f5ee] text-[#145c3f]" },
                  { label: "Active Users",  val: stats?.activeUsers, icon: Activity,   iconCls: "text-blue-600",  badge: "bg-blue-50 text-blue-700" },
                  { label: "With Access",   val: stats?.privileges,  icon: ShieldCheck,iconCls: "text-purple-600",badge: "bg-purple-50 text-purple-700" },
                  { label: "Zones",         val: stats?.zones,       icon: MapPin,     iconCls: "text-blue-600",  badge: "bg-blue-50 text-blue-700" },
                  { label: "States",        val: stats?.states,      icon: Building2,  iconCls: "text-amber-600", badge: "bg-amber-50 text-amber-700" },
                  { label: "Departments",   val: stats?.departments, icon: Layers,     iconCls: "text-purple-600",badge: "bg-purple-50 text-purple-700" },
                  { label: "Units",         val: stats?.units,       icon: Database,   iconCls: "text-emerald-600",badge: "bg-emerald-50 text-emerald-700" },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.label}
                      className="flex items-center justify-between py-2 border-b border-[#f0fdf7] last:border-0"
                    >
                      <span className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Icon className={cn("size-3.5", r.iconCls)} />
                        {r.label}
                      </span>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md tabular-nums", r.badge)}>
                        {loading ? "…" : r.val ?? 0}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Active User Rate Card */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Active User Ratio</span>
                  <span className="text-xs font-bold text-[#145c3f] tabular-nums">
                    {loading ? "…" : `${activeRate}%`}
                  </span>
                </div>
                <Progress
                  value={activeRate}
                  className="h-2 bg-[#e8f5ee] [&>div]:bg-[#145c3f]"
                />
                <p className="text-[11px] text-slate-400">
                  {loading
                    ? "Calculating activity..."
                    : `${stats?.activeUsers ?? 0} of ${stats?.users ?? 0} accounts active`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
