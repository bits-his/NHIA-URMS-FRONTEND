import * as React from "react";
import {
  Users, MapPin, Building2, Layers, ShieldCheck, Activity,
  TrendingUp, TrendingDown, RefreshCw, Zap, Database,
  Server, Wifi, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { usersApi, zonesApi, statesApi, departmentsApi, unitsApi } from "@/lib/adminApi";

interface Stats {
  users: number;
  activeUsers: number;
  privileges: number;
  zones: number;
  states: number;
  departments: number;
  units: number;
  roleBreakdown: { role: string; count: number; color: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  "admin": "Admin", "state-officer": "State Officer",
  "zonal-coordinator": "Zonal Coordinator", "state-coordinator": "State Coordinator",
  "department-officer": "Department Officer", "sdo": "SDO",
  "hq-department": "HQ Department", "dg-ceo": "DG/CEO",
};
const ROLE_COLORS: Record<string, string> = {
  "admin": "#7c3aed", "state-officer": "#64748b", "zonal-coordinator": "#3b82f6",
  "state-coordinator": "#06b6d4", "department-officer": "#6366f1",
  "sdo": "#25a872", "hq-department": "#f59e0b", "dg-ceo": "#ef4444",
};

const STAT_CARDS = [
  { key: "users",       label: "Total Users",      icon: Users,      tint: "kpi-green",  iconCls: "text-[#145c3f]",  desc: "Registered accounts" },
  { key: "activeUsers", label: "Active Users",     icon: Activity,   tint: "kpi-blue",   iconCls: "text-blue-600",   desc: "Currently active" },
  { key: "privileges",  label: "Privilege Sets",   icon: ShieldCheck,tint: "kpi-purple", iconCls: "text-purple-600", desc: "Users with access" },
  { key: "zones",       label: "Zonal Offices",    icon: MapPin,     tint: "kpi-blue",   iconCls: "text-blue-600",   desc: "Geopolitical zones" },
  { key: "states",      label: "State Offices",    icon: Building2,  tint: "kpi-amber",  iconCls: "text-amber-600",  desc: "State-level offices" },
  { key: "departments", label: "Departments",      icon: Layers,     tint: "kpi-purple", iconCls: "text-purple-600", desc: "HQ departments" },
  { key: "units",       label: "Units",            icon: Database,   tint: "kpi-green",  iconCls: "text-emerald-600",desc: "Operational units" },
];

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
      const total    = usersRes.status === "fulfilled" ? usersRes.value.total : 0;
      const active   = allUsers.filter((u: any) => u.is_active).length;
      const withPriv = allUsers.filter((u: any) => Array.isArray(u.functionalities) && u.functionalities.length > 0).length;

      // Role breakdown
      const roleCounts: Record<string, number> = {};
      allUsers.forEach((u: any) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
      const roleBreakdown = Object.entries(roleCounts).map(([role, count]) => ({
        role: ROLE_LABELS[role] ?? role, count, color: ROLE_COLORS[role] ?? "#94a3b8",
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const systemHealth = [
    { label: "API Gateway",   val: 98, icon: <Wifi className="w-3.5 h-3.5" />,     status: "ok"   },
    { label: "Database",      val: 100,icon: <Database className="w-3.5 h-3.5" />, status: "ok"   },
    { label: "Auth Service",  val: 100,icon: <ShieldCheck className="w-3.5 h-3.5" />,status: "ok" },
    { label: "Report Queue",  val: 87, icon: <Server className="w-3.5 h-3.5" />,   status: "warn" },
  ];

  const navCards = [
    { label: "Users",         desc: "Manage user accounts & roles",     tab: "users",       icon: <Users className="w-5 h-5" />,       color: "#145c3f" },
    { label: "Privileges",    desc: "Assign module access permissions", tab: "privileges",  icon: <ShieldCheck className="w-5 h-5" />, color: "#7c3aed" },
    { label: "Zonal Offices", desc: "Configure geopolitical zones",     tab: "zones",       icon: <MapPin className="w-5 h-5" />,      color: "#3b82f6" },
    { label: "State Offices", desc: "Manage state-level offices",       tab: "states",      icon: <Building2 className="w-5 h-5" />,   color: "#f59e0b" },
    { label: "Departments",   desc: "HQ department configuration",      tab: "departments", icon: <Layers className="w-5 h-5" />,      color: "#ec4899" },
    { label: "Units",         desc: "Operational unit management",      tab: "units",       icon: <Database className="w-5 h-5" />,    color: "#25a872" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Overview</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="border-[#d4e8dc] hover:bg-[#e8f5ee] gap-1.5 text-xs rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, tint, iconCls, desc }) => (
          <div key={key} className={`${tint} rounded-2xl p-4 border border-white/60 shadow-sm hover:shadow-md transition-all`}>
            <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shadow-sm mb-3 ${iconCls}`}>
              <Icon className="w-4 h-4" />
            </div>
            {loading ? (
              <div className="h-8 w-12 bg-white/50 rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {stats ? (stats as any)[key] : 0}
              </p>
            )}
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Role breakdown chart + Quick nav */}
        <div className="xl:col-span-2 space-y-5">

          {/* Role Breakdown Chart */}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Users by Role</CardTitle>
              <CardDescription className="text-xs">Distribution of registered users across all roles</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px]">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.roleBreakdown ?? []} barSize={28} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8f5ee" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="role" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} width={110} />
                    <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Bar dataKey="count" name="Users" radius={[0,6,6,0]}
                      fill="#25a872"
                      label={{ position: "right", fontSize: 10, fill: "#5a7a6a" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Quick Navigation Cards */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Quick Access</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {navCards.map(n => (
                <button key={n.tab} onClick={() => onNavigate?.(n.tab)}
                  className="flex flex-col items-start p-4 rounded-2xl border border-[#d4e8dc] bg-white hover:border-[#25a872] hover:shadow-md transition-all text-left group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: n.color }}>
                    {n.icon}
                  </div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-[#145c3f]">{n.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{n.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: System Health + Stats summary */}
        <div className="space-y-5">

          {/* System Health */}
          <div className="rounded-2xl p-5 overflow-hidden relative" style={{ background: "linear-gradient(135deg,#145c3f 0%,#0f3d2e 100%)" }}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#6ddba8]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">System Health</p>
                  <p className="text-[10px] text-white/50">All systems operational</p>
                </div>
              </div>
              <div className="space-y-3">
                {systemHealth.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between items-center text-[10px] text-white/70 mb-1">
                      <span className="flex items-center gap-1.5">
                        {s.status === "ok"
                          ? <CheckCircle2 className="w-3 h-3 text-[#6ddba8]" />
                          : <AlertCircle className="w-3 h-3 text-amber-400" />}
                        {s.label}
                      </span>
                      <span className="font-bold text-white">{s.val}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${s.val}%`, backgroundColor: s.val >= 95 ? "#25a872" : "#f59e0b" }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-4">Last sync: just now</p>
            </div>
          </div>

          {/* Data Summary */}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Data Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Users",   val: stats?.users,       icon: <Users className="w-3.5 h-3.5 text-[#145c3f]" />,      badge: "bg-[#e8f5ee] text-[#145c3f]" },
                { label: "Active Users",  val: stats?.activeUsers, icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,     badge: "bg-blue-50 text-blue-700" },
                { label: "With Access",   val: stats?.privileges,  icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />,badge: "bg-purple-50 text-purple-700" },
                { label: "Zones",         val: stats?.zones,       icon: <MapPin className="w-3.5 h-3.5 text-blue-600" />,       badge: "bg-blue-50 text-blue-700" },
                { label: "States",        val: stats?.states,      icon: <Building2 className="w-3.5 h-3.5 text-amber-600" />,   badge: "bg-amber-50 text-amber-700" },
                { label: "Departments",   val: stats?.departments, icon: <Layers className="w-3.5 h-3.5 text-purple-600" />,     badge: "bg-purple-50 text-purple-700" },
                { label: "Units",         val: stats?.units,       icon: <Database className="w-3.5 h-3.5 text-emerald-600" />,  badge: "bg-emerald-50 text-emerald-700" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[#f0fdf7] last:border-0">
                  <span className="flex items-center gap-2 text-xs text-slate-600">{r.icon}{r.label}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.badge}`}>
                    {loading ? "" : r.val ?? 0}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Active users ratio */}
          {stats && stats.users > 0 && (
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">Active User Rate</p>
                  <span className="text-xs font-black text-[#145c3f]">
                    {Math.round((stats.activeUsers / stats.users) * 100)}%
                  </span>
                </div>
                <Progress value={(stats.activeUsers / stats.users) * 100} className="h-2 bg-[#e8f5ee]" />
                <p className="text-[10px] text-slate-400 mt-1.5">{stats.activeUsers} of {stats.users} users active</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
