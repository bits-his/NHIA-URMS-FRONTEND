import * as React from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Send,
  Loader2,
  Calendar,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adhocAssignmentApi, apiFileUrl } from "@/lib/api";

interface Props {
  onBack: () => void;
  masterId: string | null;
  canReview?: boolean;
  canClose?: boolean;
  isOriginatingDept?: boolean;
  userDepartment?: string;
  onSuccess?: () => void;
}

const PROGRESS_BADGES: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  awaiting_support: { label: "Awaiting Support", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  deferred: { label: "Deferred", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

const REVIEW_BADGES: Record<string, { label: string; cls: string }> = {
  not_due: { label: "Not Due", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  not_submitted: { label: "Not Submitted", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  under_review: { label: "Under Review", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  returned_for_clarification: { label: "Returned for Clarification", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  acknowledged: { label: "Acknowledged", cls: "bg-teal-50 text-teal-800 border-teal-200" },
};

export default function AdhocMasterDetailPage({
  onBack,
  masterId,
  canReview = true,
  canClose = true,
  isOriginatingDept = false,
  userDepartment,
  onSuccess,
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [expandedState, setExpandedState] = React.useState<string | null>(null);
  const isOriginatingReviewer = isOriginatingDept || (!canClose && !!userDepartment);

  // Review & Clarification state
  const [clarificationModal, setClarificationModal] = React.useState<{ reportId: number; open: boolean }>({
    reportId: 0,
    open: false,
  });
  const [clarificationNote, setClarificationNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);

  // Closure state
  const [closingId, setClosingId] = React.useState<string | null>(null);
  const [closureRemarks, setClosureRemarks] = React.useState("");
  const [closing, setClosing] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!masterId) return;
    setLoading(true);
    try {
      const res = await adhocAssignmentApi.getMaster(masterId);
      setData(res.data);
      if (res.data?.state_assignments?.length > 0 && !expandedState) {
        setExpandedState(res.data.state_assignments[0].state_assignment_id);
      }
    } catch (err: any) {
      toast.error("Failed to load details", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  React.useEffect(() => {
    if (masterId) {
      fetchDetail();
    }
  }, [masterId, fetchDetail]);

  const handleReviewAction = async (
    reportId: number,
    action: "accept" | "acknowledge" | "return_for_clarification"
  ) => {
    if (action === "return_for_clarification") {
      setClarificationModal({ reportId, open: true });
      setClarificationNote("");
      return;
    }

    setReviewing(true);
    try {
      await adhocAssignmentApi.reviewStateReport(reportId, { action });
      toast.success(
        action === "acknowledge"
          ? "State report acknowledged by originating department"
          : "State report accepted"
      );
      fetchDetail();
      onSuccess?.();
    } catch (err: any) {
      toast.error("Review action failed", { description: err.message });
    } finally {
      setReviewing(false);
    }
  };

  const submitClarificationReturn = async () => {
    if (!clarificationNote.trim()) {
      toast.error("Please enter clarification reason");
      return;
    }
    setReviewing(true);
    try {
      await adhocAssignmentApi.reviewStateReport(clarificationModal.reportId, {
        action: "return_for_clarification",
        clarification_note: clarificationNote.trim(),
      });
      toast.success("Report returned for clarification");
      setClarificationModal({ reportId: 0, open: false });
      fetchDetail();
      onSuccess?.();
    } catch (err: any) {
      toast.error("Action failed", { description: err.message });
    } finally {
      setReviewing(false);
    }
  };

  const handleCloseStateAssignment = async (stateAssignmentId: string) => {
    setClosing(true);
    try {
      await adhocAssignmentApi.closeStateAssignment(stateAssignmentId, {
        closure_remarks: closureRemarks.trim() || undefined,
      });
      toast.success(`State assignment ${stateAssignmentId} closed`);
      setClosingId(null);
      setClosureRemarks("");
      fetchDetail();
      onSuccess?.();
    } catch (err: any) {
      toast.error("Closure failed", { description: err.message });
    } finally {
      setClosing(false);
    }
  };

  if (!masterId) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/40">
      {/* Clean Sticky Header */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 shrink-0"
            aria-label="Back to assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                Ad-hoc Assignment Details
              </h1>
              {data && (
                <>
                  <Badge className="bg-[#145c3f] text-white font-mono text-xs shadow-none">
                    {data.master_assignment_id}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs uppercase font-bold ${
                      data.status === "dispatched"
                        ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                        : data.status === "closed"
                        ? "border-slate-300 text-slate-700 bg-slate-100"
                        : "border-amber-300 text-amber-800 bg-amber-50"
                    }`}
                  >
                    {data.status === "draft" ? "Saved (Pending Dispatch)" : data.status}
                  </Badge>
                  {data.originating_department_code && (
                    <Badge variant="secondary" className="text-xs">
                      Dept: {data.originating_department_code}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data?.original_instruction_url && (
            <a
              href={apiFileUrl(data.original_instruction_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200 transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Source Memo
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-12 w-full">
        {loading || !data ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading assignment details…</span>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Card 1: Directive Summary */}
            <Card className="rounded-2xl border-[#d4e8dc] shadow-xs bg-white overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assignment Directive
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {data.assignment_title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Originating Dept: <strong className="text-slate-700">{data.originating_department_code}</strong>
                    </span>
                    <span>
                      Date Received: <strong className="text-slate-700">{data.date_received}</strong>
                    </span>
                    <span>
                      Due Date: <strong className="text-slate-700">{data.assignment_due_date}</strong>
                    </span>
                    {data.reference_memo_number && (
                      <span>
                        Ref Memo: <strong className="text-slate-700">{data.reference_memo_number}</strong>
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#f4f7f5] border border-[#d4e8dc] text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Scope & Instructions
                    </span>
                    <p className="text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">
                      {data.assignment_description}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Expected Deliverables
                    </span>
                    <p className="text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">
                      {data.expected_output}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Dispatched State Offices & Reports */}
            <Card className="rounded-2xl border-[#d4e8dc] shadow-xs bg-white overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#d4e8dc]/70">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Dispatched State Offices</span>
                    <Badge variant="secondary" className="text-xs bg-[#e8f6ee] text-[#145c3f] font-bold">
                      {data.state_assignments?.length || 0} State(s)
                    </Badge>
                  </h3>
                </div>

                {!data.state_assignments || data.state_assignments.length === 0 ? (
                  <div className="text-center py-12 border rounded-xl bg-slate-50 text-slate-400 text-xs">
                    No states dispatched yet. Click "Dispatch to States" from the dashboard to assign State Offices.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.state_assignments.map((sa: any) => {
                      const isExpanded = expandedState === sa.state_assignment_id;
                      const pb = PROGRESS_BADGES[sa.progress_status] || PROGRESS_BADGES.not_started;
                      const latestRep = sa.reports?.[0];
                      let rb = null;
                      if (latestRep?.review_status && REVIEW_BADGES[latestRep.review_status]) {
                        rb = REVIEW_BADGES[latestRep.review_status];
                      } else if (sa.closure_status === "closed") {
                        rb = REVIEW_BADGES.accepted;
                      } else if (sa.state_due_date && new Date(sa.state_due_date) < new Date()) {
                        rb = REVIEW_BADGES.not_submitted;
                      } else {
                        rb = REVIEW_BADGES.not_due;
                      }
                      const isClosed = sa.closure_status === "closed";

                      return (
                        <div
                          key={sa.state_assignment_id}
                          className={`rounded-xl border transition overflow-hidden ${
                            isExpanded ? "border-[#1a7a52] shadow-xs bg-white" : "border-slate-200 bg-white/70"
                          }`}
                        >
                          <div
                            onClick={() => setExpandedState(isExpanded ? null : sa.state_assignment_id)}
                            className="p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs font-bold text-[#145c3f] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {sa.state_assignment_id}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {sa.state?.description || sa.state_code} Office
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  Zone: {sa.zone?.description || sa.zonal_code} • Due:{" "}
                                  {sa.state_due_date ? String(sa.state_due_date).slice(0, 10) : "—"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] border ${pb.cls}`}>{pb.label}</Badge>
                              {rb && <Badge className={`text-[10px] border ${rb.cls}`}>{rb.label}</Badge>}
                              {isClosed && (
                                <Badge className="bg-slate-700 text-white text-[10px]">Closed</Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Detail */}
                          {isExpanded && (
                            <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4 text-xs">
                              {!latestRep ? (
                                <div className="py-6 text-center text-slate-400 text-xs">
                                  Awaiting state report submission…
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
                                    <div>
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        Completion Status
                                      </span>
                                      <p className="font-semibold text-slate-800 capitalize mt-0.5">
                                        {latestRep.completion_status.replace("_", " ")}
                                        {latestRep.date_completed && ` (Completed: ${latestRep.date_completed})`}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        Submitted By & Date
                                      </span>
                                      <p className="text-slate-700 mt-0.5">
                                        {latestRep.submitted_by_name || "State Officer"} •{" "}
                                        {latestRep.submitted_at ? String(latestRep.submitted_at).slice(0, 16) : "—"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-3">
                                    <div>
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        Summary of Work Carried Out
                                      </span>
                                      <p className="text-slate-800 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                        {latestRep.work_summary}
                                      </p>
                                    </div>

                                    <div>
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        Output / Outcome Achieved
                                      </span>
                                      <p className="text-slate-800 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                        {latestRep.output_achieved}
                                      </p>
                                    </div>

                                    {latestRep.challenges && (
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                          Challenges Encountered
                                        </span>
                                        <p className="text-amber-800 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                          {latestRep.challenges}
                                        </p>
                                      </div>
                                    )}

                                    {latestRep.clarification_note && (
                                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                                        <span className="text-[10px] uppercase font-bold tracking-wider block mb-0.5">
                                          Clarification Feedback
                                        </span>
                                        <p>{latestRep.clarification_note}</p>
                                      </div>
                                    )}

                                    {/* Evidence Files */}
                                    {latestRep.evidence_files && latestRep.evidence_files.length > 0 && (
                                      <div className="pt-2 border-t border-slate-100">
                                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1.5">
                                          Supporting Evidence Files ({latestRep.evidence_files.length})
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {latestRep.evidence_files.map((ef: any, idx: number) => (
                                            <a
                                              key={idx}
                                              href={apiFileUrl(ef.path)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium text-xs transition"
                                            >
                                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                              <span className="truncate max-w-[200px]">{ef.name}</span>
                                              <Download className="w-3 h-3 text-slate-400 ml-1" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Review and Closure Actions */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                    <div className="flex items-center gap-2">
                                      {canReview && latestRep.review_status !== "accepted" && !isClosed && (
                                        <>
                                          {isOriginatingReviewer ? (
                                            <>
                                              {latestRep.review_status !== "acknowledged" && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleReviewAction(latestRep.id, "acknowledge")}
                                                  disabled={reviewing}
                                                  className="h-8 bg-sky-700 hover:bg-sky-800 text-white text-xs gap-1.5 shadow-xs"
                                                  title="Acknowledge receipt and review of this report on behalf of the originating department"
                                                >
                                                  <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge Report
                                                </Button>
                                              )}
                                              {latestRep.review_status === "acknowledged" && (
                                                <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold">
                                                  Acknowledged by Department
                                                </Badge>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReviewAction(latestRep.id, "return_for_clarification")}
                                                disabled={reviewing}
                                                className="h-8 text-rose-700 border-rose-200 hover:bg-rose-50 text-xs gap-1.5"
                                              >
                                                <AlertCircle className="w-3.5 h-3.5" /> Return for Clarification
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <Button
                                                size="sm"
                                                onClick={() => handleReviewAction(latestRep.id, "accept")}
                                                disabled={reviewing}
                                                className="h-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-xs"
                                              >
                                                <Check className="w-3.5 h-3.5" /> Accept Report
                                              </Button>
                                              {latestRep.review_status !== "acknowledged" && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleReviewAction(latestRep.id, "acknowledge")}
                                                  disabled={reviewing}
                                                  className="h-8 text-sky-700 border-sky-200 hover:bg-sky-50 text-xs gap-1.5"
                                                  title="Acknowledge receipt on behalf of department"
                                                >
                                                  <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                                                </Button>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReviewAction(latestRep.id, "return_for_clarification")}
                                                disabled={reviewing}
                                                className="h-8 text-rose-700 border-rose-200 hover:bg-rose-50 text-xs gap-1.5"
                                              >
                                                <AlertCircle className="w-3.5 h-3.5" /> Return for Clarification
                                              </Button>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {canClose && !isClosed && (
                                      <div className="flex items-center gap-2">
                                        {closingId === sa.state_assignment_id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              placeholder="Closure remarks..."
                                              value={closureRemarks}
                                              onChange={(e) => setClosureRemarks(e.target.value)}
                                              className="h-8 text-xs w-56 bg-white"
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() => handleCloseStateAssignment(sa.state_assignment_id)}
                                              disabled={closing}
                                              className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs"
                                            >
                                              Confirm Close
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setClosingId(null)}
                                              className="h-8 text-xs"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setClosingId(sa.state_assignment_id)}
                                            className="h-8 gap-1.5 text-slate-700 text-xs border-slate-300 hover:bg-slate-100"
                                          >
                                            <Lock className="w-3.5 h-3.5" /> Close Assignment
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Return for Clarification Modal */}
      <Dialog
        open={clarificationModal.open}
        onOpenChange={(op) => !op && setClarificationModal({ reportId: 0, open: false })}
      >
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Return Report for Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-medium text-slate-700">
              Clarification / Feedback Note *
            </Label>
            <Textarea
              rows={3}
              placeholder="State what information, evidence, or revision is required from the state officer..."
              value={clarificationNote}
              onChange={(e) => setClarificationNote(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClarificationModal({ reportId: 0, open: false })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitClarificationReturn}
              disabled={reviewing || !clarificationNote.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {reviewing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Send Clarification Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

