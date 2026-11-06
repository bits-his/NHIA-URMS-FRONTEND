import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeApi, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";

type DashView = "state" | "zonal" | "national";
type Face = "overview" | "cards" | "renewals" | "compliance" | "states";

interface BarRow { label: string; value: number }
interface ComplianceRow {
  code: string;
  office: string;
  status: string;
  reporting: string;
  submitted: string;
  due: string;
  completeness: number | null;
  enrolled: number;
  previous: number;
  current: number;
  change_pct: number | null;
  id_card_ratio: number | null;
  flag: string;
  renewal_overdue_pct: number | null;
}
interface DashboardData {
  view: DashView;
  period: { year: number; month: number; label: string; programme: string };
  kpis: Record<string, number | null>;
  by_program: BarRow[];
  by_month: BarRow[];
  by_mode: BarRow[];
  by_channel: BarRow[];
  by_type: BarRow[];
  by_state: BarRow[];
  by_zone: BarRow[];
  cards: { by_category: BarRow[]; pending_by_program: BarRow[] };
  gifship: {
    by_month: BarRow[];
    by_type: BarRow[];
    queue: { beneficiary: string; gifship_type: string; expiry: string; days_left: number; phone: string }[];
  };
  compliance: ComplianceRow[];
  outliers: { state: string; value: number; flag: string }[];
  funding: { programme: string; zero_cost: number; budgeted: number }[];
  performance: { state: string; change: string; submission: string; renewals_overdue: number | null; priority: string }[];
}

const BRAND = "#145c3f";
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

