/** Strip to a raw numeric string (optional single decimal). */
export function parseNumericInput(raw: string, allowDecimal = false): string {
  const cleaned = String(raw ?? "").replace(/,/g, "");
  if (!cleaned) return "";
  if (!allowDecimal) {
    const digits = cleaned.replace(/[^\d]/g, "");
    return digits.replace(/^0+(?=\d)/, "") || (digits ? "0" : "");
  }
  let out = "";
  let seenDot = false;
  for (const ch of cleaned) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !seenDot) {
      out += ".";
      seenDot = true;
    }
  }
  if (out.startsWith(".")) out = `0${out}`;
  return out;
}

/** Display with thousand separators; keeps trailing decimal while typing. */
export function formatNumericDisplay(raw: string | number | null | undefined, allowDecimal = false): string {
  const str = String(raw ?? "");
  if (!str) return "";
  const parsed = parseNumericInput(str, allowDecimal);
  if (!parsed || parsed === ".") return allowDecimal && str.replace(/,/g, "").includes(".") ? "0." : "";
  if (!allowDecimal) {
    return Number(parsed).toLocaleString("en-NG");
  }
  const endsWithDot = parsed.endsWith(".");
  const [intPart, decPart] = parsed.replace(/\.$/, "").split(".");
  const intFormatted = Number(intPart || "0").toLocaleString("en-NG");
  if (endsWithDot && decPart === undefined) return `${intFormatted}.`;
  if (decPart !== undefined) return `${intFormatted}.${decPart}`;
  return intFormatted;
}

/**
 * Format all numeric value fields with thousand separators.
 * Skip only reporting-year fields (max 2100, or min/max in 1900–2200).
 */
export function shouldFormatThousands(max?: string | number, min?: string | number): boolean {
  const mx = max === undefined || max === null || max === "" ? NaN : Number(max);
  const mn = min === undefined || min === null || min === "" ? NaN : Number(min);
  if (Number.isFinite(mx) && mx === 2100) return false;
  if (Number.isFinite(mn) && Number.isFinite(mx) && mn >= 1900 && mx <= 2200) return false;
  return true;
}

export function isNumericValueInput(type?: string, inputMode?: string): boolean {
  if (type === "number") return true;
  return inputMode === "numeric" || inputMode === "decimal";
}

/** @deprecated use allowsDecimal */
export function allowsDecimalStep(step?: string | number): boolean {
  return allowsDecimal(undefined, step);
}

export function allowsDecimal(inputMode?: string, step?: string | number): boolean {
  if (inputMode === "decimal") return true;
  if (step === "any") return true;
  const s = step === undefined || step === null ? NaN : Number(step);
  return Number.isFinite(s) && s > 0 && s < 1;
}
