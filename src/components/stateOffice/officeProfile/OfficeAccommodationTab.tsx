import * as React from "react";
import {
  Home,
  Save,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  initialItem?: any;
  onSaved?: () => void;
  onCancel?: () => void;
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
  initialItem = null,
  onSaved,
  onCancel,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(initialItem?.id || null);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields
  const [currentZoneId, setCurrentZoneId] = React.useState<string>(
    initialItem?.zone_id ? String(initialItem.zone_id) : initialPropZoneId || ""
  );
  const [currentStateId, setCurrentStateId] = React.useState<string>(
    initialItem?.state_id ? String(initialItem.state_id) : initialPropStateId || ""
  );
  const [currentYear, setCurrentYear] = React.useState<number>(
    initialItem?.reporting_year ? Number(initialItem.reporting_year) : initialPropYear || new Date().getFullYear()
  );

  // Form input fields
  const [officeType, setOfficeType] = React.useState<string>(initialItem?.ownership_status || "Rented");
  const [rentAmount, setRentAmount] = React.useState<string>(
    initialItem?.rent_amount != null ? String(initialItem.rent_amount) : ""
  );
  const [rentExpiryDate, setRentExpiryDate] = React.useState<string>(initialItem?.rent_expiry_date || "");
  const [currentCondition, setCurrentCondition] = React.useState<string>(initialItem?.current_condition || "Good");
  const [issueDescription, setIssueDescription] = React.useState<string>(initialItem?.issue_description || "");
  const [remarks, setRemarks] = React.useState<string>(initialItem?.remarks || "");

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

  // Sync with initialItem changes
  React.useEffect(() => {
    if (initialItem) {
      setEditingId(initialItem.id || null);
      if (initialItem.zone_id) setCurrentZoneId(String(initialItem.zone_id));
      if (initialItem.state_id) setCurrentStateId(String(initialItem.state_id));
      if (initialItem.reporting_year) setCurrentYear(Number(initialItem.reporting_year));
      setOfficeType(initialItem.ownership_status || "Rented");
      setRentAmount(initialItem.rent_amount != null ? String(initialItem.rent_amount) : "");
      setRentExpiryDate(initialItem.rent_expiry_date || "");
      setCurrentCondition(initialItem.current_condition || "Good");
      setIssueDescription(initialItem.issue_description || "");
      setRemarks(initialItem.remarks || "");
    }
  }, [initialItem]);

  // Selected State and Zone objects for full name display
  const selectedZone = React.useMemo(() => {
    if (!currentZoneId) return null;
    return zones.find(
      (z) => String(z.id) === String(currentZoneId) || z.zonal_code === currentZoneId
    );
  }, [currentZoneId, zones]);

  const selectedState = React.useMemo(() => {
    if (!currentStateId) return null;
    return states.find(
      (s) => String(s.id) === String(currentStateId) || s.code === currentStateId
    );
  }, [currentStateId, states]);

  // Filter states by selected zone
  const availableStates = React.useMemo(() => {
    if (!currentZoneId || currentZoneId === "all") return states;
    return states.filter(
      (s) => String(s.zonal_id) === String(currentZoneId) || s.zonal_code === currentZoneId
    );
  }, [states, currentZoneId]);

  // Handle Zone selection: first
  const handleZoneChange = (zoneVal: string) => {
    const nextZone = zoneVal === "all" ? "" : zoneVal;
    setCurrentZoneId(nextZone);
    if (nextZone) {
      const inZone = states.filter(
        (s) => String(s.zonal_id) === String(nextZone) || s.zonal_code === nextZone
      );
      const isCurInZone = inZone.some(
        (s) => String(s.id) === String(currentStateId) || s.code === currentStateId
      );
      if (!isCurInZone) {
        setCurrentStateId(inZone[0] ? String(inZone[0].id) : "");
      }
    }
  };

  // Handle State selection: second
  const handleStateChange = (newStId: string) => {
    const nextState = newStId === "all" ? "" : newStId;
    setCurrentStateId(nextState);
    if (nextState) {
      const st = states.find((s) => String(s.id) === nextState || s.code === nextState);
      if (st?.zonal_id) {
        setCurrentZoneId(String(st.zonal_id));
      }
    }
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
        zone_id: currentZoneId || undefined,
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
        toast.success("Accommodation record updated successfully");
      } else {
        await officeAccommodationApi.create(payload);
        toast.success("Accommodation record registered successfully");
      }

      if (onSaved) {
        onSaved();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save accommodation record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-sm border-slate-200/80 shadow-2xs bg-white">
      <CardContent className="space-y-5 pt-6">
        {/* ROW 1: ZONE FIRST (SELECT), THEN STATE (SELECT FROM ZONE), YEAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* ZONE SELECT FIRST */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Zonal Office <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={currentZoneId ? String(currentZoneId) : ""}
              onValueChange={handleZoneChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedZone?.description || (currentZoneId ? `Zone ${currentZoneId}` : undefined)}
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
              value={currentStateId ? String(currentStateId) : ""}
              onValueChange={handleStateChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedState?.description || (currentStateId ? `State Office` : undefined)}
              >
                <SelectValue placeholder={currentZoneId ? "Select state in zone" : "Select zone first or state"} />
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
              value={currentYear ? String(currentYear) : ""}
              onValueChange={(val) => setCurrentYear(Number(val))}
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
        </div>

        {/* ROW 2: OFFICE TYPE, RENT AMOUNT, RENT EXPIRY DATE, CURRENT CONDITION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Office Type <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={officeType}
              onValueChange={setOfficeType}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Office Type" />
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
            <Label className="text-xs font-semibold text-slate-700">
              Annual Rent (₦) {officeType === "Rented" && <span className="text-rose-500">*</span>}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder={officeType === "Rented" ? "e.g. 5000000" : "N/A (Owned)"}
              disabled={readOnly || officeType !== "Rented"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Rent Expiry Date {officeType === "Rented" && <span className="text-rose-500">*</span>}
            </Label>
            <Input
              type="date"
              value={rentExpiryDate}
              onChange={(e) => setRentExpiryDate(e.target.value)}
              disabled={readOnly || officeType !== "Rented"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Current Condition <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={currentCondition}
              onValueChange={setCurrentCondition}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Condition" />
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

        {/* ROW 3: ISSUE DESCRIPTION */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            Issue Description (for Fair / Poor / Requires Major Repairs)
          </Label>
          <textarea
            rows={3}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Describe facility defects, structural maintenance, or repair requirements..."
            disabled={readOnly}
            className="w-full rounded-sm border border-slate-200 bg-white p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007a8c] resize-y"
          />
        </div>

        {/* ROW 4: REMARKS */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Remarks / Operational Notes</Label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Additional notes on lease renewal or landlord liaison..."
            disabled={readOnly}
            className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
          />
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-5 rounded-b-sm">
        <span className="text-[11px] text-slate-400 text-center sm:text-left">
          Fields marked with (<span className="text-rose-500">*</span>) are mandatory.
        </span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
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
            onClick={handleSaveRecord}
            disabled={saving || readOnly}
            className="h-8 text-xs bg-[#0f2d42] hover:bg-[#1a3d54] text-white font-medium rounded-sm gap-1.5"
          >
            {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
            {editingId ? "Update Record" : "Save Record"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
