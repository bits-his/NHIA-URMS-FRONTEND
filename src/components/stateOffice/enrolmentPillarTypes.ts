/**
 * State Office monitoring pillars — Enrolment / Stakeholder / Provider
 * Level-2 items from NHIA activity reporting map + Excel template workbook.
 */

export type PillarTemplateStatus = "ready" | "coming_soon";

export type PillarChild = {
  key: string;
  title: string;
  navLabel: string;
  view: string;
  path: string;
  status: PillarTemplateStatus;
  /** Shown on coming-soon pages */
  note?: string;
};

/** Image pillar 1 — ENROLMENT (Monthly · FSD/PRSD) */
export const ENROLMENT_PILLAR_CHILDREN: PillarChild[] = [
  {
    key: "enrolment",
    title: "Enrolment",
    navLabel: "Enrolment",
    view: "state-enrolment",
    path: "/zonal/enrolment",
    status: "ready",
  },
];

/** Single sidebar / privilege title for all stakeholder management activities. */
export const STAKEHOLDER_MANAGEMENT_NAV_TITLE = "Stakeholder Management";
export const STAKEHOLDER_MANAGEMENT_VIEW = "state-stakeholder-management";
export const STAKEHOLDER_MANAGEMENT_PATH = "/zonal/stakeholder-management";

/** Image pillar 4 — STAKEHOLDER MANAGEMENT (Monthly · ISD/PRSD) */
export const STAKEHOLDER_PILLAR_CHILDREN: PillarChild[] = [
  {
    key: "meetings-sshias",
    title: "Meetings with SSHIAS",
    navLabel: "Meetings with SSHIAS",
    view: "state-stakeholder-sshia-meetings",
    path: "/zonal/stakeholder/sshia-meetings",
    status: "ready",
  },
  {
    key: "engagement-coordination",
    title: "Stakeholder Engagement",
    navLabel: "Engagement & Coordination",
    view: "state-stakeholder",
    path: "/zonal/stakeholder",
    status: "ready",
  },
  {
    key: "stakeholder-forum",
    title: "Stakeholder forum",
    navLabel: "Stakeholder Forum",
    view: "state-stakeholder-forum",
    path: "/zonal/stakeholder/forum",
    status: "ready",
  },
  {
    key: "stakeholder-others",
    title: "Others",
    navLabel: "Others",
    view: "state-stakeholder-others",
    path: "/zonal/stakeholder/others",
    status: "ready",
  },
];

/** Single sidebar / privilege title for all provider management activities. */
export const PROVIDER_MANAGEMENT_NAV_TITLE = "Provider Management";
export const PROVIDER_MANAGEMENT_VIEW = "state-provider-management";
export const PROVIDER_MANAGEMENT_PATH = "/zonal/provider-management";

/** Image pillar 5 — PROVIDER MANAGEMENT (Quarterly · SQA) */
export const PROVIDER_PILLAR_CHILDREN: PillarChild[] = [
  {
    key: "medical-audits",
    title: "Medical Audits",
    navLabel: "Medical Audits",
    view: "state-provider-medical-audits",
    path: "/zonal/provider/medical-audits",
    status: "ready",
  },
  {
    key: "accreditation",
    title: "Accreditation",
    navLabel: "Accreditation",
    view: "state-accreditation",
    path: "/zonal/accreditation",
    status: "ready",
  },
  {
    key: "reaccreditation",
    title: "Reaccreditation",
    navLabel: "Reaccreditation",
    view: "state-provider-reaccreditation",
    path: "/zonal/provider/reaccreditation",
    status: "ready",
  },
  {
    key: "qa-inspections",
    title: "Quality Assurance inspections",
    navLabel: "QA Inspections",
    view: "state-provider-qa-inspections",
    path: "/zonal/provider/qa-inspections",
    status: "ready",
  },
];

