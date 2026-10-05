/**
 * Stakeholder Engagement — Activity Reporting Template §4 + Stakeholder Engagement List sheet.
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
  { code: "ENG-015", label: "Claims Management" },
  { code: "ENG-016", label: "Others (specify)" },
] as const;

export const STAKEHOLDER_CATEGORIES = [
  "HCFs", "MDAs", "HMOs", "Enrolees", "State Ministry of Health",
  "NHIA-Roche", "SSHIA", "Partners", "Others (Specify)",
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

export const STAKEHOLDER_FUNDING_OPTIONS = [
  "Zero-Cost (Statutory Mandate)",
  "Budgeted (Approved Release)",
] as const;

export const STAKEHOLDER_BUDGETED = "Budgeted (Approved Release)";

export const STAKEHOLDER_TARGET_AUDIENCES = [
  "State Executives", "Organized Labour", "Traditional Rulers", "Healthcare Workers",
  "Employers", "Desk Officers", "Students", "Private Company", "Market Association",
  "Artisan Group", "Religious Organisation", "Community Leaders", "Traditional Institution",
  "Health Workers", "HMOs", "Healthcare Providers", "Civil Society", "NGOs", "General Public",
  "Corp Members", "Women", "Children", "Youth", "Existing Beneficiaries", "Informal Sector",
  "Others (specify)",
] as const;

export const STAKEHOLDER_OUTCOME_CATEGORIES = [
  "Increased stakeholder commitment",
  "Institutional readiness",
  "Institutional requested onboarding",
  "Partnership/Collaboration strengthened",
  "Partnership formalized",
  "Programme implementation strengthened",
  "Programme planning strengthened",
  "Programme acceptance increased",
  "Implementation issues addressed",
  "Organizations/groups/communities/Associations Mobilized",
  "IEC Material Distributed",
  "Enrolment Forms Issues",
  "Technical capacity improved",
  "Action Plans Developed",
] as const;

export const STAKEHOLDER_SPECIFIC_OUTCOMES = [
  "No. of organisations requesting further engagement",
  "No. of institutions requesting onboarding",
  "No. of focal persons nominated",
  "No. of implementation committees constituted",
  "No. of action plans developed",
  "No. of partnership agreements/MoUs initiated",
  "No. of MoUs signed",
  "No. of communities agreeing to participate",
  "No. of institutions progressing to implementation stage",
  "No. of trainings conducted",
  "No. of technical support sessions",
  "Number of enquiries received after activity",
  "Number of follow-up requests received",
  "No. of registration requests",
  "No. of beneficiaries sensitized",
  "Others (Specify)",
] as const;

export const STAKEHOLDER_EVIDENCE_TYPES = [
  "Attendance Register", "Photographs", "Minutes", "Official Letter", "Signed MoU",
  "Action Plan", "Presentation Materials", "IEC Materials", "Newspaper Publication",
  "Radio Programme Recording", "TV Recording", "Social Media Report",
  "Signed Commitment Letter", "Nomination of Focal Person", "Follow-up Letter",
  "Field Report", "Enquiry Log", "NHIA Letter of Intent",
  "Stakeholder Invitation Letter", "Other (Specify)",
] as const;

export const STAKEHOLDER_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
] as const;

export const STAKEHOLDER_YES_NO = ["Yes", "No"] as const;
