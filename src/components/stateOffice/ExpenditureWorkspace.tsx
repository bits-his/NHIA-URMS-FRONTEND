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
import { EXPENDITURE_SUB_HEADS, formatNaira, monthLabel, quarterFromMonth, MONTHS } from "./constants";
import { RegisterStatsCards, workflowRegisterStats } from "./RegisterStatsCards";
import ExpenditureProfileReportPage from "./ExpenditureProfileReportPage";
import ExpenditureProfileReportDetail from "./ExpenditureProfileReportDetail";
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

export default function ExpenditureWorkspace({
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
  const [quarter, setQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");

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
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
      };
      if (month !== "all") filters.month = month;
      if (quarter !== "all") filters.quarter = quarter;

      const res = await stateOfficeApi["expenditure-profile"].list(filters);
      setTableData(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, quarter, zoneId, stateId]);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };
  const reloadList = React.useCallback(() => setRefreshKey((k) => k + 1), []);
  const { finalBusy, requestFinalSubmit, modal: finalSubmitModal } = useFinanceFinalSubmit("expenditure-profile", reloadList);

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

  // Row Total helper
  const rowTotal = (r: any): number => {
    return EXPENDITURE_SUB_HEADS.reduce((sum, h) => {
      const val = Number(r[h.value]) || 0;
      return sum + val;
    }, 0);
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
        accessorKey: "reporting_year",
        header: "Year",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700">
            {row.original.reporting_year}
          </span>
        ),
      },
      {
        id: "period",
        header: "Month / Quarter",
        cell: ({ row }) => {
          const q = row.original.reporting_quarter || quarterFromMonth(row.original.reporting_month);
          return (
            <div className="text-xs whitespace-nowrap">
              <span className="font-medium text-slate-800">{monthLabel(row.original.reporting_month)}</span>
              <span className="text-slate-400 ml-1">· Q{q}</span>
            </div>
          );
        },
      },
      {
        id: "total_expenditure",
        header: "Total Expenditure (₦)",
        accessorFn: (row) => rowTotal(row),
        cell: ({ row }) => (
          <span className="text-xs font-bold text-[#145c3f] tabular-nums whitespace-nowrap">
            {formatNaira(rowTotal(row.original))}
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
      ? editingId ? "Edit Expenditure Profile" : "Record Expenditure Profile"
      : mode === "detail"
        ? "Expenditure Profile Details"
        : "Expenditure Profile";
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
          Record Expenditure
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
          <ExpenditureProfileReportPage
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
              <Card className="rounded-sm border-[#d4e8dc]">
                <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger displayValue={year === "all" ? "All Years" : year}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger displayValue={month === "all" ? "All Months" : (MONTHS.find((m) => String(m.value) === month)?.label || month)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quarter</Label>
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger displayValue={quarter === "all" ? "All Quarters" : `Q${quarter}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quarters</SelectItem>
                        {[1, 2, 3, 4].map((q) => (
                          <SelectItem key={q} value={String(q)}>{`Q${q}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isZonalCoordinator && !isStateOffice && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Zone</Label>
                      <Select value={zoneId} onValueChange={(v) => { setZoneId(v); if (!isStateOffice) setStateId("all"); }}>
                        <SelectTrigger displayValue={zoneId === "all" ? "All Zones" : (zones.find((z) => z.id === zoneId)?.label || "Zone")}><SelectValue /></SelectTrigger>
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
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Select value={stateId} onValueChange={setStateId}>
                        <SelectTrigger displayValue={stateId === "all" ? "All States" : (states.find((s) => s.id === stateId)?.label || "State")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {states.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <ShadcnDataTable
                title="EXPENDITURE PROFILE REGISTER"
                infoTooltip="State office expenditure profiles by category, period, and submission status."
                columns={columns}
                data={tableData}
                loading={loading}
                searchPlaceholder="Search expenditure by state, year, month, officer..."
                emptyMessage="No expenditure profiles recorded for this view."
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
              <ExpenditureProfileReportDetail
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

