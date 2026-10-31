import * as React from "react";
import {
  AlertTriangle, BarChart3, Columns2, LayoutGrid, LineChart as LineChartIcon, Rows3, Table2,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";

const DESIGN_KEY = "urms.pm.overview.design";
const CHART_KEY = "urms.pm.overview.chart";

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

const DESIGNS = [
  { id: "focus", label: "Focus", icon: Rows3, blurb: "KPIs first, then the main delivery charts for this scope.", stateBlurb: "Your state’s delivery at a glance. Click a status or activity to isolate it." },
  { id: "compare", label: "Compare", icon: Columns2, blurb: "Put mixes and trends side by side.", stateBlurb: "Compare activities and monthly movement for your state." },
  { id: "cards", label: "Cards", icon: LayoutGrid, blurb: "Scan KPIs as cards, then open one for detail.", stateBlurb: "Scan state KPIs, then open a card for the supporting chart." },
  { id: "ledger", label: "Table", icon: Table2, blurb: "Sortable figures for hand-off and review.", stateBlurb: "Sortable state figures for follow-up and hand-off." },
] as const;

const CHARTS = [
  { id: "bar", label: "Bars", icon: BarChart3 },
  { id: "line", label: "Lines", icon: LineChartIcon },
] as const;

type DesignId = (typeof DESIGNS)[number]["id"];
type ChartId = (typeof CHARTS)[number]["id"];
type Level = 1 | 2 | 3 | 4;

function storedChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  } catch { /* */ }
  return fallback;
}

function remember(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* */ }
}

function fmtPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(Number(v) % 1 ? 1 : 0)}%`;
}

function fmtNum(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString();
}

function tooltipStyle() {
  return {
    borderRadius: 12,
    border: "1px solid #d4e8dc",
    boxShadow: "0 8px 24px rgba(15,61,46,0.08)",
    fontSize: 12,
  };
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

function Segmented<T extends string>({
  value, options, onChange, ariaLabel,
}: {
  value: T;
  options: readonly { id: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              on ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AccentKpi({
  label, value, detail, accent, active, onClick,
}: {
  label: string;
  value: string;
  detail?: string;
  accent: "blue" | "teal" | "amber" | "green" | "purple";
  active?: boolean;
  onClick?: () => void;
}) {
  const border = {
    blue: "border-l-sky-500",
    teal: "border-l-teal-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    purple: "border-l-violet-500",
  }[accent];
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`h-full min-h-[108px] rounded-xl border border-slate-200 border-l-4 ${border} bg-white p-4 flex flex-col text-left transition-shadow ${
        onClick ? "hover:shadow-sm cursor-pointer" : ""
      } ${active ? "ring-2 ring-teal-600/30" : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight min-h-[28px]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 leading-tight">{value}</p>
      <p className="mt-auto pt-2 text-xs text-slate-500 leading-snug">{detail || " "}</p>
    </Comp>
  );
}

function deltaDetail(delta: number | null | undefined, fallback: string) {
  if (delta == null || Number.isNaN(Number(delta))) return fallback;
  const n = Number(delta);
  const sign = n > 0 ? "+" : "";
  return `${fallback} · vs previous ${sign}${n.toLocaleString()}`;
}

export type OverviewProps = {
  level: Level;
  scopeLabel?: string | null;
  showPipelineDrill: boolean;
  isReacc: boolean;
  sdoPipeline: boolean;
  programme: string;
  kpis: any;
  byActivity: any[];
  byStatus: any[];
  byState: any[];
  zoneChartData: any[];
  monthlyTrend: any[];
  hasMonthlyTrend: boolean;
  pipelineBars: any[];
  programmeOutputs: any[];
  execTrend: any[];
  priorities: any[];
  actionQueue: string[];
  sdoZoneBarKey: string;
  sdoZoneBarLabel: string;
  statesInScope?: number;
  trendSeries: Record<string, boolean>;
  onTrendSeriesChange: (next: Record<string, boolean>) => void;
};

