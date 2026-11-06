import * as React from "react";
import { useListSearch } from "../useListSearch";
import {
  Plus, Loader2, RefreshCw, Eye, FileText, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegisterStatsCards } from "../RegisterStatsCards";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "../constants";
import { ADMIN_HR_CONFIG, MAINTENANCE_TYPES, VEHICLE_STATUSES, type AdminHrReportType } from "./constants";
import { AdminHrFormRouter, AdminHrDetailRouter } from "./registry";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import PageLayout from "../../PageLayout";

function vehicleSummary(report: Report): string {
  const rows = Array.isArray(report.payload?.rows) ? report.payload!.rows : [];
  if (!rows.length) return report.title || "—";
  const first = rows[0] || {};
  const model = String(first.vehicleModel || "").trim();
  const chassis = String(first.chassisNumber || "").trim();
  const type = String(first.maintenanceType || "").trim();
  const head = [model, chassis].filter(Boolean).join(" · ") || type || report.title || "—";
  return rows.length > 1 ? `${head} (+${rows.length - 1} more)` : head;
}

function isServiceDueSoon(nextServiceDate?: string | null, withinDays = 30): boolean {
  if (!nextServiceDate) return false;
  const due = new Date(`${String(nextServiceDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.valueOf())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + withinDays);
  return due >= today && due <= limit;
}

interface Report {
  id: number;
  reference_id: string;
  reporting_year: number;
  reporting_month: number;
  submission_date: string | null;
  submitted_by: string | null;
  status: "draft" | "submitted" | "approved";
  title?: string | null;
  payload?: Record<string, any>;
  zone?: { description: string };
  state?: { description: string };
}

interface Props {
  reportType: AdminHrReportType;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function AdminHrReportsList({
  reportType, onBack, defaultZoneId, defaultStateId,
}: Props) {
  const cfg = ADMIN_HR_CONFIG[reportType];
  const api = stateOfficeApi[reportType];
  const { canCreate, createOnly: baseCreateOnly } = useStateOfficeAccess();
  const isVehicle = reportType === "vehicle-maintenance";
  // Vehicle Maintenance: officers land on their own submissions list (not form-only).
  const createOnly = isVehicle ? false : baseCreateOnly;

  const [mode, setMode] = React.useState<"list" | "create" | "view" | "edit">(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [reports, setReports] = React.useState<Report[]>([]);
  const { matchesSearch, searchInput } = useListSearch();
  const filteredReports = reports.filter((r) => {
    const rows = Array.isArray(r.payload?.rows) ? r.payload!.rows : [];
    return matchesSearch([
      r,
      monthLabel(r.reporting_month),
      ...rows.flatMap((row: any) => [row.vehicleModel, row.chassisNumber, row.maintenanceType, row.problemReported, row.vehicleStatus]),
    ]);
  });
  const [loading, setLoading] = React.useState(!createOnly);

  const {
    showStateFilter, states, filterState, setFilterState, apiStateId, stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterMaintenanceType, setFilterMaintenanceType] = React.useState("all");
  const [filterVehicleStatus, setFilterVehicleStatus] = React.useState("all");

  React.useEffect(() => {
    setMode(createOnly ? "create" : "list");
    setSelectedId(null);
    setFormKey((k) => k + 1);
    setFilterMaintenanceType("all");
    setFilterVehicleStatus("all");
  }, [reportType, createOnly]);

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await api.list({
        status: filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
        ...(isVehicle && filterMaintenanceType !== "all" ? { maintenance_type: filterMaintenanceType } : {}),
        ...(isVehicle && filterVehicleStatus !== "all" ? { vehicle_status: filterVehicleStatus } : {}),
      } as any);
      setReports(res.data as Report[]);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth, createOnly, isVehicle, filterMaintenanceType, filterVehicleStatus]);

  React.useEffect(() => { if (!createOnly) void load(); }, [load, createOnly]);

  const leaveForm = React.useCallback(() => {
    if (createOnly) {
      setSelectedId(null);
      setFormKey((k) => k + 1);
      setMode("create");
      return;
    }
    setSelectedId(null);
    setMode("list");
    void load();
  }, [createOnly, load]);

  const counts = React.useMemo(() => ({
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft").length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    approved: reports.filter((r) => r.status === "approved").length,
  }), [reports]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map((r) => r.reporting_year)),
    [reports],
  );

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all" || stateFilterActive
    || filterMaintenanceType !== "all" || filterVehicleStatus !== "all";
  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    setFilterMaintenanceType("all");
    setFilterVehicleStatus("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  if (mode === "view" && selectedId) {
    return (
      <AdminHrDetailRouter
        reportType={reportType}
        reportId={selectedId}
        onBack={() => { setSelectedId(null); setMode(createOnly ? "create" : "list"); }}
        onEdit={canCreate ? () => setMode("edit") : undefined}
      />
    );
  }

  if (mode === "create" || mode === "edit") {
    const cancelCreate = createOnly ? onBack : leaveForm;
    return (
      <AdminHrFormRouter
        key={formKey}
        reportType={reportType}
        reportId={mode === "edit" ? selectedId : null}
        onBack={mode === "edit" && selectedId ? () => setMode("view") : cancelCreate}
        onCancel={mode === "edit" && selectedId ? () => setMode("view") : cancelCreate}
        onSubmitted={leaveForm}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    );
  }

  return (
    <PageLayout
      title={cfg.title}
      onBack={onBack}
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/20 h-8 text-xs rounded-md"
              onClick={() => { setSelectedId(null); setMode("create"); }}
            >
              <Plus className="w-3.5 h-3.5" /> {cfg.newLabel}
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-4"
    >
        <div className="w-full space-y-4">
          <RegisterStatsCards
            loading={loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Submitted", value: counts.submitted, tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
              { label: "Approved", value: counts.approved, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ]}
          />

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 space-y-1.5">
              <div className="grid grid-flow-col auto-cols-fr gap-2.5 items-end">
                {showStateFilter && (
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                    <Select value={filterState} onValueChange={setFilterState}>
                      <SelectTrigger size="sm" className="w-full" displayValue={filterState === ALL_STATES ? "All States" : (states.find((s) => String(s.id) === filterState)?.description ?? filterState)}>
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_STATES}>All States</SelectItem>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger size="sm" className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger size="sm" className="w-full" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger size="sm" className="w-full" displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isVehicle && (
                  <>
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Maintenance Type</Label>
                      <Select value={filterMaintenanceType} onValueChange={setFilterMaintenanceType}>
                        <SelectTrigger size="sm" className="w-full" displayValue={filterMaintenanceType === "all" ? "All Types" : filterMaintenanceType}>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {MAINTENANCE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicle Status</Label>
                      <Select value={filterVehicleStatus} onValueChange={setFilterVehicleStatus}>
                        <SelectTrigger size="sm" className="w-full" displayValue={filterVehicleStatus === "all" ? "All Vehicle Statuses" : filterVehicleStatus}>
                          <SelectValue placeholder="All Vehicle Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Vehicle Statuses</SelectItem>
                          {VEHICLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              {hasFilters && (
                <div className="flex justify-end pt-0.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1 shrink-0" onClick={clearFilters}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {searchInput}
          <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading…" : `${filteredReports.length} record${filteredReports.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No records match your filters" : "No records yet"}</p>
                  {!hasFilters && canCreate && (
                    <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => { setSelectedId(null); setMode("create"); }}>
                      <Plus className="w-4 h-4" /> {cfg.newLabel}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold text-slate-600">Reference</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Zone</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Year</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Month</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Summary</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((r) => {
                        const sc = STATUS_CONFIG[r.status];
                        const summary = isVehicle
                          ? vehicleSummary(r)
                          : (
                            r.title ||
                            r.payload?.meetingType ||
                            r.payload?.personLeading ||
                            r.payload?.reportingOfficer ||
                            r.payload?.preparedBy ||
                            "—"
                          );
                        const dueSoon = isVehicle && (r.payload?.rows || []).some((row: any) => isServiceDueSoon(row?.nextServiceDate));
                        return (
                          <TableRow key={r.id} className="hover:bg-slate-50/80">
                            <TableCell className="font-mono text-xs font-semibold text-[#0f3d2e] whitespace-nowrap">
                              {r.reference_id}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                            <TableCell className="text-xs tabular-nums">{r.reporting_year}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                            <TableCell className="text-xs max-w-[260px]">
                              <div className="truncate" title={String(summary)}>{String(summary)}</div>
                              {dueSoon ? (
                                <span className="mt-0.5 inline-flex text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm">
                                  Service due soon
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 text-[10px] font-semibold ${sc.cls}`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-[11px] font-semibold text-[#145c3f] hover:bg-[#e8f5ee]"
                                onClick={() => { setSelectedId(r.id); setMode("view"); }}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </PageLayout>
  );
}
