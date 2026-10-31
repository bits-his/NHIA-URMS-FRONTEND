import * as React from "react";
import {
  Home,
  Save,
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { officeAccommodationApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";

const OFFICE_TYPES = ["Rented", "NHIA-owned", "Co-habiting"] as const;
const CONDITIONS = ["Good", "Fair", "Poor", "Requires Major Repairs"] as const;

interface Props {
  stateId: string;
  zoneId: string;
  year: number;
  profileId?: number;
  readOnly?: boolean;
}

export type AccommodationItem = {
  id?: number;
  state_id?: string | number;
  zone_id?: string | number;
  reporting_year?: number;
  ownership_status: string;
  rent_amount: string | number | null;
  rent_expiry_date: string | null;
  current_condition: string;
  issue_description: string | null;
  remarks: string | null;
  status?: string;
};

export default function OfficeAccommodationTab({
  stateId: initialPropStateId,
  zoneId: initialPropZoneId,
  year: initialPropYear,
  profileId,
  readOnly = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<AccommodationItem[]>([]);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields matching Form 2
  const [currentStateId, setCurrentStateId] = React.useState<string>(initialPropStateId || "");
  const [currentZoneId, setCurrentZoneId] = React.useState<string>(initialPropZoneId || "");
  const [currentYear, setCurrentYear] = React.useState<number>(initialPropYear || new Date().getFullYear());

  // Form input fields matching Form 2
  const [officeType, setOfficeType] = React.useState<string>("Rented");
  const [rentAmount, setRentAmount] = React.useState<string>("");
  const [rentExpiryDate, setRentExpiryDate] = React.useState<string>("");
  const [currentCondition, setCurrentCondition] = React.useState<string>("Good");
  const [issueDescription, setIssueDescription] = React.useState<string>("");
  const [remarks, setRemarks] = React.useState<string>("");

  const yearOptions = buildReportingYearOptions();

  // Load geo options
  React.useEffect(() => {
    Promise.all([
      stockApi.getStates().catch(() => ({ success: true, data: [] })),
      stockApi.getZones().catch(() => ({ success: true, data: [] })),
    ]).then(([stRes, znRes]) => {
      setStates(stRes.data || []);
      setZones(znRes.data || []);
    });
  }, []);

  // Update selected state and auto-populate Zone, State ID, Zone ID
  const selectedState = React.useMemo(() => {
    return states.find(
      (s) => String(s.id) === String(currentStateId) || s.code === currentStateId
    );
  }, [states, currentStateId]);

  const selectedZone = React.useMemo(() => {
    if (selectedState?.zonal_id) {
      return zones.find(
        (z) => z.id === selectedState.zonal_id || z.zonal_code === selectedState.zonal_id
      );
    }
    if (currentZoneId) {
      return zones.find(
        (z) => String(z.id) === String(currentZoneId) || z.zonal_code === currentZoneId
      );
    }
    return null;
  }, [selectedState, currentZoneId, zones]);

  // Handle state change in Form 2
  const handleStateChange = (newStId: string) => {
    setCurrentStateId(newStId);
    const st = states.find((s) => String(s.id) === newStId || s.code === newStId);
    const zn = st?.zonal_id
      ? zones.find((z) => z.id === st.zonal_id || z.zonal_code === st.zonal_id)
      : null;
    if (zn) {
      setCurrentZoneId(zn.id ? String(zn.id) : zn.zonal_code);
    }
  };

  // Load accommodation records for active state & year
  const loadAccommodations = React.useCallback(async () => {
    if (!currentStateId) return;
    setLoading(true);
    try {
      const res = await officeAccommodationApi.list({
        state_id: currentStateId,
        year: String(currentYear),
      });
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentStateId, currentYear]);

  React.useEffect(() => {
    loadAccommodations();
  }, [loadAccommodations]);

  // Populate form for editing a row
  const handleStartEdit = (item: AccommodationItem) => {
    setEditingId(item.id || null);
    setOfficeType(item.ownership_status || "Rented");
    setRentAmount(item.rent_amount != null ? String(item.rent_amount) : "");
    setRentExpiryDate(item.rent_expiry_date || "");
    setCurrentCondition(item.current_condition || "Good");
    setIssueDescription(item.issue_description || "");
    setRemarks(item.remarks || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setOfficeType("Rented");
    setRentAmount("");
    setRentExpiryDate("");
    setCurrentCondition("Good");
    setIssueDescription("");
    setRemarks("");
  };

  // Save Accommodation Record
  const handleSaveRecord = async () => {
    if (!currentStateId) {
      toast.error("Please select a State Office");
      return;
    }

    if (officeType === "Rented" && !rentAmount) {
      toast.error("Please enter the Rent Amount for rented premises");
      return;
    }

    setSaving(true);
    try {
      const isOwned = officeType === "NHIA-owned";
      const payload: Record<string, any> = {
        state_id: currentStateId,
        zone_id: currentZoneId || selectedZone?.id || selectedZone?.zonal_code,
        reporting_year: Number(currentYear),
        ownership_status: officeType,
        rent_amount: isOwned ? null : (rentAmount ? Number(rentAmount) : null),
        rent_expiry_date: isOwned ? null : (rentExpiryDate || null),
        current_condition: currentCondition,
        issue_description: issueDescription || null,
        remarks: remarks || null,
        status: "submitted",
        profile_id: profileId || undefined,
      };

      if (editingId) {
        await officeAccommodationApi.update(editingId, payload);
        toast.success("Accommodation record updated");
      } else {
        await officeAccommodationApi.create(payload);
        toast.success("Accommodation record saved");
      }

      handleCancelEdit();
      await loadAccommodations();
    } catch (err: any) {
      toast.error(err.message || "Failed to save accommodation record");
    } finally {
      setSaving(false);
    }
  };

  // Delete Accommodation Record
  const handleDeleteRecord = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this accommodation record?")) return;
    try {
      await officeAccommodationApi.delete(id);
      toast.success("Record deleted");
      await loadAccommodations();
      if (editingId === id) handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "" || val === "—") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#d4e8dc] p-6 md:p-8 shadow-xs space-y-7">
      {/* Title Header matching Slide 2 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2d42] tracking-tight">
          Form 2 — Office Accommodation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Accommodation reporting by state and year • field names aligned to the workbook.
        </p>
        <div className="w-16 h-1 bg-[#007a8c] mt-2.5 rounded-full" />
      </div>

      {/* TOP ROW: State, Zone, Year */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">State</Label>
          <Select
            value={currentStateId ? String(currentStateId) : ""}
            onValueChange={handleStateChange}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={selectedState?.description || "Select state"}
            >
              <SelectValue placeholder="Select state" />
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
          <Label className="text-xs font-bold text-[#102a43]">Zone</Label>
          <Input
            value={selectedZone?.description || (currentZoneId ? `Zone ${currentZoneId}` : "Auto-populated")}
            readOnly
            placeholder="Auto-populated"
            className="h-10 bg-slate-50 border-[#c8dcd0] text-slate-700 cursor-not-allowed font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Year</Label>
          <Select
            value={currentYear ? String(currentYear) : ""}
            onValueChange={(val) => setCurrentYear(Number(val))}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={currentYear ? String(currentYear) : "Select year"}
            >
              <SelectValue placeholder="Select year" />
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
      </div>

      {/* FORM INPUT FIELDS: Office Type, Rent Amount, Rent Expiry Date, Current Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Office Type</Label>
          <Select
            value={officeType}
            onValueChange={setOfficeType}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={officeType || "Rented / NHIA-owned / Co-habiting"}
            >
              <SelectValue placeholder="Rented / NHIA-owned / Co-habiting" />
            </SelectTrigger>
            <SelectContent>
              {OFFICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Rent Amount (₦)</Label>
          <Input
            type="number"
            step="0.01"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={readOnly || officeType !== "Rented"}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Rent Expiry Date</Label>
          <Input
            type="date"
            value={rentExpiryDate}
            onChange={(e) => setRentExpiryDate(e.target.value)}
            placeholder="dd/mm/yyyy"
            disabled={readOnly || officeType !== "Rented"}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Current Condition</Label>
          <Select
            value={currentCondition}
            onValueChange={setCurrentCondition}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={currentCondition || "Good / Fair / Poor / Requires major repairs"}
            >
              <SelectValue placeholder="Good / Fair / Poor / Requires major repairs" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ROW 3: Describe Issue (for Fair/Poor/Requires Major Repairs only) and Remarks */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#102a43]">
          Describe Issue (for Fair/Poor/Requires Major Repairs only) and Remarks.
        </Label>
        <textarea
          rows={3}
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          placeholder="Describe Issue (for Fair/Poor/Requires Major Repairs only) and Remarks."
          disabled={readOnly}
          className="w-full rounded-md border border-[#c8dcd0] bg-white p-3 text-xs focus-visible:outline-none focus-visible:border-[#007a8c] resize-y"
        />
      </div>

      {/* ROW 4: Remarks & Save Action Button */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 md:col-span-3">
          <Label className="text-xs font-bold text-[#102a43]">Remarks</Label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveRecord}
            disabled={saving || readOnly}
            className="flex-1 h-10 bg-[#007a8c] hover:bg-[#006877] text-white font-medium shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : editingId ? (
              <Save className="w-4 h-4 mr-1" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            {editingId ? "Update Record" : "Save Record"}
          </Button>

          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="h-10 text-xs border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ILLUSTRATIVE RECORD TABLE matching Slide 2 */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#102a43]">Illustrative record table</h3>
          <span className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? "entry" : "entries"} recorded
          </span>
        </div>

        <div className="rounded-xl border border-[#c8dcd0] overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#102a43] hover:bg-[#102a43] border-none">
                <TableHead className="w-12 text-[11px] font-bold text-white text-center">S/N</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Office Type</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Rent (₦)</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Expiry Date</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Current Condition</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Issue description*</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Remarks*</TableHead>
                <TableHead className="w-24 text-[11px] font-bold text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    Loading accommodation records...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No accommodation records logged for this state and year yet. Fill in the fields above to add one.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it, idx) => (
                  <TableRow
                    key={it.id || idx}
                    className="border-b border-[#e5f0ea] hover:bg-[#f6faf8] text-xs transition-colors"
                  >
                    <TableCell className="font-semibold text-slate-700 text-center">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-[#102a43]">{it.ownership_status}</TableCell>
                    <TableCell className="font-semibold text-[#0f3d2e]">
                      {it.ownership_status === "Rented" ? formatCurrency(it.rent_amount) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {it.rent_expiry_date || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          it.current_condition === "Good"
                            ? "bg-emerald-100 text-emerald-800"
                            : it.current_condition === "Fair"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {it.current_condition}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-xs truncate">
                      {it.issue_description || "—"}
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-xs truncate">
                      {it.remarks || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(it)}
                          className="h-7 w-7 p-0 text-[#007a8c] hover:bg-[#eef7fa]"
                          title="Edit row"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(it.id)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
