import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { monthlyApi } from "@/lib/api";
import MonthlyFormShell from "./MonthlyFormShell";
import { currentReportingYear } from "./reportingYears";

interface Props { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null; onSubmitted?: () => void; yearOptions?: string[]; }
const n = (v: string) => v === "" ? null : Number(v);

export default function FinanceMonthlyForm({ onBack, defaultZoneId, defaultStateId, onSubmitted, yearOptions }: Props) {
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [year,    setYear]    = React.useState(currentReportingYear());
  const [month,   setMonth]   = React.useState("");
  const [refId,   setRefId]   = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [isSaving,     setIsSaving]     = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [f, setF] = React.useState({
    approved_budget: "", total_amount_utilized: "",
    igr_amount: "",
    total_indebtedness: "", amount_recovered: "", reconciliation_meetings: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!stateId || !year || !month) { toast.error("Select Zone, State, Year and Month."); return false; }
    return true;
  };

  const buildPayload = (status: string) => ({
    state_id: Number(stateId), reporting_year: Number(year), reporting_month: Number(month),
    approved_budget: n(f.approved_budget), total_amount_utilized: n(f.total_amount_utilized),
    igr_amount: n(f.igr_amount),
    total_indebtedness: n(f.total_indebtedness), amount_recovered: n(f.amount_recovered),
    reconciliation_meetings: n(f.reconciliation_meetings),
    submitted_by: `Finance — State ${stateId}`, status, section: "finance",
  });

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const res = savedId
        ? await monthlyApi.finance.update(savedId, buildPayload("draft"))
        : await monthlyApi.finance.create(buildPayload("draft"));
      if (!savedId) { setSavedId(res.data.id); setRefId(res.data.reference_id); }
      toast.success("Draft saved", { description: `Ref: ${res.data.reference_id}` });
    } catch (err: any) { toast.error("Save failed", { description: err.message }); }
    finally { setIsSaving(false); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = savedId
        ? await monthlyApi.finance.update(savedId, buildPayload("submitted"))
        : await monthlyApi.finance.create(buildPayload("submitted"));
      setRefId(res.data.reference_id);
      toast.success("Report submitted", { description: `Ref: ${res.data.reference_id}` });
      (onSubmitted ?? onBack)();
    } catch (err: any) { toast.error("Submission failed", { description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <MonthlyFormShell title="Finance Monthly Report" dept="Finance"
      refId={refId} stateId={stateId} setStateId={setStateId}
      year={year} setYear={setYear} month={month} setMonth={setMonth}
      onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} yearOptions={yearOptions} onSave={handleSave} onSubmit={handleSubmit}
      isSaving={isSaving} isSubmitting={isSubmitting}>

      {/* Budget */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Budget</CardTitle>
          <CardDescription className="text-xs">Enter amounts in Naira</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Approved Budget (₦)</Label>
            <Input type="number" min="0" placeholder="0" value={f.approved_budget} onChange={set("approved_budget")} />
            {f.approved_budget && <p className="text-xs font-semibold text-primary">₦ {Number(f.approved_budget).toLocaleString()}</p>}
          </div>
          <div className="space-y-2">
            <Label>Total Amount Utilized (₦)</Label>
            <Input type="number" min="0" placeholder="0" value={f.total_amount_utilized} onChange={set("total_amount_utilized")} />
            {f.total_amount_utilized && <p className="text-xs font-semibold text-primary">₦ {Number(f.total_amount_utilized).toLocaleString()}</p>}
          </div>
        </CardContent>
      </Card>

      {/* IGR */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Internally Generated Revenue (IGR)</CardTitle>
          <CardDescription className="text-xs">Exclusive of GIFSHIP & Extra-Dependant Premium</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs">
          <div className="space-y-2">
            <Label>IGR Amount (₦)</Label>
            <Input type="number" min="0" placeholder="0" value={f.igr_amount} onChange={set("igr_amount")} />
            {f.igr_amount && <p className="text-xs font-semibold text-primary">₦ {Number(f.igr_amount).toLocaleString()}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Reconciliation of Indebtedness</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>Total Indebtedness (₦)</Label>
            <Input type="number" min="0" placeholder="0" value={f.total_indebtedness} onChange={set("total_indebtedness")} />
            {f.total_indebtedness && <p className="text-xs font-semibold text-primary">₦ {Number(f.total_indebtedness).toLocaleString()}</p>}
          </div>
          <div className="space-y-2">
            <Label>Amount Recovered to HCFs (₦)</Label>
            <Input type="number" min="0" placeholder="0" value={f.amount_recovered} onChange={set("amount_recovered")} />
            {f.amount_recovered && <p className="text-xs font-semibold text-primary">₦ {Number(f.amount_recovered).toLocaleString()}</p>}
          </div>
          <div className="space-y-2">
            <Label>Reconciliation Meetings Held</Label>
            <Input type="number" min="0" placeholder="0" value={f.reconciliation_meetings} onChange={set("reconciliation_meetings")} />
          </div>
        </CardContent>
      </Card>
    </MonthlyFormShell>
  );
}