export default function ProviderManagementOverview(props: OverviewProps) {
  const {
    level, scopeLabel, showPipelineDrill, isReacc, sdoPipeline, programme, kpis,
    byActivity, byStatus, byState, zoneChartData, monthlyTrend, hasMonthlyTrend,
    pipelineBars, programmeOutputs, execTrend, priorities, actionQueue,
    sdoZoneBarKey, sdoZoneBarLabel, trendSeries, onTrendSeriesChange,
  } = props;

  const isState = level === 1;
  const designKey = `${DESIGN_KEY}.l${level}`;
  const chartKey = `${CHART_KEY}.l${level}`;
  const [design, setDesign] = React.useState<DesignId>(() => storedChoice(designKey, DESIGNS.map((d) => d.id), "focus"));
  const [chart, setChart] = React.useState<ChartId>(() => storedChoice(chartKey, CHARTS.map((c) => c.id), "bar"));
  const [focusStatus, setFocusStatus] = React.useState<string | null>(null);
  const [focusActivity, setFocusActivity] = React.useState<string | null>(null);
  const [openCard, setOpenCard] = React.useState<string>("completion");

  const active = DESIGNS.find((d) => d.id === design) || DESIGNS[0];
  const blurb = isState ? active.stateBlurb : active.blurb;
  const title = isState && scopeLabel ? `Overview · ${scopeLabel}` : "Overview";

  const statusRows = focusStatus
    ? byStatus.filter((s) => s.name === focusStatus)
    : byStatus;
  const activityRows = focusActivity
    ? byActivity.filter((a) => a.name === focusActivity)
    : byActivity;

  const chooseDesign = (id: DesignId) => {
    setDesign(id);
    remember(designKey, id);
  };
  const chooseChart = (id: ChartId) => {
    setChart(id);
    remember(chartKey, id);
  };

  const kpiGrid = (
    <>
      {level === 1 && !showPipelineDrill && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DashKpi label="Activities planned" value={fmtNum(kpis.activities_planned)} detail="Selected reporting period" />
          <DashKpi label="Completed activities" value={fmtNum(kpis.activities_completed)} detail={`${fmtPct(kpis.activity_completion_rate)} of planned activities`} />
          <DashKpi label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="Facilities covered ÷ planned" />
          <DashKpi label="Facility coverage" value={fmtPct(kpis.facility_coverage_rate)} detail="Facilities covered ÷ state total" />
        </div>
      )}
      {level === 1 && showPipelineDrill && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccentKpi accent="blue" label="Facilities awaiting" value={fmtNum(isReacc ? kpis.awaiting_reaccreditation : kpis.awaiting_accreditation)} detail={`${programme === "all" ? "All programmes" : programme} · selected period`} />
          <AccentKpi accent="teal" label={isReacc ? "Facilities re-accredited" : "Facilities accredited"} value={fmtNum(isReacc ? kpis.reaccredited : kpis.accredited)} detail="Selected period" />
          <AccentKpi accent="amber" label="Facilities planned" value={fmtNum(kpis.facilities_planned)} detail="Activity plan" />
          <AccentKpi accent="green" label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="From this plan’s period" />
        </div>
      )}
      {level === 2 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DashKpi label="States in zone" value={fmtNum(props.statesInScope)} detail="States with activity in scope" />
          <DashKpi label="Activities completed" value={fmtNum(kpis.activities_completed)} detail="Across states in selected period" />
          <DashKpi label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="Aggregate numerator ÷ denominator" />
          <DashKpi label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="Activity-level reported count" />
        </div>
      )}
      {level === 3 && !sdoPipeline && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccentKpi accent="blue" label="Activities planned" value={fmtNum(kpis.activities_planned)} detail="Across reporting states" />
          <AccentKpi accent="teal" label="Activities completed" value={fmtNum(kpis.activities_completed)} detail={`${fmtPct(kpis.activity_completion_rate)} completion rate`} />
          <AccentKpi accent="amber" label="Plan achievement" value={fmtPct(kpis.plan_achievement_rate)} detail="National aggregate rate" />
          <AccentKpi accent="green" label="Facilities covered" value={fmtNum(kpis.facilities_covered)} detail="Sum of valid reported coverage" />
        </div>
      )}
      {level === 3 && sdoPipeline && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccentKpi accent="teal" label="Awaiting accreditation" value={fmtNum(kpis.awaiting_accreditation)} detail="Selected programme / activity" />
          <AccentKpi accent="teal" label="Accredited this period" value={fmtNum(kpis.accredited)} detail="Selected programme / activity" />
          <AccentKpi accent="amber" label="Awaiting reaccreditation" value={fmtNum(kpis.awaiting_reaccreditation)} detail="Separate reaccreditation queue" />
          <AccentKpi accent="purple" label="Reaccredited this period" value={fmtNum(kpis.reaccredited)} detail="Separate reaccreditation output" />
        </div>
      )}
      {level === 4 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccentKpi accent="blue" label="FSSHIP facilities accredited" value={fmtNum(kpis.fsship_accredited)} detail={deltaDetail(kpis.fsship_accredited_delta, "Selected period")} />
          <AccentKpi accent="teal" label="FSSHIP facilities re-accredited" value={fmtNum(kpis.fsship_reaccredited)} detail={deltaDetail(kpis.fsship_reaccredited_delta, "Separate output")} />
          <AccentKpi accent="amber" label="BHCPF PHCs accredited" value={fmtNum(kpis.bhcpf_phcs_accredited)} detail={deltaDetail(kpis.bhcpf_phcs_accredited_delta, "BHCPF only")} />
          <AccentKpi accent="purple" label="BHCPF PHCs re-accredited" value={fmtNum(kpis.bhcpf_phcs_reaccredited)} detail={deltaDetail(kpis.bhcpf_phcs_reaccredited_delta, "BHCPF only")} />
        </div>
      )}
    </>
  );

  const activityChart = (
    <DashChartCard title={focusActivity ? `Delivery · ${focusActivity}` : "Planned facilities vs facilities covered"}>
      {activityRows.length === 0 ? <ChartEmpty message="No activity mix for this filter set" /> : chart === "line" ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activityRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend />
            <Line type="monotone" dataKey="covered" name="Covered" stroke="#14b8a6" strokeWidth={2} />
            <Line type="monotone" dataKey="planned" name="Planned" stroke="#0ea5e9" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...activityRows].reverse()}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            onClick={(state: any) => {
              const name = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
              if (name) setFocusActivity((cur) => (cur === String(name) ? null : String(name)));
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend />
            <Bar dataKey="covered" name="Covered" fill="#14b8a6" radius={[0, 4, 4, 0]} cursor="pointer" />
            <Bar dataKey="planned" name="Planned" fill="#0ea5e9" radius={[0, 4, 4, 0]} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashChartCard>
  );

  const statusChart = (
    <DashChartCard title={focusStatus ? `Status · ${focusStatus}` : "Activity status"}>
      {statusRows.length === 0 ? <ChartEmpty message="No status breakdown" /> : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusRows}
              dataKey="count"
              nameKey="name"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              onClick={(_: any, index: number) => {
                const name = statusRows[index]?.name;
                if (name) setFocusStatus((cur) => (cur === name ? null : name));
              }}
              className="cursor-pointer"
            >
              {statusRows.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend
              onClick={(e: any) => {
                const name = e?.value;
                if (name) setFocusStatus((cur) => (cur === name ? null : name));
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </DashChartCard>
  );

  const levelCharts = (
    <>
      {level === 1 && !showPipelineDrill && (
        <div className="grid lg:grid-cols-2 gap-4">{activityChart}{statusChart}</div>
      )}
      {level === 1 && showPipelineDrill && (
        <div className="grid lg:grid-cols-2 gap-4">
          <DashChartCard title={`Accreditation pipeline${programme !== "all" ? ` — ${programme}` : ""}`}>
            {pipelineBars.every((b: any) => !b.value) ? <ChartEmpty message="No pipeline counts" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...pipelineBars].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Bar dataKey="value" name="Count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
          <DashChartCard title="Period outputs by programme and activity">
            {programmeOutputs.every((b: any) => !b.value) ? <ChartEmpty message="No programme outputs" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...programmeOutputs].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Bar dataKey="value" name="Output" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
        </div>
      )}
      {level === 2 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <DashChartCard title="State comparison — plan achievement">
            {byState.length === 0 ? <ChartEmpty message="No state comparison yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...byState].slice(0, 10).reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle()} formatter={(v: any) => fmtPct(Number(v))} />
                  <Bar dataKey="plan_achievement" name="Plan achievement %" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
          {statusChart}
        </div>
      )}
      {level === 3 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <DashChartCard title={sdoPipeline ? "Outputs by zone — selected programme / activity" : "Performance by zone"}>
            {zoneChartData.length === 0 ? <ChartEmpty message="No zone comparison" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...zoneChartData].slice(0, 10).reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={sdoPipeline ? [0, "auto"] : [0, 100]} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle()} formatter={(v: any) => (sdoPipeline ? fmtNum(Number(v)) : fmtPct(Number(v)))} />
                  <Bar dataKey={sdoPipeline ? sdoZoneBarKey : "plan_achievement"} name={sdoPipeline ? sdoZoneBarLabel : "Plan achievement %"} fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
          <DashChartCard title={sdoPipeline ? "Accreditation vs reaccreditation trend" : "Monthly activity trend"}>
            {(sdoPipeline ? !monthlyTrend.some((r) => Number(r.accredited) > 0 || Number(r.reaccredited) > 0) : !hasMonthlyTrend) ? (
              <ChartEmpty message="No monthly trend data for this period. Seed Provider Management activities or widen filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Legend />
                  {sdoPipeline ? (
                    <>
                      <Line type="monotone" dataKey="accredited" name="Accredited" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="reaccredited" name="Re-accredited" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </>
                  ) : (
                    <>
                      <Line type="monotone" dataKey="planned" name="Planned" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
        </div>
      )}
      {level === 4 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <DashChartCard title="Programme and activity output trend">
            <div className="flex flex-wrap gap-2 mb-2 px-1">
              {([
                ["fsship_accreditation", "FSSHIP accreditation", "#0ea5e9"],
                ["fsship_reaccreditation", "FSSHIP reaccreditation", "#ef4444"],
                ["bhcpf_accreditation", "BHCPF PHC accreditation", "#14b8a6"],
                ["bhcpf_reaccreditation", "BHCPF PHC reaccreditation", "#8b5cf6"],
              ] as const).map(([key, label, color]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTrendSeriesChange({ ...trendSeries, [key]: !trendSeries[key] })}
                  className={`text-[10px] px-2 py-1 rounded-full border ${
                    trendSeries[key] ? "bg-white border-slate-300 text-slate-700" : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </div>
            {execTrend.length === 0 ? <ChartEmpty message="No executive trend" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={execTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Legend />
                  {trendSeries.bhcpf_accreditation && <Line type="monotone" dataKey="bhcpf_accreditation" name="BHCPF PHC accreditation" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />}
                  {trendSeries.bhcpf_reaccreditation && <Line type="monotone" dataKey="bhcpf_reaccreditation" name="BHCPF PHC reaccreditation" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />}
                  {trendSeries.fsship_reaccreditation && <Line type="monotone" dataKey="fsship_reaccreditation" name="FSSHIP reaccreditation" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />}
                  {trendSeries.fsship_accreditation && <Line type="monotone" dataKey="fsship_accreditation" name="FSSHIP accreditation" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />}
                </LineChart>
              </ResponsiveContainer>
            )}
          </DashChartCard>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Priority areas for attention</p>
              <p className="text-xs text-slate-500 mt-0.5">Operational signals from the activity register</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Area</TableHead>
                  <TableHead className="text-xs">Signal</TableHead>
                  <TableHead className="text-xs">Management focus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorities.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-sm text-slate-400 text-center py-8">No priority signals</TableCell></TableRow>
                ) : priorities.slice(0, 6).map((p: any) => (
                  <TableRow key={p.area}>
                    <TableCell className="text-sm font-medium">{p.area}</TableCell>
                    <TableCell className="text-sm">{p.signal}</TableCell>
                    <TableCell className="text-sm text-slate-600">{p.focus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );

  const actionPanel = level === 4 ? (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">Executive decisions</p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {actionQueue[0]
          || "Direct follow-up by programme and activity; request time-bound improvement plans from zones; monitor accreditation and re-accreditation separately."}
      </p>
    </div>
  ) : (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-bold uppercase tracking-wide text-slate-800">
          {level === 1 ? "State action queue" : level === 2 ? "Zonal follow-up" : "National exceptions"}
        </p>
      </div>
      {level === 1 && showPipelineDrill ? (
        <p className="text-sm text-slate-600 leading-relaxed">
          Review initial accreditation and reaccreditation pipelines separately. Drill down by facility, programme and activity record.
        </p>
      ) : level === 3 && sdoPipeline ? (
        <p className="text-sm text-slate-600 leading-relaxed">
          Review zones with high pending workloads or low activity completion for the selected programme.
        </p>
      ) : level === 3 && !sdoPipeline ? (
        <ul className="space-y-2">
          {[
            "Identify zones with sustained low plan achievement",
            "Separate accreditation and reaccreditation outputs",
            "Review programme-specific BHCPF PHC counts",
            "Escalate recurring operational barriers",
          ].map((item) => (
            <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {actionQueue.map((item: string) => (
            <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const cards = [
    { id: "completion", label: "Completion", value: fmtPct(kpis.activity_completion_rate), detail: `${fmtNum(kpis.activities_completed)} of ${fmtNum(kpis.activities_planned)}` },
    { id: "achievement", label: "Plan achievement", value: fmtPct(kpis.plan_achievement_rate), detail: `${fmtNum(kpis.facilities_covered)} covered` },
    { id: "coverage", label: "Facility coverage", value: fmtPct(kpis.facility_coverage_rate), detail: "Against state facility stock" },
    { id: "queue", label: "Awaiting", value: fmtNum((kpis.awaiting_accreditation || 0) + (kpis.awaiting_reaccreditation || 0)), detail: "Accreditation + re-accreditation" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{title}</h3>
            {isState ? (
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-800">
                State coordinator
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{blurb}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Segmented value={design} options={DESIGNS} onChange={chooseDesign} ariaLabel="Overview design" />
          {(design === "focus" || design === "compare") && level === 1 && !showPipelineDrill ? (
            <Segmented value={chart} options={CHARTS} onChange={chooseChart} ariaLabel="Overview chart style" />
          ) : null}
        </div>
      </div>

      {(focusStatus || focusActivity) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Pinned:</span>
          {focusActivity ? (
            <button type="button" onClick={() => setFocusActivity(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
              {focusActivity} ×
            </button>
          ) : null}
          {focusStatus ? (
            <button type="button" onClick={() => setFocusStatus(null)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
              {focusStatus} ×
            </button>
          ) : null}
        </div>
      )}

      {design === "cards" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={openCard === c.id}
                onClick={() => setOpenCard(c.id)}
                className={`rounded-2xl border bg-white p-4 text-left ${openCard === c.id ? "border-teal-300 shadow-sm" : "border-slate-200"}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</p>
                <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
              </button>
            ))}
          </div>
          {openCard === "queue" ? actionPanel : (
            <div className="grid lg:grid-cols-2 gap-4">
              {activityChart}
              {statusChart}
            </div>
          )}
        </div>
      ) : design === "ledger" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Metric</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Value</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Activities planned", fmtNum(kpis.activities_planned), "Selected period"],
                ["Activities completed", fmtNum(kpis.activities_completed), fmtPct(kpis.activity_completion_rate)],
                ["Facilities planned", fmtNum(kpis.facilities_planned), "Activity plan"],
                ["Facilities covered", fmtNum(kpis.facilities_covered), fmtPct(kpis.plan_achievement_rate)],
                ["Facility coverage", fmtPct(kpis.facility_coverage_rate), "Vs state stock"],
                ["Awaiting accreditation", fmtNum(kpis.awaiting_accreditation), "Pipeline"],
                ["Awaiting re-accreditation", fmtNum(kpis.awaiting_reaccreditation), "Pipeline"],
              ].map(([metric, value, note]) => (
                <tr key={String(metric)} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{metric}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold">{value}</td>
                  <td className="px-3 py-2.5 text-slate-500">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 p-4">{actionPanel}</div>
        </div>
      ) : (
        <>
          {kpiGrid}
          {design === "compare" && level === 1 && !showPipelineDrill ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {activityChart}
              <DashChartCard title="Monthly planned vs completed">
                {!hasMonthlyTrend ? <ChartEmpty message="No monthly trend yet" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle()} />
                      <Legend />
                      <Line type="monotone" dataKey="planned" name="Planned" stroke="#0ea5e9" strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </DashChartCard>
            </div>
          ) : levelCharts}
          {actionPanel}
        </>
      )}

      <p className="text-[11px] text-slate-400 text-center">
        Rates use summed numerators ÷ summed denominators (not averages of percentages).
        {isState ? " Scoped to your assigned state — other states appear at zonal and national levels as they report." : " Forms sold / returned are excluded from performance ranking."}
      </p>
    </div>
  );
}
