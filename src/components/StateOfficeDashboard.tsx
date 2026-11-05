import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowLeft, ChevronRight, TrendingUp, TrendingDown,
  FileText, CheckSquare, Clock, AlertCircle, Users,
  Banknote, Activity, Building2, Layers, MapPin,
  ShieldCheck, Wifi, LayoutGrid, Scale,
  Megaphone, BookOpen, PackageSearch, ClipboardList,
  X, BarChart3, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import type { AuthUser } from "@/src/store/authSlice";
import {
  departmentsApi, unitsApi,
  type Department as ApiDepartment,
  type Unit as ApiUnit,
} from "@/lib/adminApi";

//  Dept icon/colour config (same as DepartmentalDashboard) 
const DEPT_ICON_MAP: Record<string, { color: string; icon: React.ReactNode }> = {
  FIN:  { color: "#3b82f6", icon: <Banknote     className="w-4 h-4" /> },
  HI:   { color: "#25a872", icon: <ShieldCheck  className="w-4 h-4" /> },
  ICT:  { color: "#8b5cf6", icon: <Wifi         className="w-4 h-4" /> },
  AUD:  { color: "#ef4444", icon: <ClipboardList className="w-4 h-4" /> },
  HR:   { color: "#f59e0b", icon: <Users        className="w-4 h-4" /> },
  PLN:  { color: "#06b6d4", icon: <BookOpen     className="w-4 h-4" /> },
  SVC:  { color: "#10b981", icon: <Activity     className="w-4 h-4" /> },
  SPD:  { color: "#ec4899", icon: <LayoutGrid   className="w-4 h-4" /> },
  STK:  { color: "#64748b", icon: <PackageSearch className="w-4 h-4" /> },
  LEG:  { color: "#7c3aed", icon: <Scale        className="w-4 h-4" /> },
  COM:  { color: "#f97316", icon: <Megaphone    className="w-4 h-4" /> },
};
function getDeptVisual(code: string) {
  return (
    DEPT_ICON_MAP[code] ??
    DEPT_ICON_MAP[code?.slice(0, 3)?.toUpperCase()] ??
    { color: "#145c3f", icon: <Building2 className="w-4 h-4" /> }
  );
}

//  Dept  monthly view mapping 
const DEPT_VIEW_MAP: Record<string, string> = {
  FIN:  "finance-monthly",
  HR:   "admin-monthly",
  HI:   "sqa-monthly",
  SVC:  "servicom-dashboard",
  COM:  "outreach-monthly",
  SPD:  "programmes-monthly",
  ICT:  "sqa-monthly",
  AUD:  "sqa-monthly",
  PLN:  "programmes-monthly",
  STK:  "stock-verifications-list",
  LEG:  "finance-monthly",
};

//  Deterministic mock helpers 
function deptSeed(code: string) {
  return code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}
function mockDeptStats(code: string) {
  const s = deptSeed(code);
  const reports    = 4  + (s % 20);
  const pending    = 0  + (s % Math.max(1, reports));
  const approved   = reports - pending;
  const compliance = 60 + (s % 39);
  const staff      = 3  + (s % 18);
  const directives = 1  + (s % 5);
  const trendUp    = s % 3 !== 0;
  return { reports, pending, approved, compliance, staff, directives, trendUp };
}
function mockUnitStats(code: string) {
  const s = deptSeed(code);
  const tasks     = 2 + (s % 10);
  const completed = s % Math.max(1, tasks);
  const overdue   = s % 3 === 0 ? 1 : 0;
  return { tasks, completed, overdue };
}
function mockDeptQuarterly(code: string) {
  const s = deptSeed(code);
  return ["Q1", "Q2", "Q3", "Q4"].map((q, i) => ({
    quarter:  q,
    reports:  4  + ((s + i * 7)  % 16),
    approved: 2  + ((s + i * 5)  % 12),
    igr:      Math.round((0.5 + ((s + i * 3) % 15) * 0.1) * 10) / 10,
  }));
}

