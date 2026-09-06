import * as React from "react";
import {
  ArrowLeft, RefreshCw, Loader2, FileText, CheckSquare, CheckCircle2,
  ClipboardList, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { stateOfficeDashboardApi } from "@/lib/api";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import { ClickableKpi, DrillHint, COLORS, getUnitHeadScope } from "@/components/dashboard/dashboardUi";
import type { DrillRow } from "@/components/dashboard/DashboardDrillPanel";

const UNIT_NAME = "SOC/Zones Unit";

function ChartEmpty({ message = "No records in the system for this view yet." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

export default function SocZonesDashboard({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  const scope = React.useMemo(() => ({
    state_id: defaultStateId ?? undefined,
    zone_id: defaultZoneId ?? undefined,
  }), [defaultStateId, defaultZoneId]);

  const drill = useDashboardDrill(
    (params) => stateOfficeDashboardApi.getDashboardDrill(params),
    scope,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeDashboardApi.getDashboard(scope);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const unitScope = getUnitHeadScope(UNIT_NAME, defaultStateId, defaultZoneId);
  const drillCtx = { subtitle: unitScope.drillSubtitle, breadcrumbs: [UNIT_NAME] };

  const monthlyChart = React.useMemo(() =>
    (data?.monthly_activity ?? []).map((m: any) => ({ ...m, label: m.month?.slice(5) ?? m.month })),
  [data]);

  const drillReports = (title: string, extra?: Record<string, string>) => {
    drill.openRecordDrill("all_reports", title, drillCtx, extra);
  };

  const drillReportType = (key: string, label: string) => {
    drill.openRecordDrill("reports", label, drillCtx, { report_type: key });
  };

  const formatAmount = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : `₦${Number(n || 0).toLocaleString()}`;

  const openReportTypePicker = () => {
    const rows: DrillRow[] = (data?.reports_by_type ?? []).map((r: any) => ({
      id: r.key,
      title: r.label,
      subtitle: "SOC/Zones report type",
      status: String(r.total),
      meta: `report_type:${r.key}`,
    }));
    if ((data?.monitoring_visits ?? 0) > 0) {
      rows.push({
        id: "monitoring_visits",
        title: "Monitoring Visits",
        subtitle: "Zonal monitoring records",
        status: String(data.monitoring_visits),
        meta: "report_type:monitoring_visits",
      });
    }
    drill.openLocalDrill(rows, {
      title: "Reports by Type",
      subtitle: unitScope.drillSubtitle,
      breadcrumbs: [UNIT_NAME],
    });
  };

  const onStateRow = (stateId: number, stateName: string) => {
    drill.openDrill(
      { segment: "state_breakdown", state_id: String(stateId) },
      {
        title: stateName,
        subtitle: "Reports & operational records under SOC/Zones",
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <ClickableKpi
                  label="Total Reports"
                  value={data.total_reports ?? 0}
                  icon={<FileText className="w-5 h-5 text-emerald-600" />}
                  onClick={() => drillReports("All SOC/Zones Reports")}
                />
                <ClickableKpi
                  label="Submitted"
                  value={data.total_submitted ?? 0}
                  icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  onClick={() => drillReports("Submitted Reports", { status: "submitted" })}
                />
                <ClickableKpi
                  label="Approved"
                  value={data.total_approved ?? 0}
                  icon={<CheckCircle2 className="w-5 h-5 text-[#25a872]" />}
                  onClick={() => drillReports("Approved Reports", { status: "approved" })}
                />
                <ClickableKpi
                  label="Weekly Actionable"
                  value={data.weekly_actionable_reports ?? 0}
                  icon={<ClipboardList className="w-5 h-5 text-indigo-600" />}
                  onClick={() => drillReportType("weekly_actionable", "Weekly Actionable")}
                />
                <ClickableKpi
                  label="Contracted Services"
                  value={data.contracted_services_reports ?? 0}
                  icon={<CheckSquare className="w-5 h-5 text-purple-600" />}
                  onClick={() => drillReportType("contracted_services", "Contracted Services")}
                />
                <ClickableKpi
                  label="Actionable Items"
                  value={data.weekly_actionable_items ?? 0}
                  icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
                  onClick={() => drillReportType("weekly_actionable", "Weekly Actionable Items")}
                />
                <ClickableKpi
                  label="Contract Lines"
                  value={data.contracted_service_lines ?? 0}
                  icon={<Wallet className="w-5 h-5 text-cyan-600" />}
                  onClick={() => drillReportType("contracted_services", "Contracted Service Lines")}
                />
                <ClickableKpi
                  label="Contract Spend"
                  value={formatAmount(data.contracted_total_amount ?? 0)}
                  icon={<Wallet className="w-5 h-5 text-rose-500" />}
                  onClick={() => drillReportType("contracted_services", "Contracted Services Spend")}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Monthly Report Activity</CardTitle>
                    <DrillHint label="All reports" onClick={() => drillReports("All Monthly Reports")} />
                  </CardHeader>
                  <CardContent className="h-[240px]">
                    {monthlyChart.length === 0 ? (
                      <ChartEmpty message="No monthly reports or monitoring visits recorded yet." />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyChart}
                        onClick={(e: any) => {
                          const month = e?.activePayload?.[0]?.payload?.month;
                          if (month) drillReports(`Reports — ${month}`, { month });
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="reports" name="Reports" stroke="#25a872" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="approved" name="Approved" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Reports by Type</CardTitle>
                    <DrillHint label="Browse types" onClick={openReportTypePicker} />
                  </CardHeader>
                  <CardContent className="h-[240px]">
                    {(data.reports_by_type ?? []).length === 0 ? (
                      <ChartEmpty message="No SOC/Zones, Zonal or Finance reports yet." />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.reports_by_type ?? []} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={120} />
                        <Tooltip />
                        <Bar
                          dataKey="total" fill="#25a872" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                          onClick={(_: unknown, index: number) => {
                            const row = (data.reports_by_type ?? [])[index];
                            if (row?.key) drillReportType(row.key, row.label);
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Actionable Items by Status</CardTitle></CardHeader>
                  <CardContent className="h-[240px]">
                    {(data.actionable_by_status ?? []).length === 0 ? (
                      <ChartEmpty message="No weekly actionable line items yet." />
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.actionable_by_status ?? []}
                          dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                          style={{ cursor: "pointer" }}
                          onClick={() => drillReportType("weekly_actionable", "Weekly Actionable")}
                        >
                          {(data.actionable_by_status ?? []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">Top States by Reports</CardTitle>
                    <DrillHint label="All reports" onClick={() => drillReports("All Monthly Reports")} />
                  </CardHeader>
                  <CardContent className="p-0 max-h-[240px] overflow-auto">
                    {(data.state_activity ?? []).length === 0 ? (
                      <ChartEmpty message="No state-level report activity yet." />
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs">State</TableHead>
                          <TableHead className="text-xs">Zone</TableHead>
                          <TableHead className="text-xs text-right">Reports</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.state_activity ?? []).map((row: any) => (
                          <TableRow
                            key={row.state_id}
                            className="cursor-pointer hover:bg-[#f0fdf7]"
                            onClick={() => onStateRow(row.state_id, row.state_name)}
                          >
                            <TableCell className="text-sm">{row.state_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.zone_name ?? "—"}</TableCell>
                            <TableCell className="text-sm text-right font-bold">{row.report_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
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
