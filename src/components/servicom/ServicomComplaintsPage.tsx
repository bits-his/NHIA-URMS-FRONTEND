import * as React from "react";
import {
  ArrowLeft, Plus, RefreshCw, Loader2, Search,
  CheckCircle2, Circle, XCircle,
  MessageSquare, Clock, AlertTriangle,
  FileText, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { servicomApi, stockApi } from "@/lib/api";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { isDeptReportingOfficer, isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { pickGeoLabel, pickLabel } from "./servicomConstants";
import {
  COMPLAINANT_CATEGORIES,
  TRANSMISSION_ROUTES,
  PRIORITY_RATINGS, COMPLAINT_STATUSES, ACTIONS_TAKEN, ESCALATION_LEVELS, ESCALATED_TO,
  COMPLAINT_OUTCOMES, SLA_SUMMARY, domainCodeFromDomain, computeResolutionPreview,
  slaForPriority, STATUS_BADGE_CLASS, COMPLAINT_LIFECYCLE, INVESTIGATION_STATUSES, INVESTIGATION_CLOSING_STATUSES,
  lifecycleStageFromStatus, getStageCompletion, lifecycleStageLabel,
  isComplaintClosed, nextLifecycleStage, isStageReachable,
  slaColorDotClass, computeSlaOverdueDays, slaRowClass,
  previewComplaintNumber,
  type LifecycleStage, type ComplaintSlaRuleRow,
} from "./complaintRegisterConstants";
import {
  COMPLAINT_PARTY_TYPES, respondentsForComplainant, offencesForParties,
  findOffenceById, offenceSelectOptions, partyTypeFromComplainantCategory,
  OTHER_ISSUE_VALUE,
  type PartyType,
} from "./complaintOffenceGuide";
import HmoProviderSelect from "./HmoProviderSelect";
import HcfFacilitySelect from "./HcfFacilitySelect";
import { SubmitConfirmModal, useReportingOfficerSubmitConfirm } from "@/src/components/SubmitConfirmModal";

interface Props {
  onBack?: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  userName?: string | null;
  userStaffId?: string | null;
  userRole?: string | null;
  canCreate?: boolean;
  canReview?: boolean;
  /** State-level register: list only the signed-in user's state. */
  stateScope?: boolean;
}

type Mode = "list" | "register" | "manage" | "view";

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null) => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  complaint_type: "" as PartyType | "",
  complaint_against: "" as PartyType | "",
  offence_reference: "",
  complaint_category: "",
  category_code: "",
  complaint_domain: "",
  domain_code: "",
  priority_rating: "",
  date_received: new Date().toISOString().slice(0, 10),
  transmission_route: "",
  complainant_category: "",
  complainant_id: "",
  respondent_category: "",
  respondent_id: "",
  from_hmo_id: "",
  from_hcf_id: "",
  from_name: "",
  from_organization: "",
  from_phone: "",
  from_nhis_id: "",
  against_hmo_id: "",
  against_hcf_id: "",
  against_name: "",
  against_organization: "",
  against_phone: "",
  against_nhis_id: "",
  officer_assigned: "",
  investigation_start_date: "",
  status: "New/Acknowledged",
  actions_taken: "",
  actions_details: "",
  escalated: false,
  escalation_level: "",
  escalation_date: "",
  escalated_to: "",
  date_closed: "",
  outcome: "",
  remarks: "",
  description: "",
});

function rowToForm(row: any) {
  if (!row) return emptyForm();
  const offence = row.offence_reference ? findOffenceById(row.offence_reference) : undefined;
  let fromParty = (row.complaint_type ?? offence?.complainant ?? "") as PartyType | "";
  let againstParty = (row.complaint_against ?? offence?.respondent ?? "") as PartyType | "";
  if (!row.complaint_against && !offence && row.complaint_type && ["HCF", "HMO", "Enrollee"].includes(row.complaint_type)) {
    againstParty = row.complaint_type as PartyType;
    const fromCategory = partyTypeFromComplainantCategory(row.complainant_category ?? "");
    if (fromCategory) fromParty = fromCategory;
  }
  return {
    zone_id: row.zone_id ? String(row.zone_id) : "",
    state_id: row.state_id ? String(row.state_id) : "",
    complaint_type: fromParty,
    complaint_against: againstParty,
    offence_reference: row.offence_reference ?? "",
    complaint_category: row.complaint_category ?? row.category ?? "",
    category_code: row.category_code ?? "",
    complaint_domain: row.complaint_domain ?? "",
    domain_code: row.domain_code ?? "",
    priority_rating: row.priority_rating ?? "",
    date_received: row.date_received ?? row.complaint_date ?? "",
    transmission_route: row.transmission_route ?? "",
    complainant_category: row.complainant_category ?? "",
    complainant_id: row.complainant_id ?? "",
    respondent_category: row.respondent_category ?? "",
    respondent_id: row.respondent_id ?? "",
    from_hmo_id: row.complainant_hmo_id ? String(row.complainant_hmo_id) : "",
    from_hcf_id: row.complainant_hcf_id ? String(row.complainant_hcf_id) : "",
    from_name: row.complainant_name ?? "",
    from_organization: row.complainant_organization ?? "",
    from_phone: row.complainant_phone ?? "",
    from_nhis_id: row.complainant_nhis_id ?? row.complainant_id ?? "",
    against_hmo_id: row.respondent_hmo_id ? String(row.respondent_hmo_id) : "",
    against_hcf_id: row.respondent_hcf_id ? String(row.respondent_hcf_id) : "",
    against_name: row.respondent_name ?? "",
    against_organization: row.respondent_organization ?? "",
    against_phone: row.respondent_phone ?? "",
    against_nhis_id: row.respondent_nhis_id ?? row.respondent_id ?? "",
    officer_assigned: row.officer_assigned ?? row.assigned_officer ?? "",
    investigation_start_date: row.investigation_start_date ?? "",
    status: row.status ?? "New/Acknowledged",
    actions_taken: row.actions_taken ?? "",
    actions_details: row.actions_details ?? "",
    escalated: !!row.escalated,
    escalation_level: row.escalation_level === "Not Escalated" ? "" : (row.escalation_level ?? ""),
    escalation_date: row.escalation_date ?? "",
    escalated_to: row.escalation_level === "Not Escalated" ? "" : (row.escalated_to ?? ""),
    date_closed: String(row.date_closed ?? row.resolution_date ?? "").slice(0, 10),
    outcome: row.outcome ?? "",
    remarks: row.remarks ?? row.resolution_notes ?? "",
    description: row.description ?? "",
  };
}

