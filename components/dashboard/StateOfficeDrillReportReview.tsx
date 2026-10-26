import * as React from "react";
import { X, Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { StateOfficeDetailRouter } from "@/src/components/stateOffice/registry";
import type { StateOfficeReportType } from "@/src/components/stateOffice/constants";
import type { AuthUser } from "@/src/store/authSlice";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";

interface Props {
  open: boolean;
  reportType: StateOfficeReportType;
  reportId: number;
  reference?: string | null;
  user?: AuthUser;
  onClose: () => void;
  onReviewed?: () => void;
}

function ReviewDialog({
  open, reference, title, hint, confirmLabel, noteRequired, confirmClassName, onCancel, onConfirm, loading,
}: {
  open: boolean;
  reference?: string | null;
  title: string;
  hint: string;
  confirmLabel: string;
  noteRequired: boolean;
  confirmClassName?: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (open) setNote(""); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#d4e8dc] bg-white p-5 shadow-xl space-y-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{reference || "Report"} — {hint}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={noteRequired ? "Review comment (required)…" : "Review comment (optional)…"}
          className="w-full rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-[#1a7a52]/30"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button
            className={`flex-1 ${confirmClassName || "bg-[#016630] hover:bg-[#014d24]"}`}
            disabled={(noteRequired && !note.trim()) || loading}
            onClick={() => onConfirm(note.trim())}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StateOfficeDrillReportReview({
  open, reportType, reportId, reference, user, onClose, onReviewed,
}: Props) {
  const [status, setStatus] = React.useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [dialog, setDialog] = React.useState<"endorse" | "return" | "approve" | null>(null);

  const api = stateOfficeApi[reportType];
  const canReview = isDeptStateCoordinator(user?.role || "") || isDeptZonalCoordinator(user?.role || "");
  const providerWorkflow = reportType === "accreditation";

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingStatus(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setStatus(res.data?.status ?? null);
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus(null);
          toast.error("Failed to load report", {
            description: err instanceof Error ? err.message : "Request failed",
          });
        }
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, api, reportId]);

  const confirmAction = async (note: string) => {
    if (!dialog) return;
    setActing(true);
    try {
      if (dialog === "endorse") {
        await api.updateStatus(reportId, "endorsed", note || undefined);
        toast.success("Report endorsed", { description: "The state officer can now submit this report." });
      } else if (dialog === "approve") {
        await api.updateStatus(reportId, "approved", note || undefined);
        toast.success("Report approved");
      } else {
        const nextStatus = providerWorkflow && status === "awaiting_review" ? "returned" : "draft";
        await api.updateStatus(reportId, nextStatus, note);
        toast.success(
          nextStatus === "returned" ? "Returned for correction" : "Report returned to draft",
          { description: "The submitter can revise and resubmit." },
        );
      }
      setDialog(null);
      onReviewed?.();
      onClose();
    } catch (err: unknown) {
      toast.error(
        dialog === "endorse" ? "Endorsement failed"
          : dialog === "approve" ? "Approval failed"
            : "Could not return report",
        { description: err instanceof Error ? err.message : "Request failed" },
      );
    } finally {
      setActing(false);
    }
  };

  const showProviderActions = canReview && providerWorkflow && status === "awaiting_review" && !loadingStatus;
  const showStandardActions = canReview && !providerWorkflow && status === "submitted" && !loadingStatus;
  const showSubmittedApprove = canReview && providerWorkflow && status === "submitted" && !loadingStatus;

  return (
    <>
      <AnimatePresence>
        {open && reportId > 0 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#d4e8dc] bg-white shadow-2xl"
              style={{ maxHeight: "92vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#d4e8dc] bg-[#f0fdf7] px-4 py-3 shrink-0">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a7a52]">
                    {providerWorkflow ? "State Coordinator review" : "Report review"}
                  </p>
                  <p className="text-sm font-black text-slate-900">{reference || `Report #${reportId}`}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#d4e8dc] text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                <StateOfficeDetailRouter reportType={reportType} reportId={reportId} onBack={onClose} />
              </div>

              {showProviderActions && (
                <div className="shrink-0 border-t border-[#d4e8dc] bg-white px-4 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Endorse so the officer can submit, or return for correction with a comment.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2"
                      disabled={acting}
                      onClick={() => setDialog("return")}
                    >
                      <XCircle className="w-4 h-4" /> Return for Correction
                    </Button>
                    <Button
                      className="bg-[#016630] hover:bg-[#014d24] gap-2"
                      disabled={acting}
                      onClick={() => setDialog("endorse")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Endorse
                    </Button>
                  </div>
                </div>
              )}

              {(showStandardActions || showSubmittedApprove) && (
                <div className="shrink-0 border-t border-[#d4e8dc] bg-white px-4 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Approve or return this submission with a comment.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2"
                      disabled={acting}
                      onClick={() => setDialog("return")}
                    >
                      <XCircle className="w-4 h-4" /> Return
                    </Button>
                    <Button
                      className="bg-[#016630] hover:bg-[#014d24] gap-2"
                      disabled={acting}
                      onClick={() => setDialog("approve")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ReviewDialog
        open={dialog === "return"}
        reference={reference}
        title={providerWorkflow && status === "awaiting_review" ? "Return for correction" : "Return report to draft"}
        hint="explain what must be corrected (required)."
        confirmLabel="Return with comment"
        noteRequired
        confirmClassName="bg-rose-600 hover:bg-rose-700"
        onCancel={() => setDialog(null)}
        onConfirm={(note) => void confirmAction(note)}
        loading={acting}
      />
      <ReviewDialog
        open={dialog === "endorse"}
        reference={reference}
        title="Confirm endorsement"
        hint="confirm you have reviewed this report. Comments are optional."
        confirmLabel="Confirm Endorse"
        noteRequired={false}
        onCancel={() => setDialog(null)}
        onConfirm={(note) => void confirmAction(note)}
        loading={acting}
      />
      <ReviewDialog
        open={dialog === "approve"}
        reference={reference}
        title="Confirm approval"
        hint="confirm final approval. Comments are optional."
        confirmLabel="Confirm Approve"
        noteRequired={false}
        onCancel={() => setDialog(null)}
        onConfirm={(note) => void confirmAction(note)}
        loading={acting}
      />
    </>
  );
}
