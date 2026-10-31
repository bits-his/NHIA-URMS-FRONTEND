import * as React from "react";
import {
  Users,
  Plus,
  Save,
  Trash2,
  Pencil,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
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
import { stateZonalFocalPersonApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";

export const FOCAL_DOMAINS = [
  "ICT",
  "SERVICOM",
  "Quality Assurance",
  "Enrolment",
  "Claims & Payments",
  "Enforcement & Compliance",
  "Legal Services",
  "Media & Public Relations",
  "Internal Audit",
  "Procurement",
  "Gender & Vulnerable Groups",
  "Human Resources",
  "Store & Logistics",
  "Planning Cell / M&E",
  "Complaints Desk",
  "Finance & Accounts",
];

interface Props {
  stateId: string;
  zoneId: string;
  year: number;
  readOnly?: boolean;
}

export type FocalPersonRow = {
  id?: number;
  state_id?: string | number;
  zone_id?: string | number;
  reporting_year: number;
  domain: string;
  officer_name: string;
  designation: string;
  email: string;
  phone: string;
};

export default function FocalPersonsTab({
  stateId: initialPropStateId,
  zoneId: initialPropZoneId,
  year: initialPropYear,
  readOnly = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [records, setRecords] = React.useState<FocalPersonRow[]>([]);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields matching Form 4
  const [currentYear, setCurrentYear] = React.useState<number>(initialPropYear || new Date().getFullYear());
  const [currentStateId, setCurrentStateId] = React.useState<string>(initialPropStateId || "");
  const [currentZoneId, setCurrentZoneId] = React.useState<string>(initialPropZoneId || "");

  // Input Row 1 & 2 fields matching Form 4
  const [domain, setDomain] = React.useState<string>("ICT");
  const [officerName, setOfficerName] = React.useState<string>("");
  const [designation, setDesignation] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phoneNumber, setPhoneNumber] = React.useState<string>("");

  const yearOptions = buildReportingYearOptions();

  // Load Geo
  React.useEffect(() => {
    Promise.all([
      stockApi.getStates().catch(() => ({ success: true, data: [] })),
      stockApi.getZones().catch(() => ({ success: true, data: [] })),
    ]).then(([stRes, znRes]) => {
      setStates(stRes.data || []);
      setZones(znRes.data || []);
    });
  }, []);

  // Sync selected state and zone
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

  // Handle state change
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

  // Load records for active state & year
  const loadRecords = React.useCallback(async () => {
    if (!currentStateId) return;
    setLoading(true);
    try {
      const res = await stateZonalFocalPersonApi.list({
        state_id: currentStateId,
        year: String(currentYear),
      });
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentStateId, currentYear]);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Start Edit
  const handleStartEdit = (row: FocalPersonRow) => {
    setEditingId(row.id || null);
    setDomain(row.domain || "ICT");
    setOfficerName(row.officer_name || "");
    setDesignation(row.designation || "");
    setEmail(row.email || "");
    setPhoneNumber(row.phone || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDomain("ICT");
    setOfficerName("");
    setDesignation("");
    setEmail("");
    setPhoneNumber("");
  };

  // Save / Add Officer to Register
  const handleSaveOfficer = async () => {
    if (!currentStateId) {
      toast.error("Please select a State Office");
      return;
    }
    if (!officerName.trim()) {
      toast.error("Please enter Name of Officer");
      return;
    }
    if (!designation.trim()) {
      toast.error("Please enter Designation");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        state_id: currentStateId,
        zone_id: currentZoneId || selectedZone?.id || selectedZone?.zonal_code,
        reporting_year: Number(currentYear),
        domain,
        officer_name: officerName.trim(),
        designation: designation.trim(),
        email: email.trim() || null,
        phone: phoneNumber.trim() || null,
      };

      if (editingId) {
        await stateZonalFocalPersonApi.update(editingId, payload);
        toast.success("Officer record updated");
      } else {
        await stateZonalFocalPersonApi.create(payload);
        toast.success("Officer added to register");
      }

      handleCancelEdit();
      await loadRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to save officer record");
    } finally {
      setSaving(false);
    }
  };

  // Delete Officer
  const handleDeleteOfficer = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to remove this focal person from the register?")) return;
    try {
      await stateZonalFocalPersonApi.delete(id);
      toast.success("Officer removed");
      await loadRecords();
      if (editingId === id) handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove officer");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#d4e8dc] p-6 md:p-8 shadow-xs space-y-7">
      {/* Title Header matching Slide 4 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2d42] tracking-tight">
          Form 4 — Focal Persons
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Register of designated officers by domain • fields copied from the Excel sheet.
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
              displayValue={currentYear ? String(currentYear) : "Select reporting year"}
            >
              <SelectValue placeholder="Select reporting year" />
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

      {/* INPUT ROW 1: Domain, Name of Officer, Designation, Email matching Slide 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Domain</Label>
          <Select
            value={domain}
            onValueChange={setDomain}
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
              displayValue={domain || "Select domain"}
            >
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {FOCAL_DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Name of Officer</Label>
          <Input
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            placeholder="Enter full name"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Designation</Label>
          <Input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Enter designation"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#102a43]">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>
      </div>

      {/* INPUT ROW 2: Phone Number & Action Button matching Slide 4 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs font-bold text-[#102a43]">Phone Number</Label>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            disabled={readOnly}
            className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-1">
          <Button
            type="button"
            onClick={handleSaveOfficer}
            disabled={saving || readOnly}
            className="w-full h-10 bg-[#007a8c] hover:bg-[#006877] text-white font-medium shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : editingId ? (
              <Save className="w-4 h-4 mr-1" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            {editingId ? "Update Officer" : "Add to Register"}
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

      {/* ILLUSTRATIVE FOCAL-PERSON REGISTER TABLE matching Slide 4 */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#102a43]">Illustrative focal-person register</h3>
          <span className="text-xs text-slate-400">
            {records.length} {records.length === 1 ? "officer" : "officers"} registered
          </span>
        </div>

        <div className="rounded-xl border border-[#c8dcd0] overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#102a43] hover:bg-[#102a43] border-none">
                <TableHead className="w-12 text-[11px] font-bold text-white text-center">S/N</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Domain</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Name</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Designation</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Email</TableHead>
                <TableHead className="text-[11px] font-bold text-white">Phone Number</TableHead>
                <TableHead className="text-[11px] font-bold text-white text-center">Year</TableHead>
                <TableHead className="w-24 text-[11px] font-bold text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    Loading register...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No focal persons appointed for this state office and year yet. Add an officer above.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r, idx) => (
                  <TableRow
                    key={r.id || idx}
                    className="border-b border-[#e5f0ea] hover:bg-[#f6faf8] text-xs transition-colors"
                  >
                    <TableCell className="font-semibold text-slate-700 text-center">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-[#102a43]">{r.domain}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{r.officer_name}</TableCell>
                    <TableCell className="text-slate-600">{r.designation}</TableCell>
                    <TableCell className="text-slate-600">{r.email || "—"}</TableCell>
                    <TableCell className="text-slate-600">{r.phone || "—"}</TableCell>
                    <TableCell className="text-slate-700 text-center">{r.reporting_year}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(r)}
                          className="h-7 w-7 p-0 text-[#007a8c] hover:bg-[#eef7fa]"
                          title="Edit officer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOfficer(r.id)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          title="Remove officer"
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

      {/* Footer Note matching Slide 4 */}
      <p className="text-xs text-slate-500 italic">
        Users can add multiple focal-person records for different domains. State, zone and year filters support historical lookup and national SQA visibility.
      </p>
    </div>
  );
}
