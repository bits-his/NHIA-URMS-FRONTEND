import * as React from "react";
import {
  ArrowLeft, Plus, RefreshCw, Loader2, Eye,
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
import { stateOfficeEnrolleeComplaintsApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import {
  MONTHS, COMPLAINT_SUMMARY_CATEGORIES, COMPLAINT_STATUS_TYPES, labelOf, formatCount, monthLabel,
} from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Mode = "dashboard" | "register" | "drilldown";

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null) => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  against_type: "against_hmo",
  entity_provider_id: "",
  entity_name: "",
  entity_code: "",
  complaint_date: new Date().toISOString().slice(0, 10),
  description: "",
  status: "pending",
  assigned_officer: "",
});

function pickGeoLabel(
  options: { id: number; description?: string }[],
  value: string,
  fallback: string,
) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

export default function StateOfficeComplaintsPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [mode, setMode] = React.useState<Mode>("dashboard");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [summary, setSummary] = React.useState<{ against_type: string; count: number }[]>([]);
  const [statusCounts, setStatusCounts] = React.useState<{ status: string; count: number }[]>([]);
  const [totalComplaints, setTotalComplaints] = React.useState(0);
  const [drilldownTitle, setDrilldownTitle] = React.useState("");
  const [drilldownRows, setDrilldownRows] = React.useState<any[]>([]);
  const [drilldownLoading, setDrilldownLoading] = React.useState(false);

  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [dashboardStates, setDashboardStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId));

  const {
    filterState, setFilterState, apiStateId,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear,
    month: filterMonth,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const loadSummary = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeEnrolleeComplaintsApi.summary(apiFilters);
      setSummary(res.data.summary);
      setStatusCounts(res.data.status);
      setTotalComplaints(res.data.total_complaints);
    } catch (err: any) {
      toast.error("Failed to load complaints summary", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters]);

  React.useEffect(() => { if (mode === "dashboard") loadSummary(); }, [loadSummary, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => {
    if (!f.zone_id) { setStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id]);

  React.useEffect(() => {
    if (defaultZoneId) setFilterZone(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    if (!zid) { setDashboardStates([]); return; }
    stockApi.getStates(zid).then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);

  const openDrilldown = async (type: "against" | "status", value: string, title: string) => {
    setDrilldownTitle(title);
    setDrilldownLoading(true);
    setMode("drilldown");
    try {
      const filters = {
        ...apiFilters,
        ...(type === "against" ? { against_type: value } : { status: value }),
      };
      const res = await stateOfficeEnrolleeComplaintsApi.list(filters);
      setDrilldownRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load complaints", { description: err.message });
    } finally { setDrilldownLoading(false); }
  };

  const handleCreate = async () => {
    if (!f.zone_id || !f.state_id || !f.entity_name.trim() || !f.description.trim()) {
      toast.error("Zone, state, name, and description are required.");
      return;
    }
    setSaving(true);
    try {
      await stateOfficeEnrolleeComplaintsApi.create({
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
        against_type: f.against_type,
        entity_name: f.entity_name,
        entity_code: f.entity_code || null,
        complaint_date: f.complaint_date,
        description: f.description,
        status: f.status,
        assigned_officer: f.assigned_officer || null,
        reporting_year: Number(filterYear),
        reporting_month: Number(filterMonth),
      });
      toast.success("Complaint registered");
      setMode("dashboard");
      setF(emptyForm(defaultZoneId, defaultStateId));
      loadSummary();
    } catch (err: any) {
      toast.error("Failed to register complaint", { description: err.message });
    } finally { setSaving(false); }
  };

  const countFor = (against_type: string) =>
    summary.find((s) => s.against_type === against_type)?.count ?? 0;

  const countStatus = (status: string) =>
    statusCounts.find((s) => s.status === status)?.count ?? 0;

  if (mode === "drilldown") {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => { setMode("dashboard"); setDrilldownRows([]); }} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4">
            {drilldownLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Number</TableHead>
                        <TableHead className="text-xs font-bold">Against</TableHead>
                        <TableHead className="text-xs font-bold">Name</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownRows.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No complaints found</TableCell></TableRow>
                      ) : drilldownRows.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.complaint_number}</TableCell>
                          <TableCell className="text-xs">{labelOf(COMPLAINT_SUMMARY_CATEGORIES, c.against_type, c.against_type)}</TableCell>
                          <TableCell className="text-sm">{c.entity_name}</TableCell>
                          <TableCell className="text-xs">{c.complaint_date}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{labelOf(COMPLAINT_STATUS_TYPES, c.status, c.status)}</Badge></TableCell>
                          <TableCell className="text-xs">{c.state?.description ?? "—"}</TableCell>
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

  if (mode === "register") {
    const providerType = f.against_type === "against_hmo" ? "hmo" : "hcp";
    const entityLabel = f.against_type === "against_hmo" ? "HMO" : "HCP";
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-24">
            <Card className="rounded-2xl border-[#d4e8dc] w-full overflow-visible py-0 gap-0">
              <CardHeader className="pb-3 pt-4 px-4 md:px-6 border-b border-[#e6f2eb] bg-[#f6fbf8]">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMode("dashboard")}
                    className="rounded-full hover:bg-[#e8f5ee] shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                    New Complaint
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 md:p-6">
                <div className="space-y-2">
                  <Label>Zone *</Label>
                  <Select
                    value={f.zone_id}
                    disabled={zoneLocked}
                    onValueChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: stateLocked ? p.state_id : "" }))}
                  >
                    <SelectTrigger className="w-full" displayValue={pickGeoLabel(zones, f.zone_id, "Zone")}>
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={f.state_id} disabled={stateLocked} onValueChange={(v) => setF((p) => ({
                    ...p, state_id: v, entity_provider_id: "", entity_name: "", entity_code: "",
                  }))}>
                    <SelectTrigger className="w-full" displayValue={pickGeoLabel(states, f.state_id, "State")}>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Complaint Against *</Label>
                  <Select
                    value={f.against_type}
                    onValueChange={(v) => setF((p) => ({
                      ...p,
                      against_type: v,
                      entity_provider_id: "",
                      entity_name: "",
                      entity_code: "",
                    }))}
                  >
                    <SelectTrigger className="w-full" displayValue={labelOf(COMPLAINT_SUMMARY_CATEGORIES, f.against_type, "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLAINT_SUMMARY_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{entityLabel} *</Label>
                  <AccreditedProviderSelect
                    key={`${f.against_type}-${f.state_id}`}
                    type={providerType}
                    stateId={f.state_id}
                    value={f.entity_provider_id}
                    placeholder={`Search and select accredited ${entityLabel}`}
                    onChange={(p) => setF((prev) => ({
                      ...prev,
                      entity_provider_id: p?.id ?? "",
                      entity_name: p?.name ?? "",
                      entity_code: p?.code ?? "",
                    }))}
                  />
                </div>
                <div className="space-y-2"><Label>Date</Label><Input className="w-full" type="date" value={f.complaint_date} onChange={(e) => setF((p) => ({ ...p, complaint_date: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={f.status} onValueChange={(v) => setF((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="w-full" displayValue={labelOf(COMPLAINT_STATUS_TYPES, f.status, "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLAINT_STATUS_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Officer</Label>
                  <Input className="w-full" value={f.assigned_officer} onChange={(e) => setF((p) => ({ ...p, assigned_officer: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input className="w-full" value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 z-30 bg-white border-t px-4 md:px-6 py-3 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setMode("dashboard")}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-orange-action hover:bg-orange-600 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Complaint
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={() => { setF(emptyForm(defaultZoneId, defaultStateId)); setMode("register"); }}>
            <Plus className="w-4 h-4" /> Register Complaint
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
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-full" displayValue={monthLabel(filterMonth)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                <CardHeader className="pb-3 border-b bg-[#f0fdf7]/50">
                  <CardTitle className="text-sm font-bold">Complaints Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Category</TableHead>
                        <TableHead className="text-xs font-bold text-right">No. of Complaints</TableHead>
                        <TableHead className="text-xs font-bold w-16 text-center">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COMPLAINT_SUMMARY_CATEGORIES.map((cat, i) => (
                        <motion.tr key={cat.value} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          className="border-b border-slate-100">
                          <TableCell className="font-medium text-sm">{cat.label}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCount(countFor(cat.value))}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => openDrilldown("against", cat.value, `${cat.label} — Complaints`)}
                              disabled={countFor(cat.value) === 0}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                <CardHeader className="pb-3 border-b bg-[#f0fdf7]/50">
                  <CardTitle className="text-sm font-bold">Complaint Status</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Count</TableHead>
                        <TableHead className="text-xs font-bold w-16 text-center">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COMPLAINT_STATUS_TYPES.map((st, i) => (
                        <motion.tr key={st.value} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          className="border-b border-slate-100">
                          <TableCell className="font-medium text-sm">{st.label}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCount(countStatus(st.value))}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => openDrilldown("status", st.value, `${st.label} Complaints`)}
                              disabled={countStatus(st.value) === 0}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
