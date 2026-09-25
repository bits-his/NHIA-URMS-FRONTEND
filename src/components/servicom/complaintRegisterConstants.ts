export const REPORTING_MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

/** Lookup Lists — Complaint Type (column C) */
export const COMPLAINT_TYPES = [
  { value: "HCF", label: "HCF" },
  { value: "HMO", label: "HMO" },
  { value: "Enrollee", label: "Enrollee" },
];

export const COMPLAINT_DOMAINS = [
  "Financial", "Operational", "Relationship", "Service Delivery",
].map(v => ({ value: v, label: v }));

export const COMPLAINT_CATEGORIES = [
  "Billing", "Fraud", "Administrative", "Staffing & Resources", "Abuse",
  "Communication", "Access", "Referral", "Quality of Care",
].map(v => ({ value: v, label: v }));

export const PRIORITY_RATINGS = [
  { value: "Top", label: "Top" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
];

export const TRANSMISSION_ROUTES = [
  "Walk-in", "Phone", "Hotline", "Email", "Letter", "Portal",
  "Meetings, Conferences or Workshops", "Other",
].map(v => ({ value: v, label: v }));

/** Lookup Lists — Complainant Type (column D) */
export const COMPLAINANT_CATEGORIES = [
  "Enrollee", "Beneficiary Representative", "Healthcare Facility", "HMO",
  "Employer/MDA", "SSHIA", "Healthcare Worker", "NHIA Staff",
  "Vendor", "Partner Organisation", "General Public", "Anonymous", "Other",
].map(v => ({ value: v, label: v }));

/** Lookup Lists — Respondent Type (column G) */
export const RESPONDENT_CATEGORIES = [
  "Healthcare Facility", "HMO", "NHIA Office", "Employer/MDA", "Other",
].map(v => ({ value: v, label: v }));

export const COMPLAINT_STATUSES = [
  "New/Acknowledged", "Under Investigation", "Awaiting Information",
  "Awaiting Respondent Action", "Escalated", "Resolved", "Closed",
  "Referred to Appropriate Authority", "Complaint Withdrawn",
].map(v => ({ value: v, label: v }));

export const ACTIONS_TAKEN = [
  "Complaint acknowledged", "Investigation commenced", "Respondent contacted",
  "Site visit conducted", "Records reviewed", "Meeting held", "Mediation conducted",
  "Corrective action issued", "Sanction recommended", "Complaint resolved",
  "Complaint closed", "Referred to another authority", "Advice provided",
  "Follow-up conducted", "Other",
].map(v => ({ value: v, label: v }));

export const ESCALATION_LEVELS = [
  "State Internal", "Zonal Office", "NHIA Headquarters", "Other Regulatory Authority",
].map(v => ({ value: v, label: v }));

export const ESCALATED_TO = [
  "ENF", "SQA", "FSD", "ISD", "LEGAL", "NHIA Headquarters", "Other Regulatory Authority",
].map(v => ({ value: v, label: v }));

export const COMPLAINT_OUTCOMES = [
  "Complaint Upheld", "Complaint Partially Upheld", "Complaint Not Upheld",
  "Resolved Through Mediation", "Referred to Appropriate Authority",
  "Information/Advice Provided", "Duplicate Complaint", "Complaint Withdrawn",
].map(v => ({ value: v, label: v }));

export type ComplaintSlaColor = "white" | "yellow" | "amber" | "red";

export interface ComplaintSlaFlag {
  code: string;
  label: string;
}

export interface ComplaintSlaState {
  color: ComplaintSlaColor;
  working_days_elapsed: number;
  message: string | null;
  flags: ComplaintSlaFlag[];
  acknowledged: boolean;
  investigation_commenced: boolean;
  escalated: boolean;
  closed: boolean;
}

export interface ComplaintSlaRuleRow {
  priority: string;
  acknowledge_days: number;
  investigation_commence_days: number;
  escalate_after_days: number;
  target_resolution_days: number;
  acknowledge: string;
  investigate: string;
  escalate: string;
  resolve: string;
}

export function slaRowClass(color?: ComplaintSlaColor | string) {
  switch (color) {
    case "yellow": return "bg-yellow-50/90 hover:bg-yellow-100/90";
    case "amber": return "bg-amber-50/90 hover:bg-amber-100/90";
    case "red": return "bg-red-50/90 hover:bg-red-100/90";
    default: return "bg-white hover:bg-[#f8fbf9]/80";
  }
}

export function slaColorBadgeClass(color?: ComplaintSlaColor | string) {
  switch (color) {
    case "yellow": return "bg-yellow-100 text-yellow-900 border-yellow-300";
    case "amber": return "bg-amber-100 text-amber-900 border-amber-300";
    case "red": return "bg-red-100 text-red-900 border-red-300";
    default: return "bg-white text-slate-600 border-slate-200";
  }
}

export function slaColorLabel(color?: ComplaintSlaColor | string) {
  switch (color) {
    case "yellow": return "Yellow";
    case "amber": return "Amber";
    case "red": return "Red";
    default: return "White";
  }
}

export function slaColorDotClass(color?: ComplaintSlaColor | string) {
  switch (color) {
    case "yellow": return "bg-yellow-400";
    case "amber": return "bg-amber-500";
    case "red": return "bg-red-500";
    default: return "bg-white border border-slate-300";
  }
}

/** Working days past the current SLA breach threshold (0 if on track). */
export function computeSlaOverdueDays(sla: {
  working_days_elapsed?: number;
  closed?: boolean;
  escalated?: boolean;
  acknowledged?: boolean;
  investigation_commenced?: boolean;
  rule?: {
    acknowledge_days: number;
    investigation_commence_days: number;
    escalate_after_days: number;
    target_resolution_days: number;
  } | null;
}) {
  if (!sla?.rule || sla.closed) return 0;
  const elapsed = sla.working_days_elapsed ?? 0;
  const rule = sla.rule;

  if (elapsed > rule.target_resolution_days) {
    return elapsed - rule.target_resolution_days;
  }
  if (elapsed > rule.escalate_after_days && !sla.escalated) {
    return elapsed - rule.escalate_after_days;
  }
  if (elapsed > rule.investigation_commence_days && !sla.investigation_commenced) {
    return elapsed - rule.investigation_commence_days;
  }
  if (elapsed > rule.acknowledge_days && !sla.acknowledged) {
    return elapsed - rule.acknowledge_days;
  }
  return 0;
}
export const SLA_SUMMARY = [
  { priority: "Top", acknowledge: "Within 1 working day", investigate: "Within 1 working day", escalate: "3 working days", resolve: "5 working days" },
  { priority: "High", acknowledge: "Within 1 working day", investigate: "Within 2 working days", escalate: "7 working days", resolve: "10 working days" },
  { priority: "Medium", acknowledge: "Within 2 working days", investigate: "Within 3 working days", escalate: "14 working days", resolve: "20 working days" },
];

export function monthLabel(value: number | string) {
  return REPORTING_MONTHS.find(m => m.value === Number(value))?.label ?? String(value);
}

export function domainCodeFromDomain(domain: string) {
  const map: Record<string, string> = {
    Financial: "FIN",
    Operational: "OPS",
    Relationship: "REL",
    "Service Delivery": "SRV",
  };
  return map[domain] ?? domain.slice(0, 3).toUpperCase();
}

const SLA_RESOLVE_DAYS: Record<string, number> = { Top: 5, High: 10, Medium: 20 };

export function computeResolutionPreview(
  dateReceived: string,
  dateClosed: string,
  priority: string,
) {
  if (!dateReceived || !dateClosed) {
    return { resolution_days: null as number | null, resolution_within_sla: null as boolean | null };
  }
  const d1 = new Date(dateReceived);
  const d2 = new Date(dateClosed);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    return { resolution_days: null, resolution_within_sla: null };
  }
  const resolution_days = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  const target = SLA_RESOLVE_DAYS[priority];
  const resolution_within_sla = target != null ? resolution_days <= target : null;
  return { resolution_days, resolution_within_sla };
}

