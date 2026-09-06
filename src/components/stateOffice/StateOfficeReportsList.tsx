import * as React from "react";
import {
  Plus, Loader2, RefreshCw, Eye,
  FileText, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { StateOfficeFormRouter, StateOfficeDetailRouter } from "./registry";
import IgrReportPage from "./IgrReportPage";
import IgrReportDetail from "./IgrReportDetail";
import SshiaFinancialReportPage from "./SshiaFinancialReportPage";
import SshiaFinancialReportDetail from "./SshiaFinancialReportDetail";
import ExpenditureProfileReportPage from "./ExpenditureProfileReportPage";
import ExpenditureProfileReportDetail from "./ExpenditureProfileReportDetail";
import {
  REPORT_CONFIG, MONTHS, monthLabel, quarterFromMonth, formatCount, formatDate,
  reportLineTotal, reportLineCount, type StateOfficeReportType,
} from "./constants";

interface Report {
  id: number;
  reference_id: string;
  reporting_year: number;
  reporting_month: number;
  submission_date: string | null;
  submitted_by: string | null;
  status: "draft" | "submitted" | "approved";
  createdAt?: string;
  zone?: { description: string };
  state?: { description: string };
  lines?: any[];
}

interface Props {
  reportType: StateOfficeReportType;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function StateOfficeReportsList({
  reportType, onBack, defaultZoneId, defaultStateId,
}: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const api = stateOfficeApi[reportType];

  const [mode, setMode] = React.useState<"list" | "create" | "view" | "edit">("list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
    stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const [filterYear,   setFilterYear]   = React.useState("all");
  const [filterMonth,  setFilterMonth]  = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");

  // Reset nested view when switching Enrolment / Migration / CEmONC in the sidebar
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
    } finally { setLoading(false); }
  }, [api, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => ({
    total:     reports.length,
    draft:     reports.filter(r => r.status === "draft").length,
    submitted: reports.filter(r => r.status === "submitted").length,
    approved:  reports.filter(r => r.status === "approved").length,
  }), [reports]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map(r => r.reporting_year)),
    [reports],
  );

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all" || stateFilterActive;

  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  const showLocationCols = !defaultStateId || !defaultZoneId;

  if (mode === "view" && selectedId) {
    if (reportType === "igr") {
      return (
        <IgrReportDetail
          reportId={selectedId}
          onBack={() => { setSelectedId(null); setMode("list"); }}
          onEdit={() => setMode("edit")}
        />
      );
    }
    if (reportType === "sshia-financial") {
      return (
        <SshiaFinancialReportDetail
          reportId={selectedId}
          onBack={() => { setSelectedId(null); setMode("list"); }}
          onEdit={() => setMode("edit")}
        />
      );
    }
    if (reportType === "expenditure-profile") {
      return (
        <ExpenditureProfileReportDetail
          reportId={selectedId}
          onBack={() => { setSelectedId(null); setMode("list"); }}
          onEdit={() => setMode("edit")}
        />
      );
    }
    return (
      <StateOfficeDetailRouter
        reportType={reportType}
        reportId={selectedId}
        onBack={() => { setSelectedId(null); setMode("list"); }}
        onEdit={() => setMode("edit")}
      />
    );
  }

  if (mode === "create" || mode === "edit") {
    if (reportType === "igr") {
      return (
        <IgrReportPage
          reportId={mode === "edit" ? selectedId : null}
          onBack={() => { setSelectedId(null); setMode("list"); load(); }}
          defaultZoneId={defaultZoneId}
          defaultStateId={defaultStateId}
        />
      );
    }
    if (reportType === "sshia-financial") {
      return (
        <SshiaFinancialReportPage
          reportId={mode === "edit" ? selectedId : null}
          onBack={() => { setSelectedId(null); setMode("list"); load(); }}
          defaultZoneId={defaultZoneId}
          defaultStateId={defaultStateId}
        />
      );
    }
    if (reportType === "expenditure-profile") {
      return (
        <ExpenditureProfileReportPage
          reportId={mode === "edit" ? selectedId : null}
          onBack={() => { setSelectedId(null); setMode("list"); load(); }}
          defaultZoneId={defaultZoneId}
          defaultStateId={defaultStateId}
        />
      );
    }
    return (
      <StateOfficeFormRouter
        reportType={reportType}
        reportId={mode === "edit" ? selectedId : null}
        onBack={() => { setSelectedId(null); setMode("list"); load(); }}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-xl font-bold tracking-tight">{cfg.title}</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={() => { setSelectedId(null); setMode("create"); }}
          >
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total",     value: counts.total,     color: "bg-slate-50 border-slate-200",     text: "text-slate-700"  },
              { label: "Draft",     value: counts.draft,     color: "bg-slate-50 border-slate-200",     text: "text-slate-600"  },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200",       text: "text-blue-700"   },
              { label: "Approved",  value: counts.approved,  color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ].map(c => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}>
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-row flex-wrap items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {showStateFilter && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full"
                    displayValue={filterState === ALL_STATES
                      ? "All States"
                      : (states.find(s => String(s.id) === filterState)?.description ?? filterState)}>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATES}>All States</SelectItem>
                    {states.map(s => (
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
                  {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full"
                  displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full"
                  displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}>
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
                {loading ? "Loading..." : `${reports.length} report${reports.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No reports match your filters" : "No reports found"}</p>
                  {!hasFilters && (
                    <Button variant="outline" size="sm" className="mt-2 gap-2"
                      onClick={() => { setSelectedId(null); setMode("create"); }}>
                      <Plus className="w-4 h-4" /> New Report
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Reference</TableHead>
                        {showLocationCols && (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                          </>
                        )}
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Month</TableHead>
                        {reportType === "weekly-actionable" && (
                          <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Week</TableHead>
                        )}
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Quarter</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Entries</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">{cfg.totalLabel}</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Submitted By</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date Submitted</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reports.map((r, i) => {
                      const sc = STATUS_CONFIG[r.status];
                      return (
                          <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-primary">{r.reference_id}</span>
                            </TableCell>
                            {showLocationCols && (
                              <>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                              </>
                            )}
                            <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.reporting_year}</TableCell>
                            <TableCell className="text-sm text-slate-600 whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                            {reportType === "weekly-actionable" && (
                              <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                {(r as any).reporting_week ? `Wk ${(r as any).reporting_week}` : "—"}
                              </TableCell>
                            )}
                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">Q{quarterFromMonth(r.reporting_month)}</TableCell>
                            <TableCell className="text-sm text-slate-500 text-right tabular-nums">{reportLineCount(reportType, r)}</TableCell>
                            <TableCell className="text-sm font-semibold text-slate-800 text-right tabular-nums">{formatCount(reportLineTotal(reportType, r))}</TableCell>
                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.submitted_by || "—"}</TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(r.submission_date)}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                                onClick={() => { setSelectedId(r.id); setMode("view"); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
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
