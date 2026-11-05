import * as React from "react";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Calendar,
  Send,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adhocAssignmentApi, apiFileUrl } from "@/lib/api";

export function FieldSection({
  title,
  children,
  gridClassName = "grid gap-4 sm:grid-cols-2",
}: {
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className={gridClassName}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-600">
        {label.replace(/\s*\*$/, "")}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25",
        props.className
      )}
    />
  );
}

interface Props {
  onBack: () => void;
  onSuccess: () => void;
  stateAssignment: any;
  userName?: string;
}

export default function StateAssignmentReportPage({
  onBack,
  onSuccess,
  stateAssignment,
  userName = "State Reporting Officer",
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);

  const master = stateAssignment?.master_assignment;
  const latestReport = stateAssignment?.reports?.[0];
  const isClosed = stateAssignment?.closure_status === "closed";

  const [form, setForm] = React.useState({
    completion_status: "completed",
    date_completed: new Date().toISOString().slice(0, 10),
    work_summary: "",
    output_achieved: "",
    challenges: "",
  });

  React.useEffect(() => {
    if (latestReport) {
      setForm({
        completion_status: latestReport.completion_status || "completed",
        date_completed: latestReport.date_completed ? String(latestReport.date_completed).slice(0, 10) : "",
        work_summary: latestReport.work_summary || "",
        output_achieved: latestReport.output_achieved || "",
        challenges: latestReport.challenges || "",
      });
    } else {
      setForm({
        completion_status: "completed",
        date_completed: new Date().toISOString().slice(0, 10),
        work_summary: "",
        output_achieved: "",
        challenges: "",
      });
    }
    setFiles([]);
  }, [latestReport, stateAssignment]);

  const handleChange = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...arr]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.work_summary.trim()) {
      toast.error("Please enter a summary of work carried out");
      return;
    }
    if (!form.output_achieved.trim()) {
      toast.error("Please specify output / outcome achieved");
      return;
    }
    if (form.completion_status === "completed" && !form.date_completed) {
      toast.error("Please specify date completed");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("completion_status", form.completion_status);
      data.append("date_completed", form.completion_status === "completed" ? form.date_completed : "");
      data.append("work_summary", form.work_summary.trim());
      data.append("output_achieved", form.output_achieved.trim());
      data.append("challenges", form.challenges ? form.challenges.trim() : "");

      files.forEach((f) => {
        data.append("evidence_files", f);
      });

      if (latestReport?.evidence_files && Array.isArray(latestReport.evidence_files)) {
        data.append("existing_evidence_files", JSON.stringify(latestReport.evidence_files));
      }

      await adhocAssignmentApi.submitStateReport(stateAssignment.state_assignment_id, data);
      toast.success("Assignment report submitted successfully");
      onSuccess();
    } catch (err: any) {
      toast.error("Failed to submit report", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!stateAssignment) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/40">
      {/* Clean Sticky Header */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 shrink-0"
            aria-label="Back to assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                State Ad-Hoc Assignment Report
              </h1>
              <Badge className="bg-[#145c3f] text-white font-mono text-xs shadow-none">
                {stateAssignment.state_assignment_id}
              </Badge>
              {stateAssignment.state?.description && (
                <Badge variant="outline" className="border-[#145c3f]/30 text-[#145c3f] bg-emerald-50/60 text-xs">
                  {stateAssignment.state.description}
                </Badge>
              )}
            </div>
            {stateAssignment.state_due_date && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date: {String(stateAssignment.state_due_date).slice(0, 10)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onBack} disabled={submitting}>
            {isClosed ? "Back" : "Cancel"}
          </Button>
          {!isClosed && (
            <Button
              size="sm"
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Report
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-12 w-full">
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <Card className="rounded-sm border-[#d4e8dc] shadow-xs bg-white overflow-hidden w-full">
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* Review feedback alert banner if returned */}
              {latestReport?.review_status === "returned_for_clarification" && latestReport?.clarification_note && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold uppercase tracking-wide text-amber-800">
                      Returned for Clarification by {latestReport.reviewed_by_name || "Reviewer"}
                    </p>
                    <p className="leading-relaxed">{latestReport.clarification_note}</p>
                  </div>
                </div>
              )}

              {/* Read-Only Assignment Directive */}
              <FieldSection title="Assignment Directive">
                <div className="sm:col-span-2 p-5 rounded-sm bg-[#f4f7f5] border border-[#d4e8dc] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Assignment Title
                    </span>
                    <p className="font-bold text-slate-800 mt-0.5 text-sm">
                      {master?.assignment_title || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Originating Department
                    </span>
                    <p className="font-bold text-slate-800 mt-0.5 text-sm">
                      {master?.originating_department_code === "OTHER"
                        ? master.originating_department_other
                        : master?.originating_department_code || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Assigned By
                    </span>
                    <p className="font-bold text-slate-800 mt-0.5 text-sm">
                      {master?.sdo_officer_name || "SDO Registering Officer"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Scope & Instructions
                    </span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">
                      {master?.assignment_description || "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Expected Output
                    </span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">
                      {master?.expected_output || "—"}
                    </p>
                  </div>

                  {master?.original_instruction_url && (
                    <div className="md:col-span-3 pt-3 border-t border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#145c3f]" />
                        Original Instruction Memo: {master.original_instruction_name || "Instruction Memo"}
                      </span>
                      <a
                        href={apiFileUrl(master.original_instruction_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#145c3f] hover:text-[#0f3d2e] underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Memo PDF
                      </a>
                    </div>
                  )}
                </div>
              </FieldSection>

              {/* State Execution Report Inputs */}
              <FieldSection title="State Execution Report">
                <Field label="Completion Status" required>
                  <Select
                    value={form.completion_status}
                    onValueChange={(val) => handleChange("completion_status", val)}
                    disabled={isClosed}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select completion status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="partially_completed">Partially Completed</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label={`Date Completed ${form.completion_status === "ongoing" ? "(Optional)" : ""}`}
                  required={form.completion_status === "completed"}
                >
                  <Input
                    type="date"
                    value={form.date_completed}
                    onChange={(e) => handleChange("date_completed", e.target.value)}
                    disabled={isClosed || form.completion_status === "ongoing"}
                    className="h-10 text-xs"
                  />
                </Field>

                <Field label="Summary of Work Carried Out" required className="sm:col-span-2">
                  <Textarea
                    rows={4}
                    placeholder="Briefly describe what the State Office did, facilities or communities visited, meetings held..."
                    value={form.work_summary}
                    onChange={(e) => handleChange("work_summary", e.target.value)}
                    disabled={isClosed}
                    required
                  />
                </Field>

                <Field label="Output / Outcome Achieved" required className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    placeholder="State what was delivered, verified, resolved, or enrolled..."
                    value={form.output_achieved}
                    onChange={(e) => handleChange("output_achieved", e.target.value)}
                    disabled={isClosed}
                    required
                  />
                </Field>

                <Field label="Challenges Encountered (if any)" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    placeholder="Briefly state any operational, logistics, or stakeholder bottleneck that affected execution..."
                    value={form.challenges}
                    onChange={(e) => handleChange("challenges", e.target.value)}
                    disabled={isClosed}
                  />
                </Field>
              </FieldSection>

              {/* Evidence & Supporting Documents */}
              <FieldSection title="Evidence & Supporting Documents" gridClassName="grid gap-3 sm:grid-cols-1">
                {!isClosed && (
                  <div className="border-2 border-dashed border-[#1a7a52]/40 rounded-sm p-6 bg-[#f4f7f5] hover:bg-[#e8f6ee]/30 text-center transition">
                    <input
                      type="file"
                      id="evidence_files_input_page"
                      multiple
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="evidence_files_input_page" className="cursor-pointer block">
                      <Upload className="w-7 h-7 text-[#145c3f] mx-auto mb-2" />
                      <span className="text-sm font-bold text-[#0f3d2e] block">
                        Click to select multiple evidence files
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        PDFs, Word documents, Excel spreadsheets, or Field Photographs
                      </p>
                    </label>
                  </div>
                )}

                {/* Evidence Files List */}
                {(files.length > 0 || (latestReport?.evidence_files && latestReport.evidence_files.length > 0)) && (
                  <div className="space-y-2">
                    {latestReport?.evidence_files?.map((ef: any, idx: number) => (
                      <div
                        key={`prev-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-100 text-xs border border-slate-200"
                      >
                        <span className="truncate flex items-center gap-2 text-slate-700 font-medium">
                          <FileText className="w-4 h-4 text-[#145c3f]" />
                          {ef.name}
                        </span>
                        <a
                          href={apiFileUrl(ef.path)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#145c3f] font-semibold text-xs underline flex items-center gap-1 hover:text-[#0f3d2e]"
                        >
                          <Download className="w-3.5 h-3.5" /> View / Download
                        </a>
                      </div>
                    ))}

                    {files.map((f, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-xs border border-emerald-200 text-emerald-900"
                      >
                        <span className="truncate flex items-center gap-2 font-medium">
                          <FileText className="w-4 h-4 text-emerald-700" />
                          {f.name} ({Math.round(f.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FieldSection>

              {/* Bottom Action Bar */}
              <div className="pt-6 border-t border-[#d4e8dc] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Submitting as: <strong className="text-slate-600">{userName}</strong> • {stateAssignment.state_assignment_id}
                </span>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
                    {isClosed ? "Back" : "Cancel"}
                  </Button>
                  {!isClosed && (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2 text-white shadow-xs px-5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Submit Report
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

