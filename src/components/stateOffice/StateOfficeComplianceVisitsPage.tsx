import * as React from "react";
import {
  ArrowLeft, Plus, Eye, RefreshCw, Loader2, ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeComplianceVisitsApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null) => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  facility_visited: "",
  visit_date: new Date().toISOString().slice(0, 10),
  purpose: "",
  outcome: "",
});

function pickGeoLabel(
  options: { id: number; description?: string }[],
  value: string,
  fallback: string,
) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function StateOfficeComplianceVisitsPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [mode, setMode] = React.useState<"list" | "form">("list");
  const [visits, setVisits] = React.useState<any[]>([]);
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
      const res = await stateOfficeComplianceVisitsApi.list(apiFilters);
      setVisits(res.data);
    } catch (err: any) {
      toast.error("Failed to load visits", { description: err.message });
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
    if (!f.zone_id) return;
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id]);

  const handleCreate = async () => {
    if (!f.zone_id || !f.state_id || !f.facility_visited.trim()) {
      toast.error("Zone, state, and facility are required.");
      return;
    }
    setSaving(true);
    try {
      await stateOfficeComplianceVisitsApi.create({
        ...f,
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
        reporting_year: Number(filterYear),
        reporting_month: Number(filterMonth),
        status: "submitted",
      });
      toast.success("Compliance visit recorded");
      setMode("list");
      setF(emptyForm(defaultZoneId, defaultStateId));
    } catch (err: any) {
      toast.error("Failed to save visit", { description: err.message });
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
            <Card className="rounded-2xl border-[#d4e8dc]">
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
                <div className="space-y-2"><Label>Facility Visited *</Label><Input value={f.facility_visited} onChange={(e) => setF((p) => ({ ...p, facility_visited: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Visit Date</Label><Input type="date" value={f.visit_date} onChange={(e) => setF((p) => ({ ...p, visit_date: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Purpose</Label><Input value={f.purpose} onChange={(e) => setF((p) => ({ ...p, purpose: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Outcome</Label><Input value={f.outcome} onChange={(e) => setF((p) => ({ ...p, outcome: e.target.value }))} /></div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-white border-t px-4 md:px-6 py-3 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setMode("list")}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-orange-action hover:bg-orange-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Visit
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
            <Plus className="w-4 h-4" /> New Visit
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
                <ClipboardList className="w-4 h-4" />
                {loading ? "Loading..." : `${visits.length} visit(s)`}
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
                        <TableHead className="text-xs font-bold">Facility</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Purpose</TableHead>
                        <TableHead className="text-xs font-bold">Outcome</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((v, i) => (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-slate-100">
                          <TableCell className="font-mono text-xs font-bold text-primary">{v.reference_id}</TableCell>
                          <TableCell className="text-sm">{v.facility_visited}</TableCell>
                          <TableCell className="text-xs">{safeDate(v.visit_date)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{v.purpose || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{v.outcome || "—"}</TableCell>
                          <TableCell className="text-xs">{v.state?.description ?? "—"}</TableCell>
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
