export const FACILITY_TYPES = [
  { value: "primary_only", label: "Primary accreditation only" },
  { value: "secondary_only", label: "Secondary accreditation only" },
  { value: "primary_and_secondary", label: "Primary and Secondary accreditation" },
] as const;

export const OBSERVATION_ITEMS = [
  {
    key: "registration_time",
    label: "Patient registered and details verified within 15 minutes",
    options: [
      { value: "0", label: "Manual check used", score: 0 },
      { value: "1", label: "More than 15mins", score: 1 },
      { value: "2", label: "Less than 15mins", score: 2 },
    ],
  },
  {
    key: "waiting_time",
    label: "Patient seen within 30 minutes to 1hr",
    options: [
      { value: "0", label: "More than 2hrs", score: 0 },
      { value: "1", label: "1hr–2hrs", score: 1 },
      { value: "2", label: "30mins–1hr", score: 2 },
    ],
  },
  {
    key: "hmo_no_response",
    label: "Proceed to deliver service if HMO does not respond after 1hr",
    options: [
      { value: "0", label: "Nil awareness of directive", score: 0 },
      { value: "1", label: "Poor/Partial compliance", score: 1 },
      { value: "2", label: "Full compliance", score: 2 },
    ],
  },
  {
    key: "nhia_drugs",
    label: "NHIA-covered drugs dispensed",
    options: [
      { value: "0", label: "No drugs dispensed", score: 0 },
      { value: "1", label: "Some drugs dispensed", score: 1 },
      { value: "2", label: "All drugs dispensed", score: 2 },
    ],
  },
  {
    key: "out_of_stock_alt",
    label: "Alternative arrangement when medicines out-of-stock?",
    options: [
      { value: "0", label: "No", score: 0 },
      { value: "2", label: "Yes", score: 2 },
    ],
  },
  {
    key: "no_oop",
    label: "No out-of-pocket payment for covered medicines/services",
    options: [
      { value: "0", label: "OOP for all services", score: 0 },
      { value: "1", label: "Some OOP", score: 1 },
      { value: "2", label: "No OOP", score: 2 },
    ],
  },
  {
    key: "tariff_conform",
    label: "Costing conforms with NHIA tariff?",
    options: [
      { value: "0", label: "No", score: 0 },
      { value: "2", label: "Yes", score: 2 },
    ],
  },
  {
    key: "communication",
    label: "Respectful, attentive, empathetic communication",
    options: [
      { value: "0", label: "Not satisfactory", score: 0 },
      { value: "1", label: "Partial", score: 1 },
      { value: "2", label: "Satisfactory", score: 2 },
    ],
  },
  {
    key: "nhia_knowledge",
    label: "Knowledge of basic NHIA processes",
    options: [
      { value: "0", label: "Not satisfactory", score: 0 },
      { value: "1", label: "Partial", score: 1 },
      { value: "2", label: "Satisfactory", score: 2 },
    ],
  },
  {
    key: "complaint_process",
    label: "Clear, accessible complaint process",
    options: [
      { value: "0", label: "No formal process", score: 0 },
      { value: "1", label: "Partial process", score: 1 },
      { value: "2", label: "Visible formal process", score: 2 },
    ],
  },
] as const;

export const ENROLLEE_ITEMS = [
  { key: "registration", label: "Registration/Verification Process" },
  { key: "waiting", label: "Waiting Time" },
  { key: "staff_courtesy", label: "Staff Courtesy/Behaviour" },
  { key: "doctor_interaction", label: "Doctor–Patient Interaction/Adequacy of Treatment" },
  { key: "nhia_drugs", label: "Availability of NHIA-Covered Drugs" },
  { key: "oop_other", label: "OOP payments other than eligible payments" },
  { key: "discrimination", label: "Perceived discrimination against NHIA enrollees" },
  { key: "referral", label: "Referral process" },
  { key: "communication", label: "Provider–enrollee communication (deficient/wrong info)" },
  { key: "complaint_resolution", label: "Complaint Resolution Process" },
] as const;

export const ENROLLEE_SCALE = [
  { value: "0", label: "Poor", score: 0 },
  { value: "1", label: "Good", score: 1 },
  { value: "2", label: "Excellent", score: 2 },
] as const;

export const STEPS = [
  "General Information",
  "Observations",
  "Enrollee Experience 1",
  "Enrollee Experience 2",
  "Enrollee Experience 3",
  "Remarks",
] as const;

export const OBS_MAX = OBSERVATION_ITEMS.reduce((sum, item) => (
  sum + Math.max(...item.options.map((o) => o.score))
), 0);

export const ENROLLEE_MAX = ENROLLEE_ITEMS.length * 2;

export type ScoreMap = Record<string, string>;

export function sumScoreMap(map: ScoreMap | Record<string, unknown> | null | undefined) {
  if (!map) return 0;
  return Object.values(map).reduce((sum, v) => {
    const n = Number(v);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function mapHcfFacilityType(rawType?: string | null, service?: string | null) {
  const blob = `${rawType || ""} ${service || ""}`.toLowerCase();
  const hasPrimary = /\bprimary\b|\bphc\b/.test(blob);
  const hasSecondary = /\bsecondary\b|\btertiary\b/.test(blob);
  if (hasPrimary && hasSecondary) return "primary_and_secondary";
  if (hasSecondary) return "secondary_only";
  if (hasPrimary) return "primary_only";
  return "";
}

export function labelOf(opts: readonly { value: string; label: string }[], value?: string | null) {
  if (!value) return "—";
  return opts.find((o) => o.value === value)?.label ?? value;
}

export function optionLabel(
  items: readonly { key: string; options: readonly { value: string; label: string }[] }[],
  key: string,
  value?: string | null,
) {
  if (value === undefined || value === null || value === "") return "—";
  const item = items.find((i) => i.key === key);
  return item?.options.find((o) => o.value === String(value))?.label ?? String(value);
}
