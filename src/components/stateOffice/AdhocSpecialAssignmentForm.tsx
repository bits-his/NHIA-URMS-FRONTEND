import * as React from "react";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeHeader } from "./shared/useStateOfficeHeader";
import {
  MONTHS,
  monthLabel,
  quarterFromMonth,
  ADHOC_ASSIGNMENT_STATUSES,
  ADHOC_SUPPORT_REQUIRED,
  ADHOC_RESPONSIBLE_UNITS,
  labelOf,
} from "./constants";

const STEPS = [
  { key: "period", label: "Period" },
  { key: "assignment", label: "Assignment Details" },
  { key: "completion", label: "Completion & Outcomes" },
] as const;

const QUARTERS = [
  { value: "1", label: "Q1" },
  { value: "2", label: "Q2" },
  { value: "3", label: "Q3" },
  { value: "4", label: "Q4" },
];

const YEARS = Array.from({ length: 8 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

interface FormState {
  assignment_id: string;
  date_assigned: string;
  assignment_title: string;
  assigned_by: string;
  assignment_description: string;
  expected_output: string;
  responsible_unit: string;
  responsible_unit_other: string;
  supporting_staff: string;
  due_date: string;
  assignment_status: string;
  date_completed: string;
  output_achieved: string;
  challenges: string;
  support_required: string;
  support_required_other: string;
  evidence: string;
  remarks: string;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const blank = (): FormState => ({
  assignment_id: "ASG-0001",
  date_assigned: new Date().toISOString().slice(0, 10),
  assignment_title: "",
  assigned_by: "",
  assignment_description: "",
  expected_output: "",
  responsible_unit: "",
  responsible_unit_other: "",
  supporting_staff: "",
  due_date: "",
  assignment_status: "",
  date_completed: "",
  output_achieved: "",
  challenges: "",
  support_required: "",
  support_required_other: "",
  evidence: "",
  remarks: "",
});

function resolveSelectValue(
  stored: string,
  options: { value: string; label: string }[],
): { value: string; other: string } {
  if (!stored) return { value: "", other: "" };
  if (options.some((o) => o.value === stored)) return { value: stored, other: "" };
  return { value: "other", other: stored };
}

export default function AdhocSpecialAssignmentForm({ reportId, onBack, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const header = useStateOfficeHeader(defaultZoneId, defaultStateId);
  const [form, setForm] = React.useState<FormState>(blank());
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(!!reportId);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(reportId ?? null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const quarter = String(quarterFromMonth(header.reportMonth || 1));
  const setQuarter = (q: string) => {
    header.setReportMonth(String((Number(q) - 1) * 3 + 1));
  };

  React.useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["adhoc-special-assignment"].get(reportId);
        if (cancelled) return;
        const v = res.data;
        setSavedId(v.id);
        header.applyHeader(v);
        const l = (v.lines ?? [])[0];
        if (l) {
          const unit = resolveSelectValue(l.responsible_unit ?? "", ADHOC_RESPONSIBLE_UNITS);
          const support = resolveSelectValue(l.support_required ?? "", ADHOC_SUPPORT_REQUIRED);
          setForm({
            assignment_id: l.assignment_id || "ASG-0001",
            date_assigned: l.date_assigned ? String(l.date_assigned).slice(0, 10) : "",
            assignment_title: l.assignment_title ?? "",
            assigned_by: l.assigned_by ?? "",
            assignment_description: l.assignment_description ?? "",
            expected_output: l.expected_output ?? "",
            responsible_unit: unit.value,
            responsible_unit_other: unit.other,
            supporting_staff: l.supporting_staff ?? "",
            due_date: l.due_date ? String(l.due_date).slice(0, 10) : "",
            assignment_status: l.assignment_status ?? "",
            date_completed: l.date_completed ? String(l.date_completed).slice(0, 10) : "",
            output_achieved: l.output_achieved ?? "",
            challenges: l.challenges ?? "",
            support_required: support.value,
            support_required_other: support.other,
            evidence: l.evidence ?? "",
            remarks: l.remarks ?? "",
          });
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const validatePeriod = () => {
    const err = header.validateHeader();
    if (err) { toast.error(err); return false; }
    return true;
  };

  const validateAssignment = () => {
    if (!form.assignment_title.trim()) { toast.error("Enter an assignment title"); return false; }
    if (!form.assigned_by.trim()) { toast.error("Enter who assigned it"); return false; }
    if (!form.assignment_status) { toast.error("Select a status"); return false; }
    if (form.responsible_unit === "other" && !form.responsible_unit_other.trim()) {
      toast.error("Please specify the responsible unit / officer");
      return false;
    }
    return true;
  };

  const validateCompletion = () => {
    if (form.support_required === "other" && !form.support_required_other.trim()) {
      toast.error("Please specify the support required");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validatePeriod()) return;
    if (step === 1 && !validateAssignment()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!validatePeriod()) { setStep(0); return; }
    if (!validateAssignment()) { setStep(1); return; }
    if (!validateCompletion()) { setStep(2); return; }
    setSubmitting(true);
    try {
      const {
        responsible_unit_other,
        support_required_other,
        ...rest
      } = form;
      const payload = {
        ...header.headerPayload("submitted"),
        lines: [{
          ...rest,
          assignment_id: form.assignment_id || "ASG-0001",
          responsible_unit: form.responsible_unit === "other"
            ? responsible_unit_other.trim()
            : form.responsible_unit,
          support_required: form.support_required === "other"
            ? support_required_other.trim()
            : form.support_required,
        }],
      };
      if (savedId) {
        await stateOfficeApi["adhoc-special-assignment"].update(savedId, payload);
      } else {
        await stateOfficeApi["adhoc-special-assignment"].create(payload);
      }
      toast.success("Ad-hoc assignment submitted");
      (onSubmitted ?? onBack)();
    } catch (err: any) {
      toast.error("Submission failed", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  const formActions = (
    <>
      <Button type="button" variant="outline" onClick={goBack}>
        {step === 0 ? "Cancel" : "Back"}
      </Button>
      {isLast ? (
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-2 bg-orange-action hover:bg-orange-600"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            : <><Send className="w-4 h-4" /> Submit</>}
        </Button>
      ) : (
        <Button type="button" onClick={goNext} className="bg-[#145c3f] hover:bg-[#0f3d2e]">
          Next
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-[#e8f5ee]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Ad-hoc / Special Assignment</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 pb-8 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#d4e8dc]">
                    {STEPS.map((s, idx) => {
                      const done = idx < step;
                      const active = idx === step;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => { if (idx <= step) setStep(idx); }}
                          className={`flex items-center gap-2 p-3 text-left transition-colors ${
                            active ? "bg-[#e8f5ee]" : done ? "bg-white hover:bg-[#f8fbf9]" : "bg-white/70"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              done || active
                                ? "bg-[#25a872] text-white"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          <span className={`text-[11px] font-bold leading-tight ${active ? "text-[#145c3f]" : "text-slate-600"}`}>
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
                  <CardTitle className="text-sm font-bold text-[#145c3f]">
                    {STEPS[step].label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  {step === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Zone *</Label>
                        <Select value={header.zoneId} onValueChange={header.setZoneId} disabled={header.lockZone}>
                          <SelectTrigger
                            className={header.lockZone ? "opacity-70 bg-slate-50" : ""}
                            displayValue={labelOf(header.zones.map(z => ({ value: String(z.id), label: z.label })), header.zoneId, "Select zone")}
                          >
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {header.zones.map((z) => (
                              <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">State *</Label>
                        <Select
                          value={header.stateId}
                          onValueChange={header.setStateId}
                          disabled={header.lockState || !header.zoneId}
                        >
                          <SelectTrigger
                            className={header.lockState ? "opacity-70 bg-slate-50" : ""}
                            displayValue={labelOf(header.states.map(s => ({ value: String(s.id), label: s.label })), header.stateId, "Select state")}
                          >
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {header.states.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Year *</Label>
                        <Select value={header.reportYear} onValueChange={header.setReportYear}>
                          <SelectTrigger displayValue={header.reportYear || "Select year"}>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.map((y) => (
                              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Month *</Label>
                        <Select value={header.reportMonth} onValueChange={header.setReportMonth}>
                          <SelectTrigger displayValue={monthLabel(header.reportMonth)}>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Quarter</Label>
                        <Select value={quarter} onValueChange={setQuarter}>
                          <SelectTrigger displayValue={`Q${quarter}`}>
                            <SelectValue placeholder="Select quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            {QUARTERS.map((q) => (
                              <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Date Assigned</Label>
                        <Input
                          type="date"
                          value={form.date_assigned}
                          onChange={(e) => set("date_assigned", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Due Date</Label>
                        <Input
                          type="date"
                          value={form.due_date}
                          onChange={(e) => set("due_date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Assignment Title *</Label>
                        <Input
                          value={form.assignment_title}
                          onChange={(e) => set("assignment_title", e.target.value)}
                          placeholder="Short title"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Assigned By *</Label>
                        <Input
                          value={form.assigned_by}
                          onChange={(e) => set("assigned_by", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Responsible Unit / Officer</Label>
                        <Select
                          value={form.responsible_unit}
                          onValueChange={(val) => setForm((v) => ({
                            ...v,
                            responsible_unit: val,
                            responsible_unit_other: val === "other" ? v.responsible_unit_other : "",
                          }))}
                        >
                          <SelectTrigger displayValue={labelOf(ADHOC_RESPONSIBLE_UNITS, form.responsible_unit, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADHOC_RESPONSIBLE_UNITS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Status *</Label>
                        <Select value={form.assignment_status} onValueChange={(val) => set("assignment_status", val)}>
                          <SelectTrigger displayValue={labelOf(ADHOC_ASSIGNMENT_STATUSES, form.assignment_status, "Select status")}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADHOC_ASSIGNMENT_STATUSES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.responsible_unit === "other" && (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-slate-500">Please Specify *</Label>
                          <Input
                            value={form.responsible_unit_other}
                            onChange={(e) => set("responsible_unit_other", e.target.value)}
                            placeholder="Specify unit / officer"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Supporting Staff / Units</Label>
                        <Input
                          value={form.supporting_staff}
                          onChange={(e) => set("supporting_staff", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Expected Output</Label>
                        <Input
                          value={form.expected_output}
                          onChange={(e) => set("expected_output", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Assignment Description</Label>
                        <textarea
                          rows={2}
                          value={form.assignment_description}
                          onChange={(e) => set("assignment_description", e.target.value)}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Date Completed</Label>
                        <Input
                          type="date"
                          value={form.date_completed}
                          onChange={(e) => set("date_completed", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Support Required</Label>
                        <Select
                          value={form.support_required}
                          onValueChange={(val) => setForm((v) => ({
                            ...v,
                            support_required: val,
                            support_required_other: val === "other" ? v.support_required_other : "",
                          }))}
                        >
                          <SelectTrigger displayValue={labelOf(ADHOC_SUPPORT_REQUIRED, form.support_required, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADHOC_SUPPORT_REQUIRED.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.support_required === "other" ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Please Specify *</Label>
                            <Input
                              value={form.support_required_other}
                              onChange={(e) => set("support_required_other", e.target.value)}
                              placeholder="Specify support required"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Evidence (link / reference)</Label>
                            <Input
                              value={form.evidence}
                              onChange={(e) => set("evidence", e.target.value)}
                              placeholder="Document link or reference"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-slate-500">Evidence (link / reference)</Label>
                          <Input
                            value={form.evidence}
                            onChange={(e) => set("evidence", e.target.value)}
                            placeholder="Document link or reference"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Output / Outcome Achieved</Label>
                        <Input
                          value={form.output_achieved}
                          onChange={(e) => set("output_achieved", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Challenges</Label>
                        <Input
                          value={form.challenges}
                          onChange={(e) => set("challenges", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Remarks</Label>
                        <Input
                          value={form.remarks}
                          onChange={(e) => set("remarks", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-[#d4e8dc] flex flex-wrap items-center justify-end gap-3">
                    {formActions}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
