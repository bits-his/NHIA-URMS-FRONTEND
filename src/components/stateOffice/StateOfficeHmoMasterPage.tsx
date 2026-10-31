import * as React from "react";
import { useListSearch } from "./useListSearch";
import * as XLSX from "xlsx";
import { ArrowLeft, Download, Loader2, RefreshCw, Wallet } from "lucide-react";
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
  /** When true, hide page chrome (hub provides header/tabs). */
  embedded?: boolean;
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

type FlatRow = MasterLine & {
  key: string;
  state_name: string;
  period: string;
  showHmo: boolean;
  hmoRowSpan: number;
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

function excelAmount(v: number | null | undefined) {
  if (v == null) return "";
  return money(v);
}

function slugify(text: string) {
  return text.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40) || "Export";
}

const th = "text-[10px] md:text-xs font-bold uppercase tracking-wide text-center border border-slate-300 px-2 py-2 bg-slate-50 text-slate-700 whitespace-nowrap";
const thGroup = "text-[10px] md:text-xs font-bold uppercase tracking-wide text-center border border-slate-300 px-2 py-2 bg-[#e8f6ee] text-[#0f3d2e] whitespace-nowrap";
const td = "text-xs border border-slate-200 px-2 py-2 align-middle";
const tdNum = `${td} font-mono text-right whitespace-nowrap`;

