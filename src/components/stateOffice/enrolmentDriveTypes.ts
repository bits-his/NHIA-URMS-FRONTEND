/**
 * Enrolment Drives (Monitoring Pillar 3): one sidebar item, privilege, list and form per activity.
 * Keep keys/titles in sync with NHIA-URMS-BACKEND/src/utils/enrolmentDriveTypes.js
 */

export type EnrolmentDriveCategory = { code: string; label: string };

/** Enrolment Drive IDs from the "Enrolment Drive drop-down List" sheet */
export const ENROLMENT_DRIVE_ACTIVITIES: EnrolmentDriveCategory[] = [
  { code: "E-001", label: "Sensitization" },
  { code: "E-002", label: "Media Parley/Campaign" },
  { code: "E-003", label: "Advocacy" },
  { code: "E-004", label: "Informal Sector Mobilization" },
  { code: "E-005", label: "Enrolment Campaigns" },
  { code: "E-006", label: "Market Association Outreach" },
  { code: "E-007", label: "Religious Organisation Outreach" },
  { code: "E-008", label: "Courtesy Visit" },
  { code: "E-009", label: "NYSC Sensitization" },
  { code: "E-010", label: "Community Outreach" },
  { code: "E-011", label: "Door-to-Door Campaign" },
  { code: "E-012", label: "Workplace Outreach" },
  { code: "E-013", label: "Provider-based Enrolment" },
  { code: "E-014", label: "Others (Specify)" },
];

const act = (...codes: string[]) =>
  codes.map((c) => ENROLMENT_DRIVE_ACTIVITIES.find((a) => a.code === c)!);
const OTHERS = "E-014";

export const ENROLMENT_DRIVE_TYPES = [
  { key: "advocacy", title: "Advocacy / Courtesy Visits", navLabel: "Advocacy / Courtesy Visits",
    categories: act("E-003", "E-008", OTHERS) },
  { key: "community-sensitization", title: "Community Sensitization", navLabel: "Community Sensitization",
    categories: act("E-001", "E-009", "E-010", "E-011", OTHERS) },
  { key: "informal-sector", title: "Informal Sector Mobilization", navLabel: "Informal Sector Mobilization",
    categories: act("E-004", OTHERS) },
  { key: "enrolment-campaigns", title: "Enrolment Campaigns", navLabel: "Enrolment Campaigns",
    categories: act("E-005", "E-013", OTHERS) },
  { key: "market-religious", title: "Market / Religious Organisation Outreach", navLabel: "Market / Religious Outreach",
    categories: act("E-006", "E-007", OTHERS) },
  { key: "mda-engagement", title: "MDAs / OPS / SPAs Engagement", navLabel: "MDAs / OPS / SPAs Engagement",
    categories: [
      { code: OTHERS, label: "MDA Engagement" },
      { code: OTHERS, label: "OPS Engagement" },
      { code: OTHERS, label: "SPA Engagement" },
      ...act("E-012", OTHERS),
    ] },
  { key: "capacity-building", title: "Capacity Building", navLabel: "Capacity Building",
    categories: [{ code: OTHERS, label: "Capacity Building" }, ...act(OTHERS)] },
  { key: "media-parley", title: "Media Parley / Campaigns", navLabel: "Media Parley / Campaigns",
    categories: act("E-002", OTHERS) },
] as const satisfies readonly { key: string; title: string; navLabel: string; categories: EnrolmentDriveCategory[] }[];

export type EnrolmentDriveKey = (typeof ENROLMENT_DRIVE_TYPES)[number]["key"];
export type EnrolmentDriveReportType = `enrolment-drive-${EnrolmentDriveKey}`;

export const enrolmentDriveReportType = (key: EnrolmentDriveKey): EnrolmentDriveReportType => `enrolment-drive-${key}`;
export const enrolmentDriveView = (key: EnrolmentDriveKey) => `state-enrolment-drive-${key}`;
export const enrolmentDrivePath = (key: EnrolmentDriveKey) => `/zonal/enrolment-drives/${key}`;

export const ENROLMENT_DRIVE_REPORT_TYPES = ENROLMENT_DRIVE_TYPES.map((t) => enrolmentDriveReportType(t.key));

export function isEnrolmentDriveType(reportType: string): reportType is EnrolmentDriveReportType {
  return (ENROLMENT_DRIVE_REPORT_TYPES as string[]).includes(reportType);
}

export function enrolmentDriveConfig(reportType: string) {
  return ENROLMENT_DRIVE_TYPES.find((t) => enrolmentDriveReportType(t.key) === reportType);
}
