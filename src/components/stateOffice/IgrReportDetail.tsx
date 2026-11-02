import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  REPORT_CONFIG, IGR_SERVICE_TYPES,
  monthLabel, labelOf, formatAmount, formatDateShort,
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
}

const STATUS_CONFIG = {
  draft:            { label: "Draft",            cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3 h-3" /> },
  awaiting_review:  { label: "Awaiting review",  cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  returned:         { label: "Returned",         cls: "bg-rose-100 text-rose-700 border-rose-200", icon: <XCircle className="w-3 h-3" /> },
  endorsed:         { label: "Endorsed",         cls: "bg-teal-100 text-teal-800 border-teal-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  submitted:        { label: "Submitted",        cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <Clock className="w-3 h-3" /> },
  approved:         { label: "Approved",         cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

const cfg = REPORT_CONFIG.igr;
const api = stateOfficeApi.igr;

export default function IgrReportDetail({ reportId, onBack, onEdit }: Props) {
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

  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
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
      <div className="flex h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <p className="text-sm text-slate-500">Report not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{cfg.title}</h2>
            <p className="text-xs text-slate-500 truncate">
              <span className="font-mono font-semibold text-[#145c3f]">{String(report.reference_id)}</span>
              {" · "}{monthLabel(report.reporting_month as number)} {String(report.reporting_year)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusCfg && (
            <Badge variant="outline" className={`gap-1 ${statusCfg.cls}`}>
              {statusCfg.icon}{statusCfg.label}
            </Badge>
          )}
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
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reporting context</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Zone" value={String((report.zone as any)?.description || report.zonal_code || "—")} />
            <InfoField label="State" value={String((report.state as any)?.description || report.state_code || "—")} />
            <InfoField label="Date" value={formatDateShort((report.entry_date || report.submission_date) as string)} />
            <InfoField label="Submitted by" value={String(report.submitted_by || "—")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