export default function StateOfficeHmoMasterPage({ onBack, defaultStateId, defaultZoneId, embedded = false }: Props) {
  const [groups, setGroups] = React.useState<MasterGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<Geo[]>([]);

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterHmo, setFilterHmo] = React.useState("all");
  const [exporting, setExporting] = React.useState(false);
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear,
    month: filterMonth,
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

  const hmoOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const group of groups) {
      for (const hmo of group.hmos) {
        const name = String(hmo.hmo_name || "").trim();
        if (name) names.add(name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [groups]);

  React.useEffect(() => {
    if (filterHmo !== "all" && !hmoOptions.includes(filterHmo)) {
      setFilterHmo("all");
    }
  }, [hmoOptions, filterHmo]);

  const { matchesSearch, searchInput } = useListSearch();
  const flatRows = React.useMemo(() => {
    const rows: FlatRow[] = [];
    const hmoNeedle = filterHmo === "all" ? "" : filterHmo.trim().toLowerCase();
    for (const group of groups) {
      const period = `${monthLabel(group.reporting_month)} ${group.reporting_year}`;
      const stateName = group.state_name || "—";
      for (const hmo of group.hmos) {
        const hmoName = hmo.hmo_name || "";
        if (hmoNeedle && hmoName.trim().toLowerCase() !== hmoNeedle) continue;
        const lines = hmo.lines.filter((line) => matchesSearch([line, hmoName, stateName, period])).sort((a, b) =>
          String(a.facility_name || "").localeCompare(String(b.facility_name || "")),
        );
        lines.forEach((line, idx) => {
          rows.push({
            ...line,
            hmo_name: hmoName || line.hmo_name,
            key: `${group.state_id}-${group.reporting_year}-${group.reporting_month}-${hmoName}-${line.hcf_code || ""}-${line.facility_name}-${idx}`,
            state_name: stateName,
            period,
            showHmo: idx === 0,
            hmoRowSpan: lines.length,
          });
        });
      }
    }
    return rows;
  }, [groups, filterHmo, matchesSearch]);

  const displayState = stateLocked || filterState !== "all"
    ? pickGeoLabel(dashboardStates, filterState === "all" ? (defaultStateId || "") : filterState, groups[0]?.state_name || "—")
    : (groups.length === 1 ? (groups[0].state_name || "—") : "All States");
  const displayPeriod = `${monthLabel(filterMonth)} ${filterYear}`;
  const displayHmo = filterHmo === "all" ? "All HMOs" : filterHmo;

  const sheetTotals = React.useMemo(() => {
    const sum = (key: keyof MasterLine) =>
      flatRows.reduce((s, r) => s + (r[key] == null ? 0 : money(r[key] as number)), 0);
    return {
      alleged_cap: sum("alleged_cap"),
      alleged_ffs: sum("alleged_ffs"),
      alleged_phi: sum("alleged_phi"),
      alleged_total: sum("alleged_total"),
      actual_cap: sum("actual_cap"),
      actual_ffs: sum("actual_ffs"),
      actual_phi: sum("actual_phi"),
      actual_total: sum("actual_total"),
      agreed: sum("agreed_amount"),
      paid: sum("amount_paid"),
      outstanding: sum("outstanding"),
    };
  }, [flatRows]);

  const exportExcel = React.useCallback(() => {
    if (!flatRows.length) {
      toast.message("Nothing to export for the current filters.");
      return;
    }
    setExporting(true);
    try {
      const headerRow1 = [
        "HMO",
        "Name of Facility",
        "HCF Code",
        "Alleged Indebtedness", "", "", "",
        "Actual Indebtedness", "", "", "",
        "Agreed Amount After Reconciliation",
        "Amount Paid (On-Site)",
        "Outstanding",
        "Remarks",
      ];
      const headerRow2 = [
        "", "", "",
        "NHIA Cap", "NHIA FFS", "Private", "Total",
        "NHIA Cap", "NHIA FFS", "Private", "Total",
        "", "", "", "",
      ];
      const body = flatRows.map((row) => [
        row.hmo_name || "",
        row.facility_name || "",
        row.hcf_code || "",
        excelAmount(row.alleged_cap),
        excelAmount(row.alleged_ffs),
        excelAmount(row.alleged_phi),
        excelAmount(row.alleged_total),
        excelAmount(row.actual_cap),
        excelAmount(row.actual_ffs),
        excelAmount(row.actual_phi),
        excelAmount(row.actual_total),
        excelAmount(row.agreed_amount),
        excelAmount(row.amount_paid),
        excelAmount(row.outstanding),
        row.remarks || "",
      ]);
      const totalsRow = [
        "TOTAL", "", "",
        excelAmount(sheetTotals.alleged_cap),
        excelAmount(sheetTotals.alleged_ffs),
        excelAmount(sheetTotals.alleged_phi),
        excelAmount(sheetTotals.alleged_total),
        excelAmount(sheetTotals.actual_cap),
        excelAmount(sheetTotals.actual_ffs),
        excelAmount(sheetTotals.actual_phi),
        excelAmount(sheetTotals.actual_total),
        excelAmount(sheetTotals.agreed),
        excelAmount(sheetTotals.paid),
        excelAmount(sheetTotals.outstanding),
        "",
      ];

      const ws = XLSX.utils.aoa_to_sheet([
        ["MASTER DATA SHEET"],
        [`State: ${displayState}`, `Period: ${displayPeriod}`, `HMO: ${displayHmo}`],
        [],
        headerRow1,
        headerRow2,
        ...body,
        totalsRow,
      ]);
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
        { s: { r: 3, c: 3 }, e: { r: 3, c: 6 } },
        { s: { r: 3, c: 7 }, e: { r: 3, c: 10 } },
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
        { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
        { s: { r: 3, c: 11 }, e: { r: 4, c: 11 } },
        { s: { r: 3, c: 12 }, e: { r: 4, c: 12 } },
        { s: { r: 3, c: 13 }, e: { r: 4, c: 13 } },
        { s: { r: 3, c: 14 }, e: { r: 4, c: 14 } },
      ];
      ws["!cols"] = [
        { wch: 28 }, { wch: 28 }, { wch: 14 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 24 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Data Sheet");
      const filename = `NHIA_Master_Data_Sheet_${slugify(displayState)}_${slugify(displayPeriod)}_${slugify(displayHmo)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Master sheet exported");
    } catch (err: any) {
      toast.error("Failed to export Excel", { description: err?.message });
    } finally {
      setExporting(false);
    }
  }, [flatRows, sheetTotals, displayState, displayPeriod, displayHmo]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {!embedded && (
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
      )}

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
          {searchInput}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Zone</Label>
                  <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); setFilterHmo("all"); }}>
                    <SelectTrigger displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                      {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Select value={filterState} disabled={stateLocked} onValueChange={(v) => { setFilterState(v); setFilterHmo("all"); }}>
                    <SelectTrigger displayValue={filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State")}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                      {dashboardStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setFilterHmo("all"); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Month</Label>
                  <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setFilterHmo("all"); }}>
                    <SelectTrigger displayValue={monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">HMO</Label>
                  <Select value={filterHmo} onValueChange={setFilterHmo}>
                    <SelectTrigger displayValue={filterHmo === "all" ? "All HMOs" : filterHmo}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All HMOs</SelectItem>
                      {hmoOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={exportExcel}
                  disabled={loading || exporting || flatRows.length === 0}
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : flatRows.length === 0 ? (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardContent className="py-16 text-center">
                <Wallet className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No master data for this period</p>
                <p className="mt-1 text-xs text-slate-500">Capture collation and reconciliation sheets first.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base md:text-lg font-bold tracking-wide text-[#0f3d2e] uppercase">
                    Master Data Sheet
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-1 text-sm">
                    <p>
                      <span className="font-semibold uppercase tracking-wide text-slate-600">State:</span>{" "}
                      <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 px-2">{displayState}</span>
                    </p>
                    <p>
                      <span className="font-semibold uppercase tracking-wide text-slate-600">Period:</span>{" "}
                      <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 px-2">{displayPeriod}</span>
                    </p>
                    <p>
                      <span className="font-semibold uppercase tracking-wide text-slate-600">HMO:</span>{" "}
                      <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 px-2">{displayHmo}</span>
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded-md">
                  <Table className="min-w-[1400px] border-collapse">
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className={th}>HMO</TableHead>
                        <TableHead rowSpan={2} className={th}>Name of Facility</TableHead>
                        <TableHead rowSpan={2} className={th}>HCF Code</TableHead>
                        <TableHead colSpan={4} className={thGroup}>Alleged Indebtedness</TableHead>
                        <TableHead colSpan={4} className={thGroup}>Actual Indebtedness</TableHead>
                        <TableHead rowSpan={2} className={th}>Agreed Amount After Reconciliation</TableHead>
                        <TableHead rowSpan={2} className={th}>Amount Paid (On-Site)</TableHead>
                        <TableHead rowSpan={2} className={th}>Outstanding</TableHead>
                        <TableHead rowSpan={2} className={th}>Remarks</TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className={th}>NHIA Cap</TableHead>
                        <TableHead className={th}>NHIA FFS</TableHead>
                        <TableHead className={th}>Private</TableHead>
                        <TableHead className={th}>Total</TableHead>
                        <TableHead className={th}>NHIA Cap</TableHead>
                        <TableHead className={th}>NHIA FFS</TableHead>
                        <TableHead className={th}>Private</TableHead>
                        <TableHead className={th}>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flatRows.map((row) => (
                        <TableRow key={row.key} className="hover:bg-slate-50/80">
                          {row.showHmo ? (
                            <TableCell rowSpan={row.hmoRowSpan} className={`${td} font-semibold text-slate-800 align-top bg-slate-50/50`}>
                              {row.hmo_name || "—"}
                            </TableCell>
                          ) : null}
                          <TableCell className={`${td} text-slate-800`}>{row.facility_name || "—"}</TableCell>
                          <TableCell className={`${td} font-mono text-slate-600`}>{row.hcf_code || "—"}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.alleged_cap)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.alleged_ffs)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.alleged_phi)}</TableCell>
                          <TableCell className={`${tdNum} font-semibold`}>{amountCell(row.alleged_total)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.actual_cap)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.actual_ffs)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.actual_phi)}</TableCell>
                          <TableCell className={`${tdNum} font-semibold`}>{amountCell(row.actual_total)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.agreed_amount)}</TableCell>
                          <TableCell className={tdNum}>{amountCell(row.amount_paid)}</TableCell>
                          <TableCell className={`${tdNum} font-bold text-[#145c3f]`}>{amountCell(row.outstanding)}</TableCell>
                          <TableCell className={`${td} text-slate-600 max-w-[180px]`}>{row.remarks || "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-[#f0fdf7]">
                        <TableCell colSpan={3} className={`${td} font-bold uppercase text-slate-700`}>Total</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.alleged_cap)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.alleged_ffs)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.alleged_phi)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.alleged_total)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.actual_cap)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.actual_ffs)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.actual_phi)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.actual_total)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.agreed)}</TableCell>
                        <TableCell className={`${tdNum} font-bold`}>{amountCell(sheetTotals.paid)}</TableCell>
                        <TableCell className={`${tdNum} font-bold text-[#145c3f]`}>{amountCell(sheetTotals.outstanding)}</TableCell>
                        <TableCell className={td} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
