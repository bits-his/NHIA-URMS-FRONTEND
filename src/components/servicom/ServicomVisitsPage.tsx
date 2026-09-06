import * as React from "react";
import {
  ArrowLeft, Plus, Eye, RefreshCw, Loader2, ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { servicomApi } from "@/lib/api";
import ServicomVisitForm from "./ServicomVisitForm";
import { COMPLIANCE_LABELS, MONITORING_TYPES, VISIT_STATUS, pickLabel, pickStatusLabel } from "./servicomConstants";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ServicomVisitsPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [mode, setMode] = React.useState<"list" | "form">("list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [visits, setVisits] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterType, setFilterType] = React.useState("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.listVisits({
        status: filterStatus !== "all" ? filterStatus : undefined,
        monitoring_type: filterType !== "all" ? filterType : undefined,
        state_id: defaultStateId ?? undefined,
        zone_id: defaultZoneId ?? undefined,
      });
      setVisits(res.data);
    } catch (err: any) {
      toast.error("Failed to load visits", { description: err.message });
    } finally { setLoading(false); }
  }, [filterStatus, filterType, defaultStateId, defaultZoneId]);

  React.useEffect(() => { load(); }, [load]);

  const openNew = () => { setSelectedId(null); setMode("form"); };
  const openView = (id: number) => { setSelectedId(id); setMode("form"); };
  const closeForm = () => { setSelectedId(null); setMode("list"); load(); };

  if (mode === "form") {
    return (
      <ServicomVisitForm
        visitId={selectedId}
        onBack={closeForm}
        defaultStateId={defaultStateId}
        defaultZoneId={defaultZoneId}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openNew}>
            <Plus className="w-4 h-4" /> New Visit
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-row items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full"
                      displayValue={
                        filterStatus === "all"
                          ? "All Statuses"
                          : pickStatusLabel(VISIT_STATUS, filterStatus, "All Statuses")
                      }>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(VISIT_STATUS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-0">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full"
                      displayValue={
                        filterType === "all"
                          ? "All Types"
                          : pickLabel(MONITORING_TYPES, filterType, "All Types")
                      }>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {MONITORING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {loading ? "Loading..." : `${visits.length} visit(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <ClipboardList className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">No monitoring visits yet</p>
                  <Button variant="outline" size="sm" onClick={openNew} className="mt-2 gap-2">
                    <Plus className="w-4 h-4" /> New Visit
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Reference</TableHead>
                        <TableHead className="text-xs font-bold">Facility</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                        <TableHead className="text-xs font-bold">Type</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold text-right">Score</TableHead>
                        <TableHead className="text-xs font-bold">Rating</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-right text-xs font-bold">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((v, i) => {
                        const sc = VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? VISIT_STATUS.draft;
                        return (
                          <motion.tr key={v.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-[#f8fdfb] border-b border-slate-100">
                            <TableCell><span className="font-mono text-xs font-bold text-primary">{v.reference_id}</span></TableCell>
                            <TableCell className="text-sm font-semibold">{v.facility_name}</TableCell>
                            <TableCell className="text-sm">{v.state?.description ?? "—"}</TableCell>
                            <TableCell className="text-xs capitalize">{v.monitoring_type?.replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-xs text-slate-500">{safeDate(v.visit_date)}</TableCell>
                            <TableCell className="text-xs text-right font-bold">{v.percentage_score != null ? `${v.percentage_score}%` : "—"}</TableCell>
                            <TableCell className="text-xs">{v.compliance_rating ? COMPLIANCE_LABELS[v.compliance_rating] : "—"}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 border ${sc.cls}`}>{sc.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openView(v.id)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
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
