import * as React from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  SSHIA_SUB_HEADS, calcSshiaLine, formatNaira, labelOf,
} from "./constants";

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type RowState = {
  opening_balance: string;
  receipts: string;
  actual_expenditure: string;
  bhcpf_lives: string;
};

const emptyRow = (): RowState => ({
  opening_balance: "",
  receipts: "",
  actual_expenditure: "",
  bhcpf_lives: "",
});

function subHeadHasData(prefix: string, data: Record<string, unknown>) {
  return data[`${prefix}_opening_balance`] != null
    || data[`${prefix}_receipts`] != null
    || data[`${prefix}_actual_expenditure`] != null
    || data[`${prefix}_bhcpf_lives`] != null;
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
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const [subHead, setSubHead] = React.useState("");
  const [entry, setEntry] = React.useState(emptyRow);
  const loadedRef = React.useRef<Record<string, unknown>>({});
  const isEditing = !!reportId;

  const selected = SSHIA_SUB_HEADS.find((h) => h.value === subHead) || null;

  const setField = (key: keyof RowState, value: string) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const derived = React.useMemo(
    () => calcSshiaLine(entry.opening_balance, entry.receipts, entry.actual_expenditure),
    [entry],
  );

  const loadSubHeadEntry = (value: string, data: Record<string, unknown>) => {
    const meta = SSHIA_SUB_HEADS.find((h) => h.value === value);
    if (!meta) {
      setEntry(emptyRow());
      return;
    }
    const p = meta.prefix;
    setEntry({
      opening_balance: data[`${p}_opening_balance`] != null ? String(data[`${p}_opening_balance`]) : "",
      receipts: data[`${p}_receipts`] != null ? String(data[`${p}_receipts`]) : "",
      actual_expenditure: data[`${p}_actual_expenditure`] != null ? String(data[`${p}_actual_expenditure`]) : "",
      bhcpf_lives: data[`${p}_bhcpf_lives`] != null ? String(data[`${p}_bhcpf_lives`]) : "",
    });
  };

  return (
    <StateOfficeFormShell
      reportId={reportId}
      onBack={onBack}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      reportType="sshia-financial"
      pageTitle="SSHIA Progress Report"
      showQuarter
      hideFooterActions
      returnOnDraft
      onLoaded={(data) => {
        loadedRef.current = data || {};
        const filled = SSHIA_SUB_HEADS.find((h) => subHeadHasData(h.prefix, data));
        const initial = filled?.value || "";
        setSubHead(initial);
        if (initial) loadSubHeadEntry(initial, data);
        else setEntry(emptyRow());
      }}
      validate={() => {
        if (!subHead || !selected) return "Select a sub-head";
        if (!isEditing && subHeadHasData(selected.prefix, loadedRef.current)) {
          return `${selected.label} is already recorded for this quarter. Open the existing report to update it.`;
        }
        if (!entry.opening_balance && !entry.receipts && !entry.actual_expenditure && !entry.bhcpf_lives) {
          return "Enter at least one figure for this sub-head";
        }
        return null;
      }}
      buildPayload={(base) => {
        if (!selected) return { ...base };
        const p = selected.prefix;
        return {
          ...base,
          [`${p}_opening_balance`]: entry.opening_balance === "" ? null : Number(entry.opening_balance),
          [`${p}_receipts`]: entry.receipts === "" ? null : Number(entry.receipts),
          [`${p}_actual_expenditure`]: entry.actual_expenditure === "" ? null : Number(entry.actual_expenditure),
          [`${p}_bhcpf_lives`]: entry.bhcpf_lives === "" ? null : Number(entry.bhcpf_lives),
        };
      }}
    >
      {({ saving, submitting, persist, requestSubmit }) => (
        <div className="rounded-2xl border border-[#d4e8dc] bg-white p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Sub-head <span className="text-red-500">*</span></Label>
              <Select
                value={subHead || undefined}
                onValueChange={(v) => {
                  setSubHead(v);
                  loadSubHeadEntry(v, loadedRef.current);
                }}
              >
                <SelectTrigger displayValue={labelOf(SSHIA_SUB_HEADS as any, subHead, "Select sub-head")}>
                  <SelectValue placeholder="Select sub-head" />
                </SelectTrigger>
                <SelectContent>
                  {SSHIA_SUB_HEADS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Opening balance (A)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={entry.opening_balance}
                onChange={(e) => setField("opening_balance", e.target.value)}
                disabled={!subHead}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Allotted / receipts (B)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={entry.receipts}
                onChange={(e) => setField("receipts", e.target.value)}
                disabled={!subHead}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Actual expenditure (D)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={entry.actual_expenditure}
                onChange={(e) => setField("actual_expenditure", e.target.value)}
                disabled={!subHead}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Covered BHCPF lives</Label>
              <Input
                type="number" min="0" step="1" placeholder="0"
                value={entry.bhcpf_lives}
                onChange={(e) => setField("bhcpf_lives", e.target.value)}
                disabled={!subHead}
              />
            </div>
          </div>

          {subHead && (
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

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#e6f0ea]">
            <Button variant="outline" onClick={() => persist("draft")} disabled={saving || submitting} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </Button>
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
              onClick={() => requestSubmit(() => persist("submitted"))}
              disabled={saving || submitting}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Send className="w-4 h-4" /> Submit</>}
            </Button>
          </div>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
