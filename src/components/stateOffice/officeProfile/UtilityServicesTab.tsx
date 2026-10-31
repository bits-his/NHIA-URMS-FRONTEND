import * as React from "react";
import {
  Wrench,
  Plus,
  Save,
  Trash2,
  Upload,
  Download,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  { value: "generator", label: "Generator Services" },
  { value: "security", label: "Security Services" },
  { value: "cleaning", label: "Cleaning & Horticulture" },
  { value: "other", label: "Electricity / Water / Other" },
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
}

export type UtilityRecord = {
  id?: number;
  reference_id?: string;
  service_location?: string;
  service_category: string;
  contractor_name: string;
  amount_claimed: number | string;
  payment_request_ref?: string;
  supporting_doc?: File | null;
  supporting_doc_name?: string;
  status: string;
  remarks: string;
};

export default function UtilityServicesTab({
  stateId: propStateId,
  zoneId: propZoneId,
  year: propYear,
  profileId,
  userRole = "",
  readOnly = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields matching Form 3
  const [selectedZoneVal, setSelectedZoneVal] = React.useState<string>(propZoneId || "");
  const [selectedStateVal, setSelectedStateVal] = React.useState<string>(propStateId || "");
  const [selectedYearVal, setSelectedYearVal] = React.useState<number>(propYear || new Date().getFullYear());
  const [selectedMonthVal, setSelectedMonthVal] = React.useState<string>(String(new Date().getMonth() + 1));
  const [periodFrom, setPeriodFrom] = React.useState<string>("Jan");
  const [periodTo, setPeriodTo] = React.useState<string>("Jun");

  // Multi-row records matching Form 3 Dynamic Table
  const [rows, setRows] = React.useState<UtilityRecord[]>([
    {
      service_location: "state_office",
      service_category: "generator",
      contractor_name: "",
      amount_claimed: "",
      payment_request_ref: "",
      supporting_doc: null,
      status: "draft",
      remarks: "",
    },
  ]);

  // Section 2: 3 Mandatory Upload Files
  const [certAttached, setCertAttached] = React.useState<boolean>(false);
  const [certFile, setCertFile] = React.useState<File | null>(null);

  const [paymentRequestAttached, setPaymentRequestAttached] = React.useState<boolean>(false);
  const [paymentRequestFile, setPaymentRequestFile] = React.useState<File | null>(null);

  const [invoiceAttached, setInvoiceAttached] = React.useState<boolean>(false);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);

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

  // Sync selected state / zone
  const selectedState = React.useMemo(() => {
    return states.find(
      (s) => String(s.id) === String(selectedStateVal) || s.code === selectedStateVal
    );
  }, [states, selectedStateVal]);

  const selectedZone = React.useMemo(() => {
    if (selectedState?.zonal_id) {
      return zones.find(
        (z) => z.id === selectedState.zonal_id || z.zonal_code === selectedState.zonal_id
      );
    }
    if (selectedZoneVal) {
      return zones.find(
        (z) => String(z.id) === String(selectedZoneVal) || z.zonal_code === selectedZoneVal
      );
    }
    return null;
  }, [selectedState, selectedZoneVal, zones]);

  // Load existing records from server
  const loadExistingRecords = React.useCallback(async () => {
    if (!selectedStateVal) return;
    setLoading(true);
    try {
      const res = await utilityServiceReportApi.list({
        state_id: selectedStateVal,
        year: String(selectedYearVal),
      });
      if (res.success && res.data && res.data.length > 0) {
        const mapped: UtilityRecord[] = res.data.map((r: any) => ({
          id: r.id,
          reference_id: r.reference_id,
          service_location: "state_office",
          service_category: r.service_category || "generator",
          contractor_name: r.contractor_name || "",
          amount_claimed: r.amount_claimed != null ? String(r.amount_claimed) : "",
          payment_request_ref: r.invoice_number || r.reference_id || "",
          supporting_doc: null,
          supporting_doc_name: r.job_completion_cert_name || r.invoice_name || "",
          status: r.status || "draft",
          remarks: r.service_description || "",
        }));
        setRows(mapped);
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

  // Add one row per service
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        service_location: "state_office",
        service_category: "security",
        contractor_name: "",
        amount_claimed: "",
        payment_request_ref: "",
        supporting_doc: null,
        status: "draft",
        remarks: "",
      },
    ]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Update row field
  const handleUpdateRow = (index: number, key: keyof UtilityRecord, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  // Save row to backend
  const handleSaveRow = async (index: number) => {
    const row = rows[index];
    if (!selectedStateVal) {
      toast.error("Please select a State Office");
      return;
    }
    if (!row.contractor_name) {
      toast.error("Please enter Contractor Name");
      return;
    }
    if (!row.amount_claimed) {
      toast.error("Please enter Amount Due");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        state_id: selectedStateVal,
        zone_id: selectedZone?.id ? String(selectedZone.id) : (selectedZoneVal || ""),
        reporting_year: Number(selectedYearVal),
        reporting_month: Number(selectedMonthVal),
        service_category: row.service_category,
        frequency: row.service_category === "generator" ? "biannual" : "monthly",
        contractor_name: row.contractor_name,
        amount_claimed: Number(row.amount_claimed),
        invoice_number: row.payment_request_ref || "",
        service_description: row.remarks || "",
        status: row.status || "draft",
        profile_id: profileId || undefined,
      };

      const files = {
        job_completion_cert: certFile || null,
        invoice: row.supporting_doc || invoiceFile || null,
        contractor_letter: paymentRequestFile || null,
      };

      const res = await utilityServiceReportApi.save(payload, files, row.id || null);
      toast.success(row.id ? `Row #${index + 1} updated` : `Row #${index + 1} saved`);
      if (res?.data?.id) {
        handleUpdateRow(index, "id", res.data.id);
      }
      await loadExistingRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to save row");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#d4e8dc] p-6 md:p-8 shadow-xs space-y-7">
      {/* Title Header matching Slide 3 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2d42] tracking-tight">
          Form 3 — Utility Services
        </h1>
        <div className="w-16 h-1 bg-[#007a8c] mt-2.5 rounded-full" />
      </div>

      {/* TOP ROW: Zonal Office, State Office, Year, Month, Period From, Period To */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Zonal Office</Label>
          <Select
            value={selectedZoneVal}
            onValueChange={setSelectedZoneVal}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={selectedZone?.description || "Select ▾"}
            >
              <SelectValue placeholder="Select ▾" />
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

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">State Office</Label>
          <Select
            value={selectedStateVal}
            onValueChange={(val) => {
              setSelectedStateVal(val);
              const st = states.find((s) => String(s.id) === val || s.code === val);
              if (st?.zonal_id) setSelectedZoneVal(String(st.zonal_id));
            }}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={selectedState?.description || "Select ▾"}
            >
              <SelectValue placeholder="Select ▾" />
            </SelectTrigger>
            <SelectContent>
              {states.map((st) => (
                <SelectItem key={st.id} value={String(st.id)}>
                  {st.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Year</Label>
          <Select
            value={String(selectedYearVal)}
            onValueChange={(val) => setSelectedYearVal(Number(val))}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={String(selectedYearVal)}
            >
              <SelectValue placeholder="Select ▾" />
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

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Month</Label>
          <Select
            value={selectedMonthVal}
            onValueChange={setSelectedMonthVal}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={MONTHS[Number(selectedMonthVal) - 1] || "Select / specify"}
            >
              <SelectValue placeholder="Select / specify" />
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

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Period From</Label>
          <Input
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            placeholder="mmm"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Period To</Label>
          <Input
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            placeholder="mmm"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>
      </div>

      {/* SECTION 1: UTILITY SERVICE RECORDS | Add one row per service / reporting period */}
      <div className="space-y-2 pt-2">
        <div className="bg-[#e9f2ee] px-4 py-2 rounded-lg border border-[#d2e4db] flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#102a43]">
            UTILITY SERVICE RECORDS | Add one row per service / reporting period
          </h3>
          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            disabled={readOnly}
            className="h-7 text-xs bg-[#007a8c] hover:bg-[#006877] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Service Row
          </Button>
        </div>

        <div className="rounded-xl border border-[#c8dcd0] overflow-x-auto shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#102a43] hover:bg-[#102a43] border-none">
                <TableHead className="w-10 text-[11px] font-bold text-white text-center">S/N</TableHead>
                <TableHead className="min-w-[130px] text-[11px] font-bold text-white">Service Location</TableHead>
                <TableHead className="min-w-[140px] text-[11px] font-bold text-white">Service Category</TableHead>
                <TableHead className="min-w-[170px] text-[11px] font-bold text-white">Contractor (State / Zonal Office)</TableHead>
                <TableHead className="min-w-[120px] text-[11px] font-bold text-white">Amount Due (NGN)</TableHead>
                <TableHead className="min-w-[130px] text-[11px] font-bold text-white">Payment Request Reference</TableHead>
                <TableHead className="min-w-[140px] text-[11px] font-bold text-white">Supporting Document</TableHead>
                <TableHead className="min-w-[110px] text-[11px] font-bold text-white">Reporting Status</TableHead>
                <TableHead className="min-w-[130px] text-[11px] font-bold text-white">Remarks</TableHead>
                <TableHead className="w-20 text-[11px] font-bold text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx} className="border-b border-[#e5f0ea] hover:bg-[#f8fbf9] text-xs">
                  <TableCell className="font-semibold text-center text-slate-700">{idx + 1}</TableCell>

                  {/* Service Location */}
                  <TableCell>
                    <Select
                      value={r.service_location || "state_office"}
                      onValueChange={(val) => handleUpdateRow(idx, "service_location", val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-[#c8dcd0]">
                        <SelectValue placeholder="Select ▾" />
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
                  <TableCell>
                    <Select
                      value={r.service_category}
                      onValueChange={(val) => handleUpdateRow(idx, "service_category", val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-[#c8dcd0]">
                        <SelectValue placeholder="Select ▾" />
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

                  {/* Contractor */}
                  <TableCell>
                    <Input
                      value={r.contractor_name}
                      onChange={(e) => handleUpdateRow(idx, "contractor_name", e.target.value)}
                      placeholder="Prepopulated / editable"
                      disabled={readOnly}
                      className="h-8 text-xs bg-white border-[#c8dcd0]"
                    />
                  </TableCell>

                  {/* Amount Due */}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.amount_claimed}
                      onChange={(e) => handleUpdateRow(idx, "amount_claimed", e.target.value)}
                      placeholder="Enter amount"
                      disabled={readOnly}
                      className="h-8 text-xs bg-white border-[#c8dcd0]"
                    />
                  </TableCell>

                  {/* Payment Request Ref */}
                  <TableCell>
                    <Input
                      value={r.payment_request_ref}
                      onChange={(e) => handleUpdateRow(idx, "payment_request_ref", e.target.value)}
                      placeholder="Attach / enter ref"
                      disabled={readOnly}
                      className="h-8 text-xs bg-white border-[#c8dcd0]"
                    />
                  </TableCell>

                  {/* Supporting Document */}
                  <TableCell>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#007a8c] hover:underline">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[90px]">
                        {r.supporting_doc?.name || r.supporting_doc_name || "Upload file"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={readOnly}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpdateRow(idx, "supporting_doc", e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </TableCell>

                  {/* Reporting Status */}
                  <TableCell>
                    <Select
                      value={r.status || "draft"}
                      onValueChange={(val) => handleUpdateRow(idx, "status", val)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-[#c8dcd0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Remarks */}
                  <TableCell>
                    <Input
                      value={r.remarks}
                      onChange={(e) => handleUpdateRow(idx, "remarks", e.target.value)}
                      placeholder="Remarks"
                      disabled={readOnly}
                      className="h-8 text-xs bg-white border-[#c8dcd0]"
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveRow(idx)}
                        disabled={saving || readOnly}
                        className="h-7 w-7 p-0 bg-[#007a8c] hover:bg-[#006877] text-white"
                        title="Save Row"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      {rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRow(idx)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          title="Remove Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SECTION 2: REQUIRED UPLOADS — ALL THREE DOCUMENTS MUST ACCOMPANY THE PAYMENT REQUEST */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#102a43]">
          REQUIRED UPLOADS — ALL THREE DOCUMENTS MUST ACCOMPANY THE PAYMENT REQUEST
        </h3>

        <div className="rounded-xl border border-[#c8dcd0] overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#102a43] hover:bg-[#102a43] border-none">
                <TableHead className="w-12 text-[11px] font-bold text-white text-center">S/N</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Required Attachment</TableHead>
                <TableHead className="w-48 text-[11px] font-bold text-white text-right">Attached?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Doc 1 */}
              <TableRow className="border-b border-[#e5f0ea] hover:bg-[#f8fbf9] text-xs">
                <TableCell className="font-semibold text-center text-slate-700">1</TableCell>
                <TableCell className="font-medium text-[#102a43]">
                  Duly signed Job Completion Certificate
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCertAttached(!certAttached)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                        certAttached || certFile
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {certAttached || certFile ? "Yes" : "No"}
                    </button>
                    <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-[#007a8c] hover:underline">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[100px]">{certFile ? certFile.name : "Attach"}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setCertFile(e.target.files[0]);
                            setCertAttached(true);
                          }
                        }}
                      />
                    </label>
                  </div>
                </TableCell>
              </TableRow>

              {/* Doc 2 */}
              <TableRow className="border-b border-[#e5f0ea] hover:bg-[#f8fbf9] text-xs">
                <TableCell className="font-semibold text-center text-slate-700">2</TableCell>
                <TableCell className="font-medium text-[#102a43]">
                  Firm's Request for Payment
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentRequestAttached(!paymentRequestAttached)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                        paymentRequestAttached || paymentRequestFile
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {paymentRequestAttached || paymentRequestFile ? "Yes" : "No"}
                    </button>
                    <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-[#007a8c] hover:underline">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[100px]">
                        {paymentRequestFile ? paymentRequestFile.name : "Attach"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setPaymentRequestFile(e.target.files[0]);
                            setPaymentRequestAttached(true);
                          }
                        }}
                      />
                    </label>
                  </div>
                </TableCell>
              </TableRow>

              {/* Doc 3 */}
              <TableRow className="border-b border-[#e5f0ea] hover:bg-[#f8fbf9] text-xs">
                <TableCell className="font-semibold text-center text-slate-700">3</TableCell>
                <TableCell className="font-medium text-[#102a43]">
                  Invoice for Services Rendered
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setInvoiceAttached(!invoiceAttached)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                        invoiceAttached || invoiceFile
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {invoiceAttached || invoiceFile ? "Yes" : "No"}
                    </button>
                    <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-[#007a8c] hover:underline">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[100px]">{invoiceFile ? invoiceFile.name : "Attach"}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setInvoiceFile(e.target.files[0]);
                            setInvoiceAttached(true);
                          }
                        }}
                      />
                    </label>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SECTION 3: REPORTING AND CONTRACTOR RULES matching Slide 3 */}
      <div className="rounded-2xl border border-[#d6e8f4] bg-[#f0f7fb] p-5 space-y-1.5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#102a43]">
          REPORTING AND CONTRACTOR RULES
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Generator services: each state and zonal office reports separately twice yearly; each has its own contractor. Security and cleaning/horticulture: states report monthly to their zone; the zone consolidates one payment request to HQ. States and their zone share the same contractor for these services. Contractor details should be prepopulated where available, editable by authorised users and retained by effective year.
        </p>
      </div>
    </div>
  );
}
