/**
 * Stakeholder Engagement — PPT + Stakeholder Engagement (New).xlsx
 */

export const STAKEHOLDER_ENGAGEMENT_CATEGORIES = [
  { code: "ENG-001", label: "SSHIA Technical Support" },
  { code: "ENG-002", label: "Stakeholder Forum/Meeting" },
  { code: "ENG-003", label: "Post-enrolment Sensitization" },
  { code: "ENG-004", label: "Capacity Building" },
  { code: "ENG-005", label: "BHCPF Gateway (SOC) Meeting" },
  { code: "ENG-006", label: "Mediation Meetings" },
  { code: "ENG-007", label: "Ad-Hoc Activity" },
  { code: "ENG-008", label: "Institutional Expansion" },
  { code: "ENG-009", label: "Provider Expansion" },
  { code: "ENG-010", label: "Workshops/Seminar/Summit" },
  { code: "ENG-011", label: "Stakeholder Consultative Meeting" },
  { code: "ENG-012", label: "Program Implementation/Monitoring" },
  { code: "ENG-013", label: "Program Promotion" },
  { code: "ENG-014", label: "Conflict Resolution/Reconciliation Meetings" },
  { code: "ENG-015", label: "Other" },
] as const;

/** Used as multi-select “Stakeholder name(s)” — Excel Stakeholders Category list */
export const STAKEHOLDER_CATEGORIES = [
  "HCFs", "MDAs", "HMOs", "Enrolees", "State Ministry of Health",
  "NHIA-Roche", "SSHIA", "Partners", "Other",
] as const;

export const STAKEHOLDER_PROGRAMS = [
  { code: "PR-01", label: "FSSHIP" },
  { code: "PR-02", label: "OPS" },
  { code: "PR-03", label: "BHCPF" },
  { code: "PR-04", label: "TISHIP" },
  { code: "PR-05", label: "GIFSHIP-G" },
  { code: "PR-06", label: "GIFSHIP-C" },
  { code: "PR-07", label: "GIFSHIP-R" },
  { code: "PR-08", label: "GIFSHIP-N" },
  { code: "PR-09", label: "CEmONC" },
  { code: "PR-10", label: "FFP" },
  { code: "PR-11", label: "CBSHIP" },
  { code: "PR-12", label: "NHIA-Roche Cancer Program" },
] as const;

/** Funding options: Zero-Cost or Budgeted (no Yes and No) */
export const STAKEHOLDER_FUNDING_OPTIONS = ["Zero-Cost", "Budgeted"] as const;
export const STAKEHOLDER_FUNDED = "Budgeted";

export const STAKEHOLDER_TARGET_AUDIENCES = [
  "State Executives", "Organized Labour", "Traditional Rulers", "Healthcare Workers",
  "Employers", "Desk Officers", "Students", "Private Company", "Market Association",
  "Artisan Group", "Religious Organisation", "Community Leaders", "Traditional Institution",
  "HMOs", "Healthcare Providers", "Civil Society", "NGOs", "General Public",
  "Corp Members", "Enrolees", "Informal Sector", "Other",
] as const;

export const STAKEHOLDER_LOCATION_BY_CATEGORY: Record<string, readonly string[]> = {
  "Government Agency": [
    "NHIA Office", "State Government Secretariat", "Ministry/Department/Agency Office",
    "Local Government Secretariat", "Government Institution", "Government Meeting Venue",
    "Other",
  ],
  Health_Sector: [
    "Health Facility", "PHC", "Primary Healthcare Centre", "NHIA Programme Office",
    "Health Management Organisation Office", "Provider Organisation Office",
    "Healthcare Provider Association Office",
    "Other",
  ],
  Stakeholder_Organisation: [
    "Stakeholder's Office", "Corporate Office", "NGO/CSO Office", "Development Partner Office",
    "Professional Association Office", "Trade/Business Association Office", "Union Office",
    "Cooperative Society Office",
    "Other",
  ],
  Community_and_Traditional: [
    "Traditional Ruler's Palace", "Community Centre", "Community Hall",
    "Community Meeting Venue", "Ward Meeting Centre", "Religious Centre", "Market",
    "Other",
  ],
  Institutional: [
    "School", "Tertiary Institution", "Research Institution", "Training Institution",
    "Conference Centre", "Hotel/Meeting Venue", "Workplace",
    "Other",
  ],
  Media: ["Radio Station", "Television Station", "Media House", "Press Centre", "Other"],
  Virtual: ["Online", "Telephone/Teleconference", "Other"],
  Other: ["Other"],
};

