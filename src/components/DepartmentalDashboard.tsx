import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  FileText, CheckSquare, Clock, Users, Layers, Activity, Building2,
  Banknote, ShieldCheck, Wifi, LayoutGrid, ClipboardList, BookOpen,
  PackageSearch, Scale, Megaphone, AlertCircle, CheckCircle2,
  BarChart3, X, RefreshCw, TrendingUp, TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "motion/react";
import type { AuthUser } from "@/src/store/authSlice";
import {
  departmentsApi, unitsApi,
  type Unit, type Department,
} from "@/lib/adminApi";

// ─── Dept colour / icon config ────────────────────────────────────────────────
const DEPT_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  FIN:  { color: "#3b82f6", icon: <Banknote    className="w-5 h-5" /> },
  HI:   { color: "#25a872", icon: <ShieldCheck className="w-5 h-5" /> },
  ICT:  { color: "#8b5cf6", icon: <Wifi        className="w-5 h-5" /> },
  AUD:  { color: "#ef4444", icon: <ClipboardList className="w-5 h-5" /> },
  HR:   { color: "#f59e0b", icon: <Users       className="w-5 h-5" /> },
  PLN:  { color: "#06b6d4", icon: <BookOpen    className="w-5 h-5" /> },
  SVC:  { color: "#10b981", icon: <Activity    className="w-5 h-5" /> },
  SPD:  { color: "#ec4899", icon: <LayoutGrid  className="w-5 h-5" /> },
  STK:  { color: "#64748b", icon: <PackageSearch className="w-5 h-5" /> },
  LEG:  { color: "#7c3aed", icon: <Scale       className="w-5 h-5" /> },
  COM:  { color: "#f97316", icon: <Megaphone   className="w-5 h-5" /> },
};
function getDeptConfig(code: string) {
  // Try exact match first, then first 3 chars
  return (
    DEPT_CONFIG[code] ??
    DEPT_CONFIG[code?.slice(0, 3)?.toUpperCase()] ??
    { color: "#145c3f", icon: <Building2 className="w-5 h-5" /> }
  );
}

// ─── Deterministic mock stats (used until real report data is available) ──────
function h(s: string) {
  return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}
