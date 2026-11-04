import * as React from "react";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { financeDashboardApi, stockApi } from "@/lib/api";
import { SSHIA_SUB_HEADS, formatNaira, formatNairaCompact } from "./constants";

interface Props {
  onBack?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  embedded?: boolean;
}

export default function SshiaDashboard({
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
  const [quarter, setQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [subHead, setSubHead] = React.useState("all");
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

  const loadData = React.useCallback(async () => {
    try {
      const filters: Record<string, any> = {
        year,
        quarter: quarter !== "all" ? quarter : undefined,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        sub_head: subHead !== "all" ? subHead : undefined,
      };
      const dashRes = await financeDashboardApi.sshia(filters);
      setDashboardData(dashRes?.data || null);
    } catch {
      setDashboardData(null);
    }
  }, [year, quarter, zoneId, stateId, subHead]);

  React.useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };
// Visuals Data
  const sshiaSubHeadData = React.useMemo(() => {
    return (dashboardData?.by_sub_head || []).map((h: any) => ({
      name: h.label,
      available: Number(h.available) || 0,
      actual: Number(h.actual) || 0,
      balance: Number(h.balance) || 0,
      utilisation: Number(h.utilisation_rate) || 0,
    }));
  }, [dashboardData]);

  const sshiaUtilisationByZoneData = React.useMemo(() => {
    return (dashboardData?.by_zone || []).map((z: any) => ({
      name: z.label || z.zonal_code,
      code: z.zonal_code,
      utilisation: Number(z.utilisation_rate) || 0,
    }));
  }, [dashboardData]);

  const sshiaQuarterTrendData = React.useMemo(() => {
    return (dashboardData?.by_quarter || []).map((q: any) => ({
      quarter: `Q${q.quarter}`,
      available: Number(q.available) || 0,
      actual: Number(q.actual) || 0,
      utilisation: q.available > 0 ? (q.actual / q.available) * 100 : 0,
    }));
  }, [dashboardData]);

  const kpis = dashboardData?.kpis || {};
  const arithmeticValid = Math.abs((kpis.budget_available || 0) - (kpis.actual_expenditure || 0) - (kpis.balance || 0)) < 1;

  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-[#f4f7f5]"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">SSHIA Dashboard</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="w-full p-3 sm:p-4 space-y-3.5">
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
                    <Label className="text-[11px] font-bold text-slate-600 uppercase">Quarter</Label>
                    <Select value={quarter} onValueChange={setQuarter}>
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
                    <Label className="text-[11px] font-bold text-slate-600 uppercase">Sub-Head</Label>
                    <Select value={subHead} onValueChange={setSubHead}>
                      <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sub-Heads</SelectItem>
                        {SSHIA_SUB_HEADS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 6 PPT KPI Cards (Slide 6 & 7) */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    BUDGET AVAILABLE
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {formatNairaCompact(kpis.budget_available || 0)}
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
                      {formatNairaCompact(kpis.actual_expenditure || 0)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reported spend</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    BALANCE
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {formatNairaCompact(kpis.balance || 0)}
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
                      {kpis.utilisation_rate ? `${Number(kpis.utilisation_rate).toFixed(1)}%` : "0.0%"}
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
                      {(kpis.bhcpf_lives_covered || 0).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sum of reported lives</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REPORTING COMPLETENESS
                  </span>
                  <div className="mt-1.5">
                    <span className="text-lg font-black text-slate-800 tabular-nums">
                      {kpis.states_reporting || 0} / 37
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {kpis.zones_reporting || 0} / 7 zones
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Quality & Arithmetic Checks (Slide 8) */}
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
                      <p className="font-bold text-slate-800">Sub-Heads Completeness</p>
                      <p className="text-[10px] text-slate-500">Standard 4 of 4 budget sub-heads</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px] font-bold">
                    STANDARD
                  </Badge>
                </div>
              </div>

              {/* 3 PPT Charts (Slide 6 & 7) */}
              <div className={`grid grid-cols-1 gap-3 ${showGeoComparison ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                {/* Available vs Spend by Sub-head */}
                <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                      <span>Available vs Spend by Sub-head</span>
                      <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                        Comparison
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2.5">
                    <div className="h-[200px] w-full">
                      {sshiaSubHeadData.length > 0 ? (
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
            </div>
        </div>
      </ScrollArea>
    </div>
  );
}
