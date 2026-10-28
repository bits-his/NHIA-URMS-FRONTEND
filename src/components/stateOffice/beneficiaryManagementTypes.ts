/**
 * Beneficiary Management — one hub for dependant, provider-change, and MDA HMO requests.
 * Field rules follow the revised Beneficiary Management form concept.
 */

export const BENEFICIARY_MANAGEMENT_NAV_TITLE = "Beneficiary Management";
export const BENEFICIARY_MANAGEMENT_VIEW = "state-beneficiary-management";
export const BENEFICIARY_MANAGEMENT_PATH = "/zonal/beneficiary";

export const BENEFICIARY_REPORT_TYPES = ["extra-dependant", "hmo-selection", "hcf-change"] as const;

export const LEGACY_BENEFICIARY_TITLES = [
  "Additional / Extra Dependant",
  "Extra Dependant",
  "HMO Selection Process",
  "MDA Change of HMO Selection Process",
  "Change of HCF",
  "Change of HCP",
] as const;

export type BeneficiaryActivityKey = "additional" | "extra" | "provider" | "mda";

export const BENEFICIARY_ACTIVITIES: {
  key: BeneficiaryActivityKey;
  label: string;
  tabLabel: string;
  newLabel: string;
  hint: string;
  description: string;
}[] = [
  {
    key: "additional",
    label: "Additional Dependant",
    tabLabel: "Additional Dependant",
    newLabel: "New Additional Dependant",
    hint: "Spouse or child · FSSHIP",
    description: "Register a spouse or child as an additional dependant under FSSHIP.",
  },
  {
    key: "extra",
    label: "Extra Dependant",
    tabLabel: "Extra Dependant",
    newLabel: "New Extra Dependant",
    hint: "Child, spouse, or parent · FSSHIP",
    description: "Add an extra dependant (child, spouse, or parent) to an enrollee record.",
  },
  {
    key: "provider",
    label: "Change of HCP / HMO",
    tabLabel: "HCP / HMO Change",
    newLabel: "New HCP / HMO Change",
    hint: "Provider change for an enrollee",
    description: "Process an enrollee request to change their HCP or HMO.",
  },
  {
    key: "mda",
    label: "MDA HMO Selection",
    tabLabel: "MDA HMO Selection",
    newLabel: "New MDA HMO Selection",
    hint: "Formal-sector HMO selection",
    description: "Record formal-sector MDA HMO selection and supporting evidence.",
  },
];

/** List-summary keys that belong to a hub activity tab. */
export function beneficiaryTabMatches(summaryKey: string, tab: BeneficiaryActivityKey) {
  if (tab === "provider") return summaryKey === "hcp-change" || summaryKey === "hmo-change";
  return summaryKey === tab;
}

export const BENEFICIARY_LIST_FILTERS = [
  { value: "additional", label: "Additional Dependant" },
  { value: "extra", label: "Extra Dependant" },
  { value: "hcp-change", label: "Change of HCP" },
  { value: "hmo-change", label: "Change of HMO" },
  { value: "mda", label: "MDA HMO Selection" },
];

export const ADDITIONAL_ENTITY_TYPES = [
  { value: "spouse", label: "Spouse" },
  { value: "child_1", label: "Child 1" },
  { value: "child_2", label: "Child 2" },
  { value: "child_3", label: "Child 3" },
  { value: "child_4", label: "Child 4" },
];

export const EXTRA_ENTITY_TYPES = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
];

/** Relationship controls which entity types can be chosen. */
export const ADDITIONAL_RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
];

export const EXTRA_RELATIONSHIPS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
];

export const BENEFICIARY_PROGRAMS = ["FSSHIP", "GIFSHIP", "BHCPF", "OPS", "Retirees", "Self-Paying"];

export function relationshipsFor(request: "additional" | "extra") {
  return request === "additional" ? ADDITIONAL_RELATIONSHIPS : EXTRA_RELATIONSHIPS;
}

export function entityOptionsFor(request: "additional" | "extra", relationship: string) {
  if (!relationship) return [];
  if (request === "additional") {
    if (relationship === "spouse") return ADDITIONAL_ENTITY_TYPES.filter((o) => o.value === "spouse");
    if (relationship === "child") return ADDITIONAL_ENTITY_TYPES.filter((o) => o.value.startsWith("child_"));
    return [];
  }
  return EXTRA_ENTITY_TYPES.filter((o) => o.value === relationship);
}

