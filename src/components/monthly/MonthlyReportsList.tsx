import * as React from "react";
import { ArrowLeft, Plus, RefreshCw, Loader2, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { monthlyApi, type MonthlyDept } from "@/lib/api";
import { MONTHS } from "./MonthlyFormShell";
import { buildReportingYearOptions } from "./reportingYears";
import {
  columnAppliesToRecord,
  formatMonthlyCellValue,
  getColumnsForDept,
  type MonthlyListColumn,
} from "./monthlyListColumns";
import { ALL_STATES, useMonthlyStateFilter } from "./useMonthlyStateFilter";

const DEPT_OPTIONS: { value: MonthlyDept; label: string }[] = [
  { value: "finance",    label: "Finance" },
  { value: "programmes", label: "Programmes" },
  { value: "sqa",        label: "SQA" },
];

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  onBack: () => void;
  onNew: (dept: MonthlyDept) => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

export default function MonthlyReportsList({ onBack, onNew, defaultStateId, defaultZoneId }: Props) {
  const [dept,         setDept]         = React.useState<MonthlyDept>("finance");
  const [filterYear,   setFilterYear]   = React.useState(String(new Date().getFullYear()));
  const [filterMonth,  setFilterMonth]  = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [records,      setRecords]      = React.useState<any[]>([]);
  const [loading,      setLoading]      = React.useState(true);

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
    stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await monthlyApi[dept].list({
        year:     filterYear   !== "all" ? filterYear   : undefined,
        month:    filterMonth  !== "all" ? filterMonth  : undefined,
        status:   filterStatus !== "all" ? filterStatus : undefined,
        state_id: apiStateId,
      });
      setRecords(res.data);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally { setLoading(false); }
  }, [dept, filterYear, filterMonth, filterStatus, apiStateId]);

  React.useEffect(() => { load(); }, [load]);

  // Summary counts
  const counts = React.useMemo(() => ({
    total:     records.length,
    submitted: records.filter(r => r.status === "submitted").length,
    approved:  records.filter(r => r.status === "approved").length,
    draft:     records.filter(r => r.status === "draft").length,
  }), [records]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(records.map(r => r.reporting_year)),
    [records],
  );

  const dataColumns = React.useMemo(
    () => getColumnsForDept(dept),
    [dept],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-8 py-4 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={() => onNew(dept)}>
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total",     value: counts.total,     color: "bg-slate-50 border-slate-200",     text: "text-slate-700"  },
              { label: "Draft",     value: counts.draft,     color: "bg-slate-50 border-slate-200",     text: "text-slate-500"  },
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
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-row items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                <Select value={dept} onValueChange={v => setDept(v as MonthlyDept)}>
                  <SelectTrigger className="w-full"
                    displayValue={DEPT_OPTIONS.find(d => d.value === dept)?.label ?? dept}>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                </div>
                {showStateFilter && (
                  <div className="flex-1 min-w-0">
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
                <div className="flex-1 min-w-0">
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-full"
                    displayValue={filterYear === "all" ? "All Years" : filterYear}>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                </div>
                <div className="flex-1 min-w-0">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-full"
                    displayValue={filterMonth === "all" ? "All Months" : (MONTHS.find(m => m.v === filterMonth)?.l ?? filterMonth)}>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                </div>
                <div className="flex-1 min-w-0">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full"
                    displayValue={filterStatus === "all" ? "All Statuses" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}>
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
                {(filterMonth !== "all" || filterStatus !== "all" || stateFilterActive) && (
                  <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0"
                    onClick={() => {
                      setFilterMonth("all");
                      setFilterStatus("all");
                      if (showStateFilter) setFilterState(ALL_STATES);
                    }}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading..." : `${records.length} record${records.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">No reports found</p>
                  <Button variant="outline" size="sm" onClick={() => onNew(dept)} className="mt-2 gap-2">
                    <Plus className="w-4 h-4" /> New Report
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Reference</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Section</TableHead>
                      {dataColumns.map((col: MonthlyListColumn) => (
                        <TableHead key={col.key} className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Submitted By</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r, i) => {
                      const sc = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                      return (
                        <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                          <TableCell><span className="font-mono text-xs font-bold text-primary">{r.reference_id}</span></TableCell>
                          <TableCell className="text-xs text-slate-500 capitalize whitespace-nowrap">{r.section ?? "—"}</TableCell>
                          {dataColumns.map((col: MonthlyListColumn) => (
                            <TableCell key={col.key} className="text-xs font-semibold text-slate-700 text-right whitespace-nowrap tabular-nums">
                              {columnAppliesToRecord(col, r)
                                ? formatMonthlyCellValue(r[col.key], col.format)
                                : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.submitted_by ?? "—"}</TableCell>
                          <TableCell className="text-xs text-slate-400 whitespace-nowrap">{safeDate(r.createdAt)}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                              {sc.icon} {sc.label}
                            </Badge>
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

          {/* Quarterly note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
            <p className="font-bold">How quarterly & annual totals work:</p>
            <p>Q1 = Jan + Feb + Mar &nbsp;|&nbsp; Q2 = Apr + May + Jun &nbsp;|&nbsp; Q3 = Jul + Aug + Sep &nbsp;|&nbsp; Q4 = Oct + Nov + Dec</p>
            <p>The annual report auto-aggregates all 12 monthly submissions for a state. If you submit multiple records for the same month, <strong>all of them are summed</strong> — so only submit once per month per state.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
