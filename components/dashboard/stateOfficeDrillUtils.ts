import type { DrillRow } from "./DashboardDrillPanel";
import type { StateOfficeReportType } from "@/src/components/stateOffice/constants";
import { enrolmentDriveReportType, type EnrolmentDriveKey } from "@/src/components/stateOffice/enrolmentDriveTypes";

const DRILL_KEY_TO_API: Record<string, StateOfficeReportType> = {
  weekly_actionable: "weekly-actionable",
  contracted_services: "contracted-services",
  enrollee_register: "enrollee-register",
  etmc_tmc_action_point: "etmc-tmc-action-point",
  enrolment: "enrolment",
  migration: "migration",
  cemonc: "cemonc",
  accreditation: "accreditation",
  stakeholder: "stakeholder",
  hmo_selection: "hmo-selection",
  extra_dependant: "extra-dependant",
  hcf_change: "hcf-change",
  challenges: "challenges",
  igr: "igr",
  sshia_financial: "sshia-financial",
  expenditure_profile: "expenditure-profile",
  complaints_report: "complaints",
};

export type ParsedDrillReport = {
  reportType: StateOfficeReportType;
  reportId: number;
};

export function parseDrillReportRecord(row: DrillRow): ParsedDrillReport | null {
  const meta = row.meta || "";
  const recordMatch = meta.match(/^record:([^:]+):(\d+)(?::(.+))?$/);
  if (recordMatch) {
    const [, drillKey, idStr, driveType] = recordMatch;
    const reportId = Number(idStr);
    if (!Number.isFinite(reportId)) return null;
    if (drillKey === "enrolment_drive" && driveType) {
      return { reportType: enrolmentDriveReportType(driveType as EnrolmentDriveKey), reportId };
    }
    const mapped = DRILL_KEY_TO_API[drillKey];
    if (mapped) return { reportType: mapped, reportId };
    return null;
  }

  if (row.reference && row.id != null) {
    const idStr = String(row.id);
    const dash = idStr.indexOf("-");
    if (dash > 0) {
      const drillKey = idStr.slice(0, dash);
      const reportId = Number(idStr.slice(dash + 1));
      if (Number.isFinite(reportId)) {
        const mapped = DRILL_KEY_TO_API[drillKey];
        if (mapped) return { reportType: mapped, reportId };
      }
    }
  }
  return null;
}

export function isDrillReportRecord(row: DrillRow): boolean {
  return !!parseDrillReportRecord(row);
}
