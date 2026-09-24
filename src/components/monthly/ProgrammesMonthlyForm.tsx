import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { monthlyApi } from "@/lib/api";
import MonthlyFormShell from "./MonthlyFormShell";
import { currentReportingYear } from "./reportingYears";

// Enrolment section — all scheme enrolment & premium figures
// Outreach/advocacy is handled separately in OutreachMonthlyForm

interface Props { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null; onSubmitted?: () => void; yearOptions?: string[]; }
const n = (v: string) => v === "" ? null : Number(v);

const Field = ({ label, value, onChange, naira }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  naira?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <Input type="number" min="0" step={naira ? "0.01" : undefined} placeholder="0" value={value} onChange={onChange} />
  </div>
);

export default function ProgrammesMonthlyForm({ onBack, defaultZoneId, defaultStateId, onSubmitted, yearOptions }: Props) {
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [year,    setYear]    = React.useState(currentReportingYear());
  const [month,   setMonth]   = React.useState("");
  const [refId,   setRefId]   = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [isSaving,     setIsSaving]     = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [f, setF] = React.useState({
    gifship_enrolments: "", gifship_premium: "",
    ops_count: "",
    fsship_new_enrolments: "",
    extra_dependants: "", extra_dependant_premium: "",
    additional_dependants: "", change_of_provider: "",
    bhcpf_beneficiaries: "", bhcpf_facilities: "",
    tiship_lives: "", participating_institutions: "", mha_lives: "", sshia_lives: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!stateId || !year || !month) { toast.error("Select Zone, State, Year and Month."); return false; }
    return true;
  };

  const buildPayload = (status: string) => ({
    state_id: Number(stateId), reporting_year: Number(year), reporting_month: Number(month),
    gifship_enrolments: n(f.gifship_enrolments), gifship_premium: n(f.gifship_premium),
    ops_count: n(f.ops_count),
    fsship_new_enrolments: n(f.fsship_new_enrolments),
    extra_dependants: n(f.extra_dependants), extra_dependant_premium: n(f.extra_dependant_premium),
    additional_dependants: n(f.additional_dependants), change_of_provider: n(f.change_of_provider),
    bhcpf_beneficiaries: n(f.bhcpf_beneficiaries), bhcpf_facilities: n(f.bhcpf_facilities),
    tiship_lives: n(f.tiship_lives), participating_institutions: n(f.participating_institutions),
    mha_lives: n(f.mha_lives), sshia_lives: n(f.sshia_lives),
    submitted_by: `Enrolment — State ${stateId}`, status, section: "enrolment",
  });

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const res = savedId
        ? await monthlyApi.programmes.update(savedId, buildPayload("draft"))
        : await monthlyApi.programmes.create(buildPayload("draft"));
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
        ? await monthlyApi.programmes.update(savedId, buildPayload("submitted"))
        : await monthlyApi.programmes.create(buildPayload("submitted"));
      setRefId(res.data.reference_id);
      toast.success("Report submitted", { description: `Ref: ${res.data.reference_id}` });
      (onSubmitted ?? onBack)();
    } catch (err: any) { toast.error("Submission failed", { description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <MonthlyFormShell title="Enrolment Monthly Report" dept="Programmes — Enrolment"
      refId={refId} stateId={stateId} setStateId={setStateId}
      year={year} setYear={setYear} month={month} setMonth={setMonth}
      onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} yearOptions={yearOptions} onSave={handleSave} onSubmit={handleSubmit}
      isSaving={isSaving} isSubmitting={isSubmitting}>

      {/* GIFSHIP */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">GIFSHIP</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="GIFSHIP Enrolments" value={f.gifship_enrolments} onChange={set("gifship_enrolments")} />
          <Field label="Premium on GIFSHIP (₦)" value={f.gifship_premium} onChange={set("gifship_premium")} naira />
        </CardContent>
      </Card>

      {/* Enrolment figures */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Enrolment Figures</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="OPS" value={f.ops_count} onChange={set("ops_count")} />
          <Field label="New Enrolments / Mop-up (FSSHIP)" value={f.fsship_new_enrolments} onChange={set("fsship_new_enrolments")} />
          <Field label="Extra Dependants" value={f.extra_dependants} onChange={set("extra_dependants")} />
          <Field label="Premium on Extra-Dependant (₦)" value={f.extra_dependant_premium} onChange={set("extra_dependant_premium")} naira />
          <Field label="Additional Dependants" value={f.additional_dependants} onChange={set("additional_dependants")} />
          <Field label="Change of Provider" value={f.change_of_provider} onChange={set("change_of_provider")} />
        </CardContent>
      </Card>

      {/* Other schemes */}
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Other Schemes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="BHCPF Beneficiaries" value={f.bhcpf_beneficiaries} onChange={set("bhcpf_beneficiaries")} />
          <Field label="BHCPF Accredited Facilities" value={f.bhcpf_facilities} onChange={set("bhcpf_facilities")} />
          <Field label="TISHIP Lives" value={f.tiship_lives} onChange={set("tiship_lives")} />
          <Field label="Total No. of Participating Institutions" value={f.participating_institutions} onChange={set("participating_institutions")} />
          <Field label="MHA Lives" value={f.mha_lives} onChange={set("mha_lives")} />
          <Field label="SSHIA Lives" value={f.sshia_lives} onChange={set("sshia_lives")} />
        </CardContent>
      </Card>
    </MonthlyFormShell>
  );
}
