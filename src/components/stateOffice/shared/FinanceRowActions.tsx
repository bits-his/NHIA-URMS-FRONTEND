import * as React from "react";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { stateOfficeApi } from "@/lib/api";
import {
  SubmitConfirmModal,
  useReportingOfficerSubmitConfirm,
} from "@/src/components/SubmitConfirmModal";

type FinanceType = "igr" | "sshia-financial" | "expenditure-profile";

export function useFinanceFinalSubmit(reportType: FinanceType, onDone: () => void) {
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const [finalBusy, setFinalBusy] = React.useState(false);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  const requestFinalSubmit = React.useCallback((id: string | number) => {
    submitConfirm.requestSubmit(async () => {
      setFinalBusy(true);
      try {
        await stateOfficeApi[reportType].updateStatus(id, "submitted");
        toast.success("Final submission complete");
        onDoneRef.current();
        return true;
      } catch (err: unknown) {
        toast.error((err as Error).message || "Final submission failed");
        return false;
      } finally {
        setFinalBusy(false);
      }
    }, {
      force: true,
      title: "Confirm final submission",
      description:
        "This completes the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
      confirmLabel: "Yes, final submit",
    });
  }, [reportType, submitConfirm]);

  const modal = (
    <SubmitConfirmModal
      open={submitConfirm.open}
      busy={submitConfirm.busy || finalBusy}
      title={submitConfirm.title}
      description={submitConfirm.description}
      confirmLabel={submitConfirm.confirmLabel}
      onConfirm={submitConfirm.confirm}
      onCancel={submitConfirm.cancel}
    />
  );

  return { finalBusy, requestFinalSubmit, modal };
}

export function FinanceRowActions({
  status,
  canCreate,
  finalBusy,
  onView,
  onUpdate,
  onFinalSubmit,
}: {
  status: string;
  canCreate: boolean;
  finalBusy: boolean;
  onView: () => void;
  onUpdate: () => void;
  onFinalSubmit: () => void;
}) {
  const canUpdate = canCreate && (status === "draft" || status === "returned");
  const canFinalSubmit = canCreate && status === "endorsed";

  return (
    <div className="flex items-center justify-end gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] border border-[#1a7a52]/40 bg-[#f4f7f5] hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
        onClick={onView}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>View</span>
      </Button>
      {canUpdate && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs font-bold text-[#145c3f] border border-[#145c3f]/40 bg-white hover:bg-[#e8f5ee] rounded-sm shadow-2xs"
          onClick={onUpdate}
        >
          Update
        </Button>
      )}
      {canFinalSubmit && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs font-bold text-[#0f3d2e] border border-[#0f3d2e]/40 bg-white hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
          disabled={finalBusy}
          onClick={onFinalSubmit}
        >
          <Send className="w-3.5 h-3.5" />
          Final Submit
        </Button>
      )}
    </div>
  );
}
