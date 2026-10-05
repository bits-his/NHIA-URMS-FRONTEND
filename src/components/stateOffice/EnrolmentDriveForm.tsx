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
import {
  ENROLMENT_DRIVE_BUDGETED,
  ENROLMENT_DRIVE_FUNDING_OPTIONS,
  ENROLMENT_DRIVE_LOCATIONS,
  ENROLMENT_DRIVE_PROGRAMS,
  ENROLMENT_DRIVE_STATUSES,
  ENROLMENT_DRIVE_TARGET_AUDIENCES,
  formatAmount,
  parseSupportingDocuments,
} from "./constants";
import {
  enrolmentDriveConfig, ENROLMENT_DRIVE_TYPES, type EnrolmentDriveCategory, type EnrolmentDriveReportType,
} from "./enrolmentDriveTypes";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const uid = () => Math.random().toString(36).slice(2);

type SavedDoc = { name: string; path: string };

const blank = () => ({
  activity_date: "",
  activity_category: "",
  specific_activity: "",
  funding_option: "",
  activity_budget: "",
  approved_amount: "",
  target_audience: [] as string[],
  location_category: "",
  location_name: "",
  programs_supported: [] as string[],
  activity_details: "",
  planned_target_audience: "",
  target_audience_reached: "",
  leads_generated: "",
  new_enrolments: "",
  activity_status: "",
  remarks: "",
  supporting_documents: [] as SavedDoc[],
  supportingFiles: [] as File[],
});

type Entry = ReturnType<typeof blank>;

interface Props {
  reportType: EnrolmentDriveReportType;
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const codeIn = (categories: readonly EnrolmentDriveCategory[], label: string) =>
  categories.find((a) => a.label === label)?.code ?? "";

const programCodes = (labels: string[]) =>
  labels.map((l) => ENROLMENT_DRIVE_PROGRAMS.find((p) => p.label === l)?.code).filter(Boolean).join(", ");

const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));

