import * as React from "react";
import { motion } from "motion/react";
import {
  RefreshCw, Loader2, MessageSquare, ShieldAlert, CheckCircle2,
  AlertTriangle, Scale, Building2, MapPin, Gavel, Activity,
  ArrowUpRight, ChevronRight, Timer,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { complianceApi, servicomApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import {
  buildComplianceDrillRows,
  computeComplianceKpis,
  COMPLIANCE_DRILL_TITLES,
  type ComplianceDrillKind,
} from "../compliance/complianceDrill";
import { DrillHint } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel, {
  type DrillContext,
  type DrillRow,
} from "@/components/dashboard/DashboardDrillPanel";
import type { DrillStatChip } from "@/components/dashboard/drillStats";
import HcfFacilitySelect from "../servicom/HcfFacilitySelect";

interface Props {
  onNavigate?: (path: string) => void;
}

type GeoOpt = { id: number; description: string };
type ComplaintDrillKind = "total" | "open" | "escalated" | "resolved" | "sla";
type StatTone = "default" | "ok" | "warn" | "danger";

const COMPLAINT_DRILL_TITLES: Record<ComplaintDrillKind, string> = {
  total: "All Complaints",
  open: "Open Complaints",
  escalated: "Escalated Complaints",
  resolved: "Resolved / Closed Complaints",
  sla: "Complaints Resolved Within SLA",
};

const MODULE_NAME = "Director Enforcement";
const PIE_COLORS = ["#145c3f", "#25a872", "#94a3b8", "#f59e0b", "#e11d48", "#64748b"];

const TONE: Record<StatTone, { icon: string; accent: string }> = {
  default: { icon: "bg-[#e8f5ee] text-[#145c3f]", accent: "bg-[#25a872]" },
  ok: { icon: "bg-[#e8f5ee] text-[#145c3f]", accent: "bg-[#145c3f]" },
  warn: { icon: "bg-amber-50 text-amber-700", accent: "bg-amber-500" },
  danger: { icon: "bg-rose-50 text-rose-700", accent: "bg-rose-500" },
};

function ChartEmpty({ message = "No data for this filter." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  onClick,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
  delay?: number;
}) {
  const t = TONE[tone];
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-[#d4e8dc] bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-[#25a872]/50 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#145c3f]/30"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.accent}`} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.icon}`}>
          {icon}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#145c3f] transition-colors" />
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-[10px] font-medium text-slate-400">
        {hint || "View details"}
      </p>
    </motion.button>
  );
}

function matchesFacility(text: string | null | undefined, q: string, exact = false) {
  if (!q.trim()) return true;
  const hay = String(text || "").toLowerCase();
  const needle = q.trim().toLowerCase();
  return exact ? hay === needle : hay.includes(needle);
}

function isComplaintOpen(status?: string) {
  const s = String(status || "").toLowerCase();
  return !s.includes("resolv") && !s.includes("closed") && !s.includes("close");
}

function isComplaintEscalated(row: any) {
  return !!row?.escalated || String(row?.status || "").toLowerCase().includes("escalat");
}

function isComplaintResolved(status?: string) {
  const s = String(status || "").toLowerCase();
  return s.includes("resolv") || s.includes("closed") || s.includes("close");
}

function buildComplaintDrillRows(complaints: any[], kind: ComplaintDrillKind): DrillRow[] {
  const filtered = complaints.filter((c) => {
    if (kind === "total") return true;
    if (kind === "open") return isComplaintOpen(c.status);
    if (kind === "escalated") return isComplaintEscalated(c);
    if (kind === "resolved") return isComplaintResolved(c.status);
    if (kind === "sla") return c.resolution_within_sla === true || c.resolution_within_sla === 1;
    return true;
  });

  return filtered.map((c) => ({
    id: c.id,
    reference: c.complaint_number ?? null,
    title: c.facility_name || c.respondent_name || c.complainant_name || "—",
    subtitle: [
      c.complaint_category || c.category,
      c.complaint_domain,
      c.priority_rating,
    ].filter(Boolean).join(" · ") || null,
    status: c.status ?? null,
    date: c.date_received ?? c.complaint_date ?? c.createdAt ?? null,
    state_name: c.state?.description ?? null,
    zone_name: c.zone?.description ?? null,
    state_id: c.state_id ?? null,
    zone_id: c.zone_id ?? null,
    meta: "complaint",
  }));
}

function buildMixedGeoRows(
  reports: any[],
  complaints: any[],
  opts: { zone?: string; state?: string; facility?: string },
): DrillRow[] {
  const rows: DrillRow[] = [];
  for (const r of reports) {
    const zone = r.zone?.description || "Unknown";
    const state = r.state?.description || "Unknown";
    const facility = r.facility_name || "Unspecified facility";
    if (opts.zone && zone !== opts.zone) continue;
    if (opts.state && state !== opts.state) continue;
    if (opts.facility && facility !== opts.facility) continue;
    rows.push({
      id: `comp-${r.id}`,
      reference: r.reference_id ?? null,
      title: facility,
      subtitle: `Compliance · ${r.officer_name || "—"}`,
      status: r.status ?? "Compliance",
      date: r.date_submitted ?? null,
      state_name: state,
      zone_name: zone,
      state_id: r.state_id ?? null,
      zone_id: r.zone_id ?? null,
      meta: "compliance",
    });
  }
  for (const c of complaints) {
    const zone = c.zone?.description || "Unknown";
    const state = c.state?.description || "Unknown";
    const facility = c.facility_name || c.respondent_name || "Unspecified facility";
    if (opts.zone && zone !== opts.zone) continue;
    if (opts.state && state !== opts.state) continue;
    if (opts.facility && facility !== opts.facility) continue;
    rows.push({
      id: `cmp-${c.id}`,
      reference: c.complaint_number ?? null,
      title: facility,
      subtitle: [
        "Complaint",
        c.complaint_category || c.category,
        c.priority_rating,
      ].filter(Boolean).join(" · "),
      status: c.status ?? null,
      date: c.date_received ?? c.complaint_date ?? null,
      state_name: state,
      zone_name: zone,
      state_id: c.state_id ?? null,
      zone_id: c.zone_id ?? null,
      meta: "complaint",
    });
  }
  return rows;
}

export default function DirectorEnforcementDashboard({ onNavigate }: Props) {
  const years = React.useMemo(() => buildReportingYearOptions(), []);
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [zoneId, setZoneId] = React.useState("all");
  const [stateId, setStateId] = React.useState("all");
  const [facilityId, setFacilityId] = React.useState("");
  const [facilityName, setFacilityName] = React.useState("");
  const [facilityExact, setFacilityExact] = React.useState(false);

  const [zones, setZones] = React.useState<GeoOpt[]>([]);
  const [states, setStates] = React.useState<GeoOpt[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [drillOpen, setDrillOpen] = React.useState(false);
  const [drillContext, setDrillContext] = React.useState<DrillContext | null>(null);
  const [drillRows, setDrillRows] = React.useState<DrillRow[]>([]);
  const [drillStackDepth, setDrillStackDepth] = React.useState(0);
  const drillStackRef = React.useRef<{ context: DrillContext; rows: DrillRow[] }[]>([]);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    setStateId("all");
    setFacilityId("");
    setFacilityName("");
    setFacilityExact(false);
    const zoneArg = zoneId === "all" ? undefined : zoneId;
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [zoneId]);

  React.useEffect(() => {
    setFacilityId("");
    setFacilityName("");
    setFacilityExact(false);
  }, [stateId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, cmpRes] = await Promise.all([
        complianceApi.list({
          ...(zoneId !== "all" ? { zone_id: zoneId } : {}),
          ...(stateId !== "all" ? { state_id: stateId } : {}),
          year,
        }),
        servicomApi.listComplaints({
          ...(zoneId !== "all" ? { zone_id: zoneId } : {}),
          ...(stateId !== "all" ? { state_id: stateId } : {}),
        }),
      ]);
      setReports(compRes.data || []);
      setComplaints(cmpRes.data || []);
    } catch (err: any) {
      toast.error("Failed to load enforcement dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [zoneId, stateId, year]);

  React.useEffect(() => { load(); }, [load]);

  const filteredReports = React.useMemo(
    () => reports.filter((r) => matchesFacility(r.facility_name, facilityName, facilityExact)),
    [reports, facilityName, facilityExact],
  );

  const filteredComplaints = React.useMemo(
    () => complaints.filter((c) =>
      matchesFacility(c.facility_name, facilityName, facilityExact)
      || (!facilityExact && (
        matchesFacility(c.respondent_name, facilityName)
        || matchesFacility(c.respondent_id, facilityName)
        || matchesFacility(c.complaint_number, facilityName)
      )),
    ),
    [complaints, facilityName, facilityExact],
  );

  const complianceKpis = React.useMemo(
    () => computeComplianceKpis(filteredReports),
    [filteredReports],
  );

  const complaintKpis = React.useMemo(() => {
    const total = filteredComplaints.length;
    const open = filteredComplaints.filter((c) => isComplaintOpen(c.status)).length;
    const escalated = filteredComplaints.filter((c) => isComplaintEscalated(c)).length;
    const resolved = filteredComplaints.filter((c) => isComplaintResolved(c.status)).length;
    const slaTracked = filteredComplaints.filter((c) => c.resolution_within_sla != null).length;
    const slaMet = filteredComplaints.filter((c) => c.resolution_within_sla === true || c.resolution_within_sla === 1).length;
    return {
      total,
      open,
      escalated,
      resolved,
      slaRate: slaTracked ? Math.round((slaMet / slaTracked) * 100) : null,
      slaTracked,
      slaMet,
    };
  }, [filteredComplaints]);

  const complaintsByStatus = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredComplaints) {
      const key = c.status || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  const byZone = React.useMemo(() => {
    const map = new Map<string, { zone: string; compliance: number; complaints: number; violations: number }>();
    const bump = (zone: string, field: "compliance" | "complaints" | "violations", n = 1) => {
      const z = zone || "Unknown";
      if (!map.has(z)) map.set(z, { zone: z, compliance: 0, complaints: 0, violations: 0 });
      map.get(z)![field] += n;
    };
    for (const r of filteredReports) {
      bump(r.zone?.description || "Unknown", "compliance");
      if ((r.violations ?? []).length > 0) bump(r.zone?.description || "Unknown", "violations");
    }
    for (const c of filteredComplaints) bump(c.zone?.description || "Unknown", "complaints");
    return [...map.values()].sort((a, b) => (b.compliance + b.complaints) - (a.compliance + a.complaints));
  }, [filteredReports, filteredComplaints]);

  const byState = React.useMemo(() => {
    const map = new Map<string, { state: string; zone: string; compliance: number; complaints: number; open: number; non: number }>();
    const ensure = (state: string, zone: string) => {
      const k = state || "Unknown";
      if (!map.has(k)) map.set(k, { state: k, zone: zone || "—", compliance: 0, complaints: 0, open: 0, non: 0 });
      return map.get(k)!;
    };
    for (const r of filteredReports) {
      const row = ensure(r.state?.description, r.zone?.description);
      row.compliance += 1;
      const fc = r.finding_counts;
      if (fc?.non_compliant) row.non += Number(fc.non_compliant) || 0;
    }
    for (const c of filteredComplaints) {
      const row = ensure(c.state?.description, c.zone?.description);
      row.complaints += 1;
      if (isComplaintOpen(c.status)) row.open += 1;
    }
    return [...map.values()].sort((a, b) => (b.compliance + b.complaints) - (a.compliance + a.complaints));
  }, [filteredReports, filteredComplaints]);

  const byFacility = React.useMemo(() => {
    const map = new Map<string, { facility: string; state: string; compliance: number; complaints: number }>();
    const bump = (facility: string, state: string, field: "compliance" | "complaints") => {
      const name = (facility || "Unspecified facility").trim();
      if (!map.has(name)) map.set(name, { facility: name, state: state || "—", compliance: 0, complaints: 0 });
      map.get(name)![field] += 1;
    };
    for (const r of filteredReports) bump(r.facility_name, r.state?.description, "compliance");
    for (const c of filteredComplaints) bump(c.facility_name || c.respondent_name, c.state?.description, "complaints");
    return [...map.values()]
      .sort((a, b) => (b.compliance + b.complaints) - (a.compliance + a.complaints))
      .slice(0, 25);
  }, [filteredReports, filteredComplaints]);

  const workloadTrend = React.useMemo(() => {
    const map = new Map<string, { label: string; complaints: number; compliance: number; sort: number }>();
    const keyFromDate = (raw: string | null | undefined, fallbackYear: number) => {
      if (!raw) return { label: `${fallbackYear}`, sort: fallbackYear * 100 };
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return { label: `${fallbackYear}`, sort: fallbackYear * 100 };
      const label = d.toLocaleString("en", { month: "short" });
      return { label, sort: d.getFullYear() * 100 + (d.getMonth() + 1) };
    };
    for (const c of filteredComplaints) {
      const { label, sort } = keyFromDate(c.date_received || c.complaint_date, Number(year));
      if (!map.has(label)) map.set(label, { label, complaints: 0, compliance: 0, sort });
      map.get(label)!.complaints += 1;
    }
    for (const r of filteredReports) {
      const { label, sort } = keyFromDate(r.date_submitted || r.createdAt, Number(year));
      if (!map.has(label)) map.set(label, { label, complaints: 0, compliance: 0, sort });
      map.get(label)!.compliance += 1;
    }
    return [...map.values()].sort((a, b) => a.sort - b.sort).slice(-8);
  }, [filteredComplaints, filteredReports, year]);

  const zoneLabel = zoneId === "all" ? "All zones" : (zones.find((z) => String(z.id) === zoneId)?.description ?? "Zone");
  const stateLabel = stateId === "all" ? "All states" : (states.find((s) => String(s.id) === stateId)?.description ?? "State");
  const filterSubtitle = [
    zoneLabel,
    stateLabel,
    facilityName ? `Facility “${facilityName}”` : null,
    `Year ${year}`,
  ].filter(Boolean).join(" · ");

  const closeDrill = React.useCallback(() => {
    setDrillOpen(false);
    setDrillContext(null);
    setDrillRows([]);
    drillStackRef.current = [];
    setDrillStackDepth(0);
  }, []);

  const openLocalDrill = React.useCallback((title: string, rows: DrillRow[], crumb?: string) => {
    const ctx: DrillContext = {
      title,
      subtitle: filterSubtitle,
      breadcrumbs: [MODULE_NAME, ...(crumb ? [crumb] : [])],
    };
    drillStackRef.current = [];
    setDrillStackDepth(0);
    setDrillRows(rows);
    setDrillContext(ctx);
    setDrillOpen(true);
  }, [filterSubtitle]);

  const openComplianceDrill = React.useCallback((kind: ComplianceDrillKind) => {
    openLocalDrill(
      COMPLIANCE_DRILL_TITLES[kind],
      buildComplianceDrillRows(filteredReports, kind),
      "Compliance",
    );
  }, [filteredReports, openLocalDrill]);

  const openComplaintDrill = React.useCallback((kind: ComplaintDrillKind) => {
    openLocalDrill(
      COMPLAINT_DRILL_TITLES[kind],
      buildComplaintDrillRows(filteredComplaints, kind),
      "Complaints",
    );
  }, [filteredComplaints, openLocalDrill]);

  const attentionItems = React.useMemo(() => {
    const items: {
      id: string;
      kind: "complaint" | "compliance";
      title: string;
      detail: string;
      tone: "warn" | "danger";
      onClick: () => void;
    }[] = [];
    for (const c of filteredComplaints.filter(isComplaintEscalated).slice(0, 4)) {
      items.push({
        id: `esc-${c.id}`,
        kind: "complaint",
        title: c.complaint_number || "Escalated complaint",
        detail: [c.facility_name || c.respondent_name, c.state?.description, c.priority_rating].filter(Boolean).join(" · "),
        tone: "danger",
        onClick: () => openComplaintDrill("escalated"),
      });
    }
    for (const r of filteredReports.filter((x) => (x.violations ?? []).length > 0).slice(0, 4)) {
      items.push({
        id: `viol-${r.id}`,
        kind: "compliance",
        title: r.reference_id || "Violation case",
        detail: [r.facility_name, r.state?.description, `${(r.violations ?? []).length} violation(s)`].filter(Boolean).join(" · "),
        tone: "warn",
        onClick: () => openComplianceDrill("violations"),
      });
    }
    return items.slice(0, 6);
  }, [filteredComplaints, filteredReports, openComplaintDrill, openComplianceDrill]);

  const drillBack = React.useCallback(() => {
    const prev = drillStackRef.current.pop();
    setDrillStackDepth(drillStackRef.current.length);
    if (!prev) {
      closeDrill();
      return;
    }
    setDrillContext(prev.context);
    setDrillRows(prev.rows);
  }, [closeDrill]);

  const handleDrillStatClick = React.useCallback((stat: DrillStatChip) => {
    if (stat.row) return;
    let filtered = drillRows;
    if (stat.filter?.status) {
      filtered = filtered.filter((r) =>
        (r.status || "").toLowerCase() === stat.filter!.status!.toLowerCase(),
      );
    }
    if (stat.filter?.zone_id) {
      filtered = filtered.filter((r) => String(r.zone_id) === stat.filter!.zone_id);
    }
    if (stat.filter?.state_id) {
      filtered = filtered.filter((r) => String(r.state_id) === stat.filter!.state_id);
    }
    if (!stat.filter || filtered.length === drillRows.length) return;
    if (drillContext) {
      drillStackRef.current = [...drillStackRef.current, { context: drillContext, rows: drillRows }];
      setDrillStackDepth(drillStackRef.current.length);
    }
    setDrillRows(filtered);
    setDrillContext({
      title: `${drillContext?.title ?? "Records"} — ${stat.label}`,
      subtitle: drillContext?.subtitle,
      breadcrumbs: [...(drillContext?.breadcrumbs ?? [MODULE_NAME]), stat.label],
    });
  }, [drillRows, drillContext]);

  const handleDrillRowClick = React.useCallback((row: DrillRow) => {
    if (row.meta === "complaint") {
      onNavigate?.("/sdo/servicom/complaints");
      closeDrill();
      return;
    }
    if (row.meta === "compliance" || typeof row.id === "number" || String(row.id).match(/^\d/)) {
      onNavigate?.("/compliance");
      closeDrill();
    }
  }, [onNavigate, closeDrill]);

  const complianceStats = [
    { label: "Reports", value: complianceKpis.total, tone: "default" as const, icon: <Scale className="w-5 h-5" />, onClick: () => openComplianceDrill("total") },
    { label: "Fully Compliant", value: complianceKpis.fully, tone: "ok" as const, icon: <CheckCircle2 className="w-5 h-5" />, onClick: () => openComplianceDrill("fully") },
    { label: "Partially", value: complianceKpis.partially, tone: "warn" as const, icon: <AlertTriangle className="w-5 h-5" />, onClick: () => openComplianceDrill("partially") },
    { label: "Non-Compliant", value: complianceKpis.non, tone: "danger" as const, icon: <AlertTriangle className="w-5 h-5" />, onClick: () => openComplianceDrill("non") },
    { label: "Violations", value: complianceKpis.violations, tone: "danger" as const, icon: <ShieldAlert className="w-5 h-5" />, onClick: () => openComplianceDrill("violations") },
    { label: "Enforcement Actions", value: complianceKpis.enforcement, tone: "default" as const, icon: <Gavel className="w-5 h-5" />, onClick: () => openComplianceDrill("enforcement") },
  ];

  const complaintStats = [
    { label: "Total Complaints", value: complaintKpis.total, tone: "default" as const, icon: <MessageSquare className="w-5 h-5" />, onClick: () => openComplaintDrill("total") },
    { label: "Open", value: complaintKpis.open, tone: "warn" as const, icon: <AlertTriangle className="w-5 h-5" />, onClick: () => openComplaintDrill("open") },
    { label: "Escalated", value: complaintKpis.escalated, tone: "danger" as const, icon: <ShieldAlert className="w-5 h-5" />, onClick: () => openComplaintDrill("escalated") },
    { label: "Resolved", value: complaintKpis.resolved, tone: "ok" as const, icon: <CheckCircle2 className="w-5 h-5" />, onClick: () => openComplaintDrill("resolved") },
    {
      label: "SLA Met",
      value: complaintKpis.slaRate != null ? `${complaintKpis.slaRate}%` : "—",
      tone: "ok" as const,
      icon: <Activity className="w-5 h-5" />,
      onClick: () => openComplaintDrill("sla"),
      hint: complaintKpis.slaTracked ? `${complaintKpis.slaMet} of ${complaintKpis.slaTracked} tracked` : "No SLA data yet",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#eef3f0]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-2.5 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-[#e8f5ee] flex items-center justify-center">
              <Gavel className="w-4 h-4 text-[#145c3f]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                  Enforcement Dashboard
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#145c3f] bg-[#e8f5ee] px-1.5 py-0.5 rounded">
                  HQ · Director
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Compliance &amp; Complaints · {filterSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onNavigate && (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => onNavigate("/compliance")}>
                  Compliance <ArrowUpRight className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => onNavigate("/sdo/servicom/complaints")}>
                  Complaints <ArrowUpRight className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 px-2.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger className="w-full h-8 text-xs bg-[#f8fbf9]" displayValue={zoneLabel}>
              <SelectValue placeholder="All zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stateId} onValueChange={setStateId}>
            <SelectTrigger className="w-full h-8 text-xs bg-[#f8fbf9]" displayValue={stateLabel}>
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {states.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full h-8 text-xs bg-[#f8fbf9]" displayValue={`Year ${year}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <HcfFacilitySelect
            requireState={false}
            stateId={stateId !== "all" ? stateId : undefined}
            value={facilityId}
            onChange={(fac) => {
              setFacilityId(fac?.id ?? "");
              setFacilityName(fac?.name ?? "");
              setFacilityExact(!!fac?.name);
            }}
            placeholder="Search HCF…"
            className="h-8 text-xs bg-[#f8fbf9]"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-5 pb-10">
          {loading ? (
            <div className="flex items-center justify-center py-28 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span>Loading dashboard…</span>
            </div>
          ) : (
            <>
              {/* Compliance stats */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-[#e8f5ee] flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-[#145c3f]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Compliance Management</h2>
                    <p className="text-[11px] text-slate-500">Facility reports, findings & enforcement</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {complianceStats.map((s, i) => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      value={s.value}
                      icon={s.icon}
                      tone={s.tone}
                      onClick={s.onClick}
                      delay={i * 0.03}
                    />
                  ))}
                </div>
              </section>

              {/* Complaints stats */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-[#e8f5ee] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[#145c3f]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">SERVICOM Complaints</h2>
                    <p className="text-[11px] text-slate-500">Register volume, escalations & SLA</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {complaintStats.map((s, i) => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      value={s.value}
                      icon={s.icon}
                      tone={s.tone}
                      hint={s.hint}
                      onClick={s.onClick}
                      delay={0.08 + i * 0.03}
                    />
                  ))}
                </div>
              </section>

              {attentionItems.length > 0 && (
                <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-[#145c3f]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[#145c3f]">Needs attention</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {attentionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="text-left rounded-xl border border-white bg-white hover:shadow-sm px-3 py-2.5 transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                item.tone === "danger"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.kind === "complaint" ? "Complaint" : "Compliance"}
                            </Badge>
                            <span className="font-mono text-[11px] font-bold text-slate-800 truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">{item.detail || "—"}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc] lg:col-span-2 shadow-sm bg-white">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#145c3f]" /> Load by zone
                      </CardTitle>
                      <CardDescription className="text-xs">Compliance · Complaints · Violations</CardDescription>
                    </div>
                    <DrillHint
                      label="All zones"
                      onClick={() => openLocalDrill(
                        "Records by Zone",
                        buildMixedGeoRows(filteredReports, filteredComplaints, {}),
                        "By Zone",
                      )}
                    />
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {byZone.length === 0 ? (
                      <ChartEmpty />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={byZone.slice(0, 10)}
                          barGap={3}
                          style={{ cursor: "pointer" }}
                          onClick={(state: any) => {
                            const zone = state?.activePayload?.[0]?.payload?.zone;
                            if (!zone) return;
                            openLocalDrill(
                              `${zone} — Records`,
                              buildMixedGeoRows(filteredReports, filteredComplaints, { zone }),
                              zone,
                            );
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="zone" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={58} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                          <Bar dataKey="compliance" name="Compliance" fill="#145c3f" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="complaints" name="Complaints" fill="#0284c7" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="violations" name="Violations" fill="#e11d48" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm bg-white">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold">Complaint status</CardTitle>
                    <DrillHint label="All" onClick={() => openComplaintDrill("total")} />
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {complaintsByStatus.length === 0 ? (
                      <ChartEmpty message="No complaints for this filter." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={complaintsByStatus}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="52%"
                            innerRadius={52}
                            outerRadius={90}
                            paddingAngle={2}
                            style={{ cursor: "pointer" }}
                            onClick={(_: any, index: number) => {
                              const name = complaintsByStatus[index]?.name;
                              if (!name) return;
                              const rows = buildComplaintDrillRows(
                                filteredComplaints.filter((c) => (c.status || "Unknown") === name),
                                "total",
                              );
                              openLocalDrill(`${name} — Complaints`, rows, name);
                            }}
                          >
                            {complaintsByStatus.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#145c3f]" /> Workload trend
                  </CardTitle>
                  <CardDescription className="text-xs">Complaints filed vs compliance reports</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px]">
                  {workloadTrend.length === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={workloadTrend}>
                        <defs>
                          <linearGradient id="enfComplaints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="enfCompliance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#145c3f" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#145c3f" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                        <Area type="monotone" dataKey="complaints" name="Complaints" stroke="#0284c7" fill="url(#enfComplaints)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="compliance" name="Compliance" stroke="#145c3f" fill="url(#enfCompliance)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b bg-[#f8fbf9]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> By State
                      <span className="text-[10px] font-normal text-slate-400 ml-auto">Click to drill</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[340px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7]">
                            <TableHead className="text-xs">State</TableHead>
                            <TableHead className="text-xs">Zone</TableHead>
                            <TableHead className="text-xs text-right">Compliance</TableHead>
                            <TableHead className="text-xs text-right">Complaints</TableHead>
                            <TableHead className="text-xs text-right">Open</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byState.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-slate-400 py-8 text-sm">No rows</TableCell>
                            </TableRow>
                          ) : byState.map((row) => (
                            <TableRow
                              key={row.state}
                              className="cursor-pointer hover:bg-[#f0fdf7]/70"
                              onClick={() => openLocalDrill(
                                `${row.state} — Records`,
                                buildMixedGeoRows(filteredReports, filteredComplaints, { state: row.state }),
                                row.state,
                              )}
                            >
                              <TableCell className="text-sm font-semibold text-[#145c3f]">{row.state}</TableCell>
                              <TableCell className="text-xs text-slate-500">{row.zone}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{row.compliance}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{row.complaints}</TableCell>
                              <TableCell className="text-sm text-right">
                                {row.open > 0 ? (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{row.open}</Badge>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b bg-[#f8fbf9]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Hot facilities
                      <span className="text-[10px] font-normal text-slate-400 ml-auto">Top 25</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[340px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7]">
                            <TableHead className="text-xs">Facility</TableHead>
                            <TableHead className="text-xs">State</TableHead>
                            <TableHead className="text-xs text-right">Compliance</TableHead>
                            <TableHead className="text-xs text-right">Complaints</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byFacility.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-400 py-8 text-sm">No facilities</TableCell>
                            </TableRow>
                          ) : byFacility.map((row, idx) => (
                            <TableRow
                              key={row.facility}
                              className="cursor-pointer hover:bg-[#f0fdf7]/70"
                              onClick={() => openLocalDrill(
                                `${row.facility} — Records`,
                                buildMixedGeoRows(filteredReports, filteredComplaints, { facility: row.facility }),
                                row.facility,
                              )}
                            >
                              <TableCell className="text-sm font-medium text-[#145c3f] max-w-[220px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{idx + 1}</span>
                                  <span className="truncate" title={row.facility}>{row.facility}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">{row.state}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{row.compliance}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{row.complaints}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <DashboardDrillPanel
        open={drillOpen}
        context={drillContext}
        rows={drillRows}
        onClose={closeDrill}
        onBack={drillStackDepth > 0 ? drillBack : undefined}
        onRowClick={handleDrillRowClick}
        onStatClick={handleDrillStatClick}
      />
    </div>
  );
}

export function isDirectorEnforcementUser(user: { staff_id?: string | null; name?: string | null } | null | undefined) {
  if (!user) return false;
  if (String(user.staff_id || "").toUpperCase() === "HOD-0003") return true;
  return String(user.name || "").toLowerCase().includes("director enforcement");
}
