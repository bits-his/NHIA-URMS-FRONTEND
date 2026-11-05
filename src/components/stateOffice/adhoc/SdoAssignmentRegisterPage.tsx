import * as React from "react";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Calendar,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adhocAssignmentApi } from "@/lib/api";

export function FieldSection({
  title,
  children,
  gridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
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
  onSuccess: (savedMaster?: any, proceedToDispatch?: boolean) => void;
  departments: { department_code: string; name: string }[];
  userName?: string;
  initialData?: any;
}

export default function SdoAssignmentRegisterPage({
  onBack,
  onSuccess,
  departments,
  userName = "SDO Officer",
  initialData,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [proceedToDistribute, setProceedToDistribute] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  const [form, setForm] = React.useState({
    assignment_title: "",
    originating_department_code: "",
    originating_department_other: "",
    date_received: new Date().toISOString().slice(0, 10),
    priority: "normal",
    reference_memo_number: "",
    received_through: "official_memo",
    received_through_other: "",
    date_on_instruction: "",
    assignment_due_date: "",
    assignment_description: "",
    expected_output: "",
    reporting_requirement: "final",
    additional_instructions: "",
  });

  React.useEffect(() => {
    if (initialData) {
      setForm({
        assignment_title: initialData.assignment_title || "",
        originating_department_code: initialData.originating_department_code || "",
        originating_department_other: initialData.originating_department_other || "",
        date_received: initialData.date_received ? String(initialData.date_received).slice(0, 10) : "",
        priority: initialData.priority || "normal",
        reference_memo_number: initialData.reference_memo_number || "",
        received_through: initialData.received_through || "official_memo",
        received_through_other: initialData.received_through_other || "",
        date_on_instruction: initialData.date_on_instruction ? String(initialData.date_on_instruction).slice(0, 10) : "",
        assignment_due_date: initialData.assignment_due_date ? String(initialData.assignment_due_date).slice(0, 10) : "",
        assignment_description: initialData.assignment_description || "",
        expected_output: initialData.expected_output || "",
        reporting_requirement: initialData.reporting_requirement || "final",
        additional_instructions: initialData.additional_instructions || "",
      });
      setFile(null);
    }
  }, [initialData]);

  const handleChange = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleSave = async (andDispatch = false) => {
    if (!form.assignment_title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    if (!form.originating_department_code) {
      toast.error("Please select an originating department");
      return;
    }
    if (form.originating_department_code === "OTHER" && !form.originating_department_other.trim()) {
      toast.error("Please specify the originating department");
      return;
    }
    if (!form.date_received) {
      toast.error("Please select the date received");
      return;
    }
    if (!form.assignment_due_date) {
      toast.error("Please set the assignment due date");
      return;
    }
    if (!form.assignment_description.trim()) {
      toast.error("Please provide assignment scope / description");
      return;
    }
    if (!form.expected_output.trim()) {
      toast.error("Please provide expected outputs / deliverables");
      return;
    }

    setSubmitting(true);
    setProceedToDistribute(andDispatch);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          data.append(key, String(value));
        }
      });
      if (file) {
        data.append("original_instruction_file", file);
      }

      let savedRecord: any;
      if (initialData?.master_assignment_id) {
        const res = await adhocAssignmentApi.updateMaster(initialData.master_assignment_id, data);
        savedRecord = res.data;
        toast.success("Master assignment updated successfully");
      } else {
        const res = await adhocAssignmentApi.createMaster(data);
        savedRecord = res.data;
        toast.success(`Registered master assignment ${savedRecord.master_assignment_id}`);
      }

      onSuccess(savedRecord, andDispatch);
    } catch (err: any) {
      toast.error("Failed to save assignment", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {/* Sticky Top Header */}
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
            <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {initialData ? "Edit Adhoc Assignment Register" : "Adhoc Assignment Register"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Form Body (Full Width matching URMS design) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-12 w-full">
        <div className="w-full space-y-6">
          <Card className="rounded-sm border-[#d4e8dc] shadow-xs bg-white overflow-hidden w-full">
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* FieldSection 1: Assignment Registration */}
              <FieldSection
                title="Assignment Registration"
                gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                <Field label="Assignment Title" required className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  <Input
                    placeholder="Enter short, descriptive title (e.g. Regional beneficiary sensitisation)"
                    value={form.assignment_title}
                    onChange={(e) => handleChange("assignment_title", e.target.value)}
                    className="h-10 text-sm"
                    required
                  />
                </Field>

                <Field label="Originating Department" required>
                  <Select
                    value={form.originating_department_code}
                    onValueChange={(val) => handleChange("originating_department_code", val)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {departments.map((d) => (
                        <SelectItem key={d.department_code} value={d.department_code}>
                          {d.name} ({d.department_code})
                        </SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {form.originating_department_code === "OTHER" ? (
                  <Field label="Specify Department" required>
                    <Input
                      placeholder="Enter department name"
                      value={form.originating_department_other}
                      onChange={(e) => handleChange("originating_department_other", e.target.value)}
                      className="h-10 text-xs"
                      required
                    />
                  </Field>
                ) : (
                  <Field label="Date Received" required>
                    <Input
                      type="date"
                      value={form.date_received}
                      onChange={(e) => handleChange("date_received", e.target.value)}
                      className="h-10 text-xs"
                      required
                    />
                  </Field>
                )}

                {form.originating_department_code === "OTHER" && (
                  <Field label="Date Received" required>
                    <Input
                      type="date"
                      value={form.date_received}
                      onChange={(e) => handleChange("date_received", e.target.value)}
                      className="h-10 text-xs"
                      required
                    />
                  </Field>
                )}

                <Field label="Priority">
                  <Select value={form.priority} onValueChange={(val) => handleChange("priority", val)}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Reference / Memo Number">
                  <Input
                    placeholder="e.g. NHIA/ISD/2026/048"
                    value={form.reference_memo_number}
                    onChange={(e) => handleChange("reference_memo_number", e.target.value)}
                    className="h-10 text-xs"
                  />
                </Field>

                <Field label="Received Through">
                  <Select
                    value={form.received_through}
                    onValueChange={(val) => handleChange("received_through", val)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="official_memo">Official Memo</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="other">Other (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {form.received_through === "other" && (
                  <Field label="Specify Channel" required>
                    <Input
                      placeholder="Specify channel"
                      value={form.received_through_other}
                      onChange={(e) => handleChange("received_through_other", e.target.value)}
                      className="h-10 text-xs"
                      required
                    />
                  </Field>
                )}

                <Field label="Date on Instruction">
                  <Input
                    type="date"
                    value={form.date_on_instruction}
                    onChange={(e) => handleChange("date_on_instruction", e.target.value)}
                    className="h-10 text-xs"
                  />
                </Field>

                <Field label="Assignment Due Date" required>
                  <Input
                    type="date"
                    value={form.assignment_due_date}
                    onChange={(e) => handleChange("assignment_due_date", e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </Field>

                <Field label="SDO Registering Officer">
                  <Input
                    value={userName}
                    disabled
                    className="h-10 text-xs bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </Field>
              </FieldSection>

              {/* FieldSection 2: Assignment Scope & Deliverables (2 columns on wide screens) */}
              <FieldSection
                title="Assignment Scope & Deliverables"
                gridClassName="grid gap-4 sm:grid-cols-1 lg:grid-cols-2"
              >
                <Field label="Assignment Description / Instructions" required>
                  <Textarea
                    rows={5}
                    placeholder="Summarise what the originating department has requested, key objectives, focus areas..."
                    value={form.assignment_description}
                    onChange={(e) => handleChange("assignment_description", e.target.value)}
                    required
                  />
                </Field>

                <Field label="Expected Outputs / Deliverables" required>
                  <Textarea
                    rows={5}
                    placeholder="List the required deliverables (e.g. execution report with attendance sheet, photographs, desk inspection findings)..."
                    value={form.expected_output}
                    onChange={(e) => handleChange("expected_output", e.target.value)}
                    required
                  />
                </Field>
              </FieldSection>

              {/* FieldSection 3: Source Document & Operational Guidance */}
              <FieldSection
                title="Source Document & Operational Guidance"
                gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div className="col-span-full space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">
                    Original Instruction Memo / Attachment
                  </Label>
                  <div className="border-2 border-dashed border-[#1a7a52]/40 rounded-sm p-6 bg-[#f4f7f5] hover:bg-[#e8f6ee]/30 transition text-center w-full">
                    <input
                      type="file"
                      id="page_source_doc_file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }}
                    />
                    <label htmlFor="page_source_doc_file" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-[#145c3f] mx-auto mb-2" />
                      <span className="text-sm font-bold text-[#0f3d2e] block">
                        {file
                          ? file.name
                          : initialData?.original_instruction_name
                          ? `Attached: ${initialData.original_instruction_name} (Click to replace)`
                          : "Click to upload original instruction memo / file"}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload official memo, circular, email PDF or terms of reference (Max 25MB).
                      </p>
                    </label>
                  </div>
                </div>

                <Field label="Reporting Requirement">
                  <Select
                    value={form.reporting_requirement}
                    onValueChange={(val) => handleChange("reporting_requirement", val)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final">Final Report Only</SelectItem>
                      <SelectItem value="periodic">Periodic Updates</SelectItem>
                      <SelectItem value="both">Final & Periodic Updates</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="SOC / SDO Officer Capture">
                  <Input
                    value={userName}
                    disabled
                    className="h-10 text-xs bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </Field>

                <Field label="Instructions to Assigned States / Additional Guidance" className="col-span-full">
                  <Textarea
                    rows={3}
                    placeholder="Enter any additional guidance or specific instructions for recipient States..."
                    value={form.additional_instructions}
                    onChange={(e) => handleChange("additional_instructions", e.target.value)}
                  />
                </Field>
              </FieldSection>
            </CardContent>
          </Card>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-end pt-4 pb-8 border-t border-slate-200 w-full">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={submitting}
                className="gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                {submitting && !proceedToDistribute ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save to Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSave(true)}
                disabled={submitting}
                className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white shadow-xs"
              >
                {submitting && proceedToDistribute ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Save & Proceed to State Distribution
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
