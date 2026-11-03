import {
  ENROLMENT_DRIVE_TYPES, enrolmentDriveReportType, isEnrolmentDriveType,
  type EnrolmentDriveReportType,
} from "./enrolmentDriveTypes";

export { ENROLMENT_DRIVE_ACTIVITIES } from "./enrolmentDriveTypes";

export type StateOfficeReportType =
  | "enrolment" | "migration" | "cemonc"
  | "complaints" | "accreditation" | "stakeholder" | "hmo-selection" | "challenges"
  | "igr" | "sshia-financial" | "expenditure-profile"
  | "weekly-actionable" | "contracted-services" | "enrollee-register" | "etmc-tmc-action-point"
  | "ict-support-register" | "adhoc-special-assignment"
  | "extra-dependant" | "hcf-change"
  | EnrolmentDriveReportType;

export const MONTHS = [
  { value: 1, label: "January" },   { value: 2, label: "February" },
  { value: 3, label: "March" },     { value: 4, label: "April" },
  { value: 5, label: "May" },       { value: 6, label: "June" },
  { value: 7, label: "July" },      { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

export const ENROLLEE_REGISTER_SCHEMES = [
  { key: "self_paying", label: "Self-Paying" },
  { key: "ops", label: "OPS" },
  { key: "retirees", label: "Retirees" },
  { key: "constituency", label: "Constituency" },
  { key: "gifship", label: "GIFSHIP" },
  { key: "formal_sector", label: "Formal Sector" },
] as const;

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const EXTRA_DEPENDANT_RELATIONSHIPS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
];

export const EXTRA_DEPENDANT_STATUSES = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
];

export const HCP_CHANGE_CHANNELS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "online", label: "Online" },
];

export const HCP_CHANGE_STATUSES = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "denied", label: "Denied" },
  { value: "incomplete_documentation", label: "Incomplete documentation" },
  { value: "not_qualified", label: "Not qualified for change" },
];

export const ENROLMENT_DRIVE_FUNDING_OPTIONS = [
  "Zero-Cost (Statutory Mandate)",
  "Budgeted (Approved Release)",
];
export const ENROLMENT_DRIVE_BUDGETED = "Budgeted (Approved Release)";

export const ENROLMENT_DRIVE_TARGET_AUDIENCES = [
  "State Executives", "Organized Labour", "Traditional Rulers", "Employers", "Desk Officers",
  "Students", "Private Company", "Market Association", "Artisan Group", "Religious Organisation",
  "Community Leaders", "Traditional Institution", "HCPs", "HMOs", "Healthcare Provider Association",
  "Civil Society", "NGOs", "General Public", "Corp Members", "Women", "Children", "Youth",
  "Existing Beneficiaries", "Informal Sector", "Others (specify)",
];

export const ENROLMENT_DRIVE_PROGRAMS = [
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
];

export const ENROLMENT_DRIVE_LOCATIONS: Record<string, string[]> = {
  "Government": [
    "NHIA Office", "State Government Secretariat", "Ministry/Department/Agency Office",
    "Local Government Secretariat", "Government Institution", "Government Meeting Venue",
  ],
  "Health Sector": [
    "Health Facility", "PHC", "Primary Healthcare Centre", "NHIA Programme Office",
    "Health Management Organisation Office", "Provider Organisation Office",
    "Healthcare Provider Association Office",
  ],
  "Stakeholder Organisation": [
    "Stakeholder's Office", "Corporate Office", "NGO/CSO Office", "Development Partner Office",
    "Professional Association Office", "Trade/Business Association Office", "Union Office",
    "Cooperative Society Office",
  ],
  "Community and Traditional": [
    "Traditional Ruler's Palace", "Community Centre", "Community Hall", "Community Meeting Venue",
    "Ward Meeting Centre", "Religious Centre", "Market",
  ],
  "Institutional": [
    "School", "Tertiary Institution", "Research Institution", "Training Institution",
    "Conference Centre", "Hotel/Meeting Venue", "Workplace",
  ],
  "Media": ["Radio Station", "Television Station", "Media House", "Press Centre"],
  "Virtual": ["Online", "Telephone/Teleconference"],
};