function chartRows(rows: BarRow[]) {
  return rows.filter((row) => row.value > 0).map((row) => ({ name: row.label, value: row.value }));
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
  const [face, setFace] = React.useState<Face>("overview");

  const faces: { id: Face; label: string }[] = view === "state"
    ? [
      { id: "overview", label: "Overview" },
      { id: "cards", label: "ID cards" },
      { id: "renewals", label: "Renewals" },
    ]
    : view === "zonal"
      ? [
        { id: "overview", label: "Overview" },
        { id: "compliance", label: "Compliance" },
        { id: "states", label: "States" },
        { id: "renewals", label: "Renewals" },
      ]
      : [
        { id: "overview", label: "Overview" },
        { id: "states", label: "States" },
        { id: "renewals", label: "Renewals" },
      ];

  React.useEffect(() => {
    if (!faces.some((item) => item.id === face)) setFace("overview");
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast.error(err instanceof Error ? err.message : "Could not load the enrolment dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, programme, zoneId, stateId, lockZone, lockState, defaultZoneId, defaultStateId]);

  React.useEffect(() => { void load(); }, [load]);

  const pickProgram = (name?: string) => {
    if (!name || !PROGRAMMES.includes(name)) return;
    setProgramme((current) => (current === name ? "all" : name));
  };
  const kpis = data?.kpis || {};
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="w-full p-2 space-y-2">
      <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Year">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger displayValue={year}><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Month">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger displayValue={MONTHS[Number(month) - 1]}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Programme">
            <Select value={programme} onValueChange={setProgramme}>
              <SelectTrigger displayValue={programme === "all" ? "All programmes" : programme}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programmes</SelectItem>
                {PROGRAMMES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          {view !== "state" && (
            <FilterField label="Zone">
              <Select
                value={lockZone ? (defaultZoneId || zoneId) : zoneId}
                onValueChange={(value) => { setZoneId(value); setStateId("all"); }}
                disabled={lockZone}
              >
                <SelectTrigger displayValue={
                  (lockZone ? defaultZoneId : zoneId) === "all" || !(lockZone ? defaultZoneId : zoneId)
                    ? "All zones"
                    : zones.find((zone) => zone.id === (lockZone ? defaultZoneId : zoneId))?.label || "Assigned zone"
                }>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!lockZone && <SelectItem value="all">All zones</SelectItem>}
                  {zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          )}
          {lockState ? (
            <FilterField label="State">
              <div className="h-11 px-3.5 flex items-center rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] text-sm font-medium text-[#0f3d2e]">
                {states.find((state) => state.id === String(defaultStateId))?.label || "Assigned state"}
              </div>
            </FilterField>
          ) : view !== "state" ? (
            <FilterField label="State">
              <Select value={stateId} onValueChange={setStateId}>
                <SelectTrigger displayValue={stateId === "all" ? "All states" : states.find((state) => state.id === stateId)?.label || stateId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((state) => <SelectItem key={state.id} value={state.id}>{state.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-[#d4e8dc] bg-white p-1 shadow-2xs w-full sm:w-fit">
        {faces.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFace(item.id)}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
              face === item.id ? "bg-[#145c3f] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading dashboard…
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-500 text-center py-16">The enrolment dashboard could not be loaded.</p>
      ) : (
        <motion.div
          key={face}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className={`space-y-4 ${loading ? "opacity-60" : ""}`}
        >
          {face === "overview" && view === "state" && (
            <>
              <KpiRow items={[
                ["Submissions", fmt(kpis.submitted)],
                ["Activities reported", fmt(kpis.activities)],
                ["Enrolled", fmt(kpis.enrolled)],
                ["Reporting completeness", fmtPct(kpis.reporting_completeness)],
              ]} />
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Panel title="Enrolment by programme" className="xl:col-span-2" subtitle="Select a bar to filter">
                  <HBar data={chartRows(data.by_program)} onPick={pickProgram} />
                </Panel>
                <Panel title="Monthly enrolment" className="xl:col-span-3" subtitle={String(year)}>
                  <Trend data={data.by_month.map((row) => ({ name: row.label, value: row.value }))} />
                </Panel>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Panel title="Enrolment by mode"><HBar data={chartRows(data.by_mode)} /></Panel>
                <Panel title="Enrolment by channel"><HBar data={chartRows(data.by_channel)} /></Panel>
              </div>
            </>
          )}

          {face === "overview" && view === "zonal" && (
            <>
              <KpiRow items={[
                ["States reporting", `${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`],
                ["Enrolled", fmt(kpis.enrolled)],
                ["Pending card requests", fmt(kpis.pending_cards)],
                ["States flagged", fmt(kpis.flagged_states)],
              ]} />
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Panel title="Enrolment by state" className="xl:col-span-3"><HBar data={chartRows(data.by_state)} /></Panel>
                <Panel title="Enrolment by programme" className="xl:col-span-2" subtitle="Select a bar to filter">
                  <HBar data={chartRows(data.by_program)} onPick={pickProgram} />
                </Panel>
              </div>
            </>
          )}

          {face === "overview" && view === "national" && (
            <>
              <KpiRow items={[
                ["Offices reporting", `${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`],
                ["Enrolled", fmt(kpis.enrolled)],
                ["NIN validation", fmtPct(kpis.nin_validation_pct)],
                ["Pending card requests", fmt(kpis.pending_cards)],
              ]} />
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Panel title="Enrolment by zone" className="xl:col-span-3"><HBar data={chartRows(data.by_zone)} /></Panel>
                <Panel title="Enrolment by channel" className="xl:col-span-2"><HBar data={chartRows(data.by_channel)} /></Panel>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Panel title="Monthly enrolment" className="xl:col-span-3" subtitle={String(year)}>
                  <Trend data={data.by_month.map((row) => ({ name: row.label, value: row.value }))} />
                </Panel>
                <Panel title="Enrolment by programme" className="xl:col-span-2" subtitle="Select a bar to filter">
                  <HBar data={chartRows(data.by_program)} onPick={pickProgram} />
                </Panel>
              </div>
            </>
          )}

          {face === "cards" && (
            <>
              <KpiRow items={[
                ["Requests received", fmt(kpis.cards_received)],
                ["Issued", fmt(kpis.cards_issued)],
                ["Pending", fmt(kpis.pending_cards)],
                ["Issuance rate", fmtPct(kpis.issuance_rate)],
              ]} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Panel title="Requests by category"><HBar data={chartRows(data.cards.by_category)} color="#0ea5e9" /></Panel>
                <Panel title="Pending by programme"><HBar data={chartRows(data.cards.pending_by_program)} color="#f59e0b" /></Panel>
              </div>
            </>
          )}

          {face === "renewals" && (
            <>
              <KpiRow items={[
                ["GIFSHIP enrollees", fmt(kpis.gifship_total)],
                ["Expire in 30 days", fmt(kpis.expire_30)],
                ["Renewal started", fmt(kpis.renewal_started)],
                ["Overdue", fmt(kpis.overdue)],
              ]} />
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Panel title="Renewal by GIFSHIP type" className="xl:col-span-2"><HBar data={chartRows(data.gifship.by_type)} /></Panel>
                <Panel title="Upcoming expiry queue" className="xl:col-span-3">
                  <SimpleTable
                    headers={["Beneficiary", "Type", "Expiry", "Days left", "Telephone"]}
                    rows={data.gifship.queue.map((row) => [row.beneficiary, row.gifship_type, row.expiry, row.days_left, row.phone])}
                    empty="No GIFSHIP expiry dates in the next five months"
                  />
                </Panel>
              </div>
              {view === "national" && (
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                  <Panel title="Enrolment by type" className="xl:col-span-2"><HBar data={chartRows(data.by_type)} /></Panel>
                  <Panel title="Funding option" className="xl:col-span-3">
                    <SimpleTable
                      headers={["Programme", "Zero-cost", "Budgeted"]}
                      rows={[
                        ...data.funding.map((row) => [row.programme, fmt(row.zero_cost), fmt(row.budgeted)]),
                        ["Total", fmt(kpis.zero_cost), fmt(kpis.budgeted)],
                      ]}
                      empty="No funding option recorded"
                    />
                  </Panel>
                </div>
              )}
            </>
          )}

          {face === "compliance" && (
            <>
              <KpiRow items={[
                ["Submitted", `${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`],
                ["On time", `${fmt(kpis.offices_on_time)} / ${fmt(kpis.offices_expected)}`],
                ["Enrolled", fmt(kpis.enrolled)],
                ["Flagged", fmt(kpis.flagged_states)],
              ]} />
              <Panel title="Submission status">
                <SimpleTable
                  headers={["Office", "Status", "Submitted", "Due"]}
                  rows={data.compliance.map((row) => [row.office, <StatusPill key={row.code} status={row.status} />, row.submitted, row.due])}
                  empty="No state offices in this scope"
                />
              </Panel>
            </>
          )}

          {face === "states" && (
            <>
              <KpiRow items={[
                ["States reporting", `${fmt(kpis.offices_submitted)} / ${fmt(kpis.offices_expected)}`],
                ["Submission gaps", fmt(kpis.submission_gaps)],
                ["Declining", fmt(kpis.declining_states)],
                ["Renewal backlog", fmt(kpis.renewal_backlog_states)],
              ]} />
              <Panel title="State performance" subtitle={`${MONTHS[(Number(month) + 10) % 12]} compared with ${MONTHS[Number(month) - 1]} ${year}`}>
                <SimpleTable
                  headers={["State", "Previous", "This month", "Change", "Reporting", "ID cards", "Flag"]}
                  rows={data.compliance.map((row) => [
                    row.office,
                    fmt(row.previous),
                    fmt(row.current),
                    row.change_pct == null ? "—" : `${row.change_pct > 0 ? "+" : ""}${row.change_pct}%`,
                    fmtPct(row.completeness),
                    fmtPct(row.id_card_ratio),
                    <StatusPill key={row.code} status={row.flag} />,
                  ])}
                  empty="No states in this scope"
                />
              </Panel>
              {view === "national" && data.performance.length > 0 && (
                <Panel title="Priorities">
                  <SimpleTable
                    headers={["State", "Change", "Submission", "Renewals overdue", "Priority"]}
                    rows={data.performance.map((row) => [
                      row.state,
                      row.change,
                      row.submission,
                      fmtPct(row.renewals_overdue),
                      <StatusPill key={row.state} status={row.priority} />,
                    ])}
                    empty="No state is flagged"
                  />
                </Panel>
              )}
            </>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/zonal/enrolment")}
              className="text-[10px] font-bold text-[#145c3f] px-2.5 py-1 rounded-md bg-[#e8f5ee] hover:bg-[#d4e8dc] transition-colors"
            >
              View records
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

function KpiRow({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-sm border border-[#d4e8dc] border-l-4 border-l-[#145c3f] bg-white p-3.5 shadow-[0_1px_0_rgba(15,61,46,0.04)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{label}</p>
          <p className="text-2xl font-black text-[#0f3d2e] tabular-nums mt-1.5 tracking-tight">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#d4e8dc] rounded-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-[#d4e8dc] bg-gradient-to-r from-[#f8fdfb] to-white">
        <h2 className="text-sm font-bold text-[#0f3d2e]">{title}</h2>
        {subtitle ? <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function HBar({ data, onPick, color = BRAND }: { data: { name: string; value: number }[]; onPick?: (name?: string) => void; color?: string }) {
  if (!data.length) return <EmptyChart message="No records for this period" />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#0f3d2e" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="value"
            name="Enrolled"
            fill={color}
            radius={[0, 4, 4, 0]}
            cursor={onPick ? "pointer" : undefined}
            onClick={(entry) => onPick?.((entry as { name?: string })?.name)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Trend({ data }: { data: { name: string; value: number }[] }) {
  if (!data.some((row) => row.value > 0)) return <EmptyChart message="No enrolment trend for this year" />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="value" name="Enrolled" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500 py-8 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-4 -mb-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f4f7f5]">
            {headers.map((header) => (
              <TableHead key={header} className="text-xs font-bold text-[#0f3d2e]">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-[#f8fdfb]">
              {row.map((cell, j) => (
                <TableCell key={j} className={`text-sm ${j === 0 ? "font-semibold text-[#0f3d2e]" : "text-slate-700"}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "Accepted" || status === "On track" || status === "Complete" || status === "On time"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : status === "Watch" || status === "Medium" || status === "Submitted"
      ? "bg-amber-50 text-amber-800 border-amber-100"
      : status === "High" || status === "Escalate" || status === "Intervene" || status === "Returned" || status === "Not sent" || status === "Late"
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={`inline-flex px-2 py-0.5 rounded-sm border text-[11px] font-bold ${tone}`}>{status}</span>;
}

function EmptyChart({ message }: { message: string }) {
  return <div className="h-[260px] flex items-center justify-center text-xs text-slate-400 text-center px-4">{message}</div>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-[#d4e8dc] bg-white p-2.5 shadow-sm text-xs">
      <p className="font-bold text-[#0f3d2e] mb-1">{label || payload[0].name}</p>
      {payload.map((item, i) => (
        <p key={i} className="text-slate-600 flex justify-between gap-4">
          <span>{item.name}</span>
          <span className="font-bold tabular-nums">{Number(item.value || 0).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}
