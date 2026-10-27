import * as React from "react";
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, Loader2, Pencil, Send, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { SubmitConfirmModal } from "@/src/components/SubmitConfirmModal";
import {
  monthLabel, formatCount, formatDate, formatAmount, parseSupportingDocuments,
} from "./constants";
import { PROVIDER_MANAGEMENT_NAV_TITLE } from "./enrolmentPillarTypes";
import { formMeta, type ProviderFormKey } from "./providerManagementTypes";

interface Props {
  reportId: number;
  formKey?: ProviderFormKey;
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

/** Unwrap accreditation line payload stored in activity_template (JSON object or LONGTEXT string). */
function unwrapLine(row: any) {
  const t = row?.activity_template;
  let tpl: Record<string, any> = {};
  if (typeof t === "string") {
    try {
      const parsed = JSON.parse(t);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) tpl = parsed;
    } catch { /* keep empty */ }
  } else if (t && typeof t === "object" && !Array.isArray(t)) {
    tpl = t;
  }

  // Metrics may be nested under activity_details (legacy seed / older templates)
  let metrics = tpl.metrics;
  if (!metrics && tpl.activity_details) {
    try {
      const details = typeof tpl.activity_details === "string"
        ? JSON.parse(tpl.activity_details)
        : tpl.activity_details;
      if (details?.metrics && typeof details.metrics === "object") metrics = details.metrics;
    } catch { /* ignore */ }
  }

  const planned = tpl.facilities_planned
    ?? tpl.planned_target_stakeholders
    ?? row.secondary_count
    ?? null;
  const covered = tpl.facilities_covered
    ?? tpl.stakeholders_engaged
    ?? row.primary_count
    ?? null;

  return {
    ...row,
    ...tpl,
    metrics: metrics && typeof metrics === "object" ? metrics : {},
    facilities_planned: planned,
    facilities_covered: covered,
    related_programme: tpl.related_programme
      || (Array.isArray(tpl.programs_supported) ? tpl.programs_supported[0] : null)
      || null,
  };
}

