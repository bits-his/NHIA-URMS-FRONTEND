import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  ArrowLeft, TrendingUp, TrendingDown, MapPin, FileText,
  CheckSquare, Clock, AlertCircle, ChevronRight, Users,
  BarChart3, Activity, Building2, Layers, X, RefreshCw,
  Banknote, ShieldCheck, Wifi, LayoutGrid, Scale,
  Megaphone, BookOpen, PackageSearch, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "motion/react";
import type { AuthUser } from "@/src/store/authSlice";
import {
  statesApi, departmentsApi, unitsApi,
  type StateOffice, type Department, type Unit,
} from "@/lib/adminApi";

//  Dept icon/colour config -
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

//  Mock helpers (all stats stay dummy) 
function seed(s: string) { return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0); }

function mockStateStats(code: string) {
  const n = seed(code);
  const reports    = 4  + (n % 20);
  const pending    = n  % Math.max(1, reports);
  const approved   = reports - pending;
  const compliance = 62 + (n % 37);
  const enrollees  = 12000 + (n % 168000);
  const igr        = 500000 + (n % 14500000);
  const trendUp    = n % 3 !== 0;
  return { reports, pending, approved, compliance, enrollees, igr, trendUp };
}

function mockDeptStats(code: string) {
  const n = seed(code);
  const reports    = 2  + (n % 14);
  const pending    = n  % Math.max(1, reports);
  const approved   = reports - pending;
  const compliance = 60 + (n % 39);
  const staff      = 3  + (n % 18);
  const trendUp    = n % 3 !== 0;
  return { reports, pending, approved, compliance, staff, trendUp };
}

function mockUnitStats(code: string) {
  const n = seed(code);
  const tasks     = 2 + (n % 10);
  const completed = n % Math.max(1, tasks);
  const overdue   = n % 3 === 0 ? 1 : 0;
  return { tasks, completed, overdue };
}

function mockQuarterly(code: string) {
  const n = seed(code);
  return ["Q1","Q2","Q3","Q4"].map((q, i) => ({
    quarter:  q,
    reports:  4  + ((n + i * 7)  % 16),
    approved: 2  + ((n + i * 5)  % 12),
    igr:      Math.round((0.5 + ((n + i * 3) % 15) * 0.1) * 10) / 10,
  }));
}

//  Badge helpers 
function complianceColor(v: number) {
  if (v >= 90) return "text-emerald-600";
  if (v >= 75) return "text-amber-600";
  return "text-rose-600";
}
function complianceBg(v: number) {
  if (v >= 90) return "#25a872";
  if (v >= 75) return "#f59e0b";
  return "#ef4444";
}
function complianceBadgeCls(v: number) {
  if (v >= 90) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v >= 75) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}