export const HCP_REASON_CATEGORIES = [
  "Poor quality of healthcare services",
  "Poor customer service / staff conduct",
  "Required services or specialist care unavailable",
  "Drugs, consumables or medical supplies unavailable",
  "Excessive waiting time or appointment delays",
  "Distance or accessibility",
  "Change of residence / relocation",
  "Inadequate infrastructure or equipment",
  "Referral or continuity-of-care issues",
  "Provider preference",
  "Provider contract / accreditation change",
  "Other (Specify)",
];

export const HMO_REASON_CATEGORIES = [
  "Poor HMO customer service or communication",
  "Delayed service authorisation",
  "Difficulty accessing covered benefits",
  "Unresolved complaint",
  "Disagreement over covered benefits / out-of-pocket payment",
  "Poor administrative support",
  "Employer / MDA directive",
  "Change in employment or programme arrangement",
  "Incorrect HMO assignment / administrative error",
  "HMO no longer available under the arrangement",
  "Beneficiary preference",
  "Other (Specify)",
];

export const OTHER_REASON = "Other (Specify)";

export function entityOptions(activity: BeneficiaryActivityKey) {
  return activity === "additional" ? ADDITIONAL_ENTITY_TYPES : EXTRA_ENTITY_TYPES;
}

export function entityLabel(activity: "additional" | "extra", value: string) {
  return entityOptions(activity).find((o) => o.value === value)?.label ?? value;
}

/** Programme comes from the selected enrollee. Request kind is stored after the pipe. */
export function encodeDependantProgram(request: "additional" | "extra", program?: string | null) {
  const base = String(program || "FSSHIP").split("|")[0].trim() || "FSSHIP";
  return `${base}|${request}`;
}

export function decodeDependantRequest(program?: string | null, relationship?: string | null): "additional" | "extra" {
  const p = String(program ?? "");
  if (p.endsWith("|additional")) return "additional";
  if (p.endsWith("|extra")) return "extra";
  if (/^child_[1-4]$/.test(String(relationship ?? ""))) return "additional";
  return "extra";
}

export function packReason(category: string, other: string) {
  if (category === OTHER_REASON) return other.trim() ? `${OTHER_REASON}: ${other.trim()}` : OTHER_REASON;
  return category;
}

export function unpackReason(raw?: string | null) {
  const text = String(raw ?? "");
  if (text === OTHER_REASON || text.startsWith(`${OTHER_REASON}:`)) {
    return { category: OTHER_REASON, other: text.slice(OTHER_REASON.length).replace(/^:\s*/, "") };
  }
  return { category: text, other: "" };
}

export function beneficiaryListSummary(report: { __reportType?: string; lines?: any[] }) {
  const type = report.__reportType;
  const line = report.lines?.[0];
  const extra = (report.lines?.length ?? 0) > 1 ? ` +${(report.lines?.length ?? 0) - 1}` : "";
  if (type === "extra-dependant") {
    const request = decodeDependantRequest(line?.program, line?.relationship);
    return {
      key: request,
      activity: request === "additional" ? "Additional Dependant" : "Extra Dependant",
      subject: `${line?.enrollee_name || "—"}${extra}`,
    };
  }
  if (type === "hcf-change") {
    const hmo = line?.entity_type === "hmo";
    return {
      key: hmo ? "hmo-change" : "hcp-change",
      activity: hmo ? "Change of HMO" : "Change of HCP",
      subject: `${line?.enrollee_name || "—"}${extra}`,
    };
  }
  if (type === "hmo-selection") {
    return {
      key: "mda",
      activity: "MDA HMO Selection",
      subject: `${line?.mda || "—"}${extra}`,
    };
  }
  return { key: "other", activity: "—", subject: "—" };
}

export function activityApiType(activity: BeneficiaryActivityKey): "extra-dependant" | "hcf-change" | "hmo-selection" {
  if (activity === "provider") return "hcf-change";
  if (activity === "mda") return "hmo-selection";
  return "extra-dependant";
}

export function activityFromReportType(reportType: string): BeneficiaryActivityKey {
  if (reportType === "hcf-change") return "provider";
  if (reportType === "hmo-selection") return "mda";
  return "extra";
}