export const ENROLMENT_DRIVE_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
];

export const ETMC_SESSIONS = [
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
];

export const ETMC_AGENDA_ITEMS = [
  { value: "enrolment_ict", label: "Enrolment & ICT" },
  { value: "accreditation", label: "Accreditation" },
  { value: "finance_igr", label: "Finance & IGR" },
  { value: "complaints_servicom", label: "Complaints & SERVICOM" },
  { value: "operations_monitoring", label: "Operations & Monitoring" },
  { value: "policy_governance", label: "Policy & Governance" },
  { value: "human_resources", label: "Human Resources" },
  { value: "special_projects", label: "Special Projects" },
  { value: "aob", label: "Any Other Business" },
];

export const ETMC_DEPARTMENTS = [
  { value: "DG", label: "DG Office" },
  { value: "Finance", label: "Finance & Admin" },
  { value: "Programmes", label: "Programmes" },
  { value: "SQA", label: "Standards & Quality Assurance" },
  { value: "ICT", label: "ICT Support" },
  { value: "SOC", label: "State Office Coordination (SOC)" },
  { value: "Audit", label: "Audit & Compliance" },
  { value: "Legal", label: "Legal Services" },
  { value: "HR", label: "Human Resources" },
  { value: "Planning", label: "Planning & Research" },
  { value: "Communications", label: "Communications" },
  { value: "Special Projects", label: "Special Projects" },
  { value: "Zonal", label: "Zonal Office" },
  { value: "State", label: "State Office" },
];

export const ETMC_ACTION_STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "closed", label: "Closed" },
];

export const ENROLMENT_CATEGORIES = [
  { value: "enrolment", label: "Enrolment" },
  { value: "nin_validation", label: "NIN Validation" },
  { value: "id_card_issuance", label: "ID Card Issuance" },
  { value: "enrolee_record_update", label: "Enrolee Record Update (Beneficiary Management)" },
  { value: "validation_of_enrolees", label: "Validation of Enrolees" },
  // legacy values (older reports)
  { value: "mop_up", label: "Mop-up Registration" },
  { value: "gifship", label: "GIFSHIP" },
  { value: "tiship", label: "TISHIP" },
  { value: "extra_dependant", label: "Extra Dependant" },
  { value: "additional_dependant", label: "Additional Dependant" },
  { value: "ops", label: "OPS" },
  { value: "sshia", label: "SSHIA" },
];

export const MIGRATION_REQUEST_TYPES = [
  { value: "change_of_facility", label: "Change of Facility" },
  { value: "correction_of_data", label: "Correction of Data (Name/DOB)" },
  { value: "change_of_mda", label: "Change of MDA" },
];

export const CEMONC_INTERVENTIONS = [
  { value: "cemonc", label: "CEmONC" },
  { value: "ffp", label: "FFP" },
];

export const COMPLAINT_SUMMARY_CATEGORIES = [
  { value: "against_hmo", label: "Against HMO" },
  { value: "against_hcp", label: "Against HCP" },
];

export const COMPLAINT_STATUS_TYPES = [
  { value: "resolved", label: "Resolved" },
  { value: "unresolved", label: "Unresolved" },
  { value: "pending", label: "Pending" },
  { value: "escalated", label: "Escalated" },
];

export const ACCREDITATION_PROCESS_TYPES = [
  { value: "accreditation", label: "Accreditation" },
  { value: "reaccreditation", label: "Reaccreditation" },
];

export const ACCREDITATION_ENTRY_TYPES = [
  { value: "completed_forms_returned", label: "Completed Forms Returned" },
  { value: "facilities_awaiting", label: "Facilities Awaiting" },
];

/** @deprecated use process + entry types in form */
export const ACCREDITATION_INDICATORS = [
  { value: "accreditation_applications", label: "Applications Received (Accreditation)" },
  { value: "reaccreditation_applications", label: "Applications Received (Reaccreditation)" },
  { value: "completed_forms_returned", label: "Completed Forms Returned" },
  { value: "awaiting_accreditation", label: "Facilities Awaiting Accreditation" },
  { value: "awaiting_reaccreditation", label: "Facilities Awaiting Reaccreditation" },
];

