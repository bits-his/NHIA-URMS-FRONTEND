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
import { SSHIA_SUB_HEADS, formatNaira, monthLabel, quarterFromMonth, calcSshiaLine } from "./constants";
import { RegisterStatsCards, workflowRegisterStats } from "./RegisterStatsCards";
import SshiaFinancialReportPage from "./SshiaFinancialReportPage";
import SshiaFinancialReportDetail from "./SshiaFinancialReportDetail";
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
  startMode?: "tabs" | "form" | "detail";
  onChromeChange?: (chrome: FinanceChrome | null) => void;
}

export default function SshiaWorkspace({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  embedded = false,
  startMode = "tabs",
  onChromeChange,
}: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<"tabs" | "form" | "detail">(startMode);
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
  const [quarter, setQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [subHead, setSubHead] = React.useState("all");

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
        quarter: quarter !== "all" ? quarter : undefined,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        sub_head: subHead !== "all" ? subHead : undefined,
      };

      const listRes = await stateOfficeApi["sshia-financial"].list(filters);
      setTableData(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch {
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [year, quarter, zoneId, stateId, subHead]);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };
  const reloadList = React.useCallback(() => setRefreshKey((k) => k + 1), []);
  const { finalBusy, requestFinalSubmit, modal: finalSubmitModal } = useFinanceFinalSubmit("sshia-financial", reloadList);

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
        id: "period",
        header: "Reporting Period",
        accessorFn: (row) => `${row.reporting_year} Q${row.reporting_quarter || quarterFromMonth(row.reporting_month)}`,
        cell: ({ row }) => {
          const q = row.original.reporting_quarter || quarterFromMonth(row.original.reporting_month);
          return (
            <div className="text-xs whitespace-nowrap">
              <span className="font-bold text-slate-800">Q{q} {row.original.reporting_year}</span>
              {row.original.reporting_month && (
                <span className="text-slate-400 text-[11px] block">{monthLabel(row.original.reporting_month)}</span>
              )}
            </div>
          );
        },
      },
      {
        id: "subheads_filled",
        header: "Sub-Heads Reported",
        cell: ({ row }) => {
          const filled = SSHIA_SUB_HEADS.filter((h) => {
            const p = h.prefix;
            const open = row.original[`${p}_opening_balance`];
            const rec = row.original[`${p}_receipts`];
            const act = row.original[`${p}_actual_expenditure`];
            return open != null || rec != null || act != null;
          });
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {filled.length === 0 ? (
                <span className="text-[11px] text-slate-400">None yet</span>
              ) : (
                filled.map((h) => (
                  <span
                    key={h.prefix}
                    className="inline-flex items-center rounded-sm bg-[#e8f6ee] text-[#145c3f] border border-[#c5e6d2] px-1.5 py-0.2 text-[10px] font-bold"
                  >
                    {h.label.split(".")[0].slice(0, 4)}
                  </span>
                ))
              )}
              <span className="text-[10px] font-bold text-slate-400 self-center">
                ({filled.length}/4)
              </span>
            </div>
          );
        },
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
      ? editingId ? "Edit SSHIA Progress Report" : "Record SSHIA Progress Report"
      : mode === "detail"
        ? "SSHIA Progress Report Details"
        : "SSHIA Progress Report";
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
          Record SSHIA
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
          <SshiaFinancialReportPage
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
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quarter</Label>
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger size="sm" className="w-full" displayValue={quarter === "all" ? "All Quarters" : `Q${quarter}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quarters</SelectItem>
                        {[1, 2, 3, 4].map((q) => (
                          <SelectItem key={q} value={String(q)}>{`Q${q}`}</SelectItem>
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
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sub-head</Label>
                    <Select value={subHead} onValueChange={setSubHead}>
                      <SelectTrigger size="sm" className="w-full" displayValue={subHead === "all" ? "All Sub-heads" : (SSHIA_SUB_HEADS.find((h) => h.value === subHead)?.label || subHead)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sub-heads</SelectItem>
                        {SSHIA_SUB_HEADS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <ShadcnDataTable
                title="SSHIA PROGRESS REGISTER"
                infoTooltip="SSHIA budget available, expenditure, and BHCPF lives by sub-head and reporting period."
                columns={columns}
                data={tableData}
                loading={loading}
                searchPlaceholder="Search SSHIA reports by state, period, officer..."
                emptyMessage="No SSHIA progress reports recorded for this view."
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
              <SshiaFinancialReportDetail
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

