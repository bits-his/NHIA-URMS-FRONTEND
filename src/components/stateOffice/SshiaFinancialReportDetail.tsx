import * as React from "react";
import { ArrowLeft, Loader2, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  SSHIA_SUB_HEADS, formatNaira, calcSshiaLine,
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
  embedded?: boolean;
  onStatusChange?: (status: string | null) => void;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  );
}

const api = stateOfficeApi["sshia-financial"];

export default function SshiaFinancialReportDetail({
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

  const filled = React.useMemo(() => {
    if (!report) return [];
    return SSHIA_SUB_HEADS.flatMap((h) => {
      const p = h.prefix;
      const opening = report[`${p}_opening_balance`] as number | null | undefined;
      const receipts = report[`${p}_receipts`] as number | null | undefined;
      const actual = report[`${p}_actual_expenditure`] as number | null | undefined;
      const lives = report[`${p}_bhcpf_lives`] as number | null | undefined;
      if (opening == null && receipts == null && actual == null && lives == null) return [];
      const derived = calcSshiaLine(opening, receipts, actual);
      return [{
        label: h.label,
        opening,
        receipts,
        actual,
        lives,
        ...derived,
      }];
    });
  }, [report]);

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
        <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="p-6">
        {!embedded && (
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        )}
        <p className="text-sm text-slate-500">Report not found.</p>
      </div>
    );
  }

  const money = (v: number | null | undefined) => (v == null ? "—" : formatNaira(v));

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
          <h2 className="text-xl font-bold tracking-tight truncate">SSHIA report details</h2>
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
            <InfoField label="Quarter" value={`Q${report.reporting_quarter}`} />
            <InfoField label="Submitted by" value={String(report.submitted_by || "—")} />
          </CardContent>
        </Card>

        {filled.length === 0 ? (
          <Card className="rounded-xl border border-[#d4e8dc] bg-white shadow-xs">
            <CardContent className="px-5 py-8 text-center text-sm text-slate-500">
              No sub-head filled yet. Use Update to add figures.
            </CardContent>
          </Card>
        ) : filled.map((row) => (
          <Card key={row.label} className="rounded-xl border border-[#d4e8dc] bg-white shadow-xs">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-bold text-[#0f3d2e]">{row.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Opening (A)" value={money(row.opening)} />
              <InfoField label="Receipts (B)" value={money(row.receipts)} />
              <InfoField label="Available (C = A + B)" value={money(row.total_budget)} />
              <InfoField label="Actual (D)" value={money(row.actual)} />
              <InfoField label="Balance (E = C − D)" value={money(row.balance)} />
              <InfoField
                label="Variance (F = D ÷ C × 100)"
                value={row.variance_pct == null ? "N/A" : `${Number(row.variance_pct).toFixed(1)}%`}
              />
              <InfoField label="BHCPF lives" value={row.lives == null ? "—" : String(row.lives)} />
            </CardContent>
          </Card>
        ))}

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