export type AccreditationProcess = "accreditation" | "reaccreditation";
export type AccreditationEntry = "completed_forms_returned" | "facilities_awaiting";

export function accreditationRowKey(process: string, entry: string) {
  return `${process}:${entry}`;
}

export function accreditationToIndicator(process: AccreditationProcess, entry: AccreditationEntry) {
  if (entry === "completed_forms_returned") return "completed_forms_returned";
  return process === "accreditation" ? "awaiting_accreditation" : "awaiting_reaccreditation";
}

export function collapseAccreditationRows(
  rows: { process: AccreditationProcess; entry: AccreditationEntry; primary_count: number; secondary_count: number }[],
) {
  const map = new Map<string, { indicator: string; primary_count: number; secondary_count: number }>();
  rows.forEach((r) => {
    const indicator = accreditationToIndicator(r.process, r.entry);
    if (!map.has(indicator)) {
      map.set(indicator, { indicator, primary_count: 0, secondary_count: 0 });
    }
    const line = map.get(indicator)!;
    line.primary_count += Number(r.primary_count) || 0;
    line.secondary_count += Number(r.secondary_count) || 0;
  });
  return Array.from(map.values());
}

export function expandAccreditationLines(lines: any[]) {
  const rows: {
    process: AccreditationProcess;
    entry: AccreditationEntry;
    primary_count: number;
    secondary_count: number;
  }[] = [];

  lines.forEach((l) => {
    const primary = Number(l.primary_count) || 0;
    const secondary = Number(l.secondary_count) || 0;
    if (primary === 0 && secondary === 0) return;

    switch (l.indicator) {
      case "awaiting_accreditation":
        rows.push({ process: "accreditation", entry: "facilities_awaiting", primary_count: primary, secondary_count: secondary });
        break;
      case "awaiting_reaccreditation":
        rows.push({ process: "reaccreditation", entry: "facilities_awaiting", primary_count: primary, secondary_count: secondary });
        break;
      case "completed_forms_returned":
        rows.push({ process: "accreditation", entry: "completed_forms_returned", primary_count: primary, secondary_count: secondary });
        break;
      default:
        break;
    }
  });
  return rows;
}

/** PPT service dropdown — one receipt = one IGR submission. */
export const IGR_SERVICE_TYPES = [
  { value: "gifship",                    label: "GIFSHIP" },
  { value: "nin_charge",                 label: "NIN Charge" },
  { value: "enrollee_update",            label: "Enrollee Update" },
  { value: "application_accreditation",  label: "Application Forms (Accreditation / Re-accreditation)" },
  { value: "extra_dependent",            label: "Extra Dependent" },
  { value: "additional_dependent",       label: "Additional Dependent" },
  { value: "change_of_hcf",              label: "Change of HCF" },
];

/** SSHIA sub-head dropdown values (one entry at a time; same quarter merges). */
export const SSHIA_SUB_HEADS = [
  { value: "capitation",      label: "Capitation",      prefix: "cap" },
  { value: "fee_for_service", label: "Fee-for-Service", prefix: "ffs" },
  { value: "reserve_funds",   label: "Reserve Funds",   prefix: "reserve" },
  { value: "admin_charge",    label: "Admin. Charges",  prefix: "admin" },
] as const;

/** PPT Form 2 column definitions (SSHIA Progress Report). */
export const SSHIA_COLUMNS = [
  { key: "opening_balance",    label: "Opening Balance (A)",              code: "A", hint: "",         unit: "₦" },
  { key: "receipts",           label: "Allotted Budget / Receipts (B)",   code: "B", hint: "",         unit: "₦" },
  { key: "total_budget",       label: "Total Budget Available (C = A + B)", code: "C", hint: "A+B",    unit: "₦" },
  { key: "actual_expenditure", label: "Actual Expenditure (D)",           code: "D", hint: "",         unit: "₦" },
  { key: "balance",            label: "Balance (E = C − D)",              code: "E", hint: "C−D",      unit: "₦" },
  { key: "variance_pct",       label: "% Variance (F = D ÷ C × 100)",     code: "F", hint: "D÷C×100",  unit: "%" },
  { key: "bhcpf_lives",        label: "Covered BHCPF Lives",              code: "",  hint: "",         unit: "" },
] as const;

