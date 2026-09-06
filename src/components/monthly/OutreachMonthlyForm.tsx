import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { monthlyApi } from "@/lib/api";
import MonthlyFormShell from "./MonthlyFormShell";
import { currentReportingYear } from "./reportingYears";

// Enrollment Enquiries & Outreach Officer section
// Covers: Stakeholder meetings, Media appearances, Marketing/Sensitization
// Enrolment scheme figures are in ProgrammesMonthlyForm

interface Props { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null; onSubmitted?: () => void; yearOptions?: string[]; }
const n = (v: string) => v === "" ? null : Number(v);

export default function OutreachMonthlyForm({ onBack, defaultZoneId, defaultStateId, onSubmitted, yearOptions }: Props) {
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [year,    setYear]    = React.useState(currentReportingYear());
  const [month,   setMonth]   = React.useState("");
  const [refId,   setRefId]   = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [isSaving,     setIsSaving]     = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [f, setF] = React.useState({
    marketing_sensitization: "", stakeholder_meetings: "", media_appearances: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!stateId || !year || !month) { toast.error("Select Zone, State, Year and Month."); return false; }
    return true;
  };

  const buildPayload = (status: string) => ({
    state_id: Number(stateId), reporting_year: Number(year), reporting_month: Number(month),
    marketing_sensitization: n(f.marketing_sensitization),
    stakeholder_meetings:    n(f.stakeholder_meetings),
    media_appearances:       n(f.media_appearances),
    submitted_by: `Outreach — State ${stateId}`, status, section: "outreach",
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
    <MonthlyFormShell title="Enrollment Enquiries & Outreach Monthly Report" dept="Programmes — Outreach"
      refId={refId} stateId={stateId} setStateId={setStateId}
      year={year} setYear={setYear} month={month} setMonth={setMonth}
      onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} yearOptions={yearOptions} onSave={handleSave} onSubmit={handleSubmit}
      isSaving={isSaving} isSubmitting={isSubmitting}>

      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Marketing, Advocacy & Outreach</CardTitle>
          <CardDescription className="text-xs">Activities conducted during the selected month</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>Marketing / Advocacy / Sensitization Events</Label>
            <Input type="number" min="0" placeholder="0" value={f.marketing_sensitization} onChange={set("marketing_sensitization")} />
          </div>
          <div className="space-y-2">
            <Label>Stakeholder Meetings Conducted</Label>
            <Input type="number" min="0" placeholder="0" value={f.stakeholder_meetings} onChange={set("stakeholder_meetings")} />
          </div>
          <div className="space-y-2">
            <Label>Media Appearances / Parley</Label>
            <Input type="number" min="0" placeholder="0" value={f.media_appearances} onChange={set("media_appearances")} />
          </div>
        </CardContent>
      </Card>

      {/* Live total */}
      {(f.marketing_sensitization || f.stakeholder_meetings || f.media_appearances) && (
        <div className="flex gap-6 p-4 bg-[#f0fdf7] rounded-xl border border-[#d4e8dc] text-sm">
          <span>Sensitization: <strong className="text-slate-800">{Number(f.marketing_sensitization || 0)}</strong></span>
          <span>Stakeholder Meetings: <strong className="text-slate-800">{Number(f.stakeholder_meetings || 0)}</strong></span>
          <span>Media: <strong className="text-slate-800">{Number(f.media_appearances || 0)}</strong></span>
          <span>Total Activities: <strong className="text-primary">
            {Number(f.marketing_sensitization || 0) + Number(f.stakeholder_meetings || 0) + Number(f.media_appearances || 0)}
          </strong></span>
        </div>
      )}
    </MonthlyFormShell>
  );
}
