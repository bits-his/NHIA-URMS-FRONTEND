import * as React from "react";
import { ArrowLeft, Eye, Loader2, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeHmoMasterApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string };
type MasterLine = {
  hmo_name: string;
  facility_name: string;
  hcf_code: string | null;
  alleged_cap: number;
  alleged_ffs: number;
  alleged_phi: number;
  alleged_total: number;
  actual_cap: number | null;
  actual_ffs: number | null;
  actual_phi: number | null;
  actual_total: number | null;
  agreed_amount: number | null;
  amount_paid: number | null;
  outstanding: number | null;
  remarks: string | null;
};
type MasterGroup = {
  state_id: number;
  state_name: string | null;
  zone_name: string | null;
  reporting_year: number;
  reporting_month: number;
  hmos: { hmo_name: string; lines: MasterLine[] }[];
};

function money(v: number | null | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function naira(v: number | null | undefined) {
  return money(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function amountCell(v: number | null | undefined) {
  if (v == null) return "—";
  return `₦${naira(v)}`;
}
function pickGeoLabel(options: Geo[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}
function sumLines(lines: MasterLine[], key: keyof MasterLine) {
  const values = lines.map((line) => line[key]).filter((v) => typeof v === "number") as number[];
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0);
}

export default function StateOfficeHmoMasterPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [groups, setGroups] = React.useState<MasterGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [selected, setSelected] = React.useState<{
    hmo_name: string;
    state_name: string;
    period: string;
    lines: MasterLine[];
  } | null>(null);

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear !== "all" ? filterYear : undefined,
    month: filterMonth !== "all" ? filterMonth : undefined,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeHmoMasterApi.compiled(apiFilters);
      setGroups((res.data ?? []) as MasterGroup[]);
    } catch (err: any) {
      toast.error("Failed to load master sheet", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => { if (defaultZoneId) setFilterZone(defaultZoneId); }, [defaultZoneId]);
  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    const request = zid ? stockApi.getStates(zid) : stockApi.getStates();
    request.then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);

  const showStateColumn = !stateLocked && filterState === "all";
  const showPeriodColumn = filterMonth === "all" || filterYear === "all";
  const hmoRows = React.useMemo(() => {
    return groups.flatMap((group) => group.hmos.map((hmo) => ({
      key: `${group.state_id}-${group.reporting_year}-${group.reporting_month}-${hmo.hmo_name}`,
      hmo_name: hmo.hmo_name,
      state_name: group.state_name || "—",
      period: `${monthLabel(group.reporting_month)} ${group.reporting_year}`,
      facilities: hmo.lines.length,
      alleged: sumLines(hmo.lines, "alleged_total"),
      actual: sumLines(hmo.lines, "actual_total"),
      outstanding: sumLines(hmo.lines, "outstanding"),
      lines: hmo.lines,
    }))).sort((a, b) => a.hmo_name.localeCompare(b.hmo_name) || a.state_name.localeCompare(b.state_name));
  }, [groups]);

  if (selected) {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="rounded-full shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{selected.hmo_name}</h2>
            <p className="text-xs text-slate-500 truncate">{selected.state_name} · {selected.period}</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-16">
            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold">Facility</TableHead>
                      <TableHead className="text-xs font-bold">Code</TableHead>
                      <TableHead className="text-xs font-bold text-right">Alleged Cap</TableHead>
                      <TableHead className="text-xs font-bold text-right">Alleged FFS</TableHead>
                      <TableHead className="text-xs font-bold text-right">Alleged PHI</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actual Cap</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actual FFS</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actual PHI</TableHead>
                      <TableHead className="text-xs font-bold text-right">Agreed</TableHead>
                      <TableHead className="text-xs font-bold text-right">Paid</TableHead>
                      <TableHead className="text-xs font-bold text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.lines.map((line) => (
                      <TableRow key={`${line.hcf_code || ""}-${line.facility_name}`}>
                        <TableCell className="text-sm">{line.facility_name || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{line.hcf_code || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.alleged_cap)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.alleged_ffs)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.alleged_phi)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.actual_cap)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.actual_ffs)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.actual_phi)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.agreed_amount)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(line.amount_paid)}</TableCell>
                        <TableCell className="text-sm font-mono font-semibold text-right text-[#145c3f]">{amountCell(line.outstanding)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Master Data Sheet</h2>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); }}>
                  <SelectTrigger displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger displayValue={filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : hmoRows.length === 0 ? (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardContent className="py-16 text-center">
                <Wallet className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No HMOs for this period</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold">HMO</TableHead>
                      {showStateColumn && <TableHead className="text-xs font-bold">State</TableHead>}
                      {showPeriodColumn && <TableHead className="text-xs font-bold">Period</TableHead>}
                      <TableHead className="text-xs font-bold text-right">Facilities</TableHead>
                      <TableHead className="text-xs font-bold text-right">Alleged</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actual</TableHead>
                      <TableHead className="text-xs font-bold text-right">Outstanding</TableHead>
                      <TableHead className="text-xs font-bold w-16">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hmoRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="text-sm font-semibold text-slate-800">{row.hmo_name}</TableCell>
                        {showStateColumn && <TableCell className="text-xs">{row.state_name}</TableCell>}
                        {showPeriodColumn && <TableCell className="text-xs text-slate-500">{row.period}</TableCell>}
                        <TableCell className="text-sm text-right">{row.facilities}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(row.alleged)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">{amountCell(row.actual)}</TableCell>
                        <TableCell className="text-sm font-mono font-semibold text-right text-[#145c3f]">{amountCell(row.outstanding)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 px-2 text-[#145c3f]"
                            onClick={() => setSelected({
                              hmo_name: row.hmo_name,
                              state_name: row.state_name,
                              period: row.period,
                              lines: row.lines,
                            })}
                          >
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
