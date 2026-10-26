import * as React from "react";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import {
  EXTRA_DEPENDANT_STATUSES,
  HCP_CHANGE_STATUSES,
  YES_NO_OPTIONS,
  formatDate,
  labelOf,
  monthLabel,
  quarterFromMonth,
  type StateOfficeReportType,
} from "./constants";
import {
  beneficiaryListSummary,
  decodeDependantRequest,
  entityLabel,
  unpackReason,
} from "./beneficiaryManagementTypes";

interface Props {
  reportType: StateOfficeReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  endorsed: { label: "Endorsed", cls: "bg-amber-50 text-amber-800" },
} as const;

const IDENTITY_LABELS: { key: string; label: string }[] = [
  { key: "surname", label: "Surname" },
  { key: "first_name", label: "First name" },
  { key: "middle_name", label: "Middle name" },
  { key: "nin", label: "NIN" },
  { key: "blood_group", label: "Blood group" },
  { key: "marital_status", label: "Marital status" },
  { key: "state_of_origin", label: "State of origin" },
  { key: "lga_of_origin", label: "LGA of origin" },
  { key: "state_of_residence", label: "State of residence" },
  { key: "lga_of_residence", label: "LGA of residence" },
  { key: "phone_number", label: "Phone number" },
];

function asRecord(raw: unknown): Record<string, string> {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v == null ? "" : String(v)]));
}

function splitDocs(raw: unknown) {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = []; }
  }
  const fields: Record<string, string> = {};
  const files: { name: string; path: string }[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as { field?: string; value?: string; path?: string; name?: string };
      if (row.field) fields[String(row.field)] = String(row.value ?? "");
      else if (row.path) files.push({ name: row.name || "Document", path: row.path });
    }
  }
  return { fields, files };
}

function Fact({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty = value == null || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-xs text-slate-800 break-words mt-0.5">{empty ? "—" : value}</dd>
    </div>
  );
}

function DocLinks({ files }: { files: { name: string; path: string }[] }) {
  if (!files.length) return <>—</>;
  return (
    <span className="flex flex-col gap-0.5">
      {files.map((file) => (
        <a key={file.path} className="text-[#145c3f] underline" href={apiFileUrl(file.path)} target="_blank" rel="noreferrer">
          {file.name}
        </a>
      ))}
    </span>
  );
}

function dependantFacts(line: any) {
  const request = decodeDependantRequest(line.program, line.relationship);
  const saved = splitDocs(line.supporting_documents);
  const identity = IDENTITY_LABELS
    .filter((field) => saved.fields[field.key])
    .map((field) => <Fact key={field.key} label={field.label} value={saved.fields[field.key]} />);
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
      <Fact label="Request" value={request === "additional" ? "Additional Dependant" : "Extra Dependant"} />
      <Fact label="Enrolment type" value={[saved.fields.program_name || String(line.program || "").split("|")[0], saved.fields.enrolment_type].filter(Boolean).join(" · ")} />
      <Fact label="Principal" value={line.enrollee_name} />
      <Fact label="NHIA number" value={line.principle_nhia_number} />
      <Fact label="Dependant" value={entityLabel(request, line.relationship)} />
      {identity}
      <Fact label="Organisation / MDA" value="Unemployed" />
      <Fact label="HMO" value={saved.fields.hmo} />
      <Fact label="HCF" value={saved.fields.hcf} />
      <Fact label="Alternative provider" value={saved.fields.alternative_provider} />
      <Fact label="Date of request" value={line.request_date} />
      <Fact label="Process end" value={line.process_end_date} />
      <Fact label="Status" value={labelOf(EXTRA_DEPENDANT_STATUSES, line.line_status || "", line.line_status || "—")} />
      <Fact label="Documents" value={<DocLinks files={saved.files} />} />
    </dl>
  );
}