export const STAKEHOLDER_LOCATION_CATEGORIES = Object.keys(STAKEHOLDER_LOCATION_BY_CATEGORY);

export const STAKEHOLDER_EVIDENCE_TYPES = [
  "Attendance Register", "Photographs", "Minutes", "Official Letter", "Signed MoU",
  "Action Plan", "Presentation Materials", "IEC Materials", "Newspaper Publication",
  "Radio Programme Recording", "TV Recording", "Social Media Report",
  "Signed Commitment Letter", "Nomination of Focal Person", "Follow-up Letter",
  "Field Report", "Enquiry Log", "NHIA Letter of Intent",
  "Stakeholder Invitation Letter", "Other",
] as const;

export const STAKEHOLDER_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
] as const;

export const STAKEHOLDER_FOLLOW_UP_STATUSES = [
  "Not started", "In Progress", "Completed", "Deferred", "Cancelled",
] as const;

export const STAKEHOLDER_FOLLOW_UP_PRIORITIES = ["Normal", "Urgent"] as const;

export const STAKEHOLDER_YES_NO = ["Yes", "No"] as const;

/**
 * Mapping sheet — Specific Outcome ↔ Engagement Category(s) ↔ Outcome Category(s).
 * Engagement/outcome lists are semicolon-separated in the workbook.
 */
export type StakeholderOutcomeMapRow = {
  specificOutcome: string;
  engagementCategories: string[];
  outcomeCategories: string[];
};

const splitList = (raw: string) =>
  raw.split(";").map((s) => s.trim()).filter(Boolean);

