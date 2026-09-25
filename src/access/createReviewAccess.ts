import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

export type CreateReviewAccess = {
  canCreate: boolean;
  canReview: boolean;
  /** Create on, review off → land on create form, no list */
  createOnly: boolean;
  /** Review on, create off → list/view only, no create actions */
  reviewOnly: boolean;
};

/**
 * Privileges (Admin → Privileges) control which pages appear.
 * Role flags (Admin → Roles: Can create / Can review) control UX:
 *   - create-only → form first
 *   - review-only → list only, no create
 * Anyone with page access may submit forms unless they are review-only.
 */
export function getCreateReviewAccess(role: string, user?: {
  role_config?: {
    can_create_monthly?: boolean;
    can_review_monthly?: boolean;
  };
} | null): CreateReviewAccess {
  const flaggedCreate = user?.role_config?.can_create_monthly
    ?? ["state-officer", "state-coordinator", "department-officer", "zonal-officer", "reporting-officer", "admin"].includes(role);

  const flaggedReview = user?.role_config?.can_review_monthly
    ?? ["state-coordinator", "zonal-coordinator", "sdo", "admin"].includes(role);

  const canReview = !!flaggedReview;
  // Match backend canSubmitForms: allow create unless review-only
  const canCreate = !!flaggedCreate || !canReview;

  return {
    canCreate,
    canReview,
    createOnly: canCreate && !canReview,
    reviewOnly: canReview && !flaggedCreate,
  };
}

export function useCreateReviewAccess(): CreateReviewAccess {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = user?.role ?? "";
  return getCreateReviewAccess(role, user);
}
