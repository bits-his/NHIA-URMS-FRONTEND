import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, Loader2, Pencil, Plus, Save, Send, Trash2, Upload,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store/store";
import { stateOfficeApi, stockApi } from "@/lib/api";
import { MONTHS, monthLabel, labelOf, parseSupportingDocuments } from "./constants";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  STAKEHOLDER_CATEGORIES,
  STAKEHOLDER_ENGAGEMENT_CATEGORIES,
  STAKEHOLDER_FOLLOW_UP_PRIORITIES,
  STAKEHOLDER_FOLLOW_UP_STATUSES,
  STAKEHOLDER_FUNDED,
  STAKEHOLDER_FUNDING_OPTIONS,
  STAKEHOLDER_LOCATION_BY_CATEGORY,
  STAKEHOLDER_LOCATION_CATEGORIES,
  STAKEHOLDER_PROGRAMS,
  STAKEHOLDER_STATUSES,
  STAKEHOLDER_TARGET_AUDIENCES,
  STAKEHOLDER_YES_NO,
  outcomeCategoriesForEngagement,
  specificOutcomesFor,
} from "./stakeholderTypes";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const uid = () => Math.random().toString(36).slice(2);
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const todayIso = () => new Date().toISOString().slice(0, 10);

type SavedDoc = { name: string; path: string };
type OutcomeRow = { outcome_category: string; specific_outcome: string };
type FollowUpDetails = {
  priority: string;
  action: string;
  responsible: string;
  status: string;
  activity_conducted: string;
  findings: string;
  outstanding_issues: string;
  further_action: string;
};

const blankFollowUp = (): FollowUpDetails => ({
  priority: "",
  action: "",
  responsible: "",
  status: "",
  activity_conducted: "",
  findings: "",
  outstanding_issues: "",
  further_action: "",
});

const blankEntry = () => ({
  activity_date: todayIso(),
  engagement_category: "",
  stakeholder_categories: [] as string[],
  specific_activity: "",
  engagement_purpose: "",
  planned_target_audience: "",
  target_audience_reached: [] as string[],
  location_category: "",
  location_name: "",
  location_specify: "",
  programs_supported: [] as string[],
  funding_option: "",
  activity_budget: "",
  approved_amount: "",
  outcomes: [] as OutcomeRow[],
  follow_up_required: "No",
  follow_up_date: "",
  follow_up_details: blankFollowUp(),
  activity_status: "",
  remarks: "",
  supporting_documents: [] as SavedDoc[],
  supportingFiles: [] as File[],
  follow_up_files: [] as File[],
});

type Entry = ReturnType<typeof blankEntry>;
type Line = Entry & { _key: string; engagement_code?: string | null };

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  activityModule?: string;
  pageTitle?: string;
  activityFilter?: string[];
  allowModuleSelect?: boolean;
  moduleOptions?: { key: string; label: string; filter?: string[] }[];
}

/** PPT section layout, app green palette */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#d4e8dc] bg-white shadow-sm overflow-visible">
      <div className="rounded-t-xl bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
          {title}
        </h3>
      </div>
      <div className="p-4 grid gap-3 grid-cols-1 md:grid-cols-3 bg-[#f4f7f5] rounded-b-xl overflow-visible">
        {children}
      </div>
    </section>
  );
}

