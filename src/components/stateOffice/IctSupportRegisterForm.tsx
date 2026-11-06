import * as React from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { SubmitConfirmModal, useReportingOfficerSubmitConfirm } from "@/src/components/SubmitConfirmModal";
import { stateOfficeApi } from "@/lib/api";
import PageLayout from "../PageLayout";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import { useStateOfficeHeader } from "./shared/useStateOfficeHeader";
import { Field, SelectField, TextArea, TextInput } from "./adminHr/ui";
import {
  ICT_SUPPORT_CATEGORIES,
  ICT_NETWORK_ISSUES,
  ICT_HELPDESK_ISSUES,
  ICT_PRIORITIES,
  ICT_RESOLUTION_STATUSES,
  ICT_YES_NO,
  ICT_REFERRED_TO,
} from "./constants";

const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";

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
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const header = useStateOfficeHeader(defaultZoneId, defaultStateId);
  const [form, setForm] = React.useState<FormState>(blank());
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

  const handleSubmit = async () => {
    if (!validatePeriod()) return;
    if (!validateSupport()) return;
    if (!validateResolution()) return;
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

  return (
    <>
      <PageLayout
        title="ICT Support Register"
        onBack={onBack}
        maxWidth="full"
        variant="fluid"
        contentClassName="px-3 md:px-4 py-3"
      >
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible">
            <CardContent className="p-4 md:p-5 space-y-5">
              <ReportBasicInfo
                zones={header.zones}
                states={header.states}
                zoneId={header.zoneId}
                setZoneId={header.setZoneId}
                stateId={header.stateId}
                setStateId={header.setStateId}
                reportYear={header.reportYear}
                setReportYear={header.setReportYear}
                reportMonth={header.reportMonth}
                setReportMonth={header.setReportMonth}
                submitDate={header.submitDate}
                setSubmitDate={header.setSubmitDate}
                lockZone={header.lockZone}
                lockState={header.lockState}
                showQuarter
                embedded
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Date reported">
                  <TextInput type="date" value={form.date_reported} onChange={(e) => set("date_reported", e.target.value)} />
                </Field>
                <Field label="Reported by" required>
                  <TextInput value={form.reported_by} onChange={(e) => set("reported_by", e.target.value)} placeholder="Name of reporter" />
                </Field>
                <Field label="Support category" required>
                  <SelectField
                    value={form.support_category}
                    options={ICT_SUPPORT_CATEGORIES}
                    placeholder="Select category"
                    onChange={(val) => setForm((v) => ({ ...v, support_category: val, issue_type: "", issue_type_other: "" }))}
                  />
                </Field>
                <Field label="Issue type" required>
                  <SelectField
                    value={form.issue_type}
                    options={issueOptions}
                    placeholder="Select issue"
                    onChange={(val) => setForm((v) => ({ ...v, issue_type: val, issue_type_other: val === "other" ? v.issue_type_other : "" }))}
                  />
                </Field>
                {form.issue_type === "other" && (
                  <Field label="Specify issue type" required>
                    <TextInput value={form.issue_type_other} onChange={(e) => set("issue_type_other", e.target.value)} placeholder="Specify the issue type" />
                  </Field>
                )}
                <Field label="Priority" required>
                  <SelectField value={form.priority} onChange={(val) => set("priority", val)} options={ICT_PRIORITIES} placeholder="Select priority" />
                </Field>
                <Field label="Date resolved">
                  <TextInput type="date" value={form.date_resolved} onChange={(e) => set("date_resolved", e.target.value)} />
                </Field>
                <Field label="Status">
                  <SelectField value={form.resolution_status} onChange={(val) => set("resolution_status", val)} options={ICT_RESOLUTION_STATUSES} placeholder="Select status" />
                </Field>
                <Field label="External support required">
                  <SelectField value={form.external_support_required} onChange={(val) => set("external_support_required", val)} options={ICT_YES_NO} placeholder="Select" />
                </Field>
                <Field label="Referred to">
                  <SelectField
                    value={form.referred_to}
                    options={ICT_REFERRED_TO}
                    placeholder="Select"
                    onChange={(val) => setForm((v) => ({ ...v, referred_to: val, referred_to_other: val === "other" ? v.referred_to_other : "" }))}
                  />
                </Field>
                {form.referred_to === "other" && (
                  <Field label="Specify referral" required>
                    <TextInput value={form.referred_to_other} onChange={(e) => set("referred_to_other", e.target.value)} placeholder="Specify who it was referred to" />
                  </Field>
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Action taken">
                    <TextInput value={form.action_taken} onChange={(e) => set("action_taken", e.target.value)} placeholder="What was done to resolve the issue" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Description of issue">
                    <TextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the issue" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Remarks">
                    <TextArea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Optional remarks" />
                  </Field>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
                <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => submitConfirm.requestSubmit(handleSubmit)}
                  disabled={submitting}
                  className={ACTION}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><Send className="w-4 h-4" /> Submit</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PageLayout>
      <SubmitConfirmModal
        open={submitConfirm.open}
        busy={submitConfirm.busy}
        onConfirm={submitConfirm.confirm}
        onCancel={submitConfirm.cancel}
      />
    </>
  );
}
