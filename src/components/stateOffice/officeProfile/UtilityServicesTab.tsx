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
  Layers,
  Send,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [consolidating, setConsolidating] = React.useState(false);

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

  // Multi-Row Form Records State (Form 3: Add one row per service / reporting period)
  const [rows, setRows] = React.useState<UtilityFormRow[]>([
    initialItem
      ? {
        tempId: `edit-${initialItem.id || 1}`,
        id: initialItem.id,
        service_location: initialItem.service_location || "state_office",
        service_category: initialItem.service_category || "generator",
        contractor_name: initialItem.contractor_name || "",
        amount_claimed: initialItem.amount_claimed != null ? String(initialItem.amount_claimed) : "",
        payment_request_ref: initialItem.invoice_number || initialItem.payment_request_ref || "",
        status: initialItem.status || "draft",
        remarks: initialItem.service_description || initialItem.remarks || "",
        supporting_doc: null,
        supporting_doc_name: initialItem.job_completion_cert_name || "",
      }
      : createBlankRow(1, "state_office", "generator"),
  ]);

  // 3 Mandatory Verification Document Attachments
  const [certFile, setCertFile] = React.useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [contractorLetterFile, setContractorLetterFile] = React.useState<File | null>(null);

  // Existing records logged for this cycle
  const [records, setRecords] = React.useState<UtilityRecord[]>([]);

  // Multi-select state for Zonal Consolidation
  const [selectedClaimIds, setSelectedClaimIds] = React.useState<number[]>([]);

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

  // Load existing records from server for the active zone/state and year
  const loadExistingRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await utilityServiceReportApi.list({
        state_id: selectedStateVal || undefined,
        zone_id: selectedZoneVal || undefined,
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
  }, [selectedStateVal, selectedZoneVal, selectedYearVal]);

  React.useEffect(() => {
    loadExistingRecords();
  }, [loadExistingRecords]);

  // Suggest latest known contractor for a category from history
  const getKnownContractor = React.useCallback(
    (cat: string) => {
      const found = records.find((r) => r.service_category === cat && r.contractor_name);
      return found?.contractor_name || "";
    },
    [records]
  );

  // Row manipulation handlers
  const handleAddRow = () => {
    const newIdx = rows.length + 1;
    const defaultCat = newIdx % 2 === 0 ? "security" : "generator";
    const defaultLoc = "state_office";
    const prepopContractor = getKnownContractor(defaultCat);
    setRows((prev) => [...prev, createBlankRow(newIdx, defaultLoc, defaultCat, prepopContractor)]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, fields: Partial<UtilityFormRow>) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, ...fields };
        // If category changed and contractor is blank, try prepopulating
        if (fields.service_category && !updated.contractor_name) {
          updated.contractor_name = getKnownContractor(fields.service_category);
        }
        return updated;
      })
    );
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

  // Category badge
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
      setRows([createBlankRow(1, "state_office", "generator")]);
      setCertFile(null);
      setInvoiceFile(null);
      setContractorLetterFile(null);

      await loadExistingRecords();
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save utility service claims");
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
      setSelectedClaimIds((prev) => prev.filter((item) => item !== id));
      await loadExistingRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove utility claim");
    }
  };

  // Populate row for inline editing from recorded table
  const handleEditRecord = (rec: UtilityRecord) => {
    setRows([
      {
        tempId: `edit-${rec.id}`,
        id: rec.id,
        service_location: rec.service_location || "state_office",
        service_category: rec.service_category || "generator",
        contractor_name: rec.contractor_name || "",
        amount_claimed: rec.amount_claimed != null ? String(rec.amount_claimed) : "",
        payment_request_ref: rec.invoice_number || rec.payment_request_ref || "",
        status: rec.status || "draft",
        remarks: rec.service_description || rec.remarks || "",
        supporting_doc: null,
        supporting_doc_name: rec.job_completion_cert_name || "",
      },
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Zonal Consolidation: Multi-select & Batch Submit to HQ
  const toggleSelectClaim = (id: number) => {
    setSelectedClaimIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const eligible = records.filter((r) => r.id && r.status !== "consolidated");
    if (selectedClaimIds.length === eligible.length) {
      setSelectedClaimIds([]);
    } else {
      setSelectedClaimIds(eligible.map((r) => r.id!));
    }
  };

  const selectedClaimsTotal = React.useMemo(() => {
    return records
      .filter((r) => r.id && selectedClaimIds.includes(r.id))
      .reduce((acc, r) => acc + (Number(r.amount_claimed) || 0), 0);
  }, [records, selectedClaimIds]);

  const handleConsolidateSelected = async () => {
    if (!selectedClaimIds.length) {
      toast.error("Please select at least one claim to consolidate");
      return;
    }

    setConsolidating(true);
    try {
      const zCode = selectedZone?.zonal_code || (selectedZoneVal !== "all" ? selectedZoneVal : undefined);
      const res = await utilityServiceReportApi.consolidate(selectedClaimIds, zCode);
      if (res.success) {
        toast.success(
          `Consolidation Successful! Batch Reference: ${res.batch_id}`,
          {
            description: `${selectedClaimIds.length} utility claims consolidated for HQ payment clearance.`,
          }
        );
        setSelectedClaimIds([]);
        await loadExistingRecords();
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to consolidate reports into HQ batch");
    } finally {
      setConsolidating(false);
    }
  };

  return (
    <Card className="rounded-sm border-slate-200/80 shadow-2xs bg-white">
      <CardContent className="space-y-6 pt-6">
        {/* ═══════════════════════════════════════════════════════════════════════
            TOP HEADER FILTERS (SLIDE 05)
            Zonal Office | State Office | Year | Month | Period From | Period To
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-sm">
          {/* 1. ZONAL OFFICE */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Zonal Office <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedZoneVal}
              onValueChange={handleZoneChange}
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-8.5 text-xs bg-white border-slate-200 rounded-sm"
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

          {/* 2. STATE OFFICE */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              State Office <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedStateVal}
              onValueChange={handleStateChange}
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-8.5 text-xs bg-white border-slate-200 rounded-sm"
                displayValue={selectedState?.description || (selectedStateVal ? `State Office` : undefined)}
              >
                <SelectValue placeholder={selectedZoneVal ? "Select State" : "All States"} />
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

          {/* 3. REPORTING YEAR */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Year <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedYearVal ? String(selectedYearVal) : ""}
              onValueChange={(val) => setSelectedYearVal(Number(val))}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-sm">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. REPORTING MONTH */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Month
            </Label>
            <Select
              value={selectedMonthVal}
              onValueChange={setSelectedMonthVal}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-sm">
                <SelectValue placeholder="Select Month" />
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

          {/* 5. PERIOD FROM (mmm) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Period From
            </Label>
            <Select value={periodFrom} onValueChange={setPeriodFrom} disabled={readOnly}>
              <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHORT_MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. PERIOD TO (mmm) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Period To
            </Label>
            <Select value={periodTo} onValueChange={setPeriodTo} disabled={readOnly}>
              <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHORT_MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1: UTILITY SERVICE RECORDS TABLE (SLIDE 05 SPEC)
            Add one row per service / reporting period
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="size-4 text-[#1a7a52]" />
                Utility Service Records
                <span className="text-slate-400 font-normal">| Add one row per service / reporting period</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Generator servicing reports twice yearly per office; Security and Cleaning report monthly to zone for consolidation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 bg-[#f4f7f5] border border-[#d4e8dc] px-2.5 py-1 rounded-sm">
                Batch Total: {formatCurrency(formTotalAmount)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                disabled={readOnly}
                className="h-8 text-xs border-dashed border-[#1a7a52] text-[#1a7a52] hover:bg-emerald-50 rounded-sm gap-1"
              >
                <Plus className="size-3.5" /> Add Service Row
              </Button>
            </div>
          </div>

          {/* MULTI-ROW INPUT TABLE MATCHING SLIDE 05 */}
          <div className="rounded-sm border border-slate-200 overflow-x-auto shadow-2xs">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-[#102a43] hover:bg-[#102a43] border-none text-white">
                  <TableHead className="w-10 text-[11px] font-bold text-white text-center">S/N</TableHead>
                  <TableHead className="w-36 text-[11px] font-bold text-white">Service Location</TableHead>
                  <TableHead className="w-44 text-[11px] font-bold text-white">Service Category</TableHead>
                  <TableHead className="w-48 text-[11px] font-bold text-white">Contractor (State / Zone)</TableHead>
                  <TableHead className="w-32 text-[11px] font-bold text-white">Amount Due (₦)</TableHead>
                  <TableHead className="w-32 text-[11px] font-bold text-white">Payment Ref</TableHead>
                  <TableHead className="w-36 text-[11px] font-bold text-white">Supporting Doc</TableHead>
                  <TableHead className="w-28 text-[11px] font-bold text-white">Status</TableHead>
                  <TableHead className="min-w-[120px] text-[11px] font-bold text-white">Remarks</TableHead>
                  <TableHead className="w-10 text-[11px] font-bold text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.tempId} className="border-b border-slate-100 hover:bg-slate-50/60 text-xs">
                    {/* S/N */}
                    <TableCell className="font-semibold text-center text-slate-600 align-middle">
                      {idx + 1}
                    </TableCell>

                    {/* Service Location */}
                    <TableCell className="align-middle p-1.5">
                      <Select
                        value={row.service_location}
                        onValueChange={(val) => handleRowChange(idx, { service_location: val })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_LOCATIONS.map((loc) => (
                            <SelectItem key={loc.value} value={loc.value}>
                              {loc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Service Category */}
                    <TableCell className="align-middle p-1.5">
                      <Select
                        value={row.service_category}
                        onValueChange={(val) => handleRowChange(idx, { service_category: val })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Contractor (Prepopulated / editable) */}
                    <TableCell className="align-middle p-1.5">
                      <Input
                        value={row.contractor_name}
                        onChange={(e) => handleRowChange(idx, { contractor_name: e.target.value })}
                        placeholder="Contractor / Firm"
                        disabled={readOnly}
                        className="h-8 text-xs bg-white border-slate-200 rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
                      />
                    </TableCell>

                    {/* Amount Due (NGN) */}
                    <TableCell className="align-middle p-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.amount_claimed}
                        onChange={(e) => handleRowChange(idx, { amount_claimed: e.target.value })}
                        placeholder="0.00"
                        disabled={readOnly}
                        className="h-8 text-xs bg-white border-slate-200 rounded-sm font-medium tabular-nums focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
                      />
                    </TableCell>

                    {/* Payment Request Ref */}
                    <TableCell className="align-middle p-1.5">
                      <Input
                        value={row.payment_request_ref}
                        onChange={(e) => handleRowChange(idx, { payment_request_ref: e.target.value })}
                        placeholder="INV-..."
                        disabled={readOnly}
                        className="h-8 text-xs bg-white border-slate-200 rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
                      />
                    </TableCell>

                    {/* Supporting Document (Upload) */}
                    <TableCell className="align-middle p-1.5">
                      <label className="flex items-center justify-between h-8 px-2 bg-white border border-slate-200 rounded-sm cursor-pointer hover:border-[#1a7a52] transition-colors">
                        <span className="text-[11px] text-slate-500 truncate max-w-[85px]">
                          {row.supporting_doc ? row.supporting_doc.name : row.supporting_doc_name || "Upload file"}
                        </span>
                        <Upload className="size-3 text-[#1a7a52] shrink-0 ml-1" />
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          className="hidden"
                          disabled={readOnly}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleRowChange(idx, {
                                supporting_doc: e.target.files[0],
                                supporting_doc_name: e.target.files[0].name,
                              });
                            }
                          }}
                        />
                      </label>
                    </TableCell>

                    {/* Reporting Status */}
                    <TableCell className="align-middle p-1.5">
                      <Select
                        value={row.status}
                        onValueChange={(val) => handleRowChange(idx, { status: val })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Remarks */}
                    <TableCell className="align-middle p-1.5">
                      <Input
                        value={row.remarks}
                        onChange={(e) => handleRowChange(idx, { remarks: e.target.value })}
                        placeholder="Service details..."
                        disabled={readOnly}
                        className="h-8 text-xs bg-white border-slate-200 rounded-sm focus-visible:ring-1 focus-visible:ring-[#1a7a52]"
                      />
                    </TableCell>

                    {/* Delete Row Action */}
                    <TableCell className="align-middle p-1.5 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={readOnly || rows.length <= 1}
                        className="size-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove row"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: MANDATORY AUDIT VERIFICATION UPLOADS (SLIDE 05)
            All 3 documents must accompany the payment request
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="size-4 text-[#1a7a52]" />
              Required Uploads — All Three Documents Must Accompany the Payment Request
            </Label>
            <span className="text-[10px] text-slate-400 font-medium">
              Mandatory before HQ payment voucher processing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* DOC 1: Job Completion Certificate */}
            <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">1. Duly signed Job Completion Certificate</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Signed by State Coordinator / Zonal Facility Officer.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${certFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                  }`}>
                  {certFile ? "Attached" : "Pending"}
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
                  <p className="text-xs font-bold text-slate-800">2. Firm's Request for Payment</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Formal firm payment request letter on official letterhead.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${contractorLetterFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                  }`}>
                  {contractorLetterFile ? "Attached" : "Pending"}
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
                  <p className="text-xs font-bold text-slate-800">3. Invoice for Services Rendered</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Original stamped invoice with bank details and tax ID.
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold shrink-0 ${invoiceFile ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-600"
                  }`}>
                  {invoiceFile ? "Attached" : "Pending"}
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

        {/* FORM ACTION TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500">
            {rows.length} row{rows.length > 1 ? "s" : ""} in current batch · Total Amount:{" "}
            <strong className="text-slate-900">{formatCurrency(formTotalAmount)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveAllRecords("draft")}
              disabled={saving || readOnly}
              className="h-8.5 text-xs border-slate-200 text-slate-700 rounded-sm gap-1.5"
            >
              <Save className="size-3.5" /> Save Draft
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSaveAllRecords("submitted")}
              disabled={saving || readOnly}
              className="h-8.5 text-xs bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold rounded-sm gap-1.5 shadow-xs border border-[#145c3f]"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Submit to Zone / HQ
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: RECORDED CLAIMS & ZONAL CONSOLIDATION (SLIDE 07)
            Multi-select checkbox & "Consolidate into HQ Payment Request"
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Recorded Utility Claims for this Cycle ({records.length})</span>
                {records.some((r) => r.status === "consolidated") && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    Has Consolidated Batches
                  </Badge>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Zonal Coordinators: Select submitted security/cleaning claims across states to consolidate into one HQ payment request.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-sm">
              Cycle Total: {formatCurrency(records.reduce((acc, r) => acc + (Number(r.amount_claimed) || 0), 0))}
            </span>
          </div>

          {/* ZONAL CONSOLIDATION ACTION BANNER */}
          {selectedClaimIds.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 border-2 border-[#1a7a52] p-3.5 rounded-sm shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-sm bg-[#1a7a52] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <Layers className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#0f3d2e]">
                      {selectedClaimIds.length} Claim{selectedClaimIds.length > 1 ? "s" : ""} Selected for Consolidation
                    </p>
                    <Badge className="bg-[#1a7a52] text-white text-[10px] font-bold">
                      Ready for Batching
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Total batch amount: <strong className="text-slate-900">{formatCurrency(selectedClaimsTotal)}</strong> across selected state offices.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClaimIds([])}
                  className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 rounded-sm"
                >
                  Clear Selection
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConsolidateSelected}
                  disabled={consolidating}
                  className="h-8.5 text-xs bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold rounded-sm gap-1.5 shadow-xs border border-[#145c3f]"
                >
                  {consolidating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Layers className="size-3.5" />
                  )}
                  Consolidate into HQ Payment Request
                </Button>
              </div>
            </div>
          )}

          {/* CLAIMS TABLE WITH MULTI-SELECT CHECKBOXES */}
          <div className="rounded-sm border border-slate-200 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200 text-xs">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={
                        records.length > 0 &&
                        records.filter((r) => r.id && r.status !== "consolidated").length > 0 &&
                        selectedClaimIds.length === records.filter((r) => r.id && r.status !== "consolidated").length
                      }
                      onCheckedChange={toggleSelectAllEligible}
                      aria-label="Select all eligible claims"
                    />
                  </TableHead>
                  <TableHead className="w-10 text-[11px] font-bold text-slate-700 text-center">S/N</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Category</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Location</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Contractor</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Amount (₦)</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Invoice / Ref</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Reporting Status</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-700">Consolidation Batch ID</TableHead>
                  <TableHead className="w-20 text-[11px] font-bold text-slate-700 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      <Loader2 className="size-4 animate-spin inline-block mr-2 text-[#1a7a52]" />
                      Loading recorded utility claims...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No utility claims registered for this state office in {selectedYearVal} yet. Add a row in the table above.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r, idx) => {
                    const isSelected = r.id ? selectedClaimIds.includes(r.id) : false;
                    const isConsolidated = r.status === "consolidated" || !!r.consolidated_batch_id;
                    return (
                      <TableRow
                        key={r.id || idx}
                        className={`border-b border-slate-100 hover:bg-slate-50 text-xs transition-colors ${isSelected ? "bg-emerald-50/40" : ""
                          }`}
                      >
                        {/* Multi-select Checkbox */}
                        <TableCell className="text-center p-2">
                          {r.id && !isConsolidated ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectClaim(r.id!)}
                              aria-label={`Select claim ${r.id}`}
                            />
                          ) : isConsolidated ? (
                            <CheckCircle2 className="size-4 text-emerald-600 inline-block" title="Already Consolidated" />
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* S/N */}
                        <TableCell className="font-semibold text-center text-slate-600">{idx + 1}</TableCell>

                        {/* Category */}
                        <TableCell>{getCategoryBadge(r.service_category)}</TableCell>

                        {/* Location */}
                        <TableCell className="text-slate-600 capitalize">
                          {r.service_location === "zonal_office" ? "Zonal Office" : "State Office"}
                        </TableCell>

                        {/* Contractor */}
                        <TableCell className="font-semibold text-slate-800">{r.contractor_name || "—"}</TableCell>

                        {/* Amount Due */}
                        <TableCell className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(r.amount_claimed)}
                        </TableCell>

                        {/* Invoice Ref */}
                        <TableCell className="text-slate-500 font-mono text-[11px]">
                          {r.invoice_number || r.payment_request_ref || "—"}
                        </TableCell>

                        {/* Reporting Status */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold ${isConsolidated
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : r.status === "submitted"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                          >
                            {isConsolidated ? "Consolidated" : r.status === "submitted" ? "Submitted" : "Draft"}
                          </span>
                        </TableCell>

                        {/* Consolidation Batch ID */}
                        <TableCell>
                          {r.consolidated_batch_id ? (
                            <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              {r.consolidated_batch_id}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Unconsolidated</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRecord(r)}
                              className="h-7 w-7 p-0 text-[#1a7a52] hover:bg-[#1a7a52]/10 rounded-sm"
                              title="Edit / Load into Form"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(r.id)}
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-sm"
                              title="Delete Record"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
