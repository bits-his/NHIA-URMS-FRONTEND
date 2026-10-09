import rawOffences from "./complaintOffenceGuide.generated.json";

export type PartyType = "HCF" | "HMO" | "Enrollee";

export interface ComplaintOffenceEntry {
  id: string;
  complainant: PartyType;
  respondent: PartyType;
  sn: number;
  issue: string;
  domain: string;
  category: string;
  priority: "Top" | "High" | "Medium";
}

export const COMPLAINT_PARTY_TYPES: { value: PartyType; label: string }[] = [
  { value: "HCF", label: "Healthcare Facility (HCF)" },
  { value: "HMO", label: "HMO" },
  { value: "Enrollee", label: "Enrollee" },
];

/** Map full complainant category labels to offence-guide party types. */
export function partyTypeFromComplainantCategory(category: string): PartyType | "" {
  if (!category) return "";
  if (category === "Healthcare Facility" || category === "HCF") return "HCF";
  if (category === "HMO") return "HMO";
  return "Enrollee";
}

const offences: ComplaintOffenceEntry[] = (rawOffences as ComplaintOffenceEntry[]).map((o) => ({
  ...o,
  domain: o.domain.replace(/\s+/g, " ").trim(),
  category: o.category.trim(),
}));

const RESPONDENT_MAP: Record<PartyType, PartyType[]> = {
  HCF: ["HMO", "Enrollee"],
  HMO: ["HCF", "Enrollee"],
  Enrollee: ["HMO", "HCF"],
};

export function respondentsForComplainant(complainant: PartyType | ""): PartyType[] {
  if (!complainant) return [];
  return RESPONDENT_MAP[complainant] ?? [];
}

export function offencesForParties(
  complainant: PartyType | "",
  respondent: PartyType | "",
): ComplaintOffenceEntry[] {
  if (!complainant || !respondent) return [];
  return offences.filter((o) => o.complainant === complainant && o.respondent === respondent);
}

export function findOffenceById(id: string): ComplaintOffenceEntry | undefined {
  return offences.find((o) => o.id === id);
}

export const OTHER_ISSUE_VALUE = "OTHER";

export function offenceSelectOptions(entries: ComplaintOffenceEntry[]) {
  return [
    ...entries.map((o) => ({
      value: o.id,
      label: o.issue.length > 100 ? `${o.issue.slice(0, 100)}…` : o.issue,
    })),
    { value: OTHER_ISSUE_VALUE, label: "Other" },
  ];
}
