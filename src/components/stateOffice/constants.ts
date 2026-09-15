export type StateOfficeReportType =
  | "enrolment" | "migration" | "cemonc"
  | "complaints" | "accreditation" | "stakeholder" | "hmo-selection" | "challenges"
  | "igr" | "sshia-financial" | "expenditure-profile"
  | "weekly-actionable" | "contracted-services" | "enrollee-register" | "etmc-tmc-action-point";

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

export const ETMC_SESSIONS = [
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
];

export const ETMC_AGENDA_ITEMS = [
  { value: "enrolment_ict", label: "Enrolment & ICT" },
  { value: "accreditation", label: "Accreditation / Reaccreditation" },
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

export const IGR_SERVICE_TYPES = [
  { value: "enrollee_update",    label: "Enrollee Update" },
  { value: "application",       label: "Application" },
  { value: "accreditation",     label: "Accreditation" },
  { value: "change_of_provider", label: "Change of Provider" },
  { value: "reaccreditation",   label: "Reaccreditation" },
  { value: "extra_dependant",   label: "Extra Dependant" },
  { value: "gifship",           label: "GIFSHIP" },
  { value: "ops",               label: "OPS" },
];

export const SSHIA_SUB_HEADS = [
  { value: "capitation",      label: "Capitation" },
  { value: "fee_for_service", label: "Fee-For-Service" },
  { value: "reserve_funds",   label: "Reserve Funds" },
  { value: "admin_charge",    label: "Admin. Charge" },
  { value: "operations",      label: "Operations" },
];

/** Column definitions for SSHIA financial tables (form + view). */
export const SSHIA_COLUMNS = [
  { key: "opening_balance",    label: "Opening Bal",         code: "A", hint: "",       unit: "₦" },
  { key: "receipts",           label: "Receipts",            code: "B", hint: "",       unit: "₦" },
  { key: "total_budget",       label: "Total Budget",          code: "C", hint: "A+B",    unit: "₦" },
  { key: "actual_expenditure", label: "Actual Expenditure",    code: "D", hint: "",       unit: "₦" },
  { key: "balance",            label: "Balance",               code: "E", hint: "C−D",    unit: "₦" },
  { key: "variance_pct",       label: "Variance %",            code: "F", hint: "C÷D×100", unit: "%" },
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

export const EXPENDITURE_SUB_HEADS = [
  { value: "fuel_lub",               label: "FUEL & LUB" },
  { value: "newspapers_periodicals", label: "NEWSPAPERS & PERIODICALS" },
  { value: "ent_hosp",               label: "ENT & HOSP." },
  { value: "tel_postages",           label: "TEL & POSTAGES" },
  { value: "printing_stationery",    label: "PRINTING & STATIONERY" },
  { value: "transport_travel",       label: "TRANSPORT & TRAVEL" },
  { value: "maint_veh",              label: "MAINT. OF VEH" },
  { value: "maint_equip",            label: "MAINT. OF EQUIP" },
  { value: "utilities",              label: "UTILITIES" },
  { value: "bank_charges",           label: "BANK CHARGES" },
];

export const REPORT_CONFIG: Record<StateOfficeReportType, {
  title: string;
  subtitle: string;
  refLabel: string;
  countLabel: string;
  totalLabel: string;
}> = {
  enrolment: {
    title: "Enrolment",
    subtitle: "",
    refLabel: "Category", countLabel: "No. of Enrolment", totalLabel: "Total Enrollment",
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
    title: "Accreditation / Reaccreditation",
    subtitle: "",
    refLabel: "Indicator", countLabel: "Count", totalLabel: "Grand Total",
  },
  stakeholder: {
    title: "Stakeholder Engagement",
    subtitle: "",
    refLabel: "Activity", countLabel: "Audience Size", totalLabel: "Total Audience",
  },
  "hmo-selection": {
    title: "HMO Selection Process",
    subtitle: "",
    refLabel: "MDA", countLabel: "HMOs in Attendance", totalLabel: "Total Meetings",
  },
  challenges: {
    title: "Challenges & Recommendations",
    subtitle: "",
    refLabel: "Section", countLabel: "Content", totalLabel: "Sections",
  },
  igr: {
    title: "IGR",
    subtitle: "Internally Generated Revenue",
    refLabel: "Service Type",
    countLabel: "Amount (₦)",
    totalLabel: "Total IGR (₦)",
  },
  "sshia-financial": {
    title: "SSHIA Financial Report",
    subtitle: "FORM 07 — Financial Management Report (Quarterly)",
    refLabel: "Sub-head",
    countLabel: "Balance (₦)",
    totalLabel: "Total Balance (₦)",
  },
  "expenditure-profile": {
    title: "Expenditure Profile",
    subtitle: "Expenditure Profile — Budget Allocation",
    refLabel: "Sub-head",
    countLabel: "Amount (₦)",
    totalLabel: "Total Allocated (₦)",
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
};

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
  return value ? (options.find(o => o.value === value)?.label ?? fallback) : fallback;
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

export function calcSshiaLine(opening: number, receipts: number, expenditure: number) {
  const A = Number(opening) || 0;
  const B = Number(receipts) || 0;
  const D = Number(expenditure) || 0;
  const C = A + B;
  const E = C - D;
  const F = D !== 0 ? (C / D) * 100 : 0;
  return { opening_balance: A, receipts: B, total_budget: C, actual_expenditure: D, balance: E, variance_pct: F };
}

export function calcExpenditurePct(amount: number, total: number) {
  return total !== 0 ? (Number(amount) / total) * 100 : 0;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-NG", { day: "2-digit", month: "long", year: "numeric" });
}

export function reportLineCount(reportType: StateOfficeReportType, report: any) {
  if (reportType === "complaints") {
    return (report.summary_lines?.length ?? 0)
      + (report.status_lines?.length ?? 0)
      + (report.visit_lines?.length ?? 0)
      + (report.reconciliation_lines?.length ?? 0);
  }
  if (reportType === "challenges") {
    return (report.challenges ? 1 : 0) + (report.recommendations ? 1 : 0);
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
    return (report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.audience_size) || 0), 0);
  }
  if (reportType === "hmo-selection") {
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
  return 0;
}
