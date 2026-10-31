import * as React from "react";
import {
  Building2,
  Calendar,
  Upload,
  Download,
  Trash2,
  Save,
  Send,
  History,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
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
import { apiFileUrl } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";

interface Props {
  profile: any;
  onChange: (fields: Record<string, any>) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  states: any[];
  zones: any[];
  previousProfiles?: any[];
  readOnly?: boolean;
  isSaving?: boolean;
}

export default function OfficeProfileGeneralTab({
  profile,
  onChange,
  onSaveDraft,
  onSubmit,
  onFileSelect,
  selectedFile,
  states,
  zones,
  previousProfiles = [],
  readOnly = false,
  isSaving = false,
}: Props) {
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const yearOptions = buildReportingYearOptions();

  // Find selected state and zone details
  const selectedState = React.useMemo(() => {
    if (!profile?.state_id) return null;
    return states.find(
      (s) => String(s.id) === String(profile.state_id) || s.code === profile.state_id
    );
  }, [profile?.state_id, states]);

  const selectedZone = React.useMemo(() => {
    if (selectedState?.zonal_id) {
      return zones.find(
        (z) => z.id === selectedState.zonal_id || z.zonal_code === selectedState.zonal_id
      );
    }
    if (profile?.zone_id) {
      return zones.find(
        (z) => String(z.id) === String(profile.zone_id) || z.zonal_code === profile.zone_id
      );
    }
    return null;
  }, [selectedState, profile?.zone_id, zones]);

  // Handle state change: auto-derive zone and prepopulated IDs
  const handleStateChange = (stateVal: string) => {
    const st = states.find((s) => String(s.id) === stateVal || s.code === stateVal);
    const zn = st?.zonal_id
      ? zones.find((z) => z.id === st.zonal_id || z.zonal_code === st.zonal_id)
      : null;

    const stateCode = st?.code || (st?.description ? st.description.slice(0, 3).toUpperCase() : "ST");
    const zoneCode = zn?.zonal_code || (zn?.description ? zn.description.slice(0, 2).toUpperCase() : "ZN");

    onChange({
      state_id: stateVal,
      state_code: st?.code || stateVal,
      zone_id: zn?.id ? String(zn.id) : (zn?.zonal_code || profile?.zone_id || ""),
      zonal_code: zn?.zonal_code || "",
    });
  };

  const zoneDisplayName = selectedZone?.description || (profile?.zonal_code ? `Zone ${profile.zonal_code}` : "Auto-populated from state");

  // Filter previous year profiles for the same state
  const stateHistoryProfiles = React.useMemo(() => {
    if (!profile?.state_id) return [];
    return previousProfiles.filter(
      (p) =>
        (String(p.state_id) === String(profile.state_id) || p.state_code === profile.state_code) &&
        p.reporting_year !== profile?.reporting_year
    );
  }, [previousProfiles, profile?.state_id, profile?.state_code, profile?.reporting_year]);

  return (
    <div className="bg-white rounded-2xl border border-[#d4e8dc] p-6 md:p-8 shadow-xs space-y-7">
      {/* Title Header matching Slide 1 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2d42] tracking-tight">
          Form 1 — General Information
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          State profile and annual planning information • fields copied from the Excel sheet.
        </p>
        <div className="w-16 h-1 bg-[#007a8c] mt-2.5 rounded-full" />
      </div>

      {/* Grid Fields */}
      <div className="space-y-5">
        {/* ROW 1: State, Zone, Year */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">State</Label>
            <Select
              value={profile?.state_id ? String(profile.state_id) : ""}
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
              value={zoneDisplayName}
              readOnly
              placeholder="Auto-populated from state"
              className="h-10 bg-slate-50 border-[#c8dcd0] text-slate-700 cursor-not-allowed font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Year</Label>
            <Select
              value={profile?.reporting_year ? String(profile.reporting_year) : ""}
              onValueChange={(val) => onChange({ reporting_year: Number(val) })}
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-10 bg-white border-[#c8dcd0] focus:border-[#007a8c]"
                displayValue={profile?.reporting_year ? String(profile.reporting_year) : "Select reporting year"}
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

        {/* ROW 2: Staff Strength, State Coordinator, Phone Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Staff Strength</Label>
            <Input
              type="number"
              min="0"
              value={profile?.staff_strength ?? ""}
              onChange={(e) =>
                onChange({
                  staff_strength: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              placeholder="Enter number"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">State Coordinator</Label>
            <Input
              value={profile?.coordinator_name || ""}
              onChange={(e) => onChange({ coordinator_name: e.target.value })}
              placeholder="Enter full name"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Phone Number</Label>
            <Input
              type="tel"
              value={profile?.coordinator_phone || ""}
              onChange={(e) => onChange({ coordinator_phone: e.target.value })}
              placeholder="Enter phone number"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>
        </div>

        {/* ROW 3: Personal Email, Address, Office Email */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Personal Email</Label>
            <Input
              type="email"
              value={profile?.coordinator_email || ""}
              onChange={(e) => onChange({ coordinator_email: e.target.value })}
              placeholder="Enter email"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Address</Label>
            <Input
              value={profile?.office_address || ""}
              onChange={(e) => onChange({ office_address: e.target.value })}
              placeholder="Enter office address"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Office Email</Label>
            <Input
              type="email"
              value={profile?.office_email || ""}
              onChange={(e) => onChange({ office_email: e.target.value })}
              placeholder="Enter official email"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>
        </div>

        {/* ROW 4: Enrolment Target, Budget (₦), Annual Operational Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Enrolment Target</Label>
            <Input
              type="number"
              min="0"
              value={profile?.enrolment_target ?? ""}
              onChange={(e) =>
                onChange({
                  enrolment_target: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="Enter target"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Budget (₦)</Label>
            <Input
              type="number"
              step="0.01"
              value={profile?.annual_budget ?? ""}
              onChange={(e) =>
                onChange({
                  annual_budget: e.target.value === "" ? null : e.target.value,
                })
              }
              placeholder="Enter approved budget"
              disabled={readOnly}
              className="h-10 bg-white border-[#c8dcd0] focus-visible:border-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#102a43]">Annual Operational Plan</Label>
            <div className="relative">
              <label className="flex items-center justify-between h-10 px-3 bg-white border border-[#c8dcd0] rounded-md cursor-pointer hover:border-[#007a8c] transition-colors">
                <span className="text-xs text-slate-500 truncate pr-2">
                  {selectedFile
                    ? selectedFile.name
                    : profile?.aop_original_name
                    ? profile.aop_original_name
                    : "Upload PDF attachment"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Upload className="w-4 h-4 text-[#007a8c]" />
                  <span className="text-[11px] font-semibold text-[#007a8c]">Browse</span>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  disabled={readOnly}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      onFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* View/Clear options */}
              {(selectedFile || profile?.aop_file_path) && (
                <div className="flex items-center gap-2 mt-1.5">
                  {profile?.aop_file_path && !selectedFile && (
                    <a
                      href={apiFileUrl(profile.aop_file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-[11px] font-medium text-[#007a8c] hover:underline"
                    >
                      <Download className="w-3 h-3 mr-1" /> View Uploaded AOP PDF
                    </a>
                  )}
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => onFileSelect(null)}
                      className="inline-flex items-center text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove {selectedFile.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FORM ACTIONS Banner Card matching Slide 1 */}
      <div className="bg-[#f0f7fb] border border-[#d6e8f4] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 mt-6">
        <span className="text-sm font-extrabold uppercase tracking-wider text-[#102a43]">
          FORM ACTIONS
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || readOnly}
            className="bg-[#0f4c64] hover:bg-[#0c3d51] text-white font-medium px-6 py-2.5 rounded-lg shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving || readOnly}
            className="bg-[#007a8c] hover:bg-[#006877] text-white font-medium px-6 py-2.5 rounded-lg shadow-sm"
          >
            <Send className="w-4 h-4 mr-2" /> Submit
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowHistoryModal(true)}
            className="bg-[#718096] hover:bg-[#5a6778] text-white font-medium px-5 py-2.5 rounded-lg shadow-sm"
          >
            <History className="w-4 h-4 mr-2" /> View Previous Years
          </Button>
        </div>
      </div>

      {/* Validation Note matching Slide 1 */}
      <p className="text-xs text-slate-500 italic">
        Validation: State + Year identify the reporting record. Annual Operational Plan accepts PDF.
      </p>

      {/* Previous Years Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#0f2d42]">
                  Historical Profiles — {selectedState?.description || "State"}
                </h3>
                <p className="text-xs text-slate-500">
                  Review operational targets, coordinator details, and approved budgets from earlier years.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {stateHistoryProfiles.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No previous year profiles registered for this state yet.
                </div>
              ) : (
                stateHistoryProfiles.map((hist) => (
                  <div
                    key={hist.id}
                    className="rounded-xl border border-[#d4e8dc] p-3.5 bg-[#f8fbf9] flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0f3d2e]">
                          Year {hist.reporting_year}
                        </span>
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                          {hist.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        Coordinator: <strong>{hist.coordinator_name || "—"}</strong> • Staff Strength:{" "}
                        <strong>{hist.staff_strength || 0}</strong>
                      </p>
                      <p className="text-xs text-slate-500">
                        Target: {hist.enrolment_target ? Number(hist.enrolment_target).toLocaleString() : "—"} | Budget:{" "}
                        {hist.annual_budget ? `₦${Number(hist.annual_budget).toLocaleString()}` : "—"}
                      </p>
                    </div>
                    {hist.aop_file_path && (
                      <a
                        href={apiFileUrl(hist.aop_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center shrink-0 px-3 py-1.5 rounded-lg border border-[#007a8c] text-[#007a8c] hover:bg-[#eef7fa] text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> AOP PDF
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