/** PPT Report Information — section header + plain inputs (not cards) */
function StakeholderReportInformation({ header }: { header: any }) {
  const user = useSelector((s: RootState) => s.auth.user) as { name?: string } | null;
  const periodText = header.reportMonth && header.reportYear
    ? `${monthLabel(header.reportMonth)} ${header.reportYear}`
    : "—";
  const [allStates, setAllStates] = React.useState<{ id: number; label: string; zoneId: string }[]>([]);

  React.useEffect(() => {
    stockApi.getStates().then((r) => {
      setAllStates(
        (r.data ?? []).map((s: any) => ({
          id: s.id,
          label: s.description,
          zoneId: String(s.zonal_id ?? s.zone_id ?? s.zone?.id ?? ""),
        })),
      );
    }).catch(() => setAllStates([]));
  }, []);

  const stateOptions = allStates.length
    ? allStates
    : (header.states ?? []).map((s: { id: number; label: string }) => ({
      id: s.id,
      label: s.label,
      zoneId: header.zoneId || "",
    }));

  const stateLabel = labelOf(
    stateOptions.map((s) => ({ value: String(s.id), label: s.label })),
    header.stateId,
    "Select…",
  );
  const inputClass = "bg-[#f4f7f5] border-2 border-[#1a7a52] shadow-xs hover:border-[#0f3d2e] hover:bg-white";

  const onStateChange = (v: string) => {
    const match = stateOptions.find((s) => String(s.id) === v);
    if (match?.zoneId && !header.lockZone && match.zoneId !== header.zoneId) {
      // Avoid header effect clearing state when zone updates from this pick
      if (header.hydratingRef) header.hydratingRef.current = true;
      header.setZoneId(match.zoneId);
      header.setStateId(v);
      stockApi.getStates(match.zoneId).then((r) => {
        // keep header states in sync for payload validation
        if (header.hydratingRef) header.hydratingRef.current = false;
      }).catch(() => {
        if (header.hydratingRef) header.hydratingRef.current = false;
      });
      return;
    }
    header.setStateId(v);
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
          <Label className="text-[11px] font-semibold text-slate-600">State</Label>
          <Select
            value={header.stateId}
            onValueChange={onStateChange}
            disabled={header.lockState}
          >
            <SelectTrigger
              className={cn(inputClass, header.lockState ? "opacity-70" : "")}
              displayValue={stateLabel}
            >
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">Reporting officer</Label>
          <Input
            readOnly
            value={user?.name || "Signed-in user"}
            className={cn(inputClass, "opacity-90")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-600">Reporting month</Label>
          <Input readOnly value={periodText} className={cn(inputClass, "opacity-90")} />
        </div>
      </div>
    </section>
  );
}

function Field({
  label, required, error, children, className,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] font-semibold text-slate-600">
        {label}{required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function MultiSelectField({
  label, options, value, onChange, required, placeholder = "Select",
  className,
}: {
  label: string; options: readonly string[]; value: string[];
  onChange: (v: string[]) => void; required?: boolean; placeholder?: string;
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

  const filtered = options.filter((o) => !query.trim() || o.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={cn("space-y-1.5", className)} ref={rootRef}>
      <Label className="text-[11px] font-semibold text-slate-600">
        {label}{required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
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
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-8 text-xs" autoFocus />
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

/**
 * PPT design:
 * 1) Report details + Activity Register (+ Add Activity)
 * 2) Activity form sections when adding/editing
 * 3) Save Activity → back to register → Submit Report
 */
export default function StakeholderEngagementForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId,
  activityModule: activityModuleProp = "engagement-coordination",
  pageTitle = "Stakeholder Engagement",
  activityFilter: activityFilterProp,
  allowModuleSelect,
  moduleOptions = [],
}: Props) {
  const [moduleKey, setModuleKey] = React.useState(activityModuleProp);
  const selectedModule = moduleOptions.find((m) => m.key === moduleKey);
  const activityModule = allowModuleSelect ? moduleKey : activityModuleProp;
  const activityFilter = allowModuleSelect ? selectedModule?.filter : activityFilterProp;
  const moduleLabel = selectedModule?.label
    ?? moduleOptions.find((m) => m.key === activityModuleProp)?.label
    ?? pageTitle;

  const activities = React.useMemo(() => {
    const all = [...STAKEHOLDER_ENGAGEMENT_CATEGORIES];
    return activityFilter?.length ? all.filter((a) => activityFilter.includes(a.label)) : all;
  }, [activityFilter]);

  const [lines, setLines] = React.useState<Line[]>([]);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const [reportStatus, setReportStatus] = React.useState("draft");

  const [view, setView] = React.useState<"register" | "activity">("register");
  const [entry, setEntry] = React.useState<Entry>(blankEntry);
  const [draftOutcome, setDraftOutcome] = React.useState<OutcomeRow>({ outcome_category: "", specific_outcome: "" });
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const followUpFileRef = React.useRef<HTMLInputElement>(null);

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const setFollow = <K extends keyof FollowUpDetails>(k: K, v: FollowUpDetails[K]) =>
    setEntry((p) => ({ ...p, follow_up_details: { ...p.follow_up_details, [k]: v } }));
  const resetDraftOutcome = () => setDraftOutcome({ outcome_category: "", specific_outcome: "" });

  const isFunded = entry.funding_option === STAKEHOLDER_FUNDED;
  const needsFollowUp = entry.follow_up_required === "Yes";
  const locationNames = STAKEHOLDER_LOCATION_BY_CATEGORY[entry.location_category] ?? [];
  const outcomeCats = outcomeCategoriesForEngagement(entry.engagement_category);
  const draftSpecifics = draftOutcome.outcome_category
    ? specificOutcomesFor(entry.engagement_category, draftOutcome.outcome_category)
    : [];

  const addOutcomeToTable = () => {
    if (!entry.engagement_category) {
      toast.error("Select engagement category first");
      return;
    }
    if (!draftOutcome.outcome_category || !draftOutcome.specific_outcome) {
      toast.error("Select outcome category and specific outcome");
      return;
    }
    const allowed = specificOutcomesFor(entry.engagement_category, draftOutcome.outcome_category);
    if (!allowed.includes(draftOutcome.specific_outcome)) {
      toast.error("Outcome combination is not valid for this engagement category");
      return;
    }
    const dup = entry.outcomes.some(
      (o) =>
        o.outcome_category === draftOutcome.outcome_category
        && o.specific_outcome === draftOutcome.specific_outcome,
    );
    if (dup) {
      toast.error("This outcome is already in the table");
      return;
    }
    setEntry((p) => ({ ...p, outcomes: [...p.outcomes, { ...draftOutcome }] }));
    resetDraftOutcome();
    setFieldErrors((e) => {
      const { outcomes: _, ...rest } = e;
      return rest;
    });
  };

  const fail = (key: string, message: string) => {
    setFieldErrors({ [key]: message });
    toast.error(message);
    return message;
  };

  const startAdd = () => {
    setEntry(blankEntry());
    resetDraftOutcome();
    setEditingKey(null);
    setFieldErrors({});
    setView("activity");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (followUpFileRef.current) followUpFileRef.current.value = "";
  };

  const startEdit = (key: string) => {
    const row = linesRef.current.find((l) => l._key === key);
    if (!row) return;
    const { _key, engagement_code, ...rest } = row;
    setEntry({
      ...blankEntry(),
      ...rest,
      outcomes: (rest.outcomes ?? []).filter((o) => o.outcome_category && o.specific_outcome),
      follow_up_details: { ...blankFollowUp(), ...rest.follow_up_details },
      supportingFiles: [],
      follow_up_files: [],
    });
    resetDraftOutcome();
    setEditingKey(key);
    setFieldErrors({});
    setView("activity");
  };

  const backToRegister = () => {
    setView("register");
    setEditingKey(null);
    setEntry(blankEntry());
    resetDraftOutcome();
    setFieldErrors({});
  };

  const validateActivity = (): string | null => {
    setFieldErrors({});
    const e = entry;
    if (!e.activity_date) return fail("activity_date", "Enter the activity date");
    if (!e.engagement_category) return fail("engagement_category", "Select engagement category");
    if (!e.stakeholder_categories.length) return fail("stakeholder_categories", "Select at least one stakeholder");
    if (!e.specific_activity.trim()) return fail("specific_activity", "Enter the specific engagement activity");
    if (!e.engagement_purpose.trim()) return fail("engagement_purpose", "Enter the engagement purpose");

    if (!e.outcomes.length) return fail("outcomes", "Add at least one outcome to the table");
    for (const o of e.outcomes) {
      const allowed = specificOutcomesFor(e.engagement_category, o.outcome_category);
      if (!allowed.includes(o.specific_outcome)) {
        return fail("outcomes", "Outcome combination is not valid for this engagement category");
      }
    }

    const hasFiles = e.supportingFiles.length > 0 || e.supporting_documents.length > 0;
    if (!hasFiles) return fail("evidence", "Upload supporting evidence");

    if (!e.funding_option) return fail("funding_option", "Select funding option");
    if (e.funding_option === STAKEHOLDER_FUNDED && e.activity_budget === "") {
      return fail("activity_budget", "Enter funding amount");
    }
    if (e.funding_option === STAKEHOLDER_FUNDED && e.approved_amount === "") {
      return fail("approved_amount", "Enter approved amount");
    }

    if (!e.activity_status) return fail("activity_status", "Select activity status");
    if (!e.follow_up_required) return fail("follow_up_required", "Select whether follow-up is required");
    if (e.follow_up_required === "Yes") {
      if (!e.follow_up_date) return fail("follow_up_date", "Enter follow-up visit date");
      if (!e.follow_up_details.action.trim()) return fail("follow_up_action", "Enter follow-up action");
      if (!e.follow_up_details.responsible.trim()) return fail("follow_up_responsible", "Enter responsible officer");
      if (!e.follow_up_details.status) return fail("follow_up_status", "Select follow-up status");
    }
    return null;
  };

  const saveActivity = () => {
    if (validateActivity()) return;
    const meta = activities.find((a) => a.label === entry.engagement_category);
    const clean: Line = {
      ...entry,
      _key: editingKey ?? uid(),
      engagement_code: meta?.code ?? null,
      outcomes: entry.outcomes.filter((o) => o.outcome_category && o.specific_outcome),
      ...(entry.funding_option === STAKEHOLDER_FUNDED ? {} : { activity_budget: "", approved_amount: "" }),
      ...(entry.follow_up_required === "Yes" ? {} : { follow_up_date: "", follow_up_details: blankFollowUp(), follow_up_files: [] }),
    };
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? clean : l))
      : [...linesRef.current, clean];
    linesRef.current = next;
    setLines(next);
    toast.success(editingKey ? "Activity updated" : "Activity saved");
    backToRegister();
  };

  const loadData = (v: any) => {
    const next: Line[] = (v.lines ?? []).map((row: any) => {
      let plannedText = "";
      try {
        const parsed = typeof row.activity_details === "string" ? JSON.parse(row.activity_details) : row.activity_details;
        plannedText = parsed?.planned_target_audience_text ?? "";
      } catch { /* ignore */ }
      const docs = parseSupportingDocuments(row.supporting_documents).filter((d) => d.path) as SavedDoc[];
      const outcomes: OutcomeRow[] = Array.isArray(row.outcomes) && row.outcomes.length
        ? row.outcomes.map((o: any) => ({
          outcome_category: o.outcome_category ?? "",
          specific_outcome: o.specific_outcome ?? "",
        }))
        : [{
          outcome_category: row.outcome_category ?? "",
          specific_outcome: row.specific_outcome ?? "",
        }];
      const fu = row.follow_up_details && typeof row.follow_up_details === "object" ? row.follow_up_details : {};
      return {
        ...blankEntry(),
        _key: uid(),
        engagement_code: row.engagement_code ?? null,
        activity_date: row.activity_date?.slice?.(0, 10) ?? "",
        engagement_category: row.engagement_category ?? "",
        stakeholder_categories: Array.isArray(row.stakeholder_categories) ? row.stakeholder_categories : [],
        specific_activity: row.specific_activity ?? "",
        engagement_purpose: row.engagement_purpose ?? "",
        planned_target_audience: plannedText,
        target_audience_reached: Array.isArray(row.target_audience_reached) ? row.target_audience_reached : [],
        location_category: row.location_category ?? "",
        location_name: row.location_name ?? "",
        location_specify: row.location_specify ?? "",
        programs_supported: Array.isArray(row.programs_supported) ? row.programs_supported : [],
        funding_option: row.funding_option === "Budgeted (Approved Release)" || row.funding_option === "Yes"
          ? "Yes"
          : row.funding_option === "Zero-Cost (Statutory Mandate)" || row.funding_option === "No"
            ? "No"
            : (row.funding_option ?? ""),
        activity_budget: row.activity_budget != null ? String(Number(row.activity_budget)) : "",
        approved_amount: row.approved_amount != null ? String(Number(row.approved_amount)) : "",
        outcomes,
        follow_up_required: row.follow_up_required || "No",
        follow_up_date: row.follow_up_date?.slice?.(0, 10) ?? "",
        follow_up_details: { ...blankFollowUp(), ...fu },
        activity_status: row.activity_status ?? "",
        remarks: row.remarks ?? "",
        supporting_documents: docs,
        supportingFiles: [],
        follow_up_files: [],
      };
    });
    linesRef.current = next;
    setLines(next);
    setReportStatus(v.status || "draft");
    setView("register");
    if (v.activity_module && allowModuleSelect) setModuleKey(v.activity_module);
  };

  const canEditContent = ["draft", "returned"].includes(reportStatus) || !reportId;
  const canSendReview = canEditContent;
  const canFinalSubmit = reportStatus === "endorsed";

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = linesRef.current.filter((l) => l.supportingFiles.length > 0);
    if (!pending.length) return;
    const res = await stateOfficeApi.stakeholder.get(id);
    const saved: any[] = res.data?.lines ?? [];
    const used = new Set<number>();
    for (const line of pending) {
      const match = saved.find((s) =>
        !used.has(s.id)
        && s.engagement_category === line.engagement_category
        && (s.activity_date ?? "").slice(0, 10) === line.activity_date,
      );
      if (!match) continue;
      used.add(match.id);
      await stateOfficeApi.stakeholder.uploadLineFiles(id, match.id, line.supportingFiles);
    }
  };

  const toPayloadLine = (l: Line) => {
    const meta = activities.find((a) => a.label === l.engagement_category)
      ?? STAKEHOLDER_ENGAGEMENT_CATEGORIES.find((a) => a.label === l.engagement_category);
    const first = l.outcomes.find((o) => o.outcome_category && o.specific_outcome) ?? l.outcomes[0];
    return {
      engagement_code: l.engagement_code ?? meta?.code ?? null,
      activity_date: l.activity_date || null,
      engagement_category: l.engagement_category,
      stakeholder_categories: l.stakeholder_categories,
      stakeholder_names: l.stakeholder_categories.join(", ") || null,
      specific_activity: l.specific_activity || null,
      engagement_purpose: l.engagement_purpose || null,
      funding_option: l.funding_option || null,
      activity_budget: l.funding_option === STAKEHOLDER_FUNDED ? numOrNull(l.activity_budget) : null,
      approved_amount: l.funding_option === STAKEHOLDER_FUNDED ? numOrNull(l.approved_amount) : null,
      planned_target_audience: null,
      target_audience_reached: l.target_audience_reached,
      location_category: l.location_category || null,
      location_name: l.location_name || null,
      location_specify: l.location_specify || null,
      programs_supported: l.programs_supported,
      follow_up_required: l.follow_up_required || null,
      follow_up_date: l.follow_up_required === "Yes" ? (l.follow_up_date || null) : null,
      follow_up_details: l.follow_up_required === "Yes" ? l.follow_up_details : null,
      supporting_documents: l.supporting_documents,
      outcome_category: first?.outcome_category || null,
      specific_outcome: first?.specific_outcome || null,
      outcomes: l.outcomes.filter((o) => o.outcome_category && o.specific_outcome),
      activity_status: l.activity_status || null,
      remarks: l.remarks || null,
      activity_details: l.planned_target_audience
        ? JSON.stringify({ planned_target_audience_text: l.planned_target_audience })
        : null,
    };
  };

  const inputClass = "bg-[#f4f7f5] border-2 border-[#1a7a52] shadow-xs hover:border-[#0f3d2e] hover:bg-white";

  return (
    <StateOfficeFormShell
      reportType="stakeholder"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={pageTitle}
      hideFooterActions
      hideBasicInfo
      showQuarter
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => (linesRef.current.length === 0 ? "Add at least one activity to the register" : null)}
      buildPayload={(base) => ({
        ...base,
        activity_module: activityModule,
        planned_activities: linesRef.current.length,
        lines: linesRef.current.map((l) => toPayloadLine(l)),
      })}
    >
      {({ submitting, saving, persist, requestSubmit, header }) => (
        <div className="pb-2 space-y-4">
          <StakeholderReportInformation header={header} />

          {view === "register" ? (
            <>
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
                            {["Engagement ID", "Activity date", "Engagement category", "Programme supported", "Status", "Follow-up", "Action"].map((h) => (
                              <TableHead key={h} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l, i) => {
                            const code = l.engagement_code
                              || activities.find((a) => a.label === l.engagement_category)?.code
                              || `ENG-${String(i + 1).padStart(3, "0")}`;
                            return (
                              <TableRow key={l._key} className="hover:bg-[#f4f7f5]">
                                <TableCell className="text-xs font-mono font-semibold text-[#145c3f]">{code}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                                <TableCell className="text-sm font-medium">{l.engagement_category || "—"}</TableCell>
                                <TableCell className="text-xs max-w-[12rem] truncate" title={l.programs_supported.join("; ")}>
                                  {l.programs_supported.join("; ") || "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{l.activity_status || "—"}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{l.follow_up_required || "—"}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {canEditContent ? (
                                    <>
                                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[#145c3f]" onClick={() => startEdit(l._key)}>
                                        <Pencil className="w-3.5 h-3.5" /> View / Edit
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500"
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
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="px-4 py-3 border-t border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2 bg-[#f4f7f5]">
                    {canEditContent ? (
                      <Button variant="outline" className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]" onClick={startAdd}>
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
                {canEditContent && (
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
                        onClick={() => requestSubmit(() => void persist("awaiting_review").then(() => setReportStatus("awaiting_review")))}
                      >
                        {submitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                          : <><Send className="w-4 h-4" /> Send for Review</>}
                      </Button>
                    )}
                  </>
                )}
                {canFinalSubmit && (
                  <Button
                    className="bg-[#0f3d2e] hover:bg-[#145c3f] gap-2"
                    disabled={saving || submitting}
                    onClick={() => requestSubmit(
                      () => void persist("submitted").then(() => setReportStatus("submitted")),
                      {
                        force: true,
                        title: "Confirm final submission",
                        description: "This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
                        confirmLabel: "Yes, final submit",
                      },
                    )}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                      : <><Send className="w-4 h-4" /> Final Submit</>}
                  </Button>
                )}
                {!canEditContent && !canFinalSubmit && (
                  <p className="text-xs text-slate-500">
                    This report is {reportStatus.replace(/_/g, " ")}. Editing is locked.
                  </p>
                )}
                {canFinalSubmit && (
                  <p className="text-xs text-slate-500 w-full text-right">
                    Endorsed by the State Coordinator — make the final submission to complete.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* SLIDE 3–6 — Activity form */}
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold text-[#0f3d2e]">
                  {editingKey ? "Edit Activity" : "New Activity"}
                </h2>
                <Button variant="ghost" size="sm" onClick={backToRegister}>Cancel</Button>
              </div>

              <FormSection title="Activity Details">
                <Field label="Activity date" required error={fieldErrors.activity_date}>
                  <Input type="date" className={inputClass} value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                </Field>
                <Field label="Stakeholder engagement category" required error={fieldErrors.engagement_category}>
                  <Select
                    value={entry.engagement_category}
                    onValueChange={(v) => {
                      setEntry((p) => ({ ...p, engagement_category: v, outcomes: [] }));
                      resetDraftOutcome();
                    }}
                  >
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {activities.map((a) => (
                        <SelectItem key={a.code} value={a.label}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <MultiSelectField
                  label="Stakeholder name(s)"
                  required
                  options={STAKEHOLDER_CATEGORIES}
                  value={entry.stakeholder_categories}
                  onChange={(v) => set("stakeholder_categories", v)}
                  placeholder="Allow selection of multiple stakeholders"
                />
                {fieldErrors.stakeholder_categories && (
                  <p className="text-[11px] font-medium text-rose-600 sm:col-span-3 -mt-1">{fieldErrors.stakeholder_categories}</p>
                )}
                <Field label="Specific engagement activity conducted" required error={fieldErrors.specific_activity} className="sm:col-span-1 lg:col-span-1">
                  <Input className={inputClass} value={entry.specific_activity} onChange={(e) => set("specific_activity", e.target.value)} placeholder="Enter activity conducted" />
                </Field>
                <Field label="Engagement purpose" required error={fieldErrors.engagement_purpose} className="sm:col-span-1 lg:col-span-2">
                  <Input className={inputClass} value={entry.engagement_purpose} onChange={(e) => set("engagement_purpose", e.target.value)} placeholder="Enter purpose" />
                </Field>
              </FormSection>

              <FormSection title="Audience and Location">
                <Field label="Planned target audience">
                  <Input className={inputClass} value={entry.planned_target_audience} onChange={(e) => set("planned_target_audience", e.target.value)} placeholder="Enter planned audience" />
                </Field>
                <MultiSelectField
                  label="Target audience reached"
                  options={STAKEHOLDER_TARGET_AUDIENCES}
                  value={entry.target_audience_reached}
                  onChange={(v) => set("target_audience_reached", v)}
                  placeholder="Select multiple audiences"
                />
                <MultiSelectField
                  label="Programme supported"
                  options={STAKEHOLDER_PROGRAMS.map((p) => p.label)}
                  value={entry.programs_supported}
                  onChange={(v) => set("programs_supported", v)}
                  placeholder="Select multiple programmes"
                />
                <Field label="Location category">
                  <Select
                    value={entry.location_category}
                    onValueChange={(v) => setEntry((p) => ({ ...p, location_category: v, location_name: "" }))}
                  >
                    <SelectTrigger className={inputClass} displayValue={entry.location_category ? entry.location_category.replace(/_/g, " ") : "Select…"}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAKEHOLDER_LOCATION_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Location name">
                  <Select
                    value={entry.location_name}
                    onValueChange={(v) => set("location_name", v)}
                    disabled={!entry.location_category || locationNames.length === 0}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder={!entry.location_category ? "Depends on category" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {locationNames.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Specify location (if needed)">
                  <Input className={inputClass} value={entry.location_specify} onChange={(e) => set("location_specify", e.target.value)} placeholder="Enter exact venue / location / address" />
                </Field>
              </FormSection>

              {/* Outcome mapping: one pair of inputs → Add to table → clear & fill again */}
              <FormSection title="Outcome and Evidence">
                <Field label="Outcome category" required>
                  <Select
                    value={draftOutcome.outcome_category}
                    onValueChange={(v) => setDraftOutcome({ outcome_category: v, specific_outcome: "" })}
                    disabled={!entry.engagement_category}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder={!entry.engagement_category ? "Select engagement category first" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {outcomeCats.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Specific activity outcome" required>
                  <Select
                    value={draftOutcome.specific_outcome}
                    onValueChange={(v) => setDraftOutcome((d) => ({ ...d, specific_outcome: v }))}
                    disabled={!draftOutcome.outcome_category}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder={!draftOutcome.outcome_category ? "Filtered by outcome category" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {draftSpecifics.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                    onClick={addOutcomeToTable}
                  >
                    <Plus className="w-4 h-4" /> Add Outcome
                  </Button>
                </div>

                {entry.outcomes.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-[#d4e8dc] overflow-hidden bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#eef6f1] hover:bg-[#eef6f1]">
                          <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Outcome category</TableHead>
                          <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Specific activity outcome</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entry.outcomes.map((o, idx) => (
                          <TableRow key={`${o.outcome_category}-${o.specific_outcome}-${idx}`}>
                            <TableCell className="text-sm">{o.outcome_category}</TableCell>
                            <TableCell className="text-sm">{o.specific_outcome}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-500"
                                onClick={() => setEntry((p) => ({
                                  ...p,
                                  outcomes: p.outcomes.filter((_, i) => i !== idx),
                                }))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {fieldErrors.outcomes && (
                  <p className="text-[11px] font-medium text-rose-600 sm:col-span-3">{fieldErrors.outcomes}</p>
                )}

                <Field label="Supporting evidence" required error={fieldErrors.evidence} className="sm:col-span-2 lg:col-span-3">
                  <div className="rounded-xl border-2 border-dashed border-[#1a7a52] bg-white px-3 py-3">
                    <label className="flex flex-col gap-1.5 cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0f3d2e]">
                        <Upload className="w-4 h-4" /> Upload attachment (mandatory)
                      </span>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="text-xs"
                        onChange={(e) => set("supportingFiles", Array.from(e.target.files ?? []))}
                      />
                    </label>
                    {(entry.supportingFiles.length > 0 || entry.supporting_documents.length > 0) && (
                      <ul className="mt-2 text-xs text-slate-600 space-y-0.5">
                        {entry.supporting_documents.map((d) => <li key={d.path}>{d.name}</li>)}
                        {entry.supportingFiles.map((f) => <li key={f.name}>{f.name}</li>)}
                      </ul>
                    )}
                  </div>
                </Field>
              </FormSection>

              {/* SLIDE 6 — Funding */}
              <FormSection title="Funding and Budget">
                <Field label="Funding option" required error={fieldErrors.funding_option}>
                  <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Yes / No" /></SelectTrigger>
                    <SelectContent>
                      {STAKEHOLDER_FUNDING_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {isFunded && (
                  <>
                    <Field label="Funding amount" required error={fieldErrors.activity_budget}>
                      <Input type="number" min={0} className={inputClass} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                    </Field>
                    <Field label="Approved amount (₦)" required error={fieldErrors.approved_amount}>
                      <Input type="number" min={0} className={inputClass} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                    </Field>
                  </>
                )}
              </FormSection>

              {/* SLIDE 5 — Status & Follow-up */}
              <FormSection title="Activity Status and Follow-up Decision">
                <Field label="Original activity status" required error={fieldErrors.activity_status}>
                  <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {STAKEHOLDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Follow-up required" required error={fieldErrors.follow_up_required}>
                  <Select value={entry.follow_up_required} onValueChange={(v) => set("follow_up_required", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Yes / No" /></SelectTrigger>
                    <SelectContent>
                      {STAKEHOLDER_YES_NO.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {needsFollowUp && (
                  <>
                    <Field label="Follow-up priority">
                      <Select value={entry.follow_up_details.priority} onValueChange={(v) => setFollow("priority", v)}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Normal / Urgent" /></SelectTrigger>
                        <SelectContent>
                          {STAKEHOLDER_FOLLOW_UP_PRIORITIES.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Follow-up visit date" required error={fieldErrors.follow_up_date}>
                      <Input type="date" className={inputClass} value={entry.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
                    </Field>
                    <Field label="Follow-up action / purpose" required error={fieldErrors.follow_up_action}>
                      <Input className={inputClass} value={entry.follow_up_details.action} onChange={(e) => setFollow("action", e.target.value)} placeholder="Enter action required" />
                    </Field>
                    <Field label="Responsible officer / unit" required error={fieldErrors.follow_up_responsible}>
                      <Input className={inputClass} value={entry.follow_up_details.responsible} onChange={(e) => setFollow("responsible", e.target.value)} />
                    </Field>
                    <Field label="Follow-up status" required error={fieldErrors.follow_up_status}>
                      <Select value={entry.follow_up_details.status} onValueChange={(v) => setFollow("status", v)}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Not started" /></SelectTrigger>
                        <SelectContent>
                          {STAKEHOLDER_FOLLOW_UP_STATUSES.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Follow-up activity conducted">
                      <Input className={inputClass} value={entry.follow_up_details.activity_conducted} onChange={(e) => setFollow("activity_conducted", e.target.value)} placeholder="Enter activity" />
                    </Field>
                    <Field label="Follow-up outcome / findings">
                      <Input className={inputClass} value={entry.follow_up_details.findings} onChange={(e) => setFollow("findings", e.target.value)} placeholder="Enter findings" />
                    </Field>
                    <Field label="Outstanding issues">
                      <Input className={inputClass} value={entry.follow_up_details.outstanding_issues} onChange={(e) => setFollow("outstanding_issues", e.target.value)} placeholder="Enter issues" />
                    </Field>
                    {entry.follow_up_details.outstanding_issues.trim() ? (
                      <Field label="Further action required">
                        <Input className={inputClass} value={entry.follow_up_details.further_action} onChange={(e) => setFollow("further_action", e.target.value)} placeholder="Enter next steps / escalation" />
                      </Field>
                    ) : null}
                    <Field label="Follow-up evidence">
                      <Input
                        ref={followUpFileRef}
                        type="file"
                        multiple
                        className="text-xs bg-white"
                        onChange={(e) => set("follow_up_files", Array.from(e.target.files ?? []))}
                      />
                    </Field>
                  </>
                )}
              </FormSection>

              <p className="text-[11px] text-slate-400 px-1">
                Engagement ID and Program ID are generated by the system.
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" onClick={backToRegister}>Cancel</Button>
                <Button variant="outline" className="gap-2" onClick={saveActivity}>
                  <Save className="w-4 h-4" /> Save Activity
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </StateOfficeFormShell>
  );
}
