import * as React from "react";
import { Loader2, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { stateOfficeApi } from "@/lib/api";
import { parseSupportingDocuments } from "./constants";
import { PROVIDER_MANAGEMENT_NAV_TITLE } from "./enrolmentPillarTypes";
import {
  PROVIDER_ACTIVITY_STATUSES,
  PROVIDER_BHCPF_ACTIVITY_TYPES,
  PROVIDER_FORM_TYPES,
  PROVIDER_FUNDED_OPTIONS,
  PROVIDER_FUNDING_OPTIONS,
  PROVIDER_RELATED_PROGRAMMES,
  PROVIDER_REPORT_STATUS_LABELS,
  coverageRates,
  formMeta,
  providerLinkedMetricLabel,
  providerManualMetrics,
  type ProviderFormKey,
} from "./providerManagementTypes";

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
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onPersisted?: (saved: { id: number; status: string; reference_id?: string }) => void;
}

export default function ProviderManagementForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, onPersisted,
}: Props) {
  const api = stateOfficeApi.accreditation;
  const [formKey, setFormKey] = React.useState<ProviderFormKey>("accreditation");
  const [reportStatus, setReportStatus] = React.useState<string>("draft");
  const [reviewNote, setReviewNote] = React.useState<string>("");
  const [reviewedBy, setReviewedBy] = React.useState<string>("");
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const [entry, setEntry] = React.useState<Entry>(() => blank("accreditation"));
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [pmSeq, setPmSeq] = React.useState(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typeLocked = !!reportId;

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const changeForm = (key: ProviderFormKey) => {
    if (typeLocked || lines.length > 0) {
      toast.error("Form type is locked once activities are added or the report is saved");
      return;
    }
    setFormKey(key);
    setEntry(blank(key));
  };

  const isFunded = PROVIDER_FUNDED_OPTIONS.has(entry.funding_option);
  const manualMetrics = providerManualMetrics({
    formKey: entry.form_type,
    programme: entry.related_programme,
    bhcpfType: entry.bhcpf_activity_type,
  });
  const linkedLabel = providerLinkedMetricLabel({
    formKey: entry.form_type,
    programme: entry.related_programme,
    bhcpfType: entry.bhcpf_activity_type,
  });
  const covered = Number(entry.facilities_covered) || 0;
  const planned = Number(entry.facilities_planned) || 0;
  const totalState = Number(entry.total_facilities_in_state) || 0;
  const rates = coverageRates(totalState, planned, covered);

  const nextPmId = React.useCallback((seq: number) => {
    const year = new Date().getFullYear();
    return `PM-${year}-${String(seq).padStart(4, "0")}`;
  }, []);

  const loadData = (v: any) => {
    setReportStatus(v.status || "draft");
    setReviewNote(v.coordinator_review_note || "");
    setReviewedBy(v.coordinator_reviewed_by || "");
    const mod = String(v.activity_module || "accreditation");
    const matched = PROVIDER_FORM_TYPES.find((f) => f.key === mod);
    const fk = (matched?.key || "accreditation") as ProviderFormKey;
    setFormKey(fk);
    const raw: any[] = v.lines ?? [];
    let maxSeq = 0;
    const next = raw.map((row) => {
      const t = row.activity_template;
      const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
      const id = String(tpl.provider_management_id || "");
      const m = id.match(/PM-\d+-(\d+)/i);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
      return { row, tpl, id };
    }).map(({ tpl, id: existingId }) => {
      let id = existingId;
      if (!id) {
        maxSeq += 1;
        id = nextPmId(maxSeq);
      }
      const metricsRaw = tpl.metrics && typeof tpl.metrics === "object" ? tpl.metrics : {};
      return {
        ...blank(fk),
        _key: uid(),
        provider_management_id: id,
        form_type: (tpl.form_type || fk) as ProviderFormKey,
        engagement_category: tpl.engagement_category || formMeta(fk).activity,
        engagement_code: tpl.engagement_code || formMeta(fk).code,
        related_programme: tpl.related_programme || (Array.isArray(tpl.programs_supported) ? tpl.programs_supported[0] : "") || "",
        bhcpf_activity_type: tpl.bhcpf_activity_type || "",
        total_facilities_in_state: numStr(tpl.total_facilities_in_state),
        facilities_planned: numStr(tpl.facilities_planned ?? tpl.planned_target_stakeholders),
        activity_date: tpl.activity_date ? String(tpl.activity_date).slice(0, 10) : "",
        facilities_covered: numStr(tpl.facilities_covered ?? tpl.stakeholders_engaged),
        funding_option: tpl.funding_option || "",
        activity_budget: numStr(tpl.activity_budget),
        approved_amount: numStr(tpl.approved_amount),
        activity_status: tpl.activity_status || "",
        remarks: tpl.remarks || "",
        metrics: Object.fromEntries(Object.entries(metricsRaw).map(([k, val]) => [k, String(val ?? "")])),
        supporting_documents: parseSupportingDocuments(tpl.supporting_documents).filter((d) => d.path) as SavedDoc[],
        supportingFiles: [],
      };
    });
    setPmSeq(Math.max(maxSeq + 1, 1));
    linesRef.current = next;
    setLines(next);
    setEntry(blank(fk));
  };

  const resetEntry = () => {
    setEntry(blank(formKey));
    setEditingKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveLine = (): boolean => {
    if (!entry.related_programme) { toast.error("Select Related Programme"); return false; }
    if (entry.related_programme === "BHCPF" && (entry.form_type === "accreditation" || entry.form_type === "reaccreditation") && !entry.bhcpf_activity_type) {
      toast.error("Select BHCPF activity type (Accreditation or Reaccreditation)");
      return false;
    }
    if (!entry.activity_date) { toast.error("Enter the activity date"); return false; }
    if (!entry.activity_status) { toast.error("Select the activity status"); return false; }
    if (entry.total_facilities_in_state === "") { toast.error("Enter total facilities in the state"); return false; }
    if (entry.facilities_planned === "") { toast.error("Enter facilities planned this period"); return false; }
    if (entry.facilities_covered === "") { toast.error("Enter facilities covered from this plan's period"); return false; }

    let seq = pmSeq;
    let pmId = entry.provider_management_id;
    if (!pmId) {
      pmId = nextPmId(seq);
      seq += 1;
      setPmSeq(seq);
    }

    const metricMap: Record<string, string> = {};
    for (const label of manualMetrics) {
      metricMap[label] = entry.metrics[label] ?? "";
    }

    const clean: Entry = {
      ...entry,
      provider_management_id: pmId,
      form_type: formKey,
      engagement_category: formMeta(formKey).activity,
      engagement_code: formMeta(formKey).code,
      metrics: metricMap,
      ...(isFunded ? {} : { activity_budget: "", approved_amount: "" }),
      bhcpf_activity_type: entry.related_programme === "BHCPF" ? entry.bhcpf_activity_type : "",
    };

    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...clean, _key: editingKey } : l))
      : [...linesRef.current, { ...clean, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    resetEntry();
    return true;
  };

  const entryInProgress = !!(
    entry.activity_date || entry.activity_status || entry.funding_option || entry.related_programme
  );

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await api.get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<number>();
    for (const line of pending) {
      const match = saved.find((s) => {
        if (used.has(s.id)) return false;
        const t = s.activity_template;
        const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
        return tpl.provider_management_id === line.provider_management_id
          || ((tpl.activity_date ?? "").slice(0, 10) === line.activity_date
            && tpl.engagement_category === line.engagement_category);
      });
      if (!match) continue;
      used.add(match.id);
      await api.uploadLineFiles(id, match.id, line.supportingFiles);
    }
  };

  /** Editable only while drafting or after coordinator return — not while awaiting review / endorsed. */
  const canEdit = ["draft", "returned"].includes(reportStatus) || !reportId;
  const canSendReview = ["draft", "returned"].includes(reportStatus) || (!reportId && reportStatus === "draft");
  const canSubmit = reportStatus === "endorsed";
  const isLockedReview = ["awaiting_review", "submitted", "approved"].includes(reportStatus);

  return (
    <StateOfficeFormShell
      reportType="accreditation"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={PROVIDER_MANAGEMENT_NAV_TITLE}
      pageSubtitle={formMeta(formKey).label}
      hideFooterActions
      onLoaded={loadData}
      afterPersist={afterPersist}
      onPersisted={onPersisted}
      validate={(status) => {
        if (linesRef.current.length === 0 && status !== "draft") {
          return "Add at least one activity before continuing";
        }
        return null;
      }}
      buildPayload={(base) => ({
        ...base,
        activity_module: formKey,
        planned_activities: linesRef.current.length,
        lines: linesRef.current.map(({ _key, supportingFiles, ...l }) => ({
          provider_management_id: l.provider_management_id,
          form_type: l.form_type,
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
          // legacy mirrors for older list/detail code
          planned_target_stakeholders: numOrNull(l.facilities_planned),
          stakeholders_engaged: numOrNull(l.facilities_covered),
          programs_supported: l.related_programme ? [l.related_programme] : [],
        })),
      })}
    >
      {({ saving, submitting, persist, requestSubmit }) => (
        <div className="space-y-4">
          {(reviewNote || reviewedBy || reportStatus) && (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardContent className="pt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase text-slate-400 font-semibold">Workflow status</p>
                  <p className="font-semibold text-slate-800">{PROVIDER_REPORT_STATUS_LABELS[reportStatus] || reportStatus}</p>
                </div>
                {reviewedBy && (
                  <div>
                    <p className="text-[11px] uppercase text-slate-400 font-semibold">Coordinator</p>
                    <p className="font-semibold text-slate-800">{reviewedBy}</p>
                  </div>
                )}
                {reviewNote && (
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[11px] uppercase text-slate-400 font-semibold">Review comment</p>
                    <p className="text-slate-700">{reviewNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PROVIDER_FORM_TYPES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    disabled={!canEdit || typeLocked || (lines.length > 0 && formKey !== f.key)}
                    onClick={() => changeForm(f.key)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      formKey === f.key
                        ? "border-[#1a7a52] bg-[#e8f6ee] text-[#145c3f]"
                        : "border-[#d4e8dc] bg-white hover:bg-slate-50"
                    } disabled:opacity-60`}
                  >
                    <p className="text-sm font-semibold">{f.label}</p>
                  </button>
                ))}
              </div>
              {(typeLocked || !canEdit) && (
                <p className="text-[11px] text-slate-500">
                  {!canEdit
                    ? "Form type and fields are locked for this status."
                    : "Form type is locked once the report is saved or activities are added."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formMeta(formKey).label} — common information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Provider Management ID</Label>
                  <Input value={entry.provider_management_id || "Auto-generated on save"} readOnly className="bg-slate-50 font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label>Related Programme <span className="text-red-500">*</span></Label>
                  <Select
                    value={entry.related_programme}
                    onValueChange={(v) => setEntry((p) => ({
                      ...p,
                      related_programme: v,
                      bhcpf_activity_type: v === "BHCPF" ? p.bhcpf_activity_type : "",
                      metrics: {},
                    }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_RELATED_PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {entry.related_programme === "BHCPF" && (formKey === "accreditation" || formKey === "reaccreditation") && (
                  <div className="space-y-1 md:col-span-2">
                    <Label>BHCPF Activity Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={entry.bhcpf_activity_type}
                      onValueChange={(v) => setEntry((p) => ({ ...p, bhcpf_activity_type: v, metrics: {} }))}
                      disabled={!canEdit}
                    >
                      <SelectTrigger><SelectValue placeholder="Accreditation / Reaccreditation" /></SelectTrigger>
                      <SelectContent>
                        {PROVIDER_BHCPF_ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Total Facilities in State <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} value={entry.total_facilities_in_state} disabled={!canEdit}
                    onChange={(e) => set("total_facilities_in_state", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Number of Facilities Planned this Period <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} value={entry.facilities_planned} disabled={!canEdit}
                    onChange={(e) => set("facilities_planned", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Activity Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={entry.activity_date} disabled={!canEdit}
                    onChange={(e) => set("activity_date", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Facilities Covered from This Plan&apos;s Period <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} value={entry.facilities_covered} disabled={!canEdit}
                    onChange={(e) => set("facilities_covered", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Funding Option</Label>
                  <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isFunded && (
                  <>
                    <div className="space-y-1">
                      <Label>Activity Budget (₦)</Label>
                      <Input type="number" min={0} value={entry.activity_budget} disabled={!canEdit}
                        onChange={(e) => set("activity_budget", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Approved Amount (₦)</Label>
                      <Input type="number" min={0} value={entry.approved_amount} disabled={!canEdit}
                        onChange={(e) => set("approved_amount", e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label>Activity Status <span className="text-red-500">*</span></Label>
                  <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_ACTIVITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Supporting Evidence</Label>
                  <Input ref={fileInputRef} type="file" multiple disabled={!canEdit}
                    onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))} />
                  {entry.supporting_documents.length > 0 && (
                    <p className="text-xs text-slate-500">Saved: {entry.supporting_documents.map((d) => d.name).join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea rows={2} value={entry.remarks} disabled={!canEdit}
                    onChange={(e) => set("remarks", e.target.value)} />
                </div>
              </div>

              <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3 grid sm:grid-cols-2 gap-3 text-sm">
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

              {(manualMetrics.length > 0 || linkedLabel) && (
                <div className="rounded-xl border border-[#d4e8dc] bg-white p-3 space-y-3">
                  <p className="text-xs font-semibold text-[#145c3f]">
                    {formMeta(formKey).label}-specific fields
                    {entry.related_programme ? ` · ${entry.related_programme}` : ""}
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {manualMetrics.map((label) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-[11px] leading-tight">{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={entry.metrics[label] ?? ""}
                          onChange={(e) => setEntry((p) => ({
                            ...p,
                            metrics: { ...p.metrics, [label]: e.target.value },
                          }))}
                        />
                      </div>
                    ))}
                    {linkedLabel && (
                      <div className="space-y-1">
                        <Label className="text-[11px] leading-tight">{linkedLabel}</Label>
                        <Input value={String(covered)} readOnly className="bg-slate-50" />
                        <p className="text-[10px] text-slate-500">Linked to facilities covered — no separate entry</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(formKey === "qa-inspections" || formKey === "medical-audits") && (
                <p className="text-xs text-slate-500">
                  This form uses common fields only. There are no activity-specific metrics.
                </p>
              )}

              {lines.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        {["ID", "Date", "Programme", "Covered", "Status", ""].map((h) => (
                          <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                          <TableCell className="text-xs font-mono">{l.provider_management_id || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                          <TableCell className="text-sm">{l.related_programme || "—"}</TableCell>
                          <TableCell className="text-sm tabular-nums">{l.facilities_covered || "0"}</TableCell>
                          <TableCell className="text-xs">{l.activity_status || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]"
                                  onClick={() => {
                                    const row = lines.find((x) => x._key === l._key);
                                    if (!row) return;
                                    const { _key, ...rest } = row;
                                    setEntry(rest);
                                    setEditingKey(l._key);
                                  }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                                  onClick={() => {
                                    const next = linesRef.current.filter((x) => x._key !== l._key);
                                    linesRef.current = next;
                                    setLines(next);
                                  }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {canEdit && (
                  <>
                    {editingKey && <Button variant="outline" onClick={resetEntry}>Cancel edit</Button>}
                    {(editingKey || entryInProgress || lines.length === 0) && (
                      <Button variant="outline" className="gap-2" onClick={() => { if (saveLine()) toast.success(editingKey ? "Activity updated" : "Activity added"); }}>
                        <Plus className="w-4 h-4" /> {editingKey ? "Update activity" : "Add activity"}
                      </Button>
                    )}
                    <Button variant="ghost" className="gap-2" disabled={saving}
                      onClick={() => {
                        if (editingKey || entryInProgress) {
                          if (!saveLine()) return;
                        }
                        void persist("draft").then(() => setReportStatus("draft"));
                      }}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Draft
                    </Button>
                    {canSendReview && (
                      <Button
                        className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                        disabled={submitting}
                        onClick={() => {
                          if (editingKey || entryInProgress || lines.length === 0) {
                            if (!saveLine()) return;
                          }
                          requestSubmit(() => void persist("awaiting_review").then(() => setReportStatus("awaiting_review")));
                        }}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send for Review
                      </Button>
                    )}
                  </>
                )}
                {canSubmit && (
                  <Button
                    className="bg-[#016630] hover:bg-[#014d24] gap-2"
                    disabled={submitting}
                    onClick={() => {
                      requestSubmit(() => void persist("submitted").then(() => setReportStatus("submitted")));
                    }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit
                  </Button>
                )}
                {!canEdit && !canSubmit && (
                  <p className="text-xs text-slate-500 text-right w-full sm:w-auto">
                    This report is {PROVIDER_REPORT_STATUS_LABELS[reportStatus] || reportStatus}.
                    {isLockedReview
                      ? " Editing is locked while it is with the coordinator or after submission."
                      : " Editing is locked."}
                  </p>
                )}
                {canSubmit && (
                  <p className="text-xs text-slate-500 text-right w-full sm:w-auto">
                    Endorsed — review the details, then Submit. Further edits require the coordinator to return it.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
