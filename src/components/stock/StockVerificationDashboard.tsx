import * as React from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { stockApi } from "@/lib/api";
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";
import { pickGeoLabel } from "@/src/components/servicom/servicomConstants";
import { LOOKUPS } from "@/src/store/useAssetManagement";

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

export default function StockVerificationDashboard({ defaultStateId, defaultZoneId }: Props) {
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

  const zoneLabel = filterZone === "all" ? "All zones" : pickGeoLabel(zones, filterZone, "Zone");
  const stateLabel = filterState === "all" ? "All states" : pickGeoLabel(states, filterState, "State");

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-30 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Stock Verification Unit</h1>
            <p className="text-xs text-slate-500">Fixed asset register and prepayment register</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <Filter label="Year">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y === "all" ? "All years" : y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Quarter">
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All quarters</SelectItem>
                {["1", "2", "3", "4"].map((q) => <SelectItem key={q} value={q}>{`Q${q}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Office">
            <Select value={office} onValueChange={setOffice}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                <SelectItem value="hq">HQ</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
          {!geoLocked && (
            <>
              <Filter label="Zone">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                  <SelectTrigger className="h-9" displayValue={zoneLabel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="State">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="h-9" displayValue={stateLabel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Filter>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 md:px-6 py-5 space-y-8 max-w-[1400px]">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard…
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Fixed asset register</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Period uses the last verification date, then the date the asset was recorded.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/store-management/verification/verify")}>
                    Open asset verification
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-stretch">
                  <DashKpi label="Total assets recorded" value={assets?.total_recorded ?? 0} detail="In the current filter" />
                  <DashKpi label="Total assets verified" value={assets?.total_verified ?? 0} detail="Verified or verified and passed" />
                  <DashKpi label="Tagged" value={assets?.tagged ?? 0} detail="NHIA tag number present" />
                  <DashKpi label="Poor / defective" value={assets?.poor_defective ?? 0} detail="Poor, defective, or damaged" />
                  <DashKpi label="Unverified / missing" value={assets?.unverified_missing ?? 0} detail="Status or condition" />
                  <DashKpi label="No custodian recorded" value={assets?.no_custodian ?? 0} detail="Custodian field empty" />
                  <DashKpi label="In store" value={assets?.in_store ?? 0} detail="Operational status" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Filter label="Category">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {Object.keys(LOOKUPS.primaryCategories).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Filter>
                  <Filter label="Status">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {LOOKUPS.operationalStatuses.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Filter>
                  <Filter label="Condition">
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All conditions</SelectItem>
                        {LOOKUPS.physicalConditions.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Filter>
                </div>
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

                <div className="rounded-xl border border-[#d4e8dc] bg-white p-4 space-y-4">
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

                <div className="rounded-xl border border-[#d4e8dc] bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {conditionFocus ? `${conditionFocus} assets` : "Condition drill-down"}
                    </p>
                    {conditionFocus && (
                      <button type="button" className="text-[11px] font-semibold text-[#145c3f]" onClick={() => setConditionFocus(null)}>Clear</button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">Click a condition bar to see site, location, custodian, and verification status.</p>
                  <div className="overflow-auto max-h-[480px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Asset</TableHead>
                          <TableHead className="text-xs">Location</TableHead>
                          <TableHead className="text-xs">Site</TableHead>
                          <TableHead className="text-xs">Custodian</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drillRows.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-xs text-slate-500">Nothing to show.</TableCell></TableRow>
                        ) : drillRows.map((row: any) => (
                          <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/store-management/assets/detail/${row.id}`)}>
                            <TableCell className="text-xs font-medium whitespace-nowrap">{row.name}</TableCell>
                            <TableCell className="text-xs text-slate-600">{row.specificLocation}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{row.facilitySite}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{row.assignedCustodian}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{row.verificationStatus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-rose-100">
                    <p className="text-sm font-semibold text-slate-800">Priority red-flag register</p>
                    <p className="text-[11px] text-slate-500">Maintenance overdue, poor or defective, no custodian, unverified or missing.</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Asset</TableHead>
                        <TableHead className="text-xs">Office</TableHead>
                        <TableHead className="text-xs">Flags</TableHead>
                        <TableHead className="text-xs">Observations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(assets?.red_flags ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-xs text-slate-500">No red flags in this filter.</TableCell></TableRow>
                      ) : (assets.red_flags as any[]).map((row) => (
                        <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/store-management/assets/detail/${row.id}`)}>
                          <TableCell className="text-xs font-medium">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.office}</TableCell>
                          <TableCell className="text-xs text-rose-700">{row.flags.join(", ")}</TableCell>
                          <TableCell className="text-xs text-slate-500">{row.observations || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Prepayment register</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Expenditure is quantity supplied times rate. Recurrent means the same item in more than one quarter.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/store-management/prepayment-analysis")}>
                    Open prepayment register
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 items-stretch">
                  <DashKpi label="Total expenditure" value={money(prep?.total_expenditure)} detail="Supplied quantity × rate" />
                  <DashKpi label="Highest expenditure" value={prep?.highest ? money(prep.highest.amount) : "—"} detail={prep?.highest?.item || "No lines in this period"} />
                  <DashKpi label="Lowest expenditure" value={prep?.lowest ? money(prep.lowest.amount) : "—"} detail={prep?.lowest?.item || "No lines in this period"} />
                  <DashKpi label="Recurrent supply" value={prep?.recurrent_supply ?? 0} detail="Items supplied in 2+ quarters" />
                  <DashKpi label="Largest quantity" value={prep?.largest_quantity ? prep.largest_quantity.quantity : "—"} detail={prep?.largest_quantity?.item || "Quantity supplied"} />
                </div>
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
      </ScrollArea>
    </div>
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

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[11px] text-slate-500">{label}</Label>
      {children}
    </div>
  );
}
