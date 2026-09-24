import type { StateOfficeReportType } from "@/lib/api";

export type AdminHrReportType =
  | "office-meeting"
  | "etmc-cascading"
  | "office-accommodation"
  | "utility-services"
  | "vehicle-maintenance"
  | "conflict-infraction"
  | "enrollee-feedback";

export const ADMIN_HR_TYPES: AdminHrReportType[] = [
  "office-meeting",
  "etmc-cascading",
  "office-accommodation",
  "utility-services",
  "vehicle-maintenance",
  "conflict-infraction",
  "enrollee-feedback",
];

export function isAdminHrType(t: string): t is AdminHrReportType {
  return (ADMIN_HR_TYPES as string[]).includes(t);
}

export const ADMIN_HR_CONFIG: Record<
  AdminHrReportType,
  { title: string; subtitle: string; formTitle: string; newLabel: string }
> = {
  "office-meeting": {
    title: "State Office Meeting Report",
    subtitle: "State Office Meeting Reporting Template",
    formTitle: "State Office Meeting Reporting Template",
    newLabel: "New Meeting Report",
  },
  "etmc-cascading": {
    title: "ETMC Cascading Report",
    subtitle: "ETMC Cascading Reporting Template",
    formTitle: "ETMC Cascading Reporting Template",
    newLabel: "New Cascade Report",
  },
  "office-accommodation": {
    title: "Office Accommodation",
    subtitle: "Office accommodation register by zone / state / year",
    formTitle: "Office Accommodation",
    newLabel: "New Accommodation Entry",
  },
  "utility-services": {
    title: "Utility Services",
    subtitle: "Utility services register by zone / state / period",
    formTitle: "Utility Services",
    newLabel: "New Utility Entry",
  },
  "vehicle-maintenance": {
    title: "Vehicle Maintenance",
    subtitle: "Vehicle maintenance register by zone / state / period",
    formTitle: "Vehicle Maintenance",
    newLabel: "New Maintenance Entry",
  },
  "conflict-infraction": {
    title: "Conflict / Infraction Report",
    subtitle: "Escalate to Zonal Coordinator within 48 hours",
    formTitle: "Conflict / Infraction Report",
    newLabel: "New Conflict Report",
  },
  "enrollee-feedback": {
    title: "Enrollee Feedback Survey",
    subtitle: "Enrollee Feedback / Satisfaction Survey",
    formTitle: "Enrollee Feedback / Satisfaction Survey",
    newLabel: "New Survey Response",
  },
};

export const OWNERSHIP_STATUSES = ["Rented", "NHIA-owned", "Co-habiting"] as const;
export const OFFICE_CONDITIONS = ["Good", "Fair", "Poor", "Requires Major Repairs"] as const;
export const UTILITY_CATEGORIES = [
  "Generator Services",
  "Cleaning & Horticulture",
  "Security",
] as const;
export const MAINTENANCE_TYPES = ["Emergency Repair", "Preventive Maintenance"] as const;
export const VEHICLE_STATUSES = ["Operational", "Restricted Use"] as const;
export const ACTION_STATUSES = ["Pending", "In Progress", "Completed"] as const;
export const FOLLOWUP_STATUSES = ["Pending", "In Progress", "Completed", "No longer Applicable"] as const;
export const PRIORITIES = ["High", "Medium", "Low"] as const;
export const YES_NO = ["Yes", "No"] as const;
export const YES_NO_PARTIAL = ["Yes", "No", "Partially"] as const;
export const YES_NO_NA = ["Yes", "No", "N/A"] as const;
export const VENUE_MODES = ["Physical", "Virtual"] as const;
export const MEETING_TYPES = [
  "Management Meeting",
  "Staff Meeting",
  "Technical Meeting",
  "Stakeholder Meeting",
  "Other",
] as const;
export const CONFLICT_NATURES = [
  "Insubordination",
  "Misconduct / Ethical Breach",
  "Resource / Budget-line Dispute",
  "Breach of Coordination Protocol",
  "Interpersonal / Personality Conflict",
  "Abuse of Office/Authority",
  "Other",
] as const;
export const FEEDBACK_HEAR_ABOUT = [
  "Radio",
  "Office staff",
  "Social media",
  "Provider (HCP/HMO)",
  "Advocacy / marketing event",
  "Friend / family",
  "Other",
] as const;
export const FEEDBACK_VISIT_PURPOSE = [
  "New enrolment / Registration",
  "ID Card Issuance / Replacement",
  "Renewal",
  "NIN Validation",
  "Inquiry / Information Request",
  "Enrollee Update",
  "Complaint / Grievance",
  "Other",
] as const;
export const RATING_AREAS = [
  "Waiting Time",
  "Staff Courtesy",
  "Clarity of Information",
  "Overall Satisfaction",
] as const;
export const RATING_LEVELS = ["Poor", "Fair", "Acceptable", "Excellent"] as const;

export type AdminHrApiType = AdminHrReportType & StateOfficeReportType;
