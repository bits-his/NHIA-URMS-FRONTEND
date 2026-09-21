import { getCreateReviewAccess } from "./createReviewAccess";

export function getMonthlyReportContext(role: string, user?: {
  state_id?: number;
  zone_id?: number;
  role_config?: {
    report_scope?: string;
    can_create_monthly?: boolean;
    can_review_monthly?: boolean;
  };
} | null) {
  const stateScoped = user?.role_config?.report_scope === "state"
    || (!user?.role_config && ["state-officer", "state-coordinator", "department-officer"].includes(role));

  const access = getCreateReviewAccess(role, user);

  return {
    defaultStateId: stateScoped && user?.state_id ? String(user.state_id) : null,
    defaultZoneId: user?.zone_id ? String(user.zone_id) : null,
    canCreateMonthly: access.canCreate,
    canReviewMonthly: access.canReview,
    createOnly: access.createOnly,
    reviewOnly: access.reviewOnly,
  };
}
