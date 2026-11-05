import * as React from "react";
import {
  CheckCircle2, XCircle, Clock, Send, FileText, Eye,
  Search, Filter, ChevronRight, ArrowLeft, AlertCircle,
  RefreshCw, Loader2, MessageSquare, CheckSquare, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PageLayout from "./PageLayout";
import { annualReportApi } from "@/lib/api";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

//  Types 
type ReportStatus = "draft" | "submitted" | "under_review" | "zonal_review" | "approved" | "rejected";

interface Report {
  reference_id: string;
  reporting_year: number;
  state: string;
  status: ReportStatus;
  submitted_by: string | null;
  state_reviewed_by: string | null;
  state_reviewed_at: string | null;
  state_review_note: string | null;
  zonal_reviewed_by: string | null;
  zonal_reviewed_at: string | null;
  zonal_review_note: string | null;
  sdo_reviewed_by: string | null;
  sdo_reviewed_at: string | null;
  rejection_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  createdAt: string;
  updatedAt: string;
}

//  Role config 
const ROLE_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  inboxStatus: ReportStatus;
  approveLabel: string;
  forwardLabel: string;
  color: string;
}> = {
  "state-coordinator": {
    title: "State Coordinator Review",
    subtitle: "Review and approve reports submitted by state officers",
    inboxStatus: "submitted",
    approveLabel: "Approve & Forward to Zonal",
    forwardLabel: "Zonal Coordinator",
    color: "#3b82f6",
  },
  "zonal-coordinator": {
    title: "Zonal Coordinator Review",
    subtitle: "Review state-coordinator approved reports before forwarding to SDO",
    inboxStatus: "under_review",
    approveLabel: "Approve & Forward to SDO",
    forwardLabel: "SDO / DGO",
    color: "#8b5cf6",
  },
  "sdo": {
    title: "SDO / DGO Final Review",
    subtitle: "Final approval of reports forwarded by zonal coordinators",
    inboxStatus: "zonal_review",
    approveLabel: "Final Approve",
    forwardLabel: "Approved",
    color: "#25a872",
  },
};

//  Status badge config 
const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <Send className="w-3 h-3" /> },
  under_review: { label: "State Approved", className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  zonal_review: { label: "Zonal Approved", className: "bg-purple-100 text-purple-700 border-purple-200", icon: <CheckSquare className="w-3 h-3" /> },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700 border-rose-200", icon: <XCircle className="w-3 h-3" /> },
};

