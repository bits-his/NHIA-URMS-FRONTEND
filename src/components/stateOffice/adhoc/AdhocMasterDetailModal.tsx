import * as React from "react";
import {
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adhocAssignmentApi, apiFileUrl } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  masterId: string | null;
  canReview?: boolean;
  canClose?: boolean;
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
};

export default function AdhocMasterDetailModal({
  open,
  onClose,
  onSuccess,
  masterId,
  canReview = true,
  canClose = true,
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [expandedState, setExpandedState] = React.useState<string | null>(null);

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
    if (open && masterId) {
      fetchDetail();
    }
  }, [open, masterId, fetchDetail]);

  const handleReviewAction = async (reportId: number, action: "accept" | "return_for_clarification") => {
    if (action === "return_for_clarification") {
      setClarificationModal({ reportId, open: true });
      setClarificationNote("");
      return;
    }

    setReviewing(true);
    try {
      await adhocAssignmentApi.reviewStateReport(reportId, { action: "accept" });
      toast.success("State report accepted");
      fetchDetail();
      onSuccess();
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
      onSuccess();
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
      onSuccess();
    } catch (err: any) {
      toast.error("Closure failed", { description: err.message });
    } finally {
      setClosing(false);
    }
  };

  if (!masterId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[96vw] max-w-7xl max-h-[94vh] overflow-y-auto p-0 rounded-2xl border-[#d4e8dc]">
          {loading || !data ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading assignment details…</span>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-emerald-50/70 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#145c3f] text-white font-mono text-xs">
                        {data.master_assignment_id}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase font-bold text-slate-600">
                        {data.status}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 mt-2">
                      {data.assignment_title}
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Originating Dept: <strong>{data.originating_department_code}</strong> • Date Received:{" "}
                      {data.date_received} • Master Due Date: {data.assignment_due_date}
                    </p>
                  </div>
                  {data.original_instruction_url && (
                    <a
                      href={apiFileUrl(data.original_instruction_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200 transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Source Memo
                    </a>
                  )}
                </div>
              </DialogHeader>

              <div className="p-6 space-y-6">
                {/* Master Details Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Scope & Instructions
                    </span>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{data.assignment_description}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Expected Deliverables
                    </span>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{data.expected_output}</p>
                  </div>
                </div>

                {/* Dispatched States & Linked Reports */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Dispatched State Offices</span>
                      <Badge variant="secondary" className="text-xs">
                        {data.state_assignments?.length || 0} State(s)
                      </Badge>
                    </h3>
                  </div>

                  {(!data.state_assignments || data.state_assignments.length === 0) ? (
                    <div className="text-center py-12 border rounded-xl bg-slate-50 text-slate-400 text-xs">
                      No states dispatched yet. Click "Dispatch to States" from the dashboard.
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
                              isExpanded ? "border-emerald-300 shadow-sm bg-white" : "border-slate-200 bg-white/70"
                            }`}
                          >
                            <div
                              onClick={() => setExpandedState(isExpanded ? null : sa.state_assignment_id)}
                              className="p-3 px-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70"
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
                                    Awaiting state report submission...
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                          Completion Status
                                        </span>
                                        <p className="font-semibold text-slate-800 capitalize mt-0.5">
                                          {latestRep.completion_status.replace("_", " ")}
                                          {latestRep.date_completed && ` (Completed: ${latestRep.date_completed})`}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                          Submitted By & Date
                                        </span>
                                        <p className="text-slate-700 mt-0.5">
                                          {latestRep.submitted_by_name || "State Officer"} •{" "}
                                          {latestRep.submitted_at ? String(latestRep.submitted_at).slice(0, 16) : "—"}
                                        </p>
                                      </div>

                                      <div className="md:col-span-2">
                                        <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                          Work Carried Out
                                        </span>
                                        <p className="text-slate-800 mt-0.5 leading-relaxed">{latestRep.work_summary}</p>
                                      </div>

                                      <div className="md:col-span-2">
                                        <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                          Output / Outcome Achieved
                                        </span>
                                        <p className="text-slate-800 mt-0.5 leading-relaxed">{latestRep.output_achieved}</p>
                                      </div>

                                      {latestRep.challenges && (
                                        <div className="md:col-span-2">
                                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                            Challenges
                                          </span>
                                          <p className="text-slate-800 mt-0.5 leading-relaxed">{latestRep.challenges}</p>
                                        </div>
                                      )}

                                      {/* Evidence Files */}
                                      {latestRep.evidence_files && latestRep.evidence_files.length > 0 && (
                                        <div className="md:col-span-2 pt-2 border-t border-slate-100">
                                          <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-1">
                                            Supporting Evidence Files ({latestRep.evidence_files.length})
                                          </span>
                                          <div className="flex flex-wrap gap-2">
                                            {latestRep.evidence_files.map((ef: any, idx: number) => (
                                              <a
                                                key={idx}
                                                href={apiFileUrl(ef.path)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium"
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

                                    {/* Action Bar for SDO / Department Review */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <div className="flex items-center gap-2">
                                        {canReview && latestRep.review_status !== "accepted" && !isClosed && (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => handleReviewAction(latestRep.id, "accept")}
                                              disabled={reviewing}
                                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                            >
                                              <Check className="w-3.5 h-3.5" /> Accept Report
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleReviewAction(latestRep.id, "return_for_clarification")}
                                              disabled={reviewing}
                                              className="h-8 gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
                                            >
                                              <AlertCircle className="w-3.5 h-3.5" /> Return for Clarification
                                            </Button>
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
                                                className="h-8 text-xs w-48"
                                              />
                                              <Button
                                                size="sm"
                                                onClick={() => handleCloseStateAssignment(sa.state_assignment_id)}
                                                disabled={closing}
                                                className="h-8 bg-slate-800 text-white text-xs"
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
                                              className="h-8 gap-1.5 text-slate-700 text-xs"
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
                </div>
              </div>

              <DialogFooter className="p-4 px-6 border-t bg-slate-50/70 flex items-center justify-end">
                <Button type="button" variant="outline" onClick={onClose}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
}
