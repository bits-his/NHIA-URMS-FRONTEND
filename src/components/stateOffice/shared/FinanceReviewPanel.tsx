import * as React from "react";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  SubmitConfirmModal,
  useReportingOfficerSubmitConfirm,
} from "@/src/components/SubmitConfirmModal";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";

interface Props {
  status: string;
  reviewNoteExisting?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  updateStatus: (status: string, review_note?: string) => Promise<void>;
  onChanged?: () => void;
  /** When true, Final Submit is rendered by the parent (e.g. detail header). */
  hideFinalSubmit?: boolean;
}

export default function FinanceReviewPanel({
  status,
  reviewNoteExisting,
  reviewedBy,
  reviewedAt,
  updateStatus,
  onChanged,
  hideFinalSubmit = false,
}: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const [reviewNote, setReviewNote] = React.useState(reviewNoteExisting || "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setReviewNote(reviewNoteExisting || "");
  }, [reviewNoteExisting]);

  const canAct = canReview && status === "awaiting_review";
  const canFinalSubmit = !hideFinalSubmit && canCreate && status === "endorsed";
  const show = ["awaiting_review", "endorsed", "returned", "submitted", "approved"].includes(status);
  if (!show) return null;

  const stamp = reviewedAt
    ? new Date(reviewedAt).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  const run = async (next: "endorsed" | "returned" | "submitted") => {
    if ((next === "returned" || next === "endorsed") && !reviewNote.trim()) {
      toast.error("Enter remarks before endorsing or returning");
      return false;
    }
    setBusy(true);
    try {
      await updateStatus(next, reviewNote.trim() || undefined);
      toast.success(
        next === "endorsed"
          ? "Report endorsed — reporting officer can make the final submission"
          : next === "returned"
            ? "Returned for correction"
            : "Final submission complete",
      );
      onChanged?.();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Coordinator decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "awaiting_review" && (
            <p className="text-sm text-amber-800 font-medium">Awaiting state coordinator endorsement</p>
          )}
          {status === "endorsed" && (
            <p className="text-sm text-teal-800 font-medium">
              Endorsed{reviewedBy ? ` by ${reviewedBy}` : ""}{stamp ? ` · ${stamp}` : ""} — ready for final submission
            </p>
          )}
          {status === "returned" && (
            <p className="text-sm text-rose-700 font-medium">
              Returned for correction{reviewedBy ? ` by ${reviewedBy}` : ""}{stamp ? ` · ${stamp}` : ""}
            </p>
          )}
          {(status === "submitted" || status === "approved") && (
            <p className="text-sm text-emerald-700 font-medium">
              Final submission complete{reviewedBy ? ` · endorsed by ${reviewedBy}` : ""}{stamp ? ` · ${stamp}` : ""}
            </p>
          )}

          {(canAct || reviewNoteExisting) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
              <textarea
                rows={3}
                disabled={!canAct || busy}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={canAct ? "Required before endorse or return" : ""}
                className="w-full min-h-[3.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none disabled:opacity-70"
              />
            </div>
          )}

          {canAct && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                disabled={busy}
                onClick={() => void run("returned")}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Return for Correction
              </Button>
              <Button
                className="gap-2 bg-[#145c3f] hover:bg-[#0f3d2e]"
                disabled={busy}
                onClick={() => void run("endorsed")}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Endorse
              </Button>
            </div>
          )}

          {canFinalSubmit && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p className="text-xs text-slate-500 mr-auto">
                Endorsed by the State Coordinator — make the final submission to complete.
              </p>
              <Button
                className="gap-2 bg-[#145c3f] hover:bg-[#0f3d2e]"
                disabled={busy}
                onClick={() => submitConfirm.requestSubmit(() => run("submitted"), {
                  force: true,
                  title: "Confirm final submission",
                  description:
                    "This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
                  confirmLabel: "Yes, final submit",
                })}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Final Submit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SubmitConfirmModal
        open={submitConfirm.open}
        busy={submitConfirm.busy || busy}
        title={submitConfirm.title}
        description={submitConfirm.description}
        confirmLabel={submitConfirm.confirmLabel}
        onConfirm={submitConfirm.confirm}
        onCancel={submitConfirm.cancel}
      />
    </>
  );
}
