import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  SSHIA_SUB_HEADS, monthLabel, formatNaira, calcSshiaLine,
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

const api = stateOfficeApi["sshia-financial"];

export default function SshiaFinancialReportDetail({ reportId, onBack, onEdit }: Props) {
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

  /** Only sub-heads that were actually filled (each is entered on its own). */
  const filled = React.useMemo(() => {
    if (!report) return [];
    return SSHIA_SUB_HEADS.flatMap((h) => {
      const p = h.prefix;
      const opening = report[`${p}_opening_balance`] as number | null | undefined;
      const receipts = report[`${p}_receipts`] as number | null | undefined;
      const actual = report[`${p}_actual_expenditure`] as number | null | undefined;
      const lives = report[`${p}_bhcpf_lives`] as number | null | undefined;
      if (opening == null && receipts == null && actual == null && lives == null) return [];
      const derived = calcSshiaLine(opening, receipts, actual);
      return [{
        label: h.label,
        opening,
        receipts,
        actual,
        lives,
        ...derived,
      }];
    });
  }, [report]);

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

  const money = (v: number | null | undefined) => (v == null ? "—" : formatNaira(v));

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">SSHIA Progress Report</h2>
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
            <InfoField label="Submitted by" value={String(report.submitted_by || "—")} />
          </CardContent>
        </Card>

        {filled.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No sub-head filled yet. Use Update to add one.
            </CardContent>
          </Card>
        ) : filled.map((row) => (
          <Card key={row.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{row.label}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Opening (A)" value={money(row.opening)} />
              <InfoField label="Receipts (B)" value={money(row.receipts)} />
              <InfoField label="Available (C = A + B)" value={money(row.total_budget)} />
              <InfoField label="Actual (D)" value={money(row.actual)} />
              <InfoField label="Balance (E = C − D)" value={money(row.balance)} />
              <InfoField
                label="Variance (F = D ÷ C × 100)"
                value={row.variance_pct == null ? "N/A" : `${Number(row.variance_pct).toFixed(1)}%`}
              />
              <InfoField label="BHCPF lives" value={row.lives == null ? "—" : String(row.lives)} />
            </CardContent>
          </Card>
        ))}

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