// ─── Weekly Actionable ────────────────────────────────────────────────────────
export const ACTIONABLE_CATEGORIES = [
  { value: "operational",   label: "Operational"   },
  { value: "budgetary",     label: "Budgetary"     },
  { value: "administrative",label: "Administrative"},
  { value: "policy",        label: "Policy"        },
];

export const ACTIONABLE_IMPACTS = [
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
];

export const ACTIONABLE_STATUSES = [
  { value: "escalated",                label: "Escalated"                   },
  { value: "awaiting_further_info",    label: "Awaiting Further Information"},
  { value: "awaiting_response",        label: "Awaiting Response"           },
  { value: "resolved",                 label: "Resolved"                    },
];

export const ACTIONABLE_PRIORITY_MAP: Record<string, string> = {
  dg:         "p1",
  department: "p2",
  zone_state: "p3",
};

/** Auto-derived priority based on user department selection */
export function derivePriority(userDept: string): string {
  const deptLower = userDept.toLowerCase();
  if (deptLower === "dg" || deptLower === "dg office" || deptLower === "dg/ceo") return "P1 (High – DG attention)";
  if (deptLower.includes("zone") || deptLower.includes("state") || deptLower.includes("zonal") || deptLower.includes("soc")) return "P3 (Low – Zone/State)";
  return "P2 (Medium – Depts)";
}

// ─── Contracted Services ──────────────────────────────────────────────────────
export const CONTRACTED_SERVICES = [
  { value: "security",     label: "Security Services"             },
  { value: "cleaning",     label: "Cleaning/Horticulture Service" },
  { value: "generator",    label: "Generator Services"            },
];

/** Fixed 9 expense categories — allocation % is config-only (not stored per row). */
export const EXPENDITURE_SUB_HEADS = [
  { value: "fuel_lubricants",            label: "Fuel & Lubricants",            allocation: 0.31 },
  { value: "newspapers_periodicals",     label: "Newspapers & Periodicals",     allocation: 0.0117 },
  { value: "entertainment_hospitality",  label: "Entertainment & Hospitality",  allocation: 0.0161 },
  { value: "telephone_postages",         label: "Telephone & Postages",         allocation: 0.0453 },
  { value: "printing_stationery",        label: "Printing & Stationery",        allocation: 0.0497 },
  { value: "transport_travel",           label: "Transport & Travel",           allocation: 0.2091 },
  { value: "maintenance_vehicles",       label: "Maintenance of Vehicles",      allocation: 0.2136 },
  { value: "maintenance_equipment",      label: "Maintenance of Equipment",     allocation: 0.0708 },
  { value: "utilities_bank_charges",     label: "Utilities / Bank Charges",     allocation: 0.0737 },
] as const;

