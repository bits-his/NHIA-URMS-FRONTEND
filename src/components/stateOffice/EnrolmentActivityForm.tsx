import * as React from "react";
import {
  ArrowLeft, Building2, ChevronRight, ClipboardCheck, HeartHandshake, IdCard,
  Landmark, Loader2, Plus, Save, Send, ShieldCheck, Trash2, UserPlus, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { stateOfficeApi } from "@/lib/api";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import { NIGERIAN_STATE_NAMES, lgasForState } from "./nigeriaGeo";
import { labelOf, monthLabel, quarterFromMonth } from "./constants";
import {
  ENROLMENT_ACTIVITIES,
  enrolmentActivityMeta,
  ENROLMENT_ACTIVITY_STATUSES,
  ENROLMENT_BUDGETED,
  ENROLMENT_CHANNELS,
  ENROLMENT_TYPES,
  ENROLMENT_EVIDENCE_TYPES,
  ENROLMENT_FUNDING_OPTIONS,
  ENROLMENT_ID_CARD_REQUEST_CATEGORIES,
  ENROLMENT_ID_CARD_STATUSES,
  ENROLMENT_NIN_VALIDATION_STATUSES,
  ENROLMENT_PROGRAMS,
  ENROLMENT_RENEWABLE_PROGRAM_LABELS,
  ENROLMENT_EQUITY_PROGRAMS,
  ENROLMENT_SSHIA_CHANNELS,
  ENROLMENT_STATUS_NEEDS_REASON,
  ENROLMENT_ENTITY_TYPES,
  ENROLMENT_BLOOD_GROUPS,
  ENROLMENT_MARITAL_STATUSES,
  computeGifshipDates,
  isSshiaLikeChannel,
  modesOfRegistrationForProgram,
  normalizeEnrolmentType,
  programSpecificFieldsFor,
  todayIsoDate,
  type EnrolmentProgramFieldDef,
} from "./enrolmentPillarTypes";

const ENROLMENT_ACTIVITY_ICONS: Record<(typeof ENROLMENT_ACTIVITIES)[number]["value"], LucideIcon> = {
  enrolment: UserPlus,
  nin_validation: ShieldCheck,
  id_card_issuance: IdCard,
  validation_of_enrolees: ClipboardCheck,
};

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-sm px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));
/** Match SelectTrigger size, green border, and fill on enrolment form inputs. */
const controlClass = cn(
  "h-11 text-sm font-medium",
  "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none",
  "hover:border-[#0f3d2e] hover:bg-white",
  "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
);

type ProgramDetails = Record<string, string>;

const blank = () => ({
  activity_date: todayIsoDate(),
  category: "" as string,
  enrolment_channel: "",
  enrolment_type: "",
  program_name: "",
  enrolment_category: "",
  beneficiary_category: "",
  beneficiary_status: "",
  funding_option: "",
  activity_budget: "",
  approved_amount: "",
  enrolment_count: "",
  enrollees_validated: "",
  activity_status: "",
  supporting_evidence: "",
  status_reason: "",
  remarks: "",
  enrollee_name: "",
  organization_name: "",
  nin_number: "",
  validation_status: "",
  validation_date: todayIsoDate(),
  not_validated_reason: "",
  request_category: "",
  nhia_number: "",
  payment_reference: "",
  id_card_status: "",
  issue_date: "",
  program_details: {} as ProgramDetails,
});

type Entry = ReturnType<typeof blank>;

type PendingBeneficiary = {
  id: string;
  entry: Entry;
  label: string;
};

function beneficiaryLabel(e: Entry) {
  const surname = String(e.program_details?.surname ?? "").trim();
  const first = String(e.program_details?.first_name ?? "").trim();
  const name = [surname, first].filter(Boolean).join(" ");
  return name || e.enrollee_name?.trim() || e.program_name || "Beneficiary";
}

type StepId = "activity" | "channel" | "details";

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** When creating from an activity tab, skip the activity picker. */
  initialCategory?: string | null;
  driveContext?: {
    reference_id: string;
    programs_supported: string[];
    state_code: string;
    zonal_code: string;
    reporting_year: number;
    reporting_month: number;
    /** Display-only totals from the linked drive activity. */
    beneficiaries_recorded?: number;
    registration_count?: number;
  };
  /** Embed inside a parent dialog/workspace — hide FormShell page chrome. */
  embedded?: boolean;
  /** Called after drive beneficiaries in the list are submitted. */
  onDriveBeneficiarySaved?: () => void;
}

