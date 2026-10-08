import * as React from "react";
import { ChevronDown, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { stateOfficeApi } from "@/lib/api";
import { ENROLMENT_DRIVE_LOCATIONS, parseSupportingDocuments } from "./constants";
import type { ActivityReportTemplateConfig } from "./activityReportTemplateConfig";
import { resolvedActivities } from "./activityReportTemplateConfig";

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

const blank = (defaultActivity: string) => ({
  activity_date: "",
  engagement_category: defaultActivity,
  stakeholder_categories: [] as string[],
  stakeholder_names: "",
  specific_activity: "",
  engagement_purpose: "",
  funding_option: "",
  activity_budget: "",
  approved_amount: "",
  planned_target_audience: "",
  target_audience_reached: [] as string[],
  location_category: "",
  location_name: "",
  programs_supported: [] as string[],
  activity_details: "",
  planned_target_stakeholders: "",
  stakeholders_engaged: "",
  follow_up_required: "",
  follow_up_date: "",
  follow_up_visits: "",
  supporting_evidence_types: [] as string[],
  outcome_category: "",
  specific_outcome: "",
  expected_output: "",
  activity_status: "",
  remarks: "",
  supporting_documents: [] as SavedDoc[],
  supportingFiles: [] as File[],
});

type Entry = ReturnType<typeof blank>;

function MultiSelectField({
  label, options, value, onChange, placeholder = "Select",
}: {
  label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const filtered = options.filter((o) => !query.trim() || o.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="space-y-1" ref={rootRef}>
      <Label>{label}</Label>
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 h-11 px-3.5 rounded-xl text-sm text-left bg-[#f4f7f5] border-2 border-[#1a7a52] hover:border-[#0f3d2e] hover:bg-white outline-none">
          <span className={`flex-1 truncate ${value.length ? "text-slate-800" : "text-slate-400"}`}>
            {value.length ? `${value.length} selected` : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-[#1a7a52] shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border-2 border-[#1a7a52] bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[#e8f5ee]">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-8 text-xs" autoFocus />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map((o) => {
                const on = value.includes(o);
                return (
                  <button key={o} type="button"
                    onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${on ? "bg-[#e8f5ee] text-[#145c3f] font-medium" : "text-slate-700 hover:bg-[#f0fdf7]"}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${on ? "border-[#145c3f] bg-[#145c3f] text-white" : "border-slate-300"}`}>{on ? "✓" : ""}</span>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  config: ActivityReportTemplateConfig;
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/** Shared Activity Reporting Template (Stakeholder §4 + Provider §2). */
export default function ActivityReportingTemplateForm({
  config, reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const activities = React.useMemo(() => resolvedActivities(config), [config]);
  const defaultActivity = activities[0]?.label ?? "";
  const fresh = (): Entry => ({ ...blank(defaultActivity) });
  const api = stateOfficeApi[config.reportType];
  const [plannedActivities, setPlannedActivities] = React.useState("");
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const [entry, setEntry] = React.useState<Entry>(fresh);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const isBudgeted = entry.funding_option === config.budgetedLabel;
  const needsFollowUp = entry.follow_up_required === "Yes";
  const engagementMeta = activities.find((c) => c.label === entry.engagement_category);
  const primaryProgram = entry.programs_supported[0] ?? "";
  const metricLabels = React.useMemo(() => {
    if (!config.metricsByActivity || !entry.engagement_category) return [];
    const byProg = config.metricsByActivity[entry.engagement_category];
    if (!byProg) return [];
    return byProg[primaryProgram] ?? Object.values(byProg)[0] ?? [];
  }, [config.metricsByActivity, entry.engagement_category, primaryProgram]);
  const [metricValues, setMetricValues] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    try {
      const parsed = entry.activity_details ? JSON.parse(entry.activity_details) : null;
      if (parsed?.metrics && typeof parsed.metrics === "object") {
        setMetricValues(Object.fromEntries(Object.entries(parsed.metrics).map(([k, v]) => [k, String(v ?? "")])));
      } else setMetricValues({});
    } catch { setMetricValues({}); }
  }, [entry.activity_details, entry.engagement_category]);
  const locationNames = ENROLMENT_DRIVE_LOCATIONS[entry.location_category] ?? [];
  const programCodes = entry.programs_supported
    .map((l) => config.programs.find((p) => p.label === l)?.code)
    .filter(Boolean)
    .join(", ");

  const loadData = (v: any) => {
    setPlannedActivities(numStr(v.planned_activities));
    const next = (v.lines ?? []).map((l: any) => {
      const row = l.activity_template && typeof l.activity_template === "object"
        ? { ...l, ...l.activity_template }
        : (typeof l.activity_template === "string"
          ? (() => {
              try { return { ...l, ...JSON.parse(l.activity_template) }; } catch { return l; }
            })()
          : l);
      return {
      _key: uid(),
      activity_date: row.activity_date?.slice?.(0, 10) ?? "",
      engagement_category: row.engagement_category || row.activity || defaultActivity,
      stakeholder_categories: Array.isArray(row.stakeholder_categories) ? row.stakeholder_categories : [],
      stakeholder_names: row.stakeholder_names || row.organization || "",
      specific_activity: row.specific_activity ?? "",
      engagement_purpose: row.engagement_purpose ?? "",
      funding_option: row.funding_option ?? "",
      activity_budget: numStr(row.activity_budget),
      approved_amount: numStr(row.approved_amount),
      planned_target_audience: numStr(row.planned_target_audience),
      target_audience_reached: Array.isArray(row.target_audience_reached) ? row.target_audience_reached : [],
      location_category: row.location_category ?? "",
      location_name: row.location_name || row.location || "",
      programs_supported: Array.isArray(row.programs_supported) ? row.programs_supported : [],
      activity_details: row.activity_details ?? "",
      planned_target_stakeholders: numStr(row.planned_target_stakeholders),
      stakeholders_engaged: numStr(row.stakeholders_engaged ?? row.audience_size),
      follow_up_required: row.follow_up_required ?? "",
      follow_up_date: row.follow_up_date?.slice?.(0, 10) ?? "",
      follow_up_visits: numStr(row.follow_up_visits),
      supporting_evidence_types: Array.isArray(row.supporting_evidence_types) ? row.supporting_evidence_types : [],
      outcome_category: row.outcome_category ?? "",
      specific_outcome: row.specific_outcome || row.key_outcomes || "",
      expected_output: row.expected_output ?? "",
      activity_status: row.activity_status ?? "",
      remarks: row.remarks ?? "",
      supporting_documents: parseSupportingDocuments(row.supporting_documents).filter((d) => d.path) as SavedDoc[],
      supportingFiles: [] as File[],
    };
    });
    linesRef.current = next;
    setLines(next);
  };

  const resetEntry = () => {
    setEntry(fresh());
    setEditingKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveLine = (): boolean => {
    if (!entry.engagement_category) { toast.error("Select an engagement category"); return false; }
    if (!entry.activity_date) { toast.error("Enter the activity date"); return false; }
    if (!entry.activity_status) { toast.error("Select the activity status"); return false; }
    const details = metricLabels.length
      ? JSON.stringify({ metrics: metricValues })
      : entry.activity_details;
    const clean: Entry = {
      ...entry,
      activity_details: details,
      ...(isBudgeted ? {} : { activity_budget: "", approved_amount: "" }),
      ...(needsFollowUp ? {} : { follow_up_date: "", follow_up_visits: "" }),
    };
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...clean, _key: editingKey } : l))
      : [...linesRef.current, { ...clean, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    resetEntry();
    return true;
  };

  const entryInProgress = !!(entry.activity_date || entry.activity_status || entry.specific_activity || entry.funding_option);

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await api.get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<number>();
    for (const line of pending) {
      const match = saved.find((s) =>
        !used.has(s.id) &&
        (s.engagement_category === line.engagement_category) &&
        (s.activity_date ?? "").slice(0, 10) === line.activity_date,
      );
      if (!match) continue;
      used.add(match.id);
      const upload = (api as { uploadLineFiles?: typeof stateOfficeApi.stakeholder.uploadLineFiles }).uploadLineFiles;
      if (upload) await upload(id, match.id, line.supportingFiles);
    }
  };

  return (
    <StateOfficeFormShell
      reportType={config.reportType}
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={config.pageTitle}
      hideFooterActions
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => (linesRef.current.length === 0 ? "Add at least one engagement activity" : null)}
      buildPayload={(base) => ({
        ...base,
        activity_module: config.activityModule,
        planned_activities: numOrNull(plannedActivities),
        lines: linesRef.current.map(({ _key, supportingFiles, ...l }) => ({
          engagement_code: activities.find((c) => c.label === l.engagement_category)?.code ?? null,
          activity_date: l.activity_date || null,
          engagement_category: l.engagement_category,
          stakeholder_categories: l.stakeholder_categories,
          stakeholder_names: l.stakeholder_names || null,
          specific_activity: l.specific_activity || null,
          engagement_purpose: l.engagement_purpose || null,
          funding_option: l.funding_option || null,
          activity_budget: numOrNull(l.activity_budget),
          approved_amount: numOrNull(l.approved_amount),
          planned_target_audience: numOrNull(l.planned_target_audience),
          target_audience_reached: l.target_audience_reached,
          location_category: l.location_category || null,
          location_name: l.location_name || null,
          programs_supported: l.programs_supported,
          activity_details: l.activity_details || null,
          planned_target_stakeholders: numOrNull(l.planned_target_stakeholders),
          stakeholders_engaged: numOrNull(l.stakeholders_engaged),
          follow_up_required: l.follow_up_required || null,
          follow_up_date: l.follow_up_date || null,
          follow_up_visits: numOrNull(l.follow_up_visits),
          supporting_evidence_types: l.supporting_evidence_types,
          supporting_documents: l.supporting_documents,
          outcome_category: l.outcome_category || null,
          specific_outcome: l.specific_outcome || null,
          expected_output: l.expected_output || null,
          activity_status: l.activity_status || null,
          remarks: l.remarks || null,
        })),
      })}
    >
      {({ submitting, persist, requestSubmit }) => (
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Planned Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs space-y-1">
                <Label>Number of Planned Activities</Label>
                <Input type="number" min={0} value={plannedActivities} onChange={(e) => setPlannedActivities(e.target.value)} />
                <p className="text-xs text-slate-500">Conducted: {lines.filter((l) => l.activity_status === "Completed").length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{config.activitiesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>{config.activityFieldLabel} *</Label>
                  <Select value={entry.engagement_category} onValueChange={(v) => set("engagement_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {activities.map((c) => (
                        <SelectItem key={c.code} value={c.label}>{c.code} — {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{config.activityIdLabel}</Label>
                  <Input value={engagementMeta?.code ?? ""} readOnly className="bg-slate-50" placeholder="Auto" />
                </div>
                <div className="space-y-1">
                  <Label>Activity Date *</Label>
                  <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                </div>
                {config.variant === "stakeholder" && config.stakeholderCategories && (
                  <>
                    <div className="md:col-span-3">
                      <MultiSelectField label="Stakeholder Category" options={[...config.stakeholderCategories]} value={entry.stakeholder_categories}
                        onChange={(v) => set("stakeholder_categories", v)} />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label>Stakeholder Name</Label>
                      <Input value={entry.stakeholder_names} onChange={(e) => set("stakeholder_names", e.target.value)} placeholder="Comma separated for multiple" />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label>Specific Engagement Activity Carried Out</Label>
                      <Textarea rows={2} value={entry.specific_activity} onChange={(e) => set("specific_activity", e.target.value)} />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label>Engagement Purpose</Label>
                      <Textarea rows={2} value={entry.engagement_purpose} onChange={(e) => set("engagement_purpose", e.target.value)} />
                    </div>
                  </>
                )}
                {config.variant === "provider" && (
                  <div className="space-y-1 md:col-span-3">
                    <Label>Specific Activity (depends on activity selected)</Label>
                    <Textarea rows={2} value={entry.specific_activity} onChange={(e) => set("specific_activity", e.target.value)} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Funding Option</Label>
                  <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {config.fundingOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isBudgeted && (
                  <>
                    <div className="space-y-1">
                      <Label>Activity Budget (₦)</Label>
                      <Input type="number" min={0} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Approved Amount (₦)</Label>
                      <Input type="number" min={0} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                    </div>
                  </>
                )}
                {config.variant === "stakeholder" && config.targetAudiences && (
                  <>
                    <div className="space-y-1">
                      <Label>Planned Target Audience</Label>
                      <Input type="number" min={0} value={entry.planned_target_audience} onChange={(e) => set("planned_target_audience", e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <MultiSelectField label="Target Audience Reached" options={[...config.targetAudiences]}
                        value={entry.target_audience_reached} onChange={(v) => set("target_audience_reached", v)} />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label>Location Category</Label>
                  <Select value={entry.location_category} onValueChange={(v) => setEntry((p) => ({ ...p, location_category: v, location_name: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(ENROLMENT_DRIVE_LOCATIONS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Location Name</Label>
                  <Select value={entry.location_name} onValueChange={(v) => set("location_name", v)} disabled={!locationNames.length}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {locationNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Program ID</Label>
                  <Input value={programCodes} readOnly className="bg-slate-50" placeholder="Auto" />
                </div>
                <div className="md:col-span-3">
                  <MultiSelectField label="Program" options={config.programs.map((p) => p.label)}
                    value={entry.programs_supported} onChange={(v) => set("programs_supported", v)} />
                </div>
                {metricLabels.length > 0 && (
                  <div className="md:col-span-3 grid md:grid-cols-2 gap-3 rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3">
                    <p className="md:col-span-2 text-xs font-semibold text-[#145c3f]">Activity-specific metrics (program: {primaryProgram || "—"})</p>
                    {metricLabels.map((label) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-[11px] leading-tight">{label}</Label>
                        <Input type="number" min={0} value={metricValues[label] ?? ""}
                          onChange={(e) => {
                            const next = { ...metricValues, [label]: e.target.value };
                            setMetricValues(next);
                            set("activity_details", JSON.stringify({ metrics: next }));
                          }} />
                      </div>
                    ))}
                  </div>
                )}
                {config.variant === "stakeholder" && (
                  <div className="space-y-1 md:col-span-3">
                    <Label>Activity Details</Label>
                    <Textarea rows={2} value={entry.activity_details} onChange={(e) => set("activity_details", e.target.value)} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>{config.useFacilityCounts ? "Planned Number of Facilities" : "Planned Target Stakeholders"}</Label>
                  <Input type="number" min={0} value={entry.planned_target_stakeholders} onChange={(e) => set("planned_target_stakeholders", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{config.useFacilityCounts ? "Actual Number of Facilities Visited" : "Number of stakeholders engaged"}</Label>
                  <Input type="number" min={0} value={entry.stakeholders_engaged} onChange={(e) => set("stakeholders_engaged", e.target.value)} />
                </div>
                {config.variant === "stakeholder" && config.yesNo && (
                  <>
                    <div className="space-y-1">
                      <Label>Follow-up required</Label>
                      <Select value={entry.follow_up_required} onValueChange={(v) => set("follow_up_required", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {config.yesNo.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {needsFollowUp && (
                      <>
                        <div className="space-y-1">
                          <Label>Follow-Up engagement visit date</Label>
                          <Input type="date" value={entry.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Number of follow-up visits</Label>
                          <Input type="number" min={0} value={entry.follow_up_visits} onChange={(e) => set("follow_up_visits", e.target.value)} />
                        </div>
                      </>
                    )}
                  </>
                )}
                <div className="md:col-span-3">
                  <MultiSelectField label="Supporting Evidence (type)" options={[...config.evidenceTypes]}
                    value={entry.supporting_evidence_types} onChange={(v) => set("supporting_evidence_types", v)} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Supporting Evidence (attachments)</Label>
                  <Input ref={fileInputRef} type="file" multiple
                    onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))} />
                  {entry.supporting_documents.length > 0 && (
                    <p className="text-xs text-slate-500">Saved: {entry.supporting_documents.map((d) => d.name).join(", ")}</p>
                  )}
                </div>
                {config.variant === "stakeholder" && config.outcomeCategories && config.specificOutcomes && (
                  <>
                    <div className="space-y-1">
                      <Label>Outcome Category</Label>
                      <Select value={entry.outcome_category} onValueChange={(v) => set("outcome_category", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {config.outcomeCategories.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Specific Engagement Activity Outcome</Label>
                      <Select value={entry.specific_outcome} onValueChange={(v) => set("specific_outcome", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {config.specificOutcomes.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-1 md:col-span-3">
                  <Label className={config.variant === "provider" ? "text-rose-700 font-bold" : undefined}>Expected Output</Label>
                  <Textarea rows={2} value={entry.expected_output} onChange={(e) => set("expected_output", e.target.value)} className={config.variant === "provider" ? "border-rose-300 bg-rose-50/40" : undefined} />
                </div>
                <div className="space-y-1">
                  <Label>Activity / Follow-Up Status *</Label>
                  <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {config.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Remarks / Observations</Label>
                  <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
                </div>
              </div>

              {lines.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        {["ID", "Date", "Category", "Stakeholders", "Engaged", "Status", ""].map((h) => (
                          <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => {
                        const code = activities.find((c) => c.label === l.engagement_category)?.code;
                        return (
                          <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                            <TableCell className="text-xs font-mono">{code || "—"}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">{l.engagement_category}</TableCell>
                            <TableCell className="text-xs">{l.stakeholder_names || l.stakeholder_categories.join(", ") || "—"}</TableCell>
                            <TableCell className="text-sm">{l.stakeholders_engaged || "0"}</TableCell>
                            <TableCell className="text-xs">{l.activity_status || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]"
                                onClick={() => { const row = lines.find((x) => x._key === l._key); if (!row) return; const { _key, ...rest } = row; setEntry(rest); setEditingKey(l._key); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                                onClick={() => { const next = linesRef.current.filter((x) => x._key !== l._key); linesRef.current = next; setLines(next); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingKey && <Button variant="outline" onClick={resetEntry}>Cancel edit</Button>}
                {editingKey || (entryInProgress && lines.length > 0) ? (
                  <Button variant="outline" className="gap-2" onClick={() => { if (saveLine()) toast.success(editingKey ? "Activity updated" : "Activity added"); }}>
                    <Plus className="w-4 h-4" /> {editingKey ? "Update activity" : "Add activity"}
                  </Button>
                ) : null}
                <Button
                  className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                  disabled={submitting}
                  onClick={() => {
                    if (editingKey || entryInProgress || lines.length === 0) {
                      if (!saveLine()) return;
                    }
                    requestSubmit(() => persist("submitted"));
                  }}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : <><Send className="w-4 h-4" /> Submit</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
