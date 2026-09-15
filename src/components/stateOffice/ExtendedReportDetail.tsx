import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import {
  REPORT_CONFIG, ACCREDITATION_INDICATORS, ACCREDITATION_PROCESS_TYPES,
  ACCREDITATION_ENTRY_TYPES, expandAccreditationLines,
  COMPLAINT_SUMMARY_CATEGORIES, COMPLAINT_STATUS_TYPES,
  EXTRA_DEPENDANT_RELATIONSHIPS, EXTRA_DEPENDANT_STATUSES, parseSupportingDocuments,
  YES_NO_OPTIONS, HCP_CHANGE_CHANNELS, HCP_CHANGE_STATUSES,
  monthLabel, quarterFromMonth, labelOf, formatCount, formatDate, type StateOfficeReportType,
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

export default function ExtendedReportDetail({ reportType, reportId, onBack, onEdit }: Props) {
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

  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {report?.status === "draft" && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2"><Pencil className="w-4 h-4" /> Edit Draft</Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading report...</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : (
            <>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div><CardTitle className="text-base">Report Summary</CardTitle><CardDescription>Basic information</CardDescription></div>
                  {statusCfg && <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>{statusCfg.icon} {statusCfg.label}</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                    <InfoField label="Zone" value={report.zone?.description ?? "—"} />
                    <InfoField label="State" value={report.state?.description ?? "—"} />
                    <InfoField label="Month" value={monthLabel(report.reporting_month)} />
                    <InfoField label="Quarter" value={`Q${quarter}`} />
                    <InfoField label="Year" value={String(report.reporting_year)} />
                    <InfoField label="Submitted" value={formatDate(report.submission_date)} />
                    <InfoField label="By" value={report.submitted_by ?? "—"} />
                  </div>
                </CardContent>
              </Card>

              {reportType === "complaints" && (
                <>
                  <DataCard title="Complaints Summary" headers={["Category", "Number"]}
                    rows={(report.summary_lines ?? []).map((l: any) => [labelOf(COMPLAINT_SUMMARY_CATEGORIES, l.category), formatCount(l.complaint_count)])} />
                  <DataCard title="Complaint Status" headers={["Status", "Number"]}
                    rows={(report.status_lines ?? []).map((l: any) => [labelOf(COMPLAINT_STATUS_TYPES, l.status), formatCount(l.status_count)])} />
                  <DataCard title="Compliance Visits" headers={["Facility", "Date", "Purpose", "Outcome"]}
                    rows={(report.visit_lines ?? []).map((l: any) => [l.facility_visited, l.visit_date || "—", l.purpose || "—", l.outcome || "—"])} />
                  <DataCard title="Reconciliation Meetings" headers={["HMO", "Facility", "Amount", "Status", "Comment"]}
                    rows={(report.reconciliation_lines ?? []).map((l: any) => [l.hmo, l.facility, formatCount(l.amount_owed), l.recon_status || "—", l.comment || "—"])} />
                </>
              )}

              {reportType === "accreditation" && (
                <DataCard title="Accreditation / Reaccreditation"
                  headers={["Accreditation / Reaccreditation", "Category", "Primary", "Secondary", "Total"]}
                  rows={expandAccreditationLines(report.lines ?? []).map((r) => [
                    labelOf(ACCREDITATION_PROCESS_TYPES, r.process, r.process),
                    labelOf(ACCREDITATION_ENTRY_TYPES, r.entry, r.entry),
                    formatCount(r.primary_count),
                    formatCount(r.secondary_count),
                    formatCount(r.primary_count + r.secondary_count),
                  ])} />
              )}

              {reportType === "stakeholder" && (
                <DataCard title="Stakeholder Engagement" headers={["Activity", "Audience", "Organization", "Location", "Date", "Outcomes"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.activity, formatCount(l.audience_size), l.organization || "—", l.location || "—",
                    l.activity_date || "—", l.key_outcomes || "—",
                  ])} />
              )}

              {reportType === "hmo-selection" && (
                <DataCard title="MDA Change of HMO Selection Process"
                  headers={["Date", "MDA", "Former HMO", "Reason", "Invited", "Attended", "Guideline", "Transparent", "Selected HMO", "Evidence", "Full report"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.selection_date || "—",
                    l.mda,
                    l.former_hmo || "—",
                    l.reason_for_change || "—",
                    l.hmos_invited ?? "—",
                    l.hmos_attended ?? l.hmos_in_attendance ?? "—",
                    labelOf(YES_NO_OPTIONS, l.compliance_guideline, l.compliance_guideline || "—"),
                    labelOf(YES_NO_OPTIONS, l.transparent_process, l.transparent_process || "—"),
                    l.selected_hmo || "—",
                    l.evidence_path ? <a className="text-[#1a7a52] underline" href={apiFileUrl(l.evidence_path)} target="_blank" rel="noreferrer">{l.evidence_name || "Evidence"}</a> : "—",
                    l.report_path ? <a className="text-[#1a7a52] underline" href={apiFileUrl(l.report_path)} target="_blank" rel="noreferrer">{l.report_name || "Report"}</a> : "—",
                  ])} />
              )}

              {reportType === "extra-dependant" && (
                <DataCard title="Additional / Extra Dependent"
                  headers={["Enrollee", "Principle NHIA", "Age", "Relationship", "Program", "Request", "End date", "Status", "Documents"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.enrollee_name,
                    l.principle_nhia_number,
                    l.age ?? "—",
                    labelOf(EXTRA_DEPENDANT_RELATIONSHIPS, l.relationship, l.relationship),
                    l.program || "—",
                    l.request_date || "—",
                    l.process_end_date || "—",
                    labelOf(EXTRA_DEPENDANT_STATUSES, l.line_status, l.line_status),
                    (() => {
                      const docs = parseSupportingDocuments(l.supporting_documents).filter((d) => d.path);
                      if (!docs.length) return "—";
                      return (
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          {docs.map((d) => (
                            <a key={d.path} className="text-[#1a7a52] underline" href={apiFileUrl(d.path)} target="_blank" rel="noreferrer">{d.name || "Document"}</a>
                          ))}
                        </div>
                      );
                    })(),
                  ])} />
              )}

              {reportType === "hcf-change" && (
                <DataCard title="Change of HCP"
                  headers={["Date", "Enrollee", "NHIA", "Current HCP/HMO", "New HCP/HMO", "Reason", "Criteria", "Channel", "Request", "End date", "Status"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.record_date || "—",
                    l.enrollee_name,
                    l.nhia_number,
                    l.current_hcp_hmo || "—",
                    l.new_hcp_hmo || "—",
                    l.reason_for_transfer || "—",
                    labelOf(YES_NO_OPTIONS, l.met_criteria, l.met_criteria || "—"),
                    labelOf(HCP_CHANGE_CHANNELS, l.request_channel, l.request_channel || "—"),
                    l.request_date || "—",
                    l.process_end_date || "—",
                    labelOf(HCP_CHANGE_STATUSES, l.line_status, l.line_status),
                  ])} />
              )}

              {reportType === "challenges" && (
                <>
                  <Card className="rounded-2xl border-[#d4e8dc]">
                    <CardHeader><CardTitle className="text-base">Challenges</CardTitle></CardHeader>
                    <CardContent><p className="text-sm whitespace-pre-wrap text-slate-700">{report.challenges || "—"}</p></CardContent>
                  </Card>
                  <Card className="rounded-2xl border-[#d4e8dc]">
                    <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
                    <CardContent><p className="text-sm whitespace-pre-wrap text-slate-700">{report.recommendations || "—"}</p></CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DataCard({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
      <CardHeader className="pb-2 border-b border-[#d4e8dc] bg-[#f8fdfb]">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{rows.length} row(s)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7]">
                  {headers.map(h => <TableHead key={h} className="text-xs font-bold">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((cells, i) => (
                  <TableRow key={i}>{cells.map((c, j) => <TableCell key={j} className="text-sm">{c}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
