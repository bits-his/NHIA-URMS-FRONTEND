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
  ICT_SUPPORT_CATEGORIES,
  ICT_NETWORK_ISSUES,
  ICT_HELPDESK_ISSUES,
  ICT_PRIORITIES,
  ICT_RESOLUTION_STATUSES,
  ICT_YES_NO,
  ICT_REFERRED_TO,
  labelOf,
} from "./constants";

const STEPS = [
  { key: "period", label: "Period" },
  { key: "support", label: "Support Details" },
  { key: "resolution", label: "Resolution & Closure" },
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
  support_id: string;
  date_reported: string;
  reported_by: string;
  support_category: string;
  issue_type: string;
  issue_type_other: string;
  description: string;
  priority: string;
  date_resolved: string;
  resolution_status: string;
  action_taken: string;
  external_support_required: string;
  referred_to: string;
  referred_to_other: string;
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
  support_id: "SUP-0001",
  date_reported: new Date().toISOString().slice(0, 10),
  reported_by: "",
  support_category: "",
  issue_type: "",
  issue_type_other: "",
  description: "",
  priority: "",
  date_resolved: "",
  resolution_status: "",
  action_taken: "",
  external_support_required: "",
  referred_to: "",
  referred_to_other: "",
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

export default function IctSupportRegisterForm({ reportId, onBack, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const header = useStateOfficeHeader(defaultZoneId, defaultStateId);
  const [form, setForm] = React.useState<FormState>(blank());
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(!!reportId);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(reportId ?? null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const issueOptions = form.support_category === "helpdesk"
    ? ICT_HELPDESK_ISSUES
    : form.support_category === "network_infrastructure"
      ? ICT_NETWORK_ISSUES
      : [];

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
        const res = await stateOfficeApi["ict-support-register"].get(reportId);
        if (cancelled) return;
        const v = res.data;
        setSavedId(v.id);
        header.applyHeader(v);
        const l = (v.lines ?? [])[0];
        if (l) {
          const cat = l.support_category ?? "";
          const issueOpts = cat === "helpdesk" ? ICT_HELPDESK_ISSUES : ICT_NETWORK_ISSUES;
          const issue = resolveSelectValue(l.issue_type ?? "", issueOpts);
          const referred = resolveSelectValue(l.referred_to ?? "", ICT_REFERRED_TO);
          setForm({
            support_id: l.support_id || "SUP-0001",
            date_reported: l.date_reported ? String(l.date_reported).slice(0, 10) : "",
            reported_by: l.reported_by ?? "",
            support_category: cat,
            issue_type: issue.value,
            issue_type_other: issue.other,
            description: l.description ?? "",
            priority: l.priority ?? "",
            date_resolved: l.date_resolved ? String(l.date_resolved).slice(0, 10) : "",
            resolution_status: l.resolution_status ?? "",
            action_taken: l.action_taken ?? "",
            external_support_required: l.external_support_required ?? "",
            referred_to: referred.value,
            referred_to_other: referred.other,
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

  const validateSupport = () => {
    if (!form.reported_by.trim()) { toast.error("Enter who reported the issue"); return false; }
    if (!form.support_category) { toast.error("Select a support category"); return false; }
    if (!form.issue_type) { toast.error("Select an issue type"); return false; }
    if (form.issue_type === "other" && !form.issue_type_other.trim()) {
      toast.error("Please specify the issue type");
      return false;
    }
    if (!form.priority) { toast.error("Select a priority"); return false; }
    return true;
  };

  const validateResolution = () => {
    if (form.referred_to === "other" && !form.referred_to_other.trim()) {
      toast.error("Please specify who it was referred to");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validatePeriod()) return;
    if (step === 1 && !validateSupport()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!validatePeriod()) { setStep(0); return; }
    if (!validateSupport()) { setStep(1); return; }
    if (!validateResolution()) { setStep(2); return; }
    setSubmitting(true);
    try {
      const { issue_type_other, referred_to_other, ...rest } = form;
      const payload = {
        ...header.headerPayload("submitted"),
        lines: [{
          ...rest,
          support_id: form.support_id || "SUP-0001",
          issue_type: form.issue_type === "other" ? issue_type_other.trim() : form.issue_type,
          referred_to: form.referred_to === "other" ? referred_to_other.trim() : form.referred_to,
        }],
      };
      if (savedId) {
        await stateOfficeApi["ict-support-register"].update(savedId, payload);
      } else {
        await stateOfficeApi["ict-support-register"].create(payload);
      }
      toast.success("ICT support register submitted");
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
          <h2 className="text-xl font-bold tracking-tight">ICT Support Register</h2>
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
                        <Label className="text-xs text-slate-500">Date Reported</Label>
                        <Input
                          type="date"
                          value={form.date_reported}
                          onChange={(e) => set("date_reported", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Reported By *</Label>
                        <Input
                          value={form.reported_by}
                          onChange={(e) => set("reported_by", e.target.value)}
                          placeholder="Name of reporter"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Support Category *</Label>
                        <Select
                          value={form.support_category}
                          onValueChange={(val) => setForm((v) => ({
                            ...v,
                            support_category: val,
                            issue_type: "",
                            issue_type_other: "",
                          }))}
                        >
                          <SelectTrigger displayValue={labelOf(ICT_SUPPORT_CATEGORIES, form.support_category, "Select category")}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICT_SUPPORT_CATEGORIES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Issue Type *</Label>
                        <Select
                          value={form.issue_type}
                          onValueChange={(val) => setForm((v) => ({
                            ...v,
                            issue_type: val,
                            issue_type_other: val === "other" ? v.issue_type_other : "",
                          }))}
                          disabled={!form.support_category}
                        >
                          <SelectTrigger displayValue={labelOf(issueOptions, form.issue_type, "Select issue")}>
                            <SelectValue placeholder="Select issue" />
                          </SelectTrigger>
                          <SelectContent>
                            {issueOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.issue_type === "other" ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Please Specify *</Label>
                            <Input
                              value={form.issue_type_other}
                              onChange={(e) => set("issue_type_other", e.target.value)}
                              placeholder="Specify the issue type"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Priority *</Label>
                            <Select value={form.priority} onValueChange={(val) => set("priority", val)}>
                              <SelectTrigger displayValue={labelOf(ICT_PRIORITIES, form.priority, "Select priority")}>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                {ICT_PRIORITIES.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-slate-500">Priority *</Label>
                          <Select value={form.priority} onValueChange={(val) => set("priority", val)}>
                            <SelectTrigger displayValue={labelOf(ICT_PRIORITIES, form.priority, "Select priority")}>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {ICT_PRIORITIES.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Description of Issue</Label>
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          placeholder="Describe the issue…"
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Date Resolved</Label>
                        <Input
                          type="date"
                          value={form.date_resolved}
                          onChange={(e) => set("date_resolved", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Status</Label>
                        <Select value={form.resolution_status} onValueChange={(val) => set("resolution_status", val)}>
                          <SelectTrigger displayValue={labelOf(ICT_RESOLUTION_STATUSES, form.resolution_status, "Select status")}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICT_RESOLUTION_STATUSES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">External Support Required</Label>
                        <Select
                          value={form.external_support_required}
                          onValueChange={(val) => set("external_support_required", val)}
                        >
                          <SelectTrigger displayValue={labelOf(ICT_YES_NO, form.external_support_required, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICT_YES_NO.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Referred To</Label>
                        <Select
                          value={form.referred_to}
                          onValueChange={(val) => setForm((v) => ({
                            ...v,
                            referred_to: val,
                            referred_to_other: val === "other" ? v.referred_to_other : "",
                          }))}
                        >
                          <SelectTrigger displayValue={labelOf(ICT_REFERRED_TO, form.referred_to, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICT_REFERRED_TO.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.referred_to === "other" ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Please Specify *</Label>
                            <Input
                              value={form.referred_to_other}
                              onChange={(e) => set("referred_to_other", e.target.value)}
                              placeholder="Specify who it was referred to"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Action Taken</Label>
                            <Input
                              value={form.action_taken}
                              onChange={(e) => set("action_taken", e.target.value)}
                              placeholder="What was done to resolve the issue"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs text-slate-500">Action Taken</Label>
                          <Input
                            value={form.action_taken}
                            onChange={(e) => set("action_taken", e.target.value)}
                            placeholder="What was done to resolve the issue"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-slate-500">Remarks</Label>
                        <Input
                          value={form.remarks}
                          onChange={(e) => set("remarks", e.target.value)}
                          placeholder="Optional remarks"
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
