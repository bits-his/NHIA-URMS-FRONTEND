import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { monthlyApi } from "@/lib/api";
import MonthlyFormShell from "./MonthlyFormShell";
import { currentReportingYear } from "./reportingYears";

// HMO/HCP Quality Assurance section
// Covers: HCF counts, CEmONC, FFP, QA conducted, Accreditation, Mystery Shopping
// Complaints are handled separately in ComplaintsMonthlyForm

interface Props { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null; onSubmitted?: () => void; yearOptions?: string[]; }
const n = (v: string) => v === "" ? null : Number(v);

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <Input type="number" min="0" placeholder="0" value={value} onChange={onChange} />
  </div>
);

export default function SqaMonthlyForm({ onBack, defaultZoneId, defaultStateId, onSubmitted, yearOptions }: Props) {
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [year,    setYear]    = React.useState(currentReportingYear());
  const [month,   setMonth]   = React.useState("");
  const [refId,   setRefId]   = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [isSaving,     setIsSaving]     = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [f, setF] = React.useState({
    total_hcf_under_nhia: "", total_accredited_hcf: "",
    cemonc_accredited_hcf: "", cemonc_beneficiaries: "",
    ffp_accredited_facilities: "", ffp_beneficiaries: "",
    qa_conducted: "",
    accreditation_requests: "", accreditation_conducted: "",
    mystery_shopping_visited: "", mystery_shopping_complied: "", mystery_shopping_non_complied: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!stateId || !year || !month) { toast.error("Select Zone, State, Year and Month."); return false; }
    return true;
  };

  const buildPayload = (status: string) => ({
    state_id: Number(stateId), reporting_year: Number(year), reporting_month: Number(month),
    total_hcf_under_nhia: n(f.total_hcf_under_nhia), total_accredited_hcf: n(f.total_accredited_hcf),
    cemonc_accredited_hcf: n(f.cemonc_accredited_hcf), cemonc_beneficiaries: n(f.cemonc_beneficiaries),
    ffp_accredited_facilities: n(f.ffp_accredited_facilities), ffp_beneficiaries: n(f.ffp_beneficiaries),
    qa_conducted: n(f.qa_conducted),
    accreditation_requests: n(f.accreditation_requests), accreditation_conducted: n(f.accreditation_conducted),
    mystery_shopping_visited: n(f.mystery_shopping_visited),
    mystery_shopping_complied: n(f.mystery_shopping_complied),
    mystery_shopping_non_complied: n(f.mystery_shopping_non_complied),
    submitted_by: `SQA — State ${stateId}`, status, section: "sqa",
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
    <MonthlyFormShell title="HMO/HCP Quality Assurance Monthly Report" dept="SQA"
      refId={refId} stateId={stateId} setStateId={setStateId}
      year={year} setYear={setYear} month={month} setMonth={setMonth}
      onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} yearOptions={yearOptions} onSave={handleSave} onSubmit={handleSubmit}
      isSaving={isSaving} isSubmitting={isSubmitting}>

      {/* HCF Overview */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">HCF Overview</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Total HCF Under NHIA (Formal Sector)" value={f.total_hcf_under_nhia} onChange={set("total_hcf_under_nhia")} />
          <Field label="Total Accredited HCFs" value={f.total_accredited_hcf} onChange={set("total_accredited_hcf")} />
        </CardContent>
      </Card>

      {/* CEmONC & FFP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-3"><CardTitle className="text-sm">CEmONC Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Accredited CEmONC HCFs" value={f.cemonc_accredited_hcf} onChange={set("cemonc_accredited_hcf")} />
            <Field label="CEmONC Beneficiaries" value={f.cemonc_beneficiaries} onChange={set("cemonc_beneficiaries")} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-3"><CardTitle className="text-sm">FFP Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Accredited FFP Facilities" value={f.ffp_accredited_facilities} onChange={set("ffp_accredited_facilities")} />
            <Field label="FFP Beneficiaries" value={f.ffp_beneficiaries} onChange={set("ffp_beneficiaries")} />
          </CardContent>
        </Card>
      </div>

      {/* QA & Accreditation */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Quality Assurance & Accreditation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="QA Conducted (No. of HCFs)" value={f.qa_conducted} onChange={set("qa_conducted")} />
          <Field label="Accreditation Requests (No. of HCFs)" value={f.accreditation_requests} onChange={set("accreditation_requests")} />
          <Field label="Accreditation Conducted (No. of HCFs)" value={f.accreditation_conducted} onChange={set("accreditation_conducted")} />
        </CardContent>
      </Card>

      {/* Mystery Shopping */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Mystery Shopping</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="HCFs Visited" value={f.mystery_shopping_visited} onChange={set("mystery_shopping_visited")} />
          <Field label="HCFs Complied" value={f.mystery_shopping_complied} onChange={set("mystery_shopping_complied")} />
          <Field label="HCFs Non-Complied" value={f.mystery_shopping_non_complied} onChange={set("mystery_shopping_non_complied")} />
        </CardContent>
      </Card>
    </MonthlyFormShell>
  );
}