/** Enrolment Activity dropdown — from Enrolment (New).xlsx */
export const ENROLMENT_ACTIVITIES = [
  { code: "ENR-0001", value: "enrolment", label: "Enrolment" },
  { code: "ENR-0002", value: "nin_validation", label: "NIN Validation" },
  { code: "ENR-0003", value: "id_card_issuance", label: "ID Card Issuance/Renewal" },
  { code: "ENR-0004", value: "validation_of_enrolees", label: "Validation of Enrollees" },
] as const;

export const ENROLMENT_CHANNELS = ["NHIA", "SSHIA"] as const;

/** Excel: Fresh Enrolment | Renewal (Renewal only for GIFSHIP-G / GIFSHIP-C / GIFSHIP-R) */
export const ENROLMENT_TYPES = ["Fresh Enrolment", "Renewal"] as const;

export const ENROLMENT_SSHIA_CHANNELS = [
  "BHCPF", "Formal Sector", "Informal Sector",
] as const;

export const ENROLMENT_PROGRAMS = [
  { code: "PRG-0001", label: "FSSHIP" },
  { code: "PRG-0002", label: "BHCPF" },
  { code: "PRG-0003", label: "OPS" },
  { code: "PRG-0004", label: "TISHIP" },
  { code: "PRG-0005", label: "GIFSHIP-G", renewable: true },
  { code: "PRG-0006", label: "GIFSHIP-N" },
  { code: "PRG-0007", label: "GIFSHIP-C", renewable: true },
  { code: "PRG-0008", label: "GIFSHIP-R", renewable: true },
  { code: "PRG-0009", label: "CBSHIP" },
  { code: "PRG-0010", label: "Equity Programs" },
] as const;

export const ENROLMENT_RENEWABLE_PROGRAM_LABELS = new Set(
  ENROLMENT_PROGRAMS.filter((p) => Boolean((p as { renewable?: boolean }).renewable)).map((p) => p.label),
);

export const ENROLMENT_EQUITY_PROGRAMS = [
  "CEmONC",
  "Free Fistula Program (FFP)",
  "NHIA-Roche Cancer Program",
  "HIV/TB Program",
] as const;

export const ENROLMENT_ID_CARD_REQUEST_CATEGORIES = [
  "Issuance (New enrolees)",
  "Replacement (Existing enrolees)",
] as const;

export const ENROLMENT_ID_CARD_STATUSES = ["Pending", "Issued"] as const;

export const ENROLMENT_NIN_VALIDATION_STATUSES = ["Validated", "Not validated"] as const;

export const ENROLMENT_YES_NO = ["Yes", "No"] as const;

/** PPT / Excel — Beneficiary (status) list */
export const ENROLMENT_BENEFICIARY_STATUSES = [
  "Federal Civil Servants",
  "OPS Employees",
  "Pensioners",
  "Students",
  "Pregnant women",
  "Market women",
  "Artisans",
  "Farmers",
  "Community members",
  "Vulnerable",
  "Others (Specify)",
] as const;

/** Excel Evidence drop-down */
export const ENROLMENT_EVIDENCE_TYPES = [
  "Enrolment register",
  "Registration forms received",
  "Premium receipt",
  "Approval letter",
  "Nominal roll",
  "Beneficiary list",
  "Employer request letter",
  "Student register",
  "OPS registration approval memo",
  "Enrolment forms",
  "List of verified NINs",
  "Others",
] as const;

export const ENROLMENT_STATUS_NEEDS_REASON = new Set(["Not Conducted", "Cancelled"]);

export const ENROLMENT_ENTITY_TYPES = [
  "Principal", "Spouse", "Child 1", "Child 2", "Child 3", "Child 4",
] as const;

export const ENROLMENT_BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export const ENROLMENT_MARITAL_STATUSES = [
  "Single", "Married", "Divorced", "Widowed", "Separated",
] as const;

