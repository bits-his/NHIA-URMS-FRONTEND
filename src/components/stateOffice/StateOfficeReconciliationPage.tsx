import * as React from "react";
import {
  ArrowLeft, Plus, RefreshCw, Loader2, Scale,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeReconciliationApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel, formatCount } from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null) => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  hmo_provider_id: "",
  hmo: "",
  hmo_code: "",
  facility: "",
  amount: "",
  recon_status: "",
  comment: "",
});

function pickGeoLabel(
  options: { id: number; description?: string }[],
  value: string,
  fallback: string,
) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

export default function StateOfficeReconciliationPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [mode, setMode] = React.useState<"list" | "form">("list");
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId));

  const {
    filterState, setFilterState, apiStateId,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<any[]>([]);
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
      const res = await stateOfficeReconciliationApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load reconciliation meetings", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => {
    if (defaultZoneId) setFilterZone(defaultZoneId);
  }, [defaultZoneId]);
  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    if (!zid) { setDashboardStates([]); return; }
    stockApi.getStates(zid).then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);
  React.useEffect(() => {
    if (!f.zone_id) { setStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id]);

  const handleCreate = async () => {
    if (!f.zone_id || !f.state_id || !f.hmo.trim() || !f.facility.trim()) {
      toast.error("Zone, state, HMO, and facility are required.");
      return;
    }
    setSaving(true);
    try {
      await stateOfficeReconciliationApi.create({
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
        hmo: f.hmo,
        hmo_code: f.hmo_code || null,
        facility: f.facility,
        amount_owed: Number(f.amount) || 0,
        recon_status: f.recon_status || null,
        comment: f.comment || null,
        reporting_year: Number(filterYear),
        reporting_month: Number(filterMonth),
        status: "submitted",
      });
      toast.success("Reconciliation meeting recorded");
      setMode("list");
      setF(emptyForm(defaultZoneId, defaultStateId));
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    } finally { setSaving(false); }
  };

  if (mode === "form") {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-24">
            <Card className="rounded-2xl border-[#d4e8dc] overflow-visible">
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zone *</Label>
                  <Select value={f.zone_id} disabled={zoneLocked} onValueChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: stateLocked ? p.state_id : "" }))}>
                    <SelectTrigger displayValue={pickGeoLabel(zones, f.zone_id, "Zone")}><SelectValue /></SelectTrigger>
                    <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={f.state_id} disabled={stateLocked} onValueChange={(v) => setF((p) => ({ ...p, state_id: v }))}>
                    <SelectTrigger displayValue={pickGeoLabel(states, f.state_id, "State")}><SelectValue /></SelectTrigger>
                    <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>HMO *</Label>
                  <AccreditedProviderSelect
                    type="hmo"
                    stateId={f.state_id}
                    value={f.hmo_provider_id}
                    onChange={(p) => setF((prev) => ({
                      ...prev,
                      hmo_provider_id: p?.id ?? "",
                      hmo: p?.name ?? "",
                      hmo_code: p?.code ?? "",
                    }))}
                  />
                </div>
                <div className="space-y-2"><Label>Facility *</Label><Input value={f.facility} onChange={(e) => setF((p) => ({ ...p, facility: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Amount Owed</Label><Input type="number" min="0" value={f.amount} onChange={(e) => setF((p) => ({ ...p, amount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Status</Label><Input value={f.recon_status} onChange={(e) => setF((p) => ({ ...p, recon_status: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Comment</Label><Input value={f.comment} onChange={(e) => setF((p) => ({ ...p, comment: e.target.value }))} /></div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-white border-t px-4 md:px-6 py-3 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setMode("list")}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-orange-action hover:bg-orange-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Record
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={() => { setF(emptyForm(defaultZoneId, defaultStateId)); setMode("form"); }}>
            <Plus className="w-4 h-4" /> New Record
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); }}>
                  <SelectTrigger className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full" displayValue={
                    stateLocked
                      ? pickGeoLabel(dashboardStates, filterState, "State")
                      : (filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State"))
                  }>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="w-4 h-4" />
                {loading ? "Loading..." : `${rows.length} record(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Reference</TableHead>
                        <TableHead className="text-xs font-bold">HMO</TableHead>
                        <TableHead className="text-xs font-bold">Facility</TableHead>
                        <TableHead className="text-xs font-bold text-right">Amount</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-slate-100">
                          <TableCell className="font-mono text-xs text-primary">{r.reference_id}</TableCell>
                          <TableCell className="text-sm">{r.hmo}</TableCell>
                          <TableCell className="text-sm">{r.facility}</TableCell>
                          <TableCell className="text-right text-sm">{formatCount(r.amount_owed)}</TableCell>
                          <TableCell className="text-xs">{r.recon_status || "—"}</TableCell>
                          <TableCell className="text-xs">{r.state?.description ?? "—"}</TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
