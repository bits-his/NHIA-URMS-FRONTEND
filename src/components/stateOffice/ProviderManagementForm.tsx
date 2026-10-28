import * as React from "react";
import {
  Award, ChevronRight, ClipboardCheck, Loader2, Pencil, Plus, RefreshCw,
  Save, Send, Stethoscope, Trash2, type LucideIcon,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { stateOfficeApi, stockApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store/store";
import { MONTHS, labelOf, monthLabel, parseSupportingDocuments, quarterFromMonth } from "./constants";
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

/** State only in UI; Zone is set automatically from the selected state. */
function ProviderReportInformation({ header }: { header: any }) {
  const user = useSelector((s: RootState) => s.auth.user) as { name?: string } | null;
  const periodText = header.reportMonth && header.reportYear
    ? `${monthLabel(header.reportMonth)} ${header.reportYear}`
    : "—";
  const [allStates, setAllStates] = React.useState<{ id: string; label: string; zoneId: string }[]>([]);
  const inputClass = "bg-[#f4f7f5] border-2 border-[#1a7a52] shadow-xs hover:border-[#0f3d2e] hover:bg-white";

  React.useEffect(() => {
    stockApi.getStates().then((r) => {
      setAllStates(
        (r.data ?? []).map((s: any) => ({
          id: String(s.id ?? s.code ?? ""),
          label: s.description || s.label || String(s.id),
          zoneId: String(s.zonal_code ?? s.zonal_id ?? s.zone_id ?? s.zone?.id ?? s.zone?.zonal_code ?? ""),
        })).filter((s: { id: string }) => s.id),
      );
    }).catch(() => setAllStates([]));
  }, []);

  const stateOptions = allStates.length
    ? allStates
    : (header.states ?? []).map((s: { id: string | number; label: string }) => ({
      id: String(s.id),
      label: s.label,
      zoneId: header.zoneId || "",
    }));

  const stateLabel = labelOf(
    stateOptions.map((s) => ({ value: s.id, label: s.label })),
    header.stateId,
    "Select when sending for review",
  );

  const onStateChange = (v: string) => {
    const match = stateOptions.find((s) => s.id === v);
    if (header.hydratingRef) header.hydratingRef.current = true;
    if (match?.zoneId && !header.lockZone) header.setZoneId(match.zoneId);
    header.setStateId(v);
    queueMicrotask(() => {
      if (header.hydratingRef) header.hydratingRef.current = false;
    });
  };

  return (
    <section className="rounded-xl border border-[#d4e8dc] overflow-hidden bg-white">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
          Report Information
        </h3>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 bg-[#f4f7f5]">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">Reporting period</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={header.reportMonth} onValueChange={header.setReportMonth}>
              <SelectTrigger className={inputClass} displayValue={monthLabel(header.reportMonth)}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={header.reportYear} onValueChange={header.setReportYear}>
              <SelectTrigger className={inputClass} displayValue={header.reportYear || "Year"}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => {
                  const y = String(new Date().getFullYear() - 2 + i);
                  return <SelectItem key={y} value={y}>{y}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">
            State <span className="text-slate-400 font-normal">(required to send for review)</span>
          </Label>
          <Select value={header.stateId} onValueChange={onStateChange} disabled={header.lockState}>
            <SelectTrigger
              className={cn(inputClass, header.lockState ? "opacity-70" : "")}
              displayValue={stateLabel}
            >
              <SelectValue placeholder="Select when sending for review" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">Reporting officer</Label>
          <Input readOnly value={user?.name || "Signed-in user"} className={cn(inputClass, "opacity-90")} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">Reporting month</Label>
          <Input readOnly value={periodText} className={cn(inputClass, "opacity-90")} />
        </div>
      </div>
    </section>
  );
}

const PROVIDER_ACTIVITY_ICONS: Record<ProviderFormKey, LucideIcon> = {
  accreditation: Award,
  reaccreditation: RefreshCw,
  "qa-inspections": ClipboardCheck,
  "medical-audits": Stethoscope,
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
}

export default function ProviderManagementForm({
  reportId, initialFormKey = "accreditation", onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, onPersisted,
}: Props) {
  const openedFromTab = !reportId && !!initialFormKey;
  const leave = onCancel ?? onBack;
  const [formKey, setFormKey] = React.useState<ProviderFormKey>(initialFormKey);
  const api = stateOfficeApi.providerManagement;
  const [activityChosen, setActivityChosen] = React.useState(!!reportId || openedFromTab);
  const [view, setView] = React.useState<"register" | "activity">(
    reportId ? "register" : openedFromTab ? "activity" : "register"
  );
  const [reportStatus, setReportStatus] = React.useState<string>("draft");
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const [entry, setEntry] = React.useState<Entry>(() => blank(initialFormKey));
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [pmSeq, setPmSeq] = React.useState(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typeLocked = !!reportId || lines.length > 0 || openedFromTab;

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const selectActivity = (key: ProviderFormKey) => {
    if (typeLocked && activityChosen && formKey !== key) {
      toast.error("Form type is locked once activities are added or the report is saved");
      return;
    }
    setFormKey(key);
    setEntry(blank(key));
    setEditingKey(null);
    setActivityChosen(true);
    setView("activity");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    const status = v.status || "draft";
    setReportStatus(status);
    const mod = String(v.form_type || v.activity_module || "accreditation");
    const matched = PROVIDER_FORM_TYPES.find((f) => f.key === mod);
    const fk = (matched?.key || "accreditation") as ProviderFormKey;
    setFormKey(fk);
    setActivityChosen(true);
    const raw: any[] = v.lines ?? [];
    let maxSeq = 0;
    const next = raw.map((row) => {
      const t = row.activity_template;
      const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
      // Prefer flat row fields (new API), fall back to activity_template
      const merged = { ...tpl, ...row, ...(tpl.metrics ? {} : {}) };
      if (tpl.metrics && !row.metrics) merged.metrics = tpl.metrics;
      const id = String(
        merged.provider_management_id || merged.reference_id || merged.id || row.id || "",
      );
      const m = id.match(/(?:PM|PACC|PREC|PQA|PMED)-\d+-(\d+)/i);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
      return { row, merged, id };
    }).map(({ merged, id: existingId }) => {
      let id = existingId;
      if (!id) {
        maxSeq += 1;
        id = nextPmId(maxSeq);
      }
      const metricsRaw = merged.metrics && typeof merged.metrics === "object" ? merged.metrics : {};
      const docs = parseSupportingDocuments(
        merged.supporting_documents ?? [],
      ).filter((d) => d.path) as SavedDoc[];
      return {
        ...blank(fk),
        _key: uid(),
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
    });
    setPmSeq(Math.max(maxSeq + 1, 1));
    linesRef.current = next;
    setLines(next);
    setEntry(blank(fk));
    setEditingKey(null);
    const editable = ["draft", "returned"].includes(status);
    setView(next.length === 0 && editable ? "activity" : "register");
  };

  const resetEntry = () => {
    setEntry(blank(formKey));
    setEditingKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startAdd = () => {
    resetEntry();
    setView("activity");
  };

  const startEdit = (key: string) => {
    const row = linesRef.current.find((x) => x._key === key);
    if (!row) return;
    const { _key, ...rest } = row;
    setEntry(rest);
    setEditingKey(key);
    setView("activity");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const backToRegister = () => {
    resetEntry();
    if (linesRef.current.length === 0 && !reportId) {
      if (openedFromTab) {
        leave();
        return;
      }
      setActivityChosen(false);
      return;
    }
    setView("register");
  };

  const saveActivity = () => {
    if (!entry.related_programme) { toast.error("Select Related Programme"); return; }
    if (entry.related_programme === "BHCPF" && (entry.form_type === "accreditation" || entry.form_type === "reaccreditation") && !entry.bhcpf_activity_type) {
      toast.error("Select BHCPF activity type (Accreditation or Reaccreditation)");
      return;
    }
    if (!entry.activity_date) { toast.error("Enter the activity date"); return; }
    if (!entry.activity_status) { toast.error("Select the activity status"); return; }
    if (entry.total_facilities_in_state === "") { toast.error("Enter total facilities in the state"); return; }
    if (entry.facilities_planned === "") { toast.error("Enter facilities planned this period"); return; }
    if (entry.facilities_covered === "") { toast.error("Enter facilities covered from this plan's period"); return; }

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
    toast.success(editingKey ? "Activity updated" : "Activity saved");
    backToRegister();
  };

  const afterPersist = async ({ id }: { id: number | string }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await api.get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<string>();
    for (const line of pending) {
      const match = saved.find((s) => {
        const sid = String(s.id ?? s.reference_id ?? "");
        if (!sid || used.has(sid)) return false;
        const t = s.activity_template;
        const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return {}; } })() : (t || {});
        return String(tpl.provider_management_id || sid) === line.provider_management_id
          || ((String(tpl.activity_date ?? s.activity_date ?? "").slice(0, 10) === line.activity_date
            && (tpl.engagement_category || s.engagement_category) === line.engagement_category));
      });
      if (!match) continue;
      const lineId = String(match.id ?? match.reference_id);
      used.add(lineId);
      await api.uploadLineFiles(id, lineId, line.supportingFiles);
    }
  };

  /** Editable only while drafting or after coordinator return — not while awaiting review / endorsed. */
  const canEdit = ["draft", "returned"].includes(reportStatus) || !reportId;
  const canSendReview = ["draft", "returned"].includes(reportStatus) || (!reportId && reportStatus === "draft");
  const canSubmit = reportStatus === "endorsed";
  const isLockedReview = ["awaiting_review", "submitted", "approved"].includes(reportStatus);

  return (
    <StateOfficeFormShell
      reportType="provider-management"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={PROVIDER_MANAGEMENT_NAV_TITLE}
      pageSubtitle={activityChosen ? formMeta(formKey).label : "Select an activity"}
      hideFooterActions
      hideBasicInfo
      showQuarter
      deferStateUntilReview
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
        form_type: formKey,
        planned_activities: linesRef.current.length,
        lines: linesRef.current.map(({ _key, supportingFiles, ...l }) => ({
          id: l.provider_management_id?.match(/^(PACC|PREC|PQA|PMED)-/i)
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
        })),
      })}
    >
      {({ saving, submitting, persist, requestSubmit, header }) => {
        const stateLabel = labelOf(
          header.states.map((s) => ({ value: String(s.id), label: s.label })),
          header.stateId,
          "",
        );
        const periodBadge = [
          stateLabel,
          [monthLabel(header.reportMonth), header.reportYear].filter(Boolean).join(" "),
          header.reportMonth ? `(Q${quarterFromMonth(header.reportMonth)})` : "",
        ].filter(Boolean).join(", ").replace(", (", " (");

        return (
        <div className="space-y-4">
          <ProviderReportInformation header={header} />
          {!activityChosen ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h2 className="text-xl font-bold text-slate-900">Activities</h2>
                {periodBadge && (
                  <span className="inline-flex items-center rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-semibold text-[#145c3f]">
                    {periodBadge}
                  </span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {PROVIDER_FORM_TYPES.map((f) => {
                  const Icon = PROVIDER_ACTIVITY_ICONS[f.key];
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => selectActivity(f.key)}
                      className="group flex items-center gap-4 rounded-2xl border border-[#d4e8dc] bg-white px-5 py-5 text-left shadow-sm transition-all hover:border-[#1a7a52] hover:bg-[#f7fcf9] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a52]/40"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#145c3f]">
                        <Icon className="h-6 w-6" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-900">{f.label}</p>
                        <p className="mt-0.5 text-sm text-slate-500 leading-snug">{f.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#145c3f] opacity-70 transition group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : view === "register" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-sm font-semibold text-[#0f3d2e]">
                  Activity: <span className="text-slate-800">{formMeta(formKey).label}</span>
                </p>
                {canEdit && !typeLocked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#145c3f]"
                    onClick={() => setActivityChosen(false)}
                  >
                    Change activity
                  </Button>
                )}
              </div>

              <Card className="rounded-xl border border-[#d4e8dc] shadow-sm overflow-hidden">
                <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
                    Activity Register
                  </h3>
                  <p className="text-[11px] text-[#145c3f]">
                    {lines.length} activit{lines.length === 1 ? "y" : "ies"} this period
                  </p>
                </div>
                <CardContent className="p-0 bg-white">
                  {lines.length === 0 ? (
                    <div className="py-14 text-center text-sm text-slate-400">
                      No activities yet. Click Add Activity to create one.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#eef6f1] hover:bg-[#eef6f1]">
                            {["ID", "Activity date", "Programme", "Facilities covered", "Status", "Action"].map((h) => (
                              <TableHead key={h} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l) => (
                            <TableRow key={l._key} className="hover:bg-[#f4f7f5]">
                              <TableCell className="text-xs font-mono font-semibold text-[#145c3f]">
                                {l.provider_management_id || "—"}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                              <TableCell className="text-sm">{l.related_programme || "—"}</TableCell>
                              <TableCell className="text-sm tabular-nums">{l.facilities_covered || "0"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{l.activity_status || "—"}</Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {canEdit ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 px-2 text-[#145c3f]"
                                      onClick={() => startEdit(l._key)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> View / Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-rose-500"
                                      onClick={() => {
                                        const next = linesRef.current.filter((x) => x._key !== l._key);
                                        linesRef.current = next;
                                        setLines(next);
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">Locked</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="px-4 py-3 border-t border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2 bg-[#f4f7f5]">
                    {canEdit ? (
                      <Button
                        variant="outline"
                        className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                        onClick={startAdd}
                      >
                        <Plus className="w-4 h-4" /> Add Activity
                      </Button>
                    ) : (
                      <span />
                    )}
                    <p className="text-[11px] text-slate-500">
                      Monthly activity count is calculated from saved records.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-end gap-2">
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
                        disabled={saving || submitting || lines.length === 0}
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
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold text-[#0f3d2e]">
                  {editingKey ? "Edit Activity" : "New Activity"}
                  <span className="font-medium text-slate-500"> · {formMeta(formKey).label}</span>
                </h2>
                <Button variant="ghost" size="sm" onClick={backToRegister}>Cancel</Button>
              </div>

              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Activity details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
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
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" onClick={backToRegister}>Cancel</Button>
                {canEdit && (
                  <Button variant="outline" className="gap-2" onClick={saveActivity}>
                    <Save className="w-4 h-4" /> Save Activity
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        );
      }}
    </StateOfficeFormShell>
  );
}