/** PPT renewal status for GIFSHIP G/R/C */
export const ENROLMENT_RENEWAL_STATUSES = [
  "Not Yet Due",
  "Due Soon",
  "Overdue",
  "Renewed",
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/** Add calendar days to an ISO date (YYYY-MM-DD). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Add calendar months to an ISO date (YYYY-MM-DD). */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return toIsoDate(d);
}

/**
 * PPT Step 5 — GIFSHIP date automation:
 * effective enrolment = registration + 60 days
 * expiry = effective + 1 year
 * renewal window start = expiry − 2 months
 */
export function computeGifshipDates(registrationDate: string, today = todayIsoDate()) {
  const registration_date = String(registrationDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(registration_date)) {
    return {
      registration_date: "",
      enrolment_date_auto: "",
      expiry_date: "",
      renewal_date: "",
      renewal_status: "" as string,
    };
  }
  const enrolment_date_auto = addDaysIso(registration_date, 60);
  const expiry_date = addMonthsIso(enrolment_date_auto, 12);
  const renewal_date = addMonthsIso(expiry_date, -2);
  let renewal_status = "Not Yet Due";
  if (today > expiry_date) renewal_status = "Overdue";
  else if (today >= renewal_date) renewal_status = "Due Soon";
  return {
    registration_date,
    enrolment_date_auto,
    expiry_date,
    renewal_date,
    renewal_status,
  };
}

export function isGifshipRenewableProgram(programName: string | null | undefined) {
  return ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(String(programName ?? "").trim());
}

/**
 * Program-specific Enrolment Mode (Excel: Program Specific Enrolment Modes).
 * FSSHIP and OPS share the same modes.
 */
export const ENROLMENT_MODE_BY_PROGRAM: Record<string, readonly string[]> = {
  FSSHIP: ["Mop-up enrolment", "Walk-in Registration", "Field Registration"],
  OPS: ["Mop-up enrolment", "Walk-in Registration", "Field Registration"],
  BHCPF: ["BHCPF Enrolment"],
  TISHIP: ["Institutional Enrolment"],
  "GIFSHIP-C": ["Constituency Project"],
  "GIFSHIP-G": ["Walk-in registration", "Field Registration", "Group Registration"],
  "GIFSHIP-R": ["Walk-in registration", "Field Registration", "Group Registration"],
  "GIFSHIP-N": ["NYSC Mobilization"],
};

export function modesOfRegistrationForProgram(programName: string | null | undefined): readonly string[] {
  const key = String(programName ?? "").trim();
  if (!key) return [];
  return ENROLMENT_MODE_BY_PROGRAM[key] ?? [];
}

export type EnrolmentProgramFieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "state" | "lga" | "hmo" | "hcf";
  options?: readonly string[];
  /** For type "lga": which program_details key holds the parent state name. */
  dependsOnStateKey?: string;
  /** Only show when this program is selected (subset within a shared field group). */
  onlyForProgram?: string;
};

const FSSHIP_OPS_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "surname", label: "Surname", type: "text" },
  { key: "first_name", label: "First Name", type: "text" },
  { key: "middle_name", label: "Middle Name", type: "text" },
  { key: "nin", label: "NIN", type: "text" },
  { key: "organization_mda", label: "Organization/MDA", type: "text" },
  { key: "entity_type", label: "Entity Type", type: "select", options: ENROLMENT_ENTITY_TYPES },
  { key: "blood_group", label: "Blood Group", type: "select", options: ENROLMENT_BLOOD_GROUPS },
  { key: "marital_status", label: "Marital Status", type: "select", options: ENROLMENT_MARITAL_STATUSES },
  { key: "state_of_origin", label: "State of Origin", type: "state" },
  { key: "lga_of_origin", label: "L.G.A of Origin", type: "lga", dependsOnStateKey: "state_of_origin" },
  { key: "state_of_residence", label: "State of Residence", type: "state" },
  { key: "lga_of_residence", label: "L.G.A of Residence", type: "lga", dependsOnStateKey: "state_of_residence" },
  { key: "hmo", label: "HMO", type: "hmo" },
  { key: "hcf", label: "HCF", type: "hcf" },
  { key: "alternative_provider", label: "Alternative Provider", type: "hcf" },
  { key: "phone_number", label: "Phone Number", type: "text" },
];

