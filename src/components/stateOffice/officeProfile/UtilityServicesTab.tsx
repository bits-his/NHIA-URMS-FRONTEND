import * as React from "react";
import {
  Plus,
  Save,
  Trash2,
  Upload,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { utilityServiceReportApi, stockApi } from "@/lib/api";
import ReportBasicInfo from "../shared/ReportBasicInfo";

const controlClass = cn(
  "h-11 text-sm font-medium",
  "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none",
  "hover:border-[#0f3d2e] hover:bg-white",
  "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
);

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">{title}</h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SERVICE_CATEGORIES = [
  { value: "generator", label: "Generator Services" },
  { value: "security", label: "Security Services" },
  { value: "cleaning", label: "Cleaning & Horticulture" },
  { value: "other", label: "Electricity / Water / Other Utilities" },
];

const SERVICE_LOCATIONS = [
  { value: "state_office", label: "State Office" },
  { value: "zonal_office", label: "Zonal Office" },
];

interface Props {
  stateId: string;
  zoneId: string;
  year: number;
  profileId?: number;
  userRole?: string;
  readOnly?: boolean;
  initialItem?: any;
  onSaved?: () => void;
  onCancel?: () => void;
}

export type UtilityRecord = {
  id?: number;
  reference_id?: string;
  service_location?: string;
  service_category: string;
  contractor_name: string;
  amount_claimed: number | string;
  payment_request_ref?: string;
  invoice_number?: string;
  supporting_doc?: File | null;
  supporting_doc_name?: string;
  status: string;
  remarks: string;
  service_description?: string;
  frequency?: string;
  reporting_month?: number;
  reporting_year?: number;
  consolidated_batch_id?: string | null;
  job_completion_cert_name?: string;
  job_completion_cert_path?: string;
  invoice_name?: string;
  invoice_path?: string;
  contractor_letter_name?: string;
  contractor_letter_path?: string;
};

export interface UtilityFormRow {
  tempId: string;
  id?: number;
  service_location: string;
  service_category: string;
  contractor_name: string;
  amount_claimed: string;
  payment_request_ref: string;
  status: string;
  remarks: string;
  supporting_doc?: File | null;
  supporting_doc_name?: string;
}

