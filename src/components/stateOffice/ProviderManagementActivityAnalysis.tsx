import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  ChevronDown,
  Columns2,
  LayoutGrid,
  LineChart as LineChartIcon,
  Rows3,
  Table2,
} from "lucide-react";

const DESIGN_KEY = "urms.pm.activityAnalysis.design";
const CHART_KEY = "urms.pm.activityAnalysis.chart";

const ACTIVITY_COLOR: Record<string, string> = {
  accreditation: "#0ea5e9",
  reaccreditation: "#14b8a6",
  "qa-inspections": "#f59e0b",
  "medical-audits": "#8b5cf6",
};

const PROGRAMME_COLOR: Record<string, string> = {
  FSSHIP: "#0ea5e9",
  BHCPF: "#14b8a6",
  Other: "#f59e0b",
  Unspecified: "#64748b",
};

type ScopeLevel = 1 | 2 | 3 | 4;

const DESIGNS = [
  {
    id: "focus",
    label: "Focus",
    icon: Rows3,
    blurb: "Stay on one activity. Click a month or a place to read that slice.",
    stateBlurb: "Stay on one activity for your state. Click a month, programme, or status to follow up.",
  },
  {
    id: "compare",
    label: "Compare",
    icon: Columns2,
    blurb: "See all four activities on one chart. Click a name to hide or show it.",
    stateBlurb: "Compare the four activities in your state. Hide series and pin a month as more reports arrive.",
  },
  {
    id: "cards",
    label: "Cards",
    icon: LayoutGrid,
    blurb: "Scan every activity, then open a card for its monthly movement.",
    stateBlurb: "Scan accreditation, re-accreditation, QA and medical audit for your state, then open a card.",
  },
  {
    id: "ledger",
    label: "Table",
    icon: Table2,
    blurb: "Sort the figures. Open a row to see each month.",
    stateBlurb: "Sort your state’s figures. Open a row for the month-by-month register.",
  },
] as const;

const CHARTS = [
  { id: "bar", label: "Bars", icon: BarChart3 },
  { id: "line", label: "Lines", icon: LineChartIcon },
  { id: "area", label: "Area", icon: AreaChartIcon },
] as const;

const MEASURES = [
  { id: "covered", label: "Covered" },
  { id: "planned", label: "Planned" },
  { id: "rate", label: "Achievement" },
  { id: "records", label: "Records" },
] as const;

type DesignId = (typeof DESIGNS)[number]["id"];
type ChartId = (typeof CHARTS)[number]["id"];
type MeasureId = (typeof MEASURES)[number]["id"];

export type ActivityAnalysisSlice = {
  name: string;
  planned: number;
  covered: number;
  plan_achievement: number | null;
  accredited?: number;
  reaccredited?: number;
  bhcpf_phcs_accredited?: number;
  bhcpf_phcs_reaccredited?: number;
};

export type ActivityAnalysisItem = {
  key: string;
  title: string;
  plan_achievement: number | null;
  by_state: ActivityAnalysisSlice[];
  by_programme?: ActivityAnalysisSlice[];
  by_month: { period: string; planned: number; covered: number; accredited?: number; reaccredited?: number }[];
  by_status: { name: string; count: number }[];
  planned: number;
  covered: number;
  awaiting_accreditation: number;
  awaiting_reaccreditation: number;
  accredited: number;
  reaccredited: number;
  bhcpf_phcs_accredited: number;
  bhcpf_phcs_reaccredited: number;
  bhcpf_awaiting: number;
  bhcpf_awaiting_re: number;
  count: number;
  completed_count: number;
};

export type ActivityAnalysisScope = {
  level: ScopeLevel;
  /** Locked or selected geography label, e.g. "Jigawa". */
  scopeLabel?: string | null;
  statesInScope?: number;
  actionQueue?: string[];
};

type MonthPoint = { period: string; label: string; planned: number; covered: number };

function storedChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  } catch {
    /* private mode */
  }
  return fallback;
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function fmtPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(Number(v) % 1 ? 1 : 0)}%`;
}

function fmtNum(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString();
}

function colorFor(key: string) {
  return ACTIVITY_COLOR[key] || "#64748b";
}

function rateCaption(key: string) {
  if (key === "accreditation") return "Accredited ÷ facilities planned";
  if (key === "reaccreditation") return "Re-accredited ÷ facilities planned";
  return "Facilities covered ÷ planned";
}

function outputOf(item: ActivityAnalysisItem) {
  if (item.key === "accreditation") return { label: "Accredited", value: item.accredited };
  if (item.key === "reaccreditation") return { label: "Re-accredited", value: item.reaccredited };
  return { label: "Covered", value: item.covered };
}

function queueOf(item: ActivityAnalysisItem) {
  if (item.key === "accreditation") return { label: "Awaiting accreditation", value: item.awaiting_accreditation };
  if (item.key === "reaccreditation") return { label: "Awaiting re-accreditation", value: item.awaiting_reaccreditation };
  return { label: "Completed records", value: item.completed_count };
}

function bhcpfLine(item: ActivityAnalysisItem) {
  if (item.key === "accreditation" && (item.bhcpf_awaiting || item.bhcpf_phcs_accredited)) {
    return `BHCPF PHCs: ${fmtNum(item.bhcpf_awaiting)} awaiting · ${fmtNum(item.bhcpf_phcs_accredited)} accredited`;
  }
  if (item.key === "reaccreditation" && (item.bhcpf_awaiting_re || item.bhcpf_phcs_reaccredited)) {
    return `BHCPF PHCs: ${fmtNum(item.bhcpf_awaiting_re)} awaiting · ${fmtNum(item.bhcpf_phcs_reaccredited)} re-accredited`;
  }
  return null;
}

function readOf(item: ActivityAnalysisItem) {
  const rate = item.plan_achievement;
  const noun = item.key === "accreditation" ? "accredited" : item.key === "reaccreditation" ? "re-accredited" : "covered";
  if (rate == null) return "No facilities were planned for this activity in the selected period.";
  if (item.planned === 0) return "There is activity on record, but the plan total is zero.";
  if (rate >= 90) return `Nearly the full plan was ${noun}. The visit pattern is holding.`;
  if (rate >= 70) return `Most of the plan was ${noun}. The remaining gap is the follow-up list.`;
  if (rate >= 40) return `Delivery is behind the plan. Open the months below to see where the gap opened.`;
  return `Most planned facilities were not ${noun}. This activity needs a time-bound catch-up.`;
}

function monthFromChartClick(
  state: { activeIndex?: number | string; activeLabel?: string | number } | null,
  data: { period?: string | number; label?: string | number }[],
) {
  if (!state) return null;
  const idx = typeof state.activeIndex === "number" ? state.activeIndex : Number(state.activeIndex);
  if (Number.isInteger(idx) && idx >= 0 && idx < data.length && data[idx]?.period != null) {
    return String(data[idx].period);
  }
  if (state.activeLabel != null) {
    const hit = data.find((row) => String(row.label) === String(state.activeLabel));
    if (hit?.period != null) return String(hit.period);
  }
  return null;
}

function monthLabel(period: string, withYear: boolean) {
  const [year, month] = String(period).split("-");
  const name = new Date(2000, Math.max(0, Number(month) - 1), 1).toLocaleString("en", { month: "short" });
  if (!withYear) return name;
  return `${name} '${String(year).slice(2)}`;
}

function toMonthPoints(item: ActivityAnalysisItem): MonthPoint[] {
  const rows = [...(item.by_month || [])].sort((a, b) => a.period.localeCompare(b.period));
  const years = new Set(rows.map((r) => r.period.slice(0, 4)));
  const withYear = years.size > 1;
  return rows.map((r) => ({
    period: r.period,
    label: monthLabel(r.period, withYear),
    planned: Number(r.planned) || 0,
    covered: Number(r.covered) || 0,
  }));
}

function AreaChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 17l6-6 4 3 8-8" />
      <path d="M3 17h18" opacity="0.4" />
      <path d="M3 17l6-6 4 3 8-8v11H3z" fill="currentColor" opacity="0.15" stroke="none" />
    </svg>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#d4e8dc] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,61,46,0.08)]">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {payload.map((p) => (
        <p key={`${p.name}-${p.value}`} className="tabular-nums" style={{ color: p.color || "#334155" }}>
          {p.name}: {fmtNum(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
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

function TrendChart({
  data,
  series,
  kind,
  pinned,
  onPick,
  height = 268,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  kind: ChartId;
  pinned: string | null;
  onPick: (period: string) => void;
  height?: number;
}) {
  const pick = (state: { activeIndex?: number | string; activeLabel?: string | number } | null) => {
    const period = monthFromChartClick(state, data);
    if (period) onPick(period);
  };
  const pinnedLabel = data.find((d) => d.period === pinned)?.label;

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
      <Tooltip content={<ChartTip />} />
      {pinnedLabel ? <ReferenceLine x={String(pinnedLabel)} stroke="#0f3d2e" strokeDasharray="4 4" /> : null}
    </>
  );

  return (
    <div style={{ height }} className="w-full cursor-pointer">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "line" ? (
          <LineChart data={data} onClick={pick} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        ) : kind === "area" ? (
          <AreaChart data={data} onClick={pick} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.16} strokeWidth={2} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} onClick={pick} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28}>
                {series.length === 1
                  ? data.map((d) => (
                    <Cell key={String(d.period)} fill={s.color} fillOpacity={!pinned || d.period === pinned ? 1 : 0.35} />
                  ))
                  : null}
              </Bar>
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

function FocusView({
  items,
  chart,
  pinned,
  onPin,
  scope,
}: {
  items: ActivityAnalysisItem[];
  chart: ChartId;
  pinned: string | null;
  onPin: (period: string) => void;
  scope: ActivityAnalysisScope;
}) {
  const [key, setKey] = React.useState(items[0]?.key || "");
  const [sliceName, setSliceName] = React.useState<string | null>(null);
  const [statusName, setStatusName] = React.useState<string | null>(null);
  const item = items.find((i) => i.key === key) || items[0];
  const useProgramme = scope.level === 1 || Number(scope.statesInScope || 0) <= 1;

  React.useEffect(() => {
    if (item && !items.some((i) => i.key === key)) setKey(item.key);
  }, [items, key, item]);

  if (!item) return null;
  const months = toMonthPoints(item);
  const pinnedRow = months.find((m) => m.period === pinned) || null;
  const color = colorFor(item.key);
  const output = outputOf(item);
  const queue = queueOf(item);
  const places = [...(useProgramme ? (item.by_programme || []) : (item.by_state || []))]
    .sort((a, b) => (b.covered || 0) - (a.covered || 0));
  const maxCovered = Math.max(1, ...places.map((s) => s.covered || 0));
  const activePlace = places.find((s) => s.name === sliceName) || null;
  const statuses = item.by_status || [];
  const statusTotal = statuses.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
  const placeTitle = useProgramme ? "By programme" : "Where it happened";
  const placeHint = useProgramme
    ? "Click FSSHIP, BHCPF or Other. More programmes appear as reports are submitted."
    : "Click a state to read its plan and coverage. More states appear as other offices report.";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((row) => {
          const on = row.key === item.key;
          const c = colorFor(row.key);
          const rate = Math.min(100, Math.max(0, Number(row.plan_achievement) || 0));
          return (
            <button
              key={row.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setKey(row.key);
                setSliceName(null);
                setStatusName(null);
                onPin("");
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                on ? "border-transparent shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              style={on ? { background: `${c}14`, boxShadow: `inset 0 0 0 1.5px ${c}` } : undefined}
            >
              <p className="text-xs font-semibold" style={{ color: c }}>{row.title}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{fmtPct(row.plan_achievement)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div className="h-full rounded-full" style={{ width: `${rate}%`, background: c }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Facilities planned" value={fmtNum(item.planned)} />
        <Stat label={output.label} value={fmtNum(output.value)} hint={rateCaption(item.key)} />
        <Stat label="Plan achievement" value={fmtPct(item.plan_achievement)} />
        <Stat label={queue.label} value={fmtNum(queue.value)} hint={bhcpfLine(item) || `${fmtNum(item.completed_count)} of ${fmtNum(item.count)} records completed`} />
      </div>
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">{readOf(item)}</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Monthly plan vs coverage</p>
            <p className="text-xs text-slate-500">Click a month to pin it. Click it again to clear.</p>
          </div>
          {pinnedRow ? (
            <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{pinnedRow.label}</span>
              {" · "}planned {fmtNum(pinnedRow.planned)}
              {" · "}covered {fmtNum(pinnedRow.covered)}
              {" · "}{fmtPct(pinnedRow.planned ? (pinnedRow.covered / pinnedRow.planned) * 100 : null)} of that month
            </p>
          ) : null}
        </div>
        {months.length === 0 ? (
          <p className="py-16 text-center text-xs text-slate-500">No monthly breakdown for this activity.</p>
        ) : (
          <TrendChart
            data={months}
            series={[
              { key: "planned", name: "Planned", color: "#94a3b8" },
              { key: "covered", name: "Covered", color },
            ]}
            kind={chart}
            pinned={pinned}
            onPick={(period) => onPin(period === pinned ? "" : period)}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">{placeTitle}</p>
          <p className="mb-3 text-xs text-slate-500">{placeHint}</p>
          {places.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {useProgramme ? "No programme split in this filter." : "No state split in this filter."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {places.map((s) => {
                const on = sliceName === s.name;
                const barColor = useProgramme ? (PROGRAMME_COLOR[s.name] || color) : color;
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSliceName(on ? null : s.name)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left ${on ? "bg-slate-50" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          {useProgramme ? <span className="h-2 w-2 rounded-full" style={{ background: barColor }} /> : null}
                          {s.name}
                        </span>
                        <span className="tabular-nums text-slate-500">{fmtNum(s.covered)} / {fmtNum(s.planned)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.covered / maxCovered) * 100)}%`, background: barColor }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {activePlace ? (
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              {activePlace.name} covered {fmtNum(activePlace.covered)} of {fmtNum(activePlace.planned)} planned facilities
              {" "}({fmtPct(activePlace.plan_achievement)})
              {item.key === "accreditation" && activePlace.accredited != null
                ? ` · accredited ${fmtNum(activePlace.accredited)}`
                : ""}
              {item.key === "reaccreditation" && activePlace.reaccredited != null
                ? ` · re-accredited ${fmtNum(activePlace.reaccredited)}`
                : ""}
              .
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">How the work ended</p>
          <p className="mb-3 text-xs text-slate-500">Click a status to isolate it.</p>
          {statuses.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No status mix for this activity.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {statuses.map((s, i) => {
                  const dim = statusName && statusName !== s.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      title={`${s.name}: ${s.count}`}
                      onClick={() => setStatusName(statusName === s.name ? null : s.name)}
                      className="h-full"
                      style={{
                        width: `${(Number(s.count) / statusTotal) * 100}%`,
                        background: ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"][i % 6],
                        opacity: dim ? 0.25 : 1,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {statuses.map((s, i) => {
                  const on = statusName === s.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      aria-pressed={on || !statusName}
                      onClick={() => setStatusName(on ? null : s.name)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        on ? "border-slate-300 bg-slate-50 text-slate-800" : "border-transparent text-slate-500"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: ["#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"][i % 6] }} />
                      {s.name}
                      <span className="tabular-nums font-semibold text-slate-800">{fmtNum(Number(s.count))}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareView({
  items,
  chart,
  measure,
  pinned,
  onPin,
}: {
  items: ActivityAnalysisItem[];
  chart: ChartId;
  measure: MeasureId;
  pinned: string | null;
  onPin: (period: string) => void;
}) {
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});
  const visible = items.filter((i) => !hidden[i.key]);

  const months = React.useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    const periods = items.flatMap((i) => i.by_month || []);
    const years = new Set(periods.map((p) => String(p.period).slice(0, 4)));
    const withYear = years.size > 1;
    for (const item of items) {
      for (const row of item.by_month || []) {
        const current = map.get(row.period) || {
          period: row.period,
          label: monthLabel(row.period, withYear),
        };
        current[item.key] = measure === "planned" ? Number(row.planned) || 0 : Number(row.covered) || 0;
        map.set(row.period, current);
      }
    }
    return [...map.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [items, measure]);

  const pinnedRow = months.find((m) => m.period === pinned);

  if (measure === "rate" || measure === "records") {
    const data = items.map((item) => ({
      name: item.title,
      key: item.key,
      value: measure === "rate"
        ? Number(item.plan_achievement) || 0
        : item.completed_count,
      total: item.count,
    }));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          {measure === "rate" ? "Plan achievement by activity" : "Completed records by activity"}
        </p>
        <p className="mb-3 text-xs text-slate-500">
          {measure === "rate"
            ? "Accreditation uses facilities accredited. Re-accreditation uses facilities re-accredited. QA and medical audit use facilities covered."
            : "Completed activity records against every record in the selected period."}
        </p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...data].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" domain={measure === "rate" ? [0, 100] : [0, "auto"]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }}
                formatter={(v: number, _n, ctx) => (
                  measure === "rate"
                    ? fmtPct(Number(v))
                    : `${fmtNum(Number(v))} of ${fmtNum(Number(ctx?.payload?.total))}`
                )}
              />
              <Bar dataKey="value" name={measure === "rate" ? "Achievement" : "Completed"} radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.slice().reverse().map((d) => <Cell key={d.key} fill={colorFor(d.key)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {measure === "planned" ? "Facilities planned each month" : "Facilities covered each month"}
          </p>
          <p className="text-xs text-slate-500">Click a name to hide that activity. Click a month to pin the numbers.</p>
        </div>
        {pinnedRow ? (
          <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{pinnedRow.label}</span>
            {visible.map((item) => (
              <span key={item.key}> · {item.title} {fmtNum(Number(pinnedRow[item.key] || 0))}</span>
            ))}
          </p>
        ) : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const off = !!hidden[item.key];
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((h) => ({ ...h, [item.key]: !h[item.key] }))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                off ? "border-slate-200 text-slate-400 line-through" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(item.key), opacity: off ? 0.35 : 1 }} />
              {item.title}
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="py-16 text-center text-xs text-slate-500">Every series is hidden. Turn one back on.</p>
      ) : months.length === 0 ? (
        <p className="py-16 text-center text-xs text-slate-500">No monthly series for this filter.</p>
      ) : (
        <TrendChart
          data={months}
          series={visible.map((item) => ({ key: item.key, name: item.title, color: colorFor(item.key) }))}
          kind={chart}
          pinned={pinned}
          onPick={(period) => onPin(period === pinned ? "" : period)}
        />
      )}
    </div>
  );
}

function CardsView({
  items,
  chart,
  pinned,
  onPin,
}: {
  items: ActivityAnalysisItem[];
  chart: ChartId;
  pinned: string | null;
  onPin: (period: string) => void;
}) {
  const [open, setOpen] = React.useState<string | null>(items[0]?.key || null);
  const opened = items.find((i) => i.key === open) || null;
  const months = opened ? toMonthPoints(opened) : [];
  const pinnedRow = months.find((m) => m.period === pinned) || null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const color = colorFor(item.key);
          const on = open === item.key;
          const output = outputOf(item);
          const queue = queueOf(item);
          const rate = Math.min(100, Math.max(0, Number(item.plan_achievement) || 0));
          return (
            <button
              key={item.key}
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : item.key)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-colors ${
                on ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>{item.title}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{fmtPct(item.plan_achievement)}</p>
                  <p className="text-xs text-slate-500">{rateCaption(item.key)}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${on ? "rotate-180" : ""}`} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Planned</p>
                  <p className="font-semibold tabular-nums text-slate-800">{fmtNum(item.planned)}</p>
                </div>
                <div>
                  <p className="text-slate-400">{output.label}</p>
                  <p className="font-semibold tabular-nums text-slate-800">{fmtNum(output.value)}</p>
                </div>
                <div>
                  <p className="text-slate-400">{queue.label}</p>
                  <p className="font-semibold tabular-nums text-slate-800">{fmtNum(queue.value)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {opened ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{opened.title} · monthly plan vs coverage</p>
              <p className="text-xs text-slate-500">{readOf(opened)} Click a month to pin it.</p>
            </div>
            {pinnedRow ? (
              <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{pinnedRow.label}</span>
                {` · planned ${fmtNum(pinnedRow.planned)} · covered ${fmtNum(pinnedRow.covered)}`}
              </p>
            ) : null}
          </div>
          {months.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">No monthly breakdown.</p>
          ) : (
            <TrendChart
              data={months}
              series={[
                { key: "planned", name: "Planned", color: "#94a3b8" },
                { key: "covered", name: "Covered", color: colorFor(opened.key) },
              ]}
              kind={chart}
              pinned={pinned}
              onPick={(period) => onPin(period === pinned ? "" : period)}
              height={240}
            />
          )}
        </div>
      ) : (
        <p className="text-center text-xs text-slate-500">Open a card to see its months.</p>
      )}
    </div>
  );
}

function LedgerView({ items }: { items: ActivityAnalysisItem[] }) {
  type SortKey = "title" | "planned" | "output" | "plan_achievement" | "queue" | "completed_count";
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "plan_achievement", dir: "desc" });
  const [open, setOpen] = React.useState<string | null>(null);

  const rows = [...items].sort((a, b) => {
    const value = (item: ActivityAnalysisItem) => {
      if (sort.key === "title") return item.title;
      if (sort.key === "output") return outputOf(item).value;
      if (sort.key === "queue") return queueOf(item).value;
      return item[sort.key] ?? -1;
    };
    const av = value(a);
    const bv = value(b);
    const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const header = (key: SortKey, label: string) => (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
        className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}{sort.key === key ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {header("title", "Activity")}
            {header("planned", "Planned")}
            {header("output", "Output")}
            {header("plan_achievement", "Achievement")}
            {header("queue", "Queue / done")}
            {header("completed_count", "Records")}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const on = open === item.key;
            const output = outputOf(item);
            const queue = queueOf(item);
            const months = toMonthPoints(item);
            return (
              <React.Fragment key={item.key}>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => setOpen(on ? null : item.key)} className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <span className="h-2 w-2 rounded-full" style={{ background: colorFor(item.key) }} />
                      {item.title}
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 ${on ? "rotate-180" : ""}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(item.planned)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(output.value)} <span className="text-xs text-slate-400">{output.label}</span></td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold">{fmtPct(item.plan_achievement)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(queue.value)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(item.completed_count)} / {fmtNum(item.count)}</td>
                </tr>
                {on ? (
                  <tr className="bg-slate-50/80">
                    <td colSpan={6} className="px-3 py-3">
                      {months.length === 0 ? (
                        <p className="text-xs text-slate-500">No monthly rows.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {months.map((m) => (
                            <div key={m.period} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
                              <p className="font-semibold text-slate-700">{m.label}</p>
                              <p className="tabular-nums text-slate-500">{fmtNum(m.covered)} / {fmtNum(m.planned)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ActivityAnalysisPanel({
  items,
  scope = { level: 1 },
}: {
  items: ActivityAnalysisItem[];
  scope?: ActivityAnalysisScope;
}) {
  const isState = scope.level === 1;
  const designKey = `${DESIGN_KEY}.l${scope.level}`;
  const chartKey = `${CHART_KEY}.l${scope.level}`;
  const [design, setDesign] = React.useState<DesignId>(() => storedChoice(designKey, DESIGNS.map((d) => d.id), "focus"));
  const [chart, setChart] = React.useState<ChartId>(() => storedChoice(chartKey, CHARTS.map((c) => c.id), "bar"));
  const [measure, setMeasure] = React.useState<MeasureId>("covered");
  const [pinned, setPinned] = React.useState<string | null>(null);

  const active = DESIGNS.find((d) => d.id === design) || DESIGNS[0];
  const blurb = isState ? active.stateBlurb : active.blurb;
  const showChartStyle = design === "focus" || design === "cards" || (design === "compare" && (measure === "covered" || measure === "planned"));
  const title = isState && scope.scopeLabel
    ? `Activity analysis · ${scope.scopeLabel}`
    : "Activity analysis";

  const chooseDesign = (id: DesignId) => {
    setDesign(id);
    setPinned(null);
    remember(designKey, id);
  };
  const chooseChart = (id: ChartId) => {
    setChart(id);
    remember(chartKey, id);
  };

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
          <Segmented value={design} options={DESIGNS} onChange={chooseDesign} ariaLabel="Analysis design" />
          {showChartStyle ? (
            <Segmented value={chart} options={CHARTS} onChange={chooseChart} ariaLabel="Chart style" />
          ) : null}
        </div>
      </div>

      {isState && (scope.actionQueue?.length || 0) > 0 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">State action queue</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {scope.actionQueue!.slice(0, 4).map((item) => (
              <li key={item} className="text-xs text-amber-950/80 flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-600 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {design === "compare" ? (
        <Segmented value={measure} options={MEASURES} onChange={(id) => { setMeasure(id); setPinned(null); }} ariaLabel="Comparison measure" />
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          {isState
            ? "No activity analysis for this state yet. Submit Provider Management reports for the selected period."
            : "No activity analysis for this filter."}
        </div>
      ) : design === "focus" ? (
        <FocusView items={items} chart={chart} pinned={pinned} onPin={(period) => setPinned(period || null)} scope={scope} />
      ) : design === "compare" ? (
        <CompareView items={items} chart={chart} measure={measure} pinned={pinned} onPin={(period) => setPinned(period || null)} />
      ) : design === "cards" ? (
        <CardsView items={items} chart={chart} pinned={pinned} onPin={(period) => setPinned(period || null)} />
      ) : (
        <LedgerView items={items} />
      )}

      {isState ? (
        <p className="text-[11px] text-slate-400 text-center">
          Scoped to your assigned state. Zonal and national views will compare other states as their reports arrive.
        </p>
      ) : null}
    </div>
  );
}
