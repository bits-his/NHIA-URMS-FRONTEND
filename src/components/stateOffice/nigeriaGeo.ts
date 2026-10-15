import nigeriaStatesLgas from "./nigeriaStatesLgas.json";

const LGAS_BY_STATE = nigeriaStatesLgas as Record<string, string[]>;

export const NIGERIAN_STATE_NAMES = Object.keys(LGAS_BY_STATE).sort((a, b) =>
  a.localeCompare(b),
);

export function lgasForState(stateName: string | null | undefined): string[] {
  const key = String(stateName ?? "").trim();
  if (!key) return [];
  if (LGAS_BY_STATE[key]) return LGAS_BY_STATE[key];
  const match = Object.keys(LGAS_BY_STATE).find(
    (s) => s.toLowerCase() === key.toLowerCase(),
  );
  return match ? LGAS_BY_STATE[match] : [];
}
