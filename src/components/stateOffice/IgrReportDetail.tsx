import * as React from "react";
import { ArrowLeft, Loader2, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  IGR_SERVICE_TYPES,
  labelOf, formatAmount, formatDateShort,
} from "./constants";
import FinanceReviewPanel from "./shared/FinanceReviewPanel";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import {
  SubmitConfirmModal,
  useReportingOfficerSubmitConfirm,
} from "@/src/components/SubmitConfirmModal";

interface Props {
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
  /** When true, parent workspace already shows title/back — skip duplicate header. */
  embedded?: boolean;
  /** Notify parent of current status for header badge. */
  onStatusChange?: (status: string | null) => void;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

const api = stateOfficeApi.igr;

export default function IgrReportDetail({
  reportId,
  onBack,
  onEdit,
  embedded = false,
  onStatusChange,
}: Props) {
  const { canCreate } = useStateOfficeAccess();
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const [report, setReport] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [finalBusy, setFinalBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: unknown) {
        if (!cancelled) toast.error("Failed to load report", { description: (err as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  React.useEffect(() => {
    onStatusChange?.(report ? String(report.status || "") : null);
  }, [report, onStatusChange]);

  React.useEffect(() => {
    return () => onStatusChange?.(null);
  }, [onStatusChange]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(reportId);
      setReport(res.data);
    } catch (err: unknown) {
      toast.error("Failed to load report", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  const canUpdate = !!onEdit && ["draft", "returned"].includes(String(report?.status || ""));
  const canFinalSubmit = canCreate && report?.status === "endorsed";

  const finalSubmit = async () => {
    setFinalBusy(true);
    try {
      await api.updateStatus(reportId, "submitted");
      toast.success("Final submission complete");
      await reload();
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || "Final submission failed");
      return false;
    } finally {
      setFinalBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-slate-400 py-16">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        {!embedded && (
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <p className="text-sm text-slate-500">Report not found.</p>
      </div>
    );
  }

  const actions = (canUpdate || canFinalSubmit) ? (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#d4e8dc] pt-4">
      {canUpdate && (
        <Button size="sm" className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e]" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Update
        </Button>
      )}
      {canFinalSubmit && (
        <Button
          size="sm"
          className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e]"
          disabled={finalBusy}
          onClick={() => submitConfirm.requestSubmit(() => finalSubmit(), {
            force: true,
            title: "Confirm final submission",
            description:
              "This completes the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
            confirmLabel: "Yes, final submit",
          })}
        >
          {finalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Final Submit
        </Button>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full">
      {!embedded && (
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight truncate">Transaction details</h2>
        </div>
      )}

      <div className={`flex-1 space-y-4 ${embedded ? "pt-1" : "overflow-auto p-4 md:p-6"}`}>
        <Card className="rounded-xl border border-[#d4e8dc] bg-white shadow-xs">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-[#0f3d2e]">Reporting context</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Zone" value={String((report.zone as any)?.description || report.zonal_code || "—")} />
            <InfoField label="State" value={String((report.state as any)?.description || report.state_code || "—")} />
            <InfoField label="Date" value={formatDateShort((report.entry_date || report.submission_date) as string)} />
            <InfoField label="Submitted by" value={String(report.submitted_by || "—")} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#d4e8dc] bg-white shadow-xs">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-[#0f3d2e]">Transaction details</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoField label="Service type" value={labelOf(IGR_SERVICE_TYPES, String(report.service_type))} />
            <InfoField label="Name of principal" value={String(report.principal_name || "—")} />
            <InfoField label="Amount" value={`₦${formatAmount(report.amount as number)}`} />
            <InfoField label="Receipt number" value={String(report.receipt_no || "—")} />
            <InfoField label="Bill / RRR number" value={String(report.bill_rrr_no || "—")} />
            <InfoField label="Payment date" value={formatDateShort(report.payment_date as string)} />
            <InfoField label="Remarks" value={String(report.remarks || "—")} />
          </CardContent>
        </Card>

        <FinanceReviewPanel
          status={String(report.status)}
          reviewNoteExisting={report.coordinator_review_note as string | null}
          reviewedBy={report.coordinator_reviewed_by as string | null}
          reviewedAt={report.coordinator_reviewed_at as string | null}
          updateStatus={(status, note) => api.updateStatus(reportId, status, note).then(() => undefined)}
          onChanged={() => void reload()}
          hideFinalSubmit
        />

        {actions}
      </div>

      <SubmitConfirmModal
        open={submitConfirm.open}
        busy={submitConfirm.busy || finalBusy}
        title={submitConfirm.title}
        description={submitConfirm.description}
        confirmLabel={submitConfirm.confirmLabel}
        onConfirm={submitConfirm.confirm}
        onCancel={submitConfirm.cancel}
      />
    </div>
  );
}
