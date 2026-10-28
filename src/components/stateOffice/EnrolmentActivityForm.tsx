import * as React from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardCheck, IdCard,
  Loader2, Save, Send, ShieldCheck, UserPlus, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import StateOfficeFormShell from "./StateOfficeFormShell";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import { NIGERIAN_STATE_NAMES, lgasForState } from "./nigeriaGeo";
import { labelOf, monthLabel, quarterFromMonth } from "./constants";
import {
  ENROLMENT_ACTIVITIES,
  ENROLMENT_ACTIVITY_STATUSES,
  ENROLMENT_BENEFICIARY_CATEGORIES,
  ENROLMENT_BENEFICIARY_STATUSES,
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
  ENROLMENT_SSHIA_CHANNELS,
  ENROLMENT_STATUS_NEEDS_REASON,
  computeGifshipDates,
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
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));

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
  validation_date: "",
  not_validated_reason: "",
  request_category: "",
  nhia_number: "",
  payment_reference: "",
  id_card_status: "",
  issue_date: "",
  program_details: {} as ProgramDetails,
});

type Entry = ReturnType<typeof blank>;

type StepId = "activity" | "channel" | "details" | "beneficiary" | "review";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({
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

function reviewValueForProgramField(f: EnrolmentProgramFieldDef, details: ProgramDetails): string {
  if (f.type === "hmo" || f.type === "hcf") {
    const name = String(details[f.key] ?? "").trim();
    const code = String(details[`${f.key}_code`] ?? "").trim();
    if (name && code) return `${name} (${code})`;
    return name || code;
  }
  return String(details[f.key] ?? "").trim();
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
          className={isAutoDate ? "bg-slate-50 text-slate-600" : undefined}
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

function ProgramFieldsGrid({
  fields,
  values,
  onChange,
  onChangeMany,
  reportStateId,
}: {
  fields: EnrolmentProgramFieldDef[];
  values: ProgramDetails;
  onChange: (key: string, value: string) => void;
  onChangeMany: (patch: ProgramDetails) => void;
  reportStateId: string;
}) {
  if (fields.length === 0) return null;

  const locationKeys = new Set(["state_of_origin", "lga_of_origin", "state_of_residence", "lga_of_residence"]);
  const providerKeys = new Set(["hmo", "hcf", "alternative_provider"]);
  const identityKeys = new Set([
    "surname", "first_name", "middle_name", "nin", "organization_mda", "entity_type",
    "blood_group", "marital_status", "phone_number", "program_type",
  ]);

  const identity = fields.filter((f) => identityKeys.has(f.key));
  const location = fields.filter((f) => locationKeys.has(f.key));
  const providers = fields.filter((f) => providerKeys.has(f.key));
  const other = fields.filter(
    (f) => !identityKeys.has(f.key) && !locationKeys.has(f.key) && !providerKeys.has(f.key),
  );

  const groups: { title: string; items: EnrolmentProgramFieldDef[] }[] = [
    { title: "Identity", items: identity },
    { title: "Location", items: location },
    { title: "Providers", items: providers },
    { title: "Program details", items: other },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5 rounded-2xl border border-[#d4e8dc] bg-gradient-to-b from-[#f7fbf9] to-white p-4 md:p-5">
      {groups.map((g) => (
        <FieldSection key={g.title} title={g.title}>
          {g.items.map((f) => renderProgramField(f, fields, values, onChange, onChangeMany, reportStateId))}
        </FieldSection>
      ))}
    </div>
  );
}

/** Content steps after an activity is chosen (picker is separate). */
function stepsForCategory(category: string): { id: StepId; label: string }[] {
  if (category === "enrolment") {
    return [
      { id: "channel", label: "Channel" },
      { id: "details", label: "Details" },
      { id: "beneficiary", label: "Beneficiary" },
      { id: "review", label: "Review" },
    ];
  }
  if (category === "nin_validation") {
    return [
      { id: "details", label: "NIN Validation" },
      { id: "review", label: "Review" },
    ];
  }
  if (category === "validation_of_enrolees") {
    return [
      { id: "details", label: "Validation" },
      { id: "review", label: "Review" },
    ];
  }
  if (category === "id_card_issuance") {
    return [
      { id: "details", label: "ID Card" },
      { id: "review", label: "Review" },
    ];
  }
  return [];
}

/** Activity Reporting Template — stepped flow from Enrolment.pptx */
export default function EnrolmentActivityForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const fresh = (): Entry => ({ ...blank(), program_details: {} });
  const [entry, setEntry] = React.useState<Entry>(fresh);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = React.useState(0);
  const entryRef = React.useRef(entry);
  entryRef.current = entry;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const setDetail = (key: string, value: string) =>
    setEntry((p) => ({ ...p, program_details: { ...p.program_details, [key]: value } }));
  const setDetails = (patch: ProgramDetails) =>
    setEntry((p) => ({ ...p, program_details: { ...p.program_details, ...patch } }));

  const isBudgeted = entry.funding_option === ENROLMENT_BUDGETED;
  const isEnrolment = entry.category === "enrolment";
  const isNin = entry.category === "nin_validation";
  const isIdCard = entry.category === "id_card_issuance";
  const isValidation = entry.category === "validation_of_enrolees";

  const steps = React.useMemo(() => stepsForCategory(entry.category), [entry.category]);
  const currentStep = steps.length
    ? steps[Math.min(stepIndex, steps.length - 1)]
    : null;
  const isReviewStep = currentStep?.id === "review";

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
    if (entry.enrolment_channel !== "NHIA" && !isNin && !isIdCard && !isValidation) return [];
    const nhia = ENROLMENT_PROGRAMS.map((p) => ({ code: p.code as string | null, label: p.label }));
    if (!isEnrolment) return nhia;
    if (entry.enrolment_type === "Renewal") {
      return nhia.filter((p) => ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(p.label));
    }
    if (entry.enrolment_type === "Fresh Enrolment") return nhia;
    return [];
  }, [entry.enrolment_channel, entry.enrolment_type, isEnrolment, isNin, isIdCard, isValidation]);

  const modeOptions = React.useMemo(
    () => modesOfRegistrationForProgram(entry.program_name),
    [entry.program_name],
  );

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
      validation_date: details.validation_date ?? "",
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
    const first = (v.lines ?? [])[0];
    if (first) {
      setEntry(lineToEntry(first));
      setFieldErrors({});
      setStepIndex(0);
    }
  };

  const selectActivity = (category: string) => {
    setEntry({ ...fresh(), category });
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
        validation_date: e.validation_date,
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
    const fieldKeys = programSpecificFieldsFor(e.enrolment_channel, e.program_name).map((f) => f.key);
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
      if (!e.activity_date) return fail("activity_date", "Enter the enrolment date");
      if (!e.enrolment_channel) return fail("enrolment_channel", "Select enrolment channel");
      if (e.enrolment_channel === "NHIA" && !e.enrolment_type) {
        return fail("enrolment_type", "Select enrolment type");
      }
      if (!e.program_name) return fail("program_name", "Select program");
      if (modes.length > 0 && !e.enrolment_category) {
        return fail("enrolment_category", "Select enrolment mode");
      }
      if (e.enrolment_type === "Renewal" && !ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(e.program_name)) {
        return fail("program_name", "Renewal is only allowed for GIFSHIP-G, GIFSHIP-C or GIFSHIP-R");
      }
      return null;
    }

    if (stepId === "details" && e.category === "enrolment") {
      if (!e.enrolment_type && e.enrolment_channel === "NHIA") {
        return fail("enrolment_type", "Select enrolment type");
      }
      if (!e.beneficiary_category) return fail("beneficiary_category", "Select beneficiary category");
      if (!e.beneficiary_status) return fail("beneficiary_status", "Select beneficiary status");
      if (!e.activity_status) return fail("activity_status", "Select the activity status");
      if (ENROLMENT_STATUS_NEEDS_REASON.has(e.activity_status) && !e.status_reason.trim()) {
        return fail("status_reason", "Enter a reason for Not Conducted / Cancelled");
      }
      if (budgeted && e.activity_budget === "") return fail("activity_budget", "Enter activity budget");
      if (budgeted && e.approved_amount === "") return fail("approved_amount", "Enter approved amount");
      if (e.enrolment_count !== "" && Number(e.enrolment_count) < 0) {
        return fail("enrolment_count", "Number enrolled must be a whole non-negative number");
      }
      return null;
    }

    if (stepId === "details" && e.category === "nin_validation") {
      if (!e.enrollee_name.trim()) return fail("enrollee_name", "Enter enrollee name");
      if (!e.program_name) return fail("program_name", "Select program");
      if (!e.nin_number.trim()) return fail("nin_number", "Enter NIN");
      if (!e.validation_status) return fail("validation_status", "Select validation status");
      if (!e.validation_date) return fail("validation_date", "Enter validation date");
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

    if (stepId === "beneficiary") {
      // Program-specific fields are conditional; no hard block unless surname/first_name present in schema
      const requiredKeys = programSpecificFieldsFor(e.enrolment_channel, e.program_name)
        .filter((f) => f.key === "surname" || f.key === "first_name")
        .map((f) => f.key);
      for (const key of requiredKeys) {
        if (!String(e.program_details?.[key] ?? "").trim()) {
          return fail(key, key === "surname" ? "Enter surname" : "Enter first name");
        }
      }
      return null;
    }

    return null;
  };

  const validateEntry = (e: Entry = entryRef.current): string | null => {
    if (!e.category) return fail("category", "Select an enrolment activity");
    for (const step of stepsForCategory(e.category)) {
      if (step.id === "review") continue;
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
    return {
      category: e.category,
      activity_code: act?.code ?? null,
      activity_date: e.activity_date || null,
      enrolment_channel: e.enrolment_channel || null,
      enrolment_type: e.enrolment_type || null,
      program_code: prog?.code ?? null,
      program_name: e.program_name || null,
      enrolment_category: e.enrolment_category || null,
      beneficiary_category: e.beneficiary_category || null,
      beneficiary_status: e.beneficiary_status || null,
      funding_option: e.funding_option || null,
      supporting_evidence: e.supporting_evidence || null,
      activity_budget: budgeted ? numOrNull(e.activity_budget) : null,
      approved_amount: budgeted ? numOrNull(e.approved_amount) : null,
      enrolment_count: Number(e.enrolment_count) || 0,
      enrollees_validated: numOrNull(e.enrollees_validated),
      activity_status: e.activity_status || e.id_card_status || e.validation_status || null,
      status_reason: e.status_reason || null,
      remarks: e.remarks || null,
      program_details: details && Object.keys(details).length ? details : null,
    };
  };

  const allProgramsForSimpleSelect = React.useMemo(
    () => ENROLMENT_PROGRAMS.map((p) => p.label),
    [],
  );

  const goNext = () => {
    if (!currentStep) return;
    const err = validateStep(currentStep.id);
    if (err) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const activityLabel = ENROLMENT_ACTIVITIES.find((a) => a.value === entry.category)?.label
    ?? "Select activity";

  return (
    <StateOfficeFormShell
      reportType="enrolment"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle="Enrolment Activity Reporting"
      hideFooterActions
      hideBasicInfo
      showQuarter
      onLoaded={loadData}
      validate={() => validateEntry(entryRef.current)}
      buildPayload={(base) => ({
        ...base,
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
        <div className="space-y-4 pb-2">
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible">
            <CardContent className={cn("p-4 md:p-5", entry.category && "space-y-5")}>
              <ReportBasicInfo
                {...header}
                lockZone={header.lockZone}
                lockState={header.lockState}
                showQuarter
                embedded
              />

              {entry.category ? (
                <div className="border-t border-[#e8f3ec] pt-4">
                  <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {steps.map((s, i) => {
                      const done = i < stepIndex;
                      const active = i === stepIndex;
                      return (
                        <React.Fragment key={s.id}>
                          {i > 0 && (
                            <div className={cn(
                              "h-px w-4 sm:w-8 shrink-0",
                              done ? "bg-[#1a7a52]" : "bg-[#d4e8dc]",
                            )} />
                          )}
                          <li className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => { if (i <= stepIndex) setStepIndex(i); }}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border transition-colors",
                                done && "bg-[#145c3f] text-white border-[#145c3f]",
                                active && !done && "bg-[#145c3f] text-white border-[#145c3f]",
                                !done && !active && "bg-white text-slate-400 border-[#d4e8dc]",
                              )}
                              aria-current={active ? "step" : undefined}
                              aria-label={s.label}
                            >
                              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </button>
                            <span className={cn(
                              "text-xs font-semibold whitespace-nowrap",
                              active ? "text-[#0f3d2e]" : "text-slate-400",
                            )}>
                              {s.label}
                            </span>
                          </li>
                        </React.Fragment>
                      );
                    })}
                  </ol>
                </div>
              ) : null}

              {entry.category ? (
              <div className="border-t border-[#e8f3ec] pt-4 space-y-5">
              {/* STEP: Channel & Program (Enrolment) */}
              {currentStep?.id === "channel" && isEnrolment && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Enrolment Date" required error={fieldErrors.activity_date}>
                    <Input
                      type="date"
                      value={entry.activity_date}
                      onChange={(e) => set("activity_date", e.target.value)}
                    />
                  </Field>
                  <Field label="Enrolment Channel" required error={fieldErrors.enrolment_channel}>
                    <Select
                      value={entry.enrolment_channel}
                      onValueChange={(v) => setEntry((p) => ({
                        ...p,
                        enrolment_channel: v,
                        enrolment_type: "",
                        program_name: "",
                        enrolment_category: "",
                        program_details: {},
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {entry.enrolment_channel !== "SSHIA" && (
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
                  <Field label="Program" required error={fieldErrors.program_name}>
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
                  <Field
                    label="Enrolment Mode"
                    required={modeOptions.length > 0}
                    error={fieldErrors.enrolment_category}
                  >
                    <Select
                      value={entry.enrolment_category}
                      onValueChange={(v) => set("enrolment_category", v)}
                      disabled={!entry.program_name || modeOptions.length === 0}
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
                </div>
              )}

              {/* STEP: Details & Funding (Enrolment) */}
              {currentStep?.id === "details" && isEnrolment && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entry.enrolment_channel !== "SSHIA" && (
                    <Field label="Enrolment Type" required error={fieldErrors.enrolment_type}>
                      <Select
                        value={entry.enrolment_type}
                        onValueChange={(v) => set("enrolment_type", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ENROLMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field label="Beneficiary Category" required error={fieldErrors.beneficiary_category}>
                    <Select value={entry.beneficiary_category} onValueChange={(v) => set("beneficiary_category", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_BENEFICIARY_STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Beneficiary Status" required error={fieldErrors.beneficiary_status}>
                    <Select value={entry.beneficiary_status} onValueChange={(v) => set("beneficiary_status", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ENROLMENT_BENEFICIARY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                        <Input type="number" min={0} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                      </Field>
                      <Field label="Approved Amount (₦)" required error={fieldErrors.approved_amount}>
                        <Input type="number" min={0} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                      </Field>
                    </>
                  )}
                  <Field label="Number Enrolled / Beneficiaries" error={fieldErrors.enrolment_count}>
                    <Input type="number" min={0} value={entry.enrolment_count} onChange={(e) => set("enrolment_count", e.target.value)} />
                  </Field>
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
                  <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                    <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
                  </Field>
                </div>
              )}

              {/* STEP: Beneficiary (Enrolment) */}
              {currentStep?.id === "beneficiary" && isEnrolment && (
                programFields.length > 0 ? (
                  <ProgramFieldsGrid
                    fields={programFields}
                    values={entry.program_details}
                    onChange={setDetail}
                    onChangeMany={setDetails}
                    reportStateId={stateId}
                  />
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    No program-specific beneficiary fields for this selection. Continue to review.
                  </p>
                )
              )}

              {/* STEP: NIN Validation */}
              {currentStep?.id === "details" && isNin && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Validation Date" required error={fieldErrors.validation_date}>
                    <Input type="date" value={entry.validation_date || entry.activity_date} onChange={(e) => {
                      set("validation_date", e.target.value);
                      set("activity_date", e.target.value);
                    }} />
                  </Field>
                  <Field label="Enrollee Name" required error={fieldErrors.enrollee_name}>
                    <Input value={entry.enrollee_name} onChange={(e) => set("enrollee_name", e.target.value)} />
                  </Field>
                  <Field label="NIN" required error={fieldErrors.nin_number}>
                    <Input value={entry.nin_number} onChange={(e) => set("nin_number", e.target.value)} />
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
                    <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
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
                    <Input value={entry.organization_name} onChange={(e) => set("organization_name", e.target.value)} />
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
                        <Input type="number" min={0} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                      </Field>
                      <Field label="Approved Budget (₦)" required error={fieldErrors.approved_amount}>
                        <Input type="number" min={0} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                      </Field>
                    </>
                  )}
                  <Field label="Records Validated" required error={fieldErrors.enrollees_validated}>
                    <Input type="number" min={0} value={entry.enrollees_validated} onChange={(e) => set("enrollees_validated", e.target.value)} />
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
                    <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                  </Field>
                  <Field label="Enrollee Name" required error={fieldErrors.enrollee_name}>
                    <Input value={entry.enrollee_name} onChange={(e) => set("enrollee_name", e.target.value)} />
                  </Field>
                  <Field label="NHIA Number" required error={fieldErrors.nhia_number}>
                    <Input value={entry.nhia_number} onChange={(e) => set("nhia_number", e.target.value)} />
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
                    <Input value={entry.payment_reference} onChange={(e) => set("payment_reference", e.target.value)} />
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
                      <Input type="date" value={entry.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
                    </Field>
                  )}
                  <Field label="Remarks / notes" className="sm:col-span-2 lg:col-span-3">
                    <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Exception or replacement reason" />
                  </Field>
                </div>
              )}

              {/* STEP: Review */}
              {currentStep?.id === "review" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#d4e8dc] bg-[#f8fbf9] p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#145c3f]">Ready to submit</p>
                    <p className="text-sm text-slate-600">
                      Confirm every section below before saving or submitting this activity.
                    </p>
                  </div>

                  <ReviewSection title="Activity summary">
                    <ReviewRow label="Activity" value={activityLabel} />
                    <ReviewRow label="Date" value={entry.activity_date || entry.validation_date} />
                    <ReviewRow label="Channel" value={entry.enrolment_channel} />
                    <ReviewRow label="Enrolment type" value={entry.enrolment_type} />
                    <ReviewRow label="Program" value={entry.program_name} />
                    <ReviewRow label="Enrolment mode" value={entry.enrolment_category} />
                    <ReviewRow label="Beneficiary category" value={entry.beneficiary_category} />
                    <ReviewRow label="Beneficiary status" value={entry.beneficiary_status} />
                    <ReviewRow label="Funding" value={entry.funding_option} />
                    <ReviewRow
                      label="Activity budget (₦)"
                      value={entry.activity_budget !== "" ? entry.activity_budget : ""}
                    />
                    <ReviewRow
                      label="Approved budget (₦)"
                      value={entry.approved_amount !== "" ? entry.approved_amount : ""}
                    />
                    <ReviewRow label="Activity status" value={entry.activity_status || entry.validation_status || entry.id_card_status} />
                    <ReviewRow label="Status reason" value={entry.status_reason} />
                    <ReviewRow label="Number enrolled" value={entry.enrolment_count} />
                    <ReviewRow label="Records validated" value={entry.enrollees_validated} />
                    <ReviewRow label="Evidence" value={entry.supporting_evidence} />
                    <ReviewRow label="Remarks" value={entry.remarks} />
                  </ReviewSection>

                  {(isNin || isIdCard || isValidation) && (
                    <ReviewSection title={isNin ? "NIN validation" : isIdCard ? "ID card" : "Validation details"}>
                      <ReviewRow label="Enrollee" value={entry.enrollee_name} />
                      <ReviewRow label="Organization" value={entry.organization_name} />
                      <ReviewRow label="NIN" value={entry.nin_number} />
                      <ReviewRow label="Validation status" value={entry.validation_status} />
                      <ReviewRow label="Not validated reason" value={entry.not_validated_reason} />
                      <ReviewRow label="Request category" value={entry.request_category} />
                      <ReviewRow label="NHIA number" value={entry.nhia_number} />
                      <ReviewRow label="Payment reference" value={entry.payment_reference} />
                      <ReviewRow label="ID card status" value={entry.id_card_status} />
                      <ReviewRow label="Issue date" value={entry.issue_date} />
                    </ReviewSection>
                  )}

                  {isEnrolment && programFields.length > 0 && (() => {
                    const locationKeys = new Set(["state_of_origin", "lga_of_origin", "state_of_residence", "lga_of_residence"]);
                    const providerKeys = new Set(["hmo", "hcf", "alternative_provider"]);
                    const identityKeys = new Set([
                      "surname", "first_name", "middle_name", "nin", "organization_mda", "entity_type",
                      "blood_group", "marital_status", "phone_number", "program_type",
                    ]);
                    const groups = [
                      { title: "Beneficiary identity", items: programFields.filter((f) => identityKeys.has(f.key)) },
                      { title: "Location", items: programFields.filter((f) => locationKeys.has(f.key)) },
                      { title: "Providers", items: programFields.filter((f) => providerKeys.has(f.key)) },
                      {
                        title: "Program details",
                        items: programFields.filter(
                          (f) => !identityKeys.has(f.key) && !locationKeys.has(f.key) && !providerKeys.has(f.key),
                        ),
                      },
                    ];
                    return groups.map((g) => (
                      <ReviewSection key={g.title} title={g.title}>
                        {g.items.map((f) => (
                          <ReviewRow
                            key={f.key}
                            label={f.label}
                            value={reviewValueForProgramField(f, entry.program_details)}
                          />
                        ))}
                      </ReviewSection>
                    ));
                  })()}
                </div>
              )}

              {/* Footer nav — only after an activity is chosen */}
              {entry.category ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8f3ec]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={saving || submitting}
                    onClick={() => {
                      if (stepIndex === 0) {
                        // Return to activity picker
                        setEntry(fresh());
                        setStepIndex(0);
                        setFieldErrors({});
                        return;
                      }
                      goBack();
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    {isReviewStep ? (
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
                    ) : (
                      <Button
                        className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2 text-white"
                        onClick={goNext}
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </Button>
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
                      className="group flex items-center gap-4 rounded-2xl border border-[#d4e8dc] bg-white px-5 py-5 text-left shadow-sm transition-all hover:border-[#1a7a52] hover:bg-[#f7fcf9] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a52]/40"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#145c3f]">
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