function mockUnitStats(code: string) {
  const n = h(code);
  return {
    reports:    2 + (n % 10),
    pending:    n % Math.max(1, 2 + (n % 10)),
    approved:   (2 + (n % 10)) - (n % Math.max(1, 2 + (n % 10))),
    tasks:      3 + (n % 10),
    completed:  n % Math.max(1, 3 + (n % 10)),
    overdue:    n % 4 === 0 ? 1 : 0,
    compliance: 60 + (n % 38),
    staff:      1 + (n % 8),
    igr:        Math.round((0.1 + (n % 15) * 0.05) * 10) / 10,
  };
}
function mockQuarterly(code: string) {
  const n = h(code);
  return ["Q1", "Q2", "Q3", "Q4"].map((q, i) => ({
    quarter:  q,
    reports:  4 + ((n + i * 7) % 14),
    approved: 2 + ((n + i * 5) % 10),
    igr:      Math.round((0.5 + ((n + i * 3) % 15) * 0.1) * 10) / 10,
  }));
}
function mockMonthly(code: string) {
  const n = h(code);
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
    month:      m,
    submitted:  3 + ((n + i * 9) % 10),
    approved:   2 + ((n + i * 6) % 8),
    compliance: 60 + ((n + i * 4) % 38),
  }));
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
function complianceBadge(v: number) {
  if (v >= 85) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

// ─── KPI Drill-down Modal ─────────────────────────────────────────────────────
interface KpiModalProps {
  title: string;
  kpi: string;
  dept: Department;
  units: Unit[];
  color: string;
  onClose: () => void;
  onUnitClick: (u: Unit) => void;
}
function KpiModal({ title, kpi, dept, units, color, onClose, onUnitClick }: KpiModalProps) {
  const rows = units.map((u) => {
    const s = mockUnitStats(u.unit_code);
    const val =
      kpi === "reports"     ? s.reports     :
      kpi === "approved"    ? s.approved    :
      kpi === "pending"     ? s.pending     :
      kpi === "staff"       ? s.staff       :
      kpi === "tasks"       ? s.tasks       :
      kpi === "compliance"  ? s.compliance  :
      kpi === "igr"         ? s.igr         : s.reports;
    return { unit: u, val, stats: s };
  });
  const quarterly = mockQuarterly(dept.department_code);

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
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{dept.name} · Unit breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Bar chart — unit comparison */}
          {rows.length > 0 && (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows.map((r) => ({
                    name: r.unit.name.split(" ")[0],
                    value: r.val,
                  }))}
                  barSize={28}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                  <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} name={title} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Unit table — click to drill into unit */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Click a unit to view full details
            </p>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7]">
                  <TableHead className="text-xs font-bold text-slate-600">Unit</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Code</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">{title}</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-slate-400 py-6">
                      No units found for this department
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ unit, val, stats }) => (
                    <TableRow
                      key={unit.id}
                      className="hover:bg-[#f0fdf7] transition-colors cursor-pointer"
                      onClick={() => onUnitClick(unit)}
                    >
                      <TableCell className="text-sm font-medium text-[#145c3f] hover:underline">
                        {unit.name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">{unit.unit_code}</TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {val}{kpi === "compliance" ? "%" : kpi === "igr" ? "M" : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={`text-[10px] ${complianceBadge(stats.compliance)}`}>
                          {stats.compliance}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Quarterly trend */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">
              Quarterly Trend · {dept.name}
            </p>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterly} barSize={14} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                  <Bar dataKey="reports"  fill="#d1f5e4" radius={[4, 4, 0, 0]} name="Submitted" />
                  <Bar dataKey="approved" fill={color}   radius={[4, 4, 0, 0]} name="Approved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Quarterly Activity Drill-down Modal ──────────────────────────────────────
interface QuarterlyModalProps {
  quarter: string;
  dept: Department;
  units: Unit[];
  color: string;
  onClose: () => void;
  onUnitClick: (u: Unit) => void;
}
function QuarterlyModal({ quarter, dept, units, color, onClose, onUnitClick }: QuarterlyModalProps) {
  const rows = units.map((u) => {
    const s = mockUnitStats(u.unit_code);
    const qData = mockQuarterly(u.unit_code);
    const qIdx = ["Q1", "Q2", "Q3", "Q4"].indexOf(quarter);
    const qRow = qData[qIdx] ?? qData[0];
    return { unit: u, stats: s, qRow };
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
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{quarter} Activities</h3>
              <p className="text-xs text-slate-500">{dept.name} · Unit breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Grouped bar chart */}
          {rows.length > 0 && (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows.map((r) => ({
                    name: r.unit.name.split(" ")[0],
                    Reports:  r.qRow.reports,
                    Approved: r.qRow.approved,
                  }))}
                  barSize={16}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                  <Bar dataKey="Reports"  fill="#d1f5e4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Approved" fill={color}   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Click a unit to view full details
          </p>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Unit</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Reports</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Approved</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">IGR (M)</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-6">
                    No units found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ unit, stats, qRow }) => (
                  <TableRow
                    key={unit.id}
                    className="hover:bg-[#f0fdf7] transition-colors cursor-pointer"
                    onClick={() => onUnitClick(unit)}
                  >
                    <TableCell className="text-sm font-medium text-[#145c3f] hover:underline">
                      {unit.name}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-800">{qRow.reports}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">{qRow.approved}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">{qRow.igr}M</TableCell>
                    <TableCell className="text-right">
                      <Badge className={`text-[10px] ${complianceBadge(stats.compliance)}`}>
                        {stats.compliance}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Unit Detail Modal ────────────────────────────────────────────────────────
function UnitModal({
  unit, dept, color, onClose,
}: {
  unit: Unit; dept: Department; color: string; onClose: () => void;
}) {
  const us       = mockUnitStats(unit.unit_code);
  const quarterly = mockQuarterly(unit.unit_code);
  const monthly   = mockMonthly(unit.unit_code);
  const pct       = Math.round((us.completed / Math.max(1, us.tasks)) * 100);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{unit.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{unit.unit_code} · {dept.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* KPI mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Reports",  val: us.reports,  tint: "kpi-blue",   icon: <FileText    className="w-4 h-4 text-blue-600"    /> },
              { label: "Approved", val: us.approved, tint: "kpi-green",  icon: <CheckSquare className="w-4 h-4 text-emerald-600" /> },
              { label: "Pending",  val: us.pending,  tint: "kpi-amber",  icon: <Clock       className="w-4 h-4 text-amber-600"   /> },
              { label: "Staff",    val: us.staff,    tint: "kpi-purple", icon: <Users       className="w-4 h-4 text-purple-600"  /> },
            ].map((k) => (
              <div key={k.label} className="rounded-md p-2.5 border border-[#d4e8dc] bg-white shadow-2xs">
                <div className="w-7 h-7 rounded-md bg-[#e8f5ee] flex items-center justify-center mb-1.5">
                  {k.icon}
                </div>
                <p className="text-xl font-bold text-slate-900">{k.val}</p>
                <p className="text-[10px] font-semibold text-slate-600">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Task progress */}
          <div className="rounded-md bg-[#f8fdfb] border border-[#d4e8dc] p-3.5">
            <div className="flex justify-between text-xs text-slate-600 mb-2">
              <span className="font-bold">Task Completion</span>
              <span className="font-black">{us.completed}/{us.tasks} · {pct}%</span>
            </div>
            <Progress value={pct} className="h-2.5 bg-[#e8f5ee]" />
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />{us.completed} done
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />{us.tasks - us.completed} left
              </span>
              {us.overdue > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500" />{us.overdue} overdue
                </span>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Quarterly Activity</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterly} barSize={12} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #d4e8dc", fontSize: 10 }} />
                    <Bar dataKey="reports"  fill="#d1f5e4" radius={[4, 4, 0, 0]} name="Submitted" />
                    <Bar dataKey="approved" fill={color}   radius={[4, 4, 0, 0]} name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Compliance Trend</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #d4e8dc", fontSize: 10 }} />
                    <Line
                      type="monotone" dataKey="compliance" stroke={color}
                      strokeWidth={2} dot={{ r: 2, fill: color }} name="Compliance %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {unit.description && (
            <div className="rounded-xl bg-[#f8fdfb] border border-[#d4e8dc] p-3">
              <p className="text-[10px] font-bold text-slate-500 mb-1">ABOUT THIS UNIT</p>
              <p className="text-xs text-slate-600 leading-relaxed">{unit.description}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Modal state type ─────────────────────────────────────────────────────────
type ModalState =
  | { type: "kpi";       kpi: string; title: string }
  | { type: "quarterly"; quarter: string }
  | { type: "unit";      unit: Unit }
  | null;

// ─── Main DepartmentalDashboard ───────────────────────────────────────────────
interface Props {
  user?: AuthUser;
  onNewSubmission?: (view: string) => void;
}

export default function DepartmentalDashboard({ user }: Props) {
  // ── Real data state ──────────────────────────────────────────────────────────
  const [dept,       setDept]       = React.useState<Department | null>(null);
  const [units,      setUnits]      = React.useState<Unit[]>([]);
  const [staffCount, setStaffCount] = React.useState<number>(0);
  const [loading,    setLoading]    = React.useState(true);
  const [error,      setError]      = React.useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [modal,     setModal]     = React.useState<ModalState>(null);
  const [unitModal, setUnitModal] = React.useState<Unit | null>(null);

  // ── Fetch department + units + staff ─────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1. Resolve department — prefer user.department, else fetch all and match
        let resolvedDept: Department | null = null;

        if (user?.department_id) {
          // Fetch all departments (includes units) and find ours
          const res = await departmentsApi.list();
          const found = res.data.find((d) => d.id === user.department_id);
          if (found) resolvedDept = found;
        }

        if (!resolvedDept) {
          // Fallback: just grab the first department
          const res = await departmentsApi.list();
          resolvedDept = res.data[0] ?? null;
        }

        if (!resolvedDept || cancelled) return;
        setDept(resolvedDept);

        // 2. Fetch units for this department
        const unitRes = await unitsApi.list(resolvedDept.id);
        if (!cancelled) setUnits(unitRes.data);

        // 3. Staff count — count users in this department
        //    /admin/users is admin-only; use the units length as a proxy
        //    (real staff count can be wired once a self-service endpoint exists)
        const unitCount = unitRes.data.length;
        if (!cancelled) setStaffCount(unitCount > 0 ? unitCount * 2 : 1); // placeholder
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load department data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.department_id]);

  // ── Derived stats (mock until real report data is wired) ─────────────────────
  const deptCode    = dept?.department_code ?? "DEPT";
  const { color }   = getDeptConfig(deptCode);
  const deptStats   = React.useMemo(() => {
    if (!dept) return null;
    const n = h(deptCode);
    return {
      totalReports:  units.reduce((s, u) => s + mockUnitStats(u.unit_code).reports,  0) || 4 + (n % 14),
      approved:      units.reduce((s, u) => s + mockUnitStats(u.unit_code).approved, 0) || 2 + (n % 10),
      pending:       units.reduce((s, u) => s + mockUnitStats(u.unit_code).pending,  0) || n % 6,
      tasks:         units.reduce((s, u) => s + mockUnitStats(u.unit_code).tasks,    0) || 3 + (n % 10),
      completed:     units.reduce((s, u) => s + mockUnitStats(u.unit_code).completed,0) || n % 8,
      overdue:       units.reduce((s, u) => s + mockUnitStats(u.unit_code).overdue,  0) || 0,
      compliance:    units.length
        ? Math.round(units.reduce((s, u) => s + mockUnitStats(u.unit_code).compliance, 0) / units.length)
        : 60 + (n % 38),
      igr:           units.reduce((s, u) => s + mockUnitStats(u.unit_code).igr, 0) || Math.round((0.5 + (n % 15) * 0.1) * 10) / 10,
    };
  }, [dept, units, deptCode]);

  const quarterly = React.useMemo(() => mockQuarterly(deptCode), [deptCode]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openKpi = (kpi: string, title: string) =>
    setModal({ type: "kpi", kpi, title });
  const openQuarterly = (quarter: string) =>
    setModal({ type: "quarterly", quarter });
  const openUnit = (unit: Unit) => {
    setUnitModal(unit);
  };
  const closeModal = () => setModal(null);
  const closeUnitModal = () => setUnitModal(null);

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading department data…</p>
        </div>
      </div>
    );
  }

  if (error || !dept || !deptStats) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-semibold text-slate-700">
            {error ?? "Department not found"}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-[#d4e8dc] hover:bg-[#e8f5ee] text-xs"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const { icon: deptIcon } = getDeptConfig(deptCode);
  const taskPct = Math.round((deptStats.completed / Math.max(1, deptStats.tasks)) * 100);

  // ── KPI card definitions ──────────────────────────────────────────────────────
  const kpiCards = [
    {
      kpi: "reports", title: "Total Reports",
      value: deptStats.totalReports, icon: <FileText className="w-5 h-5 text-blue-600" />,
      tint: "kpi-blue", trend: "+12%", trendUp: true,
      sub: `${deptStats.approved} approved`,
    },
    {
      kpi: "approved", title: "Approved",
      value: deptStats.approved, icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
      tint: "kpi-green", trend: "+8%", trendUp: true,
      sub: `${Math.round((deptStats.approved / Math.max(1, deptStats.totalReports)) * 100)}% approval rate`,
    },
    {
      kpi: "pending", title: "Pending",
      value: deptStats.pending, icon: <Clock className="w-5 h-5 text-amber-600" />,
      tint: "kpi-amber", trend: deptStats.pending > 3 ? "+2" : "-1", trendUp: deptStats.pending <= 3,
      sub: deptStats.overdue > 0 ? `${deptStats.overdue} overdue` : "All on track",
    },
    {
      kpi: "staff", title: "Staff",
      value: staffCount || units.length * 2, icon: <Users className="w-5 h-5 text-purple-600" />,
      tint: "kpi-purple", trend: "Active", trendUp: true,
      sub: `${units.length} unit${units.length !== 1 ? "s" : ""}`,
    },
    {
      kpi: "compliance", title: "Compliance",
      value: `${deptStats.compliance}%`, icon: <CheckCircle2 className="w-5 h-5 text-teal-600" />,
      tint: deptStats.compliance >= 85 ? "kpi-green" : deptStats.compliance >= 70 ? "kpi-amber" : "kpi-red",
      trend: deptStats.compliance >= 80 ? "Good" : "Needs work", trendUp: deptStats.compliance >= 80,
      sub: "Reporting compliance",
    },
    {
      kpi: "tasks", title: "Tasks",
      value: deptStats.tasks, icon: <Activity className="w-5 h-5 text-indigo-600" />,
      tint: "kpi-blue", trend: `${taskPct}% done`, trendUp: taskPct >= 60,
      sub: `${deptStats.completed} completed`,
    },
  ];

  return (
    <div className="w-full space-y-3.5 p-1">
      {/* ── Department header ── */}
      <div
        className="rounded-lg p-3.5 flex items-center gap-3.5 shadow-2xs border border-[#d4e8dc]"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
      >
        <div
          className="w-11 h-11 rounded-md flex items-center justify-center text-white shadow-xs shrink-0"
          style={{ backgroundColor: color }}
        >
          {deptIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{dept.name}</h1>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            className={`text-xs font-bold ${complianceBadge(deptStats.compliance)}`}
          >
            {deptStats.compliance}% Compliance
          </Badge>
          <span className="text-[10px] text-slate-400">{units.length} units</span>
        </div>
      </div>

      {/* ── KPI Cards (all clickable) ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Key Performance Indicators · click to drill down
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCards.map((k) => (
            <button
              key={k.kpi}
              onClick={() => openKpi(k.kpi, k.title)}
              className="rounded-lg p-3.5 border border-[#d4e8dc] bg-white shadow-2xs hover:border-[#145c3f] transition-all text-left group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-[#e8f5ee] flex items-center justify-center shadow-2xs">
                  {k.icon}
                </div>
                <span
                  className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    k.trendUp
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {k.trendUp
                    ? <TrendingUp className="w-2.5 h-2.5" />
                    : <TrendingDown className="w-2.5 h-2.5" />}
                  {k.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{k.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.title}</p>
              {k.sub && <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>}
              <p className="text-[9px] text-slate-400 mt-1 group-hover:text-[#145c3f] transition-colors">
                View unit breakdown →
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Quarterly Activities (each quarter clickable) ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Quarterly Activities · click a quarter to drill down by unit
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quarterly.map((q) => (
            <button
              key={q.quarter}
              onClick={() => openQuarterly(q.quarter)}
              className="bg-white rounded-lg p-3.5 border border-[#d4e8dc] shadow-2xs hover:border-[#145c3f] transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: color }}
                >
                  {q.quarter}
                </span>
                <BarChart3 className="w-4 h-4 text-slate-300 group-hover:text-[#25a872] transition-colors" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Reports</span>
                  <span className="font-bold text-slate-900">{q.reports}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Approved</span>
                  <span className="font-bold text-emerald-700">{q.approved}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">IGR</span>
                  <span className="font-bold text-blue-700">{q.igr}M</span>
                </div>
              </div>
              <Progress
                value={Math.round((q.approved / Math.max(1, q.reports)) * 100)}
                className="h-1.5 mt-2.5 bg-[#e8f5ee]"
              />
              <p className="text-[9px] text-slate-400 mt-1.5 group-hover:text-[#145c3f] transition-colors">
                View by unit →
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Units Grid (each unit clickable) ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Department Units · click to view unit details
        </p>
        {units.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d4e8dc] p-6 text-center">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No units found for this department</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((unit) => {
              const us  = mockUnitStats(unit.unit_code);
              const pct = Math.round((us.completed / Math.max(1, us.tasks)) * 100);
              return (
                <button
                  key={unit.id}
                  onClick={() => openUnit(unit)}
                  className="bg-white rounded-lg p-3.5 border border-[#d4e8dc] shadow-2xs hover:border-[#145c3f] transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-[#145c3f] transition-colors">
                        {unit.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">{unit.unit_code}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${complianceBadge(us.compliance)}`}>
                      {us.compliance}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2.5">
                    {[
                      { label: "Reports", val: us.reports,  color: "text-blue-700"    },
                      { label: "Pending", val: us.pending,  color: "text-amber-700"   },
                      { label: "Staff",   val: us.staff,    color: "text-purple-700"  },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-[9px] text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Tasks</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-[#e8f5ee]" />
                  </div>

                  <p className="text-[9px] text-slate-400 mt-2 group-hover:text-[#145c3f] transition-colors">
                    View full details →
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal?.type === "kpi" && dept && (
          <KpiModal
            key="kpi-modal"
            title={modal.title}
            kpi={modal.kpi}
            dept={dept}
            units={units}
            color={color}
            onClose={closeModal}
            onUnitClick={(u) => { closeModal(); openUnit(u); }}
          />
        )}
        {modal?.type === "quarterly" && dept && (
          <QuarterlyModal
            key="quarterly-modal"
            quarter={modal.quarter}
            dept={dept}
            units={units}
            color={color}
            onClose={closeModal}
            onUnitClick={(u) => { closeModal(); openUnit(u); }}
          />
        )}
        {unitModal && dept && (
          <UnitModal
            key="unit-modal"
            unit={unitModal}
            dept={dept}
            color={color}
            onClose={closeUnitModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
