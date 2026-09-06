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
  REPORT_CONFIG, ENROLMENT_CATEGORIES, MIGRATION_REQUEST_TYPES, CEMONC_INTERVENTIONS,
  monthLabel, quarterFromMonth, labelOf, formatCount, formatDate, reportLineTotal,
  type StateOfficeReportType,
} from "./constants";

interface Props {
  reportType: StateOfficeReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function StateOfficeReportDetail({ reportType, reportId, onBack, onEdit }: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const api = stateOfficeApi[reportType];
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reportId]);

  const lines: any[] = report?.lines ?? [];
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const total = React.useMemo(() => reportLineTotal(reportType, report ?? {}), [report, reportType]);

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
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                      <InfoField label="Zone" value={report.zone?.description ?? "—"} />
                      <InfoField label="State" value={report.state?.description ?? "—"} />
                      <InfoField label="Reporting Month" value={monthLabel(report.reporting_month)} />
                      <InfoField label="Quarter" value={`Q${quarter}`} />
                      <InfoField label="Reporting Year" value={String(report.reporting_year)} />
                      <InfoField label="Date of Submission" value={formatDate(report.submission_date)} />
                      <InfoField label="Submitted By" value={report.submitted_by ?? "—"} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-3 border-b border-[#d4e8dc] bg-[#f8fdfb]">
                    <CardTitle className="text-base">{cfg.title} Data</CardTitle>
                    <CardDescription>{lines.length} line item(s)</CardDescription>
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
                              {reportType === "cemonc" ? (
                                <>
                                  <TableHead className="text-xs font-bold text-slate-600">Intervention</TableHead>
                                  <TableHead className="text-xs font-bold text-slate-600">Facility Name</TableHead>
                                </>
                              ) : (
                                <TableHead className="text-xs font-bold text-slate-600">{cfg.refLabel}</TableHead>
                              )}
                              <TableHead className="text-xs font-bold text-slate-600 text-right">{cfg.countLabel}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line, i) => (
                              <TableRow key={line.id ?? i} className="hover:bg-[#f8fdfb]">
                                <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                                {reportType === "enrolment" && (
                                  <>
                                    <TableCell className="text-sm font-medium">
                                      {labelOf(ENROLMENT_CATEGORIES, line.category)}
                                    </TableCell>
                                    <TableCell className="text-sm text-right font-semibold tabular-nums">
                                      {formatCount(line.enrolment_count)}
                                    </TableCell>
                                  </>
                                )}
                                {reportType === "migration" && (
                                  <>
                                    <TableCell className="text-sm font-medium">
                                      {labelOf(MIGRATION_REQUEST_TYPES, line.request_type)}
                                    </TableCell>
                                    <TableCell className="text-sm text-right font-semibold tabular-nums">
                                      {formatCount(line.request_count)}
                                    </TableCell>
                                  </>
                                )}
                                {reportType === "cemonc" && (
                                  <>
                                    <TableCell className="text-sm font-medium">
                                      {labelOf(CEMONC_INTERVENTIONS, line.intervention_type)}
                                    </TableCell>
                                    <TableCell className="text-sm">{line.facility_name ?? "—"}</TableCell>
                                    <TableCell className="text-sm text-right font-semibold tabular-nums">
                                      {formatCount(line.beneficiaries)}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                              <TableCell colSpan={reportType === "cemonc" ? 3 : 2} className="text-sm text-right text-slate-600">
                                {cfg.totalLabel}
                              </TableCell>
                              <TableCell className="text-sm text-right text-primary tabular-nums">
                                {formatCount(total)}
                              </TableCell>
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
