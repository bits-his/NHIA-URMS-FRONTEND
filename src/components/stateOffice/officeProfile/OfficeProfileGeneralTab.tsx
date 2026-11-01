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
  CheckCircle2,
  Loader2,
  ArrowLeft,
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
  onBack?: () => void;
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
  onBack,
}: Props) {
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const yearOptions = buildReportingYearOptions();

  // Selected State object
  const selectedState = React.useMemo(() => {
    if (!profile?.state_id) return null;
    return states.find(
      (s) => String(s.id) === String(profile.state_id) || s.code === profile.state_id
    );
  }, [profile?.state_id, states]);

  // Selected Zone object
  const selectedZone = React.useMemo(() => {
    const curZone = profile?.zone_id;
    if (!curZone) return null;
    return zones.find(
      (z) => String(z.id) === String(curZone) || z.zonal_code === curZone
    );
  }, [profile?.zone_id, zones]);

  // Filter states by selected zone
  const availableStates = React.useMemo(() => {
    const curZone = profile?.zone_id;
    if (!curZone || curZone === "all") return states;
    return states.filter(
      (s) => String(s.zonal_id) === String(curZone) || s.zonal_code === curZone
    );
  }, [states, profile?.zone_id]);

  // Handle Zone selection: first
  const handleZoneChange = (zoneVal: string) => {
    const nextZone = zoneVal === "all" ? "" : zoneVal;
    const inZone = nextZone
      ? states.filter((s) => String(s.zonal_id) === String(nextZone) || s.zonal_code === nextZone)
      : states;

    const isCurInZone = inZone.some(
      (s) => String(s.id) === String(profile?.state_id) || s.code === profile?.state_code
    );

    const targetState = isCurInZone
      ? inZone.find((s) => String(s.id) === String(profile?.state_id) || s.code === profile?.state_code)
      : inZone[0];

    const zn = zones.find((z) => String(z.id) === nextZone || z.zonal_code === nextZone);

    onChange({
      zone_id: nextZone,
      zonal_code: zn?.zonal_code || "",
      state_id: targetState ? String(targetState.id) : "",
      state_code: targetState?.code || "",
    });
  };

  // Handle State selection: second
  const handleStateChange = (stateVal: string) => {
    const st = states.find((s) => String(s.id) === stateVal || s.code === stateVal);
    const zn = st?.zonal_id
      ? zones.find((z) => z.id === st.zonal_id || z.zonal_code === st.zonal_id)
      : null;

    onChange({
      state_id: stateVal,
      state_code: st?.code || stateVal,
      zone_id: zn?.id ? String(zn.id) : (zn?.zonal_code || profile?.zone_id || ""),
      zonal_code: zn?.zonal_code || "",
    });
  };

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
              value={profile?.zone_id ? String(profile.zone_id) : ""}
              onValueChange={handleZoneChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedZone?.description || (profile?.zone_id ? `Zone ${profile.zone_id}` : undefined)}
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
              value={profile?.state_id ? String(profile.state_id) : ""}
              onValueChange={handleStateChange}
              disabled={readOnly}
            >
              <SelectTrigger
                displayValue={selectedState?.description || (profile?.state_id ? `State Office` : undefined)}
              >
                <SelectValue placeholder={profile?.zone_id ? "Select state in zone" : "Select zone first or state"} />
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
              value={profile?.reporting_year ? String(profile.reporting_year) : ""}
              onValueChange={(val) => onChange({ reporting_year: Number(val) })}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reporting year" />
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

        {/* ROW 2: STAFF STRENGTH, STATE COORDINATOR, COORDINATOR PHONE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Staff Strength</Label>
            <Input
              type="number"
              min="0"
              value={profile?.staff_strength ?? ""}
              onChange={(e) =>
                onChange({
                  staff_strength: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              placeholder="e.g. 24"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">State Coordinator</Label>
            <Input
              value={profile?.coordinator_name || ""}
              onChange={(e) => onChange({ coordinator_name: e.target.value })}
              placeholder="e.g. Dr. Aminu Bello"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Coordinator Phone</Label>
            <Input
              type="tel"
              value={profile?.coordinator_phone || ""}
              onChange={(e) => onChange({ coordinator_phone: e.target.value })}
              placeholder="0803 000 0000"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>
        </div>

        {/* ROW 3: PERSONAL EMAIL, OFFICE EMAIL, OFFICE ADDRESS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Coordinator Personal Email</Label>
            <Input
              type="email"
              value={profile?.coordinator_email || ""}
              onChange={(e) => onChange({ coordinator_email: e.target.value })}
              placeholder="coordinator@gmail.com"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Official State Office Email</Label>
            <Input
              type="email"
              value={profile?.office_email || ""}
              onChange={(e) => onChange({ office_email: e.target.value })}
              placeholder="stateoffice@nhia.gov.ng"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Physical Office Address</Label>
            <Input
              value={profile?.office_address || ""}
              onChange={(e) => onChange({ office_address: e.target.value })}
              placeholder="e.g. Plot 12, Federal Secretariat Complex"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>
        </div>

        {/* ROW 4: ENROLMENT TARGET, ANNUAL BUDGET, ANNUAL OPERATIONAL PLAN (AOP) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Enrolment Target</Label>
            <Input
              type="number"
              min="0"
              value={profile?.enrolment_target ?? ""}
              onChange={(e) =>
                onChange({
                  enrolment_target: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="e.g. 50000"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Annual Approved Budget (₦)</Label>
            <Input
              type="number"
              step="0.01"
              value={profile?.annual_budget ?? ""}
              onChange={(e) =>
                onChange({
                  annual_budget: e.target.value === "" ? null : e.target.value,
                })
              }
              placeholder="e.g. 25000000"
              disabled={readOnly}
              className="h-9 bg-white border-slate-200 text-xs rounded-sm focus-visible:ring-1 focus-visible:ring-[#007a8c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Annual Operational Plan (AOP)</Label>
            <div className="relative">
              <label className="flex items-center justify-between h-9 px-3 bg-white border border-slate-200 rounded-sm cursor-pointer hover:border-[#007a8c] transition-colors">
                <span className="text-xs text-slate-500 truncate pr-2">
                  {selectedFile
                    ? selectedFile.name
                    : profile?.aop_original_name
                    ? profile.aop_original_name
                    : "Upload PDF attachment"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Upload className="size-3.5 text-[#007a8c]" />
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

              {(selectedFile || profile?.aop_file_path) && (
                <div className="flex items-center gap-3 mt-1.5">
                  {profile?.aop_file_path && !selectedFile && (
                    <a
                      href={apiFileUrl(profile.aop_file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-[11px] font-medium text-[#007a8c] hover:underline"
                    >
                      <Download className="size-3 mr-1" /> View Uploaded PDF
                    </a>
                  )}
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => onFileSelect(null)}
                      className="inline-flex items-center text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <Trash2 className="size-3 mr-1" /> Remove {selectedFile.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-5 rounded-b-sm">
        <span className="text-[11px] text-slate-400 text-center sm:text-left">
          All changes are recorded in the central National Health Insurance Authority database.
        </span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {stateHistoryProfiles.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm gap-1.5"
            >
              <History className="size-3.5 text-slate-500" />
              <span>Prior Years ({stateHistoryProfiles.length})</span>
            </Button>
          )}
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || readOnly}
            className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm gap-1.5"
          >
            <Save className="size-3.5" />
            <span>Save Draft</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSaving || readOnly}
            className="h-8 text-xs bg-[#0f2d42] hover:bg-[#1a3d54] text-white font-medium rounded-sm gap-1.5 shadow-2xs"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Send className="size-3.5 mr-1" />}
            <span>Submit Profile</span>
          </Button>
        </div>
      </CardFooter>

      {/* Previous Years Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#0f2d42]">
                  Historical Profiles — {selectedState?.description || "State Office"}
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
                    className="rounded-sm border border-slate-200 p-3 bg-slate-50/50 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0f2d42]">
                          Year {hist.reporting_year}
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-sm bg-slate-200/60 font-semibold text-slate-700">
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
                        className="inline-flex items-center shrink-0 px-3 py-1 rounded-sm border border-[#007a8c] text-[#007a8c] hover:bg-[#007a8c]/10 text-xs font-semibold"
                      >
                        <Download className="size-3 mr-1" /> AOP PDF
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
                className="h-8 text-xs rounded-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
