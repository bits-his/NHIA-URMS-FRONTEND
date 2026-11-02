import * as React from "react";
import {
  ArrowLeft,
  BarChart3,
  Receipt,
  RefreshCw,
  Plus,
  Eye,
  TrendingUp,
  AlertCircle,
  Building2,
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
} from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { stateOfficeApi, financeDashboardApi, stockApi } from "@/lib/api";
import { IGR_SERVICE_TYPES, MONTHS, formatAmount, formatNaira, formatDateShort, labelOf } from "./constants";
import IgrReportPage from "./IgrReportPage";
import IgrReportDetail from "./IgrReportDetail";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  awaiting_review: { label: "Awaiting Review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  returned: { label: "Returned", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  endorsed: { label: "Endorsed", cls: "bg-teal-100 text-teal-800 border-teal-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
}

export default function IgrWorkspace({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
}: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "register">("dashboard");
  const [mode, setMode] = React.useState<"tabs" | "form" | "detail">("tabs");
  const [selectedId, setSelectedId] = React.useState<string | number | null>(null);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [service, setService] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [tableData, setTableData] = React.useState<any[]>([]);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Role detection
  const isNational = userRole === "sdo" || userRole === "dg-ceo" || userRole === "admin" || !userRole;
  const isZonalCoordinator = userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal") && !isNational);
  const isStateOffice = !!defaultStateId || (userRole && userRole.includes("state") && !isZonalCoordinator && !isNational);

  // Load zones
  React.useEffect(() => {
    stockApi.getZones().then((r) => {
      setZones((r.data || []).map((z: any) => ({ id: String(z.id || z.zonal_code), label: z.description })));
    }).catch(() => {});
  }, []);

  // Load states whenever zone changes
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
  const activeStateObj = states.find((s) => s.id === stateId);
  const activeStateLabel = activeStateObj?.label || (stateId !== "all" ? stateId : "All States");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, any> = {
        year,
        month: month !== "all" ? month : undefined,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        service_type: service !== "all" ? service : undefined,
      };

      const [dashRes, listRes] = await Promise.all([
        financeDashboardApi.igr(filters),
        stateOfficeApi.igr.list(filters),
      ]);

      setDashboardData(dashRes?.data || null);
      setTableData(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch {
      setTableData([]);
    } finally {
      setLoading(false);
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

  const handleBack = () => {
    if (mode !== "tabs") {
      setMode("tabs");
      setSelectedId(null);
      setEditingId(null);
    } else {
      onBack();
    }
  };

  // Visuals Data
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
    return (dashboardData?.by_state || []).slice(0, 8).map((s: any) => ({
      name: s.label || s.state_code,
      code: s.state_code,
      amount: Number(s.amount) || 0,
    }));
  }, [dashboardData]);

  const igrZoneData = React.useMemo(() => {
    return (dashboardData?.by_zone || []).map((z: any) => ({
      name: z.label || z.zonal_code,
      code: z.zonal_code,
      amount: Number(z.amount) || 0,
    }));
  }, [dashboardData]);

  const kpis = dashboardData?.kpis || {};

  const columns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "reference_id",
        header: "REF ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[#1a7a52]">
            #{row.original.reference_id || row.original.id}
          </span>
        ),
      },
      {
        id: "state_name",
        header: "State / FCT",
        accessorFn: (row) => row.state?.description || row.state_code || "—",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
            {row.original.state?.description || row.original.state_code || "—"}
          </span>
        ),
      },
      {
        id: "date",
        header: "Date",
        accessorFn: (row) => row.entry_date || row.submission_date || "",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 whitespace-nowrap tabular-nums">
            {formatDateShort(row.original.entry_date || row.original.submission_date)}
          </span>
        ),
      },
      {
        id: "service_type",
        header: "Service Type",
        accessorFn: (row) => labelOf(IGR_SERVICE_TYPES, row.service_type || ""),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-800">
            {labelOf(IGR_SERVICE_TYPES, row.original.service_type || "—")}
          </span>
        ),
      },
      {
        accessorKey: "principal_name",
        header: "Principal",
        cell: ({ row }) => (
          <span
            className="text-xs font-medium text-slate-700 truncate max-w-[150px] inline-block"
            title={row.original.principal_name || "—"}
          >
            {row.original.principal_name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "receipt_no",
        header: "Receipt No.",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
            {row.original.receipt_no || "—"}
          </span>
        ),
      },
      {
        accessorKey: "bill_rrr_no",
        header: "Bill / RRR",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
            {row.original.bill_rrr_no || "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount (₦)",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-[#145c3f] tabular-nums whitespace-nowrap">
            {formatAmount(row.original.amount || 0)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const st = row.original.status || "draft";
          const sc = STATUS_CONFIG[st] || STATUS_CONFIG.draft;
          return (
            <Badge className={`text-[10px] px-2 py-0.5 border font-semibold ${sc.cls}`}>
              {sc.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] border border-[#1a7a52]/40 bg-[#f4f7f5] hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
              onClick={() => {
                setSelectedId(row.original.id || row.original.reference_id);
                setMode("detail");
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            aria-label="Back"
            onClick={handleBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {mode === "form"
                ? editingId ? "Edit IGR Transaction" : "Record IGR Transaction"
                : mode === "detail"
                ? "IGR Transaction Details"
                : "Internally Generated Revenue (IGR)"}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {mode === "tabs"
                ? "IGR revenue performance dashboard, fee collections, and transactions register"
                : "Manage transaction records, revenue breakdown, and reviews"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === "tabs" && (
            <>
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

              {canCreate && (
                <Button
                  size="sm"
                  className="h-8.5 bg-[#1a7a52] hover:bg-[#145c3f] text-white border border-[#145c3f] font-bold text-xs gap-1.5 rounded-sm shadow-xs"
                  onClick={() => {
                    setEditingId(null);
                    setMode("form");
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record IGR</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clean Tab Navigation Bar */}
      {mode === "tabs" && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
          <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
              className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
                activeTab === "dashboard"
                  ? "border-[#145c3f] text-[#145c3f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <BarChart3 className="size-4 shrink-0" />
              <span>IGR Dashboard</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              onClick={() => setActiveTab("register")}
              className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
                activeTab === "register"
                  ? "border-[#145c3f] text-[#145c3f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Receipt className="size-4 shrink-0" />
              <span>Transactions Register</span>
              <span
                className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  activeTab === "register"
                    ? "bg-[#e8f6ee] text-[#145c3f]"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                }`}
              >
                {tableData.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          {mode === "tabs" && activeTab === "dashboard" && (
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
                      onClick={() => { setZoneId("all"); setStateId("all"); }}
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
                          onClick={() => setStateId("all")}
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
                      onClick={() => { setZoneId("all"); setStateId("all"); }}
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
                      {formatNaira(kpis.total_igr || 0)}
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
                      {kpis.average_receipt ? formatNaira(kpis.average_receipt) : "—"}
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
                      {kpis.top_service ? formatNaira(kpis.top_service.amount) : "No data"}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    TOP REVENUE ZONE
                  </span>
                  <div className="mt-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {dashboardData?.by_zone?.[0]?.label || "—"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {dashboardData?.by_zone?.[0] ? formatNaira(dashboardData.by_zone[0].amount) : "No data"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 PPT Charts (Slide 3, 4, 5) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

                {/* Revenue Mix by Service (Slide 5) */}
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
                                  {formatNaira(item.amount)}
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

                {/* State Comparison (Slide 4) */}
                <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                      <span>{zoneId === "all" ? "IGR by Zone" : `State Comparison (${activeZoneLabel})`}</span>
                      <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                        Comparison
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2.5">
                    <div className="h-[200px] w-full">
                      {(zoneId === "all" ? igrZoneData : igrStateData).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={zoneId === "all" ? igrZoneData : igrStateData}
                            margin={{ top: 8, right: 10, left: 0, bottom: 20 }}
                            onClick={(e: any) => {
                              if (e?.activePayload?.[0]?.payload) {
                                const payload = e.activePayload[0].payload;
                                if (zoneId === "all" && !isZonalCoordinator) {
                                  setZoneId(payload.code);
                                } else if (stateId === "all" && !isStateOffice) {
                                  setStateId(payload.code);
                                }
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
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
              </div>
            </div>
          )}

          {mode === "tabs" && activeTab === "register" && (
            <div className="space-y-4">
              <ShadcnDataTable
                title="IGR TRANSACTIONS REGISTER"
                infoTooltip="Internally Generated Revenue transactions reported across NHIA state offices."
                columns={columns}
                data={tableData}
                loading={loading}
                searchPlaceholder="Search by principal, receipt #, RRR, state, service..."
                searchClassName="h-9 rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] pl-8 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400"
                emptyMessage="No IGR transactions recorded for this view."
                onRowClick={(row) => {
                  setSelectedId(row.id || row.reference_id);
                  setMode("detail");
                }}
                pageSize={25}
                showTableOptions={false}
              />
            </div>
          )}

          {/* Form and Detail Views */}
          {mode === "form" && (
            <IgrReportPage
              reportId={editingId}
              onBack={() => setMode("tabs")}
              onSubmitted={() => {
                setMode("tabs");
                handleSync();
              }}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
            />
          )}

          {mode === "detail" && selectedId && (
            <IgrReportDetail
              reportId={selectedId}
              onBack={() => setMode("tabs")}
              onEdit={() => {
                setEditingId(selectedId);
                setMode("form");
              }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