function MultiSelectField({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (o: string) => {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  };

  return (
    <div className="space-y-1 md:col-span-3" ref={rootRef}>
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 h-11 px-3.5 rounded-xl text-sm text-left bg-[#f4f7f5] border-2 border-[#1a7a52] hover:border-[#0f3d2e] hover:bg-white outline-none"
        >
          <span className={`flex-1 truncate ${value.length ? "text-slate-800" : "text-slate-400"}`}>
            {value.length ? `${value.length} selected` : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-[#1a7a52] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border-2 border-[#1a7a52] bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[#e8f5ee]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-slate-400">No matches</p>
              ) : (
                filtered.map((o) => {
                  const on = value.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggle(o)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
                        on ? "bg-[#e8f5ee] text-[#145c3f] font-medium" : "text-slate-700 hover:bg-[#f0fdf7]"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                        on ? "border-[#145c3f] bg-[#145c3f] text-white" : "border-slate-300"
                      }`}>
                        {on ? "✓" : ""}
                      </span>
                      {o}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {value.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== item))}
              className="rounded-full border border-[#016630] bg-[#016630] text-white px-2.5 py-0.5 text-xs"
            >
              {item} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnrolmentDriveForm({ reportType, reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const config = enrolmentDriveConfig(reportType) ?? ENROLMENT_DRIVE_TYPES[0];
  const categories = config.categories;
  const activityCode = (label: string) => codeIn(categories, label);
  const freshEntry = (): Entry => ({ ...blank(), activity_category: categories[0]?.label ?? "" });
  const [plannedActivities, setPlannedActivities] = React.useState("");
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const [entry, setEntry] = React.useState<Entry>(freshEntry);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));

  const isBudgeted = entry.funding_option === ENROLMENT_DRIVE_BUDGETED;
  const locationNames = ENROLMENT_DRIVE_LOCATIONS[entry.location_category] ?? [];

  const loadData = (v: any) => {
    setPlannedActivities(numStr(v.planned_activities));
    const next = (v.lines ?? []).map((l: any) => ({
      _key: uid(),
      activity_date: l.activity_date?.slice?.(0, 10) ?? "",
      activity_category: l.activity_category ?? "",
      specific_activity: l.specific_activity ?? "",
      funding_option: l.funding_option ?? "",
      activity_budget: numStr(l.activity_budget),
      approved_amount: numStr(l.approved_amount),
      target_audience: Array.isArray(l.target_audience) ? l.target_audience : [],
      location_category: l.location_category ?? "",
      location_name: l.location_name ?? "",
      programs_supported: Array.isArray(l.programs_supported) ? l.programs_supported : [],
      activity_details: l.activity_details ?? "",
      planned_target_audience: numStr(l.planned_target_audience),
      target_audience_reached: numStr(l.target_audience_reached),
      leads_generated: numStr(l.leads_generated),
      new_enrolments: numStr(l.new_enrolments),
      activity_status: l.activity_status ?? "",
      remarks: l.remarks ?? "",
      supporting_documents: parseSupportingDocuments(l.supporting_documents).filter((d) => d.path) as SavedDoc[],
      supportingFiles: [],
    }));
    linesRef.current = next;
    setLines(next);
  };

  const resetEntry = () => {
    setEntry(freshEntry());
    setEditingKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveLine = (): boolean => {
    if (!entry.activity_category) { toast.error("Select an activity category"); return false; }
    if (!entry.activity_date) { toast.error("Enter the activity date"); return false; }
    if (!entry.activity_status) { toast.error("Select the activity status"); return false; }
    const clean: Entry = isBudgeted ? entry : { ...entry, activity_budget: "", approved_amount: "" };
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...clean, _key: editingKey } : l))
      : [...linesRef.current, { ...clean, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    resetEntry();
    return true;
  };

  const entryInProgress = !!(entry.activity_date || entry.activity_status || entry.specific_activity || entry.funding_option);

  const editLine = (key: string) => {
    const l = lines.find((x) => x._key === key);
    if (!l) return;
    const { _key, ...rest } = l;
    setEntry(rest);
    setEditingKey(key);
  };

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await stateOfficeApi[reportType].get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<number>();
    for (const line of pending) {
      const match = saved.find((s) =>
        !used.has(s.id) &&
        s.activity_category === line.activity_category &&
        (s.activity_date ?? "").slice(0, 10) === line.activity_date &&
        (s.specific_activity ?? "") === line.specific_activity
      );
      if (!match) continue;
      used.add(match.id);
      await stateOfficeApi[reportType].uploadLineFiles(id, match.id, line.supportingFiles);
    }
    const cleared = linesRef.current.map((l) => ({ ...l, supportingFiles: [] as File[] }));
    linesRef.current = cleared;
    setLines(cleared);
  };

  return (
    <StateOfficeFormShell
      reportType={reportType}
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={config.title}
      hideFooterActions
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => (linesRef.current.length === 0 ? `Add at least one ${config.title} activity` : null)}
      buildPayload={(base) => ({
        ...base,
        planned_activities: numOrNull(plannedActivities) ?? linesRef.current.length,
        lines: linesRef.current.map(({ _key, supportingFiles, ...l }) => ({
          ...l,
          drive_code: activityCode(l.activity_category) || null,
          activity_budget: numOrNull(l.activity_budget),
          approved_amount: numOrNull(l.approved_amount),
          planned_target_audience: numOrNull(l.planned_target_audience),
          target_audience_reached: numOrNull(l.target_audience_reached),
          leads_generated: numOrNull(l.leads_generated),
          new_enrolments: numOrNull(l.new_enrolments),
        })),
      })}
    >
      {({ submitting, persist, requestSubmit }) => (
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{config.title} Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Activity Category *</Label>
                  <Select value={entry.activity_category} onValueChange={(v) => set("activity_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((a) => <SelectItem key={a.label} value={a.label}>{a.code} — {a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Enrolment Drive ID</Label>
                  <Input value={activityCode(entry.activity_category)} readOnly placeholder="Auto" className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label>Activity Date *</Label>
                  <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Specific Activity Carried Out</Label>
                  <Input value={entry.specific_activity} onChange={(e) => set("specific_activity", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Funding Option</Label>
                  <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_DRIVE_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                <MultiSelectField
                  label="Target Audience"
                  options={ENROLMENT_DRIVE_TARGET_AUDIENCES}
                  value={entry.target_audience}
                  onChange={(v) => set("target_audience", v)}
                  placeholder="Select target audience"
                />
                <div className="space-y-1">
                  <Label>Location Category</Label>
                  <Select
                    value={entry.location_category}
                    onValueChange={(v) => setEntry((p) => ({ ...p, location_category: v, location_name: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(ENROLMENT_DRIVE_LOCATIONS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Location Name</Label>
                  <Select value={entry.location_name} onValueChange={(v) => set("location_name", v)} disabled={!locationNames.length}>
                    <SelectTrigger><SelectValue placeholder={locationNames.length ? "Select" : "Choose a category first"} /></SelectTrigger>
                    <SelectContent>
                      {locationNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Program ID</Label>
                  <Input value={programCodes(entry.programs_supported)} readOnly placeholder="Auto" className="bg-slate-50" />
                </div>
                <MultiSelectField
                  label="Program Supported"
                  options={ENROLMENT_DRIVE_PROGRAMS.map((p) => p.label)}
                  value={entry.programs_supported}
                  onChange={(v) => set("programs_supported", v)}
                  placeholder="Select programs"
                />
                <div className="space-y-1 md:col-span-3">
                  <Label>Activity Details</Label>
                  <Textarea rows={2} value={entry.activity_details} onChange={(e) => set("activity_details", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Planned Target Audience</Label>
                  <Input type="number" min={0} value={entry.planned_target_audience} onChange={(e) => set("planned_target_audience", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Target Audience Reached</Label>
                  <Input type="number" min={0} value={entry.target_audience_reached} onChange={(e) => set("target_audience_reached", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Number of Leads Generated</Label>
                  <Input type="number" min={0} value={entry.leads_generated} onChange={(e) => set("leads_generated", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Number of New Enrolments</Label>
                  <Input type="number" min={0} value={entry.new_enrolments} onChange={(e) => set("new_enrolments", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Activity Status *</Label>
                  <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_DRIVE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Supporting Evidence</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))}
                  />
                  {entry.supporting_documents.length > 0 && (
                    <p className="text-xs text-slate-500">Saved: {entry.supporting_documents.map((d) => d.name).join(", ")}</p>
                  )}
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
                        {["ID", "Date", "Activity", "Funding", "Approved (₦)", "Location", "Programs", "Reached", "Leads", "New Enrolments", "Status", "Evidence", ""].map((h) => (
                          <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                          <TableCell className="text-xs font-mono">{activityCode(l.activity_category) || "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {l.activity_category}
                            {l.specific_activity && <div className="text-xs text-slate-500">{l.specific_activity}</div>}
                          </TableCell>
                          <TableCell className="text-xs">{l.funding_option || "—"}</TableCell>
                          <TableCell className="text-sm">{l.approved_amount ? formatAmount(l.approved_amount) : "—"}</TableCell>
                          <TableCell className="text-xs">{l.location_name || l.location_category || "—"}</TableCell>
                          <TableCell className="text-xs">{l.programs_supported.join(", ") || "—"}</TableCell>
                          <TableCell className="text-sm">{l.target_audience_reached || "—"}</TableCell>
                          <TableCell className="text-sm">{l.leads_generated || "—"}</TableCell>
                          <TableCell className="text-sm">{l.new_enrolments || "—"}</TableCell>
                          <TableCell className="text-xs">{l.activity_status || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {[...l.supporting_documents.map((d) => d.name), ...l.supportingFiles.map((f) => f.name)].join(", ") || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]" onClick={() => editLine(l._key)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => {
                              const next = linesRef.current.filter((x) => x._key !== l._key);
                              linesRef.current = next;
                              setLines(next);
                            }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingKey && (
                  <Button variant="outline" onClick={resetEntry}>Cancel edit</Button>
                )}
                {editingKey || (entryInProgress && lines.length > 0) ? (
                  <Button
                    variant="outline"
                    onClick={() => { if (saveLine()) toast.success(editingKey ? "Activity updated" : "Activity added"); }}
                    className="gap-2"
                  >
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
