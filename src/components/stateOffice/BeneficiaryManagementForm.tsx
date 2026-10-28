import * as React from "react";
import {
  ArrowRightLeft, Building2, ChevronRight, Loader2, Pencil, Plus, Save, Send,
  Trash2, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { stateOfficeApi } from "@/lib/api";
import StateOfficeFormShell from "./StateOfficeFormShell";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import { ProviderSelect } from "./HcpChangeForm";
import {
  EXTRA_DEPENDANT_STATUSES,
  HCP_CHANGE_STATUSES,
  YES_NO_OPTIONS,
  labelOf,
  monthLabel,
  parseSupportingDocuments,
  quarterFromMonth,
} from "./constants";
import {
  BENEFICIARY_ACTIVITIES,
  HCP_REASON_CATEGORIES,
  HMO_REASON_CATEGORIES,
  OTHER_REASON,
  activityApiType,
  activityFromReportType,
  ADDITIONAL_ENTITY_TYPES,
  EXTRA_ENTITY_TYPES,
  decodeDependantRequest,
  encodeDependantProgram,
  entityLabel,
  packReason,
  unpackReason,
  type BeneficiaryActivityKey,
} from "./beneficiaryManagementTypes";

const BENEFICIARY_ACTIVITY_ICONS: Record<BeneficiaryActivityKey, LucideIcon> = {
  additional: UserPlus,
  extra: Users,
  provider: ArrowRightLeft,
  mda: Building2,
};

const uid = () => Math.random().toString(36).slice(2);
type SavedDoc = { name: string; path: string };

const IDENTITY_FIELDS = [
  { key: "surname", label: "Surname" },
  { key: "first_name", label: "First name" },
  { key: "middle_name", label: "Middle name" },
  { key: "nin", label: "NIN" },
  { key: "blood_group", label: "Blood group" },
  { key: "marital_status", label: "Marital status" },
  { key: "state_of_origin", label: "State of origin" },
  { key: "lga_of_origin", label: "LGA of origin" },
  { key: "state_of_residence", label: "State of residence" },
  { key: "lga_of_residence", label: "LGA of residence" },
  { key: "phone_number", label: "Phone number" },
] as const;

type PrincipalOption = {
  value: string;
  label: string;
  sub?: string;
  name: string;
  nhia: string;
  stateId: string;
  /** All known state identifiers (code / id) for geo matching. */
  stateKeys: string[];
  program: string;
  enrolmentType: string;
  organization: string;
  identity: Record<string, string>;
  hcf: string;
  alternative_provider: string;
  enrolment_reference_id: string;
};

function asRecord(raw: unknown): Record<string, string> {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, v == null ? "" : String(v)]),
  );
}

function isDependantEntity(entity: string) {
  const v = entity.trim().toLowerCase();
  if (!v) return false;
  if (/^principal\b/.test(v)) return false;
  return /^(spouse|child|parent|dependant|dependent)\b/.test(v) || /^child[_\s]?\d/.test(v);
}

function reportStateKeys(report: {
  state_id?: number | string;
  state_code?: string;
  state?: { id?: number | string; code?: string };
}): string[] {
  return [
    report.state_code,
    report.state_id,
    report.state?.code,
    report.state?.id,
  ]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).trim());
}

/** Build principal pick-list from Enrolment Activity reports (category = enrolment). */
function principalsFromReports(reports: {
  state_id?: number | string;
  state_code?: string;
  state?: { id?: number | string; code?: string };
  reference_id?: string;
  id?: number | string;
  category?: string;
  program_details?: unknown;
  program_name?: string | null;
  enrolment_type?: string | null;
  lines?: unknown[];
}[]): PrincipalOption[] {
  const out: PrincipalOption[] = [];
  const seen = new Set<string>();

  for (const report of reports) {
    const enrolmentRef = String(report.reference_id || report.id || "");
    const stateKeys = reportStateKeys(report);
    const stateId = stateKeys[0] || "";

    // New pack: one row = one activity; FE still receives synthetic lines[0].
    const rawLines = Array.isArray(report.lines) && report.lines.length
      ? report.lines
      : [report];

    for (const rawLine of rawLines) {
      const line = rawLine as {
        id?: number | string;
        category?: string | null;
        program_details?: unknown;
        program_name?: string | null;
        enrolment_type?: string | null;
      };
      const category = String(line.category || report.category || "").trim().toLowerCase();
      if (category && category !== "enrolment") continue;

      const d = asRecord(line.program_details ?? report.program_details);
      const enrolmentType = String(line.enrolment_type || report.enrolment_type || d.enrolment_type || "").trim();
      const program = String(line.program_name || report.program_name || d.program_name || d.program || "").trim();
      const entity = String(d.entity_type || "").trim();
      if (isDependantEntity(entity)) continue;

      const name = [d.surname, d.first_name, d.middle_name].filter(Boolean).join(" ").trim()
        || String(d.enrollee_name || "").trim();
      if (!name) continue;

      const nhia = String(d.nhia_number || d.nhia || "").trim()
        || (d.nin ? `NIN ${d.nin}` : "")
        || (enrolmentRef ? enrolmentRef : "")
        || (line.id ? `ENR-${line.id}` : "—");
      const value = `${name}|${nhia}|${enrolmentRef}`;
      if (seen.has(value)) continue;
      seen.add(value);

      const identity: Record<string, string> = {};
      for (const field of IDENTITY_FIELDS) identity[field.key] = d[field.key] || "";
      if (!identity.surname && name) {
        const parts = name.split(/\s+/);
        identity.surname = parts[0] || "";
        if (!identity.first_name && parts.length > 1) identity.first_name = parts.slice(1).join(" ");
      }
      identity.hmo = d.hmo || "";

      out.push({
        value,
        label: name,
        sub: [nhia, program, enrolmentType].filter(Boolean).join(" · "),
        name,
        nhia,
        stateId,
        stateKeys,
        program,
        enrolmentType: enrolmentType || program,
        organization: d.organization_mda || d.organization_name || "",
        identity,
        hcf: d.hcf || "",
        alternative_provider: d.alternative_provider || "",
        enrolment_reference_id: enrolmentRef,
      });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function splitSavedDocs(raw: unknown) {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = []; }
  }
  const fields: Record<string, string> = {};
  const files: SavedDoc[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      if ("field" in item && (item as { field?: string }).field) {
        fields[String((item as { field: string }).field)] = String((item as { value?: string }).value ?? "");
      } else if ((item as { path?: string }).path) {
        files.push({
          name: String((item as { name?: string }).name || "Document"),
          path: String((item as { path: string }).path),
        });
      }
    }
  }
  return { fields, files };
}

