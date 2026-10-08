/**
 * Provider Management — Activity Reporting Template (Excel §2 + Provider Management List).
 * Shared structure with Stakeholder Engagement; activity-specific metrics vary by program.
 */

export const PROVIDER_MANAGEMENT_ACTIVITIES = [
  { code: "PM-0001", label: "Accreditation" },
  { code: "PM-0002", label: "Re-accreditation" },
  { code: "PM-0003", label: "Quality Assurance" },
  { code: "PM-0004", label: "Medical Audit" },
] as const;

export const PROVIDER_PROGRAMS = [
  { code: "PRG-0001", label: "FSSHIP" },
  { code: "PRG-0002", label: "BHCPF" },
  { code: "PRG-0003", label: "OPS" },
] as const;

export const PROVIDER_FUNDING_OPTIONS = [
  "Routine",
  "Funded (Budgetary)",
  "Special/Ad-hoc Funded",
] as const;

export const PROVIDER_BUDGETED = "Funded (Budgetary)";

export const PROVIDER_ACTIVITY_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
] as const;

export const PROVIDER_EVIDENCE_TYPES = [
  "Inspection Report", "Accreditation Letter", "Photographs", "Attendance Register",
  "Signed Checklist", "Facility Register", "Audit Report", "Other (Specify)",
] as const;

/** Metric labels shown when activity + program match (from Provider Management List sheet). */
export const PROVIDER_METRICS_BY_ACTIVITY: Record<string, Partial<Record<string, string[]>>> = {
  Accreditation: {
    FSSHIP: [
      "Number of Applications Received",
      "Number of Accreditation Forms Sent",
      "Number of Completed Returned Forms",
      "Number of Facilities Awaiting Accreditation",
      "Number of Facilities Accredited",
    ],
    BHCPF: [
      "Number of PHC Awaiting Accreditation",
      "Number of PHCs Accredited",
      "Number of PHCs Inspected",
    ],
  },
  "Re-accreditation": {
    FSSHIP: [
      "Number of Facilities Awaiting Re-accreditation",
      "Number of Facilities Re-accredited",
    ],
    BHCPF: ["Number of PHCs Reaccredited"],
  },
  "Quality Assurance": {
    FSSHIP: ["Number of Facilities Inspected", "Number of QA Reports Completed"],
    BHCPF: ["Number of PHCs Inspected", "Number of QA Reports Completed"],
  },
  "Medical Audit": {
    FSSHIP: ["Number of Audits Planned", "Number of Audits Conducted"],
    BHCPF: ["Number of Audits Planned", "Number of Audits Conducted"],
  },
};