export const REPORT_CONFIG: Record<StateOfficeReportType, {
  title: string;
  subtitle: string;
  refLabel: string;
  countLabel: string;
  totalLabel: string;
}> = {
  enrolment: {
    title: "Enrolment Activity Reporting",
    subtitle: "",
    refLabel: "Enrolment Activity", countLabel: "Number Enrolled / Beneficiaries", totalLabel: "Total Enrolled",
  },
  migration: {
    title: "Migration / Update Requests",
    subtitle: "",
    refLabel: "Type of Request", countLabel: "Number of Requests", totalLabel: "Total Requests",
  },
  cemonc: {
    title: "CEmONC & FFP Beneficiaries",
    subtitle: "",
    refLabel: "Intervention", countLabel: "Number of Beneficiaries", totalLabel: "Total Beneficiaries",
  },
  complaints: {
    title: "Complaints & Compliance Monitoring",
    subtitle: "",
    refLabel: "Category / Status", countLabel: "Number", totalLabel: "Total Complaints",
  },
  accreditation: {
    title: "Accreditation",
    subtitle: "",
    refLabel: "Indicator", countLabel: "Count", totalLabel: "Grand Total",
  },
  stakeholder: {
    title: "Stakeholder Management",
    subtitle: "",
    refLabel: "Engagement Activity", countLabel: "Activities", totalLabel: "Activities",
  },
  "hmo-selection": {
    title: "MDA Change of HMO Selection Process",
    subtitle: "",
    refLabel: "MDA", countLabel: "Records", totalLabel: "Total Records",
  },
  "extra-dependant": {
    title: "Additional / Extra Dependent",
    subtitle: "",
    refLabel: "Enrollee", countLabel: "Records", totalLabel: "Total Records",
  },
  ...(Object.fromEntries(ENROLMENT_DRIVE_TYPES.map((t) => [enrolmentDriveReportType(t.key), {
    title: t.title,
    subtitle: "",
    refLabel: "Activity", countLabel: "New Enrolments", totalLabel: "Total New Enrolments",
  }])) as Record<EnrolmentDriveReportType, { title: string; subtitle: string; refLabel: string; countLabel: string; totalLabel: string }>),
  "hcf-change": {
    title: "Change of HCP",
    subtitle: "",
    refLabel: "Enrollee", countLabel: "Records", totalLabel: "Total Records",
  },
  challenges: {
    title: "Challenges",
    subtitle: "",
    refLabel: "Challenge", countLabel: "Records", totalLabel: "Total Challenges",
  },
  igr: {
    title: "Internally Generated Revenue (IGR)",
    subtitle: "",
    refLabel: "Service Type",
    countLabel: "Amount (₦)",
    totalLabel: "Total IGR (₦)",
  },
  "sshia-financial": {
    title: "SSHIA Progress Report",
    subtitle: "",
    refLabel: "Sub-head",
    countLabel: "Balance (₦)",
    totalLabel: "Total Balance (₦)",
  },
  "expenditure-profile": {
    title: "Expenditure Profile",
    subtitle: "",
    refLabel: "Category",
    countLabel: "Amount (₦)",
    totalLabel: "Total (₦)",
  },
  "weekly-actionable": {
    title: "Weekly Actionable",
    subtitle: "State Office Coordination — Weekly Actionable Points",
    refLabel: "Issue/Request",
    countLabel: "Priority Level",
    totalLabel: "Total Items",
  },
  "contracted-services": {
    title: "Contracted Services",
    subtitle: "State Office Coordination — Monthly Contracted Services",
    refLabel: "Service",
    countLabel: "Amount (NGN)",
    totalLabel: "Total Amount (NGN)",
  },
  "enrollee-register": {
    title: "Monthly Enrollee Register (ICT)",
    subtitle: "Zone · State · Scheme lives for the reporting month",
    refLabel: "Scheme",
    countLabel: "Lives",
    totalLabel: "Total Lives",
  },
  "etmc-tmc-action-point": {
    title: "ETMC/TMC Action-Point Register",
    subtitle: "Track implementation of decisions agreed at ETMC/TMC for states and zones",
    refLabel: "Action Point",
    countLabel: "Resolutions",
    totalLabel: "Action Points",
  },
  "ict-support-register": {
    title: "ICT Support Register",
    subtitle: "State Office — Network, infrastructure and helpdesk support log",
    refLabel: "Support ID",
    countLabel: "Tickets",
    totalLabel: "Total Tickets",
  },
  "adhoc-special-assignment": {
    title: "Ad-hoc / Special Assignment",
    subtitle: "State Office — Track special assignments and completion outcomes",
    refLabel: "Assignment ID",
    countLabel: "Assignments",
    totalLabel: "Total Assignments",
  },
};

export const ICT_SUPPORT_CATEGORIES = [
  { value: "network_infrastructure", label: "Network & Infrastructure" },
  { value: "helpdesk", label: "Helpdesk" },
];

