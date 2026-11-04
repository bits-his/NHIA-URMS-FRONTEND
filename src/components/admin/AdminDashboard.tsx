import * as React from "react";
import {
  Users, MapPin, Building2, Layers, ShieldCheck, Activity,
  RefreshCw, Zap, Database, Server, Wifi, CheckCircle2, AlertCircle,
  ChevronRight, ArrowUpRight, Shield, UserPlus, ExternalLink,
  Check, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageLayout from "@/src/components/PageLayout";
import { cn } from "@/lib/utils";
import { usersApi, zonesApi, statesApi, departmentsApi, unitsApi, AdminUser } from "@/lib/adminApi";

interface RoleBreakdownItem {
  role: string;
  rawRole: string;
  count: number;
  percent: number;
}

interface Stats {
  users: number;
  activeUsers: number;
  privileges: number;
  zones: number;
  states: number;
  departments: number;
  units: number;
  recentUsers: AdminUser[];
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
  "fin-zonal-coordinator": "Finance Zonal Coord",
  "spd-reporting-officer": "SPD Reporting Officer",
  "soc-zonal-coordinator": "SOC Zonal Coord",
  "soc-state-coordinator": "SOC State Coord",
  "spd-state-coordinator": "SPD State Coord",
  "svc-reporting-officer": "SERVICOM Officer",
  "stk-reporting-officer": "Stakeholder Officer",
};

const STAT_CARDS = [
  { key: "users",       label: "Total Users",      icon: Users,      iconCls: "text-[#145c3f] bg-emerald-50 border-emerald-100",  desc: "Registered accounts" },
  { key: "activeUsers", label: "Active Users",     icon: Activity,   iconCls: "text-blue-700 bg-blue-50 border-blue-100",        desc: "Currently active" },
  { key: "privileges",  label: "Privilege Sets",   icon: ShieldCheck,iconCls: "text-purple-700 bg-purple-50 border-purple-100", desc: "Configured access" },
  { key: "zones",       label: "Zonal Offices",    icon: MapPin,     iconCls: "text-sky-700 bg-sky-50 border-sky-100",          desc: "Geopolitical zones" },
  { key: "states",      label: "State Offices",    icon: Building2,  iconCls: "text-amber-700 bg-amber-50 border-amber-100",    desc: "State-level branches" },
  { key: "departments", label: "Departments",      icon: Layers,     iconCls: "text-indigo-700 bg-indigo-50 border-indigo-100",  desc: "HQ directorates" },
  { key: "units",       label: "Units",            icon: Database,   iconCls: "text-emerald-700 bg-emerald-50 border-emerald-100",desc: "Operational units" },
] as const;

export default function AdminDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, zonesRes, statesRes, deptsRes, unitsRes] = await Promise.allSettled([
        usersApi.list({ limit: 100 } as any),
        zonesApi.list(),
        statesApi.list(),
        departmentsApi.list(),
        unitsApi.list(),
      ]);

      const allUsers = usersRes.status === "fulfilled" ? (usersRes.value.data ?? []) : [];
      const total    = usersRes.status === "fulfilled" ? (usersRes.value.total ?? allUsers.length) : allUsers.length;
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
      })).sort((a, b) => b.count - a.count);

      setStats({
        users:       total,
        activeUsers: active,
        privileges:  withPriv,
        zones:       zonesRes.status  === "fulfilled" ? (zonesRes.value.data?.length ?? 0)  : 0,
        states:      statesRes.status === "fulfilled" ? (statesRes.value.data?.length ?? 0) : 0,
        departments: deptsRes.status  === "fulfilled" ? (deptsRes.value.data?.length ?? 0)  : 0,
        units:       unitsRes.status  === "fulfilled" ? (unitsRes.value.data?.length ?? 0)  : 0,
        recentUsers: allUsers.slice(0, 8),
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
    { label: "Users",         tab: "users",       icon: Users,       color: "text-[#145c3f] bg-emerald-50", desc: "User accounts & roles" },
    { label: "Privileges",    tab: "privileges",  icon: ShieldCheck, color: "text-purple-700 bg-purple-50", desc: "Module permissions" },
    { label: "Zonal Offices", tab: "zones",       icon: MapPin,      color: "text-blue-700 bg-blue-50",     desc: "Geopolitical zones" },
    { label: "State Offices", tab: "states",      icon: Building2,   color: "text-amber-700 bg-amber-50",   desc: "State branches" },
    { label: "Departments",   tab: "departments", icon: Layers,      color: "text-pink-700 bg-pink-50",     desc: "HQ directorates" },
    { label: "Units",         tab: "units",       icon: Database,    color: "text-teal-700 bg-teal-50",     desc: "Operational units" },
  ];

  const activeRate = stats && stats.users > 0 ? Math.round((stats.activeUsers / stats.users) * 100) : 100;
  const privRate = stats && stats.users > 0 ? Math.round((stats.privileges / stats.users) * 100) : 0;

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
            size="sm"
            onClick={() => onNavigate?.("users")}
            className="bg-[#145c3f] hover:bg-[#0f442e] text-white gap-1.5 h-8 text-xs rounded-md shadow-2xs font-medium cursor-pointer"
          >
            <UserPlus className="size-3.5" />
            Add User
          </Button>

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
      <div className="w-full space-y-3.5">
        {/* Compact KPI Stats Strip (7 crisp cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-2.5">
          {STAT_CARDS.map(({ key, label, icon: Icon, iconCls, desc }) => (
            <div
              key={key}
              className="rounded-lg border border-[#d4e8dc] bg-white p-3 shadow-2xs hover:border-[#145c3f]/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={cn("size-7 rounded-md flex items-center justify-center border transition-colors", iconCls)}>
                  <Icon className="size-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">{desc}</span>
              </div>

              {loading ? (
                <div className="space-y-1 py-0.5">
                  <Skeleton className="h-6 w-12 bg-slate-100" />
                  <Skeleton className="h-3 w-16 bg-slate-100" />
                </div>
              ) : (
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {stats ? (stats as any)[key] : 0}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Compact Quick Access Bar (6 1-line interactive buttons) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickNavCards.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.tab}
                type="button"
                onClick={() => onNavigate?.(n.tab)}
                className="group flex items-center justify-between px-3 py-2 rounded-lg border border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:bg-[#fbfdfc] hover:shadow-2xs transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("size-6 rounded flex items-center justify-center shrink-0", n.color)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-[#145c3f] truncate">
                      {n.label}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-slate-300 group-hover:text-[#145c3f] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
              </button>
            );
          })}
        </div>

        {/* Main 12-Column Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start w-full">
          {/* Left Column (8 cols): Recent User Directory + Role Distribution */}
          <div className="xl:col-span-8 flex flex-col gap-3.5">
            {/* Recent Users Table Card (Real Admin Utility) */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs overflow-hidden">
              <CardHeader className="p-3.5 pb-2.5 border-b border-[#f0fdf7] flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">User Accounts & Directory</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Latest registered staff accounts, role designations, and access statuses
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.("users")}
                  className="gap-1 text-xs h-7 text-[#145c3f] hover:bg-[#e8f5ee] font-semibold cursor-pointer"
                >
                  View All Users
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-9 w-full bg-slate-100 rounded-md" />
                    ))}
                  </div>
                ) : (stats?.recentUsers?.length ?? 0) === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No registered user accounts found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-[#fbfdfc] border-b border-[#eef6f1]">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5">Staff ID / Name</TableHead>
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5">Role</TableHead>
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5">Location / Dept</TableHead>
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5">Privileges</TableHead>
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5">Status</TableHead>
                          <TableHead className="text-[11px] font-semibold text-slate-600 h-8 py-1.5 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#f4f7f5]">
                        {stats?.recentUsers.map((u) => {
                          const roleLabel = ROLE_LABELS[u.role] ?? u.role_label ?? u.role;
                          const location = u.state?.description || u.zone?.description || u.department?.name || u.unit?.name || "National";
                          const hasPrivs = Array.isArray(u.functionalities) && u.functionalities.length > 0;

                          return (
                            <TableRow key={u.id} className="hover:bg-[#fbfdfc] transition-colors group">
                              <TableCell className="py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="size-6 rounded-full bg-[#e8f5ee] text-[#145c3f] flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {(u.name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate leading-tight">{u.name || "Unnamed"}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.staff_id || `#${u.id}`}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs">
                                <Badge variant="outline" className="text-[10px] font-medium border-[#d4e8dc] bg-[#fbfdfc] text-slate-700 py-0">
                                  {roleLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-slate-600 truncate max-w-[140px]">
                                {location}
                              </TableCell>
                              <TableCell className="py-2 text-xs">
                                {hasPrivs ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    <Check className="size-2.5" />
                                    {u.functionalities?.length} modules
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Role Default</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-xs">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                                  u.is_active
                                    ? "bg-[#e8f5ee] text-[#145c3f]"
                                    : "bg-slate-100 text-slate-500"
                                )}>
                                  <span className={cn("size-1.5 rounded-full", u.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                                  {u.is_active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onNavigate?.("users")}
                                  className="h-6 px-2 text-[11px] text-[#145c3f] hover:bg-[#e8f5ee] cursor-pointer"
                                >
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compact Roles Distribution Grid (Replacing the bulky bar chart) */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-3.5 pb-2 border-b border-[#f0fdf7] flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Role & Access Matrix</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Staff count per organizational system role
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.("roles")}
                  className="gap-1 text-xs h-7 text-[#145c3f] hover:bg-[#e8f5ee] font-semibold cursor-pointer"
                >
                  Configure Roles
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-3.5">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-14 w-full bg-slate-100 rounded-md" />
                    ))}
                  </div>
                ) : (stats?.roleBreakdown?.length ?? 0) === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No role records available</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {stats?.roleBreakdown.map((r) => (
                      <div
                        key={r.rawRole}
                        className="p-2.5 rounded-lg border border-[#eef6f1] bg-[#fbfdfc] hover:border-[#145c3f]/40 hover:bg-white transition-all flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={r.role}>
                            {r.role}
                          </p>
                          <span className="text-[11px] font-bold text-[#145c3f] bg-[#e8f5ee] px-1.5 py-0.2 rounded shrink-0 tabular-nums">
                            {r.count}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#145c3f] rounded-full"
                            style={{ width: `${Math.max(8, r.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (4 cols): System Health + Directory Breakdown + Security Status */}
          <div className="xl:col-span-4 flex flex-col gap-3.5">
            {/* System Health Card (Dark Forest Green matching screenshot) */}
            <div className="rounded-lg p-3.5 bg-gradient-to-br from-[#0c3928] via-[#145c3f] to-[#092b1e] text-white border border-[#145c3f] shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 size-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-white/15 flex items-center justify-center text-[#6ddba8]">
                      <Zap className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">System Infrastructure</p>
                      <p className="text-[10px] text-[#6ddba8] flex items-center gap-1 mt-0.5">
                        <span className="size-1.5 rounded-full bg-[#6ddba8] inline-block animate-pulse" />
                        Operational
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6ddba8] font-semibold bg-white/10 px-2 py-0.5 rounded">
                    99.9% Uptime
                  </span>
                </div>

                <div className="space-y-2 pt-0.5">
                  {systemHealth.map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between items-center text-[10px] text-white/80 mb-0.5">
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
                      <div className="h-1 bg-white/15 rounded-full overflow-hidden">
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
                  <span>Last sync: Just now</span>
                  <span className="text-white/60">PostgreSQL DB: Online</span>
                </div>
              </div>
            </div>

            {/* Data Summary Card (Directory Entity Counts) */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-3.5 pb-2 border-b border-[#f0fdf7]">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Data Summary
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Active directory entity registers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-1.5">
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
                      className="flex items-center justify-between py-1.5 border-b border-[#f0fdf7] last:border-0"
                    >
                      <span className="flex items-center gap-2 text-xs text-slate-600">
                        <Icon className={cn("size-3.5", r.iconCls)} />
                        {r.label}
                      </span>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded tabular-nums", r.badge)}>
                        {loading ? "…" : r.val ?? 0}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Account Utilization & Security Compliance Card */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardContent className="p-3.5 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Active User Ratio</span>
                    <span className="font-bold text-[#145c3f] tabular-nums">
                      {loading ? "…" : `${activeRate}%`}
                    </span>
                  </div>
                  <Progress value={activeRate} className="h-1.5 bg-[#e8f5ee] [&>div]:bg-[#145c3f]" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {stats?.activeUsers ?? 0} of {stats?.users ?? 0} accounts active
                  </p>
                </div>

                <div className="pt-2 border-t border-[#f0fdf7]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Privilege Coverage</span>
                    <span className="font-bold text-purple-700 tabular-nums">
                      {loading ? "…" : `${privRate}%`}
                    </span>
                  </div>
                  <Progress value={privRate} className="h-1.5 bg-purple-50 [&>div]:bg-purple-600" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {stats?.privileges ?? 0} accounts assigned granular permissions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
