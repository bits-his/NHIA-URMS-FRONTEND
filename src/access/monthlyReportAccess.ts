import { getCreateReviewAccess } from "./createReviewAccess";

const NATIONAL_ROLES = new Set(["admin", "sdo", "hq-department", "dg-ceo"]);
const ZONAL_ROLES = new Set(["zonal-coordinator", "zonal-officer"]);
const STATE_ROLES = new Set(["state-officer", "state-coordinator", "department-officer"]);

function resolveReportScope(
  role: string,
  roleConfig?: { report_scope?: string } | null,
): "national" | "zonal" | "state" | "none" {
  const fromDb = roleConfig?.report_scope;
  if (fromDb === "national" || fromDb === "zonal" || fromDb === "state" || fromDb === "none") {
    return fromDb;
  }
  if (NATIONAL_ROLES.has(role)) return "national";
  if (ZONAL_ROLES.has(role)) return "zonal";
  if (STATE_ROLES.has(role)) return "state";
  return "none";
}

export function getMonthlyReportContext(role: string, user?: {
  state_id?: number;
  zone_id?: number;
  role_config?: {
    report_scope?: string;
    can_create_monthly?: boolean;
    can_review_monthly?: boolean;
  };
} | null) {
  const reportScope = resolveReportScope(role, user?.role_config);
  const stateScoped = reportScope === "state";
  /** Zone default only for state/zonal roles — never for SDO/national (even if user.zone_id is set). */
  const zoneScoped = reportScope === "state" || reportScope === "zonal";

  const access = getCreateReviewAccess(role, user);

  return {
    reportScope,
    defaultStateId: stateScoped && user?.state_id ? String(user.state_id) : null,
    defaultZoneId: zoneScoped && user?.zone_id ? String(user.zone_id) : null,
    canCreateMonthly: access.canCreate,
    canReviewMonthly: access.canReview,
    createOnly: access.createOnly,
    reviewOnly: access.reviewOnly,
  };
}
