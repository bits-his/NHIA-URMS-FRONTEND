import * as React from "react";
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type ChartType = "bar" | "line" | "area";

const STORAGE_PREFIX = "urms.chartType.";

export function useChartType(key: string, fallback: ChartType = "bar"): [ChartType, (t: ChartType) => void] {
  const storageKey = STORAGE_PREFIX + key;
  const [type, setType] = React.useState<ChartType>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === "bar" || v === "line" || v === "area" ? v : fallback;
    } catch { return fallback; }
  });
  const choose = (t: ChartType) => {
    setType(t);
    try { localStorage.setItem(storageKey, t); } catch { /* ignore */ }
  };
  return [type, choose];
}

export function ChartTypeToggle({ type, onChange }: { type: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100/80 p-1">
      {([
        { id: "bar" as const, label: "Bars", icon: BarChart3 },
        { id: "line" as const, label: "Lines", icon: LineChartIcon },
        { id: "area" as const, label: "Area", icon: AreaChartIcon },
      ]).map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              type === t.id
                ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const tooltipStyle = () => ({
  borderRadius: 8,
  border: "1px solid #d4e8dc",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(15,61,46,0.08)",
});

/**
 * One chart that switches between horizontal bar / line / area.
 * data rows: { name|label, value }
 */
export function SwitchableChart({
  type,
  data,
  color = "#145c3f",
  name = "Value",
  vertical = true,
}: {
  type: ChartType;
  data: { name?: string; label?: string; value?: number }[];
  color?: string;
  name?: string;
  /** keep bars horizontal (category axis) when type === "bar" */
  vertical?: boolean;
}) {
  const rows = data.map((d) => ({ name: d.name ?? d.label ?? "—", value: Number(d.value) || 0 }));
  const margin = { top: 4, right: 16, left: vertical ? 8 : 0, bottom: 4 };

  if (type === "line" || type === "area") {
    const Chart = type === "line" ? LineChart : AreaChart;
    const Series = type === "line" ? Line : Area;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={rows} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Series type="monotone" dataKey="value" name={name} stroke={color} fill={color + "33"} strokeWidth={2.5} dot={{ r: 3 }} />
        </Chart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="value" name={name} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