export const ICT_NETWORK_ISSUES = [
  { value: "internet_connectivity", label: "Internet connectivity" },
  { value: "lan_wifi", label: "LAN/Wi-Fi" },
  { value: "router_switch_ap", label: "Router/switch/access point" },
  { value: "computer_peripheral", label: "Computer or peripheral hardware" },
  { value: "printer_scanner", label: "Printer/scanner" },
  { value: "power_ups", label: "Power supply/UPS" },
  { value: "network_cabling", label: "Network cabling" },
  { value: "ict_equipment_install", label: "ICT equipment installation" },
  { value: "other", label: "Other" },
];

export const ICT_HELPDESK_ISSUES = [
  { value: "login_password", label: "Login/password" },
  { value: "email", label: "Email" },
  { value: "software_application", label: "Software/application" },
  { value: "computer_operation", label: "Computer operation" },
  { value: "printer_scanner_use", label: "Printer/scanner use" },
  { value: "user_account_access", label: "User account/access" },
  { value: "data_entry_system", label: "Data entry/system use" },
  { value: "other", label: "Other" },
];

export const ICT_PRIORITIES = [
  { value: "critical", label: "Critical (major disruption)" },
  { value: "high", label: "High (significant impact)" },
  { value: "medium", label: "Medium (limited impact)" },
  { value: "low", label: "Low (routine request)" },
];

export const ICT_RESOLUTION_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "deferred", label: "Deferred" },
];

export const ICT_YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const ICT_REFERRED_TO = [
  { value: "zone", label: "Zone" },
  { value: "nhia_hq_ict", label: "NHIA HQ ICT" },
  { value: "service_provider", label: "Service Provider" },
  { value: "other", label: "Other (Specify)" },
];

export const ADHOC_ASSIGNMENT_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_support", label: "Awaiting Support" },
  { value: "completed", label: "Completed" },
  { value: "deferred", label: "Deferred" },
  { value: "cancelled", label: "Cancelled" },
];

export const ADHOC_RESPONSIBLE_UNITS = [
  { value: "state_office", label: "State Office" },
  { value: "zonal_office", label: "Zonal Office" },
  { value: "soc", label: "SOC" },
  { value: "ict", label: "ICT" },
  { value: "finance", label: "Finance" },
  { value: "programmes", label: "Programmes" },
  { value: "sqa", label: "SQA" },
  { value: "legal", label: "Legal" },
  { value: "hr", label: "HR" },
  { value: "other", label: "Other" },
];

export const ADHOC_SUPPORT_REQUIRED = [
  { value: "none", label: "None" },
  { value: "state_office", label: "State Office" },
  { value: "zonal_office", label: "Zonal Office" },
  { value: "hq", label: "HQ" },
  { value: "finance", label: "Finance" },
  { value: "ict", label: "ICT" },
  { value: "legal", label: "Legal" },
  { value: "programmes", label: "Programmes" },
  { value: "sqa", label: "SQA" },
  { value: "hr", label: "HR" },
  { value: "other", label: "Other" },
];

export function monthLabel(month: number | string) {
  const m = MONTHS.find(x => x.value === Number(month));
  return m?.label ?? String(month);
}

export function quarterFromMonth(month: number | string) {
  return Math.ceil(Number(month) / 3);
}

export function labelOf(
  options: { value: string; label: string }[],
  value: string,
  fallback = "—"
) {
  if (!value) return fallback;
  return options.find(o => o.value === value)?.label ?? value;
}

export function parseSupportingDocuments(raw: unknown): { name: string; path?: string; label?: string }[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return { name: item, label: item };
    if (item && typeof item === "object" && ("path" in item || "name" in item)) {
      return { name: (item as any).name || "Document", path: (item as any).path };
    }
    return { name: "Document" };
  });
}

export function formatCount(value: number | string | null | undefined) {
  return (Number(value) || 0).toLocaleString();
}

