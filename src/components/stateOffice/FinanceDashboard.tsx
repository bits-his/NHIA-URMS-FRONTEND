import * as React from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { financeDashboardApi, stockApi } from "@/lib/api";
import { IGR_SERVICE_TYPES, SSHIA_SUB_HEADS, MONTHS, formatNaira, labelOf } from "./constants";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  lockZone?: boolean;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#d4e8dc] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-[#145c3f] mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}

function BarList({
  items,
}: {
  items: { label: string; value: number; max: number; suffix?: string }[];
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-400 py-6 text-center">No data for the selected filters.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = item.max > 0 ? Math.max(2, (item.value / item.max) * 100) : 0;
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-xs mb-1">
              <span className="font-medium text-slate-700 truncate">{item.label}</span>
              <span className="tabular-nums text-slate-600 shrink-0">
                {item.suffix ?? formatNaira(item.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#1a7a52]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FinanceDashboard({
  onBack, defaultZoneId, defaultStateId, lockZone,
}: Props) {
  const yearNow = new Date().getFullYear();
  const [year, setYear] = React.useState(String(yearNow));
  const [igrMonth, setIgrMonth] = React.useState("all");
  const [sshiaQuarter, setSshiaQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [service, setService] = React.useState("all");
  const [subHead, setSubHead] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [igr, setIgr] = React.useState<any>(null);
  const [sshia, setSshia] = React.useState<any>(null);

  React.useEffect(() => {
    stockApi.getZones().then((r) => {
      setZones((r.data || []).map((z: any) => ({ id: String(z.id), label: z.description })));
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!zoneId || zoneId === "all") {
      setStates([]);
      if (!defaultStateId) setStateId("all");
      return;
    }
    stockApi.getStates(zoneId).then((r) => {
      setStates((r.data || []).map((s: any) => ({ id: String(s.id), label: s.description })));
    }).catch(() => {});
  }, [zoneId, defaultStateId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        year,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        month: igrMonth !== "all" ? igrMonth : undefined,
        quarter: sshiaQuarter !== "all" ? sshiaQuarter : undefined,
        service_type: service !== "all" ? service : undefined,
        sub_head: subHead !== "all" ? subHead : undefined,
      };
      const [igrRes, sshiaRes] = await Promise.all([
        financeDashboardApi.igr({
          year: filters.year,
          zone_id: filters.zone_id,
          state_id: filters.state_id,
          month: filters.month,
          service_type: filters.service_type,
        }),
        financeDashboardApi.sshia({
          year: filters.year,
          zone_id: filters.zone_id,
          state_id: filters.state_id,
          quarter: filters.quarter,
          sub_head: filters.sub_head,
        }),
      ]);
      setIgr(igrRes.data);
      setSshia(sshiaRes.data);
    } catch (err: any) {
      toast.error("Failed to load finance dashboard", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [year, zoneId, stateId, igrMonth, sshiaQuarter, service, subHead]);

  React.useEffect(() => { load(); }, [load]);

  const igrServiceBars = React.useMemo(() => {
    const rows = igr?.by_service || [];
    const max = Math.max(0, ...rows.map((r: any) => Number(r.amount) || 0));
    return rows.map((r: any) => ({
      label: labelOf(IGR_SERVICE_TYPES, r.service_type, r.service_type),
      value: Number(r.amount) || 0,
      max,
    }));
  }, [igr]);

  const igrStateBars = React.useMemo(() => {
    const rows = (igr?.by_state || []).slice(0, 10);
    const max = Math.max(0, ...rows.map((r: any) => Number(r.amount) || 0));
    return rows.map((r: any) => ({ label: r.label, value: Number(r.amount) || 0, max }));
  }, [igr]);

  const sshiaSubBars = React.useMemo(() => {
    const rows = sshia?.by_sub_head || [];
    const max = Math.max(0, ...rows.map((r: any) => Number(r.actual) || 0));
    return rows.map((r: any) => ({
      label: r.label,
      value: Number(r.actual) || 0,
      max,
    }));
  }, [sshia]);

  const sshiaUtilBars = React.useMemo(() => {
    const rows = sshia?.by_sub_head || [];
    return rows.map((r: any) => ({
      label: r.label,
      value: Number(r.utilisation_rate) || 0,
      max: 100,
      suffix: r.utilisation_rate == null ? "N/A" : `${Number(r.utilisation_rate).toFixed(1)}%`,
    }));
  }, [sshia]);

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Finance Dashboard</h2>
            <p className="text-xs text-slate-500">IGR Performance · SSHIA Progress · Expenditure excluded</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <Card className="border-[#d4e8dc]">
          <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[yearNow, yearNow - 1, yearNow - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IGR month</Label>
              <Select value={igrMonth} onValueChange={setIgrMonth}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SSHIA quarter</Label>
              <Select value={sshiaQuarter} onValueChange={setSshiaQuarter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quarters</SelectItem>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zone</Label>
              <Select value={zoneId} onValueChange={setZoneId} disabled={!!lockZone || !!defaultZoneId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Select value={stateId} onValueChange={setStateId} disabled={!!defaultStateId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IGR service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {IGR_SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SSHIA sub-head</Label>
              <Select value={subHead} onValueChange={setSubHead}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sub-heads</SelectItem>
                  {SSHIA_SUB_HEADS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading finance metrics…</span>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">A. IGR Performance</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Total IGR" value={formatNaira(igr?.kpis?.total_igr || 0)} hint="Sum of receipt amounts" />
                <Kpi label="Receipts" value={String(igr?.kpis?.receipt_count || 0)} hint="Transaction count" />
                <Kpi
                  label="Average receipt"
                  value={igr?.kpis?.average_receipt == null ? "—" : formatNaira(igr.kpis.average_receipt)}
                />
                <Kpi
                  label="Top service"
                  value={igr?.kpis?.top_service
                    ? labelOf(IGR_SERVICE_TYPES, igr.kpis.top_service.service_type, igr.kpis.top_service.service_type)
                    : "—"}
                  hint={igr?.kpis?.missing_references ? `${igr.kpis.missing_references} missing refs` : undefined}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-[#d4e8dc]">
                  <CardHeader className="pb-2"><CardTitle className="text-base">IGR by service</CardTitle></CardHeader>
                  <CardContent><BarList items={igrServiceBars} /></CardContent>
                </Card>
                <Card className="border-[#d4e8dc]">
                  <CardHeader className="pb-2"><CardTitle className="text-base">IGR by state</CardTitle></CardHeader>
                  <CardContent><BarList items={igrStateBars} /></CardContent>
                </Card>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">B. SSHIA Progress</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Budget available" value={formatNaira(sshia?.kpis?.budget_available || 0)} />
                <Kpi label="Actual expenditure" value={formatNaira(sshia?.kpis?.actual_expenditure || 0)} />
                <Kpi label="Balance" value={formatNaira(sshia?.kpis?.balance || 0)} />
                <Kpi
                  label="BHCPF lives"
                  value={String(sshia?.kpis?.bhcpf_lives_covered || 0)}
                  hint={sshia?.kpis?.utilisation_rate == null
                    ? undefined
                    : `Utilisation ${Number(sshia.kpis.utilisation_rate).toFixed(1)}%`}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-[#d4e8dc]">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Actual spend by sub-head</CardTitle></CardHeader>
                  <CardContent><BarList items={sshiaSubBars} /></CardContent>
                </Card>
                <Card className="border-[#d4e8dc]">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Utilisation by sub-head</CardTitle></CardHeader>
                  <CardContent><BarList items={sshiaUtilBars} /></CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
