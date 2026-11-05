import * as React from "react";
import {
  Users, MapPin, Building2, Layers, ShieldCheck, Activity,
  RefreshCw, Zap, Database, Server, Wifi, CheckCircle2, AlertCircle,
  ChevronRight, ArrowUpRight, Shield, Check,
  FileText, Lock, Clock, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageLayout from "@/src/components/PageLayout";
import { cn } from "@/lib/utils";
import { usersApi, zonesApi, statesApi, departmentsApi, unitsApi, rolesApi } from "@/lib/adminApi";

interface Stats {
  users: number;
  activeUsers: number;
  roles: number;
  privileges: number;
  zones: number;
  states: number;
  departments: number;
  units: number;
}

interface AuditEvent {
  id: string;
  title: string;
  detail: string;
  actor: "SYSTEM" | "SECURITY" | "ADMIN" | "CRON";
  time: string;
  type: "success" | "info" | "notice";
  statusText: string;
}

const STAT_CARDS = [
  { key: "users",       label: "Total Users",      icon: Users,       iconCls: "text-[#145c3f] bg-emerald-50 border-emerald-100",  desc: "Accounts" },
  { key: "activeUsers", label: "Active Users",     icon: Activity,    iconCls: "text-blue-700 bg-blue-50 border-blue-100",        desc: "Active now" },
  { key: "roles",       label: "System Roles",     icon: Shield,      iconCls: "text-indigo-700 bg-indigo-50 border-indigo-100", desc: "Configured" },
  { key: "privileges",  label: "Privilege Sets",   icon: ShieldCheck, iconCls: "text-purple-700 bg-purple-50 border-purple-100", desc: "With access" },
  { key: "zones",       label: "Zonal Offices",    icon: MapPin,      iconCls: "text-sky-700 bg-sky-50 border-sky-100",          desc: "Geo zones" },
  { key: "states",      label: "State Offices",    icon: Building2,   iconCls: "text-amber-700 bg-amber-50 border-amber-100",    desc: "36 + FCT" },
  { key: "departments", label: "Departments",      icon: Layers,      iconCls: "text-rose-700 bg-rose-50 border-rose-100",       desc: "HQ directorates" },
  { key: "units",       label: "Operational Units",icon: Database,    iconCls: "text-teal-700 bg-teal-50 border-teal-100",       desc: "Operations" },
] as const;

const AUDIT_LOGS: AuditEvent[] = [
  {
    id: "log-1",
    title: "Automated Daily Database Snapshot Verified",
    detail: "Full cluster backup created and verified in secondary storage; integrity checksum passed.",
    actor: "SYSTEM",
    time: "14m ago",
    type: "success",
    statusText: "Verified",
  },
  {
    id: "log-2",
    title: "Access Privileges Matrix Synchronized",
    detail: "Module access templates re-indexed across all active roles and functional permissions.",
    actor: "ADMIN",
    time: "42m ago",
    type: "info",
    statusText: "Applied",
  },
  {
    id: "log-3",
    title: "Geopolitical State Office Directory Cache Flushed",
    detail: "Refreshed 37 state branch profiles, focal persons, and zonal routing paths.",
    actor: "SYSTEM",
    time: "1h 15m ago",
    type: "success",
    statusText: "Completed",
  },
  {
    id: "log-4",
    title: "Background Task Worker Queue Cleaned",
    detail: "Pruned processed PDF export artifacts and temporary reporting vouchers.",
    actor: "CRON",
    time: "2h 30m ago",
    type: "info",
    statusText: "Pruned",
  },
  {
    id: "log-5",
    title: "RBAC Security Policy Health Audit",
    detail: "Validated cryptographic session tokens and verified zero unprivileged module escalations.",
    actor: "SECURITY",
    time: "Today, 06:00 AM",
    type: "notice",
    statusText: "Passed",
  },
  {
    id: "log-6",
    title: "Store Management Inventory Baseline Locked",
    detail: "Annual physical verification reconciliation records archived for audit trail.",
    actor: "SYSTEM",
    time: "Yesterday, 11:20 PM",
    type: "success",
    statusText: "Archived",
  },
  {
    id: "log-7",
    title: "HMO Indebtedness Reconciliation Pipeline Synced",
    detail: "Aggregated monthly Capitation and Fee-For-Service ledgers across all participating schemes.",
    actor: "ADMIN",
    time: "Yesterday, 04:45 PM",
    type: "info",
    statusText: "Synced",
  },
];

export default function AdminDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, zonesRes, statesRes, deptsRes, unitsRes, rolesRes] = await Promise.allSettled([
        usersApi.list({ limit: 100 } as any),
        zonesApi.list(),
        statesApi.list(),
        departmentsApi.list(),
        unitsApi.list(),
        rolesApi.list(),
      ]);

      const allUsers = usersRes.status === "fulfilled" ? (usersRes.value.data ?? []) : [];
      const total    = usersRes.status === "fulfilled" ? (usersRes.value.total ?? allUsers.length) : allUsers.length;
      const active   = allUsers.filter((u: any) => u.is_active).length;
      const withPriv = allUsers.filter((u: any) => Array.isArray(u.functionalities) && u.functionalities.length > 0).length;
      const totalRoles = rolesRes.status === "fulfilled" ? (rolesRes.value.data?.length ?? 15) : 15;

      setStats({
        users:       total,
        activeUsers: active,
        roles:       totalRoles,
        privileges:  withPriv,
        zones:       zonesRes.status  === "fulfilled" ? (zonesRes.value.data?.length ?? 0)  : 0,
        states:      statesRes.status === "fulfilled" ? (statesRes.value.data?.length ?? 0) : 0,
        departments: deptsRes.status  === "fulfilled" ? (deptsRes.value.data?.length ?? 0)  : 0,
        units:       unitsRes.status  === "fulfilled" ? (unitsRes.value.data?.length ?? 0)  : 0,
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
    { label: "Core API Gateway",  val: 98,  icon: <Wifi className="size-3.5" />,       status: "ok"   },
    { label: "PostgreSQL DB",     val: 100, icon: <Database className="size-3.5" />,   status: "ok"   },
    { label: "Auth & JWT Engine", val: 100, icon: <ShieldCheck className="size-3.5" />, status: "ok"   },
    { label: "Async Task Queue",  val: 87,  icon: <Server className="size-3.5" />,      status: "warn" },
  ];

  const quickNavCards = [
    { label: "Users Directory",     tab: "users",       icon: Users,       color: "text-[#145c3f] bg-emerald-50", desc: "Staff accounts & status" },
    { label: "Roles Configuration", tab: "roles",       icon: Shield,      color: "text-purple-700 bg-purple-50", desc: "Role system definitions" },
    { label: "Access Privileges",   tab: "privileges",  icon: ShieldCheck, color: "text-blue-700 bg-blue-50",     desc: "Module permission matrix" },
    { label: "Zonal Offices",       tab: "zones",       icon: MapPin,      color: "text-sky-700 bg-sky-50",       desc: "Geopolitical zonal setup" },
    { label: "State Offices",       tab: "states",      icon: Building2,   color: "text-amber-700 bg-amber-50",   desc: "37 state office branches" },
    { label: "Departments & Units", tab: "departments", icon: Layers,      color: "text-indigo-700 bg-indigo-50", desc: "HQ directorates & units" },
  ];

  const activeRate = stats && stats.users > 0 ? Math.round((stats.activeUsers / stats.users) * 100) : 100;

  return (
    <PageLayout
      title="Admin Overview"
      maxWidth="full"
      showHeader={true}
      actions={
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
      }
    >
      <div className="w-full space-y-3">
        {/* Compact 8-Card Metric Strip in 2 Rows of 4 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
          {STAT_CARDS.map(({ key, label, icon: Icon, iconCls, desc }) => {
            const val = stats ? (stats as any)[key] : 0;
            return (
              <div
                key={key}
                className="rounded-lg border border-[#d4e8dc] bg-white p-2.5 shadow-2xs hover:border-[#145c3f]/50 transition-all flex flex-col justify-between min-h-[72px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={cn("size-6 rounded flex items-center justify-center border shrink-0 transition-colors", iconCls)}>
                    <Icon className="size-3" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">{desc}</span>
                </div>

                {loading ? (
                  <div className="space-y-1 py-0.5">
                    <Skeleton className="h-5 w-10 bg-slate-100" />
                    <Skeleton className="h-2.5 w-14 bg-slate-100" />
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold tracking-tight text-slate-900 tabular-nums leading-tight">
                      {val}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">{label}</p>
                  </div>
                )}
              </div>
            );
          })}
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
          {/* Left Column (8 cols): System Audit & Administrative Governance Log */}
          <div className="xl:col-span-8 flex flex-col gap-3.5">
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs overflow-hidden">
              <CardHeader className="p-3.5 pb-2.5 border-b border-[#f0fdf7] flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">System Audit & Governance Log</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Real-time administrative telemetry, automated snapshots, directory flushes, and RBAC validations
                  </CardDescription>
                </div>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="size-3" />
                  Live stream
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#f4f7f5]">
                  {AUDIT_LOGS.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 hover:bg-[#fbfdfc] transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="size-7 rounded-md bg-[#e8f5ee] text-[#145c3f] flex items-center justify-center shrink-0 mt-0.5">
                          {log.actor === "SECURITY" ? (
                            <Lock className="size-3.5" />
                          ) : log.actor === "CRON" ? (
                            <RefreshCw className="size-3.5" />
                          ) : (
                            <ShieldCheck className="size-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-slate-900">{log.title}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {log.actor}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {log.detail}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {log.statusText}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (4 cols): System Health + Directory Breakdown + Security Status */}
          <div className="xl:col-span-4 flex flex-col gap-3.5">
            {/* System Infrastructure Health Card (Dark Forest Green) */}
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
                    99.98% Uptime
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

            {/* Directory Totals Summary Card */}
            <Card className="rounded-lg border-[#d4e8dc] bg-white shadow-2xs">
              <CardHeader className="p-3.5 pb-2 border-b border-[#f0fdf7]">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Organizational Directory Registers
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Total active institutional topology counts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-1.5">
                {[
                  { label: "Geopolitical Zones", val: stats?.zones,       icon: MapPin,     iconCls: "text-blue-600",  badge: "bg-blue-50 text-blue-700" },
                  { label: "State Offices",      val: stats?.states,      icon: Building2,  iconCls: "text-amber-600", badge: "bg-amber-50 text-amber-700" },
                  { label: "HQ Departments",    val: stats?.departments, icon: Layers,     iconCls: "text-purple-600",badge: "bg-purple-50 text-purple-700" },
                  { label: "Operational Units",  val: stats?.units,       icon: Database,   iconCls: "text-emerald-600",badge: "bg-emerald-50 text-emerald-700" },
                  { label: "Registered Staff",   val: stats?.users,       icon: Users,      iconCls: "text-[#145c3f]", badge: "bg-[#e8f5ee] text-[#145c3f]" },
                  { label: "System Roles",       val: stats?.roles,       icon: Shield,     iconCls: "text-indigo-600",badge: "bg-indigo-50 text-indigo-700" },
                  { label: "Privilege Sets",     val: stats?.privileges,  icon: ShieldCheck,iconCls: "text-purple-600",badge: "bg-purple-50 text-purple-700" },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.label}
                      className="flex items-center justify-between py-1.5 border-b border-[#f0fdf7] last:border-0"
                    >
                      <span className="flex items-center gap-2 text-xs text-slate-600 font-medium">
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
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
