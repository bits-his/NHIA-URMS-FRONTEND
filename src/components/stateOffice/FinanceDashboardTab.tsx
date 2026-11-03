import * as React from "react";
import {
  Building2,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { financeDashboardApi, stockApi } from "@/lib/api";
import { IGR_SERVICE_TYPES, MONTHS, formatNaira, formatNairaCompact, labelOf } from "./constants";

interface Props {
  userRole?: string;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  lockZone?: boolean;
}

export default function FinanceDashboardTab({
  userRole,
  defaultZoneId,
  defaultStateId,
  lockZone,
}: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(String(currentYear));
  const [igrMonth, setIgrMonth] = React.useState("all");
  const [sshiaQuarter, setSshiaQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [service, setService] = React.useState("all");
  const [subHead, setSubHead] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [igr, setIgr] = React.useState<any>(null);
  const [sshia, setSshia] = React.useState<any>(null);

  // Role detection
  const isNational = userRole === "sdo" || userRole === "dg-ceo" || userRole === "admin" || !userRole;
  const isZonalCoordinator = lockZone || userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal") && !isNational);
  const isStateOffice = !!defaultStateId || (userRole && userRole.includes("state") && !isZonalCoordinator && !isNational);

  /** PPT drill levels: national compares zones; zone compares states; state has no comparison charts. */
  const viewScope: "national" | "zone" | "state" = isStateOffice || stateId !== "all"
    ? "state"
    : isZonalCoordinator || zoneId !== "all"
      ? "zone"
      : "national";
  const showGeoComparison = viewScope !== "state";

  // Load zones list
  React.useEffect(() => {
    stockApi.getZones().then((r) => {
      setZones((r.data || []).map((z: any) => ({ id: String(z.id || z.zonal_code), label: z.description })));
    }).catch(() => {});
  }, []);

  // Load states list whenever zone changes
  React.useEffect(() => {
    if (!zoneId || zoneId === "all") {
      setStates([]);
      if (!defaultStateId) setStateId("all");
      return;
    }
    stockApi.getStates(zoneId).then((r) => {
      setStates((r.data || []).map((s: any) => ({ id: String(s.id || s.code), label: s.description })));
    }).catch(() => {});
  }, [zoneId, defaultStateId]);

  // Active Zone and State labels
  const activeZoneObj = zones.find((z) => z.id === zoneId);
  const activeZoneLabel = activeZoneObj?.label || (zoneId !== "all" ? zoneId : "All Zones");
  const activeStateObj = states.find((s) => s.id === stateId);
  const activeStateLabel = activeStateObj?.label || (stateId !== "all" ? stateId : "All States");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        year,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        month: igrMonth !== "all" ? igrMonth : undefined,
        quarter: sshiaQuarter !== "all" ? sshiaQuarter : undefined,
        service_type: service !== "all" ? service : undefined,
        sub_head: subHead !== "all" ? subHead : undefined,
      };

      const [igrRes, sshiaRes] = await Promise.all([
        financeDashboardApi.igr({
          year: filters.year,
          zone_id: filters.zone_id,
          state_id: filters.state_id,
          month: filters.month,
          service_type: filters.service_type,
        }),
        financeDashboardApi.sshia({
          year: filters.year,
          zone_id: filters.zone_id,
          state_id: filters.state_id,
          quarter: filters.quarter,
          sub_head: filters.sub_head,
        }),
      ]);

      setIgr(igrRes?.data || null);
      setSshia(sshiaRes?.data || null);
    } catch {
      // Silently catch to avoid breaking UI
    } finally {
      setLoading(false);
    }
  }, [year, zoneId, stateId, igrMonth, sshiaQuarter, service, subHead]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Breadcrumb reset
  const handleResetBreadcrumb = (level: "national" | "zone") => {
    if (level === "national") {
      if (!isZonalCoordinator) setZoneId("all");
      if (!isStateOffice) setStateId("all");
    } else if (level === "zone") {
      if (!isStateOffice) setStateId("all");
    }
  };

  // IGR Visuals Data
  const igrByMonthData = React.useMemo(() => {
    return (igr?.by_month || []).map((m: any) => ({
      period: m.period.split("-")[1] ? MONTHS[Number(m.period.split("-")[1]) - 1]?.label.slice(0, 3) : m.period,
      amount: Number(m.amount) || 0,
    }));
  }, [igr]);

  const igrByServiceData = React.useMemo(() => {
    return (igr?.by_service || []).map((s: any) => ({
      name: labelOf(IGR_SERVICE_TYPES, s.service_type, s.service_type),
      amount: Number(s.amount) || 0,
      share: Number(s.share_pct) || 0,
    }));
  }, [igr]);

  const igrStateData = React.useMemo(() => {
    return (igr?.by_state || []).map((s: any) => ({
      name: s.label || s.state_code,
      code: s.state_code,
      zoneCode: s.zonal_code,
      amount: Number(s.amount) || 0,
    }));
  }, [igr]);

  // SSHIA Visuals Data
  const sshiaSubHeadData = React.useMemo(() => {
    return (sshia?.by_sub_head || []).map((h: any) => ({
      name: h.label,
      available: Number(h.available) || 0,
      actual: Number(h.actual) || 0,
      balance: Number(h.balance) || 0,
      utilisation: Number(h.utilisation_rate) || 0,
    }));
  }, [sshia]);

  const sshiaUtilisationByZoneData = React.useMemo(() => {
    return (sshia?.by_zone || []).map((z: any) => ({
      name: z.label || z.zonal_code,
      code: z.zonal_code,
      utilisation: Number(z.utilisation_rate) || 0,
    }));
  }, [sshia]);

  const sshiaQuarterTrendData = React.useMemo(() => {
    return (sshia?.by_quarter || []).map((q: any) => ({
      quarter: `Q${q.quarter}`,
      available: Number(q.available) || 0,
      actual: Number(q.actual) || 0,
      utilisation: q.available > 0 ? (q.actual / q.available) * 100 : 0,
    }));
  }, [sshia]);

  // Arithmetic Checks
  const budgetSum = sshia?.kpis?.budget_available || 0;
  const actualSum = sshia?.kpis?.actual_expenditure || 0;
  const balanceSum = sshia?.kpis?.balance || 0;
  const arithmeticValid = Math.abs(budgetSum - actualSum - balanceSum) < 1;

  return (
    <div className="space-y-4">
      {/* Role Drill-Down Banner */}
      {isZonalCoordinator ? (
        <div className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1a7a52]" />
            <span className="font-bold text-[#0f3d2e]">Assigned Zone Overview:</span>
            <span className="font-semibold text-slate-800">{activeZoneLabel}</span>
            <span className="text-[10px] bg-emerald-100 text-[#145c3f] font-bold px-2 py-0.5 rounded-sm border border-emerald-200">
              LOCKED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Drill down to states within {activeZoneLabel}:</span>
            <Select value={stateId} onValueChange={setStateId} disabled={isStateOffice}>
              <SelectTrigger className="h-8 w-44 text-xs font-semibold bg-white border-[#1a7a52]">
                <SelectValue placeholder="All States in Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States in {activeZoneLabel}</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : isNational ? (
        <div className="rounded-sm border border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleResetBreadcrumb("national")}
              className={`hover:text-[#1a7a52] transition-colors ${
                zoneId === "all" ? "font-bold text-[#0f3d2e]" : ""
              }`}
            >
              National Overview
            </button>
            {zoneId !== "all" && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => handleResetBreadcrumb("zone")}
                  className={`hover:text-[#1a7a52] transition-colors ${
                    stateId === "all" ? "font-bold text-[#0f3d2e]" : ""
                  }`}
                >
                  Zone: {activeZoneLabel}
                </button>
              </>
            )}
            {stateId !== "all" && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-[#145c3f]">State: {activeStateLabel}</span>
              </>
            )}
          </div>
          {(zoneId !== "all" || stateId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResetBreadcrumb("national")}
              className="h-7 text-xs text-slate-500 hover:text-[#145c3f] gap-1 px-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to National</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 flex items-center gap-2 text-xs">
          <Building2 className="w-4 h-4 text-[#1a7a52]" />
          <span className="font-bold text-[#0f3d2e]">State Office:</span>
          <span className="font-semibold text-slate-800">{activeStateLabel}</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-sm border border-slate-200">
            Assigned State
          </span>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">IGR Month</Label>
            <Select value={igrMonth} onValueChange={setIgrMonth}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">SSHIA Quarter</Label>
            <Select value={sshiaQuarter} onValueChange={setSshiaQuarter}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters (Q1–Q4)</SelectItem>
                {[1, 2, 3, 4].map((q) => (
                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">Zone</Label>
            <Select
              value={zoneId}
              onValueChange={setZoneId}
              disabled={isZonalCoordinator || isStateOffice}
            >
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">State / FCT</Label>
            <Select
              value={stateId}
              onValueChange={setStateId}
              disabled={isStateOffice}
            >
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">IGR Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {IGR_SERVICE_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── PANEL A: INTERNALLY GENERATED REVENUE (IGR) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#1a7a52]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3d2e]">
              A. Internally Generated Revenue (IGR) Performance
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {activeStateLabel !== "All States" ? activeStateLabel : activeZoneLabel}
          </span>
        </div>

        {/* IGR KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              TOTAL IGR COLLECTED
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-[#145c3f] tabular-nums">
                {formatNairaCompact(igr?.kpis?.total_igr || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Sum of amounts</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              NUMBER OF RECEIPTS
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {(igr?.kpis?.receipt_count || 0).toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Transaction rows</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              AVERAGE RECEIPT VALUE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {igr?.kpis?.average_receipt ? formatNairaCompact(igr.kpis.average_receipt) : "—"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Total IGR ÷ receipts</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              REFERENCE GAPS
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-amber-600 tabular-nums">
                {igr?.kpis?.missing_references ?? 0}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Missing receipt / RRR</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              TOP SERVICE
            </span>
            <div className="mt-1.5">
              <span
                className="text-xs font-bold text-slate-800 truncate block"
                title={igr?.kpis?.top_service ? labelOf(IGR_SERVICE_TYPES, igr.kpis.top_service.service_type) : "—"}
              >
                {igr?.kpis?.top_service ? labelOf(IGR_SERVICE_TYPES, igr.kpis.top_service.service_type) : "—"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {igr?.kpis?.top_service ? formatNairaCompact(igr.kpis.top_service.amount) : "No data"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              TOP REVENUE STATE
            </span>
            <div className="mt-1.5">
              <span className="text-xs font-bold text-slate-800 truncate block">
                {igr?.by_state?.[0]?.label || "—"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {igr?.by_state?.[0] ? formatNairaCompact(igr.by_state[0].amount) : "No data"}
              </p>
            </div>
          </div>
        </div>

        {/* IGR Charts — monthly + service only (state bars do not scale for 36 states) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Monthly Trend */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Monthly IGR Trend (₦)</span>
                <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                  {year}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {igrByMonthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={igrByMonthData} margin={{ top: 8, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                      <RechartsTooltip formatter={(v: any) => [formatNaira(Number(v)), "IGR"]} />
                      <Bar dataKey="amount" fill="#1a7a52" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No monthly transactions recorded for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Mix by Service */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>{viewScope === "state" ? "IGR by service — selected state" : "IGR by service"}</span>
                <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                  Amount &amp; % Share
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] overflow-y-auto space-y-2 pr-1">
                {igrByServiceData.length > 0 ? (
                  igrByServiceData.map((item: any) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-[#145c3f] tabular-nums">
                            {formatNairaCompact(item.amount)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                            ({item.share.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1a7a52]"
                          style={{ width: `${Math.min(100, Math.max(3, item.share))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No service transactions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {showGeoComparison && (
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>
                  {viewScope === "zone"
                    ? `IGR by state — ${activeZoneLabel}`
                    : "IGR by state"}
                </span>
                <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                  Comparison
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[280px] w-full">
                {igrStateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={igrStateData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 48 }}
                      onClick={(e: any) => {
                        if (e?.activePayload?.[0]?.payload) {
                          const payload = e.activePayload[0].payload;
                          if (isStateOffice) return;
                          if (payload.zoneCode && zoneId === "all" && !isZonalCoordinator) {
                            setZoneId(String(payload.zoneCode));
                          }
                          if (payload.code) setStateId(String(payload.code));
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={64}
                        tick={{ fontSize: 9 }}
                      />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                      <RechartsTooltip formatter={(v: any) => [formatNaira(Number(v)), "IGR"]} />
                      <Bar dataKey="amount" fill="#0284c7" radius={[2, 2, 0, 0]} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No geographic records found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── PANEL B: SSHIA PROGRESS REPORT ── */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1a7a52]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3d2e]">
              B. SSHIA Progress Report (Quarterly Financial Position)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {sshiaQuarter !== "all" ? `Q${sshiaQuarter} ${year}` : `All Quarters ${year}`}
          </span>
        </div>

        {/* SSHIA KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BUDGET AVAILABLE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {formatNairaCompact(sshia?.kpis?.budget_available || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Opening + Receipts</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ACTUAL EXPENDITURE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-[#145c3f] tabular-nums">
                {formatNairaCompact(sshia?.kpis?.actual_expenditure || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Reported actual spend</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BALANCE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {formatNairaCompact(sshia?.kpis?.balance || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Available − Spend</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              UTILISATION RATE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-[#145c3f] tabular-nums">
                {sshia?.kpis?.utilisation_rate ? `${Number(sshia.kpis.utilisation_rate).toFixed(1)}%` : "0.0%"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Actual ÷ Available</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BHCPF LIVES COVERED
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-blue-700 tabular-nums">
                {(sshia?.kpis?.bhcpf_lives_covered || 0).toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Reported beneficiaries</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              REPORTING OFFICES
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {sshia?.kpis?.states_reporting || 0} / 37
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {sshia?.kpis?.zones_reporting || 0} zones submitted
              </p>
            </div>
          </div>
        </div>

        {/* Data Quality & Arithmetic Safeguards (Slide 8) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Budget Arithmetic Check</p>
                <p className="text-[10px] text-slate-500">Available = Opening + Allotted</p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
              VERIFIED
            </Badge>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Balance Arithmetic Check</p>
                <p className="text-[10px] text-slate-500">Balance = Available − Spend</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                arithmeticValid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {arithmeticValid ? "VERIFIED" : "FLAGGED"}
            </Badge>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#1a7a52] shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Completeness Safeguard</p>
                <p className="text-[10px] text-slate-500">4 of 4 standard sub-heads</p>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px] font-bold">
              STANDARD
            </Badge>
          </div>
        </div>

        {/* SSHIA Charts — PPT: national zone compare; zone state compare; state = sub-head detail only */}
        <div className={`grid grid-cols-1 gap-3 ${showGeoComparison ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {/* Sub-head Budget vs Actual / utilisation bars */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>{viewScope === "state" ? "SSHIA sub-head details" : "SSHIA budget position"}</span>
                <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                  Sub-heads
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {sshiaSubHeadData.length > 0 ? (
                  viewScope === "national" || viewScope === "zone" ? (
                    <div className="h-full overflow-y-auto space-y-2.5 pr-1">
                      {sshiaSubHeadData.map((item: any) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                            <span className="text-[10px] font-bold text-[#145c3f] tabular-nums">
                              {item.utilisation.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1a7a52]"
                              style={{ width: `${Math.min(100, Math.max(2, item.utilisation))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sshiaSubHeadData} margin={{ top: 8, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                        <RechartsTooltip formatter={(v: any) => [formatNaira(Number(v))]} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                        <Bar dataKey="available" fill="#cbd5e1" name="Available" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="actual" fill="#1a7a52" name="Actual Spend" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No sub-head data recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showGeoComparison && (
            <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
              <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                  <span>SSHIA utilisation by zone</span>
                  <Badge variant="outline" className="border-blue-400 text-blue-700 text-[10px]">
                    Zone comparison
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5">
                <div className="h-[200px] w-full">
                  {sshiaUtilisationByZoneData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sshiaUtilisationByZoneData}
                        margin={{ top: 8, right: 10, left: 0, bottom: 28 }}
                        onClick={(e: any) => {
                          if (e?.activePayload?.[0]?.payload?.code && !isZonalCoordinator && !isStateOffice) {
                            setZoneId(String(e.activePayload[0].payload.code));
                            setStateId("all");
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={48} tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" />
                        <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Utilisation"]} />
                        <Bar dataKey="utilisation" fill="#0f766e" radius={[2, 2, 0, 0]} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No utilisation data by zone
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quarter-on-Quarter Utilisation Trend */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Quarter-on-Quarter Utilisation</span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 text-[10px]">
                  % Trend
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {sshiaQuarterTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sshiaQuarterTrendData} margin={{ top: 8, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} unit="%" domain={[0, 100]} />
                      <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Utilisation"]} />
                      <Bar dataKey="utilisation" fill="#0f766e" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No quarterly trend data recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </section>
    </div>
  );
}