function providerFacts(line: any) {
  const details = asRecord(line.details);
  const reason = unpackReason(line.reason_for_transfer);
  const files = splitDocs(line.supporting_documents).files;
  const hmo = line.entity_type === "hmo";
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
      <Fact label="Date of request" value={line.record_date} />
      <Fact label="Enrollee" value={line.enrollee_name} />
      <Fact label="NHIA number" value={line.nhia_number} />
      <Fact label="Request" value={hmo ? "Change of HMO" : "Change of HCP"} />
      <Fact label="Programme" value={details.program} />
      <Fact label="MDA" value={details.mda} />
      <Fact label="Current provider" value={line.current_hcp_hmo} />
      <Fact label="Requested provider" value={line.new_hcp_hmo} />
      <Fact label="Reason" value={reason.category} />
      {reason.other ? <Fact label="Explanation" value={reason.other} /> : null}
      <Fact label="Met NHIA criteria" value={labelOf(YES_NO_OPTIONS, line.met_criteria || "", line.met_criteria || "—")} />
      <Fact label="Status" value={labelOf(HCP_CHANGE_STATUSES, line.line_status || "", line.line_status || "—")} />
      <Fact label="Documents" value={<DocLinks files={files} />} />
    </dl>
  );
}

function mdaFacts(line: any) {
  const details = asRecord(line.details);
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
      <Fact label="Date" value={line.selection_date} />
      <Fact label="MDA" value={line.mda} />
      <Fact label="Former HMO" value={line.former_hmo} />
      <Fact label="Reason for change" value={line.reason_for_change} />
      <Fact label="HMOs invited" value={line.hmos_invited} />
      <Fact label="HMOs attended" value={line.hmos_attended ?? line.hmos_in_attendance} />
      <Fact label="Guideline complied" value={labelOf(YES_NO_OPTIONS, line.compliance_guideline || "", line.compliance_guideline || "—")} />
      <Fact label="Transparent process" value={labelOf(YES_NO_OPTIONS, line.transparent_process || "", line.transparent_process || "—")} />
      <Fact label="Selected HMO" value={line.selected_hmo} />
      <Fact label="Status" value={labelOf(HCP_CHANGE_STATUSES, details.status || line.line_status || "", details.status || line.line_status || "—")} />
      <Fact label="Remarks" value={details.remarks} />
      <Fact
        label="Evidence"
        value={line.evidence_path ? <a className="text-[#145c3f] underline" href={apiFileUrl(line.evidence_path)} target="_blank" rel="noreferrer">{line.evidence_name || "Evidence"}</a> : undefined}
      />
      <Fact
        label="Full report"
        value={line.report_path ? <a className="text-[#145c3f] underline" href={apiFileUrl(line.report_path)} target="_blank" rel="noreferrer">{line.report_name || "Report"}</a> : undefined}
      />
    </dl>
  );
}

