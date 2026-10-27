export const MONITORING_TYPES = [
  { value: "routine", label: "Routine" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "spot_check", label: "Spot Check" },
  { value: "special_investigation", label: "Special Investigation" },
];

export const FACILITY_TYPES = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
];

export const COMPLIANCE_LABELS: Record<string, string> = {
  fully_compliant: "Fully Compliant",
  substantially_compliant: "Substantially Compliant",
  partially_compliant: "Partially Compliant",
  non_compliant: "Non-Compliant",
};

export const COMPLAINT_CATEGORIES = [
  { value: "delay_in_service", label: "Delay in Service" },
  { value: "staff_attitude", label: "Staff Attitude" },
  { value: "claims_processing", label: "Claims Processing" },
  { value: "access_to_care", label: "Access to Care" },
  { value: "drug_availability", label: "Drug Availability" },
  { value: "others", label: "Others" },
];

export const SCORE_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

export const VISIT_STATUS = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  reviewed:  { label: "Reviewed",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  returned:  { label: "Returned",  cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

export const COMPLAINT_STATUS = [
  { value: "open",        label: "Open" },
  { value: "assigned",    label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "escalated",   label: "Escalated" },
  { value: "closed",      label: "Closed" },
];

export const PRIORITY_OPTIONS = [
  { value: "high",   label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low" },
];

export function pickLabel(
  options: { value: string; label: string }[],
  value: string,
  fallback: string,
): string {
  return options.find((o) => o.value === value)?.label ?? fallback;
}

export function pickStatusLabel(
  statusMap: Record<string, { label: string }>,
  value: string,
  fallback: string,
): string {
  return statusMap[value]?.label ?? fallback;
}

export function pickGeoLabel(
  options: { id?: number | string; code?: string; zonal_code?: string; description?: string; label?: string }[],
  value: string,
  fallback: string,
): string {
  const item = options.find((o) =>
    String(o.id ?? "") === value
    || String(o.code ?? "") === value
    || String(o.zonal_code ?? "") === value,
  );
  return item?.description ?? item?.label ?? fallback;
}

export function pickScoreLabel(value: string): string {
  if (!value) return "Score";
  const n = Number(value);
  return SCORE_LABELS[n] ? `${n} — ${SCORE_LABELS[n]}` : value;
}

export function computeLiveScore(scores: Record<number, number>) {
  const vals = Object.values(scores).filter((s) => s >= 1 && s <= 5);
  if (!vals.length) return { total: 0, percentage: 0, rating: null, label: null };
  const total = vals.reduce((a, b) => a + b, 0);
  const pct = Math.round((total / (vals.length * 5)) * 1000) / 10;
  let rating = "non_compliant";
  if (pct >= 85) rating = "fully_compliant";
  else if (pct >= 70) rating = "substantially_compliant";
  else if (pct >= 50) rating = "partially_compliant";
  return { total, percentage: pct, rating, label: COMPLIANCE_LABELS[rating] };
}
