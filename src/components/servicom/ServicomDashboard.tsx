import * as React from "react";
import {
  ArrowLeft, RefreshCw, Loader2, TrendingUp, CheckCircle2,
  ClipboardCheck, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { servicomApi } from "@/lib/api";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { ClickableKpi, DrillHint, COLORS, getUnitHeadScope } from "@/components/dashboard/dashboardUi";

const UNIT_NAME = "SERVICOM Unit";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

const SEGMENT_LABELS: Record<string, string> = {
  surveys: "Satisfaction Surveys",
  comment_cards: "Charter Comment Cards",
  complaints: "Complaints",
  visits: "Monitoring Visits",
};

function ChartEmpty({ message = "No records in the system for this view yet." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

export default function ServicomDashboard({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  const scope = React.useMemo(() => ({
    state_id: defaultStateId ?? undefined,
    zone_id: defaultZoneId ?? undefined,
  }), [defaultStateId, defaultZoneId]);

  const drill = useDashboardDrill(
    (params) => servicomApi.getDashboardDrill(params),
    scope,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.getDashboard(scope);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load dashboard", { description: err.message });
    } finally { setLoading(false); }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const unitScope = getUnitHeadScope(UNIT_NAME, defaultStateId, defaultZoneId);
  const drillCtx = { subtitle: unitScope.drillSubtitle, breadcrumbs: [UNIT_NAME] };

  const monthlyChart = React.useMemo(() => {
    if (!data?.monthly_activity) return [];
    return data.monthly_activity.map((m: any) => ({
      ...m,
      label: m.month?.slice(5) ?? m.month,
    }));
  }, [data]);

  const statusChartData = React.useMemo(
    () => (data?.complaint_by_status ?? []).filter((d: any) => d.count > 0),
    [data],
  );

  const drillSegment = (segment: string, title: string, extra?: Record<string, string>) => {
    drill.openRecordDrill(segment, title, drillCtx, extra);
  };

  const drillComplaints = (title: string, filters: Record<string, string>) => {
    drill.openRecordDrill("complaints", title, drillCtx, filters);
  };

  const drillMonth = (segment: string, month: string) => {
    drill.openRecordDrill(
      segment,
      `${SEGMENT_LABELS[segment] || segment} — ${month}`,
      { ...drillCtx, breadcrumbs: [...drillCtx.breadcrumbs, "Monthly Activity"] },
      { month },
    );
  };

  const onStateRow = (stateId: number, stateName: string) => {
    drill.openDrill(
      { segment: "state_breakdown", state_id: String(stateId) },
      {
        title: stateName,
        subtitle: "Breakdown by record type under SERVICOM",
        breadcrumbs: [UNIT_NAME, "By State"],
      },
      { resetStack: true },
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span>Loading dashboard...</span>
            </div>
          ) : !data ? null : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ClickableKpi
                  label="Satisfaction Surveys"
                  value={data.satisfaction_surveys ?? 0}
                  icon={<ClipboardCheck className="w-5 h-5 text-emerald-600" />}
                  onClick={() => drillSegment("surveys", "Satisfaction Surveys")}
                />
                <ClickableKpi
                  label="Complaints Received"
                  value={data.complaints_received ?? 0}
                  icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
                  onClick={() => drillSegment("complaints", "All Complaints")}
                />
                <ClickableKpi
                  label="Avg Satisfaction"
                  value={data.avg_satisfaction != null ? `${data.avg_satisfaction}%` : "—"}
                  icon={<TrendingUp className="w-5 h-5 text-[#25a872]" />}
                  onClick={() => drillSegment("surveys", "Satisfaction Surveys")}
                />
                <ClickableKpi
                  label="Resolution Rate"
                  value={`${data.complaint_resolution_rate ?? 0}%`}
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  onClick={() => drillComplaints("Resolved / Closed Complaints", { status: "resolved" })}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Monthly Activity</CardTitle>
                    <DrillHint label="All surveys" onClick={() => drillSegment("surveys", "Satisfaction Surveys")} />
                  </CardHeader>
                  <CardContent className="h-[240px]">
                    {monthlyChart.length === 0 ? (
                      <ChartEmpty message="No surveys, charter cards, or complaints recorded yet." />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyChart}
                        onClick={(e: any) => {
                          const month = e?.activePayload?.[0]?.payload?.month;
                          if (month) drillMonth("complaints", month);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend
                          wrapperStyle={{ fontSize: 10, cursor: "pointer" }}
                          onClick={(e: any) => {
                            const key = String(e?.dataKey || "");
                            const seg = key === "comment_cards" ? "comment_cards" : key === "surveys" ? "surveys" : "complaints";
                            drillSegment(seg, SEGMENT_LABELS[seg] || seg);
                          }}
                        />
                        <Line type="monotone" dataKey="surveys" name="Surveys" stroke="#25a872" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="comment_cards" name="Charter" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="complaints" name="Complaints" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Complaints by Status</CardTitle>
                    <DrillHint label="All complaints" onClick={() => drillSegment("complaints", "All Complaints")} />
                  </CardHeader>
                  <CardContent className="h-[240px]">
                    {statusChartData.length === 0 ? (
                      <ChartEmpty message="No complaints recorded in the system." />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75}
                          label={({ status, count }) => `${String(status).slice(0, 14)}: ${count}`}
                          style={{ cursor: "pointer" }}
                          onClick={(_: any, idx: number) => {
                            const row = statusChartData[idx];
                            if (row?.status) drillComplaints(`Complaints — ${row.status}`, { status: row.status });
                          }}
                        >
                          {statusChartData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">By Category</CardTitle>
                    <DrillHint label="All complaints" onClick={() => drillSegment("complaints", "All Complaints")} />
                  </CardHeader>
                  <CardContent className="h-[220px]">
                    {(data.complaint_by_category ?? []).length === 0 ? (
                      <ChartEmpty />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.complaint_by_category ?? []} layout="vertical" margin={{ left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar
                          dataKey="count" fill="#25a872" barSize={12} style={{ cursor: "pointer" }}
                          onClick={(bar: any) => {
                            if (bar?.category) drillComplaints(`Category: ${bar.category}`, { category: bar.category });
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">By Domain</CardTitle>
                    <DrillHint label="All complaints" onClick={() => drillSegment("complaints", "All Complaints")} />
                  </CardHeader>
                  <CardContent className="h-[220px]">
                    {(data.complaint_by_domain ?? []).length === 0 ? (
                      <ChartEmpty />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.complaint_by_domain ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="domain" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar
                          dataKey="count" fill="#3b82f6" barSize={20} style={{ cursor: "pointer" }}
                          onClick={(bar: any) => {
                            if (bar?.domain) drillComplaints(`Domain: ${bar.domain}`, { domain: bar.domain });
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">By Priority</CardTitle>
                    <DrillHint label="All complaints" onClick={() => drillSegment("complaints", "All Complaints")} />
                  </CardHeader>
                  <CardContent className="h-[220px]">
                    {(data.complaint_by_priority ?? []).length === 0 ? (
                      <ChartEmpty />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.complaint_by_priority ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar
                          dataKey="count" fill="#f59e0b" barSize={24} style={{ cursor: "pointer" }}
                          onClick={(bar: any) => {
                            if (bar?.priority) drillComplaints(`Priority: ${bar.priority}`, { priority: bar.priority });
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-emerald-200 bg-emerald-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-emerald-800">Top Performing States</CardTitle>
                    <p className="text-[11px] text-emerald-700/80">States with survey or charter data — ranked by composite score</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.top_states || []).map((s: any, i: number) => (
                      <button
                        key={s.state_id}
                        type="button"
                        className="flex items-center justify-between gap-2 text-sm w-full text-left hover:bg-emerald-100/50 rounded-lg px-2 py-1.5"
                        onClick={() => onStateRow(s.state_id, s.state_name ?? `State #${s.state_id}`)}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="font-semibold truncate">{s.state_name ?? `State #${s.state_id}`}</span>
                        </span>
                        <Badge variant="outline" className="shrink-0 text-emerald-700 border-emerald-300">{s.avg_score}%</Badge>
                      </button>
                    ))}
                    {!(data.top_states?.length) && (
                      <p className="text-xs text-slate-500">Need data from at least one state to rank performers.</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-rose-200 bg-rose-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-rose-800">Low Performing States</CardTitle>
                    <p className="text-[11px] text-rose-700/80">Bottom half of ranked states — never duplicates the top list</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.low_states || []).map((s: any, i: number) => (
                      <button
                        key={s.state_id}
                        type="button"
                        className="flex items-center justify-between gap-2 text-sm w-full text-left hover:bg-rose-100/50 rounded-lg px-2 py-1.5"
                        onClick={() => onStateRow(s.state_id, s.state_name ?? `State #${s.state_id}`)}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="font-semibold truncate">{s.state_name ?? `State #${s.state_id}`}</span>
                        </span>
                        <Badge variant="outline" className="shrink-0 text-rose-700 border-rose-300">{s.avg_score}%</Badge>
                      </button>
                    ))}
                    {!(data.low_states?.length) && (
                      <p className="text-xs text-slate-500">
                        {(data.top_states?.length ?? 0) <= 1
                          ? "Add data for more states to show low performers."
                          : "No separate low performers in the current ranking."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-2 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">State Performance Rankings</CardTitle>
                    <DrillHint label="All surveys" onClick={() => drillSegment("surveys", "Satisfaction Surveys")} />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">State</TableHead>
                          <TableHead className="text-xs text-right">Surveys</TableHead>
                          <TableHead className="text-xs text-right">Charter</TableHead>
                          <TableHead className="text-xs text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.state_satisfaction_rankings ?? []).slice(0, 10).map((s: any, i: number) => (
                          <TableRow
                            key={s.state_id}
                            className="cursor-pointer hover:bg-[#f0fdf7]"
                            onClick={() => onStateRow(s.state_id, s.state_name ?? `State #${s.state_id}`)}
                          >
                            <TableCell className="text-xs font-bold">{i + 1}</TableCell>
                            <TableCell className="text-sm font-semibold">{s.state_name ?? `State #${s.state_id}`}</TableCell>
                            <TableCell className="text-xs text-right">{s.surveys ?? 0}</TableCell>
                            <TableCell className="text-xs text-right">{s.comment_cards ?? 0}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-[#25a872]">{s.avg_score}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <DashboardDrillPanel
        open={drill.open}
        context={drill.context}
        rows={drill.rows}
        loading={drill.loading}
        onClose={drill.close}
        onBack={drill.canGoBack ? drill.back : undefined}
        onRowClick={(row) => {
          if (row.meta?.match(/^(zone:|state:|segment:|report_type:)/)) drill.handleNestedRow(row);
        }}
        onStatClick={drill.handleStatClick}
      />
    </div>
  );
}