const GIFSHIP_GRC_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "surname", label: "Surname", type: "text" },
  { key: "first_name", label: "First Name", type: "text" },
  { key: "middle_name", label: "Middle Name", type: "text" },
  { key: "nin", label: "NIN", type: "text" },
  { key: "program_type", label: "Program Type", type: "text" },
  { key: "blood_group", label: "Blood Group", type: "select", options: ENROLMENT_BLOOD_GROUPS },
  { key: "marital_status", label: "Marital Status", type: "select", options: ENROLMENT_MARITAL_STATUSES },
  { key: "state_of_origin", label: "State of Origin", type: "state" },
  { key: "lga_of_origin", label: "L.G.A of Origin", type: "lga", dependsOnStateKey: "state_of_origin" },
  { key: "state_of_residence", label: "State of Residence", type: "state" },
  { key: "lga_of_residence", label: "L.G.A of Residence", type: "lga", dependsOnStateKey: "state_of_residence" },
  { key: "hmo", label: "HMO", type: "hmo" },
  { key: "hcf", label: "HCF", type: "hcf" },
  { key: "project_community_name", label: "Project/Community Name", type: "text", onlyForProgram: "GIFSHIP-C" },
  { key: "sponsor_name", label: "Name of Sponsor/Payer", type: "text" },
  { key: "sponsor_phone", label: "Phone Number of Sponsor/Payer", type: "text" },
  { key: "sponsor_email", label: "Email of Sponsor/Payer", type: "text" },
  { key: "registration_date", label: "Registration Date", type: "date" },
  { key: "enrolment_date_auto", label: "Enrolment effective date (auto +60 days)", type: "date" },
  { key: "renewal_date", label: "Renewal window start (auto)", type: "date" },
  { key: "expiry_date", label: "Expiry date (auto +1 year)", type: "date" },
  { key: "renewal_status", label: "Renewal Status", type: "select", options: ENROLMENT_RENEWAL_STATUSES },
];

const GIFSHIP_N_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "year", label: "Year", type: "number" },
  { key: "induction_month", label: "Induction month", type: "text" },
  { key: "stream", label: "Stream", type: "text" },
  { key: "batch", label: "Batch", type: "text" },
  { key: "number_mobilized", label: "Number Mobilized/Enrolled", type: "number" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "end_date", label: "End Date", type: "date" },
];

const TISHIP_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "institution_name", label: "Name of Institution", type: "text" },
  { key: "students_enrolled", label: "Number of Students Enrolled", type: "number" },
];

const BHCPF_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "sshia_name", label: "Name of SSHIA", type: "text" },
  { key: "number_enrolled", label: "Number Enrolled", type: "number" },
];

const CBSHIP_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "mha_name", label: "Name of MHA", type: "text" },
  { key: "community_members_enrolled", label: "Number of Community Members Enrolled", type: "number" },
];

const EQUITY_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "equity_program", label: "Program", type: "select", options: ENROLMENT_EQUITY_PROGRAMS },
  { key: "beneficiaries_count", label: "Number of Beneficiaries", type: "number" },
];

const SSHIA_CHANNEL_FIELDS: EnrolmentProgramFieldDef[] = [
  { key: "sshia_program", label: "Program", type: "text" },
  { key: "number_enrolled", label: "Number Enrolled", type: "number" },
];

