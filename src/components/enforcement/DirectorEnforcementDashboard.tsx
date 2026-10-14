import * as React from "react";
import {
  RefreshCw, Loader2, MessageSquare, CheckCircle2,
  ArrowUpRight, ClipboardCheck, Package, FileSpreadsheet,
  Building2, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { complianceApi, servicomApi, stockApi } from "@/lib/api";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { computeComplianceKpis } from "../compliance/complianceDrill";
import DashboardDrillPanel, {
  type DrillContext,
  type DrillRow,
} from "@/components/dashboard/DashboardDrillPanel";
import type { DrillStatChip } from "@/components/dashboard/drillStats";

interface Props {
  onNavigate?: (path: string) => void;
}

type GeoOpt = { id: number; description: string };
type TabId = "overview" | "complaints" | "servicom" | "svu";
type ComplaintDrillKind = "total" | "open" | "escalated" | "resolved" | "sla" | "overdue";

const MODULE_NAME = "Enforcement Department";
const CHART_GREEN = "#1a6b4a";
const CHART_SOFT = "#7eb89a";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "At a glance" },
  { id: "complaints", label: "Complaints" },
  { id: "servicom", label: "SERVICOM" },
  { id: "svu", label: "Stock & assets" },
];

const COMPLAINT_DRILL_TITLES: Record<ComplaintDrillKind, string> = {
  total: "All complaints",
  open: "Open complaints",
  escalated: "Escalated complaints",
  resolved: "Resolved complaints",
  sla: "Resolved within SLA",
  overdue: "Overdue complaints",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function isComplaintOpen(status?: string) {
  const s = String(status || "").toLowerCase();
  return !s.includes("resolv") && !s.includes("closed") && !s.includes("close") && !s.includes("withdrawn");
}

function isComplaintEscalated(row: any) {
  return !!row?.escalated || String(row?.status || "").toLowerCase().includes("escalat");
}

function isComplaintResolved(status?: string) {
  const s = String(status || "").toLowerCase();
  return s.includes("resolv") || s.includes("closed") || s.includes("close") || s.includes("withdrawn");
}

function isComplaintOverdue(row: any) {
  if (isComplaintResolved(row?.status)) return false;
  if (row?.sla_overdue === true || row?.sla_overdue === 1) return true;
  const color = String(row?.sla_color || row?.sla?.color || "").toLowerCase();
  return color === "red" || color === "amber";
}

function inYear(raw: string | null | undefined, year: string) {
  if (!raw) return true;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).includes(year);
  return String(d.getFullYear()) === year;
}

