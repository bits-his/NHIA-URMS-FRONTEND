import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { ENROLLEE_REGISTER_SCHEMES, formatCount } from "./constants";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

function n(v: string) {
  const parsed = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function EnrolleeRegisterForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [counts, setCounts] = React.useState<Record<string, string>>(
    Object.fromEntries(ENROLLEE_REGISTER_SCHEMES.map((s) => [s.key, ""])),
  );

  const totalLives = React.useMemo(
    () => ENROLLEE_REGISTER_SCHEMES.reduce((sum, s) => sum + n(counts[s.key]), 0),
    [counts],
  );

  const loadData = (v: any) => {
    setCounts(Object.fromEntries(
      ENROLLEE_REGISTER_SCHEMES.map((s) => [s.key, v[s.key] != null ? String(v[s.key]) : ""]),
    ));
  };

  return (
    <StateOfficeFormShell
      reportType="enrollee-register"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      showGeoIds
      onLoaded={loadData}
      validate={() => (totalLives <= 0 ? "Enter at least one scheme count" : null)}
      buildPayload={(base) => ({
        ...base,
        ...Object.fromEntries(ENROLLEE_REGISTER_SCHEMES.map((s) => [s.key, n(counts[s.key])])),
        total_lives: totalLives,
      })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-[#145c3f]">Enrollee lives by scheme</CardTitle>
            <CardDescription className="text-xs">
              ICT monthly register — enter lives for each scheme. Total lives updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ENROLLEE_REGISTER_SCHEMES.map((scheme) => (
                <div key={scheme.key} className="space-y-1.5 rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {scheme.label}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 text-lg font-semibold tabular-nums bg-white"
                    placeholder="0"
                    value={counts[scheme.key]}
                    onChange={(e) => setCounts((prev) => ({ ...prev, [scheme.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#145c3f] px-5 py-4 text-white">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Total Lives</p>
                <p className="text-sm text-white/80">Self-Paying + OPS + Retirees + Constituency + GIFSHIP + Formal Sector</p>
              </div>
              <p className="text-3xl font-black tabular-nums">{formatCount(totalLives)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