const createBlankRow = (index = 1, defaultLoc = "state_office", defaultCat = "generator", defaultContractor = ""): UtilityFormRow => ({
  tempId: `row-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
  service_location: defaultLoc,
  service_category: defaultCat,
  contractor_name: defaultContractor,
  amount_claimed: "",
  payment_request_ref: "",
  status: "draft",
  remarks: "",
  supporting_doc: null,
  supporting_doc_name: "",
});

export default function UtilityServicesTab({
  stateId: propStateId,
  zoneId: propZoneId,
  year: propYear,
  profileId,
  userRole = "",
  readOnly = false,
  initialItem = null,
  onSaved,
  onCancel,
}: Props) {
  const [saving, setSaving] = React.useState(false);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Header scope filters matching Slide 05:
  // Zonal Office | State Office | Year | Month | Period From | Period To
  const [selectedZoneVal, setSelectedZoneVal] = React.useState<string>(
    initialItem?.zone_id ? String(initialItem.zone_id) : propZoneId || ""
  );
  const [selectedStateVal, setSelectedStateVal] = React.useState<string>(
    initialItem?.state_id ? String(initialItem.state_id) : propStateId || ""
  );
  const [selectedYearVal, setSelectedYearVal] = React.useState<number>(
    initialItem?.reporting_year ? Number(initialItem.reporting_year) : propYear || new Date().getFullYear()
  );
  const [selectedMonthVal, setSelectedMonthVal] = React.useState<string>(
    initialItem?.reporting_month ? String(initialItem.reporting_month) : String(new Date().getMonth() + 1)
  );
  const [periodFrom, setPeriodFrom] = React.useState<string>("Jan");
  const [periodTo, setPeriodTo] = React.useState<string>("Jun");

  const savedRow = (item: any): UtilityFormRow => ({
    tempId: `edit-${item.id || 1}`,
    id: item.id,
    service_location: item.service_location || "state_office",
    service_category: item.service_category || "generator",
    contractor_name: item.contractor_name || "",
    amount_claimed: item.amount_claimed != null ? String(item.amount_claimed) : "",
    payment_request_ref: item.invoice_number || item.payment_request_ref || "",
    status: item.status || "draft",
    remarks: item.service_description || item.remarks || "",
    supporting_doc: null,
    supporting_doc_name: item.job_completion_cert_name || "",
  });

  const [draft, setDraft] = React.useState<UtilityFormRow>(() => createBlankRow(1, "state_office", "generator"));
  const [rows, setRows] = React.useState<UtilityFormRow[]>(() => (initialItem ? [savedRow(initialItem)] : []));

  // 3 Mandatory Verification Document Attachments
  const [certFile, setCertFile] = React.useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [contractorLetterFile, setContractorLetterFile] = React.useState<File | null>(null);

  // Load geo
  React.useEffect(() => {
    Promise.all([
      stockApi.getStates().catch(() => ({ success: true, data: [] })),
      stockApi.getZones().catch(() => ({ success: true, data: [] })),
    ]).then(([stRes, znRes]) => {
      setStates(stRes.data || []);
      setZones(znRes.data || []);
    });
  }, []);

  // Filter states by selected zone
  const availableStates = React.useMemo(() => {
    if (!selectedZoneVal || selectedZoneVal === "all") return states;
    return states.filter(
      (s) => String(s.zonal_id) === String(selectedZoneVal) || s.zonal_code === selectedZoneVal
    );
  }, [states, selectedZoneVal]);

  const handleZoneChange = (zoneVal: string) => {
    const nextZone = zoneVal === "all" ? "" : zoneVal;
    setSelectedZoneVal(nextZone);
    if (nextZone) {
      const inZone = states.filter(
        (s) => String(s.zonal_id) === String(nextZone) || s.zonal_code === nextZone
      );
      const isCurInZone = inZone.some(
        (s) => String(s.id) === String(selectedStateVal) || s.code === selectedStateVal
      );
      if (!isCurInZone) {
        setSelectedStateVal(inZone[0] ? String(inZone[0].id) : "");
      }
    }
  };

  const handleStateChange = (stateVal: string) => {
    const nextState = stateVal === "all" ? "" : stateVal;
    setSelectedStateVal(nextState);
    if (nextState) {
      const st = states.find((s) => String(s.id) === nextState || s.code === nextState);
      if (st?.zonal_id) {
        setSelectedZoneVal(String(st.zonal_id));
      }
    }
  };

  const setDraftField = (fields: Partial<UtilityFormRow>) => {
    setDraft((current) => ({ ...current, ...fields }));
  };

  const addToList = () => {
    if (!draft.service_location || !draft.service_category || !draft.contractor_name.trim() || !(Number(draft.amount_claimed) > 0)) {
      toast.error("Select the service and enter the contractor and amount before adding to the list");
      return;
    }
    setRows((prev) => [...prev, draft]);
    setDraft(createBlankRow(rows.length + 2, "state_office", "generator"));
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Total amount calculated across all form rows
  const formTotalAmount = React.useMemo(() => {
    return rows.reduce((acc, r) => acc + (Number(r.amount_claimed) || 0), 0);
  }, [rows]);

  // Format currency helper
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "" || val === "—") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  // Save all rows to the server
  const handleSaveAllRecords = async (forcedStatus?: "draft" | "submitted") => {
    if (!selectedStateVal) {
      toast.error("Please select a State Office");
      return;
    }

    // Validate that rows have minimal required information
    const validRows = rows.filter((r) => r.contractor_name.trim() || Number(r.amount_claimed) > 0);
    if (!validRows.length) {
      toast.error("Please fill in at least one utility record with Contractor Name and Amount");
      return;
    }

    setSaving(true);
    try {
      const files = {
        job_completion_cert: certFile || null,
        invoice: invoiceFile || null,
        contractor_letter: contractorLetterFile || null,
      };

      let successCount = 0;
      for (const row of validRows) {
        const payload: Record<string, any> = {
          state_id: selectedStateVal,
          zone_id: selectedZoneVal || undefined,
          reporting_year: Number(selectedYearVal),
          reporting_month: Number(selectedMonthVal),
          service_location: row.service_location,
          service_category: row.service_category,
          frequency: row.service_category === "generator" ? "biannual" : "monthly",
          contractor_name: row.contractor_name.trim() || "N/A",
          amount_claimed: Number(row.amount_claimed) || 0,
          invoice_number: row.payment_request_ref.trim() || undefined,
          service_description: row.remarks.trim() || undefined,
          status: forcedStatus || row.status || "draft",
          profile_id: profileId || undefined,
        };

        // Attach supporting doc if provided on the row
        const rowFiles = {
          ...files,
          ...(row.supporting_doc ? { invoice: row.supporting_doc } : {}),
        };

        await utilityServiceReportApi.save(payload, rowFiles, row.id || null);
        successCount++;
      }

      toast.success(
        successCount === 1
          ? "Utility service claim saved successfully"
          : `Successfully registered ${successCount} utility service records`
      );

      // Reset form to blank single row
      setRows([]);
      setDraft(createBlankRow(1, "state_office", "generator"));
      setCertFile(null);
      setInvoiceFile(null);
      setContractorLetterFile(null);

      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save utility service claims");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-sm border-[#d4e8dc] shadow-sm bg-white overflow-visible">
      <CardContent className="space-y-5 p-3 md:p-4">
        <ReportBasicInfo
          embedded
          showQuarter
          zones={zones.map((z) => ({ id: z.id, label: z.description }))}
          states={availableStates.map((s) => ({ id: s.id, label: s.description }))}
          zoneId={selectedZoneVal}
          setZoneId={handleZoneChange}
          stateId={selectedStateVal}
          setStateId={handleStateChange}
          reportYear={selectedYearVal ? String(selectedYearVal) : ""}
          setReportYear={(value) => setSelectedYearVal(Number(value))}
          reportMonth={selectedMonthVal}
          setReportMonth={setSelectedMonthVal}
          submitDate=""
          setSubmitDate={() => undefined}
          lockZone={readOnly}
          lockState={readOnly}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Period from">
            <Select value={periodFrom} onValueChange={setPeriodFrom} disabled={readOnly}>
              <SelectTrigger displayValue={periodFrom}><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHORT_MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period to">
            <Select value={periodTo} onValueChange={setPeriodTo} disabled={readOnly}>
              <SelectTrigger displayValue={periodTo}><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHORT_MONTHS.map((month) => (
                  <SelectItem key={`to-${month}`} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <section className="space-y-3">
          <SectionHeading
            title="Service record"
            hint="Generator servicing is reported twice a year. Security and cleaning are reported monthly."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Service location" required>
                <Select
                  value={draft.service_location}
                  onValueChange={(value) => setDraftField({ service_location: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger displayValue={SERVICE_LOCATIONS.find((item) => item.value === draft.service_location)?.label}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_LOCATIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Service category" required>
                <Select
                  value={draft.service_category}
                  onValueChange={(value) => setDraftField({ service_category: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger displayValue={SERVICE_CATEGORIES.find((item) => item.value === draft.service_category)?.label}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Contractor" required>
                <Input
                  className={controlClass}
                  value={draft.contractor_name}
                  disabled={readOnly}
                  placeholder="Contractor / firm"
                  onChange={(event) => setDraftField({ contractor_name: event.target.value })}
                />
              </Field>
              <Field label="Amount due (₦)" required>
                <Input
                  className={controlClass}
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.amount_claimed}
                  disabled={readOnly}
                  placeholder="0.00"
                  onChange={(event) => setDraftField({ amount_claimed: event.target.value })}
                />
              </Field>
              <Field label="Payment reference">
                <Input
                  className={controlClass}
                  value={draft.payment_request_ref}
                  disabled={readOnly}
                  placeholder="INV-..."
                  onChange={(event) => setDraftField({ payment_request_ref: event.target.value })}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={draft.status}
                  onValueChange={(value) => setDraftField({ status: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger displayValue={draft.status === "submitted" ? "Submitted" : "Draft"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Supporting document">
                <label className={cn(controlClass, "flex items-center justify-between gap-2 cursor-pointer")}>
                  <span className="truncate text-slate-600">
                    {draft.supporting_doc ? draft.supporting_doc.name : draft.supporting_doc_name || "Upload file"}
                  </span>
                  <Upload className="size-4 shrink-0 text-[#1a7a52]" />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    className="hidden"
                    disabled={readOnly}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setDraftField({ supporting_doc: file, supporting_doc_name: file.name });
                      }
                    }}
                  />
                </label>
              </Field>
              <Field label="Remarks" className="sm:col-span-2">
                <Input
                  className={controlClass}
                  value={draft.remarks}
                  disabled={readOnly}
                  placeholder="Service details"
                  onChange={(event) => setDraftField({ remarks: event.target.value })}
                />
              </Field>
            </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addToList}
              disabled={readOnly}
              className="h-9 gap-1.5 border-[#1a7a52] text-[#0f3d2e]"
            >
              <Plus className="size-3.5" /> Add to list
            </Button>
          </div>
          {rows.length > 0 && (
          <div className="overflow-x-auto rounded-sm border border-[#d4e8dc]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                  {["#", "Location", "Category", "Contractor", "Amount (₦)", "Payment ref", "Status", ""].map((heading) => (
                    <TableHead key={heading || "action"} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{heading}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.tempId} className="hover:bg-[#f8fdfb]">
                    <TableCell className="text-sm tabular-nums text-slate-500">{index + 1}</TableCell>
                    <TableCell className="text-sm">{SERVICE_LOCATIONS.find((item) => item.value === row.service_location)?.label || "—"}</TableCell>
                    <TableCell className="text-sm">{SERVICE_CATEGORIES.find((item) => item.value === row.service_category)?.label || "—"}</TableCell>
                    <TableCell className="text-sm">{row.contractor_name || "—"}</TableCell>
                    <TableCell className="text-sm font-semibold tabular-nums text-[#145c3f]">{formatCurrency(row.amount_claimed)}</TableCell>
                    <TableCell className="text-sm">{row.payment_request_ref || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{row.status === "submitted" ? "Submitted" : "Draft"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-rose-600 hover:bg-rose-50"
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveRow(index);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: MANDATORY AUDIT VERIFICATION UPLOADS (SLIDE 05)
            All 3 documents must accompany the payment request
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <SectionHeading
            title="Required documents"
            hint="All three documents must accompany the payment request."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Job completion certificate" required>
              <label className={cn(controlClass, "flex items-center justify-between gap-2 cursor-pointer")}>
                <span className="truncate text-slate-600">{certFile ? certFile.name : "Upload signed certificate"}</span>
                <Upload className="size-4 shrink-0 text-[#1a7a52]" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(event) => {
                    if (event.target.files?.[0]) setCertFile(event.target.files[0]);
                  }}
                />
              </label>
            </Field>
            <Field label="Request for payment" required>
              <label className={cn(controlClass, "flex items-center justify-between gap-2 cursor-pointer")}>
                <span className="truncate text-slate-600">{contractorLetterFile ? contractorLetterFile.name : "Upload request letter"}</span>
                <Upload className="size-4 shrink-0 text-[#1a7a52]" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(event) => {
                    if (event.target.files?.[0]) setContractorLetterFile(event.target.files[0]);
                  }}
                />
              </label>
            </Field>
            <Field label="Invoice" required>
              <label className={cn(controlClass, "flex items-center justify-between gap-2 cursor-pointer")}>
                <span className="truncate text-slate-600">{invoiceFile ? invoiceFile.name : "Upload invoice"}</span>
                <Upload className="size-4 shrink-0 text-[#1a7a52]" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(event) => {
                    if (event.target.files?.[0]) setInvoiceFile(event.target.files[0]);
                  }}
                />
              </label>
            </Field>
          </div>
        </section>

        {/* FORM ACTION TOOLBAR */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#d4e8dc] pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSaveAllRecords("draft")}
            disabled={saving || readOnly}
            className="h-9 gap-1.5 border-[#1a7a52] text-[#0f3d2e]"
          >
            <Save className="size-3.5" /> Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveAllRecords("submitted")}
            disabled={saving || readOnly}
            className="h-9 gap-1.5 bg-orange-action hover:bg-orange-600"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Submit to Zone / HQ
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