function countBy(items: any[], keyFn: (item: any) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildComplaintDrillRows(complaints: any[], kind: ComplaintDrillKind): DrillRow[] {
  const filtered = complaints.filter((c) => {
    if (kind === "total") return true;
    if (kind === "open") return isComplaintOpen(c.status);
    if (kind === "escalated") return isComplaintEscalated(c);
    if (kind === "resolved") return isComplaintResolved(c.status);
    if (kind === "sla") return c.resolution_within_sla === true || c.resolution_within_sla === 1;
    if (kind === "overdue") return isComplaintOverdue(c);
    return true;
  });

  return filtered.map((c) => ({
    id: c.id,
    reference: c.complaint_number ?? null,
    title: c.facility_name || c.respondent_name || c.complainant_name || "—",
    subtitle: [c.complaint_category || c.category, c.priority_rating].filter(Boolean).join(" · ") || null,
    status: c.status ?? null,
    date: c.date_received ?? c.complaint_date ?? c.createdAt ?? null,
    state_name: c.state?.description ?? null,
    zone_name: c.zone?.description ?? null,
    state_id: c.state_id ?? null,
    zone_id: c.zone_id ?? null,
    meta: "complaint",
  }));
}

function Metric({
  label,
  value,
  note,
  onClick,
}: {
  label: string;
  value: string | number;
  note?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left ${onClick ? "group cursor-pointer" : ""}`}
    >
      <p className="text-[13px] text-slate-500 font-medium">{label}</p>
      <p className={`mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 tabular-nums ${onClick ? "group-hover:text-[#1a6b4a] transition-colors" : ""}`}>
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </Comp>
  );
}

function QuietCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200/80 ${className}`}>
      {children}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50/80 px-4 py-3.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function ChartShell({
  title,
  children,
  height = 240,
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <QuietCard className="p-5 md:p-6">
      <p className="text-sm font-medium text-slate-800 mb-4">{title}</p>
      <div style={{ height }}>{children}</div>
    </QuietCard>
  );
}

function EmptyChart({ message = "Nothing to show for this filter yet." }: { message?: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export default function DirectorEnforcementDashboard({ onNavigate }: Props) {
  const years = React.useMemo(() => buildReportingYearOptions(), []);
  const [tab, setTab] = React.useState<TabId>("overview");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [zoneId, setZoneId] = React.useState("all");
  const [stateId, setStateId] = React.useState("all");

  const [zones, setZones] = React.useState<GeoOpt[]>([]);
  const [states, setStates] = React.useState<GeoOpt[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [servicomDash, setServicomDash] = React.useState<any | null>(null);
  const [commentCards, setCommentCards] = React.useState<any[]>([]);
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [stockDash, setStockDash] = React.useState<any | null>(null);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [prepayments, setPrepayments] = React.useState<any[]>([]);
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
    const zoneArg = zoneId === "all" ? undefined : zoneId;
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [zoneId]);

  const geoFilters = React.useMemo(() => ({
    ...(zoneId !== "all" ? { zone_id: zoneId } : {}),
    ...(stateId !== "all" ? { state_id: stateId } : {}),
  }), [zoneId, stateId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        compRes, cmpRes, svcRes, cardsRes, surveyRes, stockRes, assetsRes, prepRes,
      ] = await Promise.all([
        complianceApi.list({ ...geoFilters, year }),
        servicomApi.listComplaints(geoFilters),
        servicomApi.getDashboard(geoFilters),
        servicomApi.listCommentCards(geoFilters),
        servicomApi.listSatisfactionSurveys(geoFilters),
        stockApi.getDashboard(geoFilters),
        storeManagementApi.getAssets().catch(() => ({ data: [] })),
        storeManagementApi.getPrepaymentAnalyses().catch(() => ({ data: [] })),
      ]);
      setReports(compRes.data || []);
      setComplaints((cmpRes.data || []).filter((c: any) =>
        inYear(c.date_received || c.complaint_date || c.createdAt, year),
      ));
      setServicomDash(svcRes.data || null);
      setCommentCards((cardsRes.data || []).filter((c: any) => inYear(c.card_date || c.createdAt, year)));
      setSurveys((surveyRes.data || []).filter((s: any) => inYear(s.survey_date || s.createdAt, year)));
      setStockDash(stockRes.data || null);

      const assetList = assetsRes?.data || assetsRes || [];
      const prepList = prepRes?.data || prepRes || [];
      setAssets((Array.isArray(assetList) ? assetList : []).filter((a: any) => {
        if (zoneId !== "all" && String(a.zone_id || "") !== zoneId) return false;
        if (stateId !== "all" && String(a.state_id || "") !== stateId) return false;
        return true;
      }));
      setPrepayments((Array.isArray(prepList) ? prepList : []).filter((p: any) => {
        if (zoneId !== "all" && String(p.zone_id || "") !== zoneId) return false;
        if (stateId !== "all" && String(p.state_id || "") !== stateId) return false;
        return inYear(p.entryDate || p.createdAt, year);
      }));
    } catch (err: any) {
      toast.error("Could not load department overview", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [geoFilters, year, zoneId, stateId]);

  React.useEffect(() => { load(); }, [load]);

  const complianceKpis = React.useMemo(() => computeComplianceKpis(reports), [reports]);

  const complaintKpis = React.useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter((c) => isComplaintOpen(c.status)).length;
    const escalated = complaints.filter((c) => isComplaintEscalated(c)).length;
    const overdue = complaints.filter(isComplaintOverdue).length;
    const slaTracked = complaints.filter((c) => c.resolution_within_sla != null).length;
    const slaMet = complaints.filter((c) => c.resolution_within_sla === true || c.resolution_within_sla === 1).length;
    const days = complaints
      .map((c) => Number(c.resolution_days))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const avgResolution = days.length
      ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
      : null;
    const byDomain = countBy(complaints, (c) => c.complaint_domain || "Other").slice(0, 6);
    const byState = countBy(complaints, (c) => c.state?.description || "Unknown").slice(0, 8);
    const byStatus = countBy(complaints, (c) => c.status || "Unknown");
    const openByStatus = byStatus.filter((s) => {
      const n = s.name.toLowerCase();
      return !n.includes("resolv") && !n.includes("closed") && !n.includes("withdrawn");
    });

    return {
      total,
      open,
      escalated,
      overdue,
      slaRate: slaTracked ? Math.round((slaMet / slaTracked) * 100) : null,
      avgResolution,
      byDomain,
      byState,
      openByStatus,
      topCategory: countBy(complaints, (c) => c.complaint_category || c.category || "—")[0]?.name || "—",
      topRoute: countBy(complaints, (c) => c.transmission_route || "—")[0]?.name || "—",
    };
  }, [complaints]);

  const commentKpis = React.useMemo(() => {
    const count = commentCards.length || servicomDash?.comment_cards || 0;
    const avgs = commentCards.map((c) => Number(c.average_score)).filter((n) => Number.isFinite(n));
    const overall = avgs.length
      ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10
      : (servicomDash?.avg_comment_card_score ?? null);
    return { count, overall };
  }, [commentCards, servicomDash]);

  const surveyKpis = React.useMemo(() => {
    const count = surveys.length || servicomDash?.satisfaction_surveys || 0;
    const scores = surveys.map((s) => Number(s.percentage_score)).filter((n) => Number.isFinite(n));
    const avgPct = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : (servicomDash?.avg_satisfaction != null ? Math.round(Number(servicomDash.avg_satisfaction)) : null);
    return { facilities: count, responseRate: avgPct };
  }, [surveys, servicomDash]);

  const assetKpis = React.useMemo(() => {
    const total = assets.length || stockDash?.total_assets || 0;
    const poor = assets.filter((a) => {
      const c = String(a.physicalCondition || "").toLowerCase();
      return c.includes("poor") || c.includes("defect") || c.includes("bad");
    }).length || stockDash?.items_bad_condition || 0;
    const missing = assets.filter((a) => {
      const v = String(a.verificationStatus || a.status || "").toLowerCase();
      return v.includes("missing") || v.includes("unverif") || v.includes("never");
    }).length || stockDash?.assets_never_verified || 0;
    const byCategory = countBy(assets, (a) => a.primaryCategory || a.category || "Other").slice(0, 6);
    return { total, poor, missing, byCategory };
  }, [assets, stockDash]);

  const prepKpis = React.useMemo(() => {
    const rows = prepayments.map((p) => {
      const qty = Number(p.quantityOrdered) || 0;
      const rate = Number(p.rate) || 0;
      return { ...p, expenditure: qty * rate };
    });
    const total = rows.reduce((s, r) => s + r.expenditure, 0);
    return { total, count: rows.length };
  }, [prepayments]);

  const monthlyTrend = React.useMemo(() => {
    const map = new Map<string, { label: string; complaints: number; surveys: number; sort: number }>();
    const bump = (raw: string | null | undefined, field: "complaints" | "surveys") => {
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const label = d.toLocaleString("en", { month: "short" });
      const sort = d.getFullYear() * 100 + (d.getMonth() + 1);
      if (!map.has(label)) map.set(label, { label, complaints: 0, surveys: 0, sort });
      map.get(label)![field] += 1;
    };
    for (const c of complaints) bump(c.date_received || c.complaint_date, "complaints");
    for (const s of surveys) bump(s.survey_date, "surveys");
    return [...map.values()].sort((a, b) => a.sort - b.sort).slice(-8);
  }, [complaints, surveys]);

  const zoneLabel = zoneId === "all" ? "All zones" : (zones.find((z) => String(z.id) === zoneId)?.description ?? "Zone");
  const stateLabel = stateId === "all" ? "All states" : (states.find((s) => String(s.id) === stateId)?.description ?? "State");
  const filterSubtitle = [zoneLabel, stateLabel, year].join(" · ");

  const closeDrill = React.useCallback(() => {
    setDrillOpen(false);
    setDrillContext(null);
    setDrillRows([]);
    drillStackRef.current = [];
    setDrillStackDepth(0);
  }, []);

  const openLocalDrill = React.useCallback((title: string, rows: DrillRow[], crumb?: string) => {
    drillStackRef.current = [];
    setDrillStackDepth(0);
    setDrillRows(rows);
    setDrillContext({
      title,
      subtitle: filterSubtitle,
      breadcrumbs: [MODULE_NAME, ...(crumb ? [crumb] : [])],
    });
    setDrillOpen(true);
  }, [filterSubtitle]);

  const openComplaintDrill = React.useCallback((kind: ComplaintDrillKind) => {
    openLocalDrill(COMPLAINT_DRILL_TITLES[kind], buildComplaintDrillRows(complaints, kind), "Complaints");
  }, [complaints, openLocalDrill]);

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
    if (stat.row || !stat.filter) return;
    let filtered = drillRows;
    if (stat.filter.status) {
      filtered = filtered.filter((r) => (r.status || "").toLowerCase() === stat.filter!.status!.toLowerCase());
    }
    if (stat.filter.zone_id) filtered = filtered.filter((r) => String(r.zone_id) === stat.filter!.zone_id);
    if (stat.filter.state_id) filtered = filtered.filter((r) => String(r.state_id) === stat.filter!.state_id);
    if (filtered.length === drillRows.length) return;
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
    } else if (row.meta === "compliance") {
      onNavigate?.("/compliance");
      closeDrill();
    }
  }, [onNavigate, closeDrill]);

  const focusItems = React.useMemo(() => {
    const items: { id: string; label: string; detail: string; onClick: () => void }[] = [];
    const overdue = complaints.filter(isComplaintOverdue);
    if (overdue.length) {
      const sample = overdue[0];
      items.push({
        id: "overdue",
        label: `${overdue.length} complaint${overdue.length === 1 ? "" : "s"} past due`,
        detail: sample.facility_name || sample.respondent_name || sample.state?.description || "Needs follow-up",
        onClick: () => openComplaintDrill("overdue"),
      });
    }
    const escalated = complaints.filter(isComplaintEscalated);
    if (escalated.length) {
      items.push({
        id: "escalated",
        label: `${escalated.length} escalated for management attention`,
        detail: escalated[0].facility_name || escalated[0].respondent_name || "Review escalation queue",
        onClick: () => openComplaintDrill("escalated"),
      });
    }
    if (assetKpis.poor + assetKpis.missing > 0) {
      items.push({
        id: "assets",
        label: `${assetKpis.poor + assetKpis.missing} assets need verification or repair`,
        detail: "Stock Verification Unit",
        onClick: () => setTab("svu"),
      });
    }
    if (complianceKpis.non > 0 || complianceKpis.violations > 0) {
      items.push({
        id: "compliance",
        label: `${complianceKpis.non || complianceKpis.violations} compliance issues open`,
        detail: "Standards & quality assurance",
        onClick: () => onNavigate?.("/compliance"),
      });
    }
    return items.slice(0, 4);
  }, [complaints, assetKpis, complianceKpis, openComplaintDrill, onNavigate]);

  const healthLine = React.useMemo(() => {
    if (complaintKpis.overdue > 0) {
      return `${complaintKpis.overdue} cases need prompt attention. Overall SLA is ${complaintKpis.slaRate != null ? `${complaintKpis.slaRate}%` : "still settling in"}.`;
    }
    if (complaintKpis.open > 0) {
      return `${complaintKpis.open} complaints are still open. Resolution pace looks steady.`;
    }
    return "No urgent complaint backlog for this view.";
  }, [complaintKpis]);

  return (
    <div className="flex flex-col h-full bg-[#f4f6f5]">
      <div className="border-b border-slate-200/70 bg-[#f4f6f5]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="px-5 md:px-8 py-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm text-slate-500">{greetingForNow()}</p>
              <h1 className="mt-0.5 text-2xl md:text-[1.75rem] font-semibold tracking-tight text-slate-900">
                Enforcement Department
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                A quiet view of complaints, service quality, and stock for your office.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onNavigate && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-slate-600 hover:text-[#1a6b4a] hover:bg-white"
                    onClick={() => onNavigate("/sdo/servicom/complaints")}
                  >
                    Complaints <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-60" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-slate-600 hover:text-[#1a6b4a] hover:bg-white"
                    onClick={() => onNavigate("/store-management/prepayment-analysis")}
                  >
                    Stock prepayment <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-60" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="h-9 gap-1.5 bg-white border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200" displayValue={zoneLabel}>
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stateId} onValueChange={setStateId}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200" displayValue={stateLabel}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px] h-9 text-sm bg-white border-slate-200" displayValue={year}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-1 p-1 rounded-full bg-white border border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                    tab === t.id
                      ? "bg-[#1a6b4a] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 md:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full pb-14">
          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Preparing your overview…</span>
            </div>
          ) : tab === "overview" ? (
            <div className="space-y-8">
              <QuietCard className="p-6 md:p-8">
                <p className="text-sm text-slate-500 mb-6">{healthLine}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                  <Metric
                    label="Complaints received"
                    value={complaintKpis.total}
                    note={`${complaintKpis.open} still open`}
                    onClick={() => openComplaintDrill("total")}
                  />
                  <Metric
                    label="Resolved on time"
                    value={complaintKpis.slaRate != null ? `${complaintKpis.slaRate}%` : "—"}
                    note="Against SLA"
                    onClick={() => openComplaintDrill("sla")}
                  />
                  <Metric
                    label="Citizen feedback"
                    value={commentKpis.count}
                    note={commentKpis.overall != null ? `Avg score ${commentKpis.overall}` : "Comment cards"}
                    onClick={() => setTab("servicom")}
                  />
                  <Metric
                    label="Facilities surveyed"
                    value={surveyKpis.facilities}
                    note={surveyKpis.responseRate != null ? `${surveyKpis.responseRate}% positive` : "Satisfaction"}
                    onClick={() => setTab("servicom")}
                  />
                </div>
              </QuietCard>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <QuietCard className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">Needs your eye</h2>
                    {focusItems.length > 0 ? (
                      <span className="text-xs text-slate-400">{focusItems.length} item{focusItems.length === 1 ? "" : "s"}</span>
                    ) : null}
                  </div>
                  {focusItems.length === 0 ? (
                    <div className="flex items-start gap-3 py-6">
                      <div className="h-9 w-9 rounded-full bg-[#e8f3ed] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-[#1a6b4a]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">All quiet for now</p>
                        <p className="text-sm text-slate-500 mt-0.5">No overdue or escalated items in this filter.</p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {focusItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={item.onClick}
                            className="w-full text-left rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 group-hover:text-[#1a6b4a]">
                                  {item.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{item.detail}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#1a6b4a] shrink-0 mt-0.5" />
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </QuietCard>

                <div className="lg:col-span-3">
                  <ChartShell title="Complaints over the year" height={220}>
                    {monthlyTrend.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyTrend}>
                          <defs>
                            <linearGradient id="dirComplaints" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.18} />
                              <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef1ef" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "none",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="complaints"
                            name="Complaints"
                            stroke={CHART_GREEN}
                            fill="url(#dirComplaints)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="surveys"
                            name="Surveys"
                            stroke={CHART_SOFT}
                            fill="transparent"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ChartShell>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Department areas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: "complaints" as TabId,
                      title: "Complaints",
                      body: `${complaintKpis.open} open · ${complaintKpis.escalated} escalated`,
                      icon: <MessageSquare className="w-4 h-4" />,
                    },
                    {
                      id: "servicom" as TabId,
                      title: "SERVICOM",
                      body: `${commentKpis.count} comment cards · ${surveyKpis.facilities} surveys`,
                      icon: <ClipboardCheck className="w-4 h-4" />,
                    },
                    {
                      id: "svu" as TabId,
                      title: "Stock & assets",
                      body: `${assetKpis.total} assets · ${prepKpis.count} prepayment entries`,
                      icon: <Package className="w-4 h-4" />,
                    },
                  ].map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setTab(area.id)}
                      className="text-left rounded-2xl bg-white border border-slate-200/80 p-5 hover:border-[#1a6b4a]/40 hover:shadow-sm transition-all group"
                    >
                      <div className="h-9 w-9 rounded-full bg-[#eef5f1] text-[#1a6b4a] flex items-center justify-center mb-4">
                        {area.icon}
                      </div>
                      <p className="text-base font-semibold text-slate-900 group-hover:text-[#1a6b4a]">{area.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{area.body}</p>
                      <p className="mt-4 text-xs font-medium text-[#1a6b4a] inline-flex items-center gap-1">
                        Open <ArrowRight className="w-3 h-3" />
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {(complianceKpis.total > 0) && (
                <QuietCard className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Compliance monitoring</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {complianceKpis.fully} fully compliant · {complianceKpis.non} non-compliant · {complianceKpis.violations} violations
                    </p>
                  </div>
                  {onNavigate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 bg-white"
                      onClick={() => onNavigate("/compliance")}
                    >
                      View compliance <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </QuietCard>
              )}
            </div>
          ) : tab === "complaints" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Complaints</h2>
                <p className="text-sm text-slate-500 mt-1">Volume, timeliness, and where pressure sits.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DetailMetric label="Received" value={complaintKpis.total} />
                <DetailMetric label="Still open" value={complaintKpis.open} />
                <DetailMetric label="Avg resolution (days)" value={complaintKpis.avgResolution ?? "—"} />
                <DetailMetric label="On-time SLA" value={complaintKpis.slaRate != null ? `${complaintKpis.slaRate}%` : "—"} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartShell title="By programme / domain">
                  {complaintKpis.byDomain.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={complaintKpis.byDomain} layout="vertical" margin={{ left: 4, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1ef" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="count" fill={CHART_GREEN} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartShell>
                <ChartShell title="Open cases by status">
                  {complaintKpis.openByStatus.length === 0 ? <EmptyChart message="No open cases." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={complaintKpis.openByStatus}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1ef" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="count" fill={CHART_SOFT} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartShell>
              </div>
              <QuietCard className="overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">Highest volume states</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {complaintKpis.byState.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-400 text-center">No state data</p>
                  ) : complaintKpis.byState.map((row) => (
                    <div key={row.name} className="px-5 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700">{row.name}</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{row.count}</span>
                    </div>
                  ))}
                </div>
              </QuietCard>
            </div>
          ) : tab === "servicom" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">SERVICOM</h2>
                <p className="text-sm text-slate-500 mt-1">How citizens and facilities are rating service.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DetailMetric label="Comment cards" value={commentKpis.count} />
                <DetailMetric label="Average rating" value={commentKpis.overall ?? "—"} />
                <DetailMetric label="Facilities surveyed" value={surveyKpis.facilities} />
                <DetailMetric label="Positive response" value={surveyKpis.responseRate != null ? `${surveyKpis.responseRate}%` : "—"} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuietCard className="p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#eef5f1] text-[#1a6b4a] flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Comment cards</p>
                      <p className="text-xs text-slate-500">Citizen feedback register</p>
                    </div>
                  </div>
                  {onNavigate && (
                    <Button variant="ghost" size="sm" onClick={() => onNavigate("/sdo/servicom/comment-card")}>
                      Open <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </QuietCard>
                <QuietCard className="p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#eef5f1] text-[#1a6b4a] flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Facility surveys</p>
                      <p className="text-xs text-slate-500">HCF customer satisfaction</p>
                    </div>
                  </div>
                  {onNavigate && (
                    <Button variant="ghost" size="sm" onClick={() => onNavigate("/sdo/servicom/satisfaction")}>
                      Open <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </QuietCard>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Stock & assets</h2>
                <p className="text-sm text-slate-500 mt-1">Fixed assets and stock prepayment register.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DetailMetric label="Assets on register" value={assetKpis.total} />
                <DetailMetric label="Need attention" value={assetKpis.poor + assetKpis.missing} />
                <DetailMetric label="Prepayment entries" value={prepKpis.count} />
                <DetailMetric label="Prepayment spend" value={prepKpis.count ? naira.format(prepKpis.total) : "—"} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartShell title="Assets by category">
                  {assetKpis.byCategory.length === 0 ? <EmptyChart message="No assets in this view." /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assetKpis.byCategory} layout="vertical" margin={{ left: 4, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1ef" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="count" fill={CHART_GREEN} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartShell>
                <QuietCard className="p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="h-10 w-10 rounded-full bg-[#eef5f1] text-[#1a6b4a] flex items-center justify-center mb-4">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-medium text-slate-800">Stock prepayment register</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {prepKpis.count
                        ? `${prepKpis.count} entries totalling ${naira.format(prepKpis.total)}.`
                        : "No prepayment entries for this filter."}
                    </p>
                  </div>
                  {onNavigate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => onNavigate("/store-management/prepayment-analysis")}
                    >
                      Open register <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </QuietCard>
              </div>
            </div>
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

export { isDirectorEnforcementUser } from "@/src/access/accessUtils";