function AutoField({ label, value, hint }: { label: string; value?: string | number | null; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</Label>
      <p className="text-sm font-semibold text-slate-800">{value ?? "—"}</p>
      {hint && !value && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** Compact read-only display for auto-derived complaint fields */
function SummaryField({ label, value, fullWidth }: { label: string; value?: string | null; fullWidth?: boolean }) {
  if (!value) return null;
  return (
    <div className={fullWidth ? "md:col-span-2" : undefined}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</p>
      <p className="text-sm font-semibold text-slate-900 leading-snug mt-0.5">{value}</p>
    </div>
  );
}

/** Asset-detail style label/value row for complaint View */
function ViewInfoRow({
  label,
  value,
  icon: Icon,
  mono = false,
  highlight = false,
  hideEmpty = true,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
  highlight?: boolean;
  hideEmpty?: boolean;
}) {
  const empty =
    value == null
    || value === ""
    || value === false
    || (typeof value === "string" && !value.trim());
  if (hideEmpty && empty) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 gap-2">
      <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
        {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400" /> : null}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-xs font-semibold break-words text-right truncate max-w-[58%] ${
          highlight
            ? "text-[#145c3f] font-bold"
            : mono
            ? "font-mono text-slate-800"
            : "text-slate-800"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function StageSummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm py-0 gap-0">
      <CardHeader className="pb-1.5 pt-3 px-4 border-b border-slate-100">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 px-4 py-3">
        {children}
      </CardContent>
    </Card>
  );
}

/** Compact read-only display for auto-derived complaint fields */
function DerivedField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-black leading-snug">{value}</p>
    </div>
  );
}

function DerivedTextBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-[#f8fbf9] border border-[#d4e8dc]/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-xs text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}

function SlaHint({ priority, slaRow }: { priority?: string; slaRow: ReturnType<typeof slaForPriority> }) {
  if (!priority || !slaRow) return null;
  return (
    <div className="rounded-xl bg-[#f8fbf9] border border-[#d4e8dc] px-3.5 py-3">
      <p className="text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-[#145c3f]">{priority} priority SLA — </span>
        Acknowledge {slaRow.acknowledge}; investigation commences {slaRow.investigate}; escalate after {slaRow.escalate}; target resolution {slaRow.resolve}.
      </p>
    </div>
  );
}

function StageActionFooter({
  label, onClick, saving, showNext, onNext,
}: {
  label?: string | null;
  onClick?: () => void;
  saving?: boolean;
  showNext?: boolean;
  onNext?: () => void;
}) {
  if (!label && !showNext) return null;
  return (
    <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e6f2eb]">
      {label && onClick && (
        <Button
          onClick={onClick}
          disabled={!!saving}
          size="sm"
          className="bg-orange-action hover:bg-orange-600 gap-2 rounded-lg shadow-none px-4"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {label}
        </Button>
      )}
      {showNext && onNext && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!!saving}
          className="h-8 gap-1.5 rounded-lg border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee] font-semibold px-4"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

function CloseComplaintModal({
  open, busy, status, lockStatus, remarks, onStatusChange, onRemarksChange, onConfirm, onCancel,
}: {
  open: boolean;
  busy?: boolean;
  status: string;
  lockStatus?: boolean;
  remarks: string;
  onStatusChange: (status: string) => void;
  onRemarksChange: (remarks: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-complaint-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#d4e8dc] bg-white p-5 shadow-xl"
      >
        <h3 id="close-complaint-title" className="text-base font-bold text-slate-900">
          {lockStatus ? `Mark complaint as ${status}?` : "Close complaint"}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          This will end the investigation and skip the remaining steps. The complaint will be
          marked <span className="font-semibold">{status}</span> with today as the date closed and can no longer be updated.
        </p>
        <div className="mt-4 space-y-3">
          {!lockStatus && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Close as</Label>
              <Select value={status} onValueChange={onStatusChange} disabled={busy}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_CLOSING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="Optional"
              disabled={busy}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? "Closing…" : `Yes, mark ${status}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldSelect({
  label, value, options, onChange, readOnly, disabled, placeholder, className,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (v: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  if (readOnly) {
    const display = pickLabel(options, value, value || "—");
    return (
      <div className={`space-y-1.5 ${className ?? ""}`}>
        <Label className="text-xs text-slate-500">{label}</Label>
        <p className="text-sm font-medium text-slate-900">{display || "—"}</p>
      </div>
    );
  }
  return (
    <div className={`space-y-1.5 ${className ?? ""} ${disabled ? "opacity-60" : ""}`}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`w-full ${disabled ? "cursor-not-allowed bg-slate-50" : ""}`}
          displayValue={pickLabel(options, value, placeholder ?? label)}
        >
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function DisabledInput({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        disabled
        readOnly
        className="bg-slate-50 text-slate-600 cursor-not-allowed"
        value={value ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldText({
  label, value, onChange, readOnly, disabled, type = "text", placeholder, mono, max, min,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  max?: string;
  min?: string;
}) {
  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">{label}</Label>
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      </div>
    );
  }
  return (
    <div className={`space-y-1.5 ${disabled ? "opacity-60" : ""}`}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        className={`w-full ${mono ? "font-mono" : ""} ${disabled ? "cursor-not-allowed bg-slate-50" : ""}`}
        type={type}
        placeholder={placeholder}
        value={value}
        max={max}
        min={min}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function FieldTextarea({
  label, value, onChange, readOnly, placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">{label}</Label>
        <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{value || "—"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <textarea
        className="w-full min-h-[110px] rounded-xl px-3.5 py-2.5 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25 resize-y"
        placeholder={placeholder}
        value={value}
        rows={4}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function officerMatchesUser(
  officer: string | null | undefined,
  userName?: string | null,
  userStaffId?: string | null,
) {
  if (!officer || (!userName && !userStaffId)) return false;
  const stored = officer.trim().toLowerCase();
  const name = userName?.trim().toLowerCase();
  if (name && (stored === name || stored.startsWith(name))) return true;
  const staffId = userStaffId?.trim().toLowerCase();
  if (staffId && stored.includes(staffId)) return true;
  return false;
}

export default function ServicomComplaintsPage({
  defaultStateId, defaultZoneId, userName, userStaffId, userRole,
  canCreate = true, canReview = true, stateScope: stateScopeProp = false,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleKey = String(userRole ?? "");
  /** Zonal coordinators see every complaint in their zone (zone comes from profile). */
  const isZonalCoordinator = isDeptZonalCoordinator(roleKey) && !!defaultZoneId;
  const isNationalRole = ["admin", "sdo", "hq-department"].includes(roleKey)
    || /director/i.test(roleKey)
    || /director/i.test(String(userName ?? ""))
    || (!defaultStateId && !isZonalCoordinator);
  /** SDO, directors and HQ see every state even on the state-level register. */
  const stateScope = stateScopeProp && !isNationalRole && !isZonalCoordinator;
  const isStateCoordinator =
    roleKey === "state-coordinator" || isDeptStateCoordinator(roleKey);
  const isStateOfficer = roleKey === "state-officer";
  /** Hide zone/state pickers for state-level roles (geo comes from profile). */
  const isStateScopedViewer = stateScope || isStateCoordinator || isStateOfficer;
  const isReportingOfficer =
    roleKey === "reporting-officer"
    || isDeptReportingOfficer(roleKey)
    || (canCreate && !canReview && !isStateScopedViewer);
  /** Coordinators are view-only: they can't register complaints (they may still manage ones assigned to them). */
  const canRegister = canCreate && !isStateCoordinator && !isZonalCoordinator;
  const showAssignedFilter =
    !isStateScopedViewer && !isReportingOfficer && !!(userName || userStaffId);
  /** HQ / national viewers (no fixed state) should see all complaints by default, not only assigned. */
  const isNationalViewer = !defaultZoneId && !defaultStateId;
  const geoLocked = !!(defaultZoneId && defaultStateId);
  /** Never show zone/state pickers for state officer/coordinator — geo is taken from their profile. */
  const hideGeoFields = isStateScopedViewer || geoLocked;
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const today = new Date().toISOString().slice(0, 10);

  const modeParam = searchParams.get("mode");
  const mode: Mode =
    modeParam === "register" || modeParam === "manage" || modeParam === "view"
      ? modeParam
      : "list";
  const queryId = searchParams.get("id");
  const queryStage = searchParams.get("stage") as LifecycleStage | null;

  const [formKey, setFormKey] = React.useState(0);
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [closeModal, setCloseModal] = React.useState<{
    open: boolean;
    status: string;
    fromInvestigation: boolean;
    remarks: string;
  }>({ open: false, status: "Resolved", fromInvestigation: false, remarks: "" });
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [filterStates, setFilterStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId));

  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterPriority, setFilterPriority] = React.useState("all");
  const [filterSearch, setFilterSearch] = React.useState("");
  const [filterDate, setFilterDate] = React.useState("");
  const [filterFacilityId, setFilterFacilityId] = React.useState("");
  const [filterFacilityName, setFilterFacilityName] = React.useState("");
  const [filterHmoId, setFilterHmoId] = React.useState("");
  const [filterTransmission, setFilterTransmission] = React.useState("all");
  const [filterAssigned, setFilterAssigned] = React.useState<"all" | "mine">("all");
  const [activeStage, setActiveStage] = React.useState<LifecycleStage>("registration");
  const [slaRules, setSlaRules] = React.useState<ComplaintSlaRuleRow[]>(SLA_SUMMARY as ComplaintSlaRuleRow[]);
  const [officerOptions, setOfficerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<{ value: string; label: string }[]>(ESCALATED_TO);
  const [idPreview, setIdPreview] = React.useState("ENF/HCF/…/…/…");
  const [comments, setComments] = React.useState<{
    id: number; body: string; created_by?: string | null;
    created_by_staff_id?: string | null; createdAt?: string; created_at?: string;
  }[]>([]);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentSaving, setCommentSaving] = React.useState(false);

  const setComplaintsQuery = React.useCallback((
    next: { mode?: Mode; id?: string | number | null; stage?: LifecycleStage | null },
    opts?: { replace?: boolean },
  ) => {
    const params = new URLSearchParams();
    const m = next.mode ?? "list";
    if (m !== "list") {
      params.set("mode", m);
      if (next.id != null && next.id !== "") params.set("id", String(next.id));
      if (m === "manage" && next.stage) params.set("stage", next.stage);
    }
    setSearchParams(params, { replace: !!opts?.replace });
  }, [setSearchParams]);

  const set = (key: string, value: string | boolean) => setF((p) => ({ ...p, [key]: value }));

  const mapOfficerOptions = (rows: { name: string; staff_id?: string; unit?: string | null; department?: string | null }[]) =>
    rows.map((u) => {
      const dept = u.unit || u.department;
      const parts = [u.name];
      if (u.staff_id) parts.push(`(${u.staff_id})`);
      if (dept) parts.push(`— ${dept}`);
      return { value: u.name, label: parts.join(" ") };
    });

  React.useEffect(() => {
    servicomApi.listComplaintSla()
      .then((r) => { if (r.data?.length) setSlaRules(r.data); })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (mode !== "register" && mode !== "manage") return;
    // Assign To: all active users
    servicomApi.listInvestigatingOfficers({})
      .then((r) => setOfficerOptions(mapOfficerOptions(r.data)))
      .catch(() => setOfficerOptions([]));
  }, [mode]);

  React.useEffect(() => {
    if (mode !== "register") return;
    // ID segment follows complainant category (HCF / HMO / ENR), not respondent
    const complainantParty =
      f.complaint_type
      || partyTypeFromComplainantCategory(f.complainant_category)
      || "";
    const against = complainantParty || "HCF";
    const date = f.date_received || today;
    const stateId = defaultStateId || f.state_id || undefined;
    const stateCode = (states.find((s) => String(s.id) === String(stateId)) as { code?: string } | undefined)?.code;
    let cancelled = false;
    const t = window.setTimeout(() => {
      servicomApi.previewComplaintNumber({
        against,
        date_received: date,
        state_id: stateId,
      })
        .then((r) => {
          if (!cancelled && r.data?.complaint_number) setIdPreview(r.data.complaint_number);
        })
        .catch(() => {
          if (!cancelled) setIdPreview(previewComplaintNumber(against, date, stateCode));
        });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [mode, f.complaint_type, f.complainant_category, f.date_received, f.state_id, defaultStateId, today, states]);

  React.useEffect(() => {
    if (mode !== "manage" && mode !== "register") return;
    stockApi.getDepartments()
      .then((r) => {
        const rows = Array.isArray(r.data) ? r.data : [];
        if (!rows.length) {
          setDepartmentOptions(ESCALATED_TO);
          return;
        }
        setDepartmentOptions(
          rows.map((d: any) => {
            const code = d.department_code || d.code || "";
            const name = d.name || d.description || "Department";
            const label = code ? `${name} (${code})` : name;
            const value = code || name;
            return { value: String(value), label };
          }),
        );
      })
      .catch(() => setDepartmentOptions(ESCALATED_TO));
  }, [mode]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string | undefined> = {
        status: filterStatus !== "all" ? filterStatus : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        facility_name: filterFacilityName || undefined,
        hmo_id: filterHmoId || undefined,
        transmission_route: filterTransmission !== "all" ? filterTransmission : undefined,
      };

      if (isZonalCoordinator) {
        filters.zone_id = defaultZoneId ?? undefined;
        filters.state_id = filterState !== "all" ? filterState : undefined;
      } else if (stateScope) {
        filters.scope = "state";
      } else if (isStateCoordinator) {
        filters.state_id = defaultStateId ?? undefined;
        filters.zone_id = defaultZoneId ?? undefined;
      } else if (isReportingOfficer) {
        filters.mine = "1";
      } else if (isStateOfficer) {
        filters.assigned_to_me = "1";
      } else {
        filters.state_id = geoLocked
          ? (defaultStateId ?? undefined)
          : (filterState !== "all" ? filterState : undefined);
        filters.zone_id = geoLocked
          ? (defaultZoneId ?? undefined)
          : (filterZone !== "all" ? filterZone : undefined);
        filters.assigned_to_me =
          showAssignedFilter && filterAssigned === "mine" && userName ? "1" : undefined;
      }

      const res = await servicomApi.listComplaints(filters);
      setComplaints(res.data);
    } catch (err: any) {
      toast.error("Failed to load complaints", { description: err.message });
    } finally { setLoading(false); }
  }, [
    defaultStateId, defaultZoneId, filterState, filterZone, filterStatus, filterPriority,
    filterAssigned, showAssignedFilter, userName, geoLocked,
    isStateCoordinator, isReportingOfficer, isStateOfficer, stateScope, isZonalCoordinator,
    filterFacilityName, filterHmoId, filterTransmission,
  ]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => {
    const zoneId = geoLocked ? (defaultZoneId || f.zone_id) : f.zone_id;
    if (!zoneId) { setStates([]); return; }
    stockApi.getStates(zoneId).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [f.zone_id, geoLocked, defaultZoneId]);
  React.useEffect(() => {
    if (geoLocked || filterZone === "all") { setFilterStates([]); return; }
    stockApi.getStates(filterZone).then((r) => setFilterStates(r.data)).catch(() => {});
  }, [filterZone, geoLocked]);

  const hasFilters = filterSearch.trim() !== ""
    || filterDate !== ""
    || (!geoLocked && filterZone !== (defaultZoneId ?? "all"))
    || (!geoLocked && filterState !== (defaultStateId ?? "all"))
    || filterStatus !== "all"
    || filterPriority !== "all"
    || !!filterFacilityName
    || !!filterHmoId
    || filterTransmission !== "all"
    || (showAssignedFilter && filterAssigned !== "all");

  const clearFilters = () => {
    setFilterSearch("");
    setFilterDate("");
    if (!geoLocked) {
      setFilterZone(defaultZoneId ?? "all");
      setFilterState(defaultStateId ?? "all");
    }
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterFacilityId("");
    setFilterFacilityName("");
    setFilterHmoId("");
    setFilterTransmission("all");
    setFilterAssigned("all");
  };

  const filtered = React.useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return complaints.filter((c) => {
      if (q) {
        const hay = [
          c.complaint_number, c.complaint_category, c.complaint_domain,
          c.complaint_type, c.officer_assigned, c.status, c.description,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterDate && (c.date_received || c.complaint_date) !== filterDate) return false;
      if (showAssignedFilter && filterAssigned === "mine" && userName) {
        const officer = c.officer_assigned ?? c.assigned_officer;
        if (!officerMatchesUser(officer, userName, userStaffId)) return false;
      }
      return true;
    });
  }, [complaints, filterSearch, filterDate, filterAssigned, showAssignedFilter, userName, userStaffId]);

  const assignedToMeCount = React.useMemo(
    () => (showAssignedFilter
      ? complaints.filter((c) => officerMatchesUser(c.officer_assigned ?? c.assigned_officer, userName, userStaffId)).length
      : 0),
    [complaints, showAssignedFilter, userName, userStaffId],
  );

  const listStats = React.useMemo(() => {
    const open = filtered.filter((c) => !["Closed", "Resolved", "Complaint Withdrawn"].includes(c.status));
    const slaTracked = filtered.filter((c) => c.resolution_within_sla != null);
    const slaMet = slaTracked.filter((c) => c.resolution_within_sla).length;
    return {
      total: filtered.length,
      open: open.length,
      investigation: filtered.filter((c) => lifecycleStageFromStatus(c.status, c) === "investigation").length,
      escalated: filtered.filter((c) => c.escalated || c.status === "Escalated").length,
      resolved: filtered.filter((c) => ["Closed", "Resolved"].includes(c.status)).length,
      slaMet,
      slaTracked: slaTracked.length,
    };
  }, [filtered]);

  const priorityBadge = (priority?: string) => {
    if (!priority) return <span className="text-xs text-slate-400">—</span>;
    const cls = priority === "Top"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : priority === "High"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
    return <Badge variant="outline" className={`text-[10px] font-semibold ${cls}`}>{priority}</Badge>;
  };

  const renderOverdueCell = (c: any) => {
    const sla = c.sla;
    if (!sla) return <span className="text-xs text-slate-400">—</span>;
    return (
      <span
        className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${slaColorDotClass(sla.color)}`}
        title={sla.message ?? undefined}
        aria-label={sla.message ?? "SLA status"}
      />
    );
  };

  const stageBadge = (c: any) => {
    const stage = lifecycleStageFromStatus(c.status, c);
    const cls = stage === "registration"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : stage === "investigation"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : stage === "escalation"
          ? "bg-purple-50 text-purple-800 border-purple-200"
          : "bg-emerald-50 text-emerald-800 border-emerald-200";
    return (
      <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 ${cls}`}>
        {lifecycleStageLabel(stage)}
      </Badge>
    );
  };

  const openRegister = () => {
    if (!canRegister) return;
    setF(emptyForm(defaultZoneId, defaultStateId));
    setSelected(null);
    setActiveStage("registration");
    setFormKey((k) => k + 1);
    setComplaintsQuery({ mode: "register" });
  };

  const defaultStageForComplaint = (row: any): LifecycleStage => {
    const status = row?.status ?? "";
    // Escalated complaints move straight to resolution for the assignee
    if (row?.escalated || status === "Escalated") return "resolution";
    if (officerMatchesUser(row?.officer_assigned ?? row?.assigned_officer, userName, userStaffId)) {
      if (!row?.investigation_start_date && status === "New/Acknowledged") return "investigation";
      if (["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(status)) {
        return "investigation";
      }
      if (row?.escalated || status === "Escalated") return "resolution";
    }
    return lifecycleStageFromStatus(status, row);
  };

  const goToStage = (stage: LifecycleStage, opts?: { replace?: boolean }) => {
    setActiveStage(stage);
    if (mode === "manage" && (selected?.id || queryId)) {
      setComplaintsQuery(
        { mode: "manage", id: selected?.id ?? queryId, stage },
        { replace: opts?.replace },
      );
    }
  };

  const loadComments = async (complaintId: number | string) => {
    setCommentsLoading(true);
    try {
      const res = await servicomApi.listComplaintComments(complaintId);
      setComments(res.data ?? []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openManage = async (row: any, stage?: LifecycleStage) => {
    try {
      const res = await servicomApi.getComplaint(row.id);
      const nextStage = stage ?? defaultStageForComplaint(res.data);
      setSelected(res.data);
      setF(rowToForm(res.data));
      setActiveStage(nextStage);
      setComplaintsQuery({ mode: "manage", id: res.data.id, stage: nextStage });
    } catch (err: any) {
      toast.error("Failed to load complaint", { description: err.message });
    }
  };

  const openView = async (row: any) => {
    try {
      const res = await servicomApi.getComplaint(row.id);
      setSelected(res.data);
      setF(rowToForm(res.data));
      setCommentDraft("");
      setComplaintsQuery({ mode: "view", id: res.data.id });
      await loadComments(res.data.id);
    } catch (err: any) {
      toast.error("Failed to load complaint", { description: err.message });
    }
  };

  const submitComment = async () => {
    if (!selected?.id || !commentDraft.trim()) return;
    setCommentSaving(true);
    try {
      await servicomApi.addComplaintComment(selected.id, commentDraft.trim());
      setCommentDraft("");
      await loadComments(selected.id);
      toast.success("Comment added");
    } catch (err: any) {
      toast.error("Failed to add comment", { description: err.message });
    } finally {
      setCommentSaving(false);
    }
  };

  const closeSub = () => {
    setSelected(null);
    setActiveStage("registration");
    setComments([]);
    setCommentDraft("");
    setComplaintsQuery({ mode: "list" });
  };

  const selectedIdRef = React.useRef<string | null>(null);
  selectedIdRef.current = selected?.id != null ? String(selected.id) : null;

  // Sync page state from URL (browser back/forward + deep links)
  React.useEffect(() => {
    let cancelled = false;

    if (mode === "list") {
      setSelected(null);
      setComments([]);
      setCommentDraft("");
      return () => { cancelled = true; };
    }

    if (mode === "register") {
      if (!canRegister) {
        setComplaintsQuery({ mode: "list" }, { replace: true });
        return () => { cancelled = true; };
      }
      setSelected(null);
      setActiveStage("registration");
      return () => { cancelled = true; };
    }

    if ((mode === "manage" || mode === "view") && queryId) {
      const validStages: LifecycleStage[] = ["registration", "investigation", "escalation", "resolution"];
      const stageFromQuery = queryStage && validStages.includes(queryStage) ? queryStage : null;

      // Same complaint already loaded — only sync stage from the URL (back/forward)
      if (mode === "manage" && selectedIdRef.current === String(queryId) && stageFromQuery) {
        setActiveStage(stageFromQuery);
        return () => { cancelled = true; };
      }

      (async () => {
        try {
          const res = await servicomApi.getComplaint(queryId);
          if (cancelled) return;
          setSelected(res.data);
          setF(rowToForm(res.data));
          if (mode === "manage") {
            const stage = stageFromQuery ?? defaultStageForComplaint(res.data);
            setActiveStage(stage);
            if (!stageFromQuery) {
              setComplaintsQuery({ mode: "manage", id: res.data.id, stage }, { replace: true });
            }
          } else {
            setCommentDraft("");
            await loadComments(res.data.id);
          }
        } catch (err: any) {
          if (cancelled) return;
          toast.error("Failed to load complaint", { description: err.message });
          setComplaintsQuery({ mode: "list" }, { replace: true });
        }
      })();
    } else if (mode === "manage" || mode === "view") {
      setComplaintsQuery({ mode: "list" }, { replace: true });
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, queryId, queryStage]);


  const refreshSelected = async () => {
    if (!selected?.id) return;
    const res = await servicomApi.getComplaint(selected.id);
    setSelected(res.data);
    setF(rowToForm(res.data));
  };

  const statusBadge = (status: string, emphasis = false, opts?: { escalatedToMe?: boolean }) => {
    if (opts?.escalatedToMe) {
      return (
        <Badge
          variant="outline"
          className={`${emphasis ? "text-xs font-black px-2.5 py-1" : "text-[10px] font-semibold"} bg-rose-600 text-white border-rose-600`}
        >
          Escalated to you
        </Badge>
      );
    }
    if (status === "Escalated" || status?.toLowerCase().includes("escalat")) {
      return (
        <Badge
          variant="outline"
          className={`${emphasis ? "text-xs font-black px-2.5 py-1" : "text-[10px] font-semibold"} bg-purple-50 text-purple-800 border-purple-200`}
        >
          Escalated
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={`${emphasis ? "text-xs font-black px-2.5 py-1" : "text-[10px] font-semibold"} ${STATUS_BADGE_CLASS[status] ?? ""}`}>
        {status}
      </Badge>
    );
  };

  const validatePartyDetails = (
    role: "from" | "against",
    partyType: PartyType | "",
  ) => {
    if (!partyType) return role === "from" ? "Complaint type is required." : "Complaint against is required.";
    if (partyType === "HMO") {
      const id = role === "from" ? f.from_hmo_id : f.against_hmo_id;
      if (!id) return role === "from" ? "Select the filing HMO." : "Select the HMO.";
    }
    if (partyType === "HCF") {
      const id = role === "from" ? f.from_hcf_id : f.against_hcf_id;
      if (!id) return role === "from" ? "Select the filing HCF." : "Select the HCF.";
    }
    if (partyType === "Enrollee") {
      const name = role === "from" ? f.from_name : f.against_name;
      const nhis = role === "from" ? f.from_nhis_id : f.against_nhis_id;
      if (!name?.trim() || !nhis?.trim()) {
        return role === "from"
          ? "Enter enrollee name and NHIA number/code."
          : "Enter enrollee name and NHIS ID.";
      }
    }
    return null;
  };

  const handleSaveRegistration = async () => {
    if (!f.date_received) {
      toast.error("Date received is required.");
      return;
    }
    const zoneId = defaultZoneId ?? f.zone_id;
    const stateId = defaultStateId ?? f.state_id;
    if (!isStateScopedViewer && (!zoneId || !stateId)) {
      toast.error("Zone and state are required.");
      return;
    }
    if (isStateScopedViewer && (!zoneId || !stateId)) {
      toast.error("Your account is not assigned to a state office.");
      return;
    }
    if (!f.complainant_category || !f.complaint_against) {
      toast.error("Complainant category and respondent are required.");
      return;
    }
    if (!f.complaint_type) {
      toast.error("Select a complainant category.");
      return;
    }
    if (f.complaint_type === f.complaint_against) {
      toast.error("Complainant category and respondent must be different.");
      return;
    }
    const fromErr = validatePartyDetails("from", f.complaint_type);
    if (fromErr) { toast.error(fromErr); return; }
    const againstErr = validatePartyDetails("against", f.complaint_against);
    if (againstErr) { toast.error(againstErr); return; }
    if (!f.offence_reference) {
      toast.error("Select an issue from the complaint register.");
      return;
    }
    if (f.offence_reference === OTHER_ISSUE_VALUE && !f.description?.trim()) {
      toast.error("Describe the issue in the text area.");
      return;
    }
    if (!f.officer_assigned) {
      toast.error("Assign an investigating officer.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        complaint_type: f.complaint_type,
        complaint_against: f.complaint_against,
        offence_reference: f.offence_reference,
        complaint_category: f.complaint_category,
        category_code: f.category_code || undefined,
        complaint_domain: f.complaint_domain,
        domain_code: f.domain_code || (f.complaint_domain ? domainCodeFromDomain(f.complaint_domain) : undefined),
        priority_rating: f.priority_rating,
        date_received: f.date_received,
        transmission_route: f.transmission_route,
        description: f.description,
        complainant_category: f.complainant_category || undefined,
        complainant_id: f.from_nhis_id || f.complainant_id || undefined,
        complainant_hmo_id: f.from_hmo_id ? Number(f.from_hmo_id) : null,
        complainant_hcf_id: f.from_hcf_id ? Number(f.from_hcf_id) : null,
        complainant_name: f.from_name || undefined,
        complainant_organization: f.from_organization || undefined,
        complainant_phone: f.from_phone || undefined,
        complainant_nhis_id: f.from_nhis_id || undefined,
        respondent_category: f.respondent_category || undefined,
        respondent_id: f.against_nhis_id || f.respondent_id || undefined,
        respondent_hmo_id: f.against_hmo_id ? Number(f.against_hmo_id) : null,
        respondent_hcf_id: f.against_hcf_id ? Number(f.against_hcf_id) : null,
        respondent_name: f.against_name || undefined,
        respondent_organization: f.against_organization || undefined,
        respondent_phone: f.against_phone || undefined,
        respondent_nhis_id: f.against_nhis_id || undefined,
        zone_id: zoneId ? Number(zoneId) : null,
        state_id: stateId ? Number(stateId) : null,
        officer_assigned: f.officer_assigned,
        status: "New/Acknowledged",
      };
      const res = await servicomApi.createComplaint(payload);
      toast.success("Complaint registered and officer notified");
      setSelected(res.data);
      setF(rowToForm(res.data));
      setActiveStage("registration");
      setComplaintsQuery({ mode: "manage", id: res.data.id, stage: "registration" });
      load();
    } catch (err: any) {
      toast.error("Failed to register complaint", { description: err.message });
    } finally { setSaving(false); }
  };

  const handleSaveStage = async (stage: LifecycleStage) => {
    if (!selected?.id) return;
    setSaving(true);
    try {
      let payload: Record<string, unknown> = {};
      let startingInvestigation = false;
      if (stage === "investigation") {
        if (!f.officer_assigned) {
          toast.error("Officer assigned is required to start investigation.");
          setSaving(false);
          return;
        }
        startingInvestigation = !selected.investigation_start_date;
        if (startingInvestigation) {
          const startDate = f.investigation_start_date || today;
          const received = String(selected.date_received ?? "").slice(0, 10);
          if (startDate > today) {
            toast.error("Investigation start date cannot be later than today.");
            setSaving(false);
            return;
          }
          if (received && startDate < received) {
            toast.error("Investigation start date cannot be before the date received.");
            setSaving(false);
            return;
          }
        }
        if (!startingInvestigation && INVESTIGATION_CLOSING_STATUSES.includes(f.status)) {
          setSaving(false);
          setCloseModal({ open: true, status: f.status, fromInvestigation: true, remarks: "" });
          return;
        }
        payload = {
          officer_assigned: f.officer_assigned,
          investigation_start_date: f.investigation_start_date || selected.investigation_start_date || today,
          status: startingInvestigation ? "Under Investigation" : f.status,
          actions_taken: f.actions_taken || (startingInvestigation ? "Investigation commenced" : null),
          actions_details: f.actions_details || null,
        };
      } else if (stage === "escalation") {
        if (f.escalated && !f.escalated_to) {
          toast.error("Select the escalation department.");
          setSaving(false);
          return;
        }
        if (f.escalated && !f.escalation_level) {
          toast.error("Select an escalation level.");
          setSaving(false);
          return;
        }
        payload = {
          escalated: !!f.escalated,
          escalation_level: f.escalated ? (f.escalation_level || null) : "Not Escalated",
          escalation_date: f.escalated ? (f.escalation_date || today) : null,
          escalated_to: f.escalated ? (f.escalated_to || null) : null,
          status: f.escalated ? "Escalated" : selected.status,
        };
      } else if (stage === "resolution") {
        if (!f.date_closed || !f.outcome) {
          toast.error("Date closed and outcome are required.");
          setSaving(false);
          return;
        }
        if (f.date_closed > today) {
          toast.error("Date closed cannot be later than today.");
          setSaving(false);
          return;
        }
        payload = {
          date_closed: f.date_closed,
          outcome: f.outcome,
          remarks: f.remarks || null,
          status: f.outcome === "Complaint Withdrawn" ? "Complaint Withdrawn"
            : f.outcome === "Referred to Appropriate Authority" ? "Referred to Appropriate Authority"
            : "Closed",
        };
      }
      await servicomApi.updateComplaint(selected.id, payload);
      const stageToast =
        stage === "investigation"
          ? (startingInvestigation ? "Investigation started" : "Investigation updated")
          : stage === "escalation" && f.escalated
            ? "Complaint escalated to department"
            : `${lifecycleStageLabel(stage)} submitted`;
      toast.success(stageToast);
      await refreshSelected();
      load();
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    } finally { setSaving(false); }
  };

  const handleCloseComplaint = async () => {
    if (!selected?.id) return;
    const { status, fromInvestigation, remarks } = closeModal;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        date_closed: today,
        remarks: remarks.trim() || f.remarks || null,
      };
      if (!selected.escalated && !selected.escalation_level) {
        payload.escalated = false;
        payload.escalation_level = "Not Escalated";
      }
      if (fromInvestigation) {
        payload.officer_assigned = f.officer_assigned || selected.officer_assigned || null;
        payload.investigation_start_date = f.investigation_start_date || selected.investigation_start_date || today;
        payload.actions_taken = f.actions_taken || null;
        payload.actions_details = f.actions_details || null;
      }
      await servicomApi.updateComplaint(selected.id, payload);
      toast.success(`Complaint ${status.toLowerCase()}`);
      setCloseModal((p) => ({ ...p, open: false, remarks: "" }));
      load();
      await openView(selected);
    } catch (err: any) {
      toast.error("Failed to close complaint", { description: err.message });
    } finally { setSaving(false); }
  };

  const clearOffence = () => ({
    offence_reference: "",
    complaint_domain: "",
    domain_code: "",
    complaint_category: "",
    category_code: "",
    priority_rating: "",
    description: "",
  });

  const onComplainantCategoryChange = (category: string) => {
    const party = partyTypeFromComplainantCategory(category) as PartyType | "";
    setF((p) => {
      const partyChanged = party !== p.complaint_type;
      return {
        ...p,
        complainant_category: category,
        complaint_type: party,
        ...(partyChanged ? {
          from_hmo_id: "",
          from_hcf_id: "",
          from_name: "",
          from_organization: "",
          from_phone: "",
          from_nhis_id: "",
          complaint_against: "",
          against_hmo_id: "",
          against_hcf_id: "",
          against_name: "",
          against_organization: "",
          against_phone: "",
          against_nhis_id: "",
          respondent_category: "",
          ...clearOffence(),
        } : {}),
      };
    });
  };

  const onComplaintAgainstChange = (v: PartyType) => {
    const respondentCategory =
      v === "HCF" ? "Healthcare Facility" : v === "HMO" ? "HMO" : v === "Enrollee" ? "Other" : "";
    setF((p) => ({
      ...p,
      complaint_against: v,
      respondent_category: respondentCategory,
      against_hmo_id: "",
      against_hcf_id: "",
      against_name: "",
      against_organization: "",
      against_phone: "",
      against_nhis_id: "",
      ...clearOffence(),
    }));
  };

  const onOffenceChange = (reference: string) => {
    if (reference === OTHER_ISSUE_VALUE) {
      setF((p) => ({
        ...p,
        offence_reference: OTHER_ISSUE_VALUE,
        complaint_domain: "",
        domain_code: "",
        complaint_category: "",
        category_code: "",
        priority_rating: "",
        description: "",
      }));
      return;
    }
    const entry = findOffenceById(reference);
    if (!entry) return;
    setF((p) => ({
      ...p,
      offence_reference: entry.id,
      complaint_domain: entry.domain,
      domain_code: domainCodeFromDomain(entry.domain),
      complaint_category: entry.category,
      priority_rating: entry.priority,
      description: entry.issue,
    }));
  };

  const activeStateId = defaultStateId ?? f.state_id;

  const renderInlinePartyPicker = (
    role: "from" | "against",
    partyType: PartyType | "",
    readOnly: boolean,
    row?: any,
  ) => {
    if (!partyType) return null;
    const isFrom = role === "from";

    if (partyType === "HMO") {
      const hmoId = readOnly
        ? String(isFrom ? row?.complainant_hmo_id : row?.respondent_hmo_id ?? "")
        : (isFrom ? f.from_hmo_id : f.against_hmo_id);
      const hmoName = isFrom
        ? row?.complainant_hmo?.name ?? row?.complainant_name
        : row?.respondent_hmo?.name ?? row?.respondent_name;
      const hmoCode = readOnly
        ? (isFrom ? row?.complainant_nhis_id ?? row?.complainant_id : row?.respondent_nhis_id ?? row?.respondent_id)
        : (isFrom ? f.from_nhis_id : f.against_nhis_id);

      const nameLabel = isFrom ? "Complainant Name *" : "Respondent Name *";
      const selectField = readOnly ? (
        <AutoField label={nameLabel} value={hmoName} />
      ) : (
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs text-slate-500">{nameLabel}</Label>
          <HmoProviderSelect
            value={hmoId}
            onChange={(p) => setF((prev) => isFrom
              ? { ...prev, from_hmo_id: p?.id ?? "", from_name: p?.name ?? "", from_nhis_id: p?.code ?? "" }
              : { ...prev, against_hmo_id: p?.id ?? "", against_name: p?.name ?? "", against_nhis_id: p?.code ?? "" })}
          />
        </div>
      );

      if (isFrom) return selectField;

      return (
        <>
          {selectField}
          {readOnly ? (
            <AutoField label="Respondent Code / NHIA Number" value={hmoCode} />
          ) : (
            <FieldText
              label="Respondent Code / NHIA Number"
              value={f.against_nhis_id}
              onChange={(v) => set("against_nhis_id", v)}
              placeholder="HMO code"
              mono
            />
          )}
        </>
      );
    }

    if (partyType === "HCF") {
      const hcfId = readOnly
        ? String(isFrom ? row?.complainant_hcf_id : row?.respondent_hcf_id ?? row?.facility_id ?? "")
        : (isFrom ? f.from_hcf_id : f.against_hcf_id);
      const hcfName = isFrom
        ? row?.complainant_hcf?.name ?? row?.complainant_name
        : row?.facility_name ?? row?.respondent_name;
      const hcfCode = readOnly
        ? (isFrom ? row?.complainant_nhis_id ?? row?.complainant_id : row?.respondent_nhis_id ?? row?.respondent_id)
        : (isFrom ? f.from_nhis_id : f.against_nhis_id);

      const nameLabel = isFrom ? "Complainant Name *" : "Respondent Name *";
      const selectField = readOnly ? (
        <AutoField label={nameLabel} value={hcfName} />
      ) : (
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs text-slate-500">{nameLabel}</Label>
          <HcfFacilitySelect
            stateId={activeStateId || undefined}
            value={hcfId}
            onChange={(fac) => setF((prev) => isFrom
              ? { ...prev, from_hcf_id: fac?.id ?? "", from_name: fac?.name ?? "", from_nhis_id: fac?.code ?? "" }
              : { ...prev, against_hcf_id: fac?.id ?? "", against_name: fac?.name ?? "", against_nhis_id: fac?.code ?? "" })}
          />
        </div>
      );

      if (isFrom) return selectField;

      return (
        <>
          {selectField}
          {readOnly ? (
            <AutoField label="Respondent Code / NHIA Number" value={hcfCode} />
          ) : (
            <FieldText
              label="Respondent Code / NHIA Number"
              value={f.against_nhis_id}
              onChange={(v) => set("against_nhis_id", v)}
              placeholder="Facility accreditation code"
              mono
            />
          )}
        </>
      );
    }

    const name = readOnly
      ? (isFrom ? row?.complainant_name : row?.respondent_name)
      : (isFrom ? f.from_name : f.against_name);
    const organization = readOnly
      ? (isFrom ? row?.complainant_organization : row?.respondent_organization)
      : (isFrom ? f.from_organization : f.against_organization);
    const nhis = readOnly
      ? (isFrom ? row?.complainant_nhis_id ?? row?.complainant_id : row?.respondent_nhis_id ?? row?.respondent_id)
      : (isFrom ? f.from_nhis_id : f.against_nhis_id);
    const phone = readOnly
      ? (isFrom ? row?.complainant_phone : row?.respondent_phone)
      : (isFrom ? f.from_phone : f.against_phone);

    if (isFrom) {
      return (
        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldText
            label="Complainant Name *"
            value={name ?? ""}
            onChange={(v) => set("from_name", v)}
            readOnly={readOnly}
          />
          <FieldText
            label="Organization"
            value={organization ?? ""}
            onChange={(v) => set("from_organization", v)}
            readOnly={readOnly}
          />
          <FieldText
            label="NHIA Number / Code *"
            value={nhis ?? ""}
            onChange={(v) => set("from_nhis_id", v)}
            readOnly={readOnly}
            mono
          />
          <FieldText
            label="Phone"
            value={phone ?? ""}
            onChange={(v) => set("from_phone", v)}
            readOnly={readOnly}
          />
        </div>
      );
    }

    return (
      <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldText
          label="Full Name *"
          value={name ?? ""}
          onChange={(v) => set("against_name", v)}
          readOnly={readOnly}
        />
        <FieldText
          label="Organization"
          value={organization ?? ""}
          onChange={(v) => set("against_organization", v)}
          readOnly={readOnly}
        />
        <FieldText
          label="NHIS ID *"
          value={nhis ?? ""}
          onChange={(v) => set("against_nhis_id", v)}
          readOnly={readOnly}
          mono
        />
        <FieldText
          label="Phone"
          value={phone ?? ""}
          onChange={(v) => set("against_phone", v)}
          readOnly={readOnly}
        />
      </div>
    );
  };

  const resolutionPreview = React.useMemo(
    () => computeResolutionPreview(f.date_received, f.date_closed, f.priority_rating),
    [f.date_received, f.date_closed, f.priority_rating],
  );

  const zoneLabel = (row?: any) =>
    row?.zone?.description ?? pickGeoLabel(zones, String(row?.zone_id ?? ""), "—");
  const stateLabel = (row?: any) =>
    row?.state?.description ?? pickGeoLabel(states.length ? states : filterStates, String(row?.state_id ?? ""), "—");

  const renderGeoFields = (readOnly: boolean, row?: any) => {
    // State officer/coordinator: no zone/state on the form (profile geo is applied on save)
    if (hideGeoFields && !readOnly) return null;
    // When viewing a locked record for state users, still hide geo
    if (isStateScopedViewer) return null;

    const zoneVal = readOnly ? String(row?.zone_id ?? "") : f.zone_id;
    const stateVal = readOnly ? String(row?.state_id ?? "") : f.state_id;

    if (readOnly) {
      return (
        <>
          <AutoField label="Zone" value={zoneLabel(row)} />
          <AutoField label="State" value={stateLabel(row)} />
        </>
      );
    }

    return (
      <>
        <FieldSelect
          label="Zone *"
          value={zoneVal}
          options={zones.map((z) => ({ value: String(z.id), label: z.description }))}
          readOnly={false}
          onChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: "" }))}
        />
        <FieldSelect
          label="State *"
          value={stateVal}
          options={states.map((s) => ({ value: String(s.id), label: s.description }))}
          readOnly={false}
          onChange={(v) => set("state_id", v)}
        />
      </>
    );
  };

  const renderComplaintSection = (readOnly: boolean, row?: any, embedded = false) => {
    const fromParty = (readOnly ? rowToForm(row).complaint_type : f.complaint_type) as PartyType | "";
    const againstParty = (readOnly ? rowToForm(row).complaint_against : f.complaint_against) as PartyType | "";
    const offenceOptions = offencesForParties(fromParty, againstParty);
    const offenceSelected = !!(readOnly ? row?.offence_reference : f.offence_reference);
    const isOtherIssue = (readOnly ? row?.offence_reference : f.offence_reference) === OTHER_ISSUE_VALUE;

    const priority = readOnly ? row?.priority_rating : f.priority_rating;
    const domain = readOnly ? row?.complaint_domain : f.complaint_domain;
    const category = readOnly ? (row?.complaint_category ?? row?.category) : f.complaint_category;
    const dateReceived = readOnly ? (row?.date_received ?? row?.complaint_date) : f.date_received;
    const transmissionRoute = readOnly ? row?.transmission_route : f.transmission_route;
    const offenceText = readOnly ? row?.description : f.description;
    const slaRow = slaForPriority(priority ?? "", slaRules);
    const againstOptions = fromParty
      ? respondentsForComplainant(fromParty).map((v) => ({
          value: v,
          label: COMPLAINT_PARTY_TYPES.find((p) => p.value === v)?.label ?? v,
        }))
      : [];
    const showAgainstStep = !!fromParty;

    const formGrid = (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readOnly ? (
              <AutoField label="Complaint ID" value={row?.complaint_number} />
            ) : (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Complaint ID</Label>
                <p className="text-sm font-semibold text-slate-800 font-mono">
                  Auto generated ({idPreview})
                </p>
              </div>
            )}
            <FieldText
              label="Date Received *"
              type="date"
              value={dateReceived ?? ""}
              onChange={(v) => set("date_received", v)}
              readOnly={readOnly}
            />
            {renderGeoFields(readOnly, row)}

            {fromParty === "HCF" || fromParty === "HMO" ? (
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldSelect
                  label="Complainant Category *"
                  value={readOnly ? (row?.complainant_category ?? "") : f.complainant_category}
                  options={COMPLAINANT_CATEGORIES}
                  readOnly={readOnly}
                  onChange={(v) => onComplainantCategoryChange(v)}
                  placeholder="Select complainant category"
                />
                {renderInlinePartyPicker("from", fromParty, readOnly, row)}
              </div>
            ) : (
              <>
                <FieldSelect
                  label="Complainant Category *"
                  value={readOnly ? (row?.complainant_category ?? "") : f.complainant_category}
                  options={COMPLAINANT_CATEGORIES}
                  readOnly={readOnly}
                  onChange={(v) => onComplainantCategoryChange(v)}
                  placeholder="Select complainant category"
                />
                {fromParty === "Enrollee" ? renderInlinePartyPicker("from", fromParty, readOnly, row) : null}
              </>
            )}

            {showAgainstStep && (
              againstParty === "HCF" || againstParty === "HMO" ? (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldSelect
                    label="Respondent *"
                    value={againstParty}
                    options={againstOptions}
                    readOnly={readOnly}
                    onChange={(v) => onComplaintAgainstChange(v as PartyType)}
                    placeholder="Select respondent"
                  />
                  {renderInlinePartyPicker("against", againstParty, readOnly, row)}
                </div>
              ) : (
                <>
                  <FieldSelect
                    label="Respondent *"
                    value={againstParty}
                    options={againstOptions}
                    readOnly={readOnly}
                    onChange={(v) => onComplaintAgainstChange(v as PartyType)}
                    placeholder="Select respondent"
                    className={!againstParty || againstParty === "Enrollee" ? "md:col-span-2" : undefined}
                  />
                  {againstParty === "Enrollee" ? renderInlinePartyPicker("against", againstParty, readOnly, row) : null}
                </>
              )
            )}

            <FieldSelect
              label="Transmission Route"
              value={transmissionRoute ?? ""}
              options={TRANSMISSION_ROUTES}
              readOnly={readOnly}
              onChange={(v) => set("transmission_route", v)}
            />
            {/* Respondent Category — hidden; set from Respondent (HCF / HMO / Enrollee) */}
            {/* <FieldSelect
              label="Respondent Category"
              value={readOnly ? row?.respondent_category : f.respondent_category}
              options={RESPONDENT_CATEGORIES}
              readOnly={readOnly}
              onChange={(v) => set("respondent_category", v)}
            /> */}
            {!readOnly ? (
              <FieldSelect
                label="Assign To *"
                value={f.officer_assigned}
                options={officerOptions}
                onChange={(v) => set("officer_assigned", v)}
                placeholder={officerOptions.length ? "Select investigating officer" : "No users available"}
              />
            ) : (
              <AutoField label="Assigned To" value={row?.officer_assigned ?? row?.assigned_officer} />
            )}

            {fromParty && againstParty && (
              <div className="col-span-full">
                <FieldSelect
                  label="Issue / Complaint *"
                  value={readOnly ? row?.offence_reference : f.offence_reference}
                  options={offenceSelectOptions(offenceOptions)}
                  readOnly={readOnly}
                  onChange={onOffenceChange}
                  placeholder="Select issue from register"
                />
              </div>
            )}

            {isOtherIssue && (
              <div className="col-span-full">
                <FieldTextarea
                  label="Describe the issue *"
                  value={offenceText ?? ""}
                  onChange={(v) => set("description", v)}
                  readOnly={readOnly}
                  placeholder="Write the issue or complaint"
                />
              </div>
            )}

            {offenceSelected && !isOtherIssue && (
              <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-[#f8fbf9] border border-[#d4e8dc] px-3 py-2.5">
                <DerivedField label="Domain" value={domain} />
                <DerivedField label="Category" value={category} />
                <DerivedField label="Priority" value={priority} />
              </div>
            )}

            {offenceSelected && !isOtherIssue && offenceText && (
              <div className="col-span-full">
                <DerivedTextBlock label="Issue" value={offenceText} />
              </div>
            )}

            {offenceSelected && !isOtherIssue && (priority || readOnly) && (
              <div className="col-span-full">
                <SlaHint priority={priority} slaRow={slaRow} />
              </div>
            )}
          </div>
    );

    if (embedded) {
      return (
        <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
          <CardContent className="p-6 md:p-8">{formGrid}</CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
        <CardContent className="p-6 md:p-8 space-y-6">
          {formGrid}
          {!readOnly && (
            <div className="flex justify-end pt-4 border-t border-[#e6f2eb]">
              <Button
                onClick={() => submitConfirm.requestSubmit(handleSaveRegistration)}
                disabled={saving}
                className="bg-orange-action hover:bg-orange-600 gap-2 rounded-xl shadow-none px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Register Complaint
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRegistrationSummary = (row?: any) => {
    if (!row) return null;
    const mapped = rowToForm(row);
    const againstLabel = COMPLAINT_PARTY_TYPES.find((p) => p.value === mapped.complaint_against)?.label ?? mapped.complaint_against;
    const filingParty = row.complainant_name ?? row.complainant_hmo?.name ?? row.complainant_hcf?.name;
    const respondentParty = row.respondent_name ?? row.facility_name ?? row.respondent_hmo?.name;
    return (
      <div className="overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-slate-100">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Complaint</h2>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <ViewInfoRow label="Complaint ID" value={row.complaint_number} mono highlight />
            <ViewInfoRow label="Date received" value={row.date_received ?? row.complaint_date} />
            <ViewInfoRow label="Transmission" value={row.transmission_route} />
            <ViewInfoRow label="Priority" value={row.priority_rating} highlight />
            <ViewInfoRow label="Domain" value={row.complaint_domain} />
            <ViewInfoRow label="Category" value={row.complaint_category ?? row.category} />
            <ViewInfoRow label="Complainant" value={row.complainant_category} />
            <ViewInfoRow label="Against" value={againstLabel} />
            <ViewInfoRow label="Filing party" value={filingParty} highlight />
            <ViewInfoRow label="Respondent" value={respondentParty} highlight />
            <ViewInfoRow label="Complainant NHIA" value={row.complainant_nhis_id ?? row.complainant_id} mono />
            <ViewInfoRow label="Respondent code" value={row.respondent_nhis_id ?? row.respondent_id} mono />
            {row.complainant_organization && (
              <ViewInfoRow label="Organization" value={row.complainant_organization} />
            )}
            {row.respondent_organization && (
              <ViewInfoRow label="Respondent org" value={row.respondent_organization} />
            )}
            <ViewInfoRow label="Assigned to" value={row.officer_assigned ?? row.assigned_officer} highlight />
            {!isStateScopedViewer && (
              <>
                <ViewInfoRow label="Zone" value={zoneLabel(row)} />
                <ViewInfoRow label="State" value={stateLabel(row)} />
              </>
            )}
            {row.description && (
              <div className="sm:col-span-2 pt-1.5 mt-0.5 border-t border-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Issue</p>
                <p className="text-[13px] text-slate-800 whitespace-pre-wrap leading-snug">{row.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveStageForm = (
    row?: any,
    readOnly = false,
    actionLabel?: string | null,
    showNext = false,
    onNext?: () => void,
  ) => {
    if (activeStage === "registration") {
      return (
        <Card className="rounded-xl border-slate-200/90 bg-white shadow-sm w-full py-0 gap-0 overflow-hidden">
          <CardContent className="p-0">
            {renderRegistrationSummary(row) ?? renderComplaintSection(true, row, true)}
          </CardContent>
          <StageActionFooter showNext={showNext} onNext={onNext} />
        </Card>
      );
    }
    if (activeStage === "investigation") {
      return renderInvestigationSection(readOnly, row, actionLabel, showNext, onNext);
    }
    if (activeStage === "escalation") {
      return renderEscalationSection(readOnly, row, actionLabel, showNext, onNext);
    }
    return renderResolutionSection(readOnly, row, actionLabel, showNext, onNext);
  };

  const renderComplaintSlaBar = (row?: any) => {
    if (!row) return null;
    const slaRow = slaForPriority(row.priority_rating ?? "", slaRules);

    return (
      <div className="px-4 md:px-5 py-1.5 border-t border-[#d4e8dc] bg-[#f8fbf9] flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {statusBadge(row.status ?? "New/Acknowledged", false, {
          escalatedToMe: !!row.escalated && isCurrentAssignee(row) && !isComplaintClosed(row.status),
        })}
        {row.priority_rating && (
          <>
            <span className="text-xs text-slate-300">|</span>
            <Badge variant="outline" className="text-[10px] font-bold">{row.priority_rating} priority</Badge>
          </>
        )}
        {row.sla ? (
          <>
            <span className="text-xs text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${slaColorDotClass(row.sla.color)}`} />
              {computeSlaOverdueDays(row.sla) > 0 && (
                <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                  {computeSlaOverdueDays(row.sla)} overdue
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-600">
              {row.sla.working_days_elapsed} working day(s) since received
            </span>
            {(row.sla.flags ?? []).map((flag: { code: string; label: string }) => (
              <Badge key={flag.code} variant="outline" className="text-[10px] text-rose-700 border-rose-200 bg-rose-50">
                {flag.label}
              </Badge>
            ))}
          </>
        ) : slaRow ? (
          <>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-[10px] text-slate-600">
              Ack {slaRow.acknowledge} · Investigate {slaRow.investigate} · Escalate {slaRow.escalate} · Resolve {slaRow.resolve}
            </span>
          </>
        ) : null}
      </div>
    );
  };

  const renderEscalationFields = (readOnly: boolean, row?: any) => {
    const deptOptions = departmentOptions.length ? departmentOptions : ESCALATED_TO;
    const isEscalated = readOnly ? !!row?.escalated : !!f.escalated;
    return (
    <>
      {readOnly ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Escalated</Label>
          <Badge variant="outline">{row?.escalated ? "Yes" : "No"}</Badge>
        </div>
      ) : (
        <FieldSelect label="Escalated" value={f.escalated ? "yes" : "no"}
          options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]}
          onChange={(v) => {
            const yes = v === "yes";
            setF((p) => ({
              ...p,
              escalated: yes,
              escalation_level: yes ? p.escalation_level : "",
              escalation_date: yes ? (p.escalation_date || today) : "",
              escalated_to: yes ? p.escalated_to : "",
            }));
          }} />
      )}
      {isEscalated && (
        <>
          <FieldSelect
            label="Escalation Level"
            value={readOnly ? (row?.escalation_level ?? "") : f.escalation_level}
            options={ESCALATION_LEVELS}
            readOnly={readOnly}
            onChange={(v) => set("escalation_level", v)}
          />
          <FieldText
            label="Escalation Date"
            type="date"
            value={readOnly ? (row?.escalation_date ?? "") : f.escalation_date}
            onChange={(v) => set("escalation_date", v)}
            readOnly={readOnly}
            max={readOnly ? undefined : today}
          />
          {readOnly ? (
            <AutoField label="Escalation Department" value={row?.escalated_to} />
          ) : (
            <FieldSelect
              label="Escalation Department *"
              value={f.escalated_to}
              options={deptOptions}
              onChange={(v) => set("escalated_to", v)}
              placeholder="Select department"
            />
          )}
        </>
      )}
    </>
    );
  };

  const renderResolutionFields = (readOnly: boolean, row?: any) => {
    const preview = readOnly
      ? { resolution_days: row?.resolution_days, resolution_within_sla: row?.resolution_within_sla }
      : resolutionPreview;
    const slaLabel = preview.resolution_within_sla == null
      ? ""
      : preview.resolution_within_sla ? "Yes" : "No";

    return (
      <>
        <FieldText
          label="Date Closed *"
          type="date"
          value={readOnly ? String(row?.date_closed ?? row?.resolution_date ?? "").slice(0, 10) : f.date_closed}
          onChange={(v) => set("date_closed", v)}
          readOnly={readOnly}
          min={readOnly ? undefined : (String(f.date_received ?? "").slice(0, 10) || undefined)}
          max={readOnly ? undefined : today}
        />
        <FieldSelect label="Outcome" value={readOnly ? row?.outcome : f.outcome}
          options={COMPLAINT_OUTCOMES} readOnly={readOnly} onChange={(v) => set("outcome", v)} />
        {readOnly ? (
          <>
            <AutoField label="Resolution Days" value={preview.resolution_days} />
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Within SLA</Label>
              <Badge variant="outline" className={preview.resolution_within_sla ? "text-emerald-700" : "text-rose-700"}>
                {preview.resolution_within_sla == null ? "—" : preview.resolution_within_sla ? "Yes" : "No"}
              </Badge>
            </div>
          </>
        ) : (
          <>
            <DisabledInput
              label="Resolution Days"
              value={preview.resolution_days != null ? String(preview.resolution_days) : ""}
            />
            <DisabledInput label="Resolution Within SLA" value={slaLabel} />
          </>
        )}
        <div className="col-span-full">
          <FieldText label="Remarks" value={readOnly ? (row?.remarks ?? row?.resolution_notes) : f.remarks}
            onChange={(v) => set("remarks", v)} readOnly={readOnly} />
        </div>
      </>
    );
  };

  const renderInvestigationSection = (readOnly: boolean, row?: any, actionLabel?: string | null, showNext = false, onNext?: () => void) => {
    const started = !!row?.investigation_start_date
      || ["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(row?.status);
    const minStartDate = String(row?.date_received ?? "").slice(0, 10) || undefined;

    return (
      <Card className="rounded-xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
        <CardContent className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {!readOnly && !started && (
            <div className="col-span-full rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5">
              <p className="text-xs text-amber-950 leading-relaxed">
                Investigation has not started. Choose the date it started (you can backdate), then click <span className="font-semibold">Start</span>.
              </p>
            </div>
          )}
          <AutoField
            label="Assigned Officer"
            value={readOnly ? (row?.officer_assigned ?? row?.assigned_officer) : f.officer_assigned}
          />
          {!readOnly && !started ? (
            <FieldText
              label="Investigation Start Date *"
              type="date"
              value={f.investigation_start_date || today}
              onChange={(v) => set("investigation_start_date", v)}
              min={minStartDate}
              max={today}
            />
          ) : (
            <AutoField
              label="Investigation Start Date"
              value={started
                ? (readOnly ? row?.investigation_start_date : f.investigation_start_date) || today
                : "Not started"}
            />
          )}
          {started && (
            <>
              <FieldSelect label="Actions Taken" value={readOnly ? row?.actions_taken : f.actions_taken}
                options={ACTIONS_TAKEN} readOnly={readOnly} onChange={(v) => set("actions_taken", v)} />
              <div className="col-span-full">
                <FieldText label="Actions Details" value={readOnly ? row?.actions_details : f.actions_details}
                  onChange={(v) => set("actions_details", v)} readOnly={readOnly} />
              </div>
              <FieldSelect label="Status" value={readOnly ? row?.status : f.status}
                options={readOnly ? COMPLAINT_STATUSES : INVESTIGATION_STATUSES}
                readOnly={readOnly} onChange={(v) => set("status", v)} />
            </>
          )}
        </CardContent>
        <StageActionFooter
          label={actionLabel && started && INVESTIGATION_CLOSING_STATUSES.includes(f.status) ? "Submit & Close" : actionLabel}
          onClick={actionLabel ? () => handleSaveStage("investigation") : undefined}
          saving={saving}
          showNext={showNext}
          onNext={onNext}
        />
      </Card>
    );
  };

  const renderEscalationSection = (readOnly: boolean, row?: any, actionLabel?: string | null, showNext = false, onNext?: () => void) => (
    <Card className="rounded-xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
      <CardContent className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {renderEscalationFields(readOnly, row)}
      </CardContent>
      <StageActionFooter
        label={actionLabel}
        onClick={actionLabel ? () => handleSaveStage("escalation") : undefined}
        saving={saving}
        showNext={showNext}
        onNext={onNext}
      />
    </Card>
  );

  const renderResolutionSection = (readOnly: boolean, row?: any, actionLabel?: string | null, showNext = false, onNext?: () => void) => (
    <Card className="rounded-xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
      <CardContent className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {renderResolutionFields(readOnly, row)}
      </CardContent>
      <StageActionFooter
        label={actionLabel}
        onClick={actionLabel ? () => handleSaveStage("resolution") : undefined}
        saving={saving}
        showNext={showNext}
        onNext={onNext}
      />
    </Card>
  );

  const isCurrentAssignee = (row?: any) =>
    officerMatchesUser(row?.officer_assigned ?? row?.assigned_officer, userName, userStaffId)
    || officerMatchesUser(row?.escalated_to, userName, userStaffId);

  const investigationActionLabel = (row?: any) => {
    if (!row?.investigation_start_date) return "Start";
    const filled = !!(
      row.actions_details
      || (row.actions_taken && row.actions_taken !== "Investigation commenced")
      || ["Awaiting Information", "Awaiting Respondent Action"].includes(row.status)
    );
    return filled ? "Update" : "Submit";
  };

  const renderStageContent = (row?: any) => {
    const closed = isComplaintClosed(row?.status);
    const escalated = !!row?.escalated || row?.status === "Escalated";
    const escalatedAway = escalated && !isCurrentAssignee(row) && !isNationalViewer
      && userRole !== "admin" && userRole !== "hq-department" && userRole !== "sdo";
    // After escalation, investigation + escalation are closed; only resolution stays open for the assignee
    const stageClosedAfterEscalation = escalated && (activeStage === "investigation" || activeStage === "escalation");
    const readOnly = closed
      || activeStage === "registration"
      || escalatedAway
      || stageClosedAfterEscalation;
    let actionLabel: string | null = null;
    if (row && !readOnly) {
      if (activeStage === "investigation") actionLabel = investigationActionLabel(row);
      else if (activeStage === "escalation") actionLabel = "Submit";
      else if (activeStage === "resolution") actionLabel = row.date_closed || row.outcome ? "Update" : "Submit";
      else actionLabel = "Submit";
    }

    const completion = getStageCompletion(row);
    const nextStage = nextLifecycleStage(activeStage);
    const showNext = nextStage !== activeStage && !!completion[activeStage];
    const onNext = () => goToStage(nextStage);

    return renderActiveStageForm(row, readOnly, actionLabel, showNext, onNext);
  };

  const renderStageTabs = (row: any) => {
    const completion = getStageCompletion(row);
    return (
      <div className="flex flex-wrap gap-1.5">
        {COMPLAINT_LIFECYCLE.map((stage) => {
          const isActive = activeStage === stage.id;
          const done = completion[stage.id];
          const reachable = isStageReachable(stage.id, completion);
          return (
            <button
              key={stage.id}
              type="button"
              disabled={!reachable}
              onClick={() => reachable && goToStage(stage.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#145c3f] text-white"
                  : reachable
                    ? "bg-white text-slate-600 border border-[#d4e8dc] hover:bg-[#f6fbf8]"
                    : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
              }`}
            >
              {done ? (
                <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#25a872]"}`} />
              ) : (
                <Circle className={`w-3.5 h-3.5 ${isActive ? "text-white/80" : "text-slate-300"}`} />
              )}
              {stage.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (mode === "register") {
    return (
      <div key={`complaint-register-${formKey}`} className="bg-[#f4f7f5]">
        <div className="bg-white border-b px-4 md:px-5 py-2.5 flex items-center gap-3 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSub}
            className="rounded-full hover:bg-[#e8f5ee] shrink-0 h-8 w-8"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-bold text-slate-900">New Complaint</h1>
        </div>
        <div className="w-full px-4 md:px-5 py-3 md:py-4">
          {renderComplaintSection(false)}
        </div>
        <SubmitConfirmModal
          open={submitConfirm.open}
          busy={submitConfirm.busy || saving}
          title="Confirm complaint registration"
          description="Please confirm you want to register this complaint."
          confirmLabel="Yes, register"
          onConfirm={submitConfirm.confirm}
          onCancel={submitConfirm.cancel}
        />
      </div>
    );
  }

  if ((mode === "view" || mode === "manage") && !selected) {
    return (
      <div className="bg-[#f4f7f5] min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#145c3f]" />
      </div>
    );
  }

  if (mode === "view") {
    const row = selected;
    const againstLabel = COMPLAINT_PARTY_TYPES.find((p) => p.value === (row?.complaint_against ?? f.complaint_against))?.label
      ?? row?.complaint_against
      ?? "—";
    const closed = isComplaintClosed(row?.status);
    const stage = lifecycleStageFromStatus(row?.status ?? "", row);
    const stageLabel = lifecycleStageLabel(stage);
    const filingParty = row?.complainant_name ?? row?.complainant_hmo?.name ?? row?.complainant_hcf?.name;
    const respondentParty = row?.respondent_name ?? row?.facility_name ?? row?.respondent_hmo?.name;

    const hasInvestigation = !!(
      row?.investigation_start_date
      || (row?.actions_taken && row.actions_taken !== "Investigation commenced")
      || row?.actions_details
      || ["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(row?.status)
    );
    const hasEscalation = !!(
      row?.escalated
      || row?.status === "Escalated"
      || (row?.escalation_level && row.escalation_level !== "Not Escalated")
      || row?.escalated_to
    );
    const hasResolution = !!(
      closed
      || row?.date_closed
      || row?.outcome
      || row?.resolution_notes
      || ["Resolved", "Closed", "Complaint Withdrawn", "Referred to Appropriate Authority"].includes(row?.status)
    );

    const formatCommentTime = (c: { createdAt?: string; created_at?: string }) => {
      const raw = c.createdAt || c.created_at;
      if (!raw) return "";
      try {
        return new Date(raw).toLocaleString(undefined, {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      } catch {
        return String(raw);
      }
    };

    const ViewSection = ({
      title,
      icon: Icon,
      children,
      accent,
    }: {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      children: React.ReactNode;
      accent?: string;
    }) => (
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden">
        <div className={`flex items-center gap-2 px-3.5 py-2 border-b border-slate-100 ${accent ?? "bg-white"}`}>
          <div className="p-1 bg-[#e8f5ee] rounded-md text-[#145c3f]">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{title}</h2>
        </div>
        <div className="px-3.5 py-2.5">{children}</div>
      </div>
    );

    const NoteBlock = ({ label, text }: { label: string; text?: string | null }) => {
      if (!text) return null;
      return (
        <div className="sm:col-span-2 pt-1.5 mt-0.5 border-t border-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
          <p className="text-[13px] text-slate-800 whitespace-pre-wrap leading-snug">{text}</p>
        </div>
      );
    };

    return (
      <div className="bg-[#f4f7f5] min-h-full">
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="px-4 md:px-5 py-2.5 flex items-center gap-2.5">
            <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full shrink-0 hover:bg-[#e8f5ee] h-8 w-8" aria-label="Back to list">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold tracking-tight font-mono truncate">{row?.complaint_number ?? "Complaint"}</h2>
                {statusBadge(row?.status ?? "—", false)}
                {row?.priority_rating && (
                  <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {row.priority_rating}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stageLabel}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {[
                  closed ? "Closed — view only" : "View only",
                  row?.officer_assigned ?? row?.assigned_officer,
                  row?.date_received ?? row?.complaint_date,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full px-4 md:px-5 py-3.5">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3.5 items-start">
            <div className="space-y-2.5 min-w-0">
              <ViewSection title="Overview" icon={FileText}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                  <ViewInfoRow label="Complaint ID" value={row?.complaint_number} mono highlight />
                  <ViewInfoRow label="Date received" value={row?.date_received ?? row?.complaint_date} />
                  <ViewInfoRow label="Transmission" value={row?.transmission_route} />
                  <ViewInfoRow label="Priority" value={row?.priority_rating} highlight />
                  <ViewInfoRow label="Domain" value={row?.complaint_domain} />
                  <ViewInfoRow label="Category" value={row?.complaint_category ?? row?.category} />
                  <ViewInfoRow label="Complainant" value={row?.complainant_category} />
                  <ViewInfoRow label="Against" value={againstLabel} />
                  <ViewInfoRow label="Filing party" value={filingParty} highlight />
                  <ViewInfoRow label="Respondent" value={respondentParty} highlight />
                  <ViewInfoRow label="Complainant NHIA" value={row?.complainant_nhis_id ?? row?.complainant_id} mono />
                  <ViewInfoRow label="Respondent code" value={row?.respondent_nhis_id ?? row?.respondent_id} mono />
                  <ViewInfoRow label="Assigned to" value={row?.officer_assigned ?? row?.assigned_officer} highlight />
                  <ViewInfoRow label="Created by" value={row?.created_by} />
                  {!isStateScopedViewer && (
                    <>
                      <ViewInfoRow label="Zone" value={zoneLabel(row)} />
                      <ViewInfoRow label="State" value={stateLabel(row)} />
                    </>
                  )}
                  <ViewInfoRow
                    label="SLA"
                    value={
                      row?.sla ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${slaColorDotClass(row.sla.color)}`} />
                          {computeSlaOverdueDays(row.sla) > 0
                            ? `${computeSlaOverdueDays(row.sla)}d overdue`
                            : "On track"}
                        </span>
                      ) : undefined
                    }
                  />
                  <NoteBlock label="Issue" text={row?.description} />
                </div>
              </ViewSection>

              {hasInvestigation && (
                <ViewSection title="Investigation" icon={Search} accent="bg-blue-50/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                    <ViewInfoRow label="Started" value={row?.investigation_start_date} />
                    <ViewInfoRow label="Status" value={row?.status} />
                    <ViewInfoRow label="Actions taken" value={row?.actions_taken} highlight />
                    <ViewInfoRow label="Assigned officer" value={row?.officer_assigned ?? row?.assigned_officer} />
                    <NoteBlock label="Investigation notes" text={row?.actions_details} />
                  </div>
                </ViewSection>
              )}

              {hasEscalation && (
                <ViewSection title="Escalation" icon={AlertTriangle} accent="bg-amber-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                    <ViewInfoRow label="Level" value={row?.escalation_level || "Escalated"} highlight />
                    <ViewInfoRow label="Date" value={row?.escalation_date} />
                    <ViewInfoRow label="Escalation department" value={row?.escalated_to} highlight />
                    <ViewInfoRow label="Current assignee" value={row?.officer_assigned ?? row?.assigned_officer} />
                  </div>
                </ViewSection>
              )}

              {hasResolution && (
                <ViewSection title="Resolution" icon={CheckCircle2} accent="bg-emerald-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                    <ViewInfoRow label="Outcome" value={row?.outcome} highlight />
                    <ViewInfoRow label="Date closed" value={row?.date_closed} />
                    <ViewInfoRow label="Final status" value={row?.status} />
                    <ViewInfoRow
                      label="SLA met"
                      value={
                        row?.resolution_within_sla == null
                          ? undefined
                          : row.resolution_within_sla
                            ? "Yes"
                            : "No"
                      }
                    />
                    <NoteBlock label="Resolution notes" text={row?.resolution_notes || row?.remarks} />
                  </div>
                </ViewSection>
              )}
            </div>

            {/* Right: comments sticky */}
            <div className="xl:sticky xl:top-[3.25rem] bg-white border border-slate-200/90 rounded-xl shadow-sm flex flex-col min-h-[380px] max-h-[calc(100vh-5.5rem)]">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-[#e8f5ee] rounded-md text-[#145c3f]">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Comments</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{comments.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2 min-h-0">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No comments yet</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-100 bg-[#f8fbf9] px-2.5 py-2">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p className="text-[11px] font-semibold text-slate-800 truncate">
                          {c.created_by || "Officer"}
                          {c.created_by_staff_id ? (
                            <span className="font-normal text-slate-400"> · {c.created_by_staff_id}</span>
                          ) : null}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatCommentTime(c)}</span>
                      </div>
                      <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-snug">{c.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 px-3.5 py-2.5 space-y-2 shrink-0 bg-white rounded-b-xl">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a comment…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/30 focus:border-[#25a872] resize-none"
                />
                <Button
                  size="sm"
                  className="w-full h-8 bg-[#145c3f] hover:bg-[#0f3d2e] gap-1.5 text-xs font-semibold"
                  disabled={!commentDraft.trim() || commentSaving}
                  onClick={submitComment}
                >
                  {commentSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  Post comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "manage") {
    const row = selected;
    const assignedToMe = isCurrentAssignee(row);
    const escalatedOpen = !!row?.escalated && !isComplaintClosed(row?.status);
    const canCloseComplaint = !!row && !isComplaintClosed(row.status)
      && (!(isStateCoordinator || isZonalCoordinator) || assignedToMe)
      && !(escalatedOpen && !assignedToMe && !isNationalViewer
        && userRole !== "admin" && userRole !== "hq-department" && userRole !== "sdo");

    return (
      <div className="bg-[#f4f7f5]">
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="px-4 md:px-5 py-2.5 flex items-center gap-2.5">
            <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full shrink-0 hover:bg-[#e8f5ee] h-8 w-8" aria-label="Back to list">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight truncate font-mono">{row?.complaint_number ?? "Complaint"}</h2>
              <p className="text-[11px] text-slate-500 truncate">
                {[
                  escalatedOpen && assignedToMe ? "Escalated to you" : escalatedOpen ? "Escalated" : null,
                  row?.escalation_level && escalatedOpen ? row.escalation_level : null,
                  row?.officer_assigned ?? row?.assigned_officer,
                  row?.date_received,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
            {canCloseComplaint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setCloseModal({ open: true, status: "Resolved", fromInvestigation: false, remarks: "" })}
                className="h-8 gap-1.5 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Complaint
              </Button>
            )}
          </div>
          {renderComplaintSlaBar(row)}
        </div>

        <div className="w-full px-4 md:px-5 py-3 space-y-3">
          {escalatedOpen && !assignedToMe && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-600">
                Escalated to <span className="font-semibold text-slate-800">{row.escalated_to || row.officer_assigned}</span>
                {row.escalation_level ? ` · ${row.escalation_level}` : ""}. You can view this complaint but can no longer update it.
              </p>
            </div>
          )}
          {row && renderStageTabs(row)}
          {renderStageContent(row)}
        </div>
        <CloseComplaintModal
          open={closeModal.open}
          busy={saving}
          status={closeModal.status}
          lockStatus={closeModal.fromInvestigation}
          remarks={closeModal.remarks}
          onStatusChange={(status) => setCloseModal((p) => ({ ...p, status }))}
          onRemarksChange={(remarks) => setCloseModal((p) => ({ ...p, remarks }))}
          onConfirm={handleCloseComplaint}
          onCancel={() => !saving && setCloseModal((p) => ({ ...p, open: false }))}
        />
      </div>
    );
  }

  const listFields: CustomTableField[] = [
    {
      title: "ID",
      value: "complaint_number",
      className: "w-[12%]",
      custom: true,
      component: (c) => {
        const id = String(c.complaint_number || "—");
        const parts = id.split("/");
        const tail = parts.length > 2 ? parts.slice(-2).join("/") : id;
        const head = parts.length > 2 ? parts.slice(0, -2).join("/") : "";
        return (
          <span className="font-mono text-[10px] font-semibold text-slate-800 leading-tight block" title={id}>
            {head ? <span className="block text-slate-500 truncate">{head}</span> : null}
            <span className="block truncate">{tail}</span>
          </span>
        );
      },
    },
    {
      title: "Date",
      value: "date_received",
      className: "w-[8%]",
      custom: true,
      component: (c) => {
        const raw = c.date_received || c.complaint_date || "";
        const short = raw ? String(raw).slice(0, 10) : "—";
        return <span className="text-[11px] tabular-nums whitespace-nowrap">{short}</span>;
      },
    },
    ...(!isStateScopedViewer
      ? [{
          title: "State",
          value: "state_label",
          className: "w-[8%]",
          custom: true,
          component: (c: any) => (
            <span className="text-[11px] truncate block" title={stateLabel(c)}>
              {stateLabel(c)}
            </span>
          ),
        } as CustomTableField]
      : []),
    {
      title: "Issue",
      value: "description",
      className: isStateScopedViewer ? "w-[24%]" : "w-[16%]",
      custom: true,
      component: (c) => (
        <p className="text-[11px] font-medium text-slate-800 line-clamp-2 leading-snug" title={c.description || c.complaint_category || c.category || undefined}>
          {c.description || c.complaint_category || c.category || "—"}
        </p>
      ),
    },
    {
      title: "Pri.",
      value: "priority_rating",
      className: "w-[6%]",
      custom: true,
      component: (c) => priorityBadge(c.priority_rating),
    },
    {
      title: "Officer",
      value: "officer_assigned",
      className: "w-[10%]",
      custom: true,
      component: (c) => (
        <span className="text-[11px] truncate block" title={c.officer_assigned ?? c.assigned_officer}>
          {c.officer_assigned ?? c.assigned_officer ?? "—"}
        </span>
      ),
    },
    {
      title: "SLA",
      value: "sla",
      className: "w-[5%] text-center",
      custom: true,
      component: (c) => (
        <div className="flex justify-center">{renderOverdueCell(c)}</div>
      ),
    },
    {
      title: "Stage",
      value: "stage",
      className: "w-[11%]",
      custom: true,
      component: (c) => stageBadge(c),
    },
    {
      title: "Status",
      value: "status",
      className: "w-[12%]",
      custom: true,
      component: (c) => statusBadge(
        c.status,
        false,
        {
          escalatedToMe: !!c.escalated
            && officerMatchesUser(c.officer_assigned ?? c.assigned_officer ?? c.escalated_to, userName, userStaffId)
            && !isComplaintClosed(c.status),
        },
      ),
    },
    {
      title: "",
      value: "action",
      className: "w-[7%] text-right",
      custom: true,
      component: (c) => {
        const closed = isComplaintClosed(c.status);
        const useView = closed || ((isStateCoordinator || isZonalCoordinator) && !isCurrentAssignee(c));
        const label = useView ? "View" : "Manage";
        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] font-semibold border-[#d4e8dc] hover:bg-[#e8f5ee] hover:text-[#145c3f]"
              onClick={() => (useView ? openView(c) : openManage(c))}
            >
              {label}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-[#f4f7f5] min-h-full">
      <div className="bg-white border-b px-4 md:px-5 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight truncate">Complaints Management</h2>
          <p className="text-[11px] text-slate-500">{listStats.total} complaint{listStats.total === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canRegister && (
            <Button size="sm" className="h-8 bg-orange-action hover:bg-orange-600 gap-1.5 text-xs" onClick={openRegister}>
              <Plus className="w-3.5 h-3.5" /> New Complaint
            </Button>
          )}
        </div>
      </div>

      <div className="w-full px-4 md:px-5 py-3 space-y-3">
        {!isReportingOfficer && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            {[
              { label: "Total", value: listStats.total, icon: <MessageSquare className="w-3.5 h-3.5 text-[#25a872]" />, accent: "border-[#d4e8dc] bg-white" },
              { label: "Open", value: listStats.open, icon: <Clock className="w-3.5 h-3.5 text-amber-600" />, accent: "border-amber-200 bg-amber-50/50" },
              { label: "Investigation", value: listStats.investigation, icon: <Search className="w-3.5 h-3.5 text-blue-600" />, accent: "border-blue-200 bg-blue-50/50" },
              { label: "Escalated", value: listStats.escalated, icon: <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />, accent: "border-purple-200 bg-purple-50/50" },
              { label: "Resolved", value: listStats.resolved, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, accent: "border-emerald-200 bg-emerald-50/50" },
              {
                label: "SLA Met",
                value: listStats.slaTracked ? `${listStats.slaMet}/${listStats.slaTracked}` : "—",
                icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />,
                accent: "border-slate-200 bg-white",
              },
            ].map((k) => (
              <div
                key={k.label}
                className={`rounded-lg border px-3 py-2 flex items-center gap-2.5 ${k.accent}`}
              >
                {k.icon}
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">{k.value}</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAssignedFilter && (
          <div className="flex items-center gap-1.5">
            <Button
              variant={filterAssigned === "all" ? "default" : "outline"}
              size="sm"
              className={`h-7 text-[11px] px-2.5 ${filterAssigned === "all" ? "bg-[#145c3f] hover:bg-[#0f4a31]" : ""}`}
              onClick={() => setFilterAssigned("all")}
            >
              All Complaints
            </Button>
            <Button
              variant={filterAssigned === "mine" ? "default" : "outline"}
              size="sm"
              className={`h-7 text-[11px] px-2.5 ${filterAssigned === "mine" ? "bg-[#145c3f] hover:bg-[#0f4a31]" : ""}`}
              onClick={() => setFilterAssigned("mine")}
            >
              Assigned to Me{assignedToMeCount > 0 ? ` (${assignedToMeCount})` : ""}
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-[#d4e8dc] bg-white p-2 space-y-1.5">
          {/* Row 1 — search + location */}
          <div className={`grid gap-1.5 items-center ${
            geoLocked
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          }`}>
            <div className="relative min-w-0 col-span-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
              <Input
                className="pl-7 h-8 w-full text-xs"
                placeholder="Search…"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-8 w-full text-xs"
              />
            </div>
            {!geoLocked && (
              <>
                {!isZonalCoordinator && (
                  <div className="min-w-0">
                    <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); setFilterFacilityId(""); setFilterFacilityName(""); }}>
                      <SelectTrigger className="h-8 w-full text-xs" displayValue={filterZone === "all" ? "Zone" : pickGeoLabel(zones, filterZone, "Zone")}>
                        <SelectValue placeholder="Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="min-w-0">
                  <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterFacilityId(""); setFilterFacilityName(""); }}>
                    <SelectTrigger className="h-8 w-full text-xs" displayValue={filterState === "all" ? "State" : pickGeoLabel(filterStates, filterState, "State")}>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {filterStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Row 2 — status / channel / facility filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 items-center">
            <div className="min-w-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterStatus === "all" ? "Status" : filterStatus}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {COMPLAINT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterPriority === "all" ? "Priority" : filterPriority}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {PRIORITY_RATINGS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select value={filterTransmission} onValueChange={setFilterTransmission}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterTransmission === "all" ? "Channel" : filterTransmission}>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {TRANSMISSION_ROUTES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <HcfFacilitySelect
                requireState={false}
                stateId={filterState !== "all" ? filterState : (defaultStateId ?? undefined)}
                value={filterFacilityId}
                onChange={(fac) => {
                  setFilterFacilityId(fac?.id ?? "");
                  setFilterFacilityName(fac?.name ?? "");
                }}
                placeholder="HCF"
                className="h-8 w-full text-xs px-3 rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <HmoProviderSelect
                value={filterHmoId}
                onChange={(hmo) => setFilterHmoId(hmo?.id ?? "")}
                placeholder="HMO"
                className="h-8 w-full text-xs px-3 rounded-xl"
              />
            </div>
            {hasFilters && (
              <div className="col-span-full flex justify-end">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 gap-1 text-[11px]" onClick={clearFilters}>
                  <XCircle className="w-3.5 h-3.5" /> Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {loading ? "Loading…" : `${filtered.length} complaint${filtered.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
            {[
              { color: "white", label: "On track" },
              { color: "yellow", label: "Watch" },
              { color: "amber", label: "At risk" },
              { color: "red", label: "Breach" },
            ].map((item) => (
              <span key={item.color} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${slaColorDotClass(item.color)}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <CustomTable
          data={filtered}
          fields={listFields}
          loading={loading}
          pageSize={15}
          message="No complaints found — register a new complaint or adjust filters"
          fitViewport
          getRowClassName={(c) => slaRowClass(c.sla?.color)}
        />
      </div>
    </div>
  );
}
