import * as React from "react";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { stateOfficeApi, stockApi } from "@/lib/api";
import { IGR_SERVICE_TYPES, MONTHS, formatAmount, formatDateShort, labelOf } from "./constants";
import { RegisterStatsCards, workflowRegisterStats } from "./RegisterStatsCards";
import IgrReportPage from "./IgrReportPage";
import IgrReportDetail from "./IgrReportDetail";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { FinanceRowActions, useFinanceFinalSubmit } from "./shared/FinanceRowActions";
import type { FinanceChrome } from "./FinanceWorkspace";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  awaiting_review: { label: "Awaiting Review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  returned: { label: "Returned", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  endorsed: { label: "Endorsed", cls: "bg-teal-100 text-teal-800 border-teal-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  /** Parent Finance page owns the page title and tabs. */
  embedded?: boolean;
  onChromeChange?: (chrome: FinanceChrome | null) => void;
}

export default function IgrWorkspace({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  embedded = false,
  onChromeChange,
}: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<"tabs" | "form" | "detail">("tabs");
  const [selectedId, setSelectedId] = React.useState<string | number | null>(null);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [detailStatus, setDetailStatus] = React.useState<string | null>(null);
  const onDetailStatusChange = React.useCallback((status: string | null) => {
    setDetailStatus(status);
  }, []);
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

      const listRes = await stateOfficeApi.igr.list(filters);
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
  const reloadList = React.useCallback(() => setRefreshKey((k) => k + 1), []);
  const { finalBusy, requestFinalSubmit, modal: finalSubmitModal } = useFinanceFinalSubmit("igr", reloadList);

  const handleBack = () => {
    if (mode !== "tabs") {
      setMode("tabs");
      setSelectedId(null);
      setEditingId(null);
      setDetailStatus(null);
    } else {
      onBack();
    }
  };


  const columns: ColumnDef<any>[] = React.useMemo(
    () => [
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
          const st = row.original.status === "approved" ? "submitted" : (row.original.status || "draft");
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
        cell: ({ row }) => {
          const id = row.original.id || row.original.reference_id;
          return (
            <FinanceRowActions
              status={row.original.status || "draft"}
              canCreate={canCreate}
              finalBusy={finalBusy}
              onView={() => {
                setSelectedId(id);
                setMode("detail");
              }}
              onUpdate={() => {
                setEditingId(id);
                setSelectedId(id);
                setMode("form");
              }}
              onFinalSubmit={() => requestFinalSubmit(id)}
            />
          );
        },
      },
    ],
    [canCreate, finalBusy, requestFinalSubmit]
  );

  const pageTitle =
    mode === "form"
      ? editingId ? "Edit IGR Transaction" : "Record IGR Transaction"
      : mode === "detail"
        ? "IGR Transaction Details"
        : "Internally Generated Revenue (IGR)";
  const listActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-[#d4e8dc]"
        disabled={syncing}
        onClick={handleSync}
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
      {canCreate && (
        <Button
          size="sm"
          className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
          onClick={() => {
            setEditingId(null);
            setMode("form");
          }}
        >
          <Plus className="w-4 h-4" />
          Record IGR
        </Button>
      )}
    </>
  );

  React.useLayoutEffect(() => {
    if (!embedded || !onChromeChange) return;
    onChromeChange({
      mode: mode === "tabs" ? "list" : mode,
      title: pageTitle,
      onInnerBack: mode !== "tabs" ? () => {
        setMode("tabs");
        setSelectedId(null);
        setEditingId(null);
        setDetailStatus(null);
      } : undefined,
      actions: mode === "tabs" ? listActions : undefined,
      statusBadge:
        mode === "detail" && detailStatus ? (
          <Badge variant="outline" className={`gap-1 ${(STATUS_CONFIG[detailStatus] || STATUS_CONFIG.draft).cls}`}>
            {(STATUS_CONFIG[detailStatus] || STATUS_CONFIG.draft).label}
          </Badge>
        ) : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, onChromeChange, mode, editingId, detailStatus, canCreate, syncing, pageTitle]);

  React.useLayoutEffect(() => () => onChromeChange?.(null), [onChromeChange]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${embedded ? "" : "bg-[#f4f7f5]"}`}>
      {!embedded && (
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
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
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">{pageTitle}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mode === "detail" && detailStatus && (
            <Badge variant="outline" className={`gap-1 ${(STATUS_CONFIG[detailStatus] || STATUS_CONFIG.draft).cls}`}>
              {(STATUS_CONFIG[detailStatus] || STATUS_CONFIG.draft).label}
            </Badge>
          )}
          {mode === "tabs" && listActions}
        </div>
      </div>
      )}

      {/* Main Content Area */}
      {mode === "form" ? (
        <div className="flex-1 min-h-0">
          <IgrReportPage
            reportId={editingId}
            onBack={() => setMode("tabs")}
            onSubmitted={() => {
              setMode("tabs");
              handleSync();
            }}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
            embedded
          />
        </div>
      ) : (
      <ScrollArea className="flex-1">
        <div className={`space-y-4 ${mode === "detail" ? "p-0" : "p-4 md:p-6 w-full"}`}>
          {mode === "tabs" && (
            <div className="space-y-4">
              <RegisterStatsCards stats={workflowRegisterStats(tableData)} loading={loading} />
              <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
                <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger size="sm" className="w-full" displayValue={year === "all" ? "All Years" : year}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger size="sm" className="w-full" displayValue={month === "all" ? "All Months" : (MONTHS.find((m) => String(m.value) === month)?.label || month)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isZonalCoordinator && !isStateOffice && (
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone</Label>
                      <Select value={zoneId} onValueChange={(v) => { setZoneId(v); if (!isStateOffice) setStateId("all"); }}>
                        <SelectTrigger size="sm" className="w-full" displayValue={zoneId === "all" ? "All Zones" : (zones.find((z) => z.id === zoneId)?.label || "Zone")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Zones</SelectItem>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {!isStateOffice && (
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                      <Select value={stateId} onValueChange={setStateId}>
                        <SelectTrigger size="sm" className="w-full" displayValue={stateId === "all" ? "All States" : (states.find((s) => s.id === stateId)?.label || "State")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {states.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Service</Label>
                    <Select value={service} onValueChange={setService}>
                      <SelectTrigger size="sm" className="w-full" displayValue={service === "all" ? "All Services" : labelOf(IGR_SERVICE_TYPES, service)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {IGR_SERVICE_TYPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <ShadcnDataTable
                title="IGR TRANSACTIONS REGISTER"
                infoTooltip="Internally generated revenue receipts by state office, service type, and period."
                columns={columns}
                data={tableData}
                loading={loading}
                searchPlaceholder="Search by principal, receipt #, state, service..."
                emptyMessage="No IGR transactions recorded for this view."
                onRowClick={(row) => {
                  setSelectedId(row.id || row.reference_id);
                  setMode("detail");
                }}
                pageSize={50}
                showTableOptions={false}
              />
            </div>
          )}

          {mode === "detail" && selectedId && (
            <div className="p-4 md:p-6 w-full">
              <IgrReportDetail
                reportId={selectedId}
                embedded
                onStatusChange={onDetailStatusChange}
                onBack={() => {
                  setMode("tabs");
                  setDetailStatus(null);
                }}
                onEdit={() => {
                  setEditingId(selectedId);
                  setMode("form");
                  setDetailStatus(null);
                }}
              />
            </div>
          )}
        </div>
      </ScrollArea>
      )}
      {finalSubmitModal}
    </div>
  );
}

