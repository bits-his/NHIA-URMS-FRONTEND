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

/** Role flags from Admin → Roles (can_create_monthly / can_review_monthly). */
export function getCreateReviewAccess(role: string, user?: {
  role_config?: {
    can_create_monthly?: boolean;
    can_review_monthly?: boolean;
  };
} | null): CreateReviewAccess {
  const canCreate = user?.role_config?.can_create_monthly
    ?? ["state-officer", "state-coordinator", "department-officer", "zonal-officer", "admin"].includes(role);

  const canReview = user?.role_config?.can_review_monthly
    ?? ["state-coordinator", "zonal-coordinator", "sdo", "admin"].includes(role);

  return {
    canCreate: !!canCreate,
    canReview: !!canReview,
    createOnly: !!canCreate && !canReview,
    reviewOnly: !!canReview && !canCreate,
  };
}

export function useCreateReviewAccess(): CreateReviewAccess {
  const user = useSelector((s: RootState) => s.auth.user);
  const role = user?.role ?? "";
  return getCreateReviewAccess(role, user);
}