//  Badge helpers 
function complianceColor(v: number) {
  if (v >= 85) return "text-emerald-600";
  if (v >= 70) return "text-amber-600";
  return "text-rose-600";
}
function complianceBg(v: number) {
  if (v >= 85) return "#25a872";
  if (v >= 70) return "#f59e0b";
  return "#ef4444";
}
function complianceBadgeCls(v: number) {
  if (v >= 85) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}
function statusBadge(status: string) {
  if (status === "Submitted") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "Pending")   return "bg-amber-100  text-amber-700  border-amber-200";
  if (status === "Overdue")   return "bg-rose-100   text-rose-700   border-rose-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

// ─── Quarterly Unit Drill-down Modal ─────────────────────────────────────────
// Opens when a KPI card inside DepartmentDetail is clicked.
// Shows Q1-Q4 for the department, then per-unit breakdown for the selected quarter.
interface QuarterlyDrillModalProps {
  dept: ApiDepartment;
  units: ApiUnit[];
  kpi: "reports" | "approved" | "pending" | "staff";
  kpiLabel: string;
  color: string;
  onClose: () => void;
}
function QuarterlyDrillModal({ dept, units, kpi, kpiLabel, color, onClose }: QuarterlyDrillModalProps) {
  const [selectedQ, setSelectedQ] = React.useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = React.useState<number | null>(null);

  const quarterly = mockDeptQuarterly(dept.department_code);

  // Per-unit quarterly data
  function unitQData(unitCode: string) {
    const s = deptSeed(unitCode);
    return ["Q1", "Q2", "Q3", "Q4"].map((q, i) => ({
      quarter:  q,
      reports:  2 + ((s + i * 5) % 10),
      approved: 1 + ((s + i * 3) % 8),
      pending:  (s + i) % 4,
      staff:    1 + (s % 6),
      igr:      Math.round((0.1 + ((s + i * 2) % 10) * 0.08) * 10) / 10,
    }));
  }

  const activeQ = selectedQ ?? quarterly[0].quarter;
  const qIdx    = ["Q1", "Q2", "Q3", "Q4"].indexOf(activeQ);

  // Aggregate for selected quarter across all units
  const unitRows = units.map((u) => {
    const qd  = unitQData(u.unit_code)[qIdx];
    const val = kpi === "reports" ? qd.reports : kpi === "approved" ? qd.approved :
                kpi === "pending" ? qd.pending  : qd.staff;
    const us  = mockUnitStats(u.unit_code);
    return { unit: u, qd, val, us };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: color }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{kpiLabel} · Quarterly Breakdown</h3>
              <p className="text-xs text-slate-500">{dept.name} · select a quarter to see unit data</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Quarter selector tabs */}
          <div className="grid grid-cols-4 gap-2">
            {quarterly.map((q) => {
              const val = kpi === "reports" ? q.reports : kpi === "approved" ? q.approved :
                          kpi === "pending" ? (q.reports - q.approved) : 0;
              const isActive = activeQ === q.quarter;
              return (
                <button
                  key={q.quarter}
                  onClick={() => { setSelectedQ(q.quarter); setExpandedUnit(null); }}
                  className={`rounded-md p-2.5 border text-left transition-all ${
                    isActive
                      ? "border-transparent text-white shadow-xs"
                      : "border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:shadow-2xs"
                  }`}
                  style={isActive ? { backgroundColor: color } : {}}
                >
                  <p className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-900"}`}>{q.quarter}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isActive ? "text-white" : "text-slate-900"}`}>
                    {kpi === "staff" ? "—" : val}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${isActive ? "text-white/70" : "text-slate-500"}`}>{kpiLabel}</p>
                </button>
              );
            })}
          </div>

          {/* Bar chart — units for selected quarter */}
          {unitRows.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {activeQ} · {kpiLabel} by Unit
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitRows.map((r) => ({ name: r.unit.name.split(" ")[0], value: r.val }))} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                    <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} name={kpiLabel} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Unit rows — expandable */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Unit Breakdown · {activeQ}
            </p>
            {unitRows.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No units found</p>
            ) : (
              <div className="space-y-2">
                {unitRows.map(({ unit, qd, val, us }) => {
                  const isOpen = expandedUnit === unit.id;
                  const pct    = Math.round((us.completed / Math.max(1, us.tasks)) * 100);
                  return (
                    <div key={unit.id} className="rounded-lg border border-[#d4e8dc] overflow-hidden">
                      <button
                        onClick={() => setExpandedUnit(isOpen ? null : unit.id)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#f0fdf7] transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: color + "20", color }}>
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#145c3f]">{unit.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{unit.unit_code}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold" style={{ color }}>{val}</span>
                          <span className="text-[10px] text-slate-400">{kpiLabel}</span>
                          <Progress value={pct} className="w-14 h-1.5 bg-[#e8f5ee]" />
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3.5 pt-2 bg-[#f8fdfb] border-t border-[#e8f5ee]">
                              {unit.description && (
                                <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">{unit.description}</p>
                              )}
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "Reports",  val: qd.reports,  color: "text-blue-700"    },
                                  { label: "Approved", val: qd.approved, color: "text-emerald-700" },
                                  { label: "Pending",  val: qd.pending,  color: "text-amber-700"   },
                                  { label: "IGR (₦M)", val: qd.igr,      color: "text-purple-700"  },
                                ].map((s) => (
                                  <div key={s.label} className="rounded-md bg-white border border-[#d4e8dc] p-2 text-center">
                                    <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">Task completion:</span>
                                <Progress value={pct} className="flex-1 h-1.5 bg-[#e8f5ee]" />
                                <span className="text-[10px] font-bold text-slate-700">{pct}%</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Overview KPI Modal (state-coordinator top cards) ────────────────────────
// Shows all departments for a given KPI, click dept → drill into it
interface OverviewKpiModalProps {
  title: string;
  kpi: "reports" | "approved" | "pending";
  departments: ApiDepartment[];
  onClose: () => void;
  onDeptClick: (d: ApiDepartment) => void;
}
function OverviewKpiModal({ title, kpi, departments, onClose, onDeptClick }: OverviewKpiModalProps) {
  const rows = departments.map((d) => {
    const s   = mockDeptStats(d.department_code);
    const val = kpi === "reports" ? s.reports : kpi === "approved" ? s.approved : s.pending;
    return { dept: d, val, stats: s };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc] bg-gradient-to-r from-[#f0fdf7] to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#145c3f] flex items-center justify-center text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">All departments · click a row to drill in</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.map((r) => ({ name: r.dept.department_code, value: r.val }))} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                <Bar dataKey="value" fill="#25a872" radius={[6, 6, 0, 0]} name={title} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Department</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">{title}</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ dept, val, stats }) => (
                <TableRow key={dept.id} className="hover:bg-[#f0fdf7] transition-colors cursor-pointer"
                  onClick={() => { onClose(); onDeptClick(dept); }}>
                  <TableCell className="text-sm font-medium text-[#145c3f] hover:underline">{dept.name}</TableCell>
                  <TableCell className="text-right font-black text-slate-900">{val}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`text-[10px] ${complianceBadgeCls(stats.compliance)}`}>{stats.compliance}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
interface DeptDetailProps {
  dept: ApiDepartment;
  stateName: string;
  onBack?: () => void;
  onNewSubmission?: (view: string) => void;
}
function DepartmentDetail({ dept, stateName, onBack, onNewSubmission }: DeptDetailProps) {
  const [units, setUnits]               = React.useState<ApiUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(true);
  const [unitError, setUnitError]       = React.useState<string | null>(null);
  const [activeUnit, setActiveUnit]     = React.useState<number | null>(null);
  const [drillModal, setDrillModal]     = React.useState<{
    kpi: "reports" | "approved" | "pending" | "staff"; label: string;
  } | null>(null);

  const { color, icon } = getDeptVisual(dept.department_code);
  const stats    = mockDeptStats(dept.department_code);
  const quarterly = mockDeptQuarterly(dept.department_code);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingUnits(true);
    setUnitError(null);
    unitsApi.list(dept.id)
      .then((res) => { if (!cancelled) setUnits(res.data); })
      .catch((err) => { if (!cancelled) setUnitError(err?.message ?? "Failed to load units"); })
      .finally(() => { if (!cancelled) setLoadingUnits(false); });
    return () => { cancelled = true; };
  }, [dept.id]);

  const directives = [
    { title: "Q3 Operational Report Submission",  deadline: "Oct 25, 2025", status: stats.pending > 3 ? "Pending" : "Submitted" },
    { title: "Monthly Activity Summary",           deadline: "Oct 30, 2025", status: "Submitted" },
    { title: "Staff Attendance & Welfare Returns", deadline: "Nov 5, 2025",  status: stats.compliance < 75 ? "Overdue" : "Pending" },
  ];

  const deptViewKey = dept.department_code.split("-")[0]; // e.g. "DEPT" → try first segment
  const viewTarget  = DEPT_VIEW_MAP[deptViewKey] ?? DEPT_VIEW_MAP[dept.department_code] ?? null;

  return (
    <motion.div
      key={`dept-${dept.id}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-[#d4e8dc] hover:bg-[#e8f5ee] text-slate-600 hover:text-[#145c3f] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 truncate">{dept.name}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {stateName} State Office
            <span className="font-mono ml-1 text-slate-400">{dept.department_code}</span>
          </p>
        </div>
        <Badge className={`text-xs px-2.5 py-0.5 font-bold shrink-0 ${complianceBadgeCls(stats.compliance)}`}>
          {stats.compliance}% Compliance
        </Badge>
        {onNewSubmission && viewTarget && (
          <Button
            size="sm"
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-1.5 shrink-0 rounded-md"
            onClick={() => onNewSubmission(viewTarget)}
          >
            <FileText className="w-3.5 h-3.5" /> New Submission
          </Button>
        )}
      </div>

      {/* ── KPI cards — clickable → quarterly + unit drill-down ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Click a card to see quarterly breakdown by unit
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { kpi: "reports"  as const, label: "Reports",  value: stats.reports,  sub: "This year",       icon: <FileText    className="w-4 h-4 text-blue-600"    />, tint: "kpi-blue"   },
            { kpi: "approved" as const, label: "Approved", value: stats.approved, sub: "Verified",        icon: <CheckSquare className="w-4 h-4 text-emerald-600" />, tint: "kpi-green"  },
            { kpi: "pending"  as const, label: "Pending",  value: stats.pending,  sub: "Awaiting action", icon: <Clock       className="w-4 h-4 text-amber-600"   />, tint: "kpi-amber"  },
            { kpi: "staff"    as const, label: "Staff",    value: stats.staff,    sub: "Active members",  icon: <Users       className="w-4 h-4 text-purple-600"  />, tint: "kpi-purple" },
          ].map((k) => (
            <button
              key={k.kpi}
              onClick={() => setDrillModal({ kpi: k.kpi, label: k.label })}
              className="rounded-lg p-3.5 border border-[#d4e8dc] bg-white shadow-2xs text-left group hover:border-[#145c3f] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-[#e8f5ee] flex items-center justify-center shadow-2xs">{k.icon}</div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#145c3f] transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{k.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
              <p className="text-[9px] text-slate-400 mt-1.5 group-hover:text-[#145c3f] transition-colors">
                View quarterly → units →
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts — chart click also opens drill modal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Quarterly Activity</CardTitle>
            <CardDescription className="text-xs">Reports submitted vs approved · click to drill down</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly} barSize={16} barGap={4}
                style={{ cursor: "pointer" }}
                onClick={() => setDrillModal({ kpi: "reports", label: "Reports" })}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }} />
                <Bar dataKey="reports"  fill="#d1f5e4" radius={[3, 3, 0, 0]} name="Submitted" />
                <Bar dataKey="approved" fill={color}   radius={[3, 3, 0, 0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">IGR Contribution (₦M)</CardTitle>
            <CardDescription className="text-xs">Quarterly internally generated revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quarterly}>
                <defs>
                  <linearGradient id={`grad-${dept.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }} />
                <Area type="monotone" dataKey="igr" stroke={color} strokeWidth={2}
                  fill={`url(#grad-${dept.id})`} name="IGR (₦M)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Units breakdown — real data */}
      <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#25a872]" />
            Units Breakdown
            <span className="text-[10px] font-normal text-slate-400">— click a unit to expand</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUnits ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading units…</span>
            </div>
          ) : unitError ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              <p className="text-xs text-slate-500">{unitError}</p>
              <Button size="sm" variant="outline" className="rounded-md text-xs border-[#d4e8dc]"
                onClick={() => { setUnitError(null); setLoadingUnits(true); unitsApi.list(dept.id).then(r => setUnits(r.data)).catch(e => setUnitError(e?.message)).finally(() => setLoadingUnits(false)); }}>
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No units found for this department</p>
            </div>
          ) : (
            <div className="space-y-2">
              {units.map((unit) => {
                const us    = mockUnitStats(unit.unit_code);
                const isOpen = activeUnit === unit.id;
                const pct   = Math.round((us.completed / Math.max(1, us.tasks)) * 100);
                return (
                  <div key={unit.id} className="rounded-lg border border-[#d4e8dc] overflow-hidden">
                    <button
                      onClick={() => setActiveUnit(isOpen ? null : unit.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#f0fdf7] transition-colors text-left group"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: color + "20", color }}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#145c3f]">
                          {unit.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">{unit.unit_code}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-500">{us.completed}/{us.tasks} tasks</span>
                        {us.overdue > 0 && (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] px-1.5">Overdue</Badge>
                        )}
                        <Progress value={pct} className="w-16 h-1.5 bg-[#e8f5ee]" />
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3.5 pt-2 bg-[#f8fdfb] border-t border-[#e8f5ee] space-y-3">
                            {unit.description && (
                              <p className="text-xs text-slate-500 leading-relaxed">{unit.description}</p>
                            )}
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="rounded-md bg-white border border-[#d4e8dc] p-2.5 text-center">
                                <p className="text-lg font-bold text-slate-900">{us.tasks}</p>
                                <p className="text-[10px] text-slate-500">Total Tasks</p>
                              </div>
                              <div className="rounded-md bg-white border border-[#d4e8dc] p-2.5 text-center">
                                <p className="text-lg font-bold text-emerald-600">{us.completed}</p>
                                <p className="text-[10px] text-slate-500">Completed</p>
                              </div>
                              <div className="rounded-md bg-white border border-[#d4e8dc] p-2.5 text-center">
                                <p className={`text-lg font-bold ${us.overdue > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                  {us.overdue}
                                </p>
                                <p className="text-[10px] text-slate-500">Overdue</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directives */}
      <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-800">Active Directives</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Directive</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Deadline</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directives.map((d) => (
                <TableRow key={d.title} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell className="text-sm font-medium">{d.title}</TableCell>
                  <TableCell className="text-sm text-slate-500">{d.deadline}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${statusBadge(d.status)}`}>{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quarterly + Unit drill-down modal */}
      <AnimatePresence>
        {drillModal && (
          <QuarterlyDrillModal
            key="quarterly-drill"
            dept={dept}
            units={units}
            kpi={drillModal.kpi}
            kpiLabel={drillModal.label}
            color={color}
            onClose={() => setDrillModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main StateOfficeDashboard ────────────────────────────────────────────────
interface StateOfficeDashboardProps {
  user?: AuthUser;
  role?: string;           // "state-officer" | "state-coordinator"
  stateName?: string;
  zoneName?: string;
  onNewReport?: () => void;
  onAnnualReport?: () => void;
  onViewSubmissions?: () => void;
  onNewSubmission?: (view: string) => void;
}

export default function StateOfficeDashboard({
  user,
  role = "state-coordinator",
  stateName = "Lagos",
  zoneName  = "South West",
  onNewReport,
  onAnnualReport,
  onViewSubmissions,
  onNewSubmission,
}: StateOfficeDashboardProps) {
  // ── Real data ────────────────────────────────────────────────────────────────
  const [departments,   setDepartments]   = React.useState<ApiDepartment[]>([]);
  const [stateOfficers, setStateOfficers] = React.useState<number>(0);
  const [loading,       setLoading]       = React.useState(true);
  const [fetchError,    setFetchError]    = React.useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedDept, setSelectedDept] = React.useState<ApiDepartment | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<"all" | "pending" | "overdue">("all");
  const [kpiModal,     setKpiModal]     = React.useState<{ title: string; kpi: "reports" | "approved" | "pending" } | null>(null);

  const isStateOfficer = role === "state-officer";

  // ── Fetch on mount ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const deptRes = await departmentsApi.list();
        if (cancelled) return;

        if (isStateOfficer) {
          // State officer: show only their assigned department
          const assigned = deptRes.data.find((d) => d.id === user?.department_id);
          if (assigned) {
            setDepartments([assigned]);
            setSelectedDept(assigned); // go straight to detail view
          } else {
            // department_id not set or not found — show all as fallback
            setDepartments(deptRes.data);
          }
        } else {
          // State coordinator: show all departments
          setDepartments(deptRes.data);
        }

        // Staff count (cosmetic, silently ignore 403)
        if (user?.state_id) {
          try {
            const res = await fetch(
              `${(import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api"}/admin/staff-count?role=state-officer&state_id=${user.state_id}`,
              { headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("nhia@token") ?? ""}` } }
            );
            const json = await res.json();
            if (!cancelled && json.success) setStateOfficers(json.total);
          } catch { /* ignore */ }
        }
      } catch (err: any) {
        if (!cancelled) setFetchError(err?.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.department_id, user?.state_id, isStateOfficer]);

  // ── Derived / mock aggregate stats ───────────────────────────────────────────
  const allStats = React.useMemo(
    () => departments.map((d) => ({ dept: d, ...mockDeptStats(d.department_code) })),
    [departments]
  );

  const totalReports    = allStats.reduce((a, s) => a + s.reports,    0);
  const totalPending    = allStats.reduce((a, s) => a + s.pending,    0);
  const totalApproved   = allStats.reduce((a, s) => a + s.approved,   0);
  const avgCompliance   = allStats.length
    ? Math.round(allStats.reduce((a, s) => a + s.compliance, 0) / allStats.length)
    : 0;
  const totalStaff      = allStats.reduce((a, s) => a + s.staff, 0);

  const filteredDepts = allStats.filter((s) => {
    if (filterStatus === "pending") return s.pending > 0;
    if (filterStatus === "overdue") return s.compliance < 70;
    return true;
  });

  const pieData = [
    { name: "Approved", value: totalApproved, fill: "#25a872" },
    { name: "Pending",  value: totalPending,  fill: "#f59e0b" },
  ];

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading state data…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-semibold text-slate-700">{fetchError}</p>
          <Button size="sm" variant="outline" className="rounded-xl border-[#d4e8dc] text-xs"
            onClick={() => window.location.reload()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Department detail view ────────────────────────────────────────────────────
  // State officer goes straight here (no back to overview)
  if (selectedDept) {
    return (
      <AnimatePresence mode="wait">
        <DepartmentDetail
          key={selectedDept.id}
          dept={selectedDept}
          stateName={stateName}
          // State officer has no overview to go back to — hide back button
          onBack={isStateOfficer ? undefined : () => setSelectedDept(null)}
          onNewSubmission={onNewSubmission}
        />
      </AnimatePresence>
    );
  }

  // ── Main overview ─────────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="state-dashboard"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="w-full space-y-3.5"
      >
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-[#25a872]" />
              <span className="text-xs font-bold text-[#25a872] uppercase tracking-wider">
                {stateName} State Office · {zoneName} Zone
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">State Office Performance</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {onNewReport && (
              <Button onClick={onNewReport}
                className="h-8 text-xs rounded-md bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-1.5 shadow-xs">
                <FileText className="w-3.5 h-3.5" /> New Report
              </Button>
            )}
            {onAnnualReport && (
              <Button onClick={onAnnualReport} variant="outline"
                className="h-8 text-xs rounded-md border-[#d4e8dc] hover:bg-[#e8f5ee] gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Annual Report
              </Button>
            )}
            {onViewSubmissions && (
              <Button onClick={onViewSubmissions} variant="outline"
                className="h-8 text-xs rounded-md border-[#d4e8dc] hover:bg-[#e8f5ee] gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> My Submissions
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI cards — all clickable ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total Reports", value: totalReports, sub: "All departments · 2025",
              icon: <FileText    className="w-4 h-4 text-blue-600"    />, tint: "kpi-blue",
              active: filterStatus === "all",
              onClick: () => setKpiModal({ title: "Total Reports", kpi: "reports" }),
            },
            {
              label: "Pending Review", value: totalPending, sub: "Click to filter depts",
              icon: <Clock       className="w-4 h-4 text-amber-600"   />, tint: "kpi-amber",
              active: filterStatus === "pending",
              onClick: () => {
                setFilterStatus(filterStatus === "pending" ? "all" : "pending");
                setKpiModal({ title: "Pending Reports", kpi: "pending" });
              },
            },
            {
              label: "Approved", value: totalApproved, sub: "Verified submissions",
              icon: <CheckSquare className="w-4 h-4 text-emerald-600" />, tint: "kpi-green",
              active: false,
              onClick: () => setKpiModal({ title: "Approved Reports", kpi: "approved" }),
            },
            {
              label: "Avg Compliance", value: `${avgCompliance}%`, sub: "State average",
              icon: <Activity    className="w-4 h-4 text-purple-600"  />, tint: "kpi-purple",
              active: filterStatus === "overdue",
              onClick: () => setFilterStatus(filterStatus === "overdue" ? "all" : "overdue"),
            },
          ].map((k) => (
            <button
              key={k.label}
              onClick={k.onClick}
              className={`rounded-lg p-3.5 border shadow-2xs text-left w-full group transition-all bg-white
                cursor-pointer hover:border-[#145c3f]
                ${k.active ? "ring-2 ring-[#145c3f] border-[#145c3f]" : "border-[#d4e8dc]"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-[#e8f5ee] flex items-center justify-center shadow-2xs">
                  {k.icon}
                </div>
                <ChevronRight className={`w-4 h-4 transition-colors ${k.active ? "text-[#145c3f]" : "text-slate-300 group-hover:text-[#145c3f]"}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{k.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
              <p className="text-[9px] text-slate-400 mt-1 group-hover:text-[#145c3f] transition-colors">
                View breakdown →
              </p>
            </button>
          ))}
        </div>

        {/* Filter badge */}
        {filterStatus !== "all" && (
          <div className="flex items-center gap-2">
            <Badge className="bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc] text-xs px-3 py-1">
              {filterStatus === "pending"
                ? "Showing: Departments with pending reports"
                : "Showing: Departments with low compliance (<70%)"}
            </Badge>
            <button
              onClick={() => setFilterStatus("all")}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
          {/* Left: chart + department cards */}
          <div className="xl:col-span-2 space-y-3.5">

            {/* Summary chart — bars are clickable */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Departmental Report Activity</CardTitle>
                  <CardDescription className="text-xs">
                    Submitted vs Approved · click a bar or the chart area to drill down
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#d1f5e4] inline-block" />Submitted
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#25a872] inline-block" />Approved
                  </span>
                </div>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allStats.map((s) => ({
                      name:     s.dept.department_code,
                      deptId:   s.dept.id,
                      reports:  s.reports,
                      approved: s.approved,
                    }))}
                    barSize={12}
                    barGap={3}
                    style={{ cursor: "pointer" }}
                    onClick={(data: any) => {
                      if (data?.activePayload?.[0]) {
                        const deptId = data.activePayload[0].payload?.deptId;
                        const found  = departments.find((d) => d.id === deptId);
                        if (found) setSelectedDept(found);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <RTooltip
                      contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }}
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label) => {
                        const dept = departments.find((d) => d.department_code === label);
                        return dept ? dept.name : label;
                      }}
                    />
                    <Bar dataKey="reports"  fill="#d1f5e4" radius={[3, 3, 0, 0]} name="Submitted" />
                    <Bar dataKey="approved" fill="#25a872" radius={[3, 3, 0, 0]} name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department cards grid */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#25a872]" />
                Departments
                <span className="text-[10px] font-normal text-slate-400 ml-1">
                  — click any card to drill down
                </span>
              </h3>

              {departments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d4e8dc] p-6 text-center">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No departments found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDepts.map(({ dept, reports, pending, approved, compliance, trendUp }) => {
                    const { color, icon } = getDeptVisual(dept.department_code);
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDept(dept)}
                        className="flex items-start gap-3 p-3.5 rounded-lg border border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:shadow-2xs transition-all text-left group"
                      >
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: color }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-[#145c3f] transition-colors leading-tight">
                              {dept.name}
                            </p>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#25a872] shrink-0 mt-0.5 transition-colors" />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {dept.department_code}
                            {dept.units && dept.units.length > 0 && ` · ${dept.units.length} units`}
                          </p>

                          {/* Compliance bar */}
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="flex-1 h-1.5 bg-[#e8f5ee] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${compliance}%`, backgroundColor: complianceBg(compliance) }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${complianceColor(compliance)}`}>
                              {compliance}%
                            </span>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-500">
                              <span className="font-bold text-slate-700">{reports}</span> reports
                            </span>
                            {pending > 0 && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 h-4">
                                {pending} pending
                              </Badge>
                            )}
                            {approved > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0 h-4">
                                {approved} approved
                              </Badge>
                            )}
                            <span className={`ml-auto flex items-center gap-0.5 text-[10px] font-semibold ${trendUp ? "text-emerald-600" : "text-rose-500"}`}>
                              {trendUp
                                ? <TrendingUp   className="w-3 h-3" />
                                : <TrendingDown className="w-3 h-3" />}
                              {trendUp ? "Up" : "Down"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredDepts.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                      No departments match the current filter.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-3.5">
            {/* Pie chart */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800">Report Status Split</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[140px]">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={pieData} cx={65} cy={65}
                      innerRadius={40} outerRadius={60}
                      dataKey="value" paddingAngle={3}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </div>
                <div className="flex justify-center gap-4 mt-1">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                      <span className="text-[11px] text-slate-600">
                        {p.name} <strong>{p.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compliance ranking */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Dept Compliance Ranking</CardTitle>
                <CardDescription className="text-xs">Click to drill into department</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...allStats]
                  .sort((a, b) => b.compliance - a.compliance)
                  .slice(0, 6)
                  .map(({ dept, compliance }, i) => {
                    const { color, icon } = getDeptVisual(dept.department_code);
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDept(dept)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-md bg-[#f0fdf7] border border-[#d4e8dc] hover:border-[#145c3f] hover:bg-[#e8f5ee] transition-all group"
                      >
                        <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 ${
                          i === 0 ? "bg-[#25a872]" : i === 1 ? "bg-[#3b82f6]" : i === 2 ? "bg-[#f59e0b]" : "bg-slate-300"
                        }`}>{i + 1}</span>
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          <span className="scale-75">{icon}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 flex-1 text-left truncate group-hover:text-[#145c3f]">
                          {dept.name}
                        </p>
                        <span className={`text-xs font-bold ${complianceColor(compliance)}`}>{compliance}%</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#25a872]" />
                      </button>
                    );
                  })}
              </CardContent>
            </Card>

            {/* Needs attention */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allStats
                  .filter((s) => s.compliance < 75 || s.pending > 4)
                  .slice(0, 4)
                  .map(({ dept, compliance, pending }) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDept(dept)}
                      className="w-full flex items-start gap-2.5 p-2 rounded-md bg-rose-50 border border-rose-100 hover:border-rose-300 transition-all text-left group"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-rose-700 truncate">
                          {dept.name}
                        </p>
                        <p className="text-[10px] text-rose-500">
                          {compliance < 75 ? `${compliance}% compliance` : ""}
                          {compliance < 75 && pending > 4 ? " · " : ""}
                          {pending > 4 ? `${pending} pending` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-rose-300 group-hover:text-rose-500 shrink-0 mt-0.5" />
                    </button>
                  ))}
                {allStats.filter((s) => s.compliance < 75 || s.pending > 4).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">All departments on track ✓</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPI Modal */}
        <AnimatePresence>
          {kpiModal && (
            <OverviewKpiModal
              key="kpi-modal"
              title={kpiModal.title}
              kpi={kpiModal.kpi}
              departments={departments}
              onClose={() => setKpiModal(null)}
              onDeptClick={(d) => { setKpiModal(null); setSelectedDept(d); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
