import * as React from "react";
import {
  Plus, Loader2, RefreshCw, Eye, FileText, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "../constants";
import { ADMIN_HR_CONFIG, type AdminHrReportType } from "./constants";
import { AdminHrFormRouter, AdminHrDetailRouter } from "./registry";

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

  const [mode, setMode] = React.useState<"list" | "create" | "view" | "edit">("list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  const {
    showStateFilter, states, filterState, setFilterState, apiStateId, stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");

  React.useEffect(() => {
    setMode("list");
    setSelectedId(null);
  }, [reportType]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({
        status: filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
      });
      setReports(res.data as Report[]);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => { load(); }, [load]);

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

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all" || stateFilterActive;
  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  if (mode === "view" && selectedId) {
    return (
      <AdminHrDetailRouter
        reportType={reportType}
        reportId={selectedId}
        onBack={() => { setSelectedId(null); setMode("list"); }}
        onEdit={() => setMode("edit")}
      />
    );
  }

  if (mode === "create" || mode === "edit") {
    return (
      <AdminHrFormRouter
        reportType={reportType}
        reportId={mode === "edit" ? selectedId : null}
        onBack={() => {
          if (mode === "edit" && selectedId) {
            setMode("view");
            return;
          }
          setSelectedId(null);
          setMode("list");
          load();
        }}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight truncate">{cfg.title}</h2>
          <p className="text-xs text-slate-500 truncate">{cfg.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={() => { setSelectedId(null); setMode("create"); }}
          >
            <Plus className="w-4 h-4" /> {cfg.newLabel}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", value: counts.total, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
              { label: "Draft", value: counts.draft, color: "bg-slate-50 border-slate-200", text: "text-slate-600" },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
              { label: "Approved", value: counts.approved, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl p-4 border ${c.color}`}>
                <p className={`text-2xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {showStateFilter && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full" displayValue={filterState === ALL_STATES ? "All States" : (states.find((s) => String(s.id) === filterState)?.description ?? filterState)}>
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
            <div className="flex-1 min-w-[120px]">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
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
            <div className="flex-1 min-w-[130px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full" displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}>
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
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={clearFilters}>
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading…" : `${reports.length} record${reports.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No records match your filters" : "No records yet"}</p>
                  {!hasFilters && (
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
                      {reports.map((r) => {
                        const sc = STATUS_CONFIG[r.status];
                        const summary =
                          r.title ||
                          r.payload?.meetingType ||
                          r.payload?.personLeading ||
                          r.payload?.reportingOfficer ||
                          r.payload?.preparedBy ||
                          "—";
                        return (
                          <TableRow key={r.id} className="hover:bg-slate-50/80">
                            <TableCell className="font-mono text-xs font-semibold text-[#0f3d2e] whitespace-nowrap">
                              {r.reference_id}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                            <TableCell className="text-xs tabular-nums">{r.reporting_year}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                            <TableCell className="text-xs max-w-[220px] truncate" title={String(summary)}>{String(summary)}</TableCell>
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
      </ScrollArea>
    </div>
  );
}
