import * as React from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import {
  EXPENDITURE_SUB_HEADS, formatNaira, formatAllocationPct,
} from "./constants";

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** Parent workspace already shows Back + title. */
  embedded?: boolean;
}

const blank = () =>
  Object.fromEntries(EXPENDITURE_SUB_HEADS.map((h) => [h.value, ""])) as Record<string, string>;

export default function ExpenditureProfileReportPage({
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId, embedded = false,
}: Props) {
  const [amounts, setAmounts] = React.useState(blank);
  const [reportStatus, setReportStatus] = React.useState("draft");
  const canEdit = ["draft", "returned"].includes(reportStatus);
  const canFinalSubmit = reportStatus === "endorsed";

  const total = React.useMemo(
    () => EXPENDITURE_SUB_HEADS.reduce((s, h) => {
      const v = amounts[h.value];
      return s + (v === "" ? 0 : Number(v) || 0);
    }, 0),
    [amounts],
  );

  return (
    <StateOfficeFormShell
      reportId={reportId}
      onBack={onBack}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      reportType="expenditure-profile"
      pageTitle={embedded ? undefined : "Expenditure Profile"}
      hidePageHeader={embedded}
      showQuarter
      hideBasicInfo
      hideFooterActions
      returnOnDraft
      onLoaded={(data) => {
        setReportStatus(String(data.status || "draft"));
        const next = blank();
        for (const h of EXPENDITURE_SUB_HEADS) {
          next[h.value] = data[h.value] != null && data[h.value] !== "" ? String(data[h.value]) : "";
        }
        setAmounts(next);
      }}
      validate={() => {
        if (!EXPENDITURE_SUB_HEADS.some((h) => amounts[h.value] !== "")) {
          return "Enter an amount for at least one expense category";
        }
        return null;
      }}
      buildPayload={(base) => {
        const payload: Record<string, unknown> = { ...base };
        for (const h of EXPENDITURE_SUB_HEADS) {
          payload[h.value] = amounts[h.value] === "" ? null : Number(amounts[h.value]);
        }
        return payload;
      }}
    >
      {({ saving, submitting, persist, requestSubmit, header }) => (
        <div className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden">
          <div className="p-4 md:p-5">
            <ReportBasicInfo
              {...header}
              lockZone={header.lockZone}
              lockState={header.lockState}
              showQuarter
              embedded
            />
          </div>
          <div className="px-4 md:px-5 py-3 border-b border-t border-[#e6f0ea] bg-[#f8fbf9]">
            <p className="text-sm font-bold text-slate-800">Quarterly expenses</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter amounts for categories spent this quarter. Leave blank if not spent.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7] border-[#d4e8dc]">
                  <TableHead className="text-xs font-bold text-slate-600 w-[42%]">Expense category</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Allocation %</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap min-w-[10rem]">Amount (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXPENDITURE_SUB_HEADS.map((h) => (
                  <TableRow key={h.value} className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                    <TableCell className="py-2.5">
                      <span className="text-sm font-medium text-slate-800">{h.label}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm text-slate-500">
                      {formatAllocationPct(h.allocation)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="—"
                        className="h-9 text-sm tabular-nums text-right bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-lg outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:ring-2 focus-visible:ring-[#1a7a52]/25"
                        value={amounts[h.value]}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [h.value]: e.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-[#f4faf7] border-[#d4e8dc] hover:bg-[#f4faf7]">
                  <TableCell className="py-3 text-sm font-bold text-slate-800">Total</TableCell>
                  <TableCell className="py-3 text-right text-sm font-semibold tabular-nums text-slate-500">100%</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold tabular-nums text-[#145c3f]">
                    {formatNaira(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 px-4 md:px-5 py-3 border-t border-[#e6f0ea]">
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
                      description: "This locks editing and sends the report to the State Coordinator for endorsement.",
                      confirmLabel: "Yes, send for review",
                    },
                  )}
                  disabled={saving || submitting}
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
      )}
    </StateOfficeFormShell>
  );
}
