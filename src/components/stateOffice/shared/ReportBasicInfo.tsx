import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, monthLabel, labelOf, quarterFromMonth } from "../constants";

export const WEEKS_OF_MONTH = [
  { value: "1", label: "Week 1  (1st – 7th)" },
  { value: "2", label: "Week 2  (8th – 14th)" },
  { value: "3", label: "Week 3  (15th – 21st)" },
  { value: "4", label: "Week 4  (22nd – 31st)" },
];

const YEARS = Array.from({ length: 8 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

interface Props {
  zones: { id: number | string; label: string }[];
  states: { id: number | string; label: string }[];
  zoneId: string; setZoneId: (v: string) => void;
  stateId: string; setStateId: (v: string) => void;
  reportYear: string; setReportYear: (v: string) => void;
  reportMonth: string; setReportMonth: (v: string) => void;
  submitDate: string; setSubmitDate: (v: string) => void;
  lockZone?: boolean;
  lockState?: boolean;
  reportWeek?: string;
  setReportWeek?: (v: string) => void;
  showGeoIds?: boolean;
  /** Zone · State · Year · Month · Quarter (hides submission date) */
  showQuarter?: boolean;
  /** Hide Quarter when showQuarter is true */
  hideQuarter?: boolean;
  /** With showQuarter: only Zone · State · Year (for year matrices like Expenditure). */
  yearOnly?: boolean;
  /** Render fields without an outer card (for embedding in a parent card) */
  embedded?: boolean;
  /** Tighter labels and gaps for compact forms. */
  dense?: boolean;
  /** Override label for the header submission date field. */
  submitDateLabel?: string;
}

export default function ReportBasicInfo({
  zones, states, zoneId, setZoneId, stateId, setStateId,
  reportYear, setReportYear, reportMonth, setReportMonth, submitDate, setSubmitDate,
  lockZone, lockState,
  reportWeek, setReportWeek,
  showGeoIds,
  showQuarter,
  hideQuarter,
  yearOnly,
  embedded,
  dense = false,
  submitDateLabel = "Date of Submission",
}: Props) {
  const zoneLabel  = labelOf(zones.map(z => ({ value: String(z.id), label: z.label })), zoneId, "—");
  const stateLabel = labelOf(states.map(s => ({ value: String(s.id), label: s.label })), stateId, "—");
  const showWeek = reportWeek !== undefined && setReportWeek !== undefined;
  const weekLabel = WEEKS_OF_MONTH.find(w => w.value === reportWeek)?.label ?? "Select Week";
  const quarter = String(quarterFromMonth(reportMonth || 1));
  const stack = dense ? "space-y-1" : "space-y-1.5";
  const labelCls = "text-xs font-semibold text-slate-700";
  const trigger = (extra = "") => `w-full h-10 text-sm font-medium rounded-sm bg-[#f4f7f5] border-2 border-[#1a7a52] hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white ${dense ? "h-8 text-xs" : ""} ${extra}`.trim();

  const authUser = useSelector((s: RootState) => s.auth.user);
  const userRole = (authUser?.role || "").toLowerCase();
  const isAdmin = ["admin", "sdo", "dg-ceo", "hq-department"].includes(userRole) || authUser?.role_config?.report_scope === "national";
  const showGeo = isAdmin;
  const canSelectGeo = isAdmin && !lockZone && !lockState;

  const displayZone = zoneLabel !== "—" ? zoneLabel : (authUser?.zone?.description || authUser?.zonal_code || "—");
  const displayState = stateLabel !== "—" ? stateLabel : (authUser?.state?.description || authUser?.state_code || "—");

  const gridCols = showGeo
    ? (showWeek ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" : (showQuarter && !hideQuarter ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-4"))
    : (showWeek ? "grid-cols-2 md:grid-cols-3" : (showQuarter && !hideQuarter ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-2"));

  const fields = (
        <div className={`grid ${gridCols} ${dense ? "gap-1.5" : "gap-3"}`}>
          {showGeo && (
            <>
              <div className={stack}>
                <Label className={labelCls}>Zone <span className="text-red-500">*</span></Label>
                {canSelectGeo ? (
                  <Select value={zoneId} onValueChange={setZoneId} disabled={lockZone}>
                    <SelectTrigger className={trigger(lockZone ? "opacity-70 bg-slate-50" : "")} displayValue={zoneLabel}>
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    readOnly
                    value={displayZone}
                    className={trigger("opacity-90 bg-slate-100 font-medium cursor-not-allowed")}
                  />
                )}
                {showGeoIds && (
                  <p className="text-[11px] text-slate-500">Zone ID: <span className="font-semibold tabular-nums text-slate-700">{zoneId || "—"}</span></p>
                )}
              </div>
              <div className={stack}>
                <Label className={labelCls}>State <span className="text-red-500">*</span></Label>
                {canSelectGeo ? (
                  <Select value={stateId} onValueChange={setStateId} disabled={lockState || !zoneId}>
                    <SelectTrigger className={trigger(lockState ? "opacity-70 bg-slate-50" : "")} displayValue={stateLabel}>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    readOnly
                    value={displayState}
                    className={trigger("opacity-90 bg-slate-100 font-medium cursor-not-allowed")}
                  />
                )}
                {showGeoIds && (
                  <p className="text-[11px] text-slate-500">State ID: <span className="font-semibold tabular-nums text-slate-700">{stateId || "—"}</span></p>
                )}
              </div>
            </>
          )}

          {showQuarter ? (
            <>
              <div className={stack}>
                <Label className={labelCls}>Year <span className="text-red-500">*</span></Label>
                <Select value={reportYear} onValueChange={setReportYear}>
                  <SelectTrigger className={trigger()} displayValue={reportYear || "Select Year"}>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!yearOnly && (
                <>
                  <div className={stack}>
                    <Label className={labelCls}>Month <span className="text-red-500">*</span></Label>
                    <Select value={reportMonth} onValueChange={setReportMonth}>
                      <SelectTrigger className={trigger()} displayValue={monthLabel(reportMonth)}>
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {!hideQuarter && (
                    <div className={stack}>
                      <Label className={labelCls}>Quarter</Label>
                      <Input
                        readOnly
                        value={reportMonth ? `Q${quarter}` : "—"}
                        className={`${dense ? "h-8 text-xs" : "h-10 text-sm"} opacity-70 bg-slate-50 rounded-sm`}
                        tabIndex={-1}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className={stack}>
                <Label className={labelCls}>{submitDateLabel}</Label>
                <Input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} />
              </div>
              <div className={stack}>
                <Label className={labelCls}>Reporting Month <span className="text-red-500">*</span></Label>
                <Select value={reportMonth} onValueChange={setReportMonth}>
                  <SelectTrigger className={trigger()} displayValue={monthLabel(reportMonth)}>
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {showWeek && (
                <div className={stack}>
                  <Label className={labelCls}>Reporting Week <span className="text-red-500">*</span></Label>
                  <Select value={reportWeek} onValueChange={setReportWeek}>
                    <SelectTrigger className={trigger()} displayValue={weekLabel}>
                      <SelectValue placeholder="Select Week" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKS_OF_MONTH.map(w => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={stack}>
                <Label className={labelCls}>Reporting Year <span className="text-red-500">*</span></Label>
                <Input type="number" min="2000" max="2100" value={reportYear} onChange={e => setReportYear(e.target.value)} />
              </div>
            </>
          )}
        </div>
  );

  if (embedded) return fields;

  return (
    <Card className="rounded-sm border-[#d4e8dc]">
      <CardContent className="p-3 md:p-4">
        {fields}
      </CardContent>
    </Card>
  );
}
