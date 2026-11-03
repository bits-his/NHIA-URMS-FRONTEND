import * as React from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { IGR_SERVICE_TYPES, labelOf } from "./constants";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-lg px-3.5 py-2 text-sm bg-white border border-[#c5ddd0] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] focus-visible:border-[#0f3d2e] focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const blank = () => ({
  service_type: "",
  principal_name: "",
  receipt_no: "",
  bill_rrr_no: "",
  amount: "",
  payment_date: "",
  remarks: "",
});

const inputCls = "h-9 text-sm bg-white border border-[#c5ddd0] rounded-lg";

export default function IgrReportPage({
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const [entry, setEntry] = React.useState(blank);
  const [reportStatus, setReportStatus] = React.useState("draft");

  const set = (key: keyof ReturnType<typeof blank>, value: string) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const canEdit = ["draft", "returned"].includes(reportStatus);
  const canSendReview = canEdit;
  const canFinalSubmit = reportStatus === "endorsed";

  return (
    <StateOfficeFormShell
      reportId={reportId}
      onBack={onBack}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      reportType="igr"
      pageTitle="Internally Generated Revenue (IGR)"
      submitDateLabel="Date"
      hideFooterActions
      returnOnDraft
      onLoaded={(data) => {
        setReportStatus(String(data.status || "draft"));
        setEntry({
          service_type: String(data.service_type ?? ""),
          principal_name: String(data.principal_name ?? ""),
          receipt_no: String(data.receipt_no ?? ""),
          bill_rrr_no: String(data.bill_rrr_no ?? ""),
          amount: data.amount != null && data.amount !== "" ? String(data.amount) : "",
          payment_date: data.payment_date ? String(data.payment_date).slice(0, 10) : "",
          remarks: String(data.remarks ?? ""),
        });
      }}
      validate={() => {
        if (!entry.service_type) return "Select service type";
        if (!entry.principal_name.trim()) return "Enter name of principal";
        if (!entry.receipt_no.trim()) return "Enter receipt number";
        if (entry.amount === "" || Number(entry.amount) < 0) return "Enter a valid non-negative amount";
        return null;
      }}
      buildPayload={(base) => ({
        ...base,
        entry_date: base.submission_date || new Date().toISOString().slice(0, 10),
        service_type: entry.service_type,
        principal_name: entry.principal_name.trim(),
        receipt_no: entry.receipt_no.trim(),
        bill_rrr_no: entry.bill_rrr_no.trim() || null,
        nin_charge: null,
        amount: Number(entry.amount),
        payment_date: entry.payment_date || null,
        remarks: entry.remarks.trim() || null,
      })}
    >
      {({ saving, submitting, persist, requestSubmit }) => (
        <div className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden">
          <div className="px-4 md:px-5 py-3 border-b border-[#e6f0ea] bg-[#f8fbf9]">
            <p className="text-sm font-bold text-slate-800">Transaction details</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter one IGR receipt for this date. Required fields are marked.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7] border-[#d4e8dc]">
                  <TableHead className="text-xs font-bold text-slate-600 w-[36%]">Field</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">
                    Service type <span className="text-red-500">*</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Select
                      value={entry.service_type}
                      onValueChange={(v) => set("service_type", v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger
                        className={inputCls}
                        displayValue={labelOf(IGR_SERVICE_TYPES, entry.service_type, "Select service")}
                      >
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {IGR_SERVICE_TYPES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">
                    Name of principal <span className="text-red-500">*</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      placeholder="Full name"
                      className={inputCls}
                      value={entry.principal_name}
                      onChange={(e) => set("principal_name", e.target.value)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">
                    Receipt number <span className="text-red-500">*</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      placeholder="Enter receipt"
                      className={inputCls}
                      value={entry.receipt_no}
                      onChange={(e) => set("receipt_no", e.target.value)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">Bill / RRR number</TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      placeholder="Enter RRR"
                      className={inputCls}
                      value={entry.bill_rrr_no}
                      onChange={(e) => set("bill_rrr_no", e.target.value)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">
                    Amount (₦) <span className="text-red-500">*</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount"
                      className={`${inputCls} tabular-nums`}
                      value={entry.amount}
                      onChange={(e) => set("amount", e.target.value)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800">Payment date</TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      type="date"
                      className={inputCls}
                      value={entry.payment_date}
                      onChange={(e) => set("payment_date", e.target.value)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>

                <TableRow className="border-[#e6f0ea] hover:bg-[#f8fdfb]">
                  <TableCell className="py-2.5 text-sm font-medium text-slate-800 align-top pt-3">Remarks</TableCell>
                  <TableCell className="py-2.5">
                    <Textarea
                      rows={3}
                      placeholder="Optional notes"
                      value={entry.remarks}
                      onChange={(e) => set("remarks", e.target.value)}
                      disabled={!canEdit}
                    />
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
                {canSendReview && (
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
                )}
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
