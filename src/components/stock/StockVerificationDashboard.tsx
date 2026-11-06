import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, RefreshCw, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import PageLayout from "@/components/PageLayout";
import { stockApi } from "@/lib/api";
import { DashChartCard } from "@/components/dashboard/dashboardUi";
import { pickGeoLabel } from "@/src/components/servicom/servicomConstants";
import { LOOKUPS } from "@/src/store/useAssetManagement";
import { RegisterStatsCards } from "@/src/components/stateOffice/RegisterStatsCards";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

const currentYear = new Date().getFullYear();
const YEARS = ["all", ...Array.from({ length: 5 }, (_, i) => String(currentYear - i))];
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return naira.format(Number(value));
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

export default function StockVerificationDashboard({ onBack, defaultStateId, defaultZoneId }: Props) {
  const navigate = useNavigate();
  const geoLocked = !!(defaultStateId || defaultZoneId);
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [quarter, setQuarter] = React.useState("all");
  const [office, setOffice] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [condition, setCondition] = React.useState("all");
  const [conditionFocus, setConditionFocus] = React.useState<string | null>(null);
  const [zoneFocus, setZoneFocus] = React.useState<string | null>(null);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (defaultStateId) return;
    const zoneArg = filterZone === "all" ? undefined : filterZone;
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, defaultStateId]);

  const scope = React.useMemo(() => ({
    state_id: defaultStateId || (filterState !== "all" ? filterState : undefined),
    zone_id: defaultStateId ? undefined : (filterZone !== "all" ? filterZone : undefined),
    year: year === "all" ? undefined : year,
    quarter: quarter === "all" ? undefined : quarter,
    office: office === "all" ? undefined : office,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    condition: condition === "all" ? undefined : condition,
  }), [defaultStateId, filterState, filterZone, year, quarter, office, category, status, condition]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockApi.getDashboard(scope);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load stock dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const assets = data?.asset_register;
  const prep = data?.prepayment;
  const zoneBars = assets?.by_zone ?? [];
  const conditionBars = [...(assets?.by_condition ?? [])].sort((a: any, b: any) => b.count - a.count);
  const stateTiles = zoneBars.length <= 1
    ? (assets?.by_state ?? [])
    : (assets?.by_state ?? []).filter((row: any) => zoneFocus && (row.zone === zoneFocus || row.name === zoneFocus));
  const drillRows = (assets?.rows ?? []).filter((row: any) =>
    !conditionFocus || row.physicalCondition === conditionFocus,
  );

  const zoneLabel = filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone");
  const stateLabel = filterState === "all" ? "All States" : pickGeoLabel(states, filterState, "State");
  const hasFilters =
    year !== String(currentYear) ||
    quarter !== "all" ||
    office !== "all" ||
    (!geoLocked && (filterZone !== "all" || filterState !== "all")) ||
    category !== "all" ||
    status !== "all" ||
    condition !== "all";

  const clearFilters = () => {
    setYear(String(currentYear));
    setQuarter("all");
    setOffice("all");
    if (!geoLocked) {
      setFilterZone(defaultZoneId ?? "all");
      setFilterState(defaultStateId ?? "all");
    }
    setCategory("all");
    setStatus("all");
    setCondition("all");
  };

  const drillColumns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Asset",
        cell: ({ row }) => <span className="text-xs font-medium whitespace-nowrap">{row.original.name}</span>,
      },
      {
        accessorKey: "specificLocation",
        header: "Location",
        cell: ({ row }) => <span className="text-xs text-slate-600">{row.original.specificLocation || "—"}</span>,
      },
      {
        accessorKey: "facilitySite",
        header: "Site",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.facilitySite || "—"}</span>,
      },
      {
        accessorKey: "assignedCustodian",
        header: "Custodian",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.assignedCustodian || "—"}</span>,
      },
      {
        accessorKey: "verificationStatus",
        header: "Status",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.verificationStatus || "—"}</span>,
      },
    ],
    []
  );

  const redFlagColumns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Asset",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "office",
        header: "Office",
        cell: ({ row }) => <span className="text-xs">{row.original.office || "—"}</span>,
      },
      {
        id: "flags",
        header: "Flags",
        accessorFn: (row) => (row.flags || []).join(", "),
        cell: ({ row }) => (
          <span className="text-xs text-rose-700">{(row.original.flags || []).join(", ") || "—"}</span>
        ),
      },
      {
        accessorKey: "observations",
        header: "Observations",
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.observations || "—"}</span>,
      },
    ],
    []
  );


  return (
    <PageLayout
      title="Stock Verification Unit"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
      contentClassName="space-y-4 w-full pb-8"
    >
      <div className="w-full space-y-4">
        <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
          <CardContent className="py-1.5 px-3 space-y-1.5">
            <div className={`grid gap-2.5 items-end ${geoLocked ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"}`}>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger size="sm" className="w-full" displayValue={year === "all" ? "All Years" : year}>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y === "all" ? "All Years" : y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quarter</Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger size="sm" className="w-full" displayValue={quarter === "all" ? "All Quarters" : `Q${quarter}`}>
                    <SelectValue placeholder="Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {["1", "2", "3", "4"].map((q) => (
                      <SelectItem key={q} value={q}>{`Q${q}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Office</Label>
                <Select value={office} onValueChange={setOffice}>
                  <SelectTrigger size="sm" className="w-full" displayValue={office === "all" ? "All Offices" : office.toUpperCase()}>
                    <SelectValue placeholder="Office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    <SelectItem value="hq">HQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!geoLocked && (
                <>
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone</Label>
                    <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                      <SelectTrigger size="sm" className="w-full" displayValue={zoneLabel}>
                        <SelectValue placeholder="Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                    <Select value={filterState} onValueChange={setFilterState}>
                      <SelectTrigger size="sm" className="w-full" displayValue={stateLabel}>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger size="sm" className="w-full" displayValue={category === "all" ? "All Categories" : category}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(LOOKUPS.primaryCategories).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger size="sm" className="w-full" displayValue={status === "all" ? "All Statuses" : status}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {LOOKUPS.operationalStatuses.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger size="sm" className="w-full" displayValue={condition === "all" ? "All Conditions" : condition}>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {LOOKUPS.physicalConditions.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasFilters && (
              <div className="flex justify-end pt-0.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1 shrink-0" onClick={clearFilters}>
                  <XCircle className="w-3.5 h-3.5" /> Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard…
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-[#0f3d2e]">Fixed asset register</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Period uses the last verification date, then the date the asset was recorded.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/store-management/verification/verify")}>
                    Open asset verification
                  </Button>
                </div>
                <RegisterStatsCards
                  loading={loading}
                  className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"
                  stats={[
                    { label: "Total recorded", value: assets?.total_recorded ?? 0, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
                    { label: "Verified", value: assets?.total_verified ?? 0, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
                    { label: "Tagged", value: assets?.tagged ?? 0, tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
                    { label: "Poor / defective", value: assets?.poor_defective ?? 0, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
                    { label: "Unverified / missing", value: assets?.unverified_missing ?? 0, tone: "text-rose-700 bg-rose-50/80 border-rose-100" },
                    { label: "No custodian", value: assets?.no_custodian ?? 0, tone: "text-slate-600 bg-white border-slate-200" },
                    { label: "In store", value: assets?.in_store ?? 0, tone: "text-indigo-800 bg-indigo-50/80 border-indigo-100" },
                  ]}
                />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                  <DashChartCard title="Assets by primary category">
                    {(assets?.by_category ?? []).length === 0 ? <ChartEmpty message="No assets in this filter." /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assets.by_category} layout="vertical" margin={{ left: 8, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#1a7a52" radius={[0, 6, 6, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="Physical condition profile">
                    {conditionBars.length === 0 ? <ChartEmpty message="No condition data." /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conditionBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            radius={[0, 6, 6, 0]}
                            maxBarSize={22}
                            style={{ cursor: "pointer" }}
                            onClick={(bar: any) => setConditionFocus(bar?.name || null)}
                          >
                            {conditionBars.map((row: any) => (
                              <Cell key={row.name} fill={conditionColor(row.name)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>

                <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 space-y-3.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Assets by office</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
                        Bar length is how many assets the office holds. Green is verified, rose is not. Select a zone to open its states.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1a7a52]" /> Verified</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#e7a3a3]" /> Not verified</span>
                      {zoneFocus && (
                        <button type="button" className="font-semibold text-[#145c3f]" onClick={() => setZoneFocus(null)}>
                          All zones
                        </button>
                      )}
                    </div>
                  </div>
                  {zoneBars.length === 0 ? <ChartEmpty message="No office breakdown yet." /> : (
                    <VolumeBars
                      rows={zoneBars}
                      active={zoneFocus}
                      onPick={zoneBars.length > 1 ? (name) => setZoneFocus(name === zoneFocus ? null : name) : undefined}
                    />
                  )}
                  <p className="text-xs text-slate-600">
                    {assets?.total_verified ?? 0} of {assets?.total_recorded ?? 0} verified
                    {" · "}
                    {assets?.tagged ?? 0} tagged
                  </p>
                  {zoneBars.length > 1 && stateTiles.length === 0 && (
                    <p className="text-xs text-slate-500">Select a zone to see the states in that office.</p>
                  )}
                  {stateTiles.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-700">{zoneFocus ? `States in ${zoneFocus}` : "States"}</p>
                      <VolumeBars rows={stateTiles} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {conditionFocus
                        ? `Showing ${conditionFocus} assets — click a condition bar to change.`
                        : "Click a condition bar to drill into site, location, custodian, and verification status."}
                    </p>
                    {conditionFocus && (
                      <button type="button" className="text-[11px] font-semibold text-[#145c3f]" onClick={() => setConditionFocus(null)}>
                        Clear drill
                      </button>
                    )}
                  </div>
                  <ShadcnDataTable
                    title={conditionFocus ? `${conditionFocus.toUpperCase()} ASSETS` : "CONDITION DRILL-DOWN"}
                    columns={drillColumns}
                    data={drillRows}
                    loading={false}
                    emptyMessage="Nothing to show."
                    onRowClick={(row) => navigate(`/store-management/assets/detail/${row.id}`)}
                    pageSize={50}
                    showTableOptions={false}
                  />
                </div>

                <ShadcnDataTable
                  title="PRIORITY RED-FLAG REGISTER"
                  infoTooltip="Maintenance overdue, poor or defective, no custodian, unverified or missing."
                  columns={redFlagColumns}
                  data={assets?.red_flags ?? []}
                  loading={false}
                  emptyMessage="No red flags in this filter."
                  onRowClick={(row) => navigate(`/store-management/assets/detail/${row.id}`)}
                  pageSize={50}
                  showTableOptions={false}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-[#0f3d2e]">Prepayment register</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Expenditure is quantity supplied times rate. Recurrent means the same item in more than one quarter.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/store-management/prepayment-analysis")}>
                    Open prepayment register
                  </Button>
                </div>
                <RegisterStatsCards
                  loading={loading}
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3"
                  stats={[
                    { label: "Total expenditure", value: money(prep?.total_expenditure), tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
                    { label: "Highest expenditure", value: prep?.highest ? money(prep.highest.amount) : "—", tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
                    { label: "Lowest expenditure", value: prep?.lowest ? money(prep.lowest.amount) : "—", tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
                    { label: "Recurrent supply", value: prep?.recurrent_supply ?? 0, tone: "text-indigo-800 bg-indigo-50/80 border-indigo-100" },
                    { label: "Largest quantity", value: prep?.largest_quantity ? prep.largest_quantity.quantity : "—", tone: "text-slate-600 bg-white border-slate-200" },
                  ]}
                />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                  <DashChartCard title="Verified supplies by category">
                    {(prep?.by_category ?? []).length === 0 ? <ChartEmpty message="No prepayment lines in this period." /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prep.by_category} margin={{ left: 4, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="quantity" name="Quantity supplied" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                  <DashChartCard title="% expenditure by supply">
                    {(prep?.expenditure_by_supply ?? []).length === 0 ? <ChartEmpty message="No expenditure in this period." /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prep.expenditure_by_supply} layout="vertical" margin={{ left: 8, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="supply" width={140} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value: any) => [`${value}%`, "Share of expenditure"]} />
                          <Bar dataKey="percent" fill="#0f766e" radius={[0, 4, 4, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </DashChartCard>
                </div>
              </section>
            </>
          )}
        </div>
    </PageLayout>
  );
}

function conditionColor(name: string) {
  const key = String(name || "").toLowerCase();
  if (key === "good" || key === "excellent") return "#1a7a52";
  if (key === "fair") return "#7eb89a";
  if (key === "defective" || key === "poor" || key === "damaged") return "#d97706";
  if (key === "missing") return "#e11d48";
  if (key === "obsolete" || key === "retired") return "#64748b";
  return "#94a3b8";
}

function VolumeBars({
  rows,
  active,
  onPick,
}: {
  rows: { name: string; total: number; verified: number; tagged: number }[];
  active?: string | null;
  onPick?: (name: string) => void;
}) {
  const ranked = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const max = Math.max(1, ...ranked.map((row) => Number(row.total) || 0));
  return (
    <div className="space-y-1">
      {ranked.map((row) => {
        const total = Number(row.total) || 0;
        const verified = Math.min(Number(row.verified) || 0, total);
        const share = total ? (verified / total) * 100 : 0;
        const width = (total / max) * 100;
        const selected = active === row.name;
        const body = (
          <>
            <span className="text-sm font-medium text-slate-800 truncate">{row.name}</span>
            <span className="h-7 rounded-md bg-slate-100 overflow-hidden">
              <span className="flex h-full" style={{ width: `${width}%` }}>
                <span className="h-full bg-[#1a7a52]" style={{ width: `${share}%` }} />
                <span className="h-full flex-1 bg-[#e7a3a3]" />
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums text-slate-800">{total}</span>
              <span className="block text-[10px] tabular-nums text-slate-500">{verified} verified</span>
            </span>
          </>
        );
        const className = `grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-3 w-full rounded-lg px-2 py-1 text-left ${
          selected ? "bg-[#e8f6ee]" : onPick ? "hover:bg-slate-50" : ""
        }`;
        if (!onPick) return <div key={row.name} className={className}>{body}</div>;
        return (
          <button key={row.name} type="button" className={className} onClick={() => onPick(row.name)}>
            {body}
          </button>
        );
      })}
    </div>
  );
}

