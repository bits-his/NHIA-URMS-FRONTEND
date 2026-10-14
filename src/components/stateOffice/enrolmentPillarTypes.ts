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

/** Enrolment Activity dropdown — from Enrolment drop-down List sheet */
export const ENROLMENT_ACTIVITIES = [
  { code: "ENR-0001", value: "enrolment", label: "Enrolment" },
  { code: "ENR-0002", value: "nin_validation", label: "NIN Validation" },
  { code: "ENR-0003", value: "id_card_issuance", label: "ID Card Issuance" },
  { code: "ENR-0005", value: "validation_of_enrolees", label: "Validation of Enrolees" },
] as const;

export const ENROLMENT_CHANNELS = ["NHIA", "SSHIA"] as const;

export const ENROLMENT_TYPES = ["Renewal", "Non-renewal"] as const;

export const ENROLMENT_SSHIA_CHANNELS = [
  "BHCPF", "Formal Sector", "Informal Sector",
] as const;

export const ENROLMENT_PROGRAMS = [
  { code: "PRG-0001", label: "FSSHIP" },
  { code: "PRG-0002", label: "BHCPF" },
  { code: "PRG-0003", label: "OPS" },
  { code: "PRG-0004", label: "TISHIP" },
  { code: "PRG-0005", label: "GIFSHIP-G" },
  { code: "PRG-0006", label: "GIFSHIP-N", renewable: true },
  { code: "PRG-0007", label: "GIFSHIP-C", renewable: true },
  { code: "PRG-0008", label: "GIFSHIP-R", renewable: true },
  { code: "PRG-0009", label: "CBSHIP" },
  { code: "PRG-0010", label: "Equity Programs" },
] as const;

export const ENROLMENT_RENEWABLE_PROGRAM_LABELS = new Set(
  ENROLMENT_PROGRAMS.filter((p) => Boolean((p as { renewable?: boolean }).renewable)).map((p) => p.label),
);

/** Mode of registration (enrolment sub-category). */
export const ENROLMENT_MODES_OF_REGISTRATION = [
  "To be provided",
] as const;

export const ENROLMENT_BENEFICIARY_CATEGORIES = [
  "Principal", "Dependent", "Individual", "Family", "Group", "Constituency Project",
] as const;

export const ENROLMENT_FUNDING_OPTIONS = [
  "Zero-Cost (Statutory Mandate)",
  "Budgeted (Approved Release)",
] as const;

export const ENROLMENT_ACTIVITY_STATUSES = [
  "Completed", "In Progress", "Not Conducted", "Not Applicable", "Deferred", "Cancelled",
] as const;

export const ENROLMENT_BUDGETED = "Budgeted (Approved Release)";
