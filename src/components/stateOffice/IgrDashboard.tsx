import * as React from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { financeDashboardApi, stockApi } from "@/lib/api";
import { IGR_SERVICE_TYPES, MONTHS, formatNaira, formatNairaCompact, labelOf } from "./constants";

interface Props {
  onBack?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  /** When true, parent Finance Dashboard owns chrome — skip header. */
  embedded?: boolean;
}

export default function IgrDashboard({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  embedded = false,
}: Props) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [service, setService] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [dashboardData, setDashboardData] = React.useState<any>(null);

  const isNational = userRole === "sdo" || userRole === "dg-ceo" || userRole === "admin" || !userRole;
  const isZonalCoordinator = userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal") && !isNational);
  const isStateOffice = !!defaultStateId || (userRole && userRole.includes("state") && !isZonalCoordinator && !isNational);
  const viewScope: "national" | "zone" | "state" = isStateOffice || stateId !== "all"
    ? "state"
    : isZonalCoordinator || zoneId !== "all"
      ? "zone"
      : "national";
  const showGeoComparison = viewScope !== "state";

  React.useEffect(() => {
    stockApi.getZones().then((r) => {
      setZones((r.data || []).map((z: any) => ({ id: String(z.id || z.zonal_code), label: z.description })));
    }).catch(() => {});
  }, []);

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

  const activeZoneObj = zones.find((z) => z.id === zoneId);
  const activeZoneLabel = activeZoneObj?.label || (zoneId !== "all" ? zoneId : "All Zones");

  const loadData = React.useCallback(async () => {
    try {
      const filters: Record<string, any> = {
        year,
        month: month !== "all" ? month : undefined,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        service_type: service !== "all" ? service : undefined,
      };
      const dashRes = await financeDashboardApi.igr(filters);
      setDashboardData(dashRes?.data || null);
    } catch {
      setDashboardData(null);
    }
  }, [year, month, zoneId, stateId, service]);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  const igrByMonthData = React.useMemo(() => {
    return (dashboardData?.by_month || []).map((m: any) => ({
      period: m.period.split("-")[1] ? MONTHS[Number(m.period.split("-")[1]) - 1]?.label.slice(0, 3) : m.period,
      amount: Number(m.amount) || 0,
    }));
  }, [dashboardData]);

  const igrByServiceData = React.useMemo(() => {
    return (dashboardData?.by_service || []).map((s: any) => ({
      name: labelOf(IGR_SERVICE_TYPES, s.service_type, s.service_type),
      amount: Number(s.amount) || 0,
      share: Number(s.share_pct) || 0,
    }));
  }, [dashboardData]);

  const igrStateData = React.useMemo(() => {
    return (dashboardData?.by_state || []).map((s: any) => ({
      name: s.label || s.state_code,
      code: s.state_code,
      zoneCode: s.zonal_code,
      amount: Number(s.amount) || 0,
    }));
  }, [dashboardData]);

  const kpis = dashboardData?.kpis || {};

  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-[#f4f7f5]"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">IGR Dashboard</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 w-full space-y-4">
          <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
                    <Label className="text-[11px] font-bold text-slate-600 uppercase">Month</Label>
                    <Select value={month} onValueChange={setMonth}>
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
                    <Label className="text-[11px] font-bold text-slate-600 uppercase">Revenue Service</Label>
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

              {/* 6 PPT KPI Cards (Slide 3 & 4) */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    TOTAL IGR
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-[#145c3f] tabular-nums">
                      {formatNairaCompact(kpis.total_igr || 0)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sum of Amount (NGN)</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    TRANSACTION COUNT
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {(kpis.receipt_count || 0).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Count of receipt rows</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    AVERAGE RECEIPT VALUE
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {kpis.average_receipt ? formatNairaCompact(kpis.average_receipt) : "—"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">IGR ÷ transaction count</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REFERENCE GAPS
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-amber-600 tabular-nums">
                      {kpis.missing_references ?? 0}
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
                      title={kpis.top_service ? labelOf(IGR_SERVICE_TYPES, kpis.top_service.service_type) : "—"}
                    >
                      {kpis.top_service ? labelOf(IGR_SERVICE_TYPES, kpis.top_service.service_type) : "—"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {kpis.top_service ? formatNairaCompact(kpis.top_service.amount) : "No data"}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    TOP REVENUE STATE
                  </span>
                  <div className="mt-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {dashboardData?.by_state?.[0]?.label || "—"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {dashboardData?.by_state?.[0] ? formatNairaCompact(dashboardData.by_state[0].amount) : "No data"}
                    </p>
                  </div>
                </div>
              </div>

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
                          No monthly transactions recorded
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Mix by Service */}
                <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                      <span>Revenue Mix by Service</span>
                      <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                        Share &amp; Amount
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
            </div>
        </div>
      </ScrollArea>
    </div>
  );
}