function readDetails(raw: unknown): Record<string, string> {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, v == null ? "" : String(v)]),
  );
}

type DepEntry = {
  kind: "dependant";
  request: "additional" | "extra";
  enrollee_name: string;
  principle_nhia_number: string;
  principal_key: string;
  enrolment_reference_id: string;
  program_name: string;
  enrolment_type: string;
  identity: Record<string, string>;
  relationship_kind: string;
  entity_type: string;
  hcf: string;
  alternative_provider: string;
  request_date: string;
  process_end_date: string;
  line_status: string;
  supporting_documents: SavedDoc[];
  supportingFiles: File[];
};

type ProviderEntry = {
  kind: "provider";
  record_date: string;
  enrollee_key: string;
  enrollee_name: string;
  nhia_number: string;
  enrolment_reference_id: string;
  entity_type: "" | "hcp" | "hmo";
  program: string;
  mda: string;
  current_hcp_hmo: string;
  new_hcp_hmo: string;
  reason_category: string;
  reason_other: string;
  met_criteria: string;
  line_status: string;
  supporting_documents: SavedDoc[];
  supportingFiles: File[];
};

type MdaEntry = {
  kind: "mda";
  selection_date: string;
  mda: string;
  former_hmo: string;
  reason_for_change: string;
  hmos_invited: string;
  hmos_attended: string;
  compliance_guideline: string;
  transparent_process: string;
  selected_hmo: string;
  line_status: string;
  remarks: string;
  evidenceFile: File | null;
  reportFile: File | null;
  evidence_path: string;
  evidence_name: string;
  report_path: string;
  report_name: string;
};

type Entry = DepEntry | ProviderEntry | MdaEntry;
type Line = Entry & { _key: string };

const blankDep = (request: "additional" | "extra"): DepEntry => ({
  kind: "dependant",
  request,
  enrollee_name: "",
  principle_nhia_number: "",
  principal_key: "",
  enrolment_reference_id: "",
  program_name: "",
  enrolment_type: "",
  identity: {},
  relationship_kind: "",
  entity_type: "",
  hcf: "",
  alternative_provider: "",
  request_date: "",
  process_end_date: "",
  line_status: "pending",
  supporting_documents: [],
  supportingFiles: [],
});

const blankProvider = (): ProviderEntry => ({
  kind: "provider",
  record_date: "",
  enrollee_key: "",
  enrollee_name: "",
  nhia_number: "",
  enrolment_reference_id: "",
  entity_type: "",
  program: "",
  mda: "",
  current_hcp_hmo: "",
  new_hcp_hmo: "",
  reason_category: "",
  reason_other: "",
  met_criteria: "",
  line_status: "pending",
  supporting_documents: [],
  supportingFiles: [],
});

const blankMda = (): MdaEntry => ({
  kind: "mda",
  selection_date: "",
  mda: "",
  former_hmo: "",
  reason_for_change: "",
  hmos_invited: "",
  hmos_attended: "",
  compliance_guideline: "",
  transparent_process: "",
  selected_hmo: "",
  line_status: "pending",
  remarks: "",
  evidenceFile: null,
  reportFile: null,
  evidence_path: "",
  evidence_name: "",
  report_path: "",
  report_name: "",
});

function blankFor(activity: BeneficiaryActivityKey): Entry {
  if (activity === "provider") return blankProvider();
  if (activity === "mda") return blankMda();
  return blankDep(activity);
}

function inferRelationship(request: "additional" | "extra", entity: string, saved?: string) {
  if (saved) return saved;
  if (entity.startsWith("child")) return "child";
  if (request === "additional" && entity === "spouse") return "spouse";
  if (request === "extra" && (entity === "spouse" || entity === "parent" || entity === "child")) return entity;
  return "";
}

