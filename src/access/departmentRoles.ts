export function isDeptReportingOfficer(role: string) {
  return role.endsWith("-reporting-officer");
}

export function isDeptStateCoordinator(role: string) {
  return role === "state-coordinator" || role.endsWith("-state-coordinator");
}

function normalizeRoleKey(role: string) {
  return String(role || "").trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

export function isDeptZonalCoordinator(role: string) {
  const r = normalizeRoleKey(role);
  // "zc" is the short system key used for the generic "Zonal Coordinator" role
  return r === "zonal-coordinator" || r === "zc" || r.endsWith("-zonal-coordinator");
}

export function isDeptComplaintOfficer(role: string) {
  const r = normalizeRoleKey(role);
  return r === "complaint-officer"
    || r.endsWith("-complaint-officer")
    || r.includes("complaint-officer");
}

export function reviewChainFromConfig(
  role: string,
  roleConfig?: { report_scope?: string; can_create_monthly?: boolean; can_review_monthly?: boolean } | null,
): "state-coordinator" | "zonal-coordinator" | "sdo" | null {
  if (role === "sdo") return "sdo";
  if (isDeptStateCoordinator(role)) return "state-coordinator";
  if (isDeptZonalCoordinator(role)) return "zonal-coordinator";
  if (!roleConfig?.can_review_monthly) return null;
  if (roleConfig.report_scope === "state") return "state-coordinator";
  if (roleConfig.report_scope === "zonal") return "zonal-coordinator";
  if (roleConfig.report_scope === "national" && !roleConfig.can_create_monthly) return "sdo";
  return null;
}
