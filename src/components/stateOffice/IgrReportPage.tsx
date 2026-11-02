import * as React from "react";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { IGR_SERVICE_TYPES, labelOf } from "./constants";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
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

export default function IgrReportPage({
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const [entry, setEntry] = React.useState(blank);

  const set = (key: keyof ReturnType<typeof blank>, value: string) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

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
        // Top header Date is the only transaction date
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
        <div className="rounded-2xl border border-[#d4e8dc] bg-white p-4 md:p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Transaction details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service type <span className="text-red-500">*</span></Label>
              <Select value={entry.service_type} onValueChange={(v) => set("service_type", v)}>
                <SelectTrigger displayValue={labelOf(IGR_SERVICE_TYPES, entry.service_type, "Select service")}>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {IGR_SERVICE_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Name of principal <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Full name"
                value={entry.principal_name}
                onChange={(e) => set("principal_name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Receipt number <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Enter receipt"
                value={entry.receipt_no}
                onChange={(e) => set("receipt_no", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bill / RRR number</Label>
              <Input
                placeholder="Enter RRR"
                value={entry.bill_rrr_no}
                onChange={(e) => set("bill_rrr_no", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Amount (₦) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={entry.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input type="date" value={entry.payment_date} onChange={(e) => set("payment_date", e.target.value)} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Optional notes"
                value={entry.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </div>
          </div>

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
