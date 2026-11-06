import * as React from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateOfficeFormShell from "./StateOfficeFormShell";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import {
  SSHIA_SUB_HEADS, calcSshiaLine, formatNaira,
} from "./constants";

const finCls = "h-10 w-full rounded-lg px-3 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:ring-2 focus-visible:ring-[#1a7a52]/25";

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** Parent workspace already shows Back + title. */
  embedded?: boolean;
}

type RowState = {
  opening_balance: string;
  receipts: string;
  actual_expenditure: string;
  bhcpf_lives: string;
};

type EntriesState = Record<string, RowState>;

const emptyRow = (): RowState => ({
  opening_balance: "",
  receipts: "",
  actual_expenditure: "",
  bhcpf_lives: "",
});

function blankEntries(): EntriesState {
  return Object.fromEntries(SSHIA_SUB_HEADS.map((h) => [h.prefix, emptyRow()]));
}

function rowHasInput(row: RowState) {
  return !!(row.opening_balance || row.receipts || row.actual_expenditure || row.bhcpf_lives);
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f4faf7] border border-[#d4e8dc] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-[#145c3f] mt-0.5">{value}</p>
    </div>
  );
}

export default function SshiaFinancialReportPage({
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId, embedded = false,
}: Props) {
  const [entries, setEntries] = React.useState<EntriesState>(blankEntries);
  const [reportStatus, setReportStatus] = React.useState("draft");
  const canEdit = ["draft", "returned"].includes(reportStatus);
  const canFinalSubmit = reportStatus === "endorsed";

  const setField = (prefix: string, key: keyof RowState, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [prefix]: { ...prev[prefix], [key]: value },
    }));
  };

  const filledCount = SSHIA_SUB_HEADS.filter((h) => rowHasInput(entries[h.prefix])).length;

  return (
    <StateOfficeFormShell
      reportId={reportId}
      onBack={onBack}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      reportType="sshia-financial"
      pageTitle={embedded ? undefined : "SSHIA Progress Report"}
      hidePageHeader={embedded}
      showQuarter
      hideBasicInfo
      hideFooterActions
      returnOnDraft
      onLoaded={(data) => {
        setReportStatus(String(data.status || "draft"));
        const next = blankEntries();
        for (const h of SSHIA_SUB_HEADS) {
          const p = h.prefix;
          next[p] = {
            opening_balance: data[`${p}_opening_balance`] != null ? String(data[`${p}_opening_balance`]) : "",
            receipts: data[`${p}_receipts`] != null ? String(data[`${p}_receipts`]) : "",
            actual_expenditure: data[`${p}_actual_expenditure`] != null ? String(data[`${p}_actual_expenditure`]) : "",
            bhcpf_lives: data[`${p}_bhcpf_lives`] != null ? String(data[`${p}_bhcpf_lives`]) : "",
          };
        }
        setEntries(next);
      }}
      validate={() => {
        if (filledCount === 0) return "Fill at least one sub-head before saving";
        return null;
      }}
      buildPayload={(base) => {
        const payload: Record<string, unknown> = { ...base };
        for (const h of SSHIA_SUB_HEADS) {
          const p = h.prefix;
          const row = entries[p];
          // Only send sub-heads the officer touched so empty ones don't wipe existing values
          if (!rowHasInput(row)) continue;
          payload[`${p}_opening_balance`] = row.opening_balance === "" ? null : Number(row.opening_balance);
          payload[`${p}_receipts`] = row.receipts === "" ? null : Number(row.receipts);
          payload[`${p}_actual_expenditure`] = row.actual_expenditure === "" ? null : Number(row.actual_expenditure);
          payload[`${p}_bhcpf_lives`] = row.bhcpf_lives === "" ? null : Number(row.bhcpf_lives);
        }
        return payload;
      }}
    >
      {({ saving, submitting, persist, requestSubmit, header }) => (
        <div className="space-y-4">
          <div className="rounded-sm border border-[#d4e8dc] bg-white p-4 md:p-5 space-y-4">
          <ReportBasicInfo
            {...header}
            lockZone={header.lockZone}
            lockState={header.lockState}
            showQuarter
            embedded
          />
          {reportStatus === "returned" && (
            <p className="text-sm text-rose-700 font-medium">
              Returned for correction — update the sub-heads that need fixing, then send for review again.
            </p>
          )}

          {SSHIA_SUB_HEADS.map((h) => {
            const row = entries[h.prefix];
            const derived = calcSshiaLine(row.opening_balance, row.receipts, row.actual_expenditure);
            const active = rowHasInput(row);
            return (
              <div
                key={h.prefix}
                className={`rounded-sm border bg-white p-4 md:p-5 space-y-4 ${
                  active ? "border-[#25a872]/40 shadow-sm" : "border-[#d4e8dc]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0f3d2e]">{h.label}</h3>
                  {active && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#145c3f] bg-[#e8f5ee] border border-[#d4e8dc] rounded-md px-2 py-0.5">
                      Filled
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Opening balance (A)</Label>
                    <Input
                      className={finCls}
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={row.opening_balance}
                      onChange={(e) => setField(h.prefix, "opening_balance", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Allotted / receipts (B)</Label>
                    <Input
                      className={finCls}
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={row.receipts}
                      onChange={(e) => setField(h.prefix, "receipts", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Actual expenditure (D)</Label>
                    <Input
                      className={finCls}
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={row.actual_expenditure}
                      onChange={(e) => setField(h.prefix, "actual_expenditure", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Covered BHCPF lives</Label>
                    <Input
                      className={finCls}
                      type="number" min="0" step="1" placeholder="0"
                      value={row.bhcpf_lives}
                      onChange={(e) => setField(h.prefix, "bhcpf_lives", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {active && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <SummaryPill
                      label="Total available (C = A + B)"
                      value={derived.total_budget == null ? "—" : formatNaira(derived.total_budget)}
                    />
                    <SummaryPill
                      label="Balance (E = C − D)"
                      value={derived.balance == null ? "—" : formatNaira(derived.balance)}
                    />
                    <SummaryPill
                      label="Variance (F = D ÷ C × 100)"
                      value={derived.variance_pct == null ? "N/A" : `${derived.variance_pct.toFixed(1)}%`}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => void persist(reportStatus === "returned" ? "returned" : "draft")}
                  disabled={saving || submitting}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </Button>
                <Button
                  className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                  onClick={() => requestSubmit(
                    () => void persist("awaiting_review").then(() => setReportStatus("awaiting_review")),
                    {
                      force: true,
                      title: "Send for coordinator review?",
                      description: "This locks editing and sends the whole quarter report (all filled sub-heads) to the State Coordinator.",
                      confirmLabel: "Yes, send for review",
                    },
                  )}
                  disabled={saving || submitting || filledCount === 0}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Send className="w-4 h-4" /> Send for Review</>}
                </Button>
              </>
            )}
            {canFinalSubmit && (
              <Button
                className="bg-[#0f3d2e] hover:bg-[#145c3f] gap-2"
                onClick={() => requestSubmit(
                  () => void persist("submitted").then(() => setReportStatus("submitted")),
                  {
                    force: true,
                    title: "Confirm final submission",
                    description: "This completes the report after State Coordinator endorsement.",
                    confirmLabel: "Yes, final submit",
                  },
                )}
                disabled={saving || submitting}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Final Submit</>}
              </Button>
            )}
            {!canEdit && !canFinalSubmit && (
              <p className="text-xs text-slate-500">This report is {reportStatus.replace(/_/g, " ")}. Editing is locked.</p>
            )}
          </div>
          </div>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
