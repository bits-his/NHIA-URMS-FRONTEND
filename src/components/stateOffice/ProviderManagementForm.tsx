import * as React from "react";
import {
  Award, Building2, ClipboardCheck, Loader2, RefreshCw,
  Save, Send, Stethoscope, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
import StateOfficeFormShell from "./StateOfficeFormShell";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import { stateOfficeApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseSupportingDocuments } from "./constants";
import { PROVIDER_MANAGEMENT_NAV_TITLE } from "./enrolmentPillarTypes";
import {
  PROVIDER_ACTIVITY_STATUSES,
  PROVIDER_FORM_TYPES,
  PROVIDER_FUNDED_OPTIONS,
  PROVIDER_FUNDING_OPTIONS,
  PROVIDER_RELATED_PROGRAMMES,
  PROVIDER_REPORT_STATUS_LABELS,
  coverageRates,
  formMeta,
  providerFormIsReady,
  providerLinkedMetricLabel,
  providerManualMetrics,
  type ProviderFormKey,
} from "./providerManagementTypes";

const inputClass = "h-11 text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20";

const PROVIDER_ACTIVITY_ICONS: Record<ProviderFormKey, LucideIcon> = {
  accreditation: Award,
  reaccreditation: RefreshCw,
  "qa-inspections": ClipboardCheck,
  "medical-audits": Stethoscope,
  empanelment: Building2,
};

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const uid = () => Math.random().toString(36).slice(2);
const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));
type SavedDoc = { name: string; path: string };

type Entry = {
  provider_management_id: string;
  form_type: ProviderFormKey;
  engagement_category: string;
  engagement_code: string;
  related_programme: string;
  bhcpf_activity_type: string;
  total_facilities_in_state: string;
  facilities_planned: string;
  activity_date: string;
  facilities_covered: string;
  funding_option: string;
  activity_budget: string;
  approved_amount: string;
  activity_status: string;
  remarks: string;
  metrics: Record<string, string>;
  supporting_documents: SavedDoc[];
  supportingFiles: File[];
};

const blank = (formKey: ProviderFormKey): Entry => {
  const meta = formMeta(formKey);
  return {
    provider_management_id: "",
    form_type: formKey,
    engagement_category: meta.activity,
    engagement_code: meta.code,
    related_programme: "",
    bhcpf_activity_type: "",
    total_facilities_in_state: "",
    facilities_planned: "",
    activity_date: "",
    facilities_covered: "",
    funding_option: "",
    activity_budget: "",
    approved_amount: "",
    activity_status: "",
    remarks: "",
    metrics: {},
    supporting_documents: [],
    supportingFiles: [],
  };
};

interface Props {
  reportId?: number | string | null;
  initialFormKey?: ProviderFormKey;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onPersisted?: (saved: { id: number | string; status: string; reference_id?: string }) => void;
  /** Keep parent list tab in sync when switching form type. */
  onFormTypeChange?: (key: ProviderFormKey) => void;
}

