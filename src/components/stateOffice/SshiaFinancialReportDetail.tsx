import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  REPORT_CONFIG, SSHIA_SUB_HEADS, SSHIA_COLUMNS,
  monthLabel, quarterFromMonth, labelOf, formatNaira, formatDate,
} from "./constants";

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

const cfg = REPORT_CONFIG["sshia-financial"];
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

  const lines: Record<string, unknown>[] = (report?.lines as Record<string, unknown>[]) ?? [];
  const quarter = report ? quarterFromMonth(report.reporting_month as number) : 0;

  const totals = React.useMemo(() => lines.reduce((acc, l) => ({
    A: acc.A + (Number(l.opening_balance) || 0),
    B: acc.B + (Number(l.receipts) || 0),
    C: acc.C + (Number(l.total_budget) || 0),
    D: acc.D + (Number(l.actual_expenditure) || 0),
    E: acc.E + (Number(l.balance) || 0),
  }), { A: 0, B: 0, C: 0, D: 0, E: 0 }), [lines]);

  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {report?.status === "draft" && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Pencil className="w-4 h-4" /> Edit Draft
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading report...</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base">Report Summary</CardTitle>
                      <CardDescription>Basic information for this submission.</CardDescription>
                    </div>
                    {statusCfg && (
                      <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
                      <InfoField label="Zone" value={(report.zone as { description?: string })?.description ?? "—"} />
                      <InfoField label="State (SSHIA)" value={(report.state as { description?: string })?.description ?? "—"} />
                      <InfoField label="Reporting Month" value={monthLabel(report.reporting_month as number)} />
                      <InfoField label="Quarter" value={`Q${quarter}`} />
                      <InfoField label="Financial Year" value={String(report.reporting_year)} />
                      <InfoField label="Date of Submission" value={formatDate(report.submission_date as string)} />
                      <InfoField label="Submitted By" value={String(report.submitted_by ?? "—")} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-3 border-b border-[#d4e8dc] bg-[#f8fdfb]">
                    <CardTitle className="text-base">Financial Progress</CardTitle>
                    <CardDescription>{lines.length} sub-head(s)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {lines.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm">No line items recorded.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                              <TableHead className="text-xs font-bold text-slate-600 w-12">#</TableHead>
                              <TableHead className="text-xs font-bold text-slate-600">Sub-head</TableHead>
                              {SSHIA_COLUMNS.map(col => (
                                <TableHead key={col.key} className="text-xs font-bold text-slate-600 text-right min-w-[7rem]">
                                  <div>{col.label}</div>
                                  <div className="text-[10px] font-normal text-slate-500 whitespace-nowrap">
                                    {col.code}{col.hint ? ` = ${col.hint}` : ""} ({col.unit})
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line, i) => (
                              <TableRow key={String(line.id ?? i)} className="hover:bg-[#f8fdfb]">
                                <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  {labelOf(SSHIA_SUB_HEADS, String(line.sub_head ?? ""))}
                                </TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.opening_balance as number)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.receipts as number)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.total_budget as number)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.actual_expenditure as number)}</TableCell>
                                <TableCell className="text-sm text-right font-semibold tabular-nums">{formatNaira(line.balance as number)}</TableCell>
                                <TableCell className="text-sm text-right tabular-nums">
                                  {Number(line.variance_pct || 0).toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                              <TableCell colSpan={2} className="text-sm text-right text-slate-600">Totals</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.A)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.B)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.C)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.D)}</TableCell>
                              <TableCell className="text-sm text-right text-primary tabular-nums">{formatNaira(totals.E)}</TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