/** Resolve program-specific capture fields for Enrolment activity. */
export function programSpecificFieldsFor(
  channel: string | null | undefined,
  programName: string | null | undefined,
): EnrolmentProgramFieldDef[] {
  const program = String(programName ?? "").trim();
  const ch = String(channel ?? "").trim();

  if (ch === "SSHIA") {
    if (program === "BHCPF") return BHCPF_FIELDS;
    return SSHIA_CHANNEL_FIELDS;
  }

  switch (program) {
    case "FSSHIP":
    case "OPS":
      return FSSHIP_OPS_FIELDS;
    case "GIFSHIP-G":
    case "GIFSHIP-R":
    case "GIFSHIP-C":
      return GIFSHIP_GRC_FIELDS.filter(
        (f) => !f.onlyForProgram || f.onlyForProgram === program,
      );
    case "GIFSHIP-N":
      return GIFSHIP_N_FIELDS;
    case "TISHIP":
      return TISHIP_FIELDS;
    case "BHCPF":
      return BHCPF_FIELDS;
    case "CBSHIP":
      return CBSHIP_FIELDS;
    case "Equity Programs":
      return EQUITY_FIELDS;
    default:
      return [];
  }
}

export const ENROLMENT_BENEFICIARY_CATEGORIES = [
  "Principal (FSSHIP)",
  "Dependent (FSSHIP)",
  "Individual (GIFSHIP)",
  "Family (GIFSHIP)",
  "Group (GIFSHIP, GIFSHIP-R)",
  "Constituency Project (GIFSHIP-C)",
] as const;

export const ENROLMENT_FUNDING_OPTIONS = [
  "Zero-Cost (Statutory Mandate)",
  "Budgeted (Approved Release)",
] as const;

export const ENROLMENT_ACTIVITY_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
] as const;

export const ENROLMENT_BUDGETED = "Budgeted (Approved Release)";

/** Normalize legacy enrolment_type values from older drafts. */
export function normalizeEnrolmentType(raw: string | null | undefined): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v === "Non-renewal" || v === "Fresh" || /^fresh/i.test(v)) return "Fresh Enrolment";
  if (/^renewal/i.test(v)) return "Renewal";
  return v;
}

function parseProgramDetails(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, string>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Compact row summary for the enrolment reports list table. */
export function enrolmentLineListSummary(line: any | null | undefined) {
  if (!line) {
    return { activity: "—", program: "—", detail: "—", outcome: "—" };
  }
  const details = parseProgramDetails(line.program_details);
  const category = String(line.category ?? "");
  const activity = ENROLMENT_ACTIVITIES.find((a) => a.value === category)?.label
    || category.replace(/_/g, " ")
    || "—";
  const program = line.program_name || "—";
  const join = (...parts: Array<string | null | undefined>) =>
    parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(" · ") || "—";

  if (category === "nin_validation") {
    return {
      activity,
      program,
      detail: join(details.enrollee_name, details.nin_number || details.nin, details.organization_name),
      outcome: details.validation_status || "—",
    };
  }
  if (category === "id_card_issuance") {
    return {
      activity,
      program,
      detail: join(details.enrollee_name, details.request_category, details.nhia_number),
      outcome: details.id_card_status || line.activity_status || "—",
    };
  }
  if (category === "validation_of_enrolees") {
    const count = line.enrollees_validated != null && line.enrollees_validated !== ""
      ? `${Number(line.enrollees_validated).toLocaleString("en-NG")} validated`
      : "—";
    return {
      activity,
      program,
      detail: join(details.organization_name, line.enrolment_channel),
      outcome: count,
    };
  }
  // enrolment (default)
  const enrolled = line.enrolment_count != null && Number(line.enrolment_count) > 0
    ? `${Number(line.enrolment_count).toLocaleString("en-NG")} enrolled`
    : null;
  return {
    activity,
    program,
    detail: join(
      normalizeEnrolmentType(line.enrolment_type) || line.enrolment_type,
      line.enrolment_category,
      line.beneficiary_category,
      line.enrolment_channel,
    ),
    outcome: join(enrolled, line.activity_status || line.beneficiary_status),
  };
}