export default function BeneficiaryReportView({ reportType, reportId, onBack, onEdit }: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(() => {
    setLoading(true);
    return stateOfficeApi[reportType].get(reportId)
      .then((res) => {
        setReport(res.data);
        setNote("");
      })
      .catch((err: { message?: string }) => {
        toast.error("Failed to load report", { description: err.message });
      })
      .finally(() => setLoading(false));
  }, [reportType, reportId]);

  React.useEffect(() => { reload(); }, [reload]);

  const review = async (action: "endorse" | "return" | "final_submit") => {
    if ((action === "endorse" || action === "return") && !note.trim()) {
      toast.error(action === "endorse" ? "Enter an endorsement comment" : "Enter a comment before returning the report");
      return;
    }
    setBusy(true);
    try {
      await stateOfficeApi[reportType].updateStatus(
        reportId,
        action === "final_submit" ? "approved" : "draft",
        note.trim(),
        action,
      );
      toast.success(
        action === "endorse"
          ? "Endorsed and returned to the reporting officer"
          : action === "return"
            ? "Returned for correction"
            : "Report approved",
      );
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Review action failed");
    } finally {
      setBusy(false);
    }
  };

  const endorsed = !!report?.endorsed;
  const status = report
    ? (report.status === "draft" && endorsed ? STATUS.endorsed : STATUS[report.status as keyof typeof STATUS])
    : null;
  const summary = report ? beneficiaryListSummary({ ...report, __reportType: reportType }) : null;
  const lines: any[] = report?.lines ?? [];

  return (
    <div className="bg-[#f4f7f5] min-h-full">
      <div className="bg-white border-b px-4 md:px-5 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 -ml-2 shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight truncate">{summary?.activity || "Beneficiary Management"}</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {report?.reference_id ? <span className="font-mono font-semibold text-[#145c3f]">{report.reference_id}</span> : "Report"}
              {summary?.subject ? ` · ${summary.subject}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status && (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
          )}
          {report?.status === "draft" && onEdit && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="w-full px-4 md:px-5 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading report
          </div>
        ) : !report ? (
          <p className="text-sm text-slate-600 py-16 text-center">Report not found.</p>
        ) : (
          <>
            {report.status === "submitted" && !endorsed && canReview && (
              <section className="rounded-lg border border-[#d4e8dc] bg-white p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0f3d2e]">Endorse</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Add a comment. The report returns to the reporting officer for final approval.</p>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Endorsement comment"
                  className="w-full rounded-md border border-[#d4e8dc] px-3 py-2 text-sm text-slate-800"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => review("return")}>
                    Return for correction
                  </Button>
                  <Button type="button" size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white" disabled={busy} onClick={() => review("endorse")}>
                    {busy ? "Saving…" : "Endorse"}
                  </Button>
                </div>
              </section>
            )}
            {report.status === "submitted" && !endorsed && !canReview && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Sent for review. Waiting for the state coordinator to endorse it.
              </p>
            )}
            {report.status === "draft" && endorsed && (
              <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-amber-900">
                  Endorsed{report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}. Returned to the reporting officer for final approval.
                </p>
                {report.coordinator_review_note && (
                  <p className="text-sm text-amber-950 whitespace-pre-wrap">{report.coordinator_review_note}</p>
                )}
                {canCreate && (
                  <div className="flex justify-end">
                    <Button type="button" size="sm" className="bg-orange-action hover:bg-orange-600" disabled={busy} onClick={() => review("final_submit")}>
                      {busy ? "Submitting…" : "Submit as approved"}
                    </Button>
                  </div>
                )}
              </section>
            )}
            {report.status === "draft" && !endorsed && report.coordinator_review_note && (
              <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Returned for correction</p>
                <p className="text-sm text-amber-950 whitespace-pre-wrap mt-1">{report.coordinator_review_note}</p>
              </section>
            )}

            <dl className="rounded-lg border border-[#d4e8dc] bg-white px-3 py-2.5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
              <Fact label="Zone" value={report.zone?.description} />
              <Fact label="State" value={report.state?.description} />
              <Fact label="Period" value={`${monthLabel(report.reporting_month)} ${report.reporting_year}`} />
              <Fact label="Quarter" value={`Q${quarterFromMonth(report.reporting_month)}`} />
              <Fact label="Submitted" value={formatDate(report.submission_date)} />
              <Fact label="By" value={report.submitted_by} />
            </dl>

            {lines.length === 0 ? (
              <p className="rounded-lg border border-[#d4e8dc] bg-white px-3 py-8 text-center text-sm text-slate-600">
                This report has no entries.
              </p>
            ) : lines.map((line, index) => (
              <section key={line.id ?? index} className="rounded-lg border border-[#d4e8dc] bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-[#e8f3ec] bg-[#f8fdfb] flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#0f3d2e] truncate">
                    {beneficiaryListSummary({ __reportType: reportType, lines: [line] }).subject}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {index + 1} of {lines.length}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  {reportType === "extra-dependant" && dependantFacts(line)}
                  {reportType === "hcf-change" && providerFacts(line)}
                  {reportType === "hmo-selection" && mdaFacts(line)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
