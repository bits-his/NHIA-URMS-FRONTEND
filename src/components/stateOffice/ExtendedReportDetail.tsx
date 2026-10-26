import * as React from "react";
import { useSelector } from "react-redux";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil, XCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { SubmitConfirmModal } from "@/src/components/SubmitConfirmModal";
import {
  REPORT_CONFIG, ACCREDITATION_INDICATORS, ACCREDITATION_PROCESS_TYPES,
  ACCREDITATION_ENTRY_TYPES, expandAccreditationLines,
  COMPLAINT_SUMMARY_CATEGORIES, COMPLAINT_STATUS_TYPES,
  EXTRA_DEPENDANT_STATUSES, parseSupportingDocuments,
  YES_NO_OPTIONS, HCP_CHANGE_CHANNELS, HCP_CHANGE_STATUSES,
  ENROLMENT_DRIVE_PROGRAMS, formatAmount,
  monthLabel, quarterFromMonth, labelOf, formatCount, formatDate, type StateOfficeReportType,
} from "./constants";
import { isEnrolmentDriveType } from "./enrolmentDriveTypes";
import { decodeDependantRequest, entityLabel } from "./beneficiaryManagementTypes";

interface Props {
  reportType: StateOfficeReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
  onReviewed?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
  returned:         { label: "Returned",  cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <FileText className="w-3.5 h-3.5" /> },
  endorsed:         { label: "Endorsed",  cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  submitted:        { label: "Submitted", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  approved:         { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function ExtendedReportDetail({ reportType, reportId, onBack, onEdit, onReviewed }: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const api = stateOfficeApi[reportType];
  const { canCreate, canReview } = useStateOfficeAccess();
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [reviewNote, setReviewNote] = React.useState("");
  const [finalConfirmOpen, setFinalConfirmOpen] = React.useState(false);

  const reload = React.useCallback(async () => {
    const res = await api.get(reportId);
    setReport(res.data);
    setReviewNote(res.data?.coordinator_review_note || "");
    return res.data;
  }, [api, reportId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) {
          setReport(res.data);
          setReviewNote(res.data?.coordinator_review_note || "");
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reportId]);

  const statusCfg = report ? (STATUS_CONFIG[report.status] || null) : null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const providerWorkflow = reportType === "accreditation";
  const period = report
    ? `${monthLabel(report.reporting_month)} ${report.reporting_year}`
    : "—";
  const canEditProvider = providerWorkflow
    && ["draft", "returned"].includes(report?.status);
  const canEditStandard = report?.status === "draft";
  const showEndorse = canReview && providerWorkflow && report?.status === "awaiting_review";
  const canFinalSubmit = canCreate && providerWorkflow && report?.status === "endorsed";
  const showDecisionBlock = providerWorkflow && !!report && (
    report.status === "awaiting_review"
    || report.status === "endorsed"
    || report.status === "returned"
    || report.status === "submitted"
    || report.status === "approved"
  );
  const lineCount = report?.lines?.length ?? 0;

  const confirmReview = async (action: "endorse" | "return") => {
    const note = reviewNote.trim();
    if (action === "return" && !note) {
      toast.error("Enter remarks before returning for correction");
      return;
    }
    setActing(true);
    try {
      if (action === "endorse") {
        await api.updateStatus(reportId, "endorsed", note || undefined);
        toast.success("Report endorsed", { description: "The reporting officer can now make the final submission." });
      } else {
        await api.updateStatus(reportId, "returned", note);
        toast.success("Returned for correction");
      }
      await reload();
      onReviewed?.();
    } catch (err: any) {
      toast.error(
        action === "endorse" ? "Endorsement failed" : "Could not return report",
        { description: err.message },
      );
    } finally {
      setActing(false);
    }
  };

  const finalSubmit = async () => {
    setActing(true);
    try {
      await api.updateStatus(reportId, "submitted");
      toast.success("Final submission complete");
      setFinalConfirmOpen(false);
      await reload();
      onReviewed?.();
      return true;
    } catch (err: any) {
      toast.error("Final submission failed", { description: err.message });
      return false;
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{cfg.title}</h2>
            <p className="text-xs text-slate-500 truncate">{period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusCfg && (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          )}
          {onEdit && ((providerWorkflow ? canEditProvider : canEditStandard)) && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" /> {report?.status === "returned" ? "Edit & Resubmit" : "Edit Draft"}
            </Button>
          )}
        </div>
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
              {providerWorkflow && canReview ? (
                <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
                  <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Report Review</h3>
                  </div>
                  <div className="p-4 bg-[#f4f7f5]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "State / reporting period", value: `${report.state?.description ?? "—"} / ${period}` },
                        { label: "Submitted by", value: report.submitted_by || "Reporting Officer" },
                        { label: "Activities recorded", value: String(lineCount) },
                        { label: "Reference", value: report.reference_id || `Report #${reportId}` },
                      ].map((card) => (
                        <div key={card.label} className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{card.label}</p>
                          <p className="text-sm font-semibold text-[#0f3d2e] break-words">{card.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div><CardTitle className="text-base">Report Summary</CardTitle><CardDescription>Basic information</CardDescription></div>
                    {statusCfg && !providerWorkflow && (
                      <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>{statusCfg.icon} {statusCfg.label}</Badge>
                    )}
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
              )}

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

              {reportType === "accreditation" && (() => {
                const rawLines = report.lines ?? [];
                const templateLines = rawLines
                  .map((l: any) => {
                    const t = l.activity_template;
                    if (!t) return null;
                    const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return null; } })() : t;
                    if (!tpl || typeof tpl !== "object") return null;
                    return { ...l, ...tpl };
                  })
                  .filter(Boolean);
                if (templateLines.length > 0) {
                  const coveredTotal = templateLines.reduce(
                    (s: number, l: any) => s + (Number(l.facilities_covered ?? l.stakeholders_engaged) || 0),
                    0,
                  );
                  return (
                    <>
                      {(report.coordinator_reviewed_by || report.coordinator_review_note) && (
                        <Card className="rounded-2xl border-[#d4e8dc]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Coordinator review</CardTitle>
                          </CardHeader>
                          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                            <InfoField label="Reviewed by" value={report.coordinator_reviewed_by || "—"} />
                            <InfoField label="Reviewed at" value={report.coordinator_reviewed_at ? formatDate(report.coordinator_reviewed_at) : "—"} />
                            <div className="sm:col-span-2">
                              <InfoField label="Comment" value={report.coordinator_review_note || "—"} />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <DataCard title="Activity Summary"
                        headers={["Form", "Activities", "Completed", "Facilities Covered"]}
                        rows={[[
                          report.activity_module || "—",
                          formatCount(templateLines.length),
                          formatCount(templateLines.filter((l: any) => l.activity_status === "Completed").length),
                          formatCount(coveredTotal),
                        ]]} />
                      <DataCard title="Provider Management Activities"
                        headers={["ID", "Date", "Programme", "BHCPF Type", "Planned", "Covered", "Funding", "Status", "Remarks"]}
                        rows={templateLines.map((l: any) => [
                          l.provider_management_id || l.engagement_code || "—",
                          l.activity_date || "—",
                          l.related_programme || (Array.isArray(l.programs_supported) ? l.programs_supported.join(", ") : null) || "—",
                          l.bhcpf_activity_type || "—",
                          formatCount(l.facilities_planned ?? l.planned_target_stakeholders),
                          formatCount(l.facilities_covered ?? l.stakeholders_engaged),
                          l.funding_option || "—",
                          l.activity_status || "—",
                          l.remarks || "—",
                        ])} />
                      {templateLines.some((l: any) => l.metrics && Object.keys(l.metrics).length) && (
                        <DataCard title="Activity-specific metrics"
                          headers={["ID", "Metric", "Value"]}
                          rows={templateLines.flatMap((l: any) => {
                            const metrics = l.metrics && typeof l.metrics === "object" ? l.metrics : {};
                            const linked = l.related_programme === "BHCPF"
                              ? (l.bhcpf_activity_type === "Reaccreditation"
                                ? [["Number of PHCs Re-accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                : [["Number of PHCs Accredited", l.facilities_covered ?? l.stakeholders_engaged]])
                              : (l.form_type === "reaccreditation" || l.engagement_category === "Re-accreditation"
                                ? [["Number of Facilities Re-accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                : (l.form_type === "accreditation" || l.engagement_category === "Accreditation"
                                  ? [["Number of Facilities Accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                  : []));
                            return [
                              ...Object.entries(metrics).map(([k, v]) => [
                                l.provider_management_id || "—", k, formatCount(v as any),
                              ]),
                              ...linked.map(([k, v]) => [l.provider_management_id || "—", `${k} (linked)`, formatCount(v as any)]),
                            ];
                          })} />
                      )}
                    </>
                  );
                }
                return (
                  <DataCard title="Accreditation"
                    headers={["Accreditation", "Category", "Primary", "Secondary", "Total"]}
                    rows={expandAccreditationLines(rawLines).map((r) => [
                      labelOf(ACCREDITATION_PROCESS_TYPES, r.process, r.process),
                      labelOf(ACCREDITATION_ENTRY_TYPES, r.entry, r.entry),
                      formatCount(r.primary_count),
                      formatCount(r.secondary_count),
                      formatCount(r.primary_count + r.secondary_count),
                    ])} />
                );
              })()}

              {reportType === "stakeholder" && (
                <>
                  <DataCard title="Activity Summary" headers={["Planned Activities", "Activities Conducted", "Activities Recorded", "Stakeholders Engaged"]}
                    rows={[[
                      report.planned_activities ?? "—",
                      formatCount((report.lines ?? []).filter((l: any) => l.activity_status === "Completed").length),
                      formatCount(report.lines?.length ?? 0),
                      formatCount((report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.stakeholders_engaged ?? l.audience_size) || 0), 0)),
                    ]]} />
                  <DataCard title="Stakeholder Engagement"
                    headers={["ID", "Date", "Category", "Stakeholders", "Location", "Programs", "Engaged", "Follow-up", "Outcome", "Status", "Remarks"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.engagement_code || "—",
                      l.activity_date || "—",
                      l.engagement_category || l.activity || "—",
                      l.stakeholder_names || (Array.isArray(l.stakeholder_categories) ? l.stakeholder_categories.join(", ") : null) || l.organization || "—",
                      [l.location_category, l.location_name || l.location].filter(Boolean).join(" — ") || "—",
                      (Array.isArray(l.programs_supported) ? l.programs_supported.join(", ") : null) || "—",
                      formatCount(l.stakeholders_engaged ?? l.audience_size),
                      l.follow_up_required || "—",
                      l.specific_outcome || l.key_outcomes || "—",
                      l.activity_status || "—",
                      l.remarks || "—",
                    ])} />
                </>
              )}

              {isEnrolmentDriveType(reportType) && (
                <>
                  <DataCard title="Activity Summary" headers={["Planned Activities", "Activities Conducted", "Activities Recorded", "New Enrolments"]}
                    rows={[[
                      report.planned_activities ?? "—",
                      formatCount((report.lines ?? []).filter((l: any) => l.activity_status === "Completed").length),
                      formatCount(report.lines?.length ?? 0),
                      formatCount((report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.new_enrolments) || 0), 0)),
                    ]]} />
                  <DataCard title="Enrolment Drive Activities"
                    headers={["ID", "Date", "Activity", "Specific Activity", "Funding", "Budget (₦)", "Approved (₦)", "Target Audience", "Location", "Program ID", "Programs", "Details", "Planned Audience", "Reached", "Leads", "New Enrolments", "Status", "Evidence", "Remarks"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.drive_code || "—",
                      l.activity_date || "—",
                      l.activity_category,
                      l.specific_activity || "—",
                      l.funding_option || "—",
                      l.activity_budget != null ? formatAmount(l.activity_budget) : "—",
                      l.approved_amount != null ? formatAmount(l.approved_amount) : "—",
                      (l.target_audience ?? []).join(", ") || "—",
                      [l.location_category, l.location_name].filter(Boolean).join(" — ") || "—",
                      (l.programs_supported ?? []).map((p: string) => ENROLMENT_DRIVE_PROGRAMS.find((x) => x.label === p)?.code).filter(Boolean).join(", ") || "—",
                      (l.programs_supported ?? []).join(", ") || "—",
                      l.activity_details || "—",
                      l.planned_target_audience ?? "—",
                      l.target_audience_reached ?? "—",
                      l.leads_generated ?? "—",
                      l.new_enrolments ?? "—",
                      l.activity_status || "—",
                      (() => {
                        const docs = parseSupportingDocuments(l.supporting_documents).filter((d) => d.path);
                        if (!docs.length) return "—";
                        return (
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            {docs.map((d) => (
                              <a key={d.path} className="text-[#1a7a52] underline" href={apiFileUrl(d.path)} target="_blank" rel="noreferrer">{d.name || "Document"}</a>
                            ))}
                          </div>
                        );
                      })(),
                      l.remarks || "—",
                    ])} />
                </>
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
                    entityLabel(decodeDependantRequest(l.program, l.relationship), l.relationship),
                    String(l.program || "FSSHIP").split("|")[0] || "—",
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
                  headers={["Date", "Enrollee", "NHIA", "Entity", "Current", "New", "Reason", "Criteria", "Channel", "Request", "End date", "Status"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.record_date || "—",
                    l.enrollee_name,
                    l.nhia_number,
                    (l.entity_type || "—").toString().toUpperCase(),
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
                (report.lines ?? []).length > 0 ? (
                  <DataCard title="Challenges"
                    headers={["ID", "Category", "Specific", "Severity", "Impact", "Support", "Department", "Status", "Recommendation"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.challenge_code || "—",
                      l.challenge_category || "—",
                      l.specific_challenge || "—",
                      l.severity || "—",
                      l.impact || "—",
                      l.support_required || "—",
                      l.responsible_department || "—",
                      l.status || "—",
                      l.key_recommendation || "—",
                    ])} />
                ) : (
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
                )
              )}

              {showDecisionBlock && (
                <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
                  <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Coordinator Decision</h3>
                  </div>
                  <div className="p-4 bg-[#f4f7f5] space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Coordinator remarks
                      </Label>
                      {showEndorse ? (
                        <textarea
                          rows={3}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Enter remarks"
                          disabled={acting}
                          className="w-full rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/30 focus:border-[#25a872]"
                        />
                      ) : (
                        <div className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-700 min-h-[4.5rem] whitespace-pre-wrap shadow-sm">
                          {(report.coordinator_review_note || reviewNote).trim() || (
                            <span className="text-slate-400 italic">
                              {report.status === "endorsed" || report.status === "submitted" || report.status === "approved"
                                ? "Endorsed with no additional remarks."
                                : "No remarks recorded yet."}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {showEndorse ? (
                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={acting}
                          onClick={() => void confirmReview("return")}
                          className="border-slate-300 bg-white hover:bg-slate-50"
                        >
                          Return for Correction
                        </Button>
                        <Button
                          type="button"
                          disabled={acting}
                          onClick={() => void confirmReview("endorse")}
                          className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2"
                        >
                          {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Endorse
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-3 text-sm shadow-sm space-y-2">
                        {report.status === "awaiting_review" && (
                          <p className="text-amber-800 font-medium">Awaiting state coordinator endorsement</p>
                        )}
                        {report.status === "endorsed" && (
                          <>
                            <p className="text-teal-800 font-medium">
                              Endorsed
                              {report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}
                              {report.coordinator_reviewed_at
                                ? ` · ${formatDate(report.coordinator_reviewed_at)}`
                                : ""}
                            </p>
                            {canFinalSubmit ? (
                              <p className="text-sm text-slate-600">
                                Ready for your final submission — use the button at the bottom of the page.
                              </p>
                            ) : canReview ? (
                              <p className="text-sm text-slate-600">
                                Waiting for the reporting officer to make the final submission.
                              </p>
                            ) : null}
                          </>
                        )}
                        {(report.status === "submitted" || report.status === "approved") && (
                          <p className="text-[#145c3f] font-medium">
                            Final submission complete
                            {report.coordinator_reviewed_by ? ` · endorsed by ${report.coordinator_reviewed_by}` : ""}
                          </p>
                        )}
                        {report.status === "returned" && (
                          <p className="text-rose-700 font-medium">
                            Returned for correction
                            {report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}
                            {report.coordinator_reviewed_at
                              ? ` · ${formatDate(report.coordinator_reviewed_at)}`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Endorsement / signature and submission timestamp are recorded in the system audit trail.
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {canFinalSubmit && !loading && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-[#d4e8dc] px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-slate-500 mr-auto">
            Endorsed by the State Coordinator — confirm to complete final submission.
          </p>
          <Button
            disabled={acting || finalConfirmOpen}
            onClick={() => setFinalConfirmOpen(true)}
            className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2 shadow-md"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Final Submit
          </Button>
        </div>
      )}

      <SubmitConfirmModal
        open={finalConfirmOpen}
        busy={acting}
        title="Confirm final submission"
        description="This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards."
        confirmLabel="Yes, final submit"
        onConfirm={() => { void finalSubmit(); }}
        onCancel={() => { if (!acting) setFinalConfirmOpen(false); }}
      />

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