export const STAKEHOLDER_OUTCOME_MAPPING: StakeholderOutcomeMapRow[] = [
  {
    specificOutcome: "No. of organisations requesting further engagement",
    engagementCategories: splitList("Stakeholder Forum/Meeting; Stakeholder Consultative Meeting; Workshops/Seminar/Summit; Program Promotion"),
    outcomeCategories: splitList("Increased stakeholder commitment; Programme acceptance increased"),
  },
  {
    specificOutcome: "No. of institutions requesting onboarding",
    engagementCategories: splitList("Institutional Expansion; Program Promotion"),
    outcomeCategories: splitList("Institutional requested onboarding"),
  },
  {
    specificOutcome: "No. of focal persons nominated",
    engagementCategories: splitList("Institutional Expansion; BHCPF Gateway (SOC) Meeting; Program Implementation/Monitoring"),
    outcomeCategories: splitList("Institutional readiness"),
  },
  {
    specificOutcome: "No. of implementation committees constituted",
    engagementCategories: splitList("Program Implementation/Monitoring; Institutional Expansion; BHCPF Gateway (SOC) Meeting"),
    outcomeCategories: splitList("Programme implementation strengthened; Institutional readiness"),
  },
  {
    specificOutcome: "No. of action plans developed",
    engagementCategories: splitList("Stakeholder Consultative Meeting; Workshops/Seminar/Summit; Capacity Building"),
    outcomeCategories: splitList("Action Plans Developed; Programme planning strengthened"),
  },
  {
    specificOutcome: "No. of partnership agreements/MoUs initiated",
    engagementCategories: splitList("Stakeholder Consultative Meeting; Provider Expansion; Institutional Expansion"),
    outcomeCategories: splitList("Partnership/Collaboration strengthened"),
  },
  {
    specificOutcome: "No. of MoUs signed",
    engagementCategories: splitList("Provider Expansion; Institutional Expansion; Stakeholder Forum/Meeting"),
    outcomeCategories: splitList("Partnership formalized"),
  },
  {
    specificOutcome: "No. of communities agreeing to participate",
    engagementCategories: splitList("Program Promotion; Post-enrolment Sensitization; Stakeholder Forum/Meeting"),
    outcomeCategories: splitList("Organizations/groups/communities/Associations Mobilized; Programme acceptance increased"),
  },
  {
    specificOutcome: "No. of institutions progressing to implementation stage",
    engagementCategories: splitList("Institutional Expansion; Program Implementation/Monitoring; SSHIA Technical Support"),
    outcomeCategories: splitList("Institutional readiness; Programme implementation strengthened"),
  },
  {
    specificOutcome: "No. of trainings conducted",
    engagementCategories: splitList("Capacity Building; Workshops/Seminar/Summit"),
    outcomeCategories: splitList("Technical capacity improved"),
  },
  {
    specificOutcome: "No. of technical support sessions",
    engagementCategories: splitList("SSHIA Technical Support; Capacity Building"),
    outcomeCategories: splitList("Technical capacity improved; Implementation issues addressed"),
  },
  {
    specificOutcome: "Number of enquiries received after activity",
    engagementCategories: splitList("Program Promotion; Post-enrolment Sensitization; Workshops/Seminar/Summit"),
    outcomeCategories: splitList("Programme acceptance increased; IEC Material Distributed"),
  },
  {
    specificOutcome: "Number of follow-up requests received",
    engagementCategories: splitList("Stakeholder Forum/Meeting; Mediation Meetings; Conflict Resolution/Reconciliation Meetings"),
    outcomeCategories: splitList("Increased stakeholder commitment; Implementation issues addressed"),
  },
  {
    specificOutcome: "No. of registration requests",
    engagementCategories: splitList("Program Promotion; Provider Expansion; Institutional Expansion"),
    outcomeCategories: splitList("Programme acceptance increased; Enrolment Forms Issues"),
  },
  {
    specificOutcome: "No. of beneficiaries sensitized",
    engagementCategories: splitList("Post-enrolment Sensitization; Program Promotion"),
    outcomeCategories: splitList("Organizations/groups/communities/Associations Mobilized; IEC Material Distributed"),
  },
  {
    specificOutcome: "Other",
    engagementCategories: splitList("Ad-Hoc Activity; Other"),
    outcomeCategories: splitList("Other"),
  },
  {
    specificOutcome: "No. of disputes resolved",
    engagementCategories: splitList("Mediation Meetings; Conflict Resolution/Reconciliation Meetings"),
    outcomeCategories: splitList("Claims/payment issues resolved"),
  },
  {
    specificOutcome: "No. of new enrolments/coverage expansions recorded",
    engagementCategories: splitList("Program Promotion; Post-enrolment Sensitization; Institutional Expansion"),
    outcomeCategories: splitList("Enrolment/coverage increased"),
  },
  {
    specificOutcome: "No. of participants demonstrating improved awareness/knowledge",
    engagementCategories: splitList("Post-enrolment Sensitization; Program Promotion; Workshops/Seminar/Summit"),
    outcomeCategories: splitList("Awareness/knowledge improved"),
  },
  {
    specificOutcome: "No. of relationships restored through mediation",
    engagementCategories: splitList("Mediation Meetings; Conflict Resolution/Reconciliation Meetings"),
    outcomeCategories: splitList("Relationships restored through mediation"),
  },
  {
    specificOutcome: "No. of providers meeting capacity/quality standards",
    engagementCategories: splitList("Provider Expansion; SSHIA Technical Support; Capacity Building"),
    outcomeCategories: splitList("Provider capacity/quality improved"),
  },
  {
    specificOutcome: "No. of policy/regulatory commitments secured",
    engagementCategories: splitList("Stakeholder Forum/Meeting; Stakeholder Consultative Meeting; Workshops/Seminar/Summit"),
    outcomeCategories: splitList("Policy/regulatory support secured"),
  },
  {
    specificOutcome: "No. of resource commitments secured",
    engagementCategories: splitList("Stakeholder Forum/Meeting; BHCPF Gateway (SOC) Meeting; Institutional Expansion"),
    outcomeCategories: splitList("Resource commitment secured"),
  },
  {
    specificOutcome: "No. of feedback/grievance cases captured",
    engagementCategories: splitList("Post-enrolment Sensitization; Program Promotion; Mediation Meetings"),
    outcomeCategories: splitList("Feedback/grievances captured"),
  },
];

