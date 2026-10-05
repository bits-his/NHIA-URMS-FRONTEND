import {
  STAKEHOLDER_ENGAGEMENT_CATEGORIES,
  STAKEHOLDER_FUNDING_OPTIONS,
  STAKEHOLDER_BUDGETED,
  STAKEHOLDER_PROGRAMS,
  STAKEHOLDER_CATEGORIES,
  STAKEHOLDER_TARGET_AUDIENCES,
  STAKEHOLDER_OUTCOME_CATEGORIES,
  STAKEHOLDER_SPECIFIC_OUTCOMES,
  STAKEHOLDER_EVIDENCE_TYPES,
  STAKEHOLDER_STATUSES,
  STAKEHOLDER_YES_NO,
} from "./stakeholderTypes";
import {
  PROVIDER_MANAGEMENT_ACTIVITIES,
  PROVIDER_FUNDING_OPTIONS,
  PROVIDER_BUDGETED,
  PROVIDER_PROGRAMS,
  PROVIDER_EVIDENCE_TYPES,
  PROVIDER_ACTIVITY_STATUSES,
  PROVIDER_METRICS_BY_ACTIVITY,
} from "./providerManagementTypes";
import type { StateOfficeReportType } from "./constants";
import type { PillarChild } from "./enrolmentPillarTypes";

export type ActivityTemplateVariant = "stakeholder" | "provider";

export type ActivityOption = { code: string; label: string };

export type ActivityReportTemplateConfig = {
  variant: ActivityTemplateVariant;
  pageTitle: string;
  activitiesTitle: string;
  activityFieldLabel: string;
  activityIdLabel: string;
  reportType: StateOfficeReportType;
  /** Stored on report header — separates menus sharing one API report type */
  activityModule: string;
  activities: readonly ActivityOption[];
  /** Limit dropdown to these activity labels (empty = all) */
  activityFilter?: string[];
  programs: readonly { code: string; label: string }[];
  fundingOptions: readonly string[];
  budgetedLabel: string;
  statuses: readonly string[];
  evidenceTypes: readonly string[];
  stakeholderCategories?: readonly string[];
  targetAudiences?: readonly string[];
  outcomeCategories?: readonly string[];
  specificOutcomes?: readonly string[];
  yesNo?: readonly string[];
  metricsByActivity?: Record<string, Partial<Record<string, string[]>>>;
  /** Provider: show planned/actual facilities instead of stakeholder counts */
  useFacilityCounts?: boolean;
};

const filterActivities = (all: readonly ActivityOption[], labels?: string[]) =>
  labels?.length ? all.filter((a) => labels.includes(a.label)) : [...all];

const STAKEHOLDER_MEETING_LABELS = [
  "SSHIA Technical Support",
  "Stakeholder Forum/Meeting",
  "BHCPF Gateway (SOC) Meeting",
  "Mediation Meetings",
  "Stakeholder Consultative Meeting",
  "Conflict Resolution/Reconciliation Meetings",
];

const STAKEHOLDER_FORUM_LABELS = [
  "Stakeholder Forum/Meeting",
  "Stakeholder Consultative Meeting",
  "Workshops/Seminar/Summit",
];

export function configForPillarChild(child: PillarChild): ActivityReportTemplateConfig | null {
  return ACTIVITY_TEMPLATE_BY_MODULE[child.key] ?? null;
}

const stakeholderBase = (overrides: Partial<ActivityReportTemplateConfig> & Pick<ActivityReportTemplateConfig, "activityModule" | "pageTitle">): ActivityReportTemplateConfig => ({
  variant: "stakeholder",
  activitiesTitle: "Activity entries",
  activityFieldLabel: "Engagement Category",
  activityIdLabel: "Stakeholder Engagement ID",
  reportType: "stakeholder",
  activities: STAKEHOLDER_ENGAGEMENT_CATEGORIES,
  programs: STAKEHOLDER_PROGRAMS,
  fundingOptions: STAKEHOLDER_FUNDING_OPTIONS,
  budgetedLabel: STAKEHOLDER_BUDGETED,
  statuses: STAKEHOLDER_STATUSES,
  evidenceTypes: STAKEHOLDER_EVIDENCE_TYPES,
  stakeholderCategories: STAKEHOLDER_CATEGORIES,
  targetAudiences: STAKEHOLDER_TARGET_AUDIENCES,
  outcomeCategories: STAKEHOLDER_OUTCOME_CATEGORIES,
  specificOutcomes: STAKEHOLDER_SPECIFIC_OUTCOMES,
  yesNo: STAKEHOLDER_YES_NO,
  ...overrides,
});

const providerBase = (overrides: Partial<ActivityReportTemplateConfig> & Pick<ActivityReportTemplateConfig, "activityModule" | "pageTitle">): ActivityReportTemplateConfig => ({
  variant: "provider",
  activitiesTitle: "Provider management activities",
  activityFieldLabel: "Provider Management Activity",
  activityIdLabel: "Provider Management ID",
  reportType: "accreditation",
  activities: PROVIDER_MANAGEMENT_ACTIVITIES,
  programs: PROVIDER_PROGRAMS,
  fundingOptions: PROVIDER_FUNDING_OPTIONS,
  budgetedLabel: PROVIDER_BUDGETED,
  statuses: PROVIDER_ACTIVITY_STATUSES,
  evidenceTypes: PROVIDER_EVIDENCE_TYPES,
  metricsByActivity: PROVIDER_METRICS_BY_ACTIVITY,
  useFacilityCounts: true,
  ...overrides,
});

/** One shared Excel template — each sidebar menu picks activities + API module. */
export const ACTIVITY_TEMPLATE_BY_MODULE: Record<string, ActivityReportTemplateConfig> = {
  "engagement-coordination": stakeholderBase({
    activityModule: "engagement-coordination",
    pageTitle: "Stakeholder Engagement",
    activitiesTitle: "Stakeholder Engagement Activities",
  }),
  "meetings-sshias": stakeholderBase({
    activityModule: "meetings-sshias",
    pageTitle: "Meetings with SSHIAS",
    activityFilter: STAKEHOLDER_MEETING_LABELS,
    activitiesTitle: "SSHIA meeting activities",
  }),
  "stakeholder-forum": stakeholderBase({
    activityModule: "stakeholder-forum",
    pageTitle: "Stakeholder Forum",
    activityFilter: STAKEHOLDER_FORUM_LABELS,
    activitiesTitle: "Forum activities",
  }),
  "stakeholder-others": stakeholderBase({
    activityModule: "stakeholder-others",
    pageTitle: "Other Stakeholder Activities",
    activityFilter: ["Ad-Hoc Activity", "Others (specify)"],
    activitiesTitle: "Other stakeholder activities",
  }),
  accreditation: providerBase({
    activityModule: "accreditation",
    pageTitle: "Accreditation",
    activityFilter: ["Accreditation"],
  }),
  reaccreditation: providerBase({
    activityModule: "reaccreditation",
    pageTitle: "Reaccreditation",
    activityFilter: ["Re-accreditation"],
  }),
  "medical-audits": providerBase({
    activityModule: "medical-audits",
    pageTitle: "Medical Audits",
    activityFilter: ["Medical Audit"],
  }),
  "qa-inspections": providerBase({
    activityModule: "qa-inspections",
    pageTitle: "Quality Assurance Inspections",
    activityFilter: ["Quality Assurance"],
  }),
};

export function resolvedActivities(cfg: ActivityReportTemplateConfig): ActivityOption[] {
  return filterActivities(cfg.activities, cfg.activityFilter);
}
