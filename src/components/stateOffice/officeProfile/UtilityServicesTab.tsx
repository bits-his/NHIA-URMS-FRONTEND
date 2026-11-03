import * as React from "react";
import {
  Wrench,
  Plus,
  Save,
  Trash2,
  Pencil,
  Upload,
  Download,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { apiFileUrl, utilityServiceReportApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SERVICE_CATEGORIES = [
  { value: "generator", label: "Generator Services (Biannual)" },
  { value: "security", label: "Security Services (Monthly)" },
  { value: "cleaning", label: "Cleaning & Horticulture (Monthly)" },
  { value: "other", label: "Electricity / Water / Other Utilities" },
];

const SERVICE_LOCATIONS = [
  { value: "state_office", label: "State Office" },
  { value: "zonal_office", label: "Zonal Office" },
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "biannual", label: "Biannual (Twice yearly)" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
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
  job_completion_cert_name?: string;
  job_completion_cert_path?: string;
  invoice_name?: string;
  invoice_path?: string;
  contractor_letter_name?: string;
  contractor_letter_path?: string;
};

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
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(initialItem?.id || null);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields
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

  // Active form inputs
  const [serviceLocation, setServiceLocation] = React.useState<string>(
    initialItem?.service_location || "state_office"
  );
  const [serviceCategory, setServiceCategory] = React.useState<string>(
    initialItem?.service_category || "generator"
  );
  const [contractorName, setContractorName] = React.useState<string>(
    initialItem?.contractor_name || ""
  );
  const [amountClaimed, setAmountClaimed] = React.useState<string>(
    initialItem?.amount_claimed != null ? String(initialItem.amount_claimed) : ""
  );
  const [paymentRequestRef, setPaymentRequestRef] = React.useState<string>(
    initialItem?.invoice_number || initialItem?.payment_request_ref || ""
  );
  const [frequency, setFrequency] = React.useState<string>(
    initialItem?.frequency || (initialItem?.service_category === "generator" ? "biannual" : "monthly")
  );
  const [status, setStatus] = React.useState<string>(initialItem?.status || "draft");
  const [remarks, setRemarks] = React.useState<string>(
    initialItem?.service_description || initialItem?.remarks || ""
  );

  // 3 Verification Files
  const [certFile, setCertFile] = React.useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [contractorLetterFile, setContractorLetterFile] = React.useState<File | null>(null);

  // Existing records logged for this state & year
  const [records, setRecords] = React.useState<UtilityRecord[]>([]);

  const yearOptions = buildReportingYearOptions();

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

  const selectedZone = React.useMemo(() => {
    if (!selectedZoneVal) return null;
    return zones.find(
      (z) => String(z.id) === String(selectedZoneVal) || z.zonal_code === selectedZoneVal
    );
  }, [selectedZoneVal, zones]);

  const selectedState = React.useMemo(() => {
    if (!selectedStateVal) return null;
    return states.find(
      (s) => String(s.id) === String(selectedStateVal) || s.code === selectedStateVal
    );
  }, [selectedStateVal, states]);

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

  // Sync category with default frequency
  React.useEffect(() => {
    if (serviceCategory === "generator") {
      setFrequency("biannual");
    } else {
      setFrequency("monthly");
    }
  }, [serviceCategory]);

  // Load existing records from server
  const loadExistingRecords = React.useCallback(async () => {
    if (!selectedStateVal) return;
    setLoading(true);
    try {
      const res = await utilityServiceReportApi.list({
        state_id: selectedStateVal,
        year: String(selectedYearVal),
      });
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStateVal, selectedYearVal]);

  React.useEffect(() => {
    loadExistingRecords();
  }, [loadExistingRecords]);

  // Sync with initialItem prop if editing
  React.useEffect(() => {
    if (initialItem) {
      setEditingId(initialItem.id || null);
      if (initialItem.zone_id) setSelectedZoneVal(String(initialItem.zone_id));
      if (initialItem.state_id) setSelectedStateVal(String(initialItem.state_id));
      if (initialItem.reporting_year) setSelectedYearVal(Number(initialItem.reporting_year));
      if (initialItem.reporting_month) setSelectedMonthVal(String(initialItem.reporting_month));
      setServiceLocation(initialItem.service_location || "state_office");
      setServiceCategory(initialItem.service_category || "generator");
      setContractorName(initialItem.contractor_name || "");
      setAmountClaimed(initialItem.amount_claimed != null ? String(initialItem.amount_claimed) : "");
      setPaymentRequestRef(initialItem.invoice_number || initialItem.payment_request_ref || "");
      setFrequency(initialItem.frequency || "monthly");
      setStatus(initialItem.status || "draft");
      setRemarks(initialItem.service_description || initialItem.remarks || "");
    }
  }, [initialItem]);

  // Reset form to blank create mode
  const handleResetForm = () => {
    setEditingId(null);
    setServiceLocation("state_office");
    setServiceCategory("generator");
    setContractorName("");
    setAmountClaimed("");
    setPaymentRequestRef("");
    setFrequency("biannual");
    setStatus("draft");
    setRemarks("");
    setCertFile(null);
    setInvoiceFile(null);
    setContractorLetterFile(null);
  };

  // Populate form from existing record in the table
  const handleStartEditRecord = (rec: UtilityRecord) => {
    setEditingId(rec.id || null);
    if (rec.service_location) setServiceLocation(rec.service_location);
    if (rec.service_category) setServiceCategory(rec.service_category);
    setContractorName(rec.contractor_name || "");
    setAmountClaimed(rec.amount_claimed != null ? String(rec.amount_claimed) : "");
    setPaymentRequestRef(rec.invoice_number || rec.payment_request_ref || "");
    setFrequency(rec.frequency || "monthly");
    setStatus(rec.status || "draft");
    setRemarks(rec.service_description || rec.remarks || "");
    if (rec.reporting_month) setSelectedMonthVal(String(rec.reporting_month));
  };

  // Save / update claim
  const handleSaveClaim = async () => {
    if (!selectedStateVal) {
      toast.error("Please select a State Office");
      return;
    }
    if (!contractorName.trim()) {
      toast.error("Please enter Contractor Name");
      return;
    }
    if (!amountClaimed || Number(amountClaimed) <= 0) {
      toast.error("Please enter a valid Amount Claimed");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        state_id: selectedStateVal,
        zone_id: selectedZoneVal || undefined,
        reporting_year: Number(selectedYearVal),
        reporting_month: Number(selectedMonthVal),
        service_location: serviceLocation,
        service_category: serviceCategory,
        frequency,
        contractor_name: contractorName.trim(),
        amount_claimed: Number(amountClaimed),
        invoice_number: paymentRequestRef.trim() || undefined,
        service_description: remarks.trim() || undefined,
        status,
        profile_id: profileId || undefined,
      };

      const files = {
        job_completion_cert: certFile || null,
        invoice: invoiceFile || null,
        contractor_letter: contractorLetterFile || null,
      };

      await utilityServiceReportApi.save(payload, files, editingId || null);
      toast.success(editingId ? "Utility claim updated successfully" : "Utility claim registered successfully");

      handleResetForm();
      await loadExistingRecords();

      if (onSaved) {
        onSaved();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save utility service claim");
    } finally {
      setSaving(false);
    }
  };

  // Delete claim
  const handleDeleteRecord = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to remove this utility service record?")) return;
    try {
      await utilityServiceReportApi.delete(id);
      toast.success("Utility claim removed");
      if (editingId === id) handleResetForm();
      await loadExistingRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove utility claim");
    }
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "" || val === "—") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "generator":
        return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Generator</Badge>;
      case "security":
        return <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">Security</Badge>;
      case "cleaning":
        return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Cleaning</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">Utilities / Other</Badge>;
    }
  };

  return (
    <Card className="rounded-sm border-slate-200/80 shadow-2xs bg-white">
      <CardContent className="space-y-6 pt-6">
        {/* ROW 1: JURISDICTION & OPERATIONAL CYCLE (ZONE FIRST, STATE SECOND FILTERED) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ZONE SELECT FIRST */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Zonal Office <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedZoneVal}
              onValueChange={handleZoneChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedZone?.description || (selectedZoneVal ? `Zone ${selectedZoneVal}` : undefined)}
              >
                <SelectValue placeholder="Select Zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* STATE SELECT SECOND (FILTERED BY ZONE) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              State Office <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedStateVal}
              onValueChange={handleStateChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedState?.description || (selectedStateVal ? `State Office` : undefined)}
              >
                <SelectValue placeholder={selectedZoneVal ? "Select state in zone" : "Select zone first or state"} />
              </SelectTrigger>
              <SelectContent>
                {availableStates.map((st) => (
                  <SelectItem key={st.id} value={String(st.id)}>
                    {st.description} {st.code ? `(${st.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* REPORTING YEAR */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Reporting Year <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={String(selectedYearVal)}
              onValueChange={(val) => setSelectedYearVal(Number(val))}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt} Cycle
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* REPORTING MONTH */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Reporting Month <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedMonthVal}
              onValueChange={setSelectedMonthVal}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ROW 2: SERVICE DETAILS & CONTRACTOR CREDENTIALS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Service Category <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={serviceCategory}
              onValueChange={setServiceCategory}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Service Location <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={serviceLocation}
              onValueChange={setServiceLocation}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Contractor / Vendor Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="e.g. TotalEnergies Ltd / Max Guard Security"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Amount Due / Claimed (₦) <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={amountClaimed}
              onChange={(e) => setAmountClaimed(e.target.value)}
              placeholder="e.g. 450000"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
            />
          </div>
        </div>

        {/* ROW 3: BILLING REFS & BILLING FREQUENCY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Invoice Number / Payment Request Ref</Label>
            <Input
              value={paymentRequestRef}
              onChange={(e) => setPaymentRequestRef(e.target.value)}
              placeholder="e.g. INV-2025-088"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Billing Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select Frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Reporting Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted to HQ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ROW 4: REMARKS / OPERATIONAL DESCRIPTION */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            Service Description & Operational Remarks
          </Label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Details of diesel supplied, maintenance carried out, security shifts covered, or facility work done..."
            disabled={readOnly}
            className="w-full rounded-sm border border-slate-200 bg-white p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a7a52] resize-y"
          />
        </div>

        {/* SECTION 2: MANDATORY AUDIT VERIFICATION DOCUMENTS (3 Clean Document Cards) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="size-4 text-[#1a7a52]" />
              Mandatory Audit Verification Documents
            </Label>
            <span className="text-[10px] text-slate-400 font-medium">
              All 3 files required before HQ payment voucher processing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* DOC 1: Job Completion Certificate */}
            <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">1. Job Completion Cert</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Signed certificate from State Coordinator or Facility Officer.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${
                  certFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                }`}>
                  {certFile ? "Ready" : "Pending"}
                </span>
              </div>
              <label className="flex items-center justify-between h-8 px-2.5 bg-white border border-slate-200 rounded-sm cursor-pointer hover:border-[#1a7a52] transition-colors">
                <span className="text-xs text-slate-500 truncate pr-2">
                  {certFile ? certFile.name : "Attach Signed Cert"}
                </span>
                <Upload className="size-3.5 text-[#1a7a52] shrink-0" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setCertFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            {/* DOC 2: Payment Request Letter */}
            <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">2. Contractor Letter</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Formal firm payment request letter on official letterhead.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${
                  contractorLetterFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                }`}>
                  {contractorLetterFile ? "Ready" : "Pending"}
                </span>
              </div>
              <label className="flex items-center justify-between h-8 px-2.5 bg-white border border-slate-200 rounded-sm cursor-pointer hover:border-[#1a7a52] transition-colors">
                <span className="text-xs text-slate-500 truncate pr-2">
                  {contractorLetterFile ? contractorLetterFile.name : "Attach Request Letter"}
                </span>
                <Upload className="size-3.5 text-[#1a7a52] shrink-0" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setContractorLetterFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            {/* DOC 3: Contractor Invoice */}
            <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">3. Service Invoice</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Original stamped invoice with bank details and tax ID.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${
                  invoiceFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                }`}>
                  {invoiceFile ? "Ready" : "Pending"}
                </span>
              </div>
              <label className="flex items-center justify-between h-8 px-2.5 bg-white border border-slate-200 rounded-sm cursor-pointer hover:border-[#1a7a52] transition-colors">
                <span className="text-xs text-slate-500 truncate pr-2">
                  {invoiceFile ? invoiceFile.name : "Attach Invoice"}
                </span>
                <Upload className="size-3.5 text-[#1a7a52] shrink-0" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setInvoiceFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: EXISTING CLAIMS IN THIS CYCLE */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recorded Utility Claims for this Cycle ({records.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Total Recorded: {formatCurrency(records.reduce((acc, r) => acc + (Number(r.amount_claimed) || 0), 0))}
            </span>
          </div>

          <div className="rounded-sm border border-slate-200 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-200 text-xs">
                  <TableHead className="w-10 text-[11px] font-bold text-slate-700 text-center">S/N</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Category</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Location</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Contractor</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Amount (₦)</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Invoice Ref</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Status</TableHead>
                  <TableHead className="w-24 text-[11px] font-bold text-slate-700 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                      <Loader2 className="size-4 animate-spin inline-block mr-2 text-[#1a7a52]" />
                      Loading recorded claims...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                      No utility claims registered for this state office in {selectedYearVal} yet. Fill the form above to add a claim.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r, idx) => (
                    <TableRow
                      key={r.id || idx}
                      className={`border-b border-slate-100 hover:bg-slate-50 text-xs transition-colors ${
                        editingId === r.id ? "bg-[#1a7a52]/5 font-medium" : ""
                      }`}
                    >
                      <TableCell className="font-semibold text-center text-slate-600">{idx + 1}</TableCell>
                      <TableCell>{getCategoryBadge(r.service_category)}</TableCell>
                      <TableCell className="text-slate-600 capitalize">
                        {r.service_location === "zonal_office" ? "Zonal Office" : "State Office"}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">{r.contractor_name || "—"}</TableCell>
                      <TableCell className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(r.amount_claimed)}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-[11px]">
                        {r.invoice_number || r.payment_request_ref || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold ${
                          r.status === "submitted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {r.status === "submitted" ? "Submitted" : "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditRecord(r)}
                            className="h-7 w-7 p-0 text-[#1a7a52] hover:bg-[#1a7a52]/10 rounded-sm"
                            title="Edit Claim"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRecord(r.id)}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-sm"
                            title="Delete Claim"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-5 rounded-b-sm">
        <span className="text-[11px] text-slate-400 text-center sm:text-left">
          Fields marked with (<span className="text-rose-500">*</span>) are mandatory. Claims are aggregated for Zonal HQ reconciliation.
        </span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {editingId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetForm}
              className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm gap-1"
            >
              <RotateCcw className="size-3" /> New Claim
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClaim}
            disabled={saving || readOnly}
            className="h-8.5 text-xs bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold rounded-sm gap-1.5 shadow-xs border border-[#145c3f]"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : editingId ? (
              <Save className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {editingId ? "Update Claim" : "Save Claim"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