export function slaForPriority(priority: string, rules?: ComplaintSlaRuleRow[]) {
  const fromApi = rules?.find((s) => s.priority === priority);
  if (fromApi) return fromApi;
  return SLA_SUMMARY.find((s) => s.priority === priority) ?? null;
}

export const STATUS_BADGE_CLASS: Record<string, string> = {
  "New/Acknowledged": "bg-blue-50 text-blue-700 border-blue-200",
  "Under Investigation": "bg-amber-50 text-amber-800 border-amber-200",
  "Awaiting Information": "bg-orange-50 text-orange-800 border-orange-200",
  "Awaiting Respondent Action": "bg-orange-50 text-orange-800 border-orange-200",
  Escalated: "bg-purple-50 text-purple-800 border-purple-200",
  Resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Closed: "bg-slate-100 text-slate-700 border-slate-200",
  "Referred to Appropriate Authority": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Complaint Withdrawn": "bg-rose-50 text-rose-700 border-rose-200",
};

export type LifecycleStage = "registration" | "investigation" | "escalation" | "resolution";

export const COMPLAINT_LIFECYCLE: {
  id: LifecycleStage;
  label: string;
  shortLabel: string;
}[] = [
  { id: "registration", label: "Complaint", shortLabel: "Complaint" },
  { id: "investigation", label: "Investigation", shortLabel: "Investigation" },
  { id: "escalation", label: "Escalation", shortLabel: "Escalation" },
  { id: "resolution", label: "Resolution", shortLabel: "Resolution" },
];

