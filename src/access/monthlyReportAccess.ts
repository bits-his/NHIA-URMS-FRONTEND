import { getCreateReviewAccess } from "./createReviewAccess";
import { isDeptZonalCoordinator } from "./departmentRoles";

const NATIONAL_ROLES = new Set(["admin", "sdo", "hq-department", "dg-ceo"]);
const ZONAL_ROLES = new Set(["zonal-coordinator", "zonal-officer", "zc"]);
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
  if (ZONAL_ROLES.has(role) || isDeptZonalCoordinator(role)) return "zonal";
  if (STATE_ROLES.has(role)) return "state";
  return "none";
}

export function getMonthlyReportContext(role: string, user?: {
  state_id?: number | string;
  zone_id?: number | string;
  state_code?: string;
  zonal_code?: string;
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
  const stateKey = user?.state_code || user?.state_id;
  const zoneKey = user?.zonal_code || user?.zone_id;

  return {
    reportScope,
    defaultStateId: stateScoped && stateKey ? String(stateKey) : null,
    defaultZoneId: zoneScoped && zoneKey ? String(zoneKey) : null,
    canCreateMonthly: access.canCreate,
    canReviewMonthly: access.canReview,
    createOnly: access.createOnly,
    reviewOnly: access.reviewOnly,
  };
}