export function formatAmount(value: number | string | null | undefined) {
  return (Number(value) || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Money display with Naira sign */
export function formatNaira(value: number | string | null | undefined) {
  return `₦${formatAmount(value)}`;
}

/** Compact money for KPI cards: ₦35.3M, ₦12.4K, etc. */
export function formatNairaCompact(value: number | string | null | undefined) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₦${abs.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

/** Blank-aware SSHIA math: missing inputs stay null; never invent zeros for display. */
export function calcSshiaLine(
  opening: number | string | null | undefined,
  receipts: number | string | null | undefined,
  expenditure: number | string | null | undefined,
) {
  const hasA = opening !== "" && opening != null;
  const hasB = receipts !== "" && receipts != null;
  const hasD = expenditure !== "" && expenditure != null;
  const A = hasA ? Number(opening) : null;
  const B = hasB ? Number(receipts) : null;
  const D = hasD ? Number(expenditure) : null;
  const C = hasA || hasB ? Number(A || 0) + Number(B || 0) : null;
  const E = C != null && D != null ? C - D : C != null ? C : null;
  // Variance = actual expenditure as % of total available (D÷C×100)
  const F = C != null && D != null && C !== 0 ? (D / C) * 100 : null;
  return {
    opening_balance: A,
    receipts: B,
    total_budget: C,
    actual_expenditure: D,
    balance: E,
    variance_pct: F,
  };
}

export function calcExpenditurePct(amount: number, total: number) {
  return total !== 0 ? (Number(amount) / total) * 100 : 0;
}

export function formatAllocationPct(allocation: number) {
  return `${(allocation * 100).toFixed(2)}%`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-NG", { day: "2-digit", month: "long", year: "numeric" });
}

/** Compact numeric date for dense tables (dd/mm/yyyy). */
export function formatDateShort(value: string | null | undefined) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function reportLineCount(reportType: StateOfficeReportType, report: any) {
  if (reportType === "complaints") {
    return (report.summary_lines?.length ?? 0)
      + (report.status_lines?.length ?? 0)
      + (report.visit_lines?.length ?? 0)
      + (report.reconciliation_lines?.length ?? 0);
  }
  if (reportType === "challenges") {
    return report.lines?.length
      ?? ((report.challenges ? 1 : 0) + (report.recommendations ? 1 : 0));
  }
  if (reportType === "enrollee-register") {
    return 6;
  }
  if (reportType === "etmc-tmc-action-point") {
    return report.lines?.length ?? 0;
  }
  if (reportType === "weekly-actionable" || reportType === "contracted-services") {
    return report.lines?.length ?? 0;
  }
  if (reportType === "ict-support-register" || reportType === "adhoc-special-assignment") {
    return report.lines?.length ?? 0;
  }
  return report.lines?.length ?? 0;
}

export function reportLineTotal(reportType: StateOfficeReportType, report: any) {
  if (reportType === "enrolment") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.enrolment_count) || 0), 0);
  }
  if (reportType === "migration") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.request_count) || 0), 0);
  }
  if (reportType === "cemonc") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.beneficiaries) || 0), 0);
  }
  if (reportType === "complaints") {
    const sum = (report.summary_lines ?? []).reduce((s: number, l: any) => s + (Number(l.complaint_count) || 0), 0);
    return sum;
  }
  if (reportType === "accreditation") {
    return (report.lines ?? []).reduce((s: number, l: any) =>
      s + (Number(l.primary_count) || 0) + (Number(l.secondary_count) || 0), 0);
  }
  if (reportType === "stakeholder") {
    return report.lines?.length ?? report.planned_activities ?? 0;
  }
  if (isEnrolmentDriveType(reportType)) {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.new_enrolments) || 0), 0);
  }
  if (reportType === "hmo-selection" || reportType === "extra-dependant" || reportType === "hcf-change") {
    return report.lines?.length ?? 0;
  }
  if (reportType === "igr") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  }
  if (reportType === "sshia-financial") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.balance) || 0), 0);
  }
  if (reportType === "expenditure-profile") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  }
  if (reportType === "enrollee-register") {
    return Number(report.total_lives) || 0;
  }
  if (reportType === "etmc-tmc-action-point") {
    return new Set((report.lines ?? []).map((l: any) => l.resolution_id).filter(Boolean)).size;
  }
  if (reportType === "weekly-actionable") {
    return report.lines?.length ?? 0;
  }
  if (reportType === "contracted-services") {
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  }
  if (reportType === "ict-support-register" || reportType === "adhoc-special-assignment") {
    return report.lines?.length ?? 0;
  }
  return 0;
}