export const INVESTIGATION_STATUSES = COMPLAINT_STATUSES.filter((s) =>
  ["New/Acknowledged", "Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(s.value),
);

export const RESOLUTION_STATUSES = COMPLAINT_STATUSES.filter((s) =>
  ["Resolved", "Closed", "Referred to Appropriate Authority", "Complaint Withdrawn"].includes(s.value),
);

export function lifecycleStageFromStatus(status: string, row?: { escalated?: boolean }): LifecycleStage {
  if (["Resolved", "Closed", "Referred to Appropriate Authority", "Complaint Withdrawn"].includes(status)) {
    return "resolution";
  }
  if (row?.escalated || status === "Escalated") return "escalation";
  if (["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(status)) {
    return "investigation";
  }
  return "registration";
}

export function getStageCompletion(row: any): Record<LifecycleStage, boolean> {
  if (!row) {
    return { registration: false, investigation: false, escalation: false, resolution: false };
  }
  const escalated = !!row.escalated || row.status === "Escalated";
  return {
    registration: !!(row.complaint_number && (row.complainant_category || row.complaint_type)),
    // Once escalated, investigation is treated as complete
    investigation: escalated || !!(row.investigation_start_date || row.actions_taken
      || ["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(row.status)),
    escalation: escalated,
    resolution: !!(row.date_closed || row.outcome),
  };
}

export function lifecycleStageLabel(stage: LifecycleStage) {
  return COMPLAINT_LIFECYCLE.find((s) => s.id === stage)?.shortLabel ?? stage;
}

const STAGE_ORDER: LifecycleStage[] = ["registration", "investigation", "escalation", "resolution"];

export function nextLifecycleStage(current: LifecycleStage): LifecycleStage {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return current;
  return STAGE_ORDER[idx + 1];
}

export function priorLifecycleStages(active: LifecycleStage): LifecycleStage[] {
  const idx = STAGE_ORDER.indexOf(active);
  if (idx <= 0) return [];
  return STAGE_ORDER.slice(0, idx);
}

export const CLOSED_COMPLAINT_STATUSES = [
  "Resolved", "Closed", "Referred to Appropriate Authority", "Complaint Withdrawn",
] as const;

export function complaintPartyCode(party?: string | null) {
  const p = String(party || "").trim();
  if (/^enrollee$/i.test(p)) return "ENR";
  if (/^hmo$/i.test(p)) return "HMO";
  if (/^hcf$/i.test(p)) return "HCF";
  return (p.slice(0, 3).toUpperCase() || "GEN");
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Preview of monthly complaint ID format: ENF/HCF/TR/JAN 26/… */
export function previewComplaintNumber(against?: string | null, dateReceived?: string | null) {
  const againstCode = complaintPartyCode(against || "HCF");
  const d = dateReceived ? new Date(dateReceived) : new Date();
  const month = Number.isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const mon = MONTH_ABBR[month];
  const yy = String(year).slice(-2);
  return `ENF/${againstCode}/TR/${mon} ${yy}/…`;
}

export function isComplaintClosed(status?: string) {
  return !!status && CLOSED_COMPLAINT_STATUSES.includes(status as typeof CLOSED_COMPLAINT_STATUSES[number]);
}
