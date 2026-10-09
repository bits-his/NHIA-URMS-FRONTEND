/** NHIA Enforcement — Weekly Compliance Reporting Template (compliance officers at HCFs). */

export type WeeklyAnswer = "yes" | "no";
export type WeeklyIndicatorValue = { answer?: WeeklyAnswer | ""; remarks?: string };
export type WeeklyIndicators = Record<string, WeeklyIndicatorValue>;

export type WeeklyIndicator = {
  key: string;
  label: string;
  /** "Yes" means non-compliance (e.g. illegal co-payments demanded). */
  yesIsBreach?: boolean;
};

export type WeeklySection = {
  key: string;
  title: string;
  remarksLabel: string;
  indicators: WeeklyIndicator[];
};

export const WEEKLY_COMPLIANCE_SECTIONS: WeeklySection[] = [
  {
    key: "service_delivery",
    title: "Section B: Service Delivery Compliance",
    remarksLabel: "Remarks / Evidence",
    indicators: [
      { key: "services_without_denial", label: "Enrolees received services without denial or delays" },
      { key: "illegal_copayments", label: "Demand for illegal co-payments or out-of-pocket payments for covered services", yesIsBreach: true },
      { key: "benefit_package_adhered", label: "Approved benefit package adhered to" },
      { key: "emergency_without_authorization", label: "Emergency care provided without prior authorization" },
      { key: "referral_protocols_followed", label: "Referral protocols properly followed" },
    ],
  },
  {
    key: "medicines",
    title: "Section C: Medicines & Consumables Compliance",
    remarksLabel: "Remarks / Evidence",
    indicators: [
      { key: "prescribed_medicines_available", label: "Availability of prescribed medicines" },
      { key: "nhia_medicines_list_used", label: "Use of NHIA-approved medicines list" },
      { key: "stockout_alternative", label: "Alternative arrangement during stock-outs" },
    ],
  },
  {
    key: "provider_hmo",
    title: "Section D: Provider – HMO Interface",
    remarksLabel: "Remarks",
    indicators: [
      { key: "timely_claims_submission", label: "Timely submission of claims" },
      { key: "prompt_payment_receipt", label: "Prompt receipt of payments" },
      { key: "hmo_disputes", label: "Disputes with HMOs during the week", yesIsBreach: true },
    ],
  },
];

export const WEEKLY_FACILITY_TYPES = ["Public", "Private", "Faith-Based", "Other"] as const;

const ALL_INDICATORS = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators);

/** Share of answered indicators that are compliant, or null if none answered. */
export function weeklyComplianceScore(values: WeeklyIndicators | null | undefined) {
  let answered = 0;
  let compliant = 0;
  for (const ind of ALL_INDICATORS) {
    const a = values?.[ind.key]?.answer;
    if (a !== "yes" && a !== "no") continue;
    answered += 1;
    if ((a === "yes") !== !!ind.yesIsBreach) compliant += 1;
  }
  return answered ? { answered, compliant, total: ALL_INDICATORS.length, pct: Math.round((compliant / answered) * 100) } : null;
}

export function weeklyBreaches(values: WeeklyIndicators | null | undefined) {
  return ALL_INDICATORS.filter((ind) => {
    const a = values?.[ind.key]?.answer;
    return a === (ind.yesIsBreach ? "yes" : "no");
  });
}

/** Current ISO week as "YYYY-Www" (matches <input type="week">). */
export function currentIsoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** "2026-W41" → "Week 41, 2026 (05 Oct – 11 Oct)" */
export function formatIsoWeek(week: string | null | undefined) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(week || ""));
  if (!m) return week || "—";
  const year = Number(m[1]);
  const wk = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (wk - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("en-NG", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `Week ${wk}, ${year} (${fmt(monday)} – ${fmt(sunday)})`;
}