function ActivityExpanded({ line }: { line: any }) {
  const docs = parseSupportingDocuments(line.supporting_documents).filter((d) => d.path);
  const metrics = line.metrics && typeof line.metrics === "object" ? line.metrics : {};
  const metricEntries = Object.entries(metrics).filter(([, v]) => v != null && String(v).trim() !== "");
  const hasDetails = !!(
    line.form_type || line.engagement_category || line.related_programme
    || line.activity_date || line.activity_status || line.funding_option
    || line.bhcpf_activity_type || line.remarks
  );

  return (
    <div className="space-y-4 p-4 bg-[#f8fbf9] border-t border-[#e8f3ec]">
      {hasDetails ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Activity details</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoField label="Form type" value={line.form_type || line.engagement_category} />
            <InfoField label="Programme" value={line.related_programme
              || (Array.isArray(line.programs_supported) ? line.programs_supported.join(", ") : null)} />
            <InfoField label="BHCPF type" value={line.bhcpf_activity_type} />
            <InfoField label="Activity date" value={line.activity_date} />
            <InfoField label="Status" value={line.activity_status} />
            <InfoField label="Funding" value={line.funding_option} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Activity details were lost when evidence was uploaded. Re-open the draft / returned report,
          re-enter the activity, and send for review again.
        </p>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Facility coverage</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoField
            label="Total in state"
            value={line.total_facilities_in_state != null && line.total_facilities_in_state !== ""
              ? formatCount(line.total_facilities_in_state)
              : null}
          />
          <InfoField
            label="Planned this period"
            value={line.facilities_planned != null && line.facilities_planned !== ""
              ? formatCount(line.facilities_planned)
              : null}
          />
          <InfoField
            label="Covered"
            value={line.facilities_covered != null && line.facilities_covered !== ""
              ? formatCount(line.facilities_covered)
              : null}
          />
          <InfoField
            label="Budget"
            value={line.activity_budget != null && line.activity_budget !== ""
              ? `₦${formatAmount(line.activity_budget)}`
              : null}
          />
          <InfoField
            label="Approved amount"
            value={line.approved_amount != null && line.approved_amount !== ""
              ? `₦${formatAmount(line.approved_amount)}`
              : null}
          />
        </div>
      </div>

      {metricEntries.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Metrics</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {metricEntries.map(([k, v]) => (
              <InfoField key={k} label={k} value={String(v)} />
            ))}
          </div>
        </div>
      )}

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

export default function ProviderReportDetail({ reportId, formKey = "accreditation", onBack, onEdit }: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewBusy, setReviewBusy] = React.useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = React.useState(false);

  const api = stateOfficeApi.providerByFormKey(formKey || "accreditation");

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(reportId);
      const data = res.data;
      setReport(data);
      setOpenKey(null);
      setReviewNote(data?.coordinator_review_note || "");
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [api, reportId]);

  React.useEffect(() => { reload(); }, [reload]);

  const review = async (status: "endorsed" | "returned" | "submitted") => {
    if (status === "returned" && !reviewNote.trim()) {
      toast.error("Enter remarks before returning for correction");
      return false;
    }
    setReviewBusy(true);
    try {
      await api.updateStatus(reportId, status, reviewNote.trim() || undefined);
      toast.success(
        status === "endorsed"
          ? "Report endorsed — reporting officer can make the final submission"
          : status === "returned"
            ? "Returned for correction"
            : "Final submission complete",
      );
      await reload();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      return false;
    } finally {
      setReviewBusy(false);
    }
  };

  const lines = React.useMemo(
    () => (report?.lines ?? []).map(unwrapLine),
    [report],
  );
  const statusCfg = report ? (STATUS_CONFIG[report.status] || null) : null;
  const period = report
    ? `${monthLabel(report.reporting_month)} ${report.reporting_year}`
    : "—";
  const moduleKey = String(report?.activity_module || "accreditation") as ProviderFormKey;
  const moduleLabel = formMeta(moduleKey).label || report?.activity_module || "Provider Management";
  const canAct = canReview && report?.status === "awaiting_review";
  const canFinalSubmit = canCreate && report?.status === "endorsed";
  const canEditReport = canCreate && ["draft", "returned"].includes(report?.status);
  const showDecisionBlock = !!report && (
    report.status === "awaiting_review"
    || report.status === "endorsed"
    || report.status === "returned"
    || report.status === "submitted"
    || report.status === "approved"
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">{PROVIDER_MANAGEMENT_NAV_TITLE}</h2>
            <p className="text-xs text-slate-500 truncate">{moduleLabel} · {period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusCfg && (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          )}
          {canEditReport && onEdit && (
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
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading report...</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : (
            <>
              {canReview ? (
                <SectionBand title="Report Review">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "State / reporting period", value: `${report.state?.description ?? "—"} / ${period}` },
                      { label: "Submitted by", value: report.submitted_by || "Reporting Officer" },
                      { label: "Activities recorded", value: String(lines.length) },
                      { label: "Form type", value: moduleLabel },
                    ].map((card) => (
                      <div key={card.label} className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-3 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{card.label}</p>
                        <p className="text-sm font-semibold text-[#0f3d2e] break-words">{card.value}</p>
                      </div>
                    ))}
                  </div>
                </SectionBand>
              ) : (
                <SectionBand title="Report Information">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoField label="Reporting period" value={period} />
                    <InfoField label="State" value={report.state?.description ?? "—"} />
                    <InfoField label="Form type" value={moduleLabel} />
                    <InfoField label="Reporting officer" value={report.submitted_by || "—"} />
                  </div>
                </SectionBand>
              )}

              <SectionBand title="Activity Register">
                <div className="-m-4">
                  <div className="px-4 py-2 border-b border-[#d4e8dc] flex justify-end bg-white">
                    <p className="text-[11px] text-[#145c3f]">
                      {formatCount(lines.length)} activit{lines.length === 1 ? "y" : "ies"}
                      {report.submission_date ? ` · ${formatDate(report.submission_date)}` : ""}
                    </p>
                  </div>

                  {lines.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No activities recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                            {["PM ID", "Activity date", "Programme", "Planned", "Covered", "Status", ""].map((h) => (
                              <TableHead key={h || "action"} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l, i) => {
                            const key = String(l.id ?? i);
                            const open = openKey === key;
                            const code = l.provider_management_id || l.engagement_code || `PM-${String(i + 1).padStart(3, "0")}`;
                            return (
                              <React.Fragment key={key}>
                                <TableRow
                                  className={cn(
                                    "cursor-pointer hover:bg-[#f8fdfb]",
                                    open && "bg-[#f0faf4]",
                                  )}
                                  onClick={() => setOpenKey(open ? null : key)}
                                >
                                  <TableCell className="text-xs font-mono font-semibold text-[#145c3f]">{code}</TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                                  <TableCell className="text-sm font-medium">
                                    {l.related_programme
                                      || (Array.isArray(l.programs_supported) ? l.programs_supported.join(", ") : null)
                                      || l.engagement_category
                                      || "—"}
                                  </TableCell>
                                  <TableCell className="text-sm tabular-nums">
                                    {formatCount(l.facilities_planned)}
                                  </TableCell>
                                  <TableCell className="text-sm tabular-nums font-semibold text-[#145c3f]">
                                    {formatCount(l.facilities_covered)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px]">{l.activity_status || "—"}</Badge>
                                  </TableCell>
                                  <TableCell className="w-10">
                                    <ChevronDown className={cn(
                                      "w-4 h-4 text-[#145c3f] transition-transform",
                                      open && "rotate-180",
                                    )} />
                                  </TableCell>
                                </TableRow>
                                {open && (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={7} className="p-0">
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

              {showDecisionBlock && (
                <SectionBand title="Coordinator Decision">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Coordinator remarks
                      </Label>
                      {canAct ? (
                        <textarea
                          rows={3}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Enter remarks"
                          disabled={reviewBusy}
                          className="w-full rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/30 focus:border-[#25a872]"
                        />
                      ) : (
                        <div className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-700 min-h-[4.5rem] whitespace-pre-wrap shadow-sm">
                          {reviewNote.trim() || (
                            <span className="text-slate-400 italic">
                              {report.status === "endorsed" || report.status === "submitted" || report.status === "approved"
                                ? "Endorsed with no additional remarks."
                                : "No remarks recorded yet."}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {canAct ? (
                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reviewBusy}
                          onClick={() => void review("returned")}
                          className="border-slate-300 bg-white hover:bg-slate-50"
                        >
                          Return for Correction
                        </Button>
                        <Button
                          type="button"
                          disabled={reviewBusy}
                          onClick={() => void review("endorsed")}
                          className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2"
                        >
                          {reviewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
                            {canFinalSubmit && (
                              <p className="text-sm text-slate-600">
                                Ready for your final submission — use the button at the bottom of the page.
                              </p>
                            )}
                            {!canFinalSubmit && canReview && (
                              <p className="text-sm text-slate-600">
                                Waiting for the reporting officer to make the final submission.
                              </p>
                            )}
                          </>
                        )}
                        {(report.status === "submitted" || report.status === "approved") && (
                          <p className="text-[#145c3f] font-medium">Final submission complete</p>
                        )}
                        {report.status === "returned" && (
                          <p className="text-rose-700 font-medium">
                            Returned for correction
                            {report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      Endorsement / signature and submission timestamp are recorded in the system audit trail.
                    </p>
                  </div>
                </SectionBand>
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
            disabled={reviewBusy || finalConfirmOpen}
            onClick={() => setFinalConfirmOpen(true)}
            className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2 shadow-md"
          >
            {reviewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Final Submit
          </Button>
        </div>
      )}

      <SubmitConfirmModal
        open={finalConfirmOpen}
        busy={reviewBusy}
        title="Confirm final submission"
        description="This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards."
        confirmLabel="Yes, final submit"
        onConfirm={() => {
          void (async () => {
            const ok = await review("submitted");
            if (ok) setFinalConfirmOpen(false);
          })();
        }}
        onCancel={() => { if (!reviewBusy) setFinalConfirmOpen(false); }}
      />
    </div>
  );
}
