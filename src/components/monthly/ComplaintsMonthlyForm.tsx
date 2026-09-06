import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { monthlyApi } from "@/lib/api";
import MonthlyFormShell from "./MonthlyFormShell";
import { currentReportingYear } from "./reportingYears";

// Enrollee Complaints Management / SHIA Liaison section
// Only handles complaint figures — QA/Accreditation is in SqaMonthlyForm

interface Props { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null; onSubmitted?: () => void; yearOptions?: string[]; }
const n = (v: string) => v === "" ? null : Number(v);

export default function ComplaintsMonthlyForm({ onBack, defaultZoneId, defaultStateId, onSubmitted, yearOptions }: Props) {
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [year,    setYear]    = React.useState(currentReportingYear());
  const [month,   setMonth]   = React.useState("");
  const [refId,   setRefId]   = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [isSaving,     setIsSaving]     = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [f, setF] = React.useState({
    complaints_registered: "", complaints_resolved: "", complaints_escalated: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!stateId || !year || !month) { toast.error("Select Zone, State, Year and Month."); return false; }
    return true;
  };

  const buildPayload = (status: string) => ({
    state_id: Number(stateId), reporting_year: Number(year), reporting_month: Number(month),
    complaints_registered: n(f.complaints_registered),
    complaints_resolved:   n(f.complaints_resolved),
    complaints_escalated:  n(f.complaints_escalated),
    submitted_by: `Complaints — State ${stateId}`, status, section: "complaints",
  });

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const res = savedId
        ? await monthlyApi.sqa.update(savedId, buildPayload("draft"))
        : await monthlyApi.sqa.create(buildPayload("draft"));
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
        ? await monthlyApi.sqa.update(savedId, buildPayload("submitted"))
        : await monthlyApi.sqa.create(buildPayload("submitted"));
      setRefId(res.data.reference_id);
      toast.success("Report submitted", { description: `Ref: ${res.data.reference_id}` });
      (onSubmitted ?? onBack)();
    } catch (err: any) { toast.error("Submission failed", { description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <MonthlyFormShell title="Enrollee Complaints Monthly Report" dept="Complaints / SHIA Liaison"
      refId={refId} stateId={stateId} setStateId={setStateId}
      year={year} setYear={setYear} month={month} setMonth={setMonth}
      onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} yearOptions={yearOptions} onSave={handleSave} onSubmit={handleSubmit}
      isSaving={isSaving} isSubmitting={isSubmitting}>

      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Complaint Management</CardTitle>
          <CardDescription className="text-xs">Enrollee complaints for the selected month</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>Total Complaints Registered</Label>
            <Input type="number" min="0" placeholder="0" value={f.complaints_registered} onChange={set("complaints_registered")} />
          </div>
          <div className="space-y-2">
            <Label>Total Complaints Resolved</Label>
            <Input type="number" min="0" placeholder="0" value={f.complaints_resolved} onChange={set("complaints_resolved")} />
          </div>
          <div className="space-y-2">
            <Label>Total Complaints Escalated</Label>
            <Input type="number" min="0" placeholder="0" value={f.complaints_escalated} onChange={set("complaints_escalated")} />
          </div>
        </CardContent>
      </Card>

      {/* Live summary */}
      {(f.complaints_registered || f.complaints_resolved || f.complaints_escalated) && (
        <div className="flex gap-6 p-4 bg-[#f0fdf7] rounded-xl border border-[#d4e8dc] text-sm">
          <span>Registered: <strong className="text-slate-800">{Number(f.complaints_registered || 0).toLocaleString()}</strong></span>
          <span>Resolved: <strong className="text-emerald-700">{Number(f.complaints_resolved || 0).toLocaleString()}</strong></span>
          <span>Escalated: <strong className="text-amber-700">{Number(f.complaints_escalated || 0).toLocaleString()}</strong></span>
          <span>Pending: <strong className="text-rose-700">
            {Math.max(0, (Number(f.complaints_registered || 0)) - (Number(f.complaints_resolved || 0)) - (Number(f.complaints_escalated || 0))).toLocaleString()}
          </strong></span>
        </div>
      )}
    </MonthlyFormShell>
  );
}
