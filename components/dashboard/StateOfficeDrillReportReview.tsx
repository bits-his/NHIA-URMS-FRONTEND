import * as React from "react";
import { X, Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { StateOfficeDetailRouter } from "@/src/components/stateOffice/registry";
import type { StateOfficeReportType } from "@/src/components/stateOffice/constants";
import type { AuthUser } from "@/src/store/authSlice";

interface Props {
  open: boolean;
  reportType: StateOfficeReportType;
  reportId: number;
  reference?: string | null;
  user?: AuthUser;
  onClose: () => void;
  onReviewed?: () => void;
}

function RejectDialog({
  open, reference, onCancel, onConfirm, loading,
}: {
  open: boolean;
  reference?: string | null;
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
        <p className="text-sm font-bold text-slate-900">Return report to draft</p>
        <p className="text-xs text-slate-500">{reference || "Report"} — explain what must be corrected.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Review comment (required)…"
          className="w-full rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-rose-300"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button
            className="flex-1 bg-rose-600 hover:bg-rose-700"
            disabled={!note.trim() || loading}
            onClick={() => onConfirm(note.trim())}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Return with comment"}
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
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const api = stateOfficeApi[reportType];
  const canReview = user?.role === "state-coordinator" || user?.role === "zonal-coordinator";

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

  const approve = async () => {
    setActing(true);
    try {
      await api.updateStatus(reportId, "approved");
      toast.success("Report approved");
      onReviewed?.();
      onClose();
    } catch (err: unknown) {
      toast.error("Approval failed", { description: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setActing(false);
    }
  };

  const reject = async (note: string) => {
    setActing(true);
    try {
      await api.updateStatus(reportId, "draft", note);
      toast.success("Report returned to draft", { description: "The submitter can revise and resubmit." });
      setRejectOpen(false);
      onReviewed?.();
      onClose();
    } catch (err: unknown) {
      toast.error("Could not return report", { description: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setActing(false);
    }
  };

  const showActions = canReview && status === "submitted" && !loadingStatus;

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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a7a52]">Report review</p>
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

              {showActions && (
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
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle className="w-4 h-4" /> Return
                    </Button>
                    <Button
                      className="bg-[#016630] hover:bg-[#014d24] gap-2"
                      disabled={acting}
                      onClick={() => void approve()}
                    >
                      {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <RejectDialog
        open={rejectOpen}
        reference={reference}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(note) => void reject(note)}
        loading={acting}
      />
    </>
  );
}
