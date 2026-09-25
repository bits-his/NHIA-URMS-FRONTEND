import * as React from "react";
import {
  ArrowLeft, Plus, RefreshCw, Loader2,
  FileText, CheckCircle2, Send, XCircle, Clock, CheckSquare,
  MessageSquare, AlertCircle, X, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { monthlyApi, type MonthlyDept } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { MONTHS } from "./MonthlyFormShell";
import { buildReportingYearOptions } from "./reportingYears";
import {
  formatMonthlyCellValue,
  getColumnsForSection,
  type MonthlyListColumn,
} from "./monthlyListColumns";
import { ALL_STATES, useMonthlyStateFilter } from "./useMonthlyStateFilter";

type ReportStatus = "draft" | "submitted" | "under_review" | "zonal_review" | "approved" | "rejected";

const SC: Record<ReportStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:        { label: "Draft",          cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted:    { label: "Submitted",      cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Send className="w-3 h-3" /> },
  under_review: { label: "State Approved", cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  zonal_review: { label: "Zonal Approved", cls: "bg-purple-100 text-purple-700 border-purple-200",    icon: <CheckSquare className="w-3 h-3" /> },
  approved:     { label: "Approved",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:     { label: "Rejected",       cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3 h-3" /> },
};

const REVIEW_CHAIN: Record<string, {
  inboxStatus: ReportStatus;
  approveLabel: string;
  forwardLabel: string;
}> = {
  "state-coordinator": {
    inboxStatus: "submitted",
    approveLabel: "Approve & Forward to Zonal",
    forwardLabel: "Zonal Coordinator",
  },
  "zonal-coordinator": {
    inboxStatus: "under_review",
    approveLabel: "Approve & Forward to SDO",
    forwardLabel: "SDO / DGO",
  },
  sdo: {
    inboxStatus: "zonal_review",
    approveLabel: "Final Approve",
    forwardLabel: "Approved",
  },
};

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month: number | string | null | undefined) {
  const m = MONTHS.find((x) => x.v === String(month));
  return m?.l ?? (month != null ? String(month) : "—");
}

interface Props {
  dept: MonthlyDept;
  title: string;
  section: string;
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  canCreate?: boolean;
  canReview?: boolean;
  FormComponent: React.ComponentType<{
    onBack: () => void;
    defaultZoneId?: string | null;
    defaultStateId?: string | null;
    onSubmitted?: () => void;
    yearOptions?: string[];
  }>;
}

function RejectModal({
  referenceId,
  onConfirm,
  onCancel,
  loading,
}: {
  referenceId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#d4e8dc] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Reject Report</p>
            <p className="text-xs text-slate-500 mt-0.5">{referenceId}</p>
          </div>
          <button type="button" onClick={onCancel} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">The report will be returned to the submitter with your reason.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Rejection Reason *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[#d4e8dc] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Explain what needs to be corrected…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button
            className="bg-rose-600 hover:bg-rose-700"
            disabled={loading || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewDetail({
  dept,
  section,
  reportId,
  canReview,
  onBack,
  onChanged,
}: {
  dept: MonthlyDept;
  section: string;
  reportId: number;
  canReview: boolean;
  onBack: () => void;
  onChanged: () => void;
}) {
  const role = useSelector((s: RootState) => s.auth.user?.role) ?? "";
  const chain = REVIEW_CHAIN[role];
  const [report, setReport] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [acting, setActing] = React.useState(false);
  const [showReject, setShowReject] = React.useState(false);

  const columns = React.useMemo(() => getColumnsForSection(section), [section]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await monthlyApi[dept].get(reportId);
      setReport(res.data);
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [dept, reportId, onBack]);

  React.useEffect(() => { load(); }, [load]);

  const canAct = !!(canReview && chain && report && report.status === chain.inboxStatus);

  const handleApprove = async () => {
    if (!report) return;
    setActing(true);
    try {
      const res = await monthlyApi[dept].approve(report.id, note.trim() || undefined);
      toast.success(res.message || "Report forwarded");
      onChanged();
      onBack();
    } catch (err: any) {
      toast.error("Could not approve", { description: err.message });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!report) return;
    setActing(true);
    try {
      const res = await monthlyApi[dept].reject(report.id, reason);
      toast.success(res.message || "Report rejected");
      setShowReject(false);
      onChanged();
      onBack();
    } catch (err: any) {
      toast.error("Could not reject", { description: err.message });
    } finally {
      setActing(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading report…</span>
      </div>
    );
  }

  const sc = SC[(report.status as ReportStatus) || "draft"] ?? SC.draft;

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to list
        </Button>
        <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
          {sc.icon} {sc.label}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-black text-slate-900">{report.reference_id}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {report.state?.description ?? "—"} · {monthLabel(report.reporting_month)} {report.reporting_year}
                {report.submitted_by ? ` · by ${report.submitted_by}` : ""}
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {columns.map((col: MonthlyListColumn) => (
                <div key={col.key} className="rounded-xl bg-[#f8fdfb] border border-[#d4e8dc] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{col.label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 tabular-nums">
                    {formatMonthlyCellValue(report[col.key], col.format)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {(report.state_review_note || report.rejection_reason) && (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                {report.state_review_note && (
                  <p><span className="font-semibold text-slate-800">Review note:</span> {report.state_review_note}</p>
                )}
                {report.rejection_reason && (
                  <p className="text-rose-700"><span className="font-semibold">Rejection:</span> {report.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          )}

          {canAct && (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Review & Forward</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Approving forwards this report to {chain.forwardLabel}.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Comment (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[#d4e8dc] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Add a note for the next reviewer…"
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" className="text-rose-700 border-rose-200 hover:bg-rose-50" disabled={acting} onClick={() => setShowReject(true)}>
                    Reject
                  </Button>
                  <Button className="bg-orange-action hover:bg-orange-600 gap-2" disabled={acting} onClick={handleApprove}>
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {chain.approveLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {canReview && !canAct && (
            <p className="text-xs text-slate-500 text-center py-2">
              This report is not awaiting your review stage
              {chain ? ` (expected status: ${SC[chain.inboxStatus]?.label ?? chain.inboxStatus})` : ""}.
            </p>
          )}
        </div>
      </ScrollArea>

      {showReject && (
        <RejectModal
          referenceId={report.reference_id}
          loading={acting}
          onCancel={() => setShowReject(false)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}

export default function DeptMonthlyPage({
  dept,
  title,
  section,
  onBack,
  defaultStateId,
  defaultZoneId,
  canCreate = false,
  canReview = false,
  FormComponent,
}: Props) {
  const createOnly = canCreate && !canReview;
  const [mode, setMode] = React.useState<"list" | "form" | "review">(createOnly ? "form" : "list");
  const [reviewId, setReviewId] = React.useState<number | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [records, setRecords] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
    stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await monthlyApi[dept].list({
        state_id: apiStateId,
        section,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      setRecords(res.data);
    } catch (err: any) {
      toast.error("Failed to load reports", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [dept, section, apiStateId, filterYear, filterMonth, filterStatus, createOnly]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => ({
    total: records.length,
    draft: records.filter((r) => r.status === "draft").length,
    submitted: records.filter((r) => r.status === "submitted").length,
    under_review: records.filter((r) => r.status === "under_review").length,
    zonal_review: records.filter((r) => r.status === "zonal_review").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  }), [records]);

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all" || stateFilterActive;

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(records.map((r) => r.reporting_year)),
    [records],
  );

  const dataColumns = React.useMemo(() => getColumnsForSection(section), [section]);

  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  const openReview = (id: number) => {
    setReviewId(id);
    setMode("review");
  };

  // ── Create-only: form only ──────────────────────────────────────────────────
  if (createOnly || mode === "form") {
    return (
      <AnimatePresence mode="wait">
        <motion.div key={`form-${formKey}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
          <FormComponent
            onBack={createOnly ? onBack : () => setMode("list")}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
            yearOptions={yearOptions}
            onSubmitted={() => {
              if (createOnly) {
                setFormKey((k) => k + 1);
              } else {
                setMode("list");
                load();
              }
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Review detail ───────────────────────────────────────────────────────────
  if (mode === "review" && reviewId != null) {
    return (
      <ReviewDetail
        dept={dept}
        section={section}
        reportId={reviewId}
        canReview={canReview}
        onBack={() => { setMode("list"); setReviewId(null); }}
        onChanged={load}
      />
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <p className="text-sm font-bold text-slate-800 hidden md:block">{title}</p>
        <div className="flex items-center gap-3 ml-auto">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
              onClick={() => setMode("form")}
            >
              <Plus className="w-4 h-4" /> New Report
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: counts.total, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
              { label: "In Review", value: counts.under_review + counts.zonal_review, color: "bg-amber-50 border-amber-200", text: "text-amber-700" },
              { label: "Approved", value: counts.approved, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ].map((c) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}
              >
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-row items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {showStateFilter && (
              <div className="flex-1 min-w-0">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger
                    className="w-full"
                    displayValue={
                      filterState === ALL_STATES
                        ? "All States"
                        : (states.find((s) => String(s.id) === filterState)?.description ?? filterState)
                    }
                  >
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

            <div className="flex-1 min-w-0">
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

            <div className="flex-1 min-w-0">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger
                  className="w-full"
                  displayValue={filterMonth === "all" ? "All Months" : (MONTHS.find((m) => m.v === filterMonth)?.l ?? filterMonth)}
                >
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  className="w-full"
                  displayValue={
                    filterStatus === "all"
                      ? "All Statuses"
                      : (SC[filterStatus as ReportStatus]?.label ?? filterStatus)
                  }
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">State Approved</SelectItem>
                  <SelectItem value="zonal_review">Zonal Approved</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                {loading ? "Loading..." : `${records.length} report${records.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading reports...</span>
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <FileText className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No reports match your filters" : "No reports yet"}</p>
                  {!hasFilters && canCreate && (
                    <Button variant="outline" size="sm" onClick={() => setMode("form")} className="mt-2 gap-2">
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
                        {dataColumns.map((col: MonthlyListColumn) => (
                          <TableHead key={col.key} className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">
                            {col.label}
                          </TableHead>
                        ))}
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Submitted By</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap"> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => {
                        const sc = SC[(r.status as ReportStatus) || "draft"] ?? SC.draft;
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                            onClick={() => openReview(r.id)}
                          >
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-primary">{r.reference_id}</span>
                            </TableCell>
                            {dataColumns.map((col: MonthlyListColumn) => (
                              <TableCell key={col.key} className="text-xs font-semibold text-slate-700 text-right whitespace-nowrap tabular-nums">
                                {formatMonthlyCellValue(r[col.key], col.format)}
                              </TableCell>
                            ))}
                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.submitted_by ?? "—"}</TableCell>
                            <TableCell className="text-xs text-slate-400 whitespace-nowrap">{safeDate(r.createdAt)}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-primary"
                                onClick={(e) => { e.stopPropagation(); openReview(r.id); }}
                              >
                                <Eye className="w-3.5 h-3.5" /> View
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