//  Reject modal 
function RejectModal({ report, onConfirm, onCancel, loading }: {
  report: Report;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#d4e8dc] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Reject Report</p>
            <p className="text-xs text-slate-500 mt-0.5">{report.reference_id}  {report.state}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#e8f5ee] text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">The report will be returned to the submitter with your reason. They can revise and resubmit.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Rejection Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why this report is being rejected..."
            className="w-full p-3 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm resize-none focus:ring-2 focus:ring-rose-400 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl border-[#d4e8dc]">Cancel</Button>
          <Button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject Report
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

//  Report detail panel 
function ReportDetailPanel({ report, roleConfig, onApprove, onReject, onBack, approving, rejecting }: {
  report: Report;
  roleConfig: typeof ROLE_CONFIG[string];
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const sc = STATUS_CONFIG[report.status];
  const canAct = report.status === roleConfig.inboxStatus;

  const timeline = [
    report.submitted_by && { label: "Submitted", by: report.submitted_by, at: report.createdAt, color: "#3b82f6" },
    report.state_reviewed_by && { label: "State Approved", by: report.state_reviewed_by, at: report.state_reviewed_at!, color: "#f59e0b" },
    report.zonal_reviewed_by && { label: "Zonal Approved", by: report.zonal_reviewed_by, at: report.zonal_reviewed_at!, color: "#8b5cf6" },
    report.sdo_reviewed_by && { label: "SDO Approved", by: report.sdo_reviewed_by, at: report.sdo_reviewed_at!, color: "#25a872" },
    report.rejected_by && { label: "Rejected", by: report.rejected_by, at: report.rejected_at!, color: "#ef4444" },
  ].filter(Boolean) as { label: string; by: string; at: string; color: string }[];

  return (
    <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#d4e8dc] hover:bg-[#e8f5ee] text-slate-600 hover:text-[#145c3f] transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-slate-900">{report.state}  {report.reporting_year} Annual Report</p>
          <p className="text-xs text-slate-500 font-mono">{report.reference_id}</p>
        </div>
        <Badge className={`${sc.className} flex items-center gap-1 text-xs px-3 py-1`}>
          {sc.icon} {sc.label}
        </Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "State", value: report.state },
          { label: "Year", value: String(report.reporting_year) },
          { label: "Submitted By", value: report.submitted_by ?? "" },
          { label: "Last Updated", value: new Date(report.updatedAt).toLocaleDateString() },
        ].map(k => (
          <div key={k.label} className="p-3 rounded-2xl border border-[#d4e8dc] bg-[#f0fdf7]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
            <p className="text-sm font-black text-slate-900 truncate">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Approval timeline */}
      {timeline.length > 0 && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Approval Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">{t.label}</p>
                  <p className="text-[10px] text-slate-500">by {t.by}  {new Date(t.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejection reason */}
      {report.rejection_reason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
          <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Rejection Reason</p>
          <p className="text-sm text-rose-800">{report.rejection_reason}</p>
          <p className="text-[10px] text-rose-500">Rejected by {report.rejected_by}  {report.rejected_at ? new Date(report.rejected_at).toLocaleString() : ""}</p>
        </div>
      )}

      {/* Review notes */}
      {(report.state_review_note || report.zonal_review_note) && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Review Notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.state_review_note && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 mb-1">State Coordinator Note</p>
                <p className="text-xs text-slate-700">{report.state_review_note}</p>
              </div>
            )}
            {report.zonal_review_note && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-[10px] font-bold text-purple-700 mb-1">Zonal Coordinator Note</p>
                <p className="text-xs text-slate-700">{report.zonal_review_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-3 pt-2">
          <Button onClick={onReject} disabled={rejecting || approving} variant="outline"
            className="flex-1 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400 gap-2">
            {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </Button>
          <Button onClick={onApprove} disabled={approving || rejecting}
            className="flex-1 rounded-xl bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-2 shadow-md shadow-[#145c3f]/20">
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {roleConfig.approveLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

//  Main ReportReviewPage 
interface ReportReviewPageProps {
  role: string;
  onBack?: () => void;
}

export default function ReportReviewPage({ role, onBack }: ReportReviewPageProps) {
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG["state-coordinator"];

  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Report | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Report | null>(null);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [yearFilter, setYearFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("inbox");
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (yearFilter !== "all") filters.year = yearFilter;
      // "inbox" = the status this role needs to act on; "all" = everything visible to this role
      if (statusFilter === "inbox") filters.status = roleConfig.inboxStatus;
      const res = await annualReportApi.list(filters);
      setReports(res.data ?? []);
    } catch (e: any) {
      toast.error("Failed to load reports", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter, roleConfig.inboxStatus]);

  React.useEffect(() => { load(); }, [load]);

  const handleApprove = async (report: Report) => {
    setApproving(true);
    try {
      await annualReportApi.approve(report.reference_id);
      toast.success("Report approved", { description: `Forwarded to ${roleConfig.forwardLabel}` });
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error("Approval failed", { description: e.message });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (report: Report, reason: string) => {
    setRejecting(true);
    try {
      await annualReportApi.reject(report.reference_id, reason);
      toast.success("Report rejected", { description: "The submitter has been notified" });
      setRejectTarget(null);
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error("Rejection failed", { description: e.message });
    } finally {
      setRejecting(false);
    }
  };

  const filtered = reports.filter(r =>
    !search || r.state.toLowerCase().includes(search.toLowerCase()) ||
    r.reference_id.toLowerCase().includes(search.toLowerCase())
  );

  const inboxCount = reports.filter(r => r.status === roleConfig.inboxStatus).length;

  return (
    <PageLayout
      title={selected ? `Review Report — ${selected.state} (${selected.reporting_year})` : roleConfig.title}
      onBack={selected ? () => setSelected(null) : undefined}
      badge={inboxCount > 0 ? `${inboxCount} pending action` : undefined}
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="h-9 text-xs rounded-xl border-[#d4e8dc] hover:bg-[#e8f5ee] gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
      filters={
        !selected ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search state or reference..."
                className="w-full pl-9 pr-4 h-9 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-xs focus:ring-2 focus:ring-[#25a872] outline-none transition-all placeholder:text-slate-400" />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#e8f5ee] border border-[#d4e8dc]">
              {[
                { value: "inbox", label: "Inbox" },
                { value: "all", label: "All" },
              ].map(o => (
                <button key={o.value} onClick={() => setStatusFilter(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === o.value ? "bg-[#145c3f] text-white shadow-sm" : "text-[#5a7a6a] hover:text-[#145c3f]"
                    }`}>{o.label}</button>
              ))}
            </div>

            {/* Year filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 w-32 rounded-xl border-[#d4e8dc] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#d4e8dc]">
                <SelectItem value="all" className="text-xs">All Years</SelectItem>
                {["2025", "2024", "2023"].map(y => (
                  <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined
      }
      contentClassName="space-y-6 pb-12"
    >
      <div className="w-full space-y-6">

        {/* Table */}
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading reports...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold">No reports found</p>
              <p className="text-xs">
                {statusFilter === "inbox"
                  ? `No reports awaiting your review`
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7]">
                  <TableHead className="text-xs font-bold text-slate-600">Reference</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Year</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Submitted By</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Updated</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-600">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const sc = STATUS_CONFIG[r.status];
                  const canAct = r.status === roleConfig.inboxStatus;
                  return (
                    <TableRow key={r.reference_id}
                      className="hover:bg-[#f0fdf7] transition-colors cursor-pointer group"
                      onClick={() => setSelected(r)}>
                      <TableCell className="font-mono text-xs font-bold text-[#145c3f]">
                        {r.reference_id}
                        <ChevronRight className="w-3 h-3 inline ml-1 text-[#25a872] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-800">{r.state}</TableCell>
                      <TableCell className="text-sm text-slate-600">{r.reporting_year}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.submitted_by ?? ""}</TableCell>
                      <TableCell>
                        <Badge className={`${sc.className} flex items-center gap-1 text-[10px] w-fit`}>
                          {sc.icon} {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {canAct ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline"
                              onClick={() => setRejectTarget(r)}
                              className="h-7 text-[10px] rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 px-2">
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                            <Button size="sm"
                              onClick={() => handleApprove(r)}
                              disabled={approving}
                              className="h-7 text-[10px] rounded-lg bg-[#145c3f] hover:bg-[#0f3d2e] text-white px-2 gap-1">
                              {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost"
                            onClick={() => setSelected(r)}
                            className="h-7 text-[10px] rounded-lg text-slate-500 hover:text-[#145c3f] hover:bg-[#e8f5ee] px-2">
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Summary footer */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-right">
            Showing {filtered.length} report{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Reject modal */}
        <AnimatePresence>
          {rejectTarget && (
            <RejectModal
              report={rejectTarget}
              onConfirm={(reason) => handleReject(rejectTarget, reason)}
              onCancel={() => setRejectTarget(null)}
              loading={rejecting}
            />
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
