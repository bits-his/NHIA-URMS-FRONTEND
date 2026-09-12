import * as React from "react";
import {
  RefreshCw, Loader2, MessageSquare, ShieldAlert, CheckCircle2,
  AlertTriangle, Scale, Building2, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { ClickableKpi, DrillHint } from "@/components/dashboard/dashboardUi";
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

const COMPLAINT_DRILL_TITLES: Record<ComplaintDrillKind, string> = {
  total: "All Complaints",
  open: "Open Complaints",
  escalated: "Escalated Complaints",
  resolved: "Resolved / Closed Complaints",
  sla: "Complaints Resolved Within SLA",
};

const MODULE_NAME = "Director Enforcement";
const PIE_COLORS = ["#25a872", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#64748b"];

function ChartEmpty({ message = "No data for this filter." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
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
    for (const c of filteredComplaints) {
      bump(c.zone?.description || "Unknown", "complaints");
    }
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
    for (const r of filteredReports) {
      bump(r.facility_name, r.state?.description, "compliance");
    }
    for (const c of filteredComplaints) {
      bump(c.facility_name || c.respondent_name, c.state?.description, "complaints");
    }
    return [...map.values()]
      .sort((a, b) => (b.compliance + b.complaints) - (a.compliance + a.complaints))
      .slice(0, 25);
  }, [filteredReports, filteredComplaints]);

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

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 sticky top-0 z-30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Compliance Management &amp; SERVICOM Complaints · {filterSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <Button variant="outline" size="sm" onClick={() => onNavigate("/compliance")}>
                  Compliance
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate("/sdo/servicom/complaints")}>
                  Complaints
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Zone</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="w-full h-9" displayValue={zoneLabel}>
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">State</Label>
            <Select value={stateId} onValueChange={setStateId}>
              <SelectTrigger className="w-full h-9" displayValue={stateLabel}>
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Year (compliance)</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full h-9" displayValue={year}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Facility (HCF)</Label>
            <HcfFacilitySelect
              requireState={false}
              stateId={stateId !== "all" ? stateId : undefined}
              value={facilityId}
              onChange={(fac) => {
                setFacilityId(fac?.id ?? "");
                setFacilityName(fac?.name ?? "");
                setFacilityExact(!!fac?.name);
              }}
              placeholder="Type to search HCF…"
              className="h-9"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span>Loading dashboard…</span>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Compliance Management
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <ClickableKpi label="Reports" value={complianceKpis.total} icon={<Scale className="w-5 h-5 text-[#145c3f]" />} onClick={() => openComplianceDrill("total")} />
                  <ClickableKpi label="Fully Compliant" value={complianceKpis.fully} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} onClick={() => openComplianceDrill("fully")} />
                  <ClickableKpi label="Partially" value={complianceKpis.partially} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} onClick={() => openComplianceDrill("partially")} />
                  <ClickableKpi label="Non-Compliant" value={complianceKpis.non} icon={<AlertTriangle className="w-5 h-5 text-rose-600" />} onClick={() => openComplianceDrill("non")} />
                  <ClickableKpi label="Violations" value={complianceKpis.violations} icon={<ShieldAlert className="w-5 h-5 text-rose-600" />} onClick={() => openComplianceDrill("violations")} />
                  <ClickableKpi label="Enforcement" value={complianceKpis.enforcement} icon={<Scale className="w-5 h-5 text-blue-600" />} onClick={() => openComplianceDrill("enforcement")} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> SERVICOM Complaints
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  <ClickableKpi label="Total Complaints" value={complaintKpis.total} icon={<MessageSquare className="w-5 h-5 text-blue-600" />} onClick={() => openComplaintDrill("total")} />
                  <ClickableKpi label="Open" value={complaintKpis.open} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} onClick={() => openComplaintDrill("open")} />
                  <ClickableKpi label="Escalated" value={complaintKpis.escalated} icon={<ShieldAlert className="w-5 h-5 text-rose-600" />} onClick={() => openComplaintDrill("escalated")} />
                  <ClickableKpi label="Resolved" value={complaintKpis.resolved} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} onClick={() => openComplaintDrill("resolved")} />
                  <ClickableKpi
                    label="SLA Met"
                    value={complaintKpis.slaRate != null ? `${complaintKpis.slaRate}%` : "—"}
                    icon={<CheckCircle2 className="w-5 h-5 text-[#25a872]" />}
                    onClick={() => openComplaintDrill("sla")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#145c3f]" /> By Zone
                    </CardTitle>
                    <DrillHint
                      label="All zones"
                      onClick={() => openLocalDrill(
                        "Records by Zone",
                        buildMixedGeoRows(filteredReports, filteredComplaints, {}),
                        "By Zone",
                      )}
                    />
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    {byZone.length === 0 ? (
                      <ChartEmpty />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={byZone.slice(0, 10)}
                          barGap={4}
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
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="zone" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="compliance" name="Compliance" fill="#145c3f" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="complaints" name="Complaints" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="violations" name="Violations" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold">Complaints by Status</CardTitle>
                    <DrillHint label="All complaints" onClick={() => openComplaintDrill("total")} />
                  </CardHeader>
                  <CardContent className="h-[260px]">
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
                            cy="50%"
                            outerRadius={85}
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
                            label={({ name, percent }: any) => `${String(name).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                          >
                            {complaintsByStatus.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-2 border-b bg-[#f8fbf9]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> By State
                      <span className="text-[10px] font-normal text-slate-400 ml-auto">Click row to drill</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[320px] overflow-auto">
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
                              className="cursor-pointer hover:bg-[#f0fdf7]/50"
                              onClick={() => openLocalDrill(
                                `${row.state} — Records`,
                                buildMixedGeoRows(filteredReports, filteredComplaints, { state: row.state }),
                                row.state,
                              )}
                            >
                              <TableCell className="text-sm font-medium text-[#145c3f]">{row.state}</TableCell>
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

                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-2 border-b bg-[#f8fbf9]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> By Facility
                      <span className="text-[10px] font-normal text-slate-400 ml-auto">Top 25 · click to drill</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[320px] overflow-auto">
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
                          ) : byFacility.map((row) => (
                            <TableRow
                              key={row.facility}
                              className="cursor-pointer hover:bg-[#f0fdf7]/50"
                              onClick={() => openLocalDrill(
                                `${row.facility} — Records`,
                                buildMixedGeoRows(filteredReports, filteredComplaints, { facility: row.facility }),
                                row.facility,
                              )}
                            >
                              <TableCell className="text-sm font-medium text-[#145c3f] max-w-[220px] truncate" title={row.facility}>
                                {row.facility}
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