export function FieldSection({ title, children, gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" }: { title: string; children: React.ReactNode; gridClassName?: string }) {
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


function renderProgramField(
  f: EnrolmentProgramFieldDef,
  fields: EnrolmentProgramFieldDef[],
  values: ProgramDetails,
  onChange: (key: string, value: string) => void,
  onChangeMany: (patch: ProgramDetails) => void,
  reportStateId: string,
) {
  if (f.type === "state") {
    const dependentLga = fields.find((x) => x.type === "lga" && x.dependsOnStateKey === f.key)?.key;
    return (
      <Field key={f.key} label={f.label}>
        <Select
          value={values[f.key] ?? ""}
          onValueChange={(v) => {
            if (dependentLga) onChangeMany({ [f.key]: v, [dependentLga]: "" });
            else onChange(f.key, v);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATE_NAMES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (f.type === "lga") {
    const parentState = values[f.dependsOnStateKey ?? ""] ?? "";
    const lgas = lgasForState(parentState);
    return (
      <Field key={f.key} label={f.label}>
        <Select
          value={values[f.key] ?? ""}
          onValueChange={(v) => onChange(f.key, v)}
          disabled={!parentState || lgas.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={parentState ? "Select LGA" : "Select state first"} />
          </SelectTrigger>
          <SelectContent>
            {lgas.map((lga) => (
              <SelectItem key={lga} value={lga}>{lga}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (f.type === "hmo") {
    const selectedLabel = [values[f.key], values[`${f.key}_code`]].filter(Boolean).join(" - ");
    return (
      <Field key={f.key} label={f.label}>
        <AccreditedProviderSelect
          type="hmo"
          value={values[`${f.key}_id`] ?? ""}
          displayName={selectedLabel || values[f.key] || undefined}
          placeholder="Select accredited HMO"
          onChange={(p) => onChangeMany({
            [f.key]: p?.name ?? "",
            [`${f.key}_id`]: p?.id ?? "",
            [`${f.key}_code`]: p?.code ?? "",
          })}
        />
      </Field>
    );
  }

  if (f.type === "hcf") {
    const selectedLabel = [values[f.key], values[`${f.key}_code`]].filter(Boolean).join(" - ");
    return (
      <Field key={f.key} label={f.label}>
        <AccreditedProviderSelect
          type="hcp"
          stateId={reportStateId}
          value={values[`${f.key}_id`] ?? ""}
          displayName={selectedLabel || values[f.key] || undefined}
          placeholder={reportStateId ? "Select accredited HCF" : "Select report state first"}
          onChange={(p) => onChangeMany({
            [f.key]: p?.name ?? "",
            [`${f.key}_id`]: p?.id ?? "",
            [`${f.key}_code`]: p?.code ?? "",
          })}
        />
      </Field>
    );
  }

  const autoDateKeys = new Set(["enrolment_date_auto", "renewal_date", "expiry_date"]);
  const isAutoDate = autoDateKeys.has(f.key);

  return (
    <Field key={f.key} label={f.label}>
      {f.type === "select" ? (
        <Select value={values[f.key] ?? ""} onValueChange={(v) => onChange(f.key, v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {(f.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
          min={f.type === "number" ? 0 : undefined}
          value={values[f.key] ?? ""}
          disabled={isAutoDate}
          readOnly={isAutoDate}
          className={cn(controlClass, isAutoDate && "bg-slate-50 text-slate-600")}
          onChange={(e) => {
            const v = e.target.value;
            if (f.key === "registration_date") {
              const computed = computeGifshipDates(v);
              onChangeMany({
                registration_date: v,
                enrolment_date_auto: computed.enrolment_date_auto,
                renewal_date: computed.renewal_date,
                expiry_date: computed.expiry_date,
                renewal_status: values.renewal_status === "Renewed"
                  ? "Renewed"
                  : computed.renewal_status,
              });
              return;
            }
            onChange(f.key, v);
          }}
        />
      )}
    </Field>
  );
}

/** Always-visible NHIA identity fields (shown even before a program is chosen). */
const NHIA_IDENTITY_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "surname", label: "Surname", type: "text" },
  { key: "first_name", label: "First Name", type: "text" },
  { key: "middle_name", label: "Middle Name", type: "text" },
  { key: "nin", label: "NIN", type: "text" },
  { key: "organization_mda", label: "Organization/MDA", type: "text" },
  { key: "entity_type", label: "Entity Type", type: "select", options: ENROLMENT_ENTITY_TYPES },
  { key: "blood_group", label: "Blood Group", type: "select", options: ENROLMENT_BLOOD_GROUPS },
  { key: "marital_status", label: "Marital Status", type: "select", options: ENROLMENT_MARITAL_STATUSES },
  { key: "phone_number", label: "Phone Number", type: "text" },
];

const IDENTITY_FIELD_KEYS = new Set(NHIA_IDENTITY_FIELDS.map((f) => f.key));

function mergeProgramFields(programFields: EnrolmentProgramFieldDef[]): EnrolmentProgramFieldDef[] {
  const byKey = new Map<string, EnrolmentProgramFieldDef>();
  NHIA_IDENTITY_FIELDS.forEach((f) => byKey.set(f.key, f));
  programFields.forEach((f) => byKey.set(f.key, f));
  const identity = NHIA_IDENTITY_FIELDS.map((f) => byKey.get(f.key)!);
  const rest = programFields.filter((f) => !IDENTITY_FIELD_KEYS.has(f.key));
  return [...identity, ...rest];
}

/** Flat field list — no section headings / green card (one continuous form). */
function ProgramFieldsGrid({
  fields,
  values,
  onChange,
  onChangeMany,
  reportStateId,
  alwaysShowIdentity = false,
}: {
  fields: EnrolmentProgramFieldDef[];
  values: ProgramDetails;
  onChange: (key: string, value: string) => void;
  onChangeMany: (patch: ProgramDetails) => void;
  reportStateId: string;
  alwaysShowIdentity?: boolean;
}) {
  const merged = alwaysShowIdentity ? mergeProgramFields(fields) : fields;
  if (merged.length === 0) return null;

  return (
    <>
      {merged.map((f) => renderProgramField(f, merged, values, onChange, onChangeMany, reportStateId))}
    </>
  );
}

/** Single-form flow per activity (no multi-step / review). */
function stepsForCategory(category: string, _channel = ""): { id: StepId; label: string }[] {
  if (category === "enrolment") {
    return [{ id: "channel", label: "Enrolment" }];
  }
  if (category === "nin_validation") {
    return [{ id: "details", label: "NIN Validation" }];
  }
  if (category === "validation_of_enrolees") {
    return [{ id: "details", label: "Validation" }];
  }
  if (category === "id_card_issuance") {
    return [{ id: "details", label: "ID Card" }];
  }
  return [];
}

/** Activity Reporting Template — stepped flow from Enrolment.pptx */
export default function EnrolmentActivityForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, initialCategory, driveContext: suppliedDriveContext, embedded = false, onDriveBeneficiarySaved,
}: Props) {
  const [savedDriveContext, setSavedDriveContext] = React.useState<Props["driveContext"]>();
  const driveContext = suppliedDriveContext || savedDriveContext;
  const fresh = (category = ""): Entry => ({
    ...blank(),
    category,
    enrolment_channel: category === "enrolment" ? "NHIA" : "",
    program_details: {},
  });

  const setEnrolmentChannel = (channel: string) => {
    setEntry((p) => ({
      ...p,
      enrolment_channel: channel,
      enrolment_type: "",
      program_name: "",
      enrolment_category: "",
      program_details: {},
      ...(isSshiaLikeChannel(channel)
        ? {
            activity_status: "",
            status_reason: "",
            supporting_evidence: "",
            funding_option: "",
            activity_budget: "",
            approved_amount: "",
          }
        : {}),
    }));
    setFieldErrors({});
    setStepIndex(0);
  };
  const seededCategory = !reportId && initialCategory
    && ENROLMENT_ACTIVITIES.some((a) => a.value === initialCategory)
    ? initialCategory
    : "";
  const [entry, setEntry] = React.useState<Entry>(() => fresh(seededCategory));
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = React.useState(0);
  const [pendingBeneficiaries, setPendingBeneficiaries] = React.useState<PendingBeneficiary[]>([]);
  const [submittingList, setSubmittingList] = React.useState(false);
  const entryRef = React.useRef(entry);
  entryRef.current = entry;

  React.useEffect(() => {
    if (reportId) return;
    if (!initialCategory || !ENROLMENT_ACTIVITIES.some((a) => a.value === initialCategory)) return;
    setEntry(fresh(initialCategory));
    setFieldErrors({});
    setStepIndex(0);
  }, [reportId, initialCategory]);

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const setDetail = (key: string, value: string) =>
    setEntry((p) => ({ ...p, program_details: { ...p.program_details, [key]: value } }));
  const setDetails = (patch: ProgramDetails) =>
    setEntry((p) => ({ ...p, program_details: { ...p.program_details, ...patch } }));

  const isBudgeted = entry.funding_option === ENROLMENT_BUDGETED;
  const isEnrolment = entry.category === "enrolment";
  const isSshiaChannel = isEnrolment && isSshiaLikeChannel(entry.enrolment_channel);
  const isNin = entry.category === "nin_validation";
  const isIdCard = entry.category === "id_card_issuance";
  const isValidation = entry.category === "validation_of_enrolees";

  const steps = React.useMemo(
    () => stepsForCategory(entry.category, entry.enrolment_channel),
    [entry.category, entry.enrolment_channel],
  );
  const currentStep = steps.length
    ? steps[Math.min(stepIndex, steps.length - 1)]
    : null;

  React.useEffect(() => {
    if (!steps.length) {
      if (stepIndex !== 0) setStepIndex(0);
      return;
    }
    if (stepIndex > steps.length - 1) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  const programOptions = React.useMemo(() => {
    if (entry.enrolment_channel === "SSHIA") {
      return ENROLMENT_SSHIA_CHANNELS.map((label) => ({ code: null as string | null, label }));
    }
    if (entry.enrolment_channel === "Equity Program") {
      return ENROLMENT_EQUITY_PROGRAMS.map((label) => ({ code: null as string | null, label }));
    }
    if (entry.enrolment_channel !== "NHIA" && !isNin && !isIdCard && !isValidation) return [];
    const nhia = ENROLMENT_PROGRAMS.map((p) => ({ code: p.code as string | null, label: p.label }));
    if (!isEnrolment) return nhia;
    if (entry.enrolment_type === "Renewal") {
      return nhia.filter((p) => ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(p.label));
    }
    if (entry.enrolment_type === "Fresh Enrolment") return nhia;
    return [];
  }, [entry.enrolment_channel, entry.enrolment_type, isEnrolment, isNin, isIdCard, isValidation, driveContext]);

  const modeOptions = React.useMemo(
    () => driveContext ? ["Field Registration"] : modesOfRegistrationForProgram(entry.program_name),
    [entry.program_name, driveContext],
  );

  React.useEffect(() => {
    if (!driveContext) return;
    // Enrolment drive beneficiary registration is NHIA-only (no SSHIA / Equity tabs).
    setEntry((current) => {
      if (current.category === "enrolment" && current.enrolment_channel === "NHIA") return current;
      return {
        ...current,
        category: "enrolment",
        enrolment_channel: "NHIA",
        ...(isSshiaLikeChannel(current.enrolment_channel)
          ? { enrolment_type: "", program_name: "", enrolment_category: "", program_details: {} }
          : {}),
      };
    });
  }, [driveContext]);

  React.useEffect(() => {
    if (!driveContext || isSshiaLikeChannel(entry.enrolment_channel) || !entry.program_name) return;
    setEntry((current) => current.enrolment_category === "Field Registration" ? current : { ...current, enrolment_category: "Field Registration" });
  }, [driveContext, entry.enrolment_channel, entry.program_name]);

  const programFields = React.useMemo(
    () => (isEnrolment
      ? programSpecificFieldsFor(entry.enrolment_channel, entry.program_name)
      : []),
    [isEnrolment, entry.enrolment_channel, entry.program_name],
  );

  const parseStoredChannel = (raw: string | null | undefined, programName: string | null | undefined) => {
    const value = String(raw ?? "").trim();
    if (value.startsWith("SSHIA / ")) {
      const sshiaProgram = value.slice("SSHIA / ".length).trim();
      return {
        enrolment_channel: "SSHIA",
        program_name: programName || sshiaProgram,
      };
    }
    if (value.startsWith("Equity Program / ")) {
      const equityProgram = value.slice("Equity Program / ".length).trim();
      return {
        enrolment_channel: "Equity Program",
        program_name: programName || equityProgram,
      };
    }
    if (value === "Equity" || value === "Equity Programs") {
      return { enrolment_channel: "Equity Program", program_name: programName ?? "" };
    }
    return {
      enrolment_channel: value,
      program_name: programName ?? "",
    };
  };

  const parseDetails = (raw: unknown): ProgramDetails => {
    if (!raw) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return { ...(raw as ProgramDetails) };
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const lineToEntry = (l: any): Entry => {
    const ch = parseStoredChannel(l.enrolment_channel, l.program_name);
    const details = parseDetails(l.program_details);
    const category = l.category === "enrolee_record_update" ? "enrolment" : (l.category ?? "");
    return {
      activity_date: l.activity_date?.slice?.(0, 10) ?? todayIsoDate(),
      category,
      enrolment_channel: ch.enrolment_channel,
      enrolment_type: normalizeEnrolmentType(l.enrolment_type)
        || (ch.program_name && ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(ch.program_name) ? "Renewal" : "")
        || (ch.enrolment_channel === "NHIA" && ch.program_name ? "Fresh Enrolment" : ""),
      program_name: ch.program_name,
      enrolment_category: l.enrolment_category ?? "",
      beneficiary_category: l.beneficiary_category ?? "",
      beneficiary_status: l.beneficiary_status ?? details.beneficiary_status ?? "",
      funding_option: l.funding_option ?? "",
      activity_budget: numStr(l.activity_budget),
      approved_amount: numStr(l.approved_amount),
      enrolment_count: numStr(l.enrolment_count),
      enrollees_validated: numStr(l.enrollees_validated),
      activity_status: l.activity_status ?? "",
      supporting_evidence: l.supporting_evidence ?? details.supporting_evidence ?? "",
      status_reason: l.status_reason ?? details.status_reason ?? "",
      remarks: l.remarks ?? "",
      enrollee_name: details.enrollee_name ?? "",
      organization_name: details.organization_name ?? "",
      nin_number: details.nin_number ?? details.nin ?? "",
      validation_status: details.validation_status ?? "",
      validation_date: (details.validation_date || l.activity_date?.slice?.(0, 10) || todayIsoDate()),
      not_validated_reason: details.not_validated_reason ?? "",
      request_category: details.request_category ?? "",
      nhia_number: details.nhia_number ?? "",
      payment_reference: details.payment_reference ?? "",
      id_card_status: details.id_card_status ?? "",
      issue_date: details.issue_date ?? "",
      program_details: details,
    };
  };

  const loadData = (v: any) => {
    setSavedDriveContext(v.drive_reference_id ? {
      reference_id: String(v.drive_reference_id),
      programs_supported: [] as string[],
      state_code: String(v.state_code || v.state_id || ""),
      zonal_code: String(v.zonal_code || v.zone_id || ""),
      reporting_year: Number(v.reporting_year) || new Date().getFullYear(),
      reporting_month: Number(v.reporting_month) || (new Date().getMonth() + 1),
    } : undefined);
    const first = (v.lines ?? [])[0];
    if (first) {
      setEntry(lineToEntry(first));
      setFieldErrors({});
      setStepIndex(0);
    }
  };

  const selectActivity = (category: string) => {
    setEntry(fresh(category));
    setFieldErrors({});
    setStepIndex(0);
  };

  const fail = (key: string, message: string) => {
    setFieldErrors({ [key]: message });
    toast.error(message);
    return message;
  };

  const buildProgramDetails = (e: Entry): ProgramDetails => {
    if (e.category === "nin_validation") {
      return {
        enrollee_name: e.enrollee_name,
        organization_name: e.organization_name,
        nin_number: e.nin_number,
        validation_status: e.validation_status,
        validation_date: e.validation_date || e.activity_date || todayIsoDate(),
        not_validated_reason: e.not_validated_reason,
      };
    }
    if (e.category === "id_card_issuance") {
      return {
        enrollee_name: e.enrollee_name,
        request_category: e.request_category,
        nhia_number: e.nhia_number,
        payment_reference: e.payment_reference,
        id_card_status: e.id_card_status,
        issue_date: e.issue_date,
      };
    }
    if (e.category === "validation_of_enrolees") {
      return {
        organization_name: e.organization_name,
      };
    }
    const fieldKeys = [
      ...NHIA_IDENTITY_FIELDS.map((f) => f.key),
      ...programSpecificFieldsFor(e.enrolment_channel, e.program_name).map((f) => f.key),
    ];
    const allowed = new Set(fieldKeys.flatMap((k) => [k, `${k}_id`, `${k}_code`]));
    const filtered: ProgramDetails = {};
    Object.entries(e.program_details || {}).forEach(([k, v]) => {
      if (allowed.has(k) && v != null && String(v).trim() !== "") filtered[k] = String(v);
    });
    return filtered;
  };

  const validateStep = (stepId: StepId, e: Entry = entryRef.current): string | null => {
    setFieldErrors({});
    const budgeted = e.funding_option === ENROLMENT_BUDGETED;
    const modes = modesOfRegistrationForProgram(e.program_name);

    if (stepId === "activity") {
      if (!e.category) return fail("category", "Select an enrolment activity");
      return null;
    }

    if (stepId === "channel") {
      if (!isSshiaLikeChannel(e.enrolment_channel) && !e.activity_date) {
        return fail("activity_date", "Enter the enrolment date");
      }
      if (!e.enrolment_channel) return fail("enrolment_channel", "Select enrolment channel");
      if (e.enrolment_channel === "NHIA" && !e.enrolment_type) {
        return fail("enrolment_type", "Select enrolment type");
      }
      if (!e.program_name) return fail("program_name", "Select program");
      if (!isSshiaLikeChannel(e.enrolment_channel) && modes.length > 0 && !e.enrolment_category) {
        return fail("enrolment_category", "Select enrolment mode");
      }
      if (e.enrolment_type === "Renewal" && !ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(e.program_name)) {
        return fail("program_name", "Renewal is only allowed for GIFSHIP-G, GIFSHIP-C or GIFSHIP-R");
      }
      if (isSshiaLikeChannel(e.enrolment_channel)) {
        if (e.enrolment_count === "" || !Number.isSafeInteger(Number(e.enrolment_count)) || Number(e.enrolment_count) < 1) {
          return fail(
            "enrolment_count",
            e.enrolment_channel === "Equity Program"
              ? "Enter the number of beneficiaries"
              : "Enter the number enrolled",
          );
        }
        return null;
      }
      // NHIA: identity + status/funding on the same form (no separate count field)
      if (!String(e.program_details?.surname ?? "").trim()) {
        return fail("surname", "Enter surname");
      }
      if (!String(e.program_details?.first_name ?? "").trim()) {
        return fail("first_name", "Enter first name");
      }
      if (!e.activity_status) return fail("activity_status", "Select the activity status");
      if (ENROLMENT_STATUS_NEEDS_REASON.has(e.activity_status) && !e.status_reason.trim()) {
        return fail("status_reason", "Enter a reason for Not Conducted / Cancelled");
      }
      if (budgeted && e.activity_budget === "") return fail("activity_budget", "Enter activity budget");
      if (budgeted && e.approved_amount === "") return fail("approved_amount", "Enter approved amount");
      return null;
    }

    if (stepId === "details" && e.category === "nin_validation") {
      if (!e.enrollee_name.trim()) return fail("enrollee_name", "Enter enrollee name");
      if (!e.program_name) return fail("program_name", "Select program");
      if (!e.nin_number.trim()) return fail("nin_number", "Enter NIN");
      if (!e.validation_status) return fail("validation_status", "Select validation status");
      if (!(e.validation_date || e.activity_date)) {
        return fail("validation_date", "Enter validation date");
      }
      if (e.validation_status === "Not validated" && !e.not_validated_reason.trim()) {
        return fail("not_validated_reason", "Enter reason for not validated");
      }
      return null;
    }

    if (stepId === "details" && e.category === "validation_of_enrolees") {
      if (!e.activity_date) return fail("activity_date", "Enter the activity date");
      if (!e.program_name) return fail("program_name", "Select program");
      if (e.enrollees_validated === "") return fail("enrollees_validated", "Enter records validated");
      if (Number(e.enrollees_validated) < 0) {
        return fail("enrollees_validated", "Records validated must be a whole non-negative number");
      }
      if (budgeted && e.activity_budget === "") return fail("activity_budget", "Enter activity budget");
      if (budgeted && e.approved_amount === "") return fail("approved_amount", "Enter approved budget");
      return null;
    }

    if (stepId === "details" && e.category === "id_card_issuance") {
      if (!e.request_category) return fail("request_category", "Select request category");
      if (!e.activity_date) return fail("activity_date", "Enter the date of request");
      if (!e.enrollee_name.trim()) return fail("enrollee_name", "Enter enrollee name");
      if (!e.program_name) return fail("program_name", "Select program");
      if (!e.nhia_number.trim()) return fail("nhia_number", "Enter NHIA number");
      if (!e.id_card_status) return fail("id_card_status", "Select ID card status");
      if (e.id_card_status === "Issued" && !e.issue_date) {
        return fail("issue_date", "Enter issue date when status is Issued");
      }
      if (e.request_category.startsWith("Replacement") && !e.payment_reference.trim()) {
        return fail("payment_reference", "Enter payment reference for replacement");
      }
      return null;
    }

    return null;
  };

  const validateEntry = (e: Entry = entryRef.current): string | null => {
    if (!e.category) return fail("category", "Select an enrolment activity");
    for (const step of stepsForCategory(e.category, e.enrolment_channel)) {
      const err = validateStep(step.id, e);
      if (err) return err;
    }
    return null;
  };

  const toLinePayload = (e: Entry) => {
    const act = ENROLMENT_ACTIVITIES.find((a) => a.value === e.category);
    const prog = ENROLMENT_PROGRAMS.find((p) => p.label === e.program_name);
    const budgeted = e.funding_option === ENROLMENT_BUDGETED;
    const details = buildProgramDetails(e);
    const activityDate = e.category === "nin_validation"
      ? (e.validation_date || e.activity_date || todayIsoDate())
      : (e.activity_date || null);
    return {
      category: e.category,
      activity_code: act?.code ?? null,
      activity_date: activityDate,
      enrolment_channel: e.enrolment_channel || null,
      enrolment_type: e.enrolment_type || null,
      program_code: prog?.code ?? null,
      program_name: e.program_name || null,
      enrolment_category: e.enrolment_category || null,
      beneficiary_category: e.beneficiary_category || null,
      beneficiary_status: e.beneficiary_status || null,
      funding_option: isSshiaLikeChannel(e.enrolment_channel) ? null : (e.funding_option || null),
      supporting_evidence: isSshiaLikeChannel(e.enrolment_channel) ? null : (e.supporting_evidence || null),
      activity_budget: isSshiaLikeChannel(e.enrolment_channel) ? null : (budgeted ? numOrNull(e.activity_budget) : null),
      approved_amount: isSshiaLikeChannel(e.enrolment_channel) ? null : (budgeted ? numOrNull(e.approved_amount) : null),
      enrolment_count: isSshiaLikeChannel(e.enrolment_channel)
        ? (Number(e.enrolment_count) || 0)
        : (Number(e.enrolment_count) || 1),
      enrollees_validated: numOrNull(e.enrollees_validated),
      activity_status: isSshiaLikeChannel(e.enrolment_channel)
        ? null
        : (e.activity_status || e.id_card_status || e.validation_status || null),
      status_reason: isSshiaLikeChannel(e.enrolment_channel) ? null : (e.status_reason || null),
      remarks: e.remarks || null,
      program_details: details && Object.keys(details).length ? details : null,
    };
  };

  const allProgramsForSimpleSelect = React.useMemo(
    () => ENROLMENT_PROGRAMS.map((p) => p.label),
    [],
  );

  const resetDriveBeneficiaryForm = (keep: Entry) => {
    setEntry({
      ...fresh("enrolment"),
      enrolment_channel: "NHIA",
      enrolment_type: keep.enrolment_type,
      program_name: keep.program_name,
      enrolment_category: keep.enrolment_category || "Field Registration",
      activity_date: keep.activity_date,
      activity_status: keep.activity_status,
      supporting_evidence: keep.supporting_evidence,
      funding_option: keep.funding_option,
      activity_budget: keep.activity_budget,
      approved_amount: keep.approved_amount,
    });
    setFieldErrors({});
    setStepIndex(0);
  };

  const addBeneficiaryToList = () => {
    const err = validateEntry(entryRef.current);
    if (err) {
      toast.error(err);
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(entryRef.current)) as Entry;
    setPendingBeneficiaries((current) => [
      ...current,
      {
        id: `pending-${Date.now()}-${current.length}`,
        entry: snapshot,
        label: beneficiaryLabel(snapshot),
      },
    ]);
    resetDriveBeneficiaryForm(snapshot);
    toast.success("Added to list");
  };

  const removePendingBeneficiary = (id: string) => {
    setPendingBeneficiaries((current) => current.filter((row) => row.id !== id));
  };

  const submitPendingBeneficiaries = async () => {
    if (!driveContext) return;
    if (!pendingBeneficiaries.length) {
      toast.error("Add at least one beneficiary to the list before submitting");
      return;
    }
    setSubmittingList(true);
    try {
      for (const row of pendingBeneficiaries) {
        await stateOfficeApi.enrolment.create({
          status: "submitted",
          drive_reference_id: driveContext.reference_id,
          state_id: driveContext.state_code,
          zone_id: driveContext.zonal_code,
          state_code: driveContext.state_code,
          zonal_code: driveContext.zonal_code,
          reporting_year: driveContext.reporting_year,
          reporting_month: driveContext.reporting_month,
          submission_date: todayIsoDate(),
          submitted_by: "State Office",
          lines: [toLinePayload(row.entry)],
        });
      }
      const count = pendingBeneficiaries.length;
      setPendingBeneficiaries([]);
      toast.success(
        count === 1 ? "Beneficiary submitted" : `${count} beneficiaries submitted`,
      );
      (onDriveBeneficiarySaved ?? onSubmitted)?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit beneficiaries");
    } finally {
      setSubmittingList(false);
    }
  };

  const activityMeta = enrolmentActivityMeta(entry.category);
  const categoryLocked = Boolean(seededCategory) || Boolean(driveContext);

  const channelIcons: Record<(typeof ENROLMENT_CHANNELS)[number], LucideIcon> = {
    NHIA: Building2,
    SSHIA: Landmark,
    "Equity Program": HeartHandshake,
  };
  const channelTabItems = ENROLMENT_CHANNELS.map((channel) => ({
    id: channel,
    label: channel,
    icon: channelIcons[channel],
  }));

  const channelTabs = isEnrolment && entry.category && !embedded && !driveContext ? (
    <UnderHeaderNavTabs
      tabs={channelTabItems}
      activeTab={(entry.enrolment_channel || "NHIA") as (typeof ENROLMENT_CHANNELS)[number]}
      onChange={setEnrolmentChannel}
      ariaLabel="Enrolment channel"
      size="lg"
    />
  ) : undefined;

  return (
    <StateOfficeFormShell
      reportType="enrolment"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={driveContext ? (onDriveBeneficiarySaved ?? onSubmitted) : onSubmitted}
      defaultZoneId={defaultZoneId || driveContext?.zonal_code || null}
      defaultStateId={defaultStateId || driveContext?.state_code || null}
      defaultReportYear={driveContext?.reporting_year ?? null}
      defaultReportMonth={driveContext?.reporting_month ?? null}
      pageTitle={driveContext ? "Beneficiary Registration" : (activityMeta?.label ?? "Enrolment Activity Reporting")}
      hideFooterActions
      hideBasicInfo
      hidePageHeader={embedded}
      compact={embedded}
      showQuarter={!driveContext}
      headerTabs={channelTabs}
      onLoaded={loadData}
      validate={() => {
        const e = entryRef.current;
        if (
          driveContext
          && isSshiaLikeChannel(e.enrolment_channel)
          && (!Number.isSafeInteger(Number(e.enrolment_count)) || Number(e.enrolment_count) < 1)
        ) {
          return "Enter a whole number of at least one beneficiary";
        }
        return validateEntry(e);
      }}
      buildPayload={(base) => ({
        ...base,
        ...(driveContext ? {
          drive_reference_id: driveContext.reference_id,
          state_id: driveContext.state_code,
          zone_id: driveContext.zonal_code,
          state_code: driveContext.state_code,
          zonal_code: driveContext.zonal_code,
          reporting_year: driveContext.reporting_year,
          reporting_month: driveContext.reporting_month,
        } : {}),
        lines: [toLinePayload(entryRef.current)],
      })}
    >
      {({ submitting, saving, persist, requestSubmit, stateId, header }) => {
        const periodBadge = [
          labelOf(header.states.map((s) => ({ value: String(s.id), label: s.label })), header.stateId, ""),
          [monthLabel(header.reportMonth), header.reportYear].filter(Boolean).join(" "),
          header.reportMonth ? `(Q${quarterFromMonth(header.reportMonth)})` : "",
        ].filter(Boolean).join(", ").replace(", (", " (");

        return (
        <div className="m-0 space-y-3 pb-2">
          {driveContext ? (
            <div className="rounded-sm border border-[#d4e8dc] bg-[#f8fbf9] px-3 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#0f3d2e]">
                  Already recorded:{" "}
                  <strong className="tabular-nums">
                    {Number(driveContext.beneficiaries_recorded || 0).toLocaleString()}
                  </strong>
                  <span className="text-slate-500 font-normal">
                    {" "}· In list to submit:{" "}
                    <strong className="tabular-nums text-[#0f3d2e]">{pendingBeneficiaries.length}</strong>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Add beneficiaries to the list, then submit once.
                </p>
              </div>
              {pendingBeneficiaries.length > 0 ? (
                <div className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden">
                  <ul className="divide-y divide-[#e8f3ec]">
                    {pendingBeneficiaries.map((row, index) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-[#0f3d2e] truncate">
                            {index + 1}. {row.label}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {[row.entry.enrolment_type, row.entry.program_name].filter(Boolean).join(" · ") || "NHIA"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 text-rose-600 hover:text-rose-700"
                          disabled={submittingList}
                          onClick={() => removePendingBeneficiary(row.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {isEnrolment && entry.category && embedded && !driveContext ? (
            <div className="bg-white border border-[#d4e8dc] rounded-sm px-2">
              <UnderHeaderNavTabs
                tabs={channelTabItems}
                activeTab={(entry.enrolment_channel || "NHIA") as (typeof ENROLMENT_CHANNELS)[number]}
                onChange={setEnrolmentChannel}
                ariaLabel="Enrolment channel"
                size="lg"
              />
            </div>
          ) : null}
          {fieldErrors.enrolment_channel ? (
            <p className="text-xs text-rose-600 px-1">{fieldErrors.enrolment_channel}</p>
          ) : null}
          <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible m-0">
            <CardContent className={cn("p-3 md:p-4", entry.category && "space-y-4")}>
              {!driveContext ? (
                <ReportBasicInfo
                  {...header}
                  lockZone={header.lockZone}
                  lockState={header.lockState}
                  showQuarter
                  embedded
                />
              ) : null}

              {entry.category ? (
              <div className="border-t border-[#e8f3ec] pt-4 space-y-5">
              {/* Enrolment — single form (NHIA includes identity + status; SSHIA/Equity keep count) */}
              {currentStep?.id === "channel" && isEnrolment && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {!isSshiaChannel && (
                    <Field label="Enrolment Date" required error={fieldErrors.activity_date}>
                      <Input
                        type="date"
                        className={controlClass}
                        value={entry.activity_date}
                        onChange={(e) => set("activity_date", e.target.value)}
                      />
                    </Field>
                  )}
                  {!isSshiaChannel && (
                    <Field label="Enrolment Type" required error={fieldErrors.enrolment_type}>
                      <Select
                        value={entry.enrolment_type}
                        onValueChange={(v) => setEntry((p) => ({
                          ...p,
                          enrolment_type: v,
                          program_name: "",
                          enrolment_category: "",
                          program_details: {},
                        }))}
                        disabled={!entry.enrolment_channel}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!entry.enrolment_channel ? "Select channel first" : "Select type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {ENROLMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field
                    label="Program"
                    required
                    error={fieldErrors.program_name}
                  >
                    <Select
                      value={entry.program_name}
                      onValueChange={(v) => setEntry((p) => ({
                        ...p,
                        program_name: v,
                        enrolment_category: "",
                        program_details: {},
                      }))}
                      disabled={
                        !entry.enrolment_channel
                        || (entry.enrolment_channel === "NHIA" && !entry.enrolment_type)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !entry.enrolment_channel
                              ? "Select channel first"
                              : entry.enrolment_channel === "NHIA" && !entry.enrolment_type
                                ? "Select enrolment type first"
                                : "Select program"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {programOptions.map((p) => (
                          <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {!isSshiaChannel && (
                  <Field
                    label="Enrolment Mode"
                    required={modeOptions.length > 0}
                    error={fieldErrors.enrolment_category}
                  >
                    <Select
                      value={entry.enrolment_category}
                      onValueChange={(v) => set("enrolment_category", v)}
                      disabled={Boolean(driveContext) || !entry.program_name || modeOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !entry.program_name
                              ? "Select program first"
                              : modeOptions.length === 0
                                ? "No mode for this program"
                                : "Select mode"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {modeOptions.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  )}
                  {isSshiaChannel && (
                  <Field
                    label={
                      entry.enrolment_channel === "Equity Program"
                        ? "Number of Beneficiaries"
                        : "Number Enrolled"
                    }
                    required
                    error={fieldErrors.enrolment_count}
                  >
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      className={controlClass}
                      value={entry.enrolment_count}
                      onChange={(e) => set("enrolment_count", e.target.value)}
                      placeholder={
                        entry.enrolment_channel === "Equity Program"
                          ? "Enter number of beneficiaries"
                          : "Enter number enrolled"
                      }
                    />
                  </Field>
                  )}
                  {!isSshiaChannel && (
                    <>
                      <ProgramFieldsGrid
                        fields={programFields}
                        values={entry.program_details}
                        onChange={setDetail}
                        onChangeMany={setDetails}
                        reportStateId={stateId}
                        alwaysShowIdentity
                      />
                      <Field label="Activity Status" required error={fieldErrors.activity_status}>
                        <Select
                          value={entry.activity_status}
                          onValueChange={(v) => setEntry((p) => ({
                            ...p,
                            activity_status: v,
                            status_reason: ENROLMENT_STATUS_NEEDS_REASON.has(v) ? p.status_reason : "",
                          }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_ACTIVITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      {ENROLMENT_STATUS_NEEDS_REASON.has(entry.activity_status) && (
                        <Field label="Reason" required error={fieldErrors.status_reason} className="sm:col-span-2 lg:col-span-3">
                          <Textarea
                            rows={2}
                            value={entry.status_reason}
                            onChange={(e) => set("status_reason", e.target.value)}
                            placeholder="Required when status is Not Conducted or Cancelled"
                          />
                        </Field>
                      )}
                      <Field label="Supporting Evidence">
                        <Select value={entry.supporting_evidence} onValueChange={(v) => set("supporting_evidence", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_EVIDENCE_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Funding Option">
                        <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {ENROLMENT_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      {isBudgeted && (
                        <>
                          <Field label="Activity Budget (₦)" required error={fieldErrors.activity_budget}>
                            <Input type="number" min={0} className={controlClass} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                          </Field>
                          <Field label="Approved Amount (₦)" required error={fieldErrors.approved_amount}>
                            <Input type="number" min={0} className={controlClass} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                          </Field>
                        </>
                      )}
                      <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                        <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
                      </Field>
                    </>
                  )}
                </div>
              )}

              {/* STEP: NIN Validation */}
              {currentStep?.id === "details" && isNin && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Validation Date" required error={fieldErrors.validation_date}>
                    <Input
                      type="date"
                      className={controlClass}
                      value={entry.validation_date || todayIsoDate()}
                      max={todayIsoDate()}
                      onChange={(e) => {
                        const v = e.target.value || todayIsoDate();
                        setEntry((p) => ({
                          ...p,
                          validation_date: v,
                          activity_date: v,
                        }));
                      }}
                    />
                  </Field>
                  <Field label="Enrollee Name" required error={fieldErrors.enrollee_name}>
                    <Input className={controlClass} value={entry.enrollee_name} onChange={(e) => set("enrollee_name", e.target.value)} />
                  </Field>
                  <Field label="NIN" required error={fieldErrors.nin_number}>
                    <Input className={controlClass} value={entry.nin_number} onChange={(e) => set("nin_number", e.target.value)} />
                  </Field>
                  <Field label="Program" required error={fieldErrors.program_name}>
                    <Select value={entry.program_name} onValueChange={(v) => set("program_name", v)}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {allProgramsForSimpleSelect.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Organization">
                    <Input
                      className={controlClass}
                      value={entry.organization_name}
                      onChange={(e) => set("organization_name", e.target.value)}
                      placeholder="Where applicable"
                    />
                  </Field>
                  <Field label="Validation Status" required error={fieldErrors.validation_status}>
                    <Select
                      value={entry.validation_status}
                      onValueChange={(v) => setEntry((p) => ({
                        ...p,
                        validation_status: v,
                        not_validated_reason: v === "Not validated" ? p.not_validated_reason : "",
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_NIN_VALIDATION_STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {entry.validation_status === "Not validated" && (
                    <Field label="Reason (not validated)" required error={fieldErrors.not_validated_reason} className="sm:col-span-2 lg:col-span-3">
                      <Textarea rows={2} value={entry.not_validated_reason} onChange={(e) => set("not_validated_reason", e.target.value)} />
                    </Field>
                  )}
                  <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                    <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
                  </Field>
                </div>
              )}

              {/* STEP: Validation of Enrollees */}
              {currentStep?.id === "details" && isValidation && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Activity Date" required error={fieldErrors.activity_date}>
                    <Input type="date" className={controlClass} value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                  </Field>
                  <Field label="Program" required error={fieldErrors.program_name}>
                    <Select value={entry.program_name} onValueChange={(v) => set("program_name", v)}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {allProgramsForSimpleSelect.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Name of Organization">
                    <Input className={controlClass} value={entry.organization_name} onChange={(e) => set("organization_name", e.target.value)} />
                  </Field>
                  <Field label="Funding Option">
                    <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {isBudgeted && (
                    <>
                      <Field label="Activity Budget Amount (₦)" required error={fieldErrors.activity_budget}>
                        <Input type="number" min={0} className={controlClass} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                      </Field>
                      <Field label="Approved Budget (₦)" required error={fieldErrors.approved_amount}>
                        <Input type="number" min={0} className={controlClass} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                      </Field>
                    </>
                  )}
                  <Field label="Records Validated" required error={fieldErrors.enrollees_validated}>
                    <Input type="number" min={0} className={controlClass} value={entry.enrollees_validated} onChange={(e) => set("enrollees_validated", e.target.value)} />
                  </Field>
                  <Field label="Supporting Evidence">
                    <Select value={entry.supporting_evidence} onValueChange={(v) => set("supporting_evidence", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_EVIDENCE_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                    <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
                  </Field>
                </div>
              )}

              {/* STEP: ID Card */}
              {currentStep?.id === "details" && isIdCard && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Request Category" required error={fieldErrors.request_category}>
                    <Select value={entry.request_category} onValueChange={(v) => set("request_category", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_ID_CARD_REQUEST_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of Request" required error={fieldErrors.activity_date}>
                    <Input type="date" className={controlClass} value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                  </Field>
                  <Field label="Enrollee Name" required error={fieldErrors.enrollee_name}>
                    <Input className={controlClass} value={entry.enrollee_name} onChange={(e) => set("enrollee_name", e.target.value)} />
                  </Field>
                  <Field label="NHIA Number" required error={fieldErrors.nhia_number}>
                    <Input className={controlClass} value={entry.nhia_number} onChange={(e) => set("nhia_number", e.target.value)} />
                  </Field>
                  <Field label="Program" required error={fieldErrors.program_name}>
                    <Select value={entry.program_name} onValueChange={(v) => set("program_name", v)}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {allProgramsForSimpleSelect.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Payment Reference"
                    required={entry.request_category.startsWith("Replacement")}
                    error={fieldErrors.payment_reference}
                  >
                    <Input className={controlClass} value={entry.payment_reference} onChange={(e) => set("payment_reference", e.target.value)} />
                  </Field>
                  <Field label="Status" required error={fieldErrors.id_card_status}>
                    <Select
                      value={entry.id_card_status}
                      onValueChange={(v) => setEntry((p) => ({
                        ...p,
                        id_card_status: v,
                        issue_date: v === "Issued" ? (p.issue_date || todayIsoDate()) : "",
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_ID_CARD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {entry.id_card_status === "Issued" && (
                    <Field label="Issue Date" required error={fieldErrors.issue_date}>
                      <Input type="date" className={controlClass} value={entry.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
                    </Field>
                  )}
                  <Field label="Remarks / notes" className="sm:col-span-2 lg:col-span-3">
                    <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Exception or replacement reason" />
                  </Field>
                </div>
              )}

              {/* Footer */}
              {entry.category ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8f3ec]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={saving || submitting || submittingList}
                    onClick={() => {
                      if (categoryLocked) {
                        (onCancel ?? onBack)();
                        return;
                      }
                      setEntry(fresh());
                      setStepIndex(0);
                      setFieldErrors({});
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    {driveContext ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-[#1a7a52] text-[#0f3d2e]"
                          disabled={submittingList}
                          onClick={addBeneficiaryToList}
                        >
                          <Plus className="w-4 h-4" />
                          Add to list
                        </Button>
                        <Button
                          className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                          disabled={submittingList || pendingBeneficiaries.length === 0}
                          onClick={() => void submitPendingBeneficiaries()}
                        >
                          {submittingList
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                            : <><Send className="w-4 h-4" /> Submit ({pendingBeneficiaries.length})</>}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          disabled={saving || submitting}
                          onClick={() => persist("draft")}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save draft
                        </Button>
                        <Button
                          className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                          disabled={saving || submitting}
                          onClick={() => requestSubmit(() => persist("submitted"))}
                        >
                          {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                            : <><Send className="w-4 h-4" /> Submit</>}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
              </div>
              ) : null}
            </CardContent>
          </Card>

          {!entry.category && (
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
                {ENROLMENT_ACTIVITIES.map((a) => {
                  const Icon = ENROLMENT_ACTIVITY_ICONS[a.value];
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => selectActivity(a.value)}
                      className="group flex items-center gap-4 rounded-sm border border-[#d4e8dc] bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-[#1a7a52] hover:bg-[#f7fcf9] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a52]/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#e8f6ee] text-[#145c3f]">
                        <Icon className="h-6 w-6" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-900">{a.label}</p>
                        <p className="mt-0.5 text-sm text-slate-500 leading-snug">{a.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#145c3f] opacity-70 transition group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
              {fieldErrors.category && (
                <p className="text-[11px] font-medium text-rose-600 px-1">{fieldErrors.category}</p>
              )}
            </div>
          )}
        </div>
        );
      }}
    </StateOfficeFormShell>
  );
}
