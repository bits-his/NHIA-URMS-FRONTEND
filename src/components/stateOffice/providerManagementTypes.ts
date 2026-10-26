/**
 * Provider Management — fields and lists from the PPT/Excel specification.
 */

export const PROVIDER_FORM_TYPES = [
  {
    key: "accreditation",
    label: "Accreditation",
    code: "PM-0001",
    activity: "Accreditation",
    description: "Assess and accredit healthcare facilities for NHIA participation.",
  },
  {
    key: "reaccreditation",
    label: "Reaccreditation",
    code: "PM-0002",
    activity: "Re-accreditation",
    description: "Review and renew accreditation for existing facilities.",
  },
  {
    key: "qa-inspections",
    label: "Quality Assurance",
    code: "PM-0003",
    activity: "Quality Assurance",
    description: "Inspect facilities and record quality assurance findings.",
  },
  {
    key: "medical-audits",
    label: "Medical Audit",
    code: "PM-0004",
    activity: "Medical Audit",
    description: "Conduct medical audits and document compliance outcomes.",
  },
] as const;

export type ProviderFormKey = (typeof PROVIDER_FORM_TYPES)[number]["key"];

export const PROVIDER_MANAGEMENT_ACTIVITIES = PROVIDER_FORM_TYPES.map((f) => ({
  code: f.code,
  label: f.activity,
}));

export const PROVIDER_PROGRAMS = [
  { code: "PRG-0001", label: "FSSHIP" },
  { code: "PRG-0002", label: "BHCPF" },
  { code: "PRG-OTHER", label: "Other" },
] as const;

export const PROVIDER_RELATED_PROGRAMMES = ["FSSHIP", "BHCPF", "Other"] as const;

export const PROVIDER_BHCPF_ACTIVITY_TYPES = ["Accreditation", "Reaccreditation"] as const;

export const PROVIDER_FUNDING_OPTIONS = [
  "Routine",
  "Funded (Budgetary)",
  "Special/Ad-hoc Funded",
] as const;

/** Show budget fields for these funding options. */
export const PROVIDER_FUNDED_OPTIONS = new Set([
  "Funded (Budgetary)",
  "Special/Ad-hoc Funded",
]);

export const PROVIDER_BUDGETED = "Funded (Budgetary)";

export const PROVIDER_ACTIVITY_STATUSES = [
  "Completed",
  "In Progress",
  "Not Conducted",
  "Not Applicable",
  "Deferred",
  "Cancelled",
] as const;

export const PROVIDER_REPORT_STATUSES = [
  "draft",
  "awaiting_review",
  "returned",
  "endorsed",
  "submitted",
  "approved",
] as const;

export const PROVIDER_REPORT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_review: "Awaiting State Coordinator Review",
  returned: "Returned for Correction",
  endorsed: "Endorsed",
  submitted: "Submitted",
  approved: "Approved",
};

/** Manual metric labels by form + programme (+ BHCPF activity type). Linked counts are not listed here. */
export function providerManualMetrics(opts: {
  formKey: ProviderFormKey;
  programme: string;
  bhcpfType?: string | null;
}): string[] {
  const { formKey, programme, bhcpfType } = opts;
  if (formKey === "qa-inspections" || formKey === "medical-audits") return [];

  if (programme === "BHCPF") {
    const type = bhcpfType || (formKey === "reaccreditation" ? "Reaccreditation" : "Accreditation");
    if (type === "Reaccreditation") {
      return ["Number of PHCs Awaiting Re-accreditation"];
    }
    return ["Number of PHCs Awaiting Accreditation"];
  }

  if (formKey === "accreditation") {
    return [
      "Number of Applications Received (Accreditation)",
      "Number of Accreditation Forms Sold",
      "Number of Completed/Returned Forms",
      "Number of Facilities Awaiting Accreditation",
    ];
  }

  if (formKey === "reaccreditation") {
    return ["Number of Facilities Awaiting Re-accreditation"];
  }

  return [];
}

export function providerLinkedMetricLabel(opts: {
  formKey: ProviderFormKey;
  programme: string;
  bhcpfType?: string | null;
}): string | null {
  const { formKey, programme, bhcpfType } = opts;
  if (formKey === "qa-inspections" || formKey === "medical-audits") return null;
  if (programme === "BHCPF") {
    const type = bhcpfType || (formKey === "reaccreditation" ? "Reaccreditation" : "Accreditation");
    return type === "Reaccreditation"
      ? "Number of PHCs Re-accredited"
      : "Number of PHCs Accredited";
  }
  if (formKey === "accreditation") return "Number of Facilities Accredited";
  if (formKey === "reaccreditation") return "Number of Facilities Re-accredited";
  return null;
}

export function coverageRates(totalState: number, planned: number, covered: number) {
  const periodCoverage = totalState > 0 ? Math.round((covered / totalState) * 1000) / 10 : null;
  const planAchievement = planned > 0 ? Math.round((covered / planned) * 1000) / 10 : null;
  return { periodCoverage, planAchievement };
}

export function formMeta(formKey: string) {
  return PROVIDER_FORM_TYPES.find((f) => f.key === formKey) || PROVIDER_FORM_TYPES[0];
}

/** @deprecated kept for activityReportTemplateConfig imports during transition */
export const PROVIDER_EVIDENCE_TYPES = [
  "Inspection Report", "Accreditation Letter", "Photographs", "Attendance Register",
  "Signed Checklist", "Facility Register", "Audit Report", "Other (Specify)",
] as const;

/** @deprecated use providerManualMetrics */
export const PROVIDER_METRICS_BY_ACTIVITY: Record<string, Partial<Record<string, string[]>>> = {
  Accreditation: {
    FSSHIP: [
      "Number of Applications Received (Accreditation)",
      "Number of Accreditation Forms Sold",
      "Number of Completed/Returned Forms",
      "Number of Facilities Awaiting Accreditation",
    ],
    BHCPF: ["Number of PHCs Awaiting Accreditation"],
  },
  "Re-accreditation": {
    FSSHIP: ["Number of Facilities Awaiting Re-accreditation"],
    BHCPF: ["Number of PHCs Awaiting Re-accreditation"],
  },
  "Quality Assurance": {},
  "Medical Audit": {},
};
