import * as React from "react";
import { X, Upload, FileText, Loader2, Plus, Calendar, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { adhocAssignmentApi } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: { department_code: string; name: string }[];
  userName?: string;
  initialData?: any;
}

export default function SdoAssignmentRegisterModal({
  open,
  onClose,
  onSuccess,
  departments,
  userName = "SDO Officer",
  initialData,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
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
    } else {
      setForm({
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
      setFile(null);
    }
  }, [initialData, open]);

  const handleChange = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assignment_title.trim()) {
      toast.error("Please enter assignment title");
      return;
    }
    if (!form.originating_department_code) {
      toast.error("Please select originating department");
      return;
    }
    if (form.originating_department_code === "OTHER" && !form.originating_department_other.trim()) {
      toast.error("Please specify originating department");
      return;
    }
    if (!form.date_received) {
      toast.error("Please select date received");
      return;
    }
    if (!form.assignment_due_date) {
      toast.error("Please set assignment due date");
      return;
    }
    if (!form.assignment_description.trim()) {
      toast.error("Please provide assignment description / instructions");
      return;
    }
    if (!form.expected_output.trim()) {
      toast.error("Please provide expected outputs / deliverables");
      return;
    }

    setSubmitting(true);
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

      if (initialData?.master_assignment_id) {
        await adhocAssignmentApi.updateMaster(initialData.master_assignment_id, data);
        toast.success("Master assignment updated successfully");
      } else {
        await adhocAssignmentApi.createMaster(data);
        toast.success("Master assignment registered successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Failed to save assignment", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] overflow-y-auto p-0 rounded-sm border-[#d4e8dc]">
        <form onSubmit={handleSubmit} className="w-full">
          <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-emerald-50/60 to-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                  SDO Form 1
                </span>
                <DialogTitle className="text-xl font-bold text-slate-800 mt-1">
                  {initialData ? "Edit Adhoc Assignment Register" : "Adhoc Assignment Register"}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record official departmental instruction and retain original memo document.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Section A: Assignment Registration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#145c3f] text-white text-xs font-bold">
                  A
                </span>
                <h3 className="text-sm font-bold text-slate-800">Assignment Registration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-700">Assignment Title *</Label>
                  <Input
                    placeholder="Enter short, descriptive title"
                    value={form.assignment_title}
                    onChange={(e) => handleChange("assignment_title", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Originating Department *</Label>
                  <Select
                    value={form.originating_department_code}
                    onValueChange={(val) => handleChange("originating_department_code", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {departments.map((d) => (
                        <SelectItem key={d.department_code} value={d.department_code}>
                          {d.name} ({d.department_code})
                        </SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.originating_department_code === "OTHER" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Specify Department *</Label>
                    <Input
                      placeholder="Enter department name"
                      value={form.originating_department_other}
                      onChange={(e) => handleChange("originating_department_other", e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Date Received *</Label>
                  <Input
                    type="date"
                    value={form.date_received}
                    onChange={(e) => handleChange("date_received", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Priority</Label>
                  <Select value={form.priority} onValueChange={(val) => handleChange("priority", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Reference / Memo Number</Label>
                  <Input
                    placeholder="e.g. NHIA/ISD/2026/048"
                    value={form.reference_memo_number}
                    onChange={(e) => handleChange("reference_memo_number", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Received Through</Label>
                  <Select
                    value={form.received_through}
                    onValueChange={(val) => handleChange("received_through", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="official_memo">Official Memo</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="other">Other (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.received_through === "other" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Specify Medium *</Label>
                    <Input
                      placeholder="Specify channel"
                      value={form.received_through_other}
                      onChange={(e) => handleChange("received_through_other", e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Date on Instruction / Memo</Label>
                  <Input
                    type="date"
                    value={form.date_on_instruction}
                    onChange={(e) => handleChange("date_on_instruction", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Assignment Due Date *</Label>
                  <Input
                    type="date"
                    value={form.assignment_due_date}
                    onChange={(e) => handleChange("assignment_due_date", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section B: Scope and Deliverables */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#145c3f] text-white text-xs font-bold">
                  B
                </span>
                <h3 className="text-sm font-bold text-slate-800">Assignment Scope & Deliverables</h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Assignment Description / Instructions *
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Summarise what the department has requested..."
                    value={form.assignment_description}
                    onChange={(e) => handleChange("assignment_description", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Expected Outputs / Deliverables *
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="List the required deliverables (reports, registers, verified lists)..."
                    value={form.expected_output}
                    onChange={(e) => handleChange("expected_output", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section C: Source Document & Guidance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#145c3f] text-white text-xs font-bold">
                  C
                </span>
                <h3 className="text-sm font-bold text-slate-800">Source Document & Guidance</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-700">
                    Original Instruction Attachment (Memo / Circular / Email / TOR)
                  </Label>
                  <div className="border-2 border-dashed border-emerald-200/80 rounded-xl p-4 bg-emerald-50/20 text-center hover:bg-emerald-50/40 transition">
                    <input
                      type="file"
                      id="source_doc_file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }}
                    />
                    <label htmlFor="source_doc_file" className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <span className="text-xs font-semibold text-emerald-800">
                        {file ? file.name : "Click to upload original instruction memo / file"}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PDF, DOCX, XLSX or Images up to 25MB
                      </p>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Reporting Requirement</Label>
                  <Select
                    value={form.reporting_requirement}
                    onValueChange={(val) => handleChange("reporting_requirement", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final">Final Report</SelectItem>
                      <SelectItem value="periodic">Periodic Updates</SelectItem>
                      <SelectItem value="both">Final & Periodic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">SDO Registering Officer</Label>
                  <Input value={userName} disabled className="bg-slate-50 text-slate-600 cursor-not-allowed" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-slate-700">
                    Instructions to Assigned States / Additional Guidance
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter any additional guidance or specific coordination directions..."
                    value={form.additional_instructions}
                    onChange={(e) => handleChange("additional_instructions", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t bg-slate-50/70 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2 text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? "Save Changes" : "Register Master Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