// ─── Quarterly Drill Modal (zone-level KPI → quarters → states) ──────────────
interface QuarterlyZoneModalProps {
  title: string;
  kpi: "reports" | "approved" | "pending";
  states: StateOffice[];
  onClose: () => void;
  onStateClick: (s: StateOffice) => void;
}
function QuarterlyZoneModal({ title, kpi, states, onClose, onStateClick }: QuarterlyZoneModalProps) {
  const [selectedQ, setSelectedQ] = React.useState<string>("Q1");

  // Aggregate quarterly data across all states
  const zoneQuarterly = ["Q1","Q2","Q3","Q4"].map((q, i) => {
    const total = states.reduce((sum, st) => {
      const qData = mockQuarterly(st.code)[i];
      const val = kpi === "reports" ? qData.reports : kpi === "approved" ? qData.approved : (qData.reports - qData.approved);
      return sum + val;
    }, 0);
    return { quarter: q, value: total };
  });

  const qIdx = ["Q1","Q2","Q3","Q4"].indexOf(selectedQ);
  const stateRows = states.map((st) => {
    const qData = mockQuarterly(st.code)[qIdx];
    const val = kpi === "reports" ? qData.reports : kpi === "approved" ? qData.approved : (qData.reports - qData.approved);
    const stats = mockStateStats(st.code);
    return { state: st, val, stats };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc] bg-gradient-to-r from-[#f0fdf7] to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#145c3f] flex items-center justify-center text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title} · Quarterly Breakdown</h3>
              <p className="text-xs text-slate-500">Select a quarter to see state-level data</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Quarter tabs */}
          <div className="grid grid-cols-4 gap-2">
            {zoneQuarterly.map((q) => {
              const isActive = selectedQ === q.quarter;
              return (
                <button
                  key={q.quarter}
                  onClick={() => setSelectedQ(q.quarter)}
                  className={`rounded-md p-2.5 border text-left transition-all ${
                    isActive ? "bg-[#145c3f] border-transparent text-white shadow-xs" : "border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:shadow-2xs"
                  }`}
                >
                  <p className={`text-xs font-black ${isActive ? "text-white" : "text-slate-900"}`}>{q.quarter}</p>
                  <p className={`text-xl font-black mt-0.5 ${isActive ? "text-white" : "text-slate-900"}`}>{q.value}</p>
                  <p className={`text-[9px] mt-0.5 ${isActive ? "text-white/70" : "text-slate-500"}`}>{title}</p>
                </button>
              );
            })}
          </div>

          {/* Bar chart — states for selected quarter */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{selectedQ} · {title} by State</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateRows.map((r) => ({ name: r.state.code, value: r.val }))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #d4e8dc", fontSize: 11 }} />
                  <Bar dataKey="value" fill="#25a872" radius={[5, 5, 0, 0]} name={title} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* State rows — clickable */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">State Breakdown · {selectedQ}</p>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7]">
                  <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">{title}</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateRows.map(({ state, val, stats }) => (
                  <TableRow key={state.id} className="hover:bg-[#f0fdf7] transition-colors cursor-pointer"
                    onClick={() => { onClose(); onStateClick(state); }}>
                    <TableCell className="text-sm font-medium text-[#145c3f] hover:underline">{state.description}</TableCell>
                    <TableCell className="text-right font-black text-slate-900">{val}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={`text-[10px] ${complianceBadgeCls(stats.compliance)}`}>{stats.compliance}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Department Unit Drill Modal (state dept → quarters → units) ─────────────
interface DeptUnitDrillModalProps {
  dept: Department;
  units: Unit[];
  color: string;
  onClose: () => void;
}
function DeptUnitDrillModal({ dept, units, color, onClose }: DeptUnitDrillModalProps) {
  const [selectedQ, setSelectedQ] = React.useState<string>("Q1");
  const [expandedUnit, setExpandedUnit] = React.useState<number | null>(null);

  const quarterly = mockQuarterly(dept.department_code);
  const qIdx = ["Q1","Q2","Q3","Q4"].indexOf(selectedQ);

  function unitQData(unitCode: string) {
    const n = seed(unitCode);
    return ["Q1","Q2","Q3","Q4"].map((q, i) => ({
      quarter: q,
      reports:  2 + ((n + i * 5) % 10),
      approved: 1 + ((n + i * 3) % 8),
      pending:  (n + i) % 4,
      igr:      Math.round((0.1 + ((n + i * 2) % 10) * 0.08) * 10) / 10,
    }));
  }

  const unitRows = units.map((u) => {
    const qd = unitQData(u.unit_code)[qIdx];
    const us = mockUnitStats(u.unit_code);
    return { unit: u, qd, us };
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: color }}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
              <p className="text-xs text-slate-500">Quarterly · Unit breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Quarter tabs */}
          <div className="grid grid-cols-4 gap-2">
            {quarterly.map((q) => {
              const isActive = selectedQ === q.quarter;
              return (
                <button key={q.quarter} onClick={() => { setSelectedQ(q.quarter); setExpandedUnit(null); }}
                  className={`rounded-md p-2.5 border text-left transition-all ${
                    isActive ? "border-transparent text-white shadow-xs" : "border-[#d4e8dc] bg-white hover:border-[#145c3f]"
                  }`}
                  style={isActive ? { backgroundColor: color } : {}}>
                  <p className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-900"}`}>{q.quarter}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isActive ? "text-white" : "text-slate-900"}`}>{q.reports}</p>
                  <p className={`text-[9px] mt-0.5 ${isActive ? "text-white/70" : "text-slate-500"}`}>{title}</p>
                </button>
              );
            })}
          </div>

          {/* Unit rows */}
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Units · {selectedQ}</p>
          {unitRows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No units found</p>
          ) : (
            <div className="space-y-2">
              {unitRows.map(({ unit, qd, us }) => {
                const isOpen = expandedUnit === unit.id;
                const pct = Math.round((us.completed / Math.max(1, us.tasks)) * 100);
                return (
                  <div key={unit.id} className="rounded-lg border border-[#d4e8dc] overflow-hidden">
                    <button onClick={() => setExpandedUnit(isOpen ? null : unit.id)}
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
                        <span className="text-sm font-bold" style={{ color }}>{qd.reports}</span>
                        <span className="text-[10px] text-slate-400">reports</span>
                        <Progress value={pct} className="w-14 h-1.5 bg-[#e8f5ee]" />
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div className="px-4 pb-3.5 pt-2 bg-[#f8fdfb] border-t border-[#e8f5ee]">
                            {unit.description && <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">{unit.description}</p>}
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: "Reports",  val: qd.reports,  cls: "text-blue-700"    },
                                { label: "Approved", val: qd.approved, cls: "text-emerald-700" },
                                { label: "Pending",  val: qd.pending,  cls: "text-amber-700"   },
                                { label: "IGR (₦M)", val: qd.igr,      cls: "text-purple-700"  },
                              ].map((s) => (
                                <div key={s.label} className="rounded-md bg-white border border-[#d4e8dc] p-2 text-center">
                                  <p className={`text-base font-bold ${s.cls}`}>{s.val}</p>
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
      </motion.div>
    </div>
  );
}

// ─── State Detail Panel (state → departments → units) ────────────────────────
interface StateDetailPanelProps {
  state: StateOffice;
  zoneName: string;
  departments: Department[];
  onBack: () => void;
}
function StateDetailPanel({ state, zoneName, departments, onBack }: StateDetailPanelProps) {
  const [selectedDept, setSelectedDept] = React.useState<Department | null>(null);
  const [deptUnits, setDeptUnits]       = React.useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(false);
  const [unitError, setUnitError]       = React.useState<string | null>(null);
  const [deptDrillModal, setDeptDrillModal] = React.useState<Department | null>(null);
  const [stateKpiModal, setStateKpiModal]   = React.useState<{
    kpi: "reports" | "approved" | "pending"; label: string;
  } | null>(null);

  const stats     = mockStateStats(state.code);
  const quarterly = mockQuarterly(state.code);

  // Fetch units when a dept is selected for the drill modal
  React.useEffect(() => {
    if (!deptDrillModal) return;
    let cancelled = false;
    setLoadingUnits(true);
    setUnitError(null);
    unitsApi.list(deptDrillModal.id)
      .then((r) => { if (!cancelled) setDeptUnits(r.data); })
      .catch((e) => { if (!cancelled) setUnitError(e?.message); })
      .finally(() => { if (!cancelled) setLoadingUnits(false); });
    return () => { cancelled = true; };
  }, [deptDrillModal?.id]);

  const { color: stateColor } = { color: "#145c3f" };

  return (
    <motion.div key={`state-${state.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack}
          className="w-8 h-8 rounded-md flex items-center justify-center border border-[#d4e8dc] hover:bg-[#e8f5ee] text-slate-600 hover:text-[#145c3f] transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 truncate">{state.description} State</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {zoneName} Zone
            <span className="font-mono ml-1 text-slate-400">{state.code}</span>
          </p>
        </div>
        <Badge className={`text-xs px-2.5 py-0.5 font-bold shrink-0 ${complianceBadgeCls(stats.compliance)}`}>
          {stats.compliance}% Compliance
        </Badge>
      </div>

      {/* KPI cards — clickable → quarterly drill */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Click a card to see quarterly breakdown
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { kpi: "reports"  as const, label: "Reports",  value: stats.reports,  sub: "This year",       icon: <FileText    className="w-4 h-4 text-blue-600"    />, tint: "kpi-blue"   },
            { kpi: "approved" as const, label: "Approved", value: stats.approved, sub: "Verified",        icon: <CheckSquare className="w-4 h-4 text-emerald-600" />, tint: "kpi-green"  },
            { kpi: "pending"  as const, label: "Pending",  value: stats.pending,  sub: "Awaiting action", icon: <Clock       className="w-4 h-4 text-amber-600"   />, tint: "kpi-amber"  },
            { kpi: "reports"  as const, label: "Enrollees",value: stats.enrollees.toLocaleString(), sub: "Active", icon: <Users className="w-4 h-4 text-purple-600" />, tint: "kpi-purple" },
          ].map((k, idx) => (
            <button key={idx} onClick={() => setStateKpiModal({ kpi: k.kpi, label: k.label })}
              className="rounded-lg p-3.5 border border-[#d4e8dc] bg-white shadow-2xs text-left group hover:border-[#145c3f] transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-[#e8f5ee] flex items-center justify-center shadow-2xs">{k.icon}</div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#145c3f] transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{k.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
              <p className="text-[9px] text-slate-400 mt-1 group-hover:text-[#145c3f] transition-colors">View quarterly →</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts — clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Quarterly Reports</CardTitle>
            <CardDescription className="text-xs">Click chart to drill down</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly} barSize={16} barGap={4} style={{ cursor: "pointer" }}
                onClick={() => setStateKpiModal({ kpi: "reports", label: "Reports" })}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }} />
                <Bar dataKey="reports"  fill="#d1f5e4" radius={[3,3,0,0]} name="Submitted" />
                <Bar dataKey="approved" fill="#25a872" radius={[3,3,0,0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">IGR Trend (₦M)</CardTitle>
            <CardDescription className="text-xs">Internally Generated Revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quarterly}>
                <defs>
                  <linearGradient id={`igrGrad-${state.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#25a872" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#25a872" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }} />
                <Area type="monotone" dataKey="igr" stroke="#25a872" strokeWidth={2}
                  fill={`url(#igrGrad-${state.id})`} name="IGR (₦M)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Departments — real data, all clickable */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#25a872]" />
          Departments
          <span className="text-[10px] font-normal text-slate-400 ml-1">— click to see quarterly unit breakdown</span>
        </h3>
        {departments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d4e8dc] p-6 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No departments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => {
              const ds = mockDeptStats(dept.department_code);
              const { color, icon } = getDeptVisual(dept.department_code);
              return (
                <button key={dept.id} onClick={() => setDeptDrillModal(dept)}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-[#d4e8dc] bg-white hover:border-[#145c3f] hover:shadow-2xs transition-all text-left group cursor-pointer">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: color }}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#145c3f] transition-colors leading-tight">{dept.name}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#25a872] shrink-0 mt-0.5 transition-colors" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{dept.department_code}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-[#e8f5ee] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${ds.compliance}%`, backgroundColor: complianceBg(ds.compliance) }} />
                      </div>
                      <span className={`text-[10px] font-bold ${complianceColor(ds.compliance)}`}>{ds.compliance}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-500"><span className="font-bold text-slate-700">{ds.reports}</span> reports</span>
                      {ds.pending > 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 h-4">{ds.pending} pending</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* State quarterly KPI modal */}
      <AnimatePresence>
        {stateKpiModal && (
          <StateQuarterlyModal
            key="state-kpi"
            state={state}
            kpi={stateKpiModal.kpi}
            kpiLabel={stateKpiModal.label}
            onClose={() => setStateKpiModal(null)}
          />
        )}
        {deptDrillModal && (
          loadingUnits ? (
            <div key="loading" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-2xl p-6 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-600">Loading units…</span>
              </div>
            </div>
          ) : (
            <DeptUnitDrillModal
              key={`dept-drill-${deptDrillModal.id}`}
              dept={deptDrillModal}
              units={deptUnits}
              color={getDeptVisual(deptDrillModal.department_code).color}
              onClose={() => { setDeptDrillModal(null); setDeptUnits([]); }}
            />
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── State quarterly KPI modal (state-level KPI → Q1-Q4 breakdown) ────────────
interface StateQuarterlyModalProps {
  state: StateOffice;
  kpi: "reports" | "approved" | "pending";
  kpiLabel: string;
  onClose: () => void;
}
function StateQuarterlyModal({ state, kpi, kpiLabel, onClose }: StateQuarterlyModalProps) {
  const quarterly = mockQuarterly(state.code);
  const rows = quarterly.map((q) => ({
    quarter: q.quarter,
    value: kpi === "reports" ? q.reports : kpi === "approved" ? q.approved : (q.reports - q.approved),
    igr: q.igr,
  }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-[#d4e8dc] shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4e8dc] bg-gradient-to-r from-[#f0fdf7] to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#145c3f] flex items-center justify-center text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{kpiLabel} · {state.description}</h3>
              <p className="text-xs text-slate-500">Quarterly breakdown — 2025</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 11 }} />
                <Bar dataKey="value" fill="#25a872" radius={[3,3,0,0]} name={kpiLabel} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {rows.map((r) => (
              <div key={r.quarter} className="rounded-md bg-[#f0fdf7] border border-[#d4e8dc] p-2.5 text-center">
                <p className="text-xs font-bold text-slate-500">{r.quarter}</p>
                <p className="text-2xl font-bold text-[#145c3f] mt-0.5">{r.value}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{kpiLabel}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main ZonalDirectorDashboard ──────────────────────────────────────────────
interface ZonalDirectorDashboardProps {
  user?: AuthUser;
  zoneName?: string;
  onReviewReports?: () => void;
}

export default function ZonalDirectorDashboard({
  user,
  zoneName = "South West",
  onReviewReports,
}: ZonalDirectorDashboardProps) {
  // ── Real data ────────────────────────────────────────────────────────────────
  const [states,      setStates]      = React.useState<StateOffice[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading,     setLoading]     = React.useState(true);
  const [fetchError,  setFetchError]  = React.useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedState, setSelectedState] = React.useState<StateOffice | null>(null);
  const [kpiModal, setKpiModal] = React.useState<{
    kpi: "reports" | "approved" | "pending"; title: string;
  } | null>(null);

  // ── Fetch zone's states + all departments ─────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const [stateRes, deptRes] = await Promise.all([
          statesApi.list(user?.zone_id),   // states under this zone
          departmentsApi.list(),            // all departments (shared across states)
        ]);
        if (!cancelled) {
          setStates(stateRes.data);
          setDepartments(deptRes.data);
        }
      } catch (err: any) {
        if (!cancelled) setFetchError(err?.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.zone_id]);

  // ── Derived mock aggregate stats ──────────────────────────────────────────────
  const allStateStats = React.useMemo(
    () => states.map((s) => ({ state: s, ...mockStateStats(s.code) })),
    [states]
  );

  const totalReports   = allStateStats.reduce((a, s) => a + s.reports,    0);
  const totalPending   = allStateStats.reduce((a, s) => a + s.pending,    0);
  const totalApproved  = allStateStats.reduce((a, s) => a + s.approved,   0);
  const avgCompliance  = allStateStats.length
    ? Math.round(allStateStats.reduce((a, s) => a + s.compliance, 0) / allStateStats.length)
    : 0;

  // Zone-level quarterly trend (aggregate across states)
  const zoneTrend = React.useMemo(() => {
    return ["Q1","Q2","Q3","Q4"].map((q, i) => ({
      quarter: q,
      reports:  states.reduce((sum, st) => sum + mockQuarterly(st.code)[i].reports,  0) || 30 + i * 5,
      approved: states.reduce((sum, st) => sum + mockQuarterly(st.code)[i].approved, 0) || 20 + i * 4,
    }));
  }, [states]);

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading zone data…</p>
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

  // ── State detail view ─────────────────────────────────────────────────────────
  if (selectedState) {
    return (
      <AnimatePresence mode="wait">
        <StateDetailPanel
          key={selectedState.id}
          state={selectedState}
          zoneName={zoneName}
          departments={departments}
          onBack={() => setSelectedState(null)}
        />
      </AnimatePresence>
    );
  }

  // ── Main zone overview ────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div key="zonal-dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }} className="w-full space-y-3.5">

        {/* Zone header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-[#25a872]" />
              <span className="text-xs font-bold text-[#25a872] uppercase tracking-wider">{zoneName} Zone</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Zonal Performance Dashboard</h1>
          </div>
          {onReviewReports && (
            <Button onClick={onReviewReports}
              className="h-8 text-xs rounded-md bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-1.5 shadow-xs">
              <CheckSquare className="w-3.5 h-3.5" /> Review Reports
            </Button>
          )}
        </div>

        {/* ── KPI cards — all clickable → quarterly modal ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Click a card to see quarterly breakdown by state
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { kpi: "reports"  as const, title: "Total Reports",  value: totalReports,  sub: "All states · 2025",    icon: <FileText    className="w-4 h-4 text-blue-600"    />, tint: "kpi-blue"   },
              { kpi: "pending"  as const, title: "Pending Review", value: totalPending,  sub: "Awaiting action",      icon: <Clock       className="w-4 h-4 text-amber-600"   />, tint: "kpi-amber"  },
              { kpi: "approved" as const, title: "Approved",       value: totalApproved, sub: "Verified submissions", icon: <CheckSquare className="w-4 h-4 text-emerald-600" />, tint: "kpi-green"  },
              { kpi: "reports"  as const, title: "Avg Compliance", value: `${avgCompliance}%`, sub: "Zone average",  icon: <Activity    className="w-4 h-4 text-purple-600"  />, tint: "kpi-purple" },
            ].map((k, idx) => (
              <button key={idx} onClick={() => setKpiModal({ kpi: k.kpi, title: k.title })}
                className="rounded-lg p-3.5 border border-[#d4e8dc] bg-white shadow-2xs text-left group hover:border-[#145c3f] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-md bg-[#e8f5ee] flex items-center justify-center shadow-2xs">{k.icon}</div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#145c3f] transition-colors" />
                </div>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{k.value}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
                <p className="text-[9px] text-slate-400 mt-1 group-hover:text-[#145c3f] transition-colors">
                  View quarterly → states →
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
          {/* Left: chart + states table */}
          <div className="xl:col-span-2 space-y-3.5">

            {/* Zone trend chart — clickable */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Zonal Report Trend</CardTitle>
                  <CardDescription className="text-xs">Submitted vs Approved · click to drill down</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#d1f5e4] inline-block" />Submitted</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#25a872] inline-block" />Approved</span>
                </div>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneTrend} barSize={18} barGap={4} style={{ cursor: "pointer" }}
                    onClick={() => setKpiModal({ kpi: "reports", title: "Total Reports" })}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ borderRadius: 6, border: "1px solid #d4e8dc", fontSize: 12 }} />
                    <Bar dataKey="reports"  fill="#d1f5e4" radius={[3,3,0,0]} name="Submitted" />
                    <Bar dataKey="approved" fill="#25a872" radius={[3,3,0,0]} name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* States table — all rows clickable */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">
                  State Breakdown
                  <span className="ml-2 text-[10px] font-normal text-slate-400">— click any row to drill down</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {states.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No states found for this zone</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-center">Reports</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-center">Pending</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-center">Approved</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Compliance</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allStateStats.map(({ state, reports, pending, approved, compliance, trendUp }) => (
                        <TableRow key={state.id} className="hover:bg-[#f0fdf7] transition-colors cursor-pointer group"
                          onClick={() => setSelectedState(state)}>
                          <TableCell className="text-sm font-semibold text-slate-800 group-hover:text-[#145c3f] transition-colors">
                            <span className="flex items-center gap-1.5">
                              {state.description}
                              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#25a872] transition-colors" />
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-center font-mono font-semibold">{reports}</TableCell>
                          <TableCell className="text-center">
                            {pending > 0
                              ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">{pending}</Badge>
                              : <span className="text-xs text-slate-400">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">{approved}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#e8f5ee] rounded-full overflow-hidden w-20">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${compliance}%`, backgroundColor: complianceBg(compliance) }} />
                              </div>
                              <span className={`text-xs font-bold ${complianceColor(compliance)}`}>{compliance}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {trendUp
                              ? <span className="flex items-center justify-end gap-1 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3 h-3" /> Up</span>
                              : <span className="flex items-center justify-end gap-1 text-rose-500 text-xs font-semibold"><TrendingDown className="w-3 h-3" /> Down</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-3.5">
            {/* Compliance ranking */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Compliance Ranking</CardTitle>
                <CardDescription className="text-xs">Click a state to drill down</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...allStateStats]
                  .sort((a, b) => b.compliance - a.compliance)
                  .slice(0, 7)
                  .map(({ state, compliance }, i) => (
                    <button key={state.id} onClick={() => setSelectedState(state)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-md bg-[#f0fdf7] border border-[#d4e8dc] hover:border-[#145c3f] hover:bg-[#e8f5ee] transition-all group cursor-pointer">
                      <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 ${
                        i === 0 ? "bg-[#25a872]" : i === 1 ? "bg-[#3b82f6]" : i === 2 ? "bg-[#f59e0b]" : "bg-slate-300"
                      }`}>{i + 1}</span>
                      <p className="text-xs font-semibold text-slate-800 flex-1 text-left truncate group-hover:text-[#145c3f]">
                        {state.description}
                      </p>
                      <span className={`text-xs font-bold ${complianceColor(compliance)}`}>{compliance}%</span>
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#25a872]" />
                    </button>
                  ))}
              </CardContent>
            </Card>

            {/* Needs attention */}
            <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allStateStats
                  .filter((s) => s.compliance < 80 || s.pending > 5)
                  .slice(0, 4)
                  .map(({ state, compliance, pending }) => (
                    <button key={state.id} onClick={() => setSelectedState(state)}
                      className="w-full flex items-start gap-2.5 p-2 rounded-md bg-rose-50 border border-rose-100 hover:border-rose-300 transition-all text-left group cursor-pointer">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-rose-700">{state.description}</p>
                        <p className="text-[10px] text-rose-500">
                          {compliance < 80 ? `${compliance}% compliance` : ""}
                          {compliance < 80 && pending > 5 ? " · " : ""}
                          {pending > 5 ? `${pending} pending` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-rose-300 group-hover:text-rose-500 shrink-0 mt-0.5" />
                    </button>
                  ))}
                {allStateStats.filter((s) => s.compliance < 80 || s.pending > 5).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">All states performing well ✓</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Zone-level quarterly KPI modal */}
        <AnimatePresence>
          {kpiModal && (
            <QuarterlyZoneModal
              key="zone-kpi-modal"
              title={kpiModal.title}
              kpi={kpiModal.kpi}
              states={states}
              onClose={() => setKpiModal(null)}
              onStateClick={(s) => { setKpiModal(null); setSelectedState(s); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
