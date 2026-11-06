import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashKpi } from "@/components/dashboard/dashboardUi";
import { stateOfficeApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";

type DashView = "state" | "zonal" | "national";

interface BarRow { label: string; value: number }
interface ComplianceRow {
  code: string;
  office: string;
  zone?: string;
  status: string;
  reporting: string;
  submitted: string;
  due: string;
  completeness: number | null;
  enrolled: number;
  previous: number;
  current: number;
  change: number;
  change_pct: number | null;
  id_card_ratio: number | null;
  flag: string;
  renewal_overdue_pct: number | null;
}
interface DashboardData {
  view: DashView;
  period: { year: number; month: number; label: string; programme: string };
  note: string;
  kpis: Record<string, number | null>;
  by_program: BarRow[];
  by_month: BarRow[];
  by_mode: BarRow[];
  by_channel: BarRow[];
  by_type: BarRow[];
  by_state: BarRow[];
  by_zone: BarRow[];
  cards: { by_category: BarRow[]; pending_by_program: BarRow[] };
  gifship: { by_month: BarRow[]; by_type: BarRow[]; queue: { beneficiary: string; gifship_type: string; expiry: string; days_left: number; phone: string }[] };
  compliance: ComplianceRow[];
  outliers: { state: string; value: number; flag: string }[];
  funding: { programme: string; zero_cost: number; budgeted: number }[];
  performance: { state: string; change: string; attainment: number | null; submission: string; renewals_overdue: number | null; priority: string; earlier: number; previous: number; current: number }[];
}

const PROGRAMMES = ["FSSHIP", "BHCPF", "GIFSHIP", "TISHIP", "OPS", "Other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function viewFor(role: string, scope?: string | null, stateCode?: string | null): DashView {
  const key = String(role || "").trim().toLowerCase().replace(/_/g, "-");
  if (["admin", "sdo", "dg-ceo", "hq-department"].includes(key)) return "national";
  if (scope === "national" && !stateCode) return "national";
  if (scope === "zonal" || key === "zc" || key.includes("zonal")) return "zonal";
  return "state";
}

function fmt(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString();
}

function fmtPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${n % 1 ? n.toFixed(1) : n}%`;
}

function flagClass(value: string) {
  if (value === "On track" || value === "Accepted" || value === "Complete") return "bg-[#e8f5ee] text-[#0f3d2e]";
  if (value === "Watch" || value === "Medium" || value === "Submitted" || value === "Above peer range") return "bg-amber-50 text-amber-800";
  if (value === "Below peer range") return "bg-sky-50 text-sky-800";
  return "bg-rose-50 text-rose-700";
}

function heatClass(value: number | null, kind: "reporting" | "cards") {
  if (value == null) return "bg-slate-50 text-slate-400";
  if (kind === "reporting") {
    if (value >= 100) return "bg-[#d8f3e4] text-[#0f3d2e]";
    if (value >= 90) return "bg-amber-50 text-amber-900";
    return "bg-rose-50 text-rose-800";
  }
  if (value >= 90) return "bg-[#d8f3e4] text-[#0f3d2e]";
  if (value >= 75) return "bg-amber-50 text-amber-900";
  return "bg-rose-50 text-rose-800";
}

function Flag({ value }: { value: string }) {
  return <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold ${flagClass(value)}`}>{value}</span>;
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div className="border-b border-[#d4e8dc] pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1a7a52]">{kicker}</p>
        <h3 className="text-base font-bold text-[#0f3d2e]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-white p-4 shadow-2xs h-full">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-[#0f3d2e]">{title}</h4>
        {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function HBars({ rows, onPick }: { rows: BarRow[]; onPick?: (label: string) => void }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.some((row) => row.value > 0)) {
    return <p className="text-xs text-slate-500">No records in this period.</p>;
  }
  return (
    <div className="space-y-2.5">
      {rows.filter((row) => row.value > 0 || rows.length <= 6).map((row) => {
        const inner = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <span className="truncate">{row.label}</span>
              <span className="tabular-nums text-[#0f3d2e]">{fmt(row.value)}</span>
            </div>
            <div className="h-2 rounded-sm bg-[#e8f3ec]">
              <div className="h-2 rounded-sm bg-[#1a7a52]" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
            </div>
          </>
        );
        if (!onPick) return <div key={row.label}>{inner}</div>;
        return (
          <button key={row.label} type="button" className="block w-full text-left hover:opacity-80" onClick={() => onPick(row.label)}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

function MonthBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="flex items-end gap-1.5 h-40">
      {rows.map((row) => (
        <div key={row.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
          <span className="text-[10px] font-semibold tabular-nums text-[#0f3d2e]">{row.value ? fmt(row.value) : ""}</span>
          <div className="w-full rounded-sm bg-[#1a7a52]" style={{ height: `${Math.max(row.value ? 6 : 2, (row.value / max) * 100)}%` }} />
          <span className="text-[10px] font-semibold text-slate-500">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-[#d4e8dc]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
            {headers.map((header) => (
              <TableHead key={header} className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export default function EnrolmentActivityDashboard({
  defaultZoneId,
  defaultStateId,
}: {
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}) {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const view = viewFor(user?.role || "", user?.role_config?.report_scope, user?.state_code || defaultStateId);
  const lockZone = view !== "national";
  const lockState = view === "state";
  const now = new Date();
  const [year, setYear] = React.useState(String(now.getFullYear()));
  const [month, setMonth] = React.useState(String(now.getMonth() + 1));
  const [programme, setProgramme] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId || "all");
  const [stateId, setStateId] = React.useState(defaultStateId || "all");
  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    stockApi.getZones().then((res) => {
      setZones((res.data || []).map((zone: { zonal_code?: string; id?: string; description?: string }) => ({
        id: String(zone.zonal_code || zone.id),
        label: zone.description || String(zone.zonal_code || zone.id),
      })));
    }).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    const zoneArg = lockZone ? (defaultZoneId || undefined) : (zoneId === "all" ? undefined : zoneId);
    stockApi.getStates(zoneArg).then((res) => {
      setStates((res.data || []).map((state: { code?: string; id?: string; description?: string }) => ({
        id: String(state.code || state.id),
        label: state.description || String(state.code || state.id),
      })));
    }).catch(() => setStates([]));
  }, [zoneId, lockZone, defaultZoneId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeApi.enrolment.getDashboard({
        year,
        month,
        programme,
        zone_id: lockZone ? defaultZoneId : zoneId,
        state_id: lockState ? defaultStateId : stateId,
      });
      setData(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load the enrolment dashboard";
      toast.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, programme, zoneId, stateId, lockZone, lockState, defaultZoneId, defaultStateId]);

  React.useEffect(() => { void load(); }, [load]);

  const openRecords = () => navigate("/zonal/enrolment");
  const pickProgram = (label: string) => setProgramme((current) => (current === label ? "all" : label));

  const sections = view === "state"
    ? [
      ["overview", "Performance"],
      ["cards", "ID cards"],
      ["renewals", "GIFSHIP renewals"],
    ]
    : view === "zonal"
      ? [
        ["compliance", "Compliance"],
        ["overview", "Zonal overview"],
        ["coverage", "Programmes"],
        ["comparison", "Comparison"],
        ["operations", "State operations"],
      ]
      : [
        ["overview", "National overview"],
        ["coverage", "Programmes"],
        ["targets", "State performance"],
        ["heatmap", "Heatmap"],
        ["analysis", "Analysis"],
        ["funding", "Funding"],
        ["cards", "ID cards"],
        ["renewals", "Renewals"],
        ["performance", "Priorities"],
        ["compliance", "Compliance"],
      ];

  const kpis = data?.kpis || {};
  const headline = view === "state"
    ? "State enrolment"
    : view === "zonal"
      ? "Zonal enrolment"
      : "National enrolment";

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1a7a52]">{headline}</p>
          <h2 className="text-lg font-bold text-[#0f3d2e]">
            {view === "state" ? "State coordinator view" : view === "zonal" ? "Zonal director view" : "HQ / SOC view"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Click a programme to filter its records. Open a figure to go to the enrolment register.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Filter label="Year" value={year} onChange={setYear} options={Array.from({ length: 5 }, (_, i) => {
            const value = String(now.getFullYear() - i);
            return { value, label: value };
          })} />
          <Filter label="Month" value={month} onChange={setMonth} options={MONTHS.map((label, index) => ({ value: String(index + 1), label }))} />
          <Filter label="Programme" value={programme} onChange={setProgramme} options={[{ value: "all", label: "All programmes" }, ...PROGRAMMES.map((label) => ({ value: label, label }))]} />
          {view !== "state" && (
            <Filter
              label="Zone"
              value={lockZone ? (defaultZoneId || zoneId) : zoneId}
              onChange={(value) => { setZoneId(value); setStateId("all"); }}
              disabled={lockZone}
              options={[{ value: "all", label: "All zones" }, ...zones.map((zone) => ({ value: zone.id, label: zone.label }))]}
            />
          )}
          {view !== "state" && (
            <Filter
              label="State"
              value={lockState ? (defaultStateId || stateId) : stateId}
              onChange={setStateId}
              disabled={lockState}
              options={[{ value: "all", label: "All states" }, ...states.map((state) => ({ value: state.id, label: state.label }))]}
            />
          )}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="shrink-0 rounded-sm border border-[#d4e8dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f3d2e] hover:border-[#1a7a52] hover:bg-[#f4f7f5]"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading enrolment dashboard
        </div>
      ) : !data ? (
        <div className="rounded-sm border border-[#d4e8dc] bg-white p-8 text-center text-sm text-slate-500">The enrolment dashboard could not be loaded.</div>
      ) : (
        <div className={`space-y-8 ${loading ? "opacity-60" : ""}`}>
          {data.note ? <p className="text-xs text-slate-500">{data.note}</p> : null}

          {view === "state" && (
            <>
              <Section id="overview" kicker="State coordinator · 1" title="Performance overview">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <DashKpi label="My submissions" value={fmt(kpis.submitted)} detail={`${fmt(kpis.activities)} activities in the register`} onClick={openRecords} />
                  <DashKpi label="Activities reported" value={fmt(kpis.activities)} detail="All enrolment activities this month" onClick={openRecords} />
                  <DashKpi label="Target coverage" value={fmtPct(kpis.coverage_pct)} detail={`${fmt(kpis.enrolled)} enrolled · no annual target set`} />
                  <DashKpi label="GIFSHIP renewals due" value={fmt(kpis.gifship_renewals_due)} detail={`${fmt(kpis.gifship_overdue_over_14)} overdue more than 14 days`} />
                  <DashKpi label="Reporting completeness" value={fmtPct(kpis.reporting_completeness)} detail={`${fmt(kpis.incomplete_activities)} activity types still empty`} />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Panel title="Enrolment by programme" hint="Click a programme to filter this dashboard">
                    <HBars rows={data.by_program} onPick={pickProgram} />
                  </Panel>
                  <Panel title="Monthly enrolment trend" hint={String(year)}>
                    <MonthBars rows={data.by_month} />
                    <p className="mt-3 text-xs text-slate-500">{fmt(kpis.enrolled)} enrolled in {data.period.label}. {fmt(kpis.annual_enrolled)} recorded this year.</p>
                  </Panel>
                  <Panel title="Enrolment by mode">
                    <HBars rows={data.by_mode} />
                  </Panel>
                  <Panel title="Enrolment by channel">
                    <HBars rows={data.by_channel} />
                  </Panel>
                </div>
              </Section>
              <IdCardSection data={data} kpis={kpis} />
              <GifshipSection data={data} kpis={kpis} />
            </>
          )}

          {view === "zonal" && (
            <>
              <ComplianceSection data={data} kpis={kpis} title="Reporting compliance" kicker="Zonal director" />
              <Section id="overview" kicker="Zonal director · 1" title="Zonal overview">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DashKpi label="States reporting" value={`${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`} detail={`${fmt((kpis.offices_expected || 0) - (kpis.offices_submitted || 0))} not submitted`} />
                  <DashKpi label="Enrolment records" value={fmt(kpis.enrolled)} detail={data.period.programme} onClick={openRecords} />
                  <DashKpi label="Pending card requests" value={fmt(kpis.pending_cards)} detail={`${fmt(kpis.pending_cards_over_14)} older than 14 days`} />
                  <DashKpi label="States flagged" value={fmt(kpis.flagged_states)} detail="Late, incomplete, or not sent" />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Panel title="Enrolment by state"><HBars rows={data.by_state} /></Panel>
                  <Panel title="Enrolment by programme" hint="Click a programme to filter"><HBars rows={data.by_program} onPick={pickProgram} /></Panel>
                </div>
              </Section>
              <CoverageSection data={data} kicker="Zonal director" />
              <ComparisonSection data={data} />
              <Section id="operations" kicker="Zonal director" title="State operations inside this zone">
                <p className="text-xs text-slate-500">Same operational figures a state coordinator sees, limited to the states in this zone. Choose a state above to narrow them.</p>
                <IdCardSection data={data} kpis={kpis} embedded />
                <GifshipSection data={data} kpis={kpis} embedded />
              </Section>
            </>
          )}

          {view === "national" && (
            <>
              <Section id="overview" kicker="HQ / SOC · 1" title="National overview">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <DashKpi label="Offices reporting" value={`${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`} detail={`${fmt((kpis.offices_expected || 0) - (kpis.offices_submitted || 0))} not submitted`} />
                  <DashKpi label="Enrolment records" value={fmt(kpis.enrolled)} detail={data.period.programme} onClick={openRecords} />
                  <DashKpi label="NIN validation" value={fmtPct(kpis.nin_validation_pct)} detail="Validated of NIN checks recorded" />
                  <DashKpi label="Pending card requests" value={fmt(kpis.pending_cards)} detail={`${fmt(kpis.pending_cards_over_14)} older than 14 days`} />
                  <DashKpi label="States flagged" value={fmt(kpis.flagged_states)} detail="Below the reporting threshold" />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Panel title="Enrolment by zone"><HBars rows={data.by_zone} /></Panel>
                  <Panel title="Enrolment by channel"><HBars rows={data.by_channel} /></Panel>
                </div>
              </Section>
              <CoverageSection data={data} kicker="HQ / SOC" />
              <Section id="targets" kicker="HQ / SOC" title="State performance against the previous month">
                <DataTable headers={["State", MONTHS[(Number(month) + 10) % 12] || "Period 1", MONTHS[Number(month) - 1] || "Period 2", "Change", "Reporting"]}>
                  {data.compliance.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="text-xs font-semibold">{row.office}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmt(row.previous)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmt(row.current)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{row.change_pct == null ? "—" : `${row.change_pct > 0 ? "+" : ""}${row.change_pct}%`}</TableCell>
                      <TableCell><Flag value={row.reporting} /></TableCell>
                    </TableRow>
                  ))}
                </DataTable>
              </Section>
              <Section id="heatmap" kicker="HQ / SOC · 1" title="State performance heatmap">
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  <LegendChip title="Enrolment target" body="Blank until an annual target is configured." />
                  <LegendChip title="Reporting completion" body="Green 100% · Amber 90–99% · Red below 90%" />
                  <LegendChip title="ID-card issuance" body="Green 90%+ · Amber 75–89% · Red below 75%" />
                </div>
                <DataTable headers={["State", "Enrolment target", "Reporting completion", "ID cards issued / received"]}>
                  {data.compliance.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="text-xs font-semibold">{row.office}</TableCell>
                      <TableCell className="text-xs text-slate-400">—</TableCell>
                      <TableCell className={`text-xs font-semibold ${heatClass(row.completeness, "reporting")}`}>{fmtPct(row.completeness)}</TableCell>
                      <TableCell className={`text-xs font-semibold ${heatClass(row.id_card_ratio, "cards")}`}>{fmtPct(row.id_card_ratio)}</TableCell>
                    </TableRow>
                  ))}
                </DataTable>
              </Section>
              <Section id="analysis" kicker="HQ / SOC · 2" title="State enrolment analysis">
                {data.outliers.length === 0 ? (
                  <p className="text-xs text-slate-500">No state sits outside the peer range for {data.period.label}.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.outliers.map((row) => (
                      <div key={row.state} className="rounded-sm border border-[#d4e8dc] bg-white p-4">
                        <Flag value={row.flag} />
                        <p className="mt-2 text-sm font-bold text-[#0f3d2e]">{row.state}</p>
                        <p className="text-2xl font-black tabular-nums">{fmt(row.value)}</p>
                        <p className="text-xs text-slate-500">Enrolled this month, outside one standard deviation of peer states.</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              <Section id="funding" kicker="HQ / SOC · 4" title="Total enrolment by funding option">
                <div className="grid gap-3 sm:grid-cols-3">
                  <DashKpi label="Total enrolments" value={fmt(kpis.funding_total)} />
                  <DashKpi label="Zero-cost" value={fmt(kpis.zero_cost)} detail={fmtPct(kpis.funding_total ? ((kpis.zero_cost || 0) / (kpis.funding_total || 1)) * 100 : null)} />
                  <DashKpi label="Budgeted" value={fmt(kpis.budgeted)} detail={fmtPct(kpis.funding_total ? ((kpis.budgeted || 0) / (kpis.funding_total || 1)) * 100 : null)} />
                </div>
                <DataTable headers={["Programme", "Zero-cost", "Budgeted"]}>
                  {data.funding.map((row) => (
                    <TableRow key={row.programme}>
                      <TableCell className="text-xs font-semibold">{row.programme}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmt(row.zero_cost)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmt(row.budgeted)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="text-xs font-bold">Total</TableCell>
                    <TableCell className="text-xs font-bold tabular-nums">{fmt(kpis.zero_cost)}</TableCell>
                    <TableCell className="text-xs font-bold tabular-nums">{fmt(kpis.budgeted)}</TableCell>
                  </TableRow>
                </DataTable>
              </Section>
              <IdCardSection data={data} kpis={kpis} national />
              <Section id="renewals" kicker="HQ / SOC" title="Enrolment and GIFSHIP renewals">
                <div className="grid gap-3 lg:grid-cols-3">
                  <Panel title="Enrolment by channel"><HBars rows={data.by_channel} /></Panel>
                  <Panel title="Enrolment by type"><HBars rows={data.by_type} /></Panel>
                  <Panel title="GIFSHIP renewals completed versus due">
                    <p className="text-3xl font-black text-[#0f3d2e]">{fmtPct(kpis.renewal_rate)}</p>
                    <p className="mt-1 text-xs text-slate-500">{fmt(kpis.renewal_started)} renewals recorded · {fmt(kpis.gifship_total)} GIFSHIP enrolments this month</p>
                    <p className="mt-2 text-xs text-slate-500">{fmt(kpis.overdue)} overdue · {fmt(kpis.expire_30)} expire within 30 days</p>
                  </Panel>
                </div>
              </Section>
              <Section id="performance" kicker="HQ / SOC" title="Performance">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DashKpi label="Declining enrolment" value={fmt(kpis.declining_states)} detail="Two consecutive monthly decreases" />
                  <DashKpi label="Below target" value="—" detail="No enrolment target is configured" />
                  <DashKpi label="Submission gaps" value={fmt(kpis.submission_gaps)} detail="Late, returned, or not sent" />
                  <DashKpi label="Renewal backlog" value={fmt(kpis.renewal_backlog_states)} detail="More than 20% of GIFSHIP overdue" />
                </div>
                <DataTable headers={["State", "Recent change", "Target attainment", "Submission", "Renewals overdue", "Priority"]}>
                  {data.performance.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-xs text-slate-500">No state is flagged for this period.</TableCell></TableRow>
                  ) : data.performance.map((row) => (
                    <TableRow key={row.state}>
                      <TableCell className="text-xs font-semibold">{row.state}</TableCell>
                      <TableCell className="text-xs tabular-nums">{row.change}</TableCell>
                      <TableCell className="text-xs text-slate-400">—</TableCell>
                      <TableCell className="text-xs">{row.submission}</TableCell>
                      <TableCell className="text-xs tabular-nums">{fmtPct(row.renewals_overdue)}</TableCell>
                      <TableCell><Flag value={row.priority} /></TableCell>
                    </TableRow>
                  ))}
                </DataTable>
              </Section>
              <ComplianceSection data={data} kpis={kpis} title="Reporting compliance" kicker="HQ / SOC" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Filter({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <Select value={value || "all"} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function LegendChip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-[#f8faf9] px-3 py-2">
      <p className="font-bold text-[#0f3d2e]">{title}</p>
      <p className="text-slate-500">{body}</p>
    </div>
  );
}

function IdCardSection({ data, kpis, national, embedded }: { data: DashboardData; kpis: Record<string, number | null>; national?: boolean; embedded?: boolean }) {
  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashKpi label="Requests received" value={fmt(kpis.cards_received)} />
        <DashKpi label="Issued / completed" value={fmt(kpis.cards_issued)} detail={fmtPct(kpis.issuance_rate)} />
        <DashKpi label="Pending" value={fmt(kpis.pending_cards)} detail={`${fmt(kpis.pending_cards_over_14)} older than 14 days`} />
        <DashKpi label="Issuance rate" value={fmtPct(kpis.issuance_rate)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Requests by category"><HBars rows={data.cards.by_category} /></Panel>
        <Panel title="Pending requests by programme"><HBars rows={data.cards.pending_by_program} /></Panel>
      </div>
    </>
  );
  if (embedded) return <div className="space-y-3">{body}</div>;
  return (
    <Section id="cards" kicker={national ? "HQ / SOC · 3" : "State coordinator · 2"} title="ID-card requests received versus issued">
      {body}
    </Section>
  );
}

function GifshipSection({ data, kpis, embedded }: { data: DashboardData; kpis: Record<string, number | null>; embedded?: boolean }) {
  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DashKpi label="Total GIFSHIP enrollees" value={fmt(kpis.gifship_total)} />
        <DashKpi label="Current active" value={fmt(kpis.gifship_active)} />
        <DashKpi label="Expire in 30 days" value={fmt(kpis.expire_30)} />
        <DashKpi label="Expire in 60 days" value={fmt(kpis.expire_60)} />
        <DashKpi label="Renewal started" value={fmt(kpis.renewal_started)} />
        <DashKpi label="Overdue / expired" value={fmt(kpis.overdue)} detail="Needs review" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Expiry by month"><HBars rows={data.gifship.by_month} /></Panel>
        <Panel title="Renewal by GIFSHIP type"><HBars rows={data.gifship.by_type} /></Panel>
      </div>
      <Panel title="Upcoming expiry queue">
        <DataTable headers={["Beneficiary", "GIFSHIP type", "Expiry", "Days left", "Telephone"]}>
          {data.gifship.queue.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-xs text-slate-500">No GIFSHIP expiry dates fall in the next five months.</TableCell></TableRow>
          ) : data.gifship.queue.map((row) => (
            <TableRow key={`${row.beneficiary}-${row.expiry}`}>
              <TableCell className="text-xs font-semibold">{row.beneficiary}</TableCell>
              <TableCell className="text-xs">{row.gifship_type}</TableCell>
              <TableCell className="text-xs">{row.expiry}</TableCell>
              <TableCell className="text-xs tabular-nums">{row.days_left}</TableCell>
              <TableCell className="text-xs">{row.phone}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Panel>
    </>
  );
  if (embedded) return <div className="space-y-3">{body}</div>;
  return (
    <Section id="renewals" kicker="State coordinator · 3" title="GIFSHIP renewal and expiry">
      {body}
    </Section>
  );
}

function CoverageSection({ data, kicker }: { data: DashboardData; kicker: string }) {
  return (
    <Section id="coverage" kicker={kicker} title="Programme performance and coverage">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Enrolment by programme"><HBars rows={data.by_program} /></Panel>
        <Panel title="Monthly enrolment trend"><MonthBars rows={data.by_month} /></Panel>
      </div>
    </Section>
  );
}

function ComparisonSection({ data }: { data: DashboardData }) {
  return (
    <Section id="comparison" kicker="Zonal director" title="State performance comparison">
      <DataTable headers={["State", "Reporting", "Completeness", "Enrolled", "Flag"]}>
        {data.compliance.map((row) => (
          <TableRow key={row.code}>
            <TableCell className="text-xs font-semibold">{row.office}</TableCell>
            <TableCell className="text-xs">{row.reporting}</TableCell>
            <TableCell className="text-xs tabular-nums">{fmtPct(row.completeness)}</TableCell>
            <TableCell className="text-xs tabular-nums">{fmt(row.enrolled)}</TableCell>
            <TableCell><Flag value={row.flag} /></TableCell>
          </TableRow>
        ))}
      </DataTable>
      <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-600">
        <p><span className="font-semibold text-[#0f3d2e]">On track.</span> Submitted on time with every activity type present.</p>
        <p><span className="font-semibold text-amber-800">Watch.</span> Submitted, with an activity type still empty.</p>
        <p><span className="font-semibold text-rose-700">Intervene / Escalate.</span> Late, returned, or not sent.</p>
      </div>
    </Section>
  );
}

function ComplianceSection({
  data, kpis, title, kicker,
}: {
  data: DashboardData;
  kpis: Record<string, number | null>;
  title: string;
  kicker: string;
}) {
  return (
    <Section id="compliance" kicker={kicker} title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        <DashKpi label="Submitted" value={`${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`} detail="State offices" />
        <DashKpi label="On time" value={`${fmt(kpis.offices_on_time)} / ${fmt(kpis.offices_expected)}`} detail="By the end of the reporting month" />
      </div>
      <DataTable headers={["Office", "Status", "Submitted", "Due"]}>
        {data.compliance.map((row) => (
          <TableRow key={row.code}>
            <TableCell className="text-xs font-semibold">{row.office}</TableCell>
            <TableCell><Flag value={row.status} /></TableCell>
            <TableCell className="text-xs">{row.submitted}</TableCell>
            <TableCell className="text-xs">{row.due}</TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Section>
  );
}