function Field({
  label, required, children, className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-sm font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-[#e8f3ec] pt-4 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-[#0f3d2e]">{title}</h3>
        {hint ? <p className="text-sm text-slate-600 mt-0.5">{hint}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

interface Props {
  reportType: string;
  reportId?: number | string | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** When creating from an activity tab, skip the activity picker. */
  initialActivity?: BeneficiaryActivityKey | null;
}

export default function BeneficiaryManagementForm({
  reportType, reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, initialActivity,
}: Props) {
  const seededActivity = !reportId && initialActivity
    && BENEFICIARY_ACTIVITIES.some((a) => a.key === initialActivity)
    ? initialActivity
    : null;
  const initial = reportId ? activityFromReportType(reportType) : seededActivity;
  const [activity, setActivity] = React.useState<BeneficiaryActivityKey | null>(initial);
  // New from a hub tab → open the activity form immediately (not the empty register).
  const [view, setView] = React.useState<"register" | "activity">(
    reportId ? "register" : "activity",
  );
  const [lines, setLines] = React.useState<Line[]>([]);
  const [entry, setEntry] = React.useState<Entry>(() => blankFor(initial ?? "extra"));
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const categoryLocked = Boolean(seededActivity);

  React.useEffect(() => {
    if (reportId) return;
    if (!seededActivity) return;
    setActivity(seededActivity);
    setEntry(blankFor(seededActivity));
    setView("activity");
    setEditingKey(null);
    setLines([]);
  }, [reportId, seededActivity]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const activityRef = React.useRef(activity);
  activityRef.current = activity;
  const savedIdRef = React.useRef<number | null>(null);
  const [principals, setPrincipals] = React.useState<PrincipalOption[]>([]);
  const [principalsError, setPrincipalsError] = React.useState("");
  const [principalsLoading, setPrincipalsLoading] = React.useState(false);
  const [reportStatus, setReportStatus] = React.useState<"draft" | "submitted" | "approved">("draft");
  const [endorsed, setEndorsed] = React.useState(false);
  const [reviewNote, setReviewNote] = React.useState("");

  React.useEffect(() => {
    if (activity !== "additional" && activity !== "extra" && activity !== "provider") return;
    let cancelled = false;
    setPrincipalsError("");
    setPrincipalsLoading(true);
    stateOfficeApi.enrolment.list({ category: "enrolment" })
      .then((res) => {
        if (cancelled) return;
        setPrincipals(principalsFromReports(res.data ?? []));
      })
      .catch((err: { message?: string }) => {
        if (cancelled) return;
        setPrincipals([]);
        setPrincipalsError(err?.message || "Failed to load enrolment");
      })
      .finally(() => {
        if (!cancelled) setPrincipalsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activity]);

  const apiType = activityApiType(activity ?? "extra");
  const meta = BENEFICIARY_ACTIVITIES.find((a) => a.key === activity);

  const resetEntry = (next: BeneficiaryActivityKey | null = activity) => {
    setEntry(blankFor(next ?? "extra"));
    setEditingKey(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const leave = onCancel ?? onBack;
  const goBack = () => {
    if (categoryLocked) {
      leave();
      return;
    }
    if (activityRef.current && !reportId && !savedIdRef.current) {
      setActivity(null);
      linesRef.current = [];
      setLines([]);
      resetEntry(null);
      return;
    }
    leave();
  };

  const pickActivity = (key: BeneficiaryActivityKey) => {
    if (reportId || savedIdRef.current) return;
    if (key === activity) {
      setView("activity");
      return;
    }
    if (linesRef.current.length) {
      linesRef.current = [];
      setLines([]);
      toast.message("Register cleared for the new activity");
    }
    setActivity(key);
    resetEntry(key);
    setView("activity");
  };

  const loadData = (v: any) => {
    const status = v?.status === "submitted" || v?.status === "approved" ? v.status : "draft";
    setReportStatus(status);
    setEndorsed(!!v?.endorsed);
    setReviewNote(typeof v?.coordinator_review_note === "string" ? v.coordinator_review_note : "");
    const editable = status === "draft";
    if (apiType === "extra-dependant" || (!activity && reportType === "extra-dependant")) {
      const next: Line[] = (v.lines ?? []).map((l: any) => {
        const request = decodeDependantRequest(l.program || l.request_kind, l.relationship || l.dependant_entity);
        const saved = splitSavedDocs(l.supporting_documents);
        return {
          _key: uid(),
          kind: "dependant" as const,
          request: (l.request_kind as "additional" | "extra") || request,
          enrollee_name: l.enrollee_name ?? "",
          principle_nhia_number: l.principle_nhia_number ?? l.nhia_number ?? "",
          principal_key: `${l.enrollee_name ?? ""}|${l.principle_nhia_number ?? l.nhia_number ?? ""}`,
          enrolment_reference_id: l.enrolment_reference_id ?? v.enrolment_reference_id ?? "",
          program_name: l.program_name || saved.fields.program_name || String(l.program || "FSSHIP").split("|")[0],
          enrolment_type: saved.fields.enrolment_type ?? "",
          identity: {
            ...Object.fromEntries(IDENTITY_FIELDS.map((f) => [f.key, l[f.key] ?? saved.fields[f.key] ?? ""])),
            hmo: l.hmo_name ?? saved.fields.hmo ?? "",
          },
          relationship_kind: l.relationship_kind || inferRelationship(request, l.relationship ?? l.dependant_entity ?? "", saved.fields.relationship),
          entity_type: l.dependant_entity ?? l.relationship ?? "",
          hcf: l.hcf ?? saved.fields.hcf ?? "",
          alternative_provider: l.alternative_provider ?? saved.fields.alternative_provider ?? "",
          request_date: l.request_date?.slice?.(0, 10) ?? "",
          process_end_date: l.process_end_date?.slice?.(0, 10) ?? "",
          line_status: l.line_status ?? l.activity_status ?? "pending",
          supporting_documents: saved.files,
          supportingFiles: [] as File[],
        };
      });
      const request = next[0]?.kind === "dependant" ? next[0].request : "extra";
      setActivity(request);
      setEntry(blankDep(request));
      linesRef.current = next;
      setLines(next);
      setEditingKey(null);
      setView(next.length === 0 && editable ? "activity" : "register");
      return;
    }
    if (apiType === "hcf-change") {
      const next: Line[] = (v.lines ?? []).map((l: any) => {
        const reason = l.reason_category
          ? { category: l.reason_category, other: l.reason_other || "" }
          : unpackReason(l.reason_for_transfer);
        const details = readDetails(l.details);
        return {
          _key: uid(),
          kind: "provider" as const,
          record_date: l.record_date?.slice?.(0, 10) ?? "",
          enrollee_key: `${l.enrollee_name ?? ""}|${l.nhia_number ?? ""}`,
          enrollee_name: l.enrollee_name ?? "",
          nhia_number: l.nhia_number ?? "",
          enrolment_reference_id: l.enrolment_reference_id ?? v.enrolment_reference_id ?? "",
          entity_type: l.entity_type === "hmo" || l.entity_type === "hcp" ? l.entity_type : (l.change_entity_type || ""),
          program: l.program_name || details.program || "",
          mda: l.mda || details.mda || "",
          current_hcp_hmo: l.current_provider || l.current_hcp_hmo || "",
          new_hcp_hmo: l.new_provider || l.new_hcp_hmo || "",
          reason_category: reason.category,
          reason_other: reason.other,
          met_criteria: l.met_criteria ?? "",
          line_status: l.line_status ?? l.activity_status ?? "pending",
          supporting_documents: parseSupportingDocuments(l.supporting_documents).filter((d) => d.path) as SavedDoc[],
          supportingFiles: [] as File[],
        };
      });
      linesRef.current = next;
      setLines(next);
      setEditingKey(null);
      setView(next.length === 0 && editable ? "activity" : "register");
      return;
    }
    const next: Line[] = (v.lines ?? []).map((l: any) => {
      const details = readDetails(l.details);
      return {
        _key: uid(),
        kind: "mda" as const,
        selection_date: l.selection_date?.slice?.(0, 10) ?? "",
        mda: l.mda ?? "",
        former_hmo: l.former_hmo ?? "",
        reason_for_change: l.reason_for_change ?? "",
        hmos_invited: l.hmos_invited != null ? String(l.hmos_invited) : "",
        hmos_attended: l.hmos_attended != null ? String(l.hmos_attended) : "",
        compliance_guideline: l.compliance_guideline ?? "",
        transparent_process: l.transparent_process ?? "",
        selected_hmo: l.selected_hmo ?? "",
        line_status: l.line_status || l.activity_status || details.status || "pending",
        remarks: l.remarks ?? details.remarks ?? "",
        evidenceFile: null,
        reportFile: null,
        evidence_path: l.evidence_path ?? "",
        evidence_name: l.evidence_name ?? "",
        report_path: l.report_path ?? "",
        report_name: l.report_name ?? "",
      };
    });
    linesRef.current = next;
    setLines(next);
    setEditingKey(null);
    setView(next.length === 0 && editable ? "activity" : "register");
  };

  const startAdd = () => {
    resetEntry();
    setView("activity");
  };

  const startEdit = (key: string) => {
    const row = linesRef.current.find((l) => l._key === key);
    if (!row) return;
    const { _key, ...rest } = row;
    setEntry(rest);
    setEditingKey(key);
    setView("activity");
    if (fileRef.current) fileRef.current.value = "";
  };

  const backToRegister = () => {
    resetEntry();
    if (linesRef.current.length === 0 && !reportId && !savedIdRef.current) {
      if (categoryLocked) {
        leave();
        return;
      }
      setActivity(null);
      return;
    }
    setView("register");
  };

  const saveActivity = () => {
    if (entry.kind === "dependant") {
      if (!entry.enrollee_name.trim()) {
        toast.error("Select the principal enrollee");
        return;
      }
      if (!entry.entity_type) {
        toast.error("Select the dependant");
        return;
      }
    } else if (entry.kind === "provider") {
      if (!entry.enrollee_name.trim() || !entry.nhia_number.trim() || !entry.entity_type) {
        toast.error("Enter the enrollee, NHIA number, and request type");
        return;
      }
      if (!entry.current_hcp_hmo || !entry.new_hcp_hmo || !entry.reason_category) {
        toast.error("Select the current provider, new provider, and reason");
        return;
      }
      if (entry.reason_category === OTHER_REASON && !entry.reason_other.trim()) {
        toast.error("Specify the reason");
        return;
      }
    } else if (!entry.mda.trim() || !entry.selected_hmo) {
      toast.error("Enter the MDA and selected HMO");
      return;
    }
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...entry, _key: editingKey } : l))
      : [...linesRef.current, { ...entry, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    toast.success(editingKey ? "Activity updated" : "Activity saved");
    resetEntry();
    setView("register");
  };

  const afterPersist = async ({ id }: { id: number }) => {
    if (apiType === "extra-dependant") {
      const pending = linesRef.current.filter((l) => l.kind === "dependant" && l.supportingFiles.length);
      if (pending.length) {
        const res = await stateOfficeApi["extra-dependant"].get(id);
        const saved: any[] = res.data?.lines ?? [];
        const used = new Set<number>();
        for (const line of pending) {
          if (line.kind !== "dependant") continue;
          const match = saved.find((s) =>
            !used.has(s.id)
            && s.enrollee_name === line.enrollee_name
            && s.principle_nhia_number === line.principle_nhia_number,
          );
          if (!match) continue;
          used.add(match.id);
          await stateOfficeApi["extra-dependant"].uploadLineFiles(id, match.id, line.supportingFiles);
        }
      }
    }
    if (apiType === "hcf-change") {
      const pending = linesRef.current.filter((l) => l.kind === "provider" && l.supportingFiles.length);
      if (pending.length) {
        const res = await stateOfficeApi["hcf-change"].get(id);
        const saved: any[] = res.data?.lines ?? [];
        const used = new Set<number>();
        for (const line of pending) {
          if (line.kind !== "provider") continue;
          const match = saved.find((s) =>
            !used.has(s.id) && s.enrollee_name === line.enrollee_name && s.nhia_number === line.nhia_number,
          );
          if (!match) continue;
          used.add(match.id);
          await stateOfficeApi["hcf-change"].uploadLineFiles(id, match.id, line.supportingFiles);
        }
      }
    }
    if (apiType === "hmo-selection") {
      const pending = linesRef.current.filter((l) => l.kind === "mda" && (l.evidenceFile || l.reportFile));
      if (pending.length) {
        const res = await stateOfficeApi["hmo-selection"].get(id);
        const saved: any[] = res.data?.lines ?? [];
        const used = new Set<number>();
        for (const line of pending) {
          if (line.kind !== "mda") continue;
          const match = saved.find((s) =>
            !used.has(s.id)
            && s.mda === line.mda
            && (s.selection_date?.slice?.(0, 10) ?? "") === (line.selection_date || ""),
          );
          if (!match) continue;
          used.add(match.id);
          if (line.evidenceFile) await stateOfficeApi["hmo-selection"].uploadLineFile(id, match.id, line.evidenceFile, "evidence");
          if (line.reportFile) await stateOfficeApi["hmo-selection"].uploadLineFile(id, match.id, line.reportFile, "report");
        }
      }
    }
    const cleared = linesRef.current.map((l) => {
      if (l.kind === "dependant" || l.kind === "provider") return { ...l, supportingFiles: [] as File[] };
      if (l.kind === "mda") return { ...l, evidenceFile: null, reportFile: null };
      return l;
    });
    linesRef.current = cleared;
    setLines(cleared);
  };

  const reasons = entry.kind === "provider" && entry.entity_type === "hmo"
    ? HMO_REASON_CATEGORIES
    : HCP_REASON_CATEGORIES;

  return (
    <StateOfficeFormShell
      reportType={apiType}
      reportId={reportId}
      onBack={onBack}
      onCancel={goBack}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle="Beneficiary Management"
      pageSubtitle={meta?.label ?? "Select an activity"}
      hideFooterActions
      hideBasicInfo
      showQuarter
      preserveHeader
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => {
        if (!activityRef.current) return "Select an activity";
        if (linesRef.current.length === 0) return "Add at least one row to the register";
        return null;
      }}
      buildPayload={(base) => {
        if (apiType === "extra-dependant") {
          return {
            ...base,
            lines: linesRef.current.filter((l) => l.kind === "dependant").map((l) => ({
              id: (l as Line & { id?: string }).id,
              enrollee_name: l.enrollee_name,
              principle_nhia_number: l.principle_nhia_number,
              nhia_number: l.principle_nhia_number,
              enrolment_reference_id: l.enrolment_reference_id || null,
              request_kind: l.request,
              dependant_entity: l.entity_type,
              relationship: l.entity_type,
              relationship_kind: l.relationship_kind,
              program: encodeDependantProgram(l.request, l.program_name),
              program_name: l.program_name || null,
              request_date: l.request_date || null,
              process_end_date: l.process_end_date || null,
              line_status: l.line_status || "pending",
              hcf: l.hcf || null,
              alternative_provider: l.alternative_provider || null,
              hmo_name: l.identity.hmo || null,
              ...Object.fromEntries(IDENTITY_FIELDS.map((f) => [f.key, l.identity[f.key] || null])),
              identity: l.identity,
              supporting_documents: l.supporting_documents,
            })),
          };
        }
        if (apiType === "hcf-change") {
          return {
            ...base,
            lines: linesRef.current.filter((l) => l.kind === "provider").map((l) => ({
              record_date: l.record_date || null,
              enrollee_name: l.enrollee_name,
              nhia_number: l.nhia_number,
              enrolment_reference_id: l.enrolment_reference_id || null,
              entity_type: l.entity_type,
              change_entity_type: l.entity_type,
              current_hcp_hmo: l.current_hcp_hmo,
              new_hcp_hmo: l.new_hcp_hmo,
              current_provider: l.current_hcp_hmo,
              new_provider: l.new_hcp_hmo,
              reason_category: l.reason_category || null,
              reason_other: l.reason_other || null,
              reason_for_transfer: packReason(l.reason_category, l.reason_other),
              met_criteria: l.met_criteria || null,
              request_date: l.record_date || null,
              line_status: l.line_status || "pending",
              program_name: l.program || null,
              mda: l.mda || null,
              supporting_documents: l.supporting_documents,
            })),
          };
        }
        return {
          ...base,
          lines: linesRef.current.filter((l) => l.kind === "mda").map((l) => ({
            selection_date: l.selection_date || null,
            mda: l.mda,
            former_hmo: l.former_hmo || null,
            reason_for_change: l.reason_for_change || null,
            hmos_invited: l.hmos_invited === "" ? null : Number(l.hmos_invited),
            hmos_attended: l.hmos_attended === "" ? null : Number(l.hmos_attended),
            hmos_in_attendance: l.hmos_attended,
            compliance_guideline: l.compliance_guideline || null,
            transparent_process: l.transparent_process || null,
            selected_hmo: l.selected_hmo || null,
            evidence_path: l.evidence_path || null,
            evidence_name: l.evidence_name || null,
            report_path: l.report_path || null,
            report_name: l.report_name || null,
            activity_status: l.line_status,
            remarks: l.remarks || null,
          })),
        };
      }}
    >
      {({ submitting, saving, persist, requestSubmit, stateId, header, savedId }) => {
        savedIdRef.current = savedId;
        const entityChoices = entry.kind === "dependant"
          ? (entry.request === "additional" ? ADDITIONAL_ENTITY_TYPES : EXTRA_ENTITY_TYPES)
          : [];
        const stateKey = String(stateId || "").trim();
        const visiblePrincipals = stateKey
          ? principals.filter((p) => {
              const keys = p.stateKeys?.length ? p.stateKeys : (p.stateId ? [p.stateId] : []);
              return keys.length === 0 || keys.includes(stateKey);
            })
          : principals;
        const applyPrincipal = (value: string) => {
          const picked = principals.find((p) => p.value === value);
          if (!picked || entry.kind !== "dependant") return;
          setEntry({
            ...entry,
            principal_key: picked.value,
            enrollee_name: picked.name,
            principle_nhia_number: picked.nhia,
            enrolment_reference_id: picked.enrolment_reference_id || "",
            program_name: picked.program,
            enrolment_type: picked.enrolmentType,
            identity: picked.identity,
            hcf: picked.hcf,
            alternative_provider: picked.alternative_provider,
          });
        };
        const applyEnrollee = (value: string) => {
          const picked = principals.find((p) => p.value === value);
          if (!picked || entry.kind !== "provider") return;
          setEntry({
            ...entry,
            enrollee_key: picked.value,
            enrollee_name: picked.name,
            nhia_number: picked.nhia,
            enrolment_reference_id: picked.enrolment_reference_id || "",
            program: [picked.program, picked.enrolmentType].filter(Boolean).join(" · "),
            mda: entry.mda || picked.organization,
          });
        };
        const canEdit = reportStatus === "draft" || (!reportId && !savedId);
        const periodBadge = [
          labelOf(header.states.map((s) => ({ value: String(s.id), label: s.label })), header.stateId, ""),
          [monthLabel(header.reportMonth), header.reportYear].filter(Boolean).join(" "),
          header.reportMonth ? `(Q${quarterFromMonth(header.reportMonth)})` : "",
        ].filter(Boolean).join(", ").replace(", (", " (");

        return (
          <div className="space-y-4 pb-2">
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <ReportBasicInfo {...header} lockZone={header.lockZone} lockState={header.lockState} showQuarter embedded />
              </CardContent>
            </Card>

            {!activity ? (
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
                  {BENEFICIARY_ACTIVITIES.map((item) => {
                    const Icon = BENEFICIARY_ACTIVITY_ICONS[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => pickActivity(item.key)}
                        className="group flex items-center gap-4 rounded-2xl border border-[#d4e8dc] bg-white px-5 py-5 text-left shadow-sm transition-all hover:border-[#1a7a52] hover:bg-[#f7fcf9] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a52]/40"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#145c3f]">
                          <Icon className="h-6 w-6" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-slate-900">{item.label}</p>
                          <p className="mt-0.5 text-sm text-slate-500 leading-snug">{item.description}</p>
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
                    Activity: <span className="text-slate-800">{meta?.label}</span>
                  </p>
                  {canEdit && !reportId && !savedId && lines.length === 0 && !categoryLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#145c3f]"
                      onClick={() => setActivity(null)}
                    >
                      Change activity
                    </Button>
                  )}
                </div>

                {reviewNote && reportStatus !== "submitted" ? (
                  <p className={`rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap ${endorsed ? "border-[#d4e8dc] bg-[#f4fbf7] text-[#0f3d2e]" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
                    <span className="font-semibold">{endorsed ? "Endorsement" : "Returned for correction"}. </span>
                    {reviewNote}
                  </p>
                ) : null}

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
                              {["Subject", "Detail", "Date", "Status", "Action"].map((h) => (
                                <TableHead key={h} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((l) => {
                              const cells = rowCells(l);
                              return (
                                <TableRow key={l._key} className="hover:bg-[#f4f7f5]">
                                  <TableCell className="text-sm font-medium">{cells.subject || "—"}</TableCell>
                                  <TableCell className="text-xs max-w-[14rem] truncate" title={cells.detail}>
                                    {cells.detail}
                                  </TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">{cells.date}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px]">{cells.status}</Badge>
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
                              );
                            })}
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

                {reportStatus !== "approved" && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {reportStatus === "submitted" && !endorsed ? (
                      <p className="text-sm text-slate-600 mr-auto">Waiting for the state coordinator to endorse this report.</p>
                    ) : (
                      <>
                        {endorsed && (
                          <p className="text-sm text-[#0f3d2e] mr-auto">Endorsed. Submit it as approved.</p>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="gap-2" disabled={saving || submitting} onClick={() => persist("draft")}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Draft
                          </Button>
                        )}
                        {(canEdit || endorsed) && (
                          <Button
                            className="bg-orange-action hover:bg-orange-600 gap-2"
                            disabled={saving || submitting || (canEdit && lines.length === 0)}
                            onClick={() => requestSubmit(() => persist(endorsed ? "approved" : "submitted"))}
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {endorsed ? "Submit as approved" : "Send for Review"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="text-sm font-bold text-[#0f3d2e]">
                    {editingKey ? "Edit Activity" : "New Activity"}
                    <span className="font-medium text-slate-500"> · {meta?.label}</span>
                  </h2>
                  <Button variant="ghost" size="sm" onClick={backToRegister}>Cancel</Button>
                </div>

                {(activity === "additional" || activity === "extra") && entry.kind === "dependant" && (
                  <Card className="rounded-lg border border-[#d4e8dc] gap-0 py-0 shadow-none ring-0">
                    <CardContent className="p-4 md:p-5 space-y-1">
                      <Block title="Principal enrollee">
                        <Field label="Enrolment type">
                          <Input
                            value={[entry.program_name, entry.enrolment_type].filter(Boolean).join(" · ")}
                            readOnly
                            placeholder="From the enrollee record"
                          />
                        </Field>
                        <Field label="Principal enrollee" required className="sm:col-span-2">
                          <SearchSelect
                            options={visiblePrincipals.map((p) => ({ value: p.value, label: p.label, sub: p.sub }))}
                            value={entry.principal_key}
                            displayLabel={entry.enrollee_name ? `${entry.enrollee_name}${entry.principle_nhia_number ? ` · ${entry.principle_nhia_number}` : ""}` : undefined}
                            onChange={applyPrincipal}
                            placeholder={
                              principalsError
                                ? "Enrolment could not be loaded"
                                : principalsLoading
                                  ? "Loading enrolment…"
                                  : "Select from enrolment"
                            }
                            searchPlaceholder="Search name or number"
                            disabled={!!principalsError || principalsLoading}
                          />
                          {principalsError && (
                            <p className="text-xs text-red-600">{principalsError}</p>
                          )}
                          {!principalsError && !principalsLoading && visiblePrincipals.length === 0 && (
                            <p className="text-xs text-slate-500">
                              No principal found in Enrolment Activity for this state. Submit an Enrolment
                              record with surname, first name, and enrolment type first — then select it here
                              to auto-fill enrolment type and identity fields.
                            </p>
                          )}
                        </Field>
                        <Field label="Principal NHIA number">
                          <Input value={entry.principle_nhia_number} readOnly placeholder="From enrolment record" />
                        </Field>
                        <Field label="Dependant" required>
                          <Select
                            value={entry.entity_type || undefined}
                            onValueChange={(v) => setEntry({
                              ...entry,
                              entity_type: v,
                              relationship_kind: v.startsWith("child") ? "child" : v,
                            })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {entityChoices.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Block>

                      <Block title="Identity from the enrolment record" hint="Organisation is Unemployed. HMO is inherited from the principal and cannot be edited.">
                        {IDENTITY_FIELDS.map((field) => (
                          <Field key={field.key} label={field.label}>
                            <Input value={entry.identity[field.key] || ""} readOnly placeholder="From enrolment record" />
                          </Field>
                        ))}
                        <Field label="Organisation / MDA">
                          <Input value="Unemployed" readOnly />
                        </Field>
                        <Field label="HMO">
                          <Input value={entry.identity.hmo || ""} readOnly placeholder="Inherited from principal" />
                        </Field>
                        <ProviderSelect
                          label="HCF"
                          entityType="hcp"
                          stateId={stateId}
                          value={entry.hcf}
                          onChange={(name) => setEntry((p) => p.kind === "dependant" ? { ...p, hcf: name } : p)}
                        />
                        <ProviderSelect
                          label="Alternative provider"
                          entityType="hcp"
                          stateId={stateId}
                          value={entry.alternative_provider}
                          onChange={(name) => setEntry((p) => p.kind === "dependant" ? { ...p, alternative_provider: name } : p)}
                        />
                      </Block>

                      <Block title="Request">
                        <Field label="Date of request">
                          <Input type="date" value={entry.request_date} onChange={(e) => setEntry({ ...entry, request_date: e.target.value })} />
                        </Field>
                        <Field label="Process end date">
                          <Input type="date" value={entry.process_end_date} onChange={(e) => setEntry({ ...entry, process_end_date: e.target.value })} />
                        </Field>
                        <Field label="Status">
                          <Select value={entry.line_status} onValueChange={(v) => setEntry({ ...entry, line_status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EXTRA_DEPENDANT_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Supporting documents" className="sm:col-span-2 lg:col-span-3">
                          <Input
                            ref={fileRef}
                            type="file"
                            multiple
                            onChange={(e) => setEntry({ ...entry, supportingFiles: Array.from(e.target.files ?? []) })}
                          />
                        </Field>
                      </Block>
                    </CardContent>
                  </Card>
                )}

                {activity === "provider" && entry.kind === "provider" && (
                  <Card className="rounded-lg border border-[#d4e8dc] gap-0 py-0 shadow-none ring-0">
                    <CardContent className="p-4 md:p-5 space-y-1">
                      <Block title="Beneficiary" hint="The enrollee, NHIA number, and programme come from an enrolment record for this state.">
                        <Field label="Date of request">
                          <Input type="date" value={entry.record_date} onChange={(e) => setEntry({ ...entry, record_date: e.target.value })} />
                        </Field>
                        <Field label="Enrollee" required className="sm:col-span-2">
                          <SearchSelect
                            options={visiblePrincipals.map((p) => ({ value: p.value, label: p.label, sub: p.sub }))}
                            value={entry.enrollee_key}
                            displayLabel={entry.enrollee_name ? `${entry.enrollee_name}${entry.nhia_number ? ` · ${entry.nhia_number}` : ""}` : undefined}
                            onChange={applyEnrollee}
                            placeholder={
                              principalsError
                                ? "Enrolment could not be loaded"
                                : principalsLoading
                                  ? "Loading enrolment…"
                                  : "Select from enrolment"
                            }
                            searchPlaceholder="Search name or number"
                            disabled={!!principalsError || principalsLoading}
                          />
                          {principalsError && <p className="text-xs text-red-600">{principalsError}</p>}
                          {!principalsError && !principalsLoading && visiblePrincipals.length === 0 && (
                            <p className="text-xs text-slate-500">
                              No enrollee found in Enrolment Activity for this state. Add Enrolment records
                              with enrollee identity first.
                            </p>
                          )}
                        </Field>
                        <Field label="NHIA number">
                          <Input value={entry.nhia_number} readOnly placeholder="From the enrollee record" />
                        </Field>
                        <Field label="Programme">
                          <Input value={entry.program} readOnly placeholder="From the enrollee record" />
                        </Field>
                        <Field label="Request type" required>
                          <Select
                            value={entry.entity_type || undefined}
                            onValueChange={(v) => setEntry({
                              ...entry,
                              entity_type: v as "hcp" | "hmo",
                              current_hcp_hmo: "",
                              new_hcp_hmo: "",
                              reason_category: "",
                              reason_other: "",
                            })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hcp">Change of HCP</SelectItem>
                              <SelectItem value="hmo">Change of HMO</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="MDA (if applicable)">
                          <Input value={entry.mda} onChange={(e) => setEntry({ ...entry, mda: e.target.value })} />
                        </Field>
                      </Block>
                      <Block title="Provider change">
                        <ProviderSelect
                          label="Current provider"
                          entityType={entry.entity_type}
                          stateId={stateId}
                          value={entry.current_hcp_hmo}
                          onChange={(name) => setEntry((p) => p.kind === "provider" ? { ...p, current_hcp_hmo: name } : p)}
                        />
                        <ProviderSelect
                          label="Requested provider"
                          entityType={entry.entity_type}
                          stateId={stateId}
                          value={entry.new_hcp_hmo}
                          onChange={(name) => setEntry((p) => p.kind === "provider" ? { ...p, new_hcp_hmo: name } : p)}
                        />
                        <Field label="Reason category" required>
                          <Select
                            value={entry.reason_category || undefined}
                            disabled={!entry.entity_type}
                            onValueChange={(v) => setEntry({ ...entry, reason_category: v, reason_other: v === OTHER_REASON ? entry.reason_other : "" })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={entry.entity_type ? "Select" : "Select request type first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Additional explanation" required={entry.reason_category === OTHER_REASON} className="sm:col-span-2">
                          <Input
                            value={entry.reason_other}
                            disabled={entry.reason_category !== OTHER_REASON}
                            placeholder={entry.reason_category === OTHER_REASON ? "Required for Other" : "Only when reason is Other"}
                            onChange={(e) => setEntry({ ...entry, reason_other: e.target.value })}
                          />
                        </Field>
                        <Field label="Met NHIA criteria?">
                          <Select value={entry.met_criteria || undefined} onValueChange={(v) => setEntry({ ...entry, met_criteria: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Status">
                          <Select value={entry.line_status} onValueChange={(v) => setEntry({ ...entry, line_status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HCP_CHANGE_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Supporting documents" className="lg:col-span-3">
                          <Input
                            ref={fileRef}
                            type="file"
                            multiple
                            onChange={(e) => setEntry({ ...entry, supportingFiles: Array.from(e.target.files ?? []) })}
                          />
                        </Field>
                      </Block>
                    </CardContent>
                  </Card>
                )}

                {activity === "mda" && entry.kind === "mda" && (
                  <Card className="rounded-lg border border-[#d4e8dc] gap-0 py-0 shadow-none ring-0">
                    <CardContent className="p-4 md:p-5 space-y-1">
                      <Block title="MDA and selection">
                        <Field label="Date">
                          <Input type="date" value={entry.selection_date} onChange={(e) => setEntry({ ...entry, selection_date: e.target.value })} />
                        </Field>
                        <Field label="Name of MDA" required className="sm:col-span-2">
                          <Input value={entry.mda} onChange={(e) => setEntry({ ...entry, mda: e.target.value })} />
                        </Field>
                        <ProviderSelect
                          label="Former HMO"
                          entityType="hmo"
                          stateId={stateId}
                          value={entry.former_hmo}
                          onChange={(name) => setEntry((p) => p.kind === "mda" ? { ...p, former_hmo: name } : p)}
                        />
                        <Field label="Reason for change" className="sm:col-span-2">
                          <Input value={entry.reason_for_change} onChange={(e) => setEntry({ ...entry, reason_for_change: e.target.value })} />
                        </Field>
                      </Block>
                      <Block title="Selection process" hint="HMOs are the accredited list. Guideline and transparency are Yes or No.">
                        <Field label="HMOs invited">
                          <Input type="number" min={0} value={entry.hmos_invited} onChange={(e) => setEntry({ ...entry, hmos_invited: e.target.value })} />
                        </Field>
                        <Field label="HMOs attended">
                          <Input type="number" min={0} value={entry.hmos_attended} onChange={(e) => setEntry({ ...entry, hmos_attended: e.target.value })} />
                        </Field>
                        <Field label="NHIA guideline complied?">
                          <Select value={entry.compliance_guideline || undefined} onValueChange={(v) => setEntry({ ...entry, compliance_guideline: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Transparent process?">
                          <Select value={entry.transparent_process || undefined} onValueChange={(v) => setEntry({ ...entry, transparent_process: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <ProviderSelect
                          label="Selected HMO"
                          entityType="hmo"
                          stateId={stateId}
                          value={entry.selected_hmo}
                          onChange={(name) => setEntry((p) => p.kind === "mda" ? { ...p, selected_hmo: name } : p)}
                        />
                      </Block>
                      <Block title="Evidence">
                        <Field label="Evidence of selection">
                          <Input type="file" onChange={(e) => setEntry({ ...entry, evidenceFile: e.target.files?.[0] ?? null })} />
                          {entry.evidence_name ? <p className="text-xs text-slate-600">{entry.evidence_name}</p> : null}
                        </Field>
                        <Field label="Full selection report">
                          <Input type="file" onChange={(e) => setEntry({ ...entry, reportFile: e.target.files?.[0] ?? null })} />
                          {entry.report_name ? <p className="text-xs text-slate-600">{entry.report_name}</p> : null}
                        </Field>
                        <Field label="Status">
                          <Select value={entry.line_status} onValueChange={(v) => setEntry({ ...entry, line_status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HCP_CHANGE_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                          <Input value={entry.remarks} onChange={(e) => setEntry({ ...entry, remarks: e.target.value })} />
                        </Field>
                      </Block>
                    </CardContent>
                  </Card>
                )}

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

function rowCells(l: Line) {
  if (l.kind === "dependant") {
    return {
      activity: l.request === "additional" ? "Additional Dependant" : "Extra Dependant",
      subject: l.enrollee_name,
      detail: `${entityLabel(l.request, l.entity_type)} · ${l.principle_nhia_number}`,
      date: l.request_date || "—",
      status: labelOf(EXTRA_DEPENDANT_STATUSES, l.line_status, l.line_status),
    };
  }
  if (l.kind === "provider") {
    return {
      activity: l.entity_type === "hmo" ? "Change of HMO" : "Change of HCP",
      subject: l.enrollee_name,
      detail: [l.current_hcp_hmo, l.new_hcp_hmo].filter(Boolean).join(" → ") || "—",
      date: l.record_date || "—",
      status: labelOf(HCP_CHANGE_STATUSES, l.line_status, l.line_status),
    };
  }
  return {
    activity: "MDA HMO Selection",
    subject: l.mda,
    detail: [l.former_hmo, l.selected_hmo].filter(Boolean).join(" → ") || "—",
    date: l.selection_date || "—",
    status: labelOf(HCP_CHANGE_STATUSES, l.line_status, l.line_status),
  };
}
