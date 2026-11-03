import * as React from "react";
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, Loader2, Pencil, Send, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiFileUrl, stateOfficeApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import {
  monthLabel, quarterFromMonth, formatCount, formatDate, formatAmount,
  parseSupportingDocuments,
} from "./constants";
import {
  enrolmentDriveConfig,
  isEnrolmentDriveType,
  type EnrolmentDriveReportType,
} from "./enrolmentDriveTypes";

interface Props {
  reportType: EnrolmentDriveReportType | string;
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200",        icon: <FileText className="w-3.5 h-3.5" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: <Clock className="w-3.5 h-3.5" /> },
  returned:         { label: "Returned",        cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3.5 h-3.5" /> },
  endorsed:         { label: "Endorsed",        cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  submitted:        { label: "Submitted",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  approved:         { label: "Approved",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function SectionBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-4 bg-[#f4f7f5]">{children}</div>
    </section>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("complete") || s.includes("conducted")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progress") || s.includes("pending") || s.includes("planned")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s.includes("cancel") || s.includes("not")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function ActivityExpanded({ line }: { line: any }) {
  const docs = parseSupportingDocuments(line.supporting_documents).filter((d) => d.path);
  const programs = Array.isArray(line.programs_supported)
    ? line.programs_supported.join(", ")
    : line.programs_supported || "—";
  const audience = Array.isArray(line.target_audience)
    ? line.target_audience.join(", ")
    : line.target_audience || "—";

  return (
    <div className="space-y-4 p-4 bg-[#f8fbf9] border-t border-[#e8f3ec]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Activity details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoField label="Activity category" value={line.activity_category} />
          <InfoField label="Activity date" value={line.activity_date} />
          <InfoField label="Specific activity" value={line.specific_activity} />
          <InfoField label="Programmes supported" value={programs} />
          <InfoField label="Activity status" value={line.activity_status} />
          {line.status_reason && <InfoField label="Status reason" value={line.status_reason} />}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Audience & location reach</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoField label="Location category" value={line.location_category} />
          <InfoField label="Location name" value={line.location_name} />
          <InfoField label="Exact location" value={line.exact_location} />
          <InfoField label="Target audience" value={audience} />
          <InfoField label="Planned audience" value={line.planned_target_audience != null ? formatCount(line.planned_target_audience) : null} />
          <InfoField label="Audience reached" value={line.target_audience_reached != null ? formatCount(line.target_audience_reached) : null} />
          <InfoField label="Leads generated" value={line.leads_generated != null ? formatCount(line.leads_generated) : null} />
          <InfoField label="New enrolments" value={line.new_enrolments != null ? formatCount(line.new_enrolments) : null} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Funding & budget</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoField label="Funding option" value={line.funding_option} />
          {line.activity_budget != null && (
            <InfoField label="Activity budget" value={`₦${formatAmount(line.activity_budget)}`} />
          )}
          {line.approved_amount != null && (
            <InfoField label="Approved amount" value={`₦${formatAmount(line.approved_amount)}`} />
          )}
        </div>
      </div>

      {line.activity_details ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Activity details</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.activity_details}</p>
        </div>
      ) : null}

      {docs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Supporting evidence</p>
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.path}>
                <a
                  href={apiFileUrl(d.path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#145c3f] underline underline-offset-2"
                >
                  {d.name || "Document"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {line.remarks ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Remarks</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.remarks}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function EnrolmentDriveReportDetail({ reportType, reportId, onBack, onEdit }: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  const apiType = isEnrolmentDriveType(reportType)
    ? reportType
    : (enrolmentDriveConfig(reportType) ? reportType as EnrolmentDriveReportType : null);

  const reload = React.useCallback(async () => {
    if (!apiType) return;
    setLoading(true);
    try {
      const res = await stateOfficeApi[apiType].get(reportId);
      setReport(res.data);
      setOpenKey(null);
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [reportId, apiType]);

  React.useEffect(() => { reload(); }, [reload]);

  const lines = React.useMemo(() => (report?.lines ?? []) as any[], [report]);
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const statusCfg = report ? (STATUS_CONFIG[report.status] || STATUS_CONFIG.draft) : null;
  const driveTitle = enrolmentDriveConfig(String(apiType || reportType))?.title
    || String(report?.drive_type || "Enrolment Drive").replace(/-/g, " ");
  const period = report
    ? `${monthLabel(report.reporting_month)} ${report.reporting_year} (Q${quarter})`
    : "—";
  const canEditReport = canCreate && ["draft", "returned"].includes(report?.status);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Sticky Header Bar */}
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Enrolment Drives</h2>
            <p className="text-xs text-slate-500 truncate">{driveTitle} · {period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report?.reference_id && (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-[#e8f5ee] text-[#145c3f] rounded-lg border border-[#d4e8dc]">
              {report.reference_id}
            </span>
          )}
          {statusCfg && (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          )}
          {canEditReport && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 border-[#1a7a52] text-[#0f3d2e]">
              <Pencil className="w-4 h-4" /> {report?.status === "returned" ? "Edit & Resubmit" : "Edit Draft"}
            </Button>
          )}
        </div>
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
              {/* Report Information Section */}
              <SectionBand title="Report Information">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Reporting period" value={period} />
                  <InfoField label="State / Zone" value={[report.state?.description, report.zone?.description].filter(Boolean).join(" · ") || "—"} />
                  <InfoField label="Drive category" value={driveTitle} />
                  <InfoField label="Planned activities" value={report.planned_activities != null ? formatCount(report.planned_activities) : "—"} />
                  <InfoField label="Activities recorded" value={formatCount(lines.length)} />
                  <InfoField label="Submission date" value={report.submission_date ? formatDate(report.submission_date) : "—"} />
                  <InfoField label="Status" value={statusCfg?.label} />
                </div>
              </SectionBand>

              {/* Activity Register Section */}
              <SectionBand title="Activity Register">
                <div className="-m-4">
                  <div className="px-4 py-2 border-b border-[#d4e8dc] flex items-center justify-between bg-white">
                    <p className="text-xs text-slate-500">
                      Click any activity to view full details, audience reach, and supporting evidence.
                    </p>
                    <p className="text-[11px] text-[#145c3f] font-semibold">
                      {formatCount(lines.length)} activit{lines.length === 1 ? "y" : "ies"} recorded
                    </p>
                  </div>

                  {lines.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No activities recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                            {["Date", "Activity Category", "Specific Activity", "Location", "Reached", "Leads", "Enrolments", "Status", ""].map((h) => (
                              <TableHead key={h || "expand"} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l, i) => {
                            const key = String(l.id ?? l._key ?? i);
                            const open = openKey === key;
                            return (
                              <React.Fragment key={key}>
                                <TableRow
                                  className={cn(
                                    "cursor-pointer hover:bg-[#f8fdfb] transition-colors",
                                    open && "bg-[#f0faf4]",
                                  )}
                                  onClick={() => setOpenKey(open ? null : key)}
                                >
                                  <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                                  <TableCell className="text-sm font-semibold text-[#0f3d2e]">
                                    {l.activity_category || driveTitle}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={l.specific_activity}>
                                    {l.specific_activity || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {l.location_name || l.location_category || "—"}
                                  </TableCell>
                                  <TableCell className="text-sm tabular-nums">
                                    {l.target_audience_reached != null ? formatCount(l.target_audience_reached) : "0"}
                                  </TableCell>
                                  <TableCell className="text-sm tabular-nums">
                                    {l.leads_generated != null ? formatCount(l.leads_generated) : "0"}
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-[#145c3f] tabular-nums">
                                    {l.new_enrolments != null ? formatCount(l.new_enrolments) : "0"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={cn("text-[10px] font-semibold", statusTone(l.activity_status))}>
                                      {l.activity_status || "—"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="w-10 text-right">
                                    <ChevronDown className={cn(
                                      "w-4 h-4 text-[#145c3f] transition-transform inline-block",
                                      open && "rotate-180",
                                    )} />
                                  </TableCell>
                                </TableRow>
                                {open && (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={9} className="p-0">
                                      <ActivityExpanded line={l} />
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </SectionBand>

              {/* Review & Decision Section if present */}
              {(report.coordinator_review_note || report.status === "awaiting_review" || report.status === "endorsed") && (
                <SectionBand title="Review and Endorsement">
                  <div className="space-y-3">
                    <InfoField label="Coordinator remarks" value={report.coordinator_review_note || "No review remarks recorded."} />
                  </div>
                </SectionBand>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
