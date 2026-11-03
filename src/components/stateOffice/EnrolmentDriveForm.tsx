import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  enrolmentDriveConfig,
  enrolmentDriveReportType,
  ENROLMENT_DRIVE_TYPES,
  type EnrolmentDriveCategory,
  type EnrolmentDriveKey,
  type EnrolmentDriveReportType,
} from "./enrolmentDriveTypes";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

export function FieldSection({
  title,
  children,
  gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
}: {
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className={gridClassName}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-600">
        {label.replace(/\s*\*$/, "")}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {items}
      </div>
    </section>
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
  reportId?: number | string | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const codeIn = (categories: readonly EnrolmentDriveCategory[], label: string) =>
  categories.find((a) => a.label === label)?.code ?? "";

const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));

export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
  className,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePos = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(160, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? Math.max(8, r.top - maxHeight - 4) : r.bottom + 4,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    };
    const onReposition = () => updatePos();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePos]);

  const filtered = options.filter(
    (o) => !query.trim() || o.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className={cn("space-y-1.5 md:col-span-2", className)} ref={rootRef}>
      {label ? <Label className="text-[11px] font-semibold text-slate-600">{label}</Label> : null}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 min-h-10 px-3 py-1.5 rounded-xl text-sm text-left bg-[#f4f7f5] border-2 border-[#1a7a52] hover:border-[#0f3d2e] hover:bg-white outline-none shadow-xs"
      >
        {value.length ? (
          <span className="flex-1 flex flex-wrap gap-1 min-w-0">
            {value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center max-w-full truncate rounded-md bg-[#e8f5ee] px-1.5 py-0.5 text-[11px] font-medium text-[#0f3d2e]"
                title={v}
              >
                {v}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex-1 truncate text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="rounded-xl border-2 border-[#1a7a52] bg-white shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-[#d4e8dc]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-1" style={{ maxHeight: pos.maxHeight - 48 }}>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
            ) : filtered.map((o) => {
              const checked = value.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
                    checked ? "bg-[#eef6f1] text-[#0f3d2e]" : "hover:bg-slate-50",
                  )}
                  onClick={() => onChange(checked ? value.filter((x) => x !== o) : [...value, o])}
                >
                  <span className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center text-[10px] shrink-0",
                    checked ? "bg-[#145c3f] border-[#145c3f] text-white" : "border-slate-300",
                  )}>
                    {checked ? "✓" : ""}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function EnrolmentDriveForm({ reportType, reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const initialKey =
    (enrolmentDriveConfig(reportType)?.key as EnrolmentDriveKey | undefined) ?? ENROLMENT_DRIVE_TYPES[0].key;
  const [driveKey, setDriveKey] = React.useState<EnrolmentDriveKey>(initialKey);
  React.useEffect(() => {
    const key = enrolmentDriveConfig(reportType)?.key as EnrolmentDriveKey | undefined;
    if (key) setDriveKey(key);
  }, [reportType]);
  const activeReportType = enrolmentDriveReportType(driveKey);
  const config = enrolmentDriveConfig(activeReportType) ?? ENROLMENT_DRIVE_TYPES[0];
  const categories = config.categories;
  const activityCode = (label: string) => codeIn(categories, label);
  const freshEntry = React.useCallback(
    (): Entry => ({ ...blank(), activity_category: categories[0]?.label ?? "" }),
    [categories],
  );
  const [plannedActivities, setPlannedActivities] = React.useState("");
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const [entry, setEntry] = React.useState<Entry>(freshEntry);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const activityFormRef = React.useRef<HTMLDivElement>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => {
    setEntry((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[k as string];
        return next;
      });
    }
  };

  const changeDriveType = (key: EnrolmentDriveKey) => {
    if (key === driveKey) return;
    const nextCats = ENROLMENT_DRIVE_TYPES.find((t) => t.key === key)?.categories ?? [];
    setDriveKey(key);
    setEditingKey(null);
    setEntry({ ...blank(), activity_category: nextCats[0]?.label ?? "" });
    if (linesRef.current.length > 0) {
      linesRef.current = [];
      setLines([]);
      toast.message("Activities cleared", { description: "Activity list reset for the new drive type." });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateLine = (): boolean => {
    const errs: Record<string, string> = {};
    if (!driveKey) errs.drive_type = "Drive type is required";
    if (!entry.activity_category) errs.activity_category = "Activity category is required";
    if (!entry.activity_date) errs.activity_date = "Activity date is required";
    if (!entry.activity_status) errs.activity_status = "Activity status is required";
    if (isBudgeted) {
      if (!entry.activity_budget) errs.activity_budget = "Activity budget is required";
      if (!entry.approved_amount) errs.approved_amount = "Approved amount is required";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstError = Object.values(errs)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const saveLine = (): boolean => {
    if (!validateLine()) return false;
    const clean: Entry = isBudgeted ? entry : { ...entry, activity_budget: "", approved_amount: "" };
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...clean, _key: editingKey } : l))
      : [...linesRef.current, { ...clean, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    toast.success(editingKey ? "Activity updated in list" : "Activity added to list");
    resetEntry();
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  };

  const startNewActivity = () => {
    resetEntry();
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const startEdit = (key: string) => {
    const l = lines.find((x) => x._key === key);
    if (!l) return;
    const { _key, ...rest } = l;
    setEntry(rest);
    setEditingKey(key);
    setFieldErrors({});
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const deleteLine = (key: string) => {
    const next = linesRef.current.filter((x) => x._key !== key);
    linesRef.current = next;
    setLines(next);
    toast.success("Activity removed");
  };

  const afterPersist = async ({ id }: { id: number | string }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await stateOfficeApi[activeReportType].get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<string>();
    for (const line of pending) {
      const match = saved.find((s) =>
        !used.has(String(s.id)) &&
        s.activity_category === line.activity_category &&
        (s.activity_date ?? "").slice(0, 10) === line.activity_date &&
        (s.specific_activity ?? "") === line.specific_activity
      );
      if (!match) continue;
      used.add(String(match.id));
      await stateOfficeApi[activeReportType].uploadLineFiles(id, match.id, line.supportingFiles);
    }
    const cleared = linesRef.current.map((l) => ({ ...l, supportingFiles: [] as File[] }));
    linesRef.current = cleared;
    setLines(cleared);
  };

  return (
    <StateOfficeFormShell
      reportType={activeReportType}
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle="Enrolment Drives"
      pageSubtitle={config.title}
      hideFooterActions
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => {
        if (!driveKey) return "Select an enrolment drive type";
        if (linesRef.current.length === 0) return `Add at least one ${config.title} activity`;
        return null;
      }}
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
      {({ submitting, saving, persist, requestSubmit, savedId }) => {
        const typeLocked = !!reportId || !!savedId;

        return (
          <div className="space-y-6">
            <div ref={activityFormRef} className="space-y-4">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#0f3d2e]">
                    {editingKey ? "Edit Enrolment Drive Activity" : "New Enrolment Drive Activity"}
                  </h2>
                  {editingKey && (
                    <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#d4e8dc] text-[#145c3f]">
                      Editing
                    </span>
                  )}
                </div>
                {editingKey && (
                  <Button variant="ghost" size="sm" onClick={resetEntry}>
                    Cancel edit
                  </Button>
                )}
              </div>

                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                  <CardContent className="p-4 md:p-5 space-y-6">
                    {/* 1. Drive & Activity Details */}
                    <FieldSection title="Drive & Activity Details">
                      <Field label="Enrolment Drive Type" required error={fieldErrors.drive_type} className="sm:col-span-2 lg:col-span-3">
                        <Select
                          value={driveKey}
                          onValueChange={(v) => changeDriveType(v as EnrolmentDriveKey)}
                          disabled={typeLocked}
                        >
                          <SelectTrigger displayValue={config.title}>
                            <SelectValue placeholder="Select drive type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_DRIVE_TYPES.map((t) => (
                              <SelectItem key={t.key} value={t.key}>{t.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Activity Category" required error={fieldErrors.activity_category}>
                        <Select value={entry.activity_category} onValueChange={(v) => set("activity_category", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((a) => (
                              <SelectItem key={a.label} value={a.label}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Activity Date" required error={fieldErrors.activity_date}>
                        <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                      </Field>
                      <Field label="Specific Activity Carried Out" className="sm:col-span-2 lg:col-span-1">
                        <Input value={entry.specific_activity} placeholder="Describe specific activity" onChange={(e) => set("specific_activity", e.target.value)} />
                      </Field>
                      <MultiSelectField
                        label="Program Supported"
                        options={ENROLMENT_DRIVE_PROGRAMS.map((p) => p.label)}
                        value={entry.programs_supported}
                        onChange={(v) => set("programs_supported", v)}
                        placeholder="Select programs"
                        className="sm:col-span-2 lg:col-span-3"
                      />
                    </FieldSection>

                    {/* 2. Audience & Location Reach */}
                    <FieldSection title="Target Audience & Location Reach">
                      <Field label="Location Category">
                        <Select
                          value={entry.location_category}
                          onValueChange={(v) => setEntry((p) => ({ ...p, location_category: v, location_name: "" }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(ENROLMENT_DRIVE_LOCATIONS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Location Name">
                        <Select value={entry.location_name} onValueChange={(v) => set("location_name", v)} disabled={!locationNames.length}>
                          <SelectTrigger><SelectValue placeholder={locationNames.length ? "Select location" : "Choose a category first"} /></SelectTrigger>
                          <SelectContent>
                            {locationNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <MultiSelectField
                        label="Target Audience"
                        options={ENROLMENT_DRIVE_TARGET_AUDIENCES}
                        value={entry.target_audience}
                        onChange={(v) => set("target_audience", v)}
                        placeholder="Select target audience"
                        className="sm:col-span-2 lg:col-span-1"
                      />
                      <Field label="Planned Target Audience">
                        <Input type="number" min={0} value={entry.planned_target_audience} onChange={(e) => set("planned_target_audience", e.target.value)} placeholder="0" />
                      </Field>
                      <Field label="Target Audience Reached">
                        <Input type="number" min={0} value={entry.target_audience_reached} onChange={(e) => set("target_audience_reached", e.target.value)} placeholder="0" />
                      </Field>
                      <Field label="Number of Leads Generated">
                        <Input type="number" min={0} value={entry.leads_generated} onChange={(e) => set("leads_generated", e.target.value)} placeholder="0" />
                      </Field>
                      <Field label="Linked enrolments (auto)">
                        <Input
                          type="number"
                          min={0}
                          value={entry.new_enrolments}
                          readOnly
                          disabled
                          placeholder="Calculated from linked enrolment records"
                          title="Enrolment counts are calculated from linked enrolment records in the Enrolment Drives workspace"
                        />
                      </Field>
                    </FieldSection>

                    {/* 3. Funding & Evidence */}
                    <FieldSection title="Funding, Status & Supporting Evidence">
                      <Field label="Funding Option" required error={fieldErrors.funding_option}>
                        <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_DRIVE_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      {isBudgeted && (
                        <>
                          <Field label="Activity Budget (₦)" required error={fieldErrors.activity_budget}>
                            <Input type="number" min={0} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} placeholder="0.00" />
                          </Field>
                          <Field label="Approved Amount (₦)" required error={fieldErrors.approved_amount}>
                            <Input type="number" min={0} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} placeholder="0.00" />
                          </Field>
                        </>
                      )}
                      <Field label="Activity Status" required error={fieldErrors.activity_status}>
                        <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_DRIVE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Activity Details" className="sm:col-span-2 lg:col-span-3">
                        <Textarea rows={2} value={entry.activity_details} placeholder="Describe details of the activity..." onChange={(e) => set("activity_details", e.target.value)} />
                      </Field>
                      <Field label="Supporting Evidence" className="sm:col-span-2 lg:col-span-3">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))}
                        />
                        {entry.supporting_documents.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">Saved: {entry.supporting_documents.map((d) => d.name).join(", ")}</p>
                        )}
                      </Field>
                      <Field label="Remarks / Observations" className="sm:col-span-2 lg:col-span-3">
                        <Textarea rows={2} value={entry.remarks} placeholder="Any additional notes or observations..." onChange={(e) => set("remarks", e.target.value)} />
                      </Field>
                    </FieldSection>

                    {/* Add to List actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#e8f3ec]">
                      {editingKey ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-slate-600"
                          onClick={resetEntry}
                        >
                          <ArrowLeft className="w-4 h-4" /> Cancel edit
                        </Button>
                      ) : <div />}

                      <Button
                        type="button"
                        className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-2 text-xs font-semibold shadow-xs"
                        onClick={saveLine}
                      >
                        <Plus className="w-4 h-4" /> {editingKey ? "Update list" : "Add to list"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 2. Table UNDER THE FORM: Activity Register */}
              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
                    Activity Register
                  </h3>
                  <p className="text-[11px] text-[#145c3f]">
                    {lines.length} activit{lines.length === 1 ? "y" : "ies"} recorded
                  </p>
                </div>
                <CardContent className="p-0 bg-white">
                  {lines.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      No activities added to the list yet. Complete the form above and click &ldquo;Add to list&rdquo;.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                            {["Date", "Activity", "Funding", "Approved (₦)", "Location", "Programs", "Reached", "Leads", "Enrolments", "Status", "Evidence", "Action"].map((h) => (
                              <TableHead key={h} className={`text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l) => (
                            <TableRow key={l._key} className="hover:bg-[#f4f7f5]">
                              <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                              <TableCell className="text-sm font-medium">
                                {l.activity_category || "—"}
                                {l.specific_activity && <div className="text-xs text-slate-500">{l.specific_activity}</div>}
                              </TableCell>
                              <TableCell className="text-xs">{l.funding_option || "—"}</TableCell>
                              <TableCell className="text-sm">{l.approved_amount ? formatAmount(l.approved_amount) : "—"}</TableCell>
                              <TableCell className="text-xs">{l.location_name || l.location_category || "—"}</TableCell>
                              <TableCell className="text-xs">{l.programs_supported.join(", ") || "—"}</TableCell>
                              <TableCell className="text-sm tabular-nums">{l.target_audience_reached || "—"}</TableCell>
                              <TableCell className="text-sm tabular-nums">{l.leads_generated || "—"}</TableCell>
                              <TableCell className="text-sm tabular-nums">{l.new_enrolments || "—"}</TableCell>
                              <TableCell className="text-xs">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                  l.activity_status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200",
                                )}>
                                  {l.activity_status || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={[...l.supporting_documents.map((d) => d.name), ...l.supportingFiles.map((f) => f.name)].join(", ")}>
                                {[...l.supporting_documents.map((d) => d.name), ...l.supportingFiles.map((f) => f.name)].join(", ") || "—"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[#145c3f]" onClick={() => startEdit(l._key)}>
                                  <Pencil className="w-3.5 h-3.5" /> View / Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => deleteLine(l._key)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={saving || submitting}
                  onClick={() => persist("draft")}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save draft
                </Button>
                <Button
                  className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                  disabled={submitting || lines.length === 0}
                  onClick={() => requestSubmit(() => persist("submitted"))}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : <><Send className="w-4 h-4" /> Submit</>}
                </Button>
              </div>
            </div>
        );
      }}
    </StateOfficeFormShell>
  );
}