export const STAKEHOLDER_OTHER = "Other";
export const STAKEHOLDER_OTHER_OUTCOME_CATEGORY = STAKEHOLDER_OTHER;
export const STAKEHOLDER_OTHER_SPECIFIC_OUTCOME = STAKEHOLDER_OTHER;

const OTHER_LABEL = /^(?:others?|other)\s*(?:\(\s*specify\s*\))?$/i;
const OTHER_PREFIX = /^(?:others?\s*(?:\(\s*specify\s*\))?|other)\s*:\s*(.*)$/i;

/** Dropdown value written as Other, Other (Specify), or Others (specify). */
export function isStakeholderOther(value: string) {
  return OTHER_LABEL.test(String(value || "").trim());
}

/** Text after an "Other: …" or legacy "Other (Specify): …" value. */
export function stakeholderOtherText(value: string) {
  const match = String(value || "").trim().match(OTHER_PREFIX);
  return match ? match[1].trim() : "";
}

/** Select value used in the form. Specified text stays in a separate field. */
export function stakeholderOtherBase(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isStakeholderOther(raw) || OTHER_PREFIX.test(raw)) return STAKEHOLDER_OTHER;
  return raw;
}

export function outcomeCategoriesForEngagement(engagementCategory: string): string[] {
  const engagement = stakeholderOtherBase(engagementCategory);
  if (!STAKEHOLDER_ENGAGEMENT_CATEGORIES.some((category) => category.label === engagement)) return [];
  const set = new Set<string>();
  STAKEHOLDER_OUTCOME_MAPPING.forEach((row) => {
    if (row.engagementCategories.includes(engagement)) {
      row.outcomeCategories.forEach((c) => set.add(stakeholderOtherBase(c) || c));
    }
  });
  set.delete(STAKEHOLDER_OTHER);
  return [...set].sort().concat(STAKEHOLDER_OTHER);
}

export function specificOutcomesFor(engagementCategory: string, outcomeCategory: string): string[] {
  const engagement = stakeholderOtherBase(engagementCategory);
  const category = stakeholderOtherBase(outcomeCategory);
  if (!outcomeCategoriesForEngagement(engagement).includes(category)) return [];
  const outcomes = new Set(STAKEHOLDER_OUTCOME_MAPPING
    .filter((row) =>
      row.engagementCategories.includes(engagement)
      && row.outcomeCategories.map((item) => stakeholderOtherBase(item) || item).includes(category),
    )
    .map((row) => stakeholderOtherBase(row.specificOutcome) || row.specificOutcome));
  outcomes.delete(STAKEHOLDER_OTHER);
  return [...outcomes, STAKEHOLDER_OTHER];
}

function specifiedOther(value: string) {
  const raw = String(value || "").trim();
  const prefixed = raw.match(OTHER_PREFIX);
  if (prefixed) return { selected: STAKEHOLDER_OTHER, text: prefixed[1].trim(), prefix: raw.slice(0, raw.length - prefixed[1].length) };
  if (isStakeholderOther(raw)) return { selected: STAKEHOLDER_OTHER, text: "", prefix: "" };
  return null;
}

export function isValidStakeholderOutcome(engagement: string, category: string, outcome: string): boolean {
  if (category.length > 160 || outcome.length > 200) return false;
  const selectedCategory = specifiedOther(category);
  const selectedOutcome = specifiedOther(outcome);
  if (OTHER_PREFIX.test(category.trim()) && !selectedCategory?.text) return false;
  const allowed = specificOutcomesFor(engagement, selectedCategory?.selected || category);
  if (allowed.includes(outcome)) return true;
  return allowed.includes(STAKEHOLDER_OTHER) && !!selectedOutcome?.text;
}

/** Flat lists kept for older template configs / filters */
export const STAKEHOLDER_OUTCOME_CATEGORIES = [
  ...new Set(STAKEHOLDER_OUTCOME_MAPPING.flatMap((r) => r.outcomeCategories)),
].sort();

export const STAKEHOLDER_SPECIFIC_OUTCOMES = STAKEHOLDER_OUTCOME_MAPPING.map((r) => r.specificOutcome);

/** @deprecated use STAKEHOLDER_FUNDED */
export const STAKEHOLDER_BUDGETED = STAKEHOLDER_FUNDED;
