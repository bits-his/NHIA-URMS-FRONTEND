import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  REPORT_CONFIG, EXPENDITURE_SUB_HEADS,
  monthLabel, formatNaira, formatAllocationPct,
} from "./constants";

interface Props {
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  );
}

const cfg = REPORT_CONFIG["expenditure-profile"];
const api = stateOfficeApi["expenditure-profile"];

export default function ExpenditureProfileReportDetail({ reportId, onBack, onEdit }: Props) {
  const [report, setReport] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: unknown) {
        if (!cancelled) toast.error("Failed to load report", { description: (err as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const canUpdate = !!onEdit && report?.status === "draft";

  const rows = React.useMemo(() => {
    if (!report) return [];
    return EXPENDITURE_SUB_HEADS.flatMap((h) => {
      const raw = report[h.value];
      if (raw == null || raw === "") return [];
      const amount = Number(raw);
      if (!Number.isFinite(amount)) return [];
      return [{ ...h, amount }];
    });
  }, [report]);

  const total = React.useMemo(
    () => rows.reduce((s, r) => s + r.amount, 0),
    [rows],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <p className="text-sm text-slate-500">Report not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{cfg.title}</h2>
            <p className="text-xs text-slate-500 truncate">
              <span className="font-mono font-semibold text-[#145c3f]">{String(report.reference_id)}</span>
              {" · "}{monthLabel(report.reporting_month as number)} {String(report.reporting_year)}
              {" · Q"}{String(report.reporting_quarter || "")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusCfg && (
            <Badge variant="outline" className={`gap-1 ${statusCfg.cls}`}>
              {statusCfg.icon}{statusCfg.label}
            </Badge>
          )}
          {canUpdate && (
            <Button size="sm" className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e]" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" /> Update
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Reporting context</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Zone" value={String((report.zone as any)?.description || report.zonal_code || "—")} />
            <InfoField label="State" value={String((report.state as any)?.description || report.state_code || "—")} />
            <InfoField label="Quarter" value={`Q${report.reporting_quarter}`} />
            <InfoField label="Total" value={formatNaira(total)} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses recorded</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            {rows.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">No amounts recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7] border-[#d4e8dc]">
                      <TableHead className="text-xs font-bold text-slate-600">Expense category</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Allocation %</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Amount (₦)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.value} className="border-[#e6f0ea]">
                        <TableCell className="text-sm font-medium text-slate-800">{r.label}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-slate-500">
                          {formatAllocationPct(r.allocation)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-semibold text-[#145c3f]">
                          {formatNaira(r.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-[#f4faf7] border-[#d4e8dc] hover:bg-[#f4faf7]">
                      <TableCell className="text-sm font-bold text-slate-800">Total</TableCell>
                      <TableCell className="text-sm text-right font-semibold tabular-nums text-slate-500">100%</TableCell>
                      <TableCell className="text-sm text-right font-bold tabular-nums text-[#145c3f]">
                        {formatNaira(total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {canUpdate && (
          <div className="flex justify-end">
            <Button className="gap-1.5 bg-orange-action hover:bg-orange-600" onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Update & Submit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