export default function ProviderManagementForm({
  reportId, initialFormKey = "accreditation", onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, onPersisted, onFormTypeChange,
}: Props) {
  const [formKey, setFormKey] = React.useState<ProviderFormKey>(initialFormKey);
  const api = stateOfficeApi.providerManagement;
  const [reportStatus, setReportStatus] = React.useState<string>("draft");
  const [lineKey, setLineKey] = React.useState(() => uid());
  const [entry, setEntry] = React.useState<Entry>(() => blank(initialFormKey));
  const entryRef = React.useRef(entry);
  entryRef.current = entry;
  const [pmSeq, setPmSeq] = React.useState(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typeLocked = !!reportId;

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const selectActivity = (key: ProviderFormKey) => {
    if (key === formKey) return;
    // Parent remounts create forms / returns to list for saved reports.
    if (onFormTypeChange) {
      onFormTypeChange(key);
      return;
    }
    if (typeLocked) {
      toast.error("Form type cannot be changed for a saved report");
      return;
    }
    setFormKey(key);
    setEntry(blank(key));
    setLineKey(uid());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isFunded = PROVIDER_FUNDED_OPTIONS.has(entry.funding_option);
  // Accreditation vs Reaccreditation tabs already imply BHCPF activity type.
  const bhcpfType = formKey === "reaccreditation"
    ? "Reaccreditation"
    : formKey === "accreditation"
      ? "Accreditation"
      : "";
  const manualMetrics = providerManualMetrics({
    formKey,
    programme: entry.related_programme,
    bhcpfType,
  });
  const linkedLabel = providerLinkedMetricLabel({
    formKey,
    programme: entry.related_programme,
    bhcpfType,
  });
  const covered = Number(entry.facilities_covered) || 0;
  const planned = Number(entry.facilities_planned) || 0;
  const totalState = Number(entry.total_facilities_in_state) || 0;
  const rates = coverageRates(totalState, planned, covered);

  const nextPmId = React.useCallback((seq: number) => {
    const year = new Date().getFullYear();
    return `PM-${year}-${String(seq).padStart(4, "0")}`;
  }, []);

  const rowToEntry = (fk: ProviderFormKey, row: any, fallbackId: string): Entry => {
    const t = row.activity_template;
    const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
    const merged = { ...tpl, ...row };
    if (tpl.metrics && !row.metrics) merged.metrics = tpl.metrics;
    const id = String(
      merged.provider_management_id || merged.reference_id || merged.id || row.id || fallbackId || "",
    );
    const metricsRaw = merged.metrics && typeof merged.metrics === "object" ? merged.metrics : {};
    const docs = parseSupportingDocuments(merged.supporting_documents ?? []).filter((d) => d.path) as SavedDoc[];
    return {
      ...blank(fk),
      provider_management_id: id,
      form_type: (merged.form_type || fk) as ProviderFormKey,
      engagement_category: merged.engagement_category || formMeta(fk).activity,
      engagement_code: merged.engagement_code || formMeta(fk).code,
      related_programme: merged.related_programme
        || (Array.isArray(merged.programs_supported) ? merged.programs_supported[0] : "")
        || "",
      bhcpf_activity_type: merged.bhcpf_activity_type || "",
      total_facilities_in_state: numStr(merged.total_facilities_in_state),
      facilities_planned: numStr(merged.facilities_planned ?? merged.planned_target_stakeholders),
      activity_date: merged.activity_date ? String(merged.activity_date).slice(0, 10) : "",
      facilities_covered: numStr(merged.facilities_covered ?? merged.stakeholders_engaged),
      funding_option: merged.funding_option || "",
      activity_budget: numStr(merged.activity_budget),
      approved_amount: numStr(merged.approved_amount),
      activity_status: merged.activity_status || "",
      remarks: merged.remarks || "",
      metrics: Object.fromEntries(Object.entries(metricsRaw).map(([k, val]) => [k, String(val ?? "")])),
      supporting_documents: docs,
      supportingFiles: [],
    };
  };

  const loadData = (v: any) => {
    const status = v.status || "draft";
    setReportStatus(status);
    const mod = String(v.form_type || v.activity_module || "accreditation");
    const matched = PROVIDER_FORM_TYPES.find((f) => f.key === mod);
    const fk = (matched?.key || "accreditation") as ProviderFormKey;
    setFormKey(fk);
    const first = (v.lines ?? [])[0];
    let maxSeq = 0;
    for (const row of v.lines ?? []) {
      const id = String(row.provider_management_id || row.reference_id || row.id || "");
      const m = id.match(/(?:PM|PACC|PREC|PQA|PMED|PEMP)-\d+-(\d+)/i);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
    }
    setPmSeq(Math.max(maxSeq + 1, 1));
    setLineKey(uid());
    setEntry(first ? rowToEntry(fk, first, nextPmId(Math.max(maxSeq, 1))) : blank(fk));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateActivity = (e: Entry = entryRef.current): string | null => {
    if (!e.related_programme) return "Select Related Programme";
    if (!e.activity_date) return "Enter the activity date";
    if (!e.activity_status) return "Select the activity status";
    if (e.total_facilities_in_state === "") return "Enter total facilities in the state";
    if (e.facilities_planned === "") return "Enter facilities planned this period";
    if (e.facilities_covered === "") return "Enter facilities covered from this plan's period";
    return null;
  };

  const entryToLine = (e: Entry = entryRef.current): Entry => {
    let seq = pmSeq;
    let pmId = e.provider_management_id;
    if (!pmId) {
      pmId = nextPmId(seq);
      seq += 1;
      setPmSeq(seq);
    }
    const derivedBhcpfType = formKey === "reaccreditation"
      ? "Reaccreditation"
      : formKey === "accreditation"
        ? "Accreditation"
        : "";
    const metricLabels = providerManualMetrics({
      formKey,
      programme: e.related_programme,
      bhcpfType: derivedBhcpfType,
    });
    const metricMap: Record<string, string> = {};
    for (const label of metricLabels) {
      metricMap[label] = e.metrics[label] ?? "";
    }
    const funded = PROVIDER_FUNDED_OPTIONS.has(e.funding_option);
    return {
      ...e,
      provider_management_id: pmId,
      form_type: formKey,
      engagement_category: formMeta(formKey).activity,
      engagement_code: formMeta(formKey).code,
      metrics: metricMap,
      ...(funded ? {} : { activity_budget: "", approved_amount: "" }),
      bhcpf_activity_type: e.related_programme === "BHCPF" ? derivedBhcpfType : "",
    };
  };

  const afterPersist = async ({ id }: { id: number | string }) => {
    const line = entryToLine();
    if (!line.supportingFiles.length) return;
    const res = await api.get(id);
    const saved: any[] = res.data?.lines ?? [];
    const match = saved.find((s) => {
      const t = s.activity_template;
      const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
      return String(tpl.provider_management_id || s.id || "") === line.provider_management_id
        || ((String(tpl.activity_date ?? s.activity_date ?? "").slice(0, 10) === line.activity_date
          && (tpl.engagement_category || s.engagement_category) === line.engagement_category));
    }) ?? saved[0];
    if (!match) return;
    await api.uploadLineFiles(id, String(match.id ?? match.reference_id), line.supportingFiles);
  };

  /** Editable only while drafting or after coordinator return — not while awaiting review / endorsed. */
  const canEdit = ["draft", "returned"].includes(reportStatus) || !reportId;
  const canSendReview = ["draft", "returned"].includes(reportStatus) || (!reportId && reportStatus === "draft");
  const canSubmit = reportStatus === "endorsed";
  const isLockedReview = ["awaiting_review", "submitted", "approved"].includes(reportStatus);

  const formTabs = (
    <UnderHeaderNavTabs
      tabs={PROVIDER_FORM_TYPES.filter((f) => providerFormIsReady(f.key)).map((f) => ({
        id: f.key,
        label: f.tabLabel,
        icon: PROVIDER_ACTIVITY_ICONS[f.key],
      }))}
      activeTab={formKey}
      onChange={(key) => selectActivity(key as ProviderFormKey)}
      ariaLabel="Provider activities"
    />
  );

  return (
    <StateOfficeFormShell
      reportType="provider-management"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={`${PROVIDER_MANAGEMENT_NAV_TITLE} - ${formMeta(formKey).label}`}
      hideFooterActions
      hideBasicInfo
      showQuarter
      deferStateUntilReview
      headerTabs={formTabs}
      onLoaded={loadData}
      afterPersist={afterPersist}
      onPersisted={onPersisted}
      validate={(status) => {
        if (status === "draft" || status === "returned") return null;
        return validateActivity(entryRef.current);
      }}
      buildPayload={(base) => {
        const l = entryToLine(entryRef.current);
        return {
          ...base,
          activity_module: formKey,
          form_type: formKey,
          planned_activities: 1,
          lines: [{
            id: l.provider_management_id?.match(/^(PACC|PREC|PQA|PMED|PEMP)-/i)
              ? l.provider_management_id
              : undefined,
            provider_management_id: l.provider_management_id,
            form_type: l.form_type || formKey,
            engagement_code: l.engagement_code,
            engagement_category: l.engagement_category,
            related_programme: l.related_programme,
            bhcpf_activity_type: l.bhcpf_activity_type || null,
            total_facilities_in_state: numOrNull(l.total_facilities_in_state),
            facilities_planned: numOrNull(l.facilities_planned),
            activity_date: l.activity_date || null,
            facilities_covered: numOrNull(l.facilities_covered),
            funding_option: l.funding_option || null,
            activity_budget: numOrNull(l.activity_budget),
            approved_amount: numOrNull(l.approved_amount),
            activity_status: l.activity_status || null,
            remarks: l.remarks || null,
            metrics: l.metrics,
            supporting_documents: l.supporting_documents,
            planned_target_stakeholders: numOrNull(l.facilities_planned),
            stakeholders_engaged: numOrNull(l.facilities_covered),
            programs_supported: l.related_programme ? [l.related_programme] : [],
          }],
        };
      }}
    >
      {({ saving, submitting, persist, requestSubmit, header }) => {
        const footer = (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#e8f3ec]">
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={saving || submitting}
                  onClick={() => void persist(reportStatus === "returned" ? "returned" : "draft").then(() => {
                    setReportStatus(reportStatus === "returned" ? "returned" : "draft");
                  })}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </Button>
                {canSendReview && (
                  <Button
                    className="bg-orange-action hover:bg-orange-600 gap-2"
                    disabled={saving || submitting}
                    onClick={() => requestSubmit(
                      () => void persist("awaiting_review").then(() => setReportStatus("awaiting_review")),
                      {
                        force: true,
                        title: "Send for coordinator review?",
                        description:
                          "This will lock editing and send the report to the State Coordinator for endorsement. Continue?",
                        confirmLabel: "Yes, send for review",
                      },
                    )}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      : <><Send className="w-4 h-4" /> Send for Review</>}
                  </Button>
                )}
              </>
            )}
            {canSubmit && (
              <Button
                className="bg-[#0f3d2e] hover:bg-[#145c3f] gap-2"
                disabled={saving || submitting}
                onClick={() => requestSubmit(
                  () => void persist("submitted").then(() => setReportStatus("submitted")),
                  {
                    force: true,
                    title: "Confirm final submission",
                    description:
                      "This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
                    confirmLabel: "Yes, final submit",
                  },
                )}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Final Submit</>}
              </Button>
            )}
            {!canEdit && !canSubmit && (
              <p className="text-xs text-slate-500">
                This report is {PROVIDER_REPORT_STATUS_LABELS[reportStatus] || reportStatus}.
                {isLockedReview
                  ? " Editing is locked while it is with the coordinator or after submission."
                  : " Editing is locked."}
              </p>
            )}
            {canSubmit && (
              <p className="text-xs text-slate-500 w-full text-right">
                Endorsed by the State Coordinator — make the final submission to complete.
              </p>
            )}
          </div>
        );

        return (
        <div className="m-0 space-y-3 pb-2">
          <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible m-0">
            <CardContent className="p-3 md:p-4 space-y-4">
              <ReportBasicInfo {...header} showQuarter embedded />

              <fieldset disabled={!canEdit} className="border-t border-[#e8f3ec] pt-4 space-y-5 disabled:opacity-90">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Related Programme <span className="text-rose-500">*</span></Label>
                      <Select
                        value={entry.related_programme}
                        onValueChange={(v) => setEntry((p) => ({
                          ...p,
                          related_programme: v,
                          bhcpf_activity_type: "",
                          metrics: {},
                        }))}
                      >
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {PROVIDER_RELATED_PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {manualMetrics.map((label) => (
                      <div key={label} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 leading-tight">{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={entry.metrics[label] ?? ""}
                          onChange={(e) => setEntry((p) => ({
                            ...p,
                            metrics: { ...p.metrics, [label]: e.target.value },
                          }))}
                        />
                      </div>
                    ))}
                    {linkedLabel && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 leading-tight">{linkedLabel}</Label>
                        <Input value={String(covered)} readOnly className={cn(inputClass, "bg-slate-50 opacity-90")} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Total Facilities in State <span className="text-rose-500">*</span></Label>
                      <Input type="number" min={0} className={inputClass} value={entry.total_facilities_in_state}
                        onChange={(e) => set("total_facilities_in_state", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Number of Facilities Planned this Period <span className="text-rose-500">*</span></Label>
                      <Input type="number" min={0} className={inputClass} value={entry.facilities_planned}
                        onChange={(e) => set("facilities_planned", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Activity Date <span className="text-rose-500">*</span></Label>
                      <Input type="date" className={inputClass} value={entry.activity_date}
                        onChange={(e) => set("activity_date", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Facilities Covered from This Plan&apos;s Period <span className="text-rose-500">*</span></Label>
                      <Input type="number" min={0} className={inputClass} value={entry.facilities_covered}
                        onChange={(e) => set("facilities_covered", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Funding Option</Label>
                      <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {PROVIDER_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {isFunded && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Activity Budget (₦)</Label>
                          <Input type="number" min={0} className={inputClass} value={entry.activity_budget}
                            onChange={(e) => set("activity_budget", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Approved Amount (₦)</Label>
                          <Input type="number" min={0} className={inputClass} value={entry.approved_amount}
                            onChange={(e) => set("approved_amount", e.target.value)} />
                        </div>
                      </>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Activity Status <span className="text-rose-500">*</span></Label>
                      <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {PROVIDER_ACTIVITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                      <Label className="text-xs font-semibold text-slate-600">Supporting Evidence</Label>
                      <Input ref={fileInputRef} type="file" multiple
                        onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))} />
                      {entry.supporting_documents.length > 0 && (
                        <p className="text-xs text-slate-500">Saved: {entry.supporting_documents.map((d) => d.name).join(", ")}</p>
                      )}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs font-semibold text-slate-600">Remarks</Label>
                      <Textarea rows={2} value={entry.remarks}
                        onChange={(e) => set("remarks", e.target.value)} />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 grid sm:grid-cols-2 gap-3 text-sm rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] p-3">
                      <div>
                        <p className="text-[11px] uppercase text-slate-400 font-semibold">Period Coverage Rate</p>
                        <p className="font-semibold tabular-nums">{rates.periodCoverage != null ? `${rates.periodCoverage}%` : "—"}</p>
                        <p className="text-[11px] text-slate-500">Covered ÷ total state facilities × 100</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400 font-semibold">Plan Achievement Rate</p>
                        <p className="font-semibold tabular-nums">{rates.planAchievement != null ? `${rates.planAchievement}%` : "—"}</p>
                        <p className="text-[11px] text-slate-500">Covered ÷ facilities planned × 100</p>
                      </div>
                    </div>
                  </div>
                </fieldset>

              {footer}
            </CardContent>
          </Card>
        </div>
        );
      }}
    </StateOfficeFormShell>
  );
}
