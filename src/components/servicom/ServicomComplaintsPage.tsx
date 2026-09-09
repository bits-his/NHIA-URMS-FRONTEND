import * as React from "react";
import {
  ArrowLeft, Plus, RefreshCw, Loader2, MessageSquare, Search,
  CheckCircle2, Circle, AlertTriangle, Clock, ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { servicomApi, stockApi } from "@/lib/api";
import { pickGeoLabel, pickLabel } from "./servicomConstants";
import {
  COMPLAINT_TYPES, TRANSMISSION_ROUTES, COMPLAINANT_CATEGORIES, RESPONDENT_CATEGORIES,
  PRIORITY_RATINGS, COMPLAINT_STATUSES, ACTIONS_TAKEN, ESCALATION_LEVELS, ESCALATED_TO,
  COMPLAINT_OUTCOMES, SLA_SUMMARY, domainCodeFromDomain, computeResolutionPreview,
  slaForPriority, STATUS_BADGE_CLASS, COMPLAINT_LIFECYCLE, INVESTIGATION_STATUSES,
  lifecycleStageFromStatus, getStageCompletion, lifecycleStageLabel,
  isComplaintClosed,
  slaColorDotClass, computeSlaOverdueDays, slaRowClass,
  type LifecycleStage, type ComplaintSlaRuleRow,
} from "./complaintRegisterConstants";
import {
  COMPLAINT_PARTY_TYPES, respondentsForComplainant, offencesForParties,
  findOffenceById, offenceSelectOptions, partyTypeFromComplainantCategory,
  type PartyType,
} from "./complaintOffenceGuide";
import HmoProviderSelect from "./HmoProviderSelect";
import HcfFacilitySelect from "./HcfFacilitySelect";

/** Roles that receive investigation assignments and need the "Assigned to Me" filter. */
const COMPLAINT_ASSIGNEE_ROLES = new Set(["state-officer", "department-officer"]);

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  userName?: string | null;
  userStaffId?: string | null;
  userRole?: string | null;
}

type Mode = "list" | "register" | "manage";

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
  from_phone: "",
  from_nhis_id: "",
  against_hmo_id: "",
  against_hcf_id: "",
  against_name: "",
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
    from_phone: row.complainant_phone ?? "",
    from_nhis_id: row.complainant_nhis_id ?? row.complainant_id ?? "",
    against_hmo_id: row.respondent_hmo_id ? String(row.respondent_hmo_id) : "",
    against_hcf_id: row.respondent_hcf_id ? String(row.respondent_hcf_id) : "",
    against_name: row.respondent_name ?? "",
    against_phone: row.respondent_phone ?? "",
    against_nhis_id: row.respondent_nhis_id ?? row.respondent_id ?? "",
    officer_assigned: row.officer_assigned ?? row.assigned_officer ?? "",
    investigation_start_date: row.investigation_start_date ?? "",
    status: row.status ?? "New/Acknowledged",
    actions_taken: row.actions_taken ?? "",
    actions_details: row.actions_details ?? "",
    escalated: !!row.escalated,
    escalation_level: row.escalation_level ?? "",
    escalation_date: row.escalation_date ?? "",
    escalated_to: row.escalated_to ?? "",
    date_closed: row.date_closed ?? row.resolution_date ?? "",
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

function StageSummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
        <CardTitle className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 px-5 py-4">
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
  label, onClick, saving,
}: {
  label: string;
  onClick: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end px-6 md:px-8 py-4 border-t border-[#e6f2eb]">
      <Button
        onClick={onClick}
        disabled={saving}
        className="bg-orange-action hover:bg-orange-600 gap-2 rounded-xl shadow-none px-6"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}

function FieldSelect({
  label, value, options, onChange, readOnly, placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  if (readOnly) {
    const display = pickLabel(options, value, value || "—");
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">{label}</Label>
        <p className="text-sm font-medium text-slate-900">{display || "—"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" displayValue={pickLabel(options, value, placeholder ?? label)}>
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
  label, value, onChange, readOnly, type = "text", placeholder, mono, max, min,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
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
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        className={`w-full ${mono ? "font-mono" : ""}`}
        type={type}
        placeholder={placeholder}
        value={value}
        max={max}
        min={min}
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
  onBack, defaultStateId, defaultZoneId, userName, userStaffId, userRole,
}: Props) {
  const showAssignedFilter = !!(userRole && COMPLAINT_ASSIGNEE_ROLES.has(userRole));
  const geoLocked = !!(defaultZoneId && defaultStateId);
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = React.useState<Mode>("list");
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
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
  const [filterAssigned, setFilterAssigned] = React.useState<"all" | "mine">(
    showAssignedFilter ? "mine" : "all",
  );
  const [activeStage, setActiveStage] = React.useState<LifecycleStage>("registration");
  const [slaRules, setSlaRules] = React.useState<ComplaintSlaRuleRow[]>(SLA_SUMMARY as ComplaintSlaRuleRow[]);
  const [officerOptions, setOfficerOptions] = React.useState<{ value: string; label: string }[]>([]);

  const set = (key: string, value: string | boolean) => setF((p) => ({ ...p, [key]: value }));

  React.useEffect(() => {
    servicomApi.listComplaintSla()
      .then((r) => { if (r.data?.length) setSlaRules(r.data); })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (mode !== "register" && mode !== "manage") return;
    servicomApi.listInvestigatingOfficers()
      .then((r) => {
        setOfficerOptions(r.data.map((u) => {
          const dept = u.unit || u.department;
          const parts = [u.name];
          if (u.staff_id) parts.push(`(${u.staff_id})`);
          if (dept) parts.push(`— ${dept}`);
          return { value: u.name, label: parts.join(" ") };
        }));
      })
      .catch(() => setOfficerOptions([]));
  }, [mode]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.listComplaints({
        state_id: geoLocked ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
        zone_id: geoLocked ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
        status: filterStatus !== "all" ? filterStatus : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        assigned_to_me: showAssignedFilter && filterAssigned === "mine" && userName ? "1" : undefined,
      });
      setComplaints(res.data);
    } catch (err: any) {
      toast.error("Failed to load complaints", { description: err.message });
    } finally { setLoading(false); }
  }, [defaultStateId, defaultZoneId, filterState, filterZone, filterStatus, filterPriority, filterAssigned, showAssignedFilter, userName, geoLocked]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => {
    if (geoLocked || !f.zone_id) { if (!geoLocked) setStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id, geoLocked]);
  React.useEffect(() => {
    if (geoLocked || filterZone === "all") { setFilterStates([]); return; }
    stockApi.getStates(filterZone).then((r) => setFilterStates(r.data)).catch(() => {});
  }, [filterZone, geoLocked]);

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
    const overdueDays = computeSlaOverdueDays(sla);
    return (
      <div className="flex items-center gap-2">
        <span
          className={`h-3.5 w-3.5 shrink-0 rounded-full ${slaColorDotClass(sla.color)}`}
          title={sla.message ?? undefined}
        />
        {overdueDays > 0 && (
          <span className="text-xs font-bold text-slate-800 tabular-nums">{overdueDays}</span>
        )}
      </div>
    );
  };

  const stageBadge = (c: any, emphasis = false) => {
    const stage = lifecycleStageFromStatus(c.status, c);
    const cls = stage === "registration"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : stage === "investigation"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : stage === "escalation"
          ? "bg-purple-50 text-purple-800 border-purple-200"
          : "bg-emerald-50 text-emerald-800 border-emerald-200";
    return (
      <Badge variant="outline" className={`${emphasis ? "text-xs font-black px-2.5 py-1" : "text-[10px] font-semibold"} ${cls}`}>
        {lifecycleStageLabel(stage)}
      </Badge>
    );
  };

  const openRegister = () => {
    setF(emptyForm(defaultZoneId, defaultStateId));
    setSelected(null);
    setActiveStage("registration");
    setMode("register");
  };

  const defaultStageForComplaint = (row: any): LifecycleStage => {
    const status = row?.status ?? "";
    if (officerMatchesUser(row?.officer_assigned ?? row?.assigned_officer, userName, userStaffId)) {
      if (!row?.investigation_start_date && status === "New/Acknowledged") return "investigation";
      if (["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(status)) {
        return "investigation";
      }
      if (row?.escalated || status === "Escalated") return "escalation";
    }
    return lifecycleStageFromStatus(status, row);
  };

  const openManage = async (row: any, stage?: LifecycleStage) => {
    try {
      const res = await servicomApi.getComplaint(row.id);
      setSelected(res.data);
      setF(rowToForm(res.data));
      setActiveStage(stage ?? defaultStageForComplaint(res.data));
      setMode("manage");
    } catch (err: any) {
      toast.error("Failed to load complaint", { description: err.message });
    }
  };

  const closeSub = () => {
    setMode("list");
    setSelected(null);
    setActiveStage("registration");
    load();
  };

  const refreshSelected = async () => {
    if (!selected?.id) return;
    const res = await servicomApi.getComplaint(selected.id);
    setSelected(res.data);
    setF(rowToForm(res.data));
  };

  const statusBadge = (status: string, emphasis = false) => (
    <Badge variant="outline" className={`${emphasis ? "text-xs font-black px-2.5 py-1" : "text-[10px] font-semibold"} ${STATUS_BADGE_CLASS[status] ?? ""}`}>
      {status}
    </Badge>
  );

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
        return role === "from" ? "Enter filing enrollee name and NHIS ID." : "Enter enrollee name and NHIS ID.";
      }
    }
    return null;
  };

  const handleSaveRegistration = async () => {
    if (!f.date_received) {
      toast.error("Date received is required.");
      return;
    }
    if (!f.complaint_type || !f.complaint_against) {
      toast.error("Complaint type and complaint against are required.");
      return;
    }
    if (f.complaint_type === f.complaint_against) {
      toast.error("Complaint type and complaint against must be different.");
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
        complainant_phone: f.from_phone || undefined,
        complainant_nhis_id: f.from_nhis_id || undefined,
        respondent_category: f.respondent_category || undefined,
        respondent_id: f.against_nhis_id || f.respondent_id || undefined,
        respondent_hmo_id: f.against_hmo_id ? Number(f.against_hmo_id) : null,
        respondent_hcf_id: f.against_hcf_id ? Number(f.against_hcf_id) : null,
        respondent_name: f.against_name || undefined,
        respondent_phone: f.against_phone || undefined,
        respondent_nhis_id: f.against_nhis_id || undefined,
        zone_id: f.zone_id ? Number(f.zone_id) : null,
        state_id: f.state_id ? Number(f.state_id) : null,
        officer_assigned: f.officer_assigned,
        status: "New/Acknowledged",
      };
      const res = await servicomApi.createComplaint(payload);
      toast.success("Complaint registered and assigned to officer");
      setSelected(res.data);
      setF(rowToForm(res.data));
      setActiveStage("registration");
      setMode("manage");
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
        payload = {
          officer_assigned: f.officer_assigned,
          investigation_start_date: f.investigation_start_date || today,
          status: startingInvestigation ? "Under Investigation" : f.status,
          actions_taken: f.actions_taken || (startingInvestigation ? "Investigation commenced" : null),
          actions_details: f.actions_details || null,
        };
      } else if (stage === "escalation") {
        payload = {
          escalated: !!f.escalated,
          escalation_level: f.escalation_level || null,
          escalation_date: f.escalation_date || null,
          escalated_to: f.escalated_to || null,
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
      toast.success(
        stage === "investigation" && startingInvestigation
          ? "Investigation started"
          : `${lifecycleStageLabel(stage)} updated`,
      );
      await refreshSelected();
      load();
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
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

  const onComplaintTypeChange = (v: PartyType) => {
    setF((p) => ({
      ...p,
      complaint_type: v,
      from_hmo_id: "",
      from_hcf_id: "",
      from_name: "",
      from_phone: "",
      from_nhis_id: "",
      complaint_against: "",
      against_hmo_id: "",
      against_hcf_id: "",
      against_name: "",
      against_phone: "",
      against_nhis_id: "",
      ...clearOffence(),
    }));
  };

  const onComplaintAgainstChange = (v: PartyType) => {
    setF((p) => ({
      ...p,
      complaint_against: v,
      against_hmo_id: "",
      against_hcf_id: "",
      against_name: "",
      against_phone: "",
      against_nhis_id: "",
      ...clearOffence(),
    }));
  };

  const onOffenceChange = (reference: string) => {
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
      if (readOnly) {
        return <AutoField label="HMO *" value={hmoName} />;
      }
      return (
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs text-slate-500">HMO *</Label>
          <HmoProviderSelect
            value={hmoId}
            onChange={(p) => setF((prev) => isFrom
              ? { ...prev, from_hmo_id: p?.id ?? "", from_name: p?.name ?? "" }
              : { ...prev, against_hmo_id: p?.id ?? "", against_name: p?.name ?? "" })}
          />
        </div>
      );
    }

    if (partyType === "HCF") {
      const hcfId = readOnly
        ? String(isFrom ? row?.complainant_hcf_id : row?.respondent_hcf_id ?? row?.facility_id ?? "")
        : (isFrom ? f.from_hcf_id : f.against_hcf_id);
      const hcfName = isFrom
        ? row?.complainant_hcf?.name ?? row?.complainant_name
        : row?.facility_name ?? row?.respondent_name;
      if (readOnly) {
        return <AutoField label="HCF *" value={hcfName} />;
      }
      return (
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs text-slate-500">HCF *</Label>
          <HcfFacilitySelect
            stateId={activeStateId || undefined}
            value={hcfId}
            onChange={(fac) => setF((prev) => isFrom
              ? { ...prev, from_hcf_id: fac?.id ?? "", from_name: fac?.name ?? "" }
              : { ...prev, against_hcf_id: fac?.id ?? "", against_name: fac?.name ?? "" })}
          />
        </div>
      );
    }

    const name = readOnly
      ? (isFrom ? row?.complainant_name : row?.respondent_name)
      : (isFrom ? f.from_name : f.against_name);
    const nhis = readOnly
      ? (isFrom ? row?.complainant_nhis_id ?? row?.complainant_id : row?.respondent_nhis_id ?? row?.respondent_id)
      : (isFrom ? f.from_nhis_id : f.against_nhis_id);
    const phone = readOnly
      ? (isFrom ? row?.complainant_phone : row?.respondent_phone)
      : (isFrom ? f.from_phone : f.against_phone);

    return (
      <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FieldText
          label="Full Name *"
          value={name ?? ""}
          onChange={(v) => set(isFrom ? "from_name" : "against_name", v)}
          readOnly={readOnly}
        />
        <FieldText
          label="NHIS ID *"
          value={nhis ?? ""}
          onChange={(v) => set(isFrom ? "from_nhis_id" : "against_nhis_id", v)}
          readOnly={readOnly}
          mono
        />
        <FieldText
          label="Phone"
          value={phone ?? ""}
          onChange={(v) => set(isFrom ? "from_phone" : "against_phone", v)}
          readOnly={readOnly}
        />
      </div>
    );
  };

  const resolutionPreview = React.useMemo(
    () => computeResolutionPreview(f.date_received, f.date_closed, f.priority_rating),
    [f.date_received, f.date_closed, f.priority_rating],
  );

  const renderGeoFields = (readOnly: boolean, row?: any) => (
    <>
      {geoLocked ? null : (
        <>
          <FieldSelect
            label="Zone"
            value={readOnly ? String(row?.zone_id ?? "") : f.zone_id}
            options={zones.map((z) => ({ value: String(z.id), label: z.description }))}
            readOnly={readOnly}
            onChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: "" }))}
          />
          <FieldSelect
            label="State"
            value={readOnly ? String(row?.state_id ?? "") : f.state_id}
            options={states.map((s) => ({ value: String(s.id), label: s.description }))}
            readOnly={readOnly}
            onChange={(v) => set("state_id", v)}
          />
        </>
      )}
    </>
  );

  const renderComplaintSection = (readOnly: boolean, row?: any, embedded = false) => {
    const fromParty = (readOnly ? rowToForm(row).complaint_type : f.complaint_type) as PartyType | "";
    const againstParty = (readOnly ? rowToForm(row).complaint_against : f.complaint_against) as PartyType | "";
    const offenceOptions = offencesForParties(fromParty, againstParty);
    const offenceSelected = !!(readOnly ? row?.offence_reference : f.offence_reference);

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
            <FieldText
              label="Date Received *"
              type="date"
              value={dateReceived ?? ""}
              onChange={(v) => set("date_received", v)}
              readOnly={readOnly}
            />
            {renderGeoFields(readOnly, row)}

            <FieldSelect
              label="Complaint Type *"
              value={fromParty}
              options={COMPLAINT_TYPES}
              readOnly={readOnly}
              onChange={(v) => onComplaintTypeChange(v as PartyType)}
              placeholder="HCF, HMO, or Enrollee"
            />
            {renderInlinePartyPicker("from", fromParty, readOnly, row)}
            {showAgainstStep && (
              <>
                <FieldSelect
                  label="Complaint Against *"
                  value={againstParty}
                  options={againstOptions}
                  readOnly={readOnly}
                  onChange={(v) => onComplaintAgainstChange(v as PartyType)}
                  placeholder="Select who the complaint is against"
                />
                {renderInlinePartyPicker("against", againstParty, readOnly, row)}
              </>
            )}
            <FieldSelect
              label="Complainant Category"
              value={readOnly ? row?.complainant_category : f.complainant_category}
              options={COMPLAINANT_CATEGORIES}
              readOnly={readOnly}
              onChange={(v) => set("complainant_category", v)}
            />
            <FieldSelect
              label="Transmission Route"
              value={transmissionRoute ?? ""}
              options={TRANSMISSION_ROUTES}
              readOnly={readOnly}
              onChange={(v) => set("transmission_route", v)}
            />
            <FieldSelect
              label="Respondent Category"
              value={readOnly ? row?.respondent_category : f.respondent_category}
              options={RESPONDENT_CATEGORIES}
              readOnly={readOnly}
              onChange={(v) => set("respondent_category", v)}
            />

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

            {offenceSelected && (
              <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-[#f8fbf9] border border-[#d4e8dc] px-3 py-2.5">
                <DerivedField label="Domain" value={domain} />
                <DerivedField label="Category" value={category} />
                <DerivedField label="Priority" value={priority} />
              </div>
            )}

            {offenceSelected && offenceText && (
              <div className="col-span-full">
                <DerivedTextBlock label="Issue" value={offenceText} />
              </div>
            )}

            {offenceSelected && (priority || readOnly) && (
              <div className="col-span-full">
                <SlaHint priority={priority} slaRow={slaRow} />
              </div>
            )}

            {!readOnly && (
              officerOptions.length ? (
                <FieldSelect
                  label="Assign To *"
                  value={f.officer_assigned}
                  options={officerOptions}
                  onChange={(v) => set("officer_assigned", v)}
                  placeholder="Select investigating officer"
                />
              ) : (
                <FieldText
                  label="Assign To *"
                  value={f.officer_assigned}
                  onChange={(v) => set("officer_assigned", v)}
                  placeholder="Officer name"
                />
              )
            )}
            {readOnly && (
              <AutoField label="Assigned To" value={row?.officer_assigned ?? row?.assigned_officer} />
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
                onClick={handleSaveRegistration}
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

  const zoneLabel = (row?: any) =>
    row?.zone?.description ?? pickGeoLabel(zones, String(row?.zone_id ?? ""), "—");
  const stateLabel = (row?: any) =>
    row?.state?.description ?? pickGeoLabel(states.length ? states : filterStates, String(row?.state_id ?? ""), "—");

  const renderRegistrationSummary = (row?: any) => {
    if (!row) return null;
    const mapped = rowToForm(row);
    const fromLabel = COMPLAINT_PARTY_TYPES.find((p) => p.value === mapped.complaint_type)?.label ?? mapped.complaint_type;
    const againstLabel = COMPLAINT_PARTY_TYPES.find((p) => p.value === mapped.complaint_against)?.label ?? mapped.complaint_against;
    return (
      <StageSummaryCard title="Complaint">
        {!geoLocked && (
          <>
            <SummaryField label="Zone" value={zoneLabel(row)} />
            <SummaryField label="State" value={stateLabel(row)} />
          </>
        )}
        <SummaryField label="Date Received" value={row.date_received ?? row.complaint_date} />
        <SummaryField label="Transmission Route" value={row.transmission_route} />
        <SummaryField label="Complaint Type" value={fromLabel} />
        <SummaryField label="Complainant Category" value={row.complainant_category} />
        <SummaryField label="Respondent Category" value={row.respondent_category} />
        <SummaryField label="Complaint Against" value={againstLabel} />
        <SummaryField label="Filing Party" value={row.complainant_name ?? row.complainant_hmo?.name ?? row.complainant_hcf?.name} />
        <SummaryField label="Against Party" value={row.respondent_name ?? row.facility_name ?? row.respondent_hmo?.name} />
        <SummaryField label="Domain" value={row.complaint_domain} />
        <SummaryField label="Category" value={row.complaint_category ?? row.category} />
        <SummaryField label="Priority" value={row.priority_rating} />
        <SummaryField label="Assigned To" value={row.officer_assigned ?? row.assigned_officer} />
        <SummaryField label="Issue" value={row.description} fullWidth />
      </StageSummaryCard>
    );
  };

  const renderActiveStageForm = (row?: any, readOnly = false, actionLabel?: string | null) => {
    if (activeStage === "registration") return renderComplaintSection(true, row, true);
    if (activeStage === "investigation") return renderInvestigationSection(readOnly, row, actionLabel);
    if (activeStage === "escalation") return renderEscalationSection(readOnly, row, actionLabel);
    return renderResolutionSection(readOnly, row, actionLabel);
  };

  const renderComplaintSlaBar = (row?: any) => {
    if (!row) return null;
    const slaRow = slaForPriority(row.priority_rating ?? "", slaRules);

    return (
      <div className="px-4 md:px-6 py-2.5 border-t border-[#d4e8dc] bg-[#f8fbf9] flex flex-wrap items-center gap-x-3 gap-y-2">
        {statusBadge(row.status ?? "New/Acknowledged", true)}
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
              <span className={`h-3 w-3 shrink-0 rounded-full ${slaColorDotClass(row.sla.color)}`} />
              {computeSlaOverdueDays(row.sla) > 0 && (
                <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                  {computeSlaOverdueDays(row.sla)} overdue
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-600">
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
            <span className="text-[11px] text-slate-600">
              Ack {slaRow.acknowledge} · Investigate {slaRow.investigate} · Escalate {slaRow.escalate} · Resolve {slaRow.resolve}
            </span>
          </>
        ) : null}
      </div>
    );
  };

  const renderInvestigationSection = (readOnly: boolean, row?: any, actionLabel?: string | null) => {
    const started = !!(readOnly ? row?.investigation_start_date : f.investigation_start_date)
      || ["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(
        readOnly ? row?.status : f.status,
      );

    return (
      <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {!readOnly && !started && (
            <div className="col-span-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5">
              <p className="text-sm text-amber-950 leading-relaxed">
                Investigation has not started. Use <span className="font-semibold">Start Investigation</span> below when you are ready to begin.
              </p>
            </div>
          )}
          <AutoField
            label="Assigned Officer"
            value={readOnly ? (row?.officer_assigned ?? row?.assigned_officer) : f.officer_assigned}
          />
          <AutoField
            label="Investigation Start Date"
            value={started
              ? (readOnly ? row?.investigation_start_date : f.investigation_start_date) || today
              : "Not started"}
          />
          {started && (
            <>
              <FieldSelect label="Status" value={readOnly ? row?.status : f.status}
                options={readOnly ? COMPLAINT_STATUSES : INVESTIGATION_STATUSES}
                readOnly={readOnly} onChange={(v) => set("status", v)} />
              <FieldSelect label="Actions Taken" value={readOnly ? row?.actions_taken : f.actions_taken}
                options={ACTIONS_TAKEN} readOnly={readOnly} onChange={(v) => set("actions_taken", v)} />
              <div className="col-span-full">
                <FieldText label="Actions Details" value={readOnly ? row?.actions_details : f.actions_details}
                  onChange={(v) => set("actions_details", v)} readOnly={readOnly} />
              </div>
            </>
          )}
        </CardContent>
        {actionLabel && (
          <StageActionFooter
            label={actionLabel}
            onClick={() => handleSaveStage("investigation")}
            saving={saving}
          />
        )}
      </Card>
    );
  };

  const renderEscalationSection = (readOnly: boolean, row?: any, actionLabel?: string | null) => (
    <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
      <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        {readOnly ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Escalated</Label>
            <Badge variant="outline">{row?.escalated ? "Yes" : "No"}</Badge>
          </div>
        ) : (
          <FieldSelect label="Escalated" value={f.escalated ? "yes" : "no"}
            options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]}
            onChange={(v) => set("escalated", v === "yes")} />
        )}
        <FieldSelect label="Escalation Level" value={readOnly ? row?.escalation_level : f.escalation_level}
          options={ESCALATION_LEVELS} readOnly={readOnly} onChange={(v) => set("escalation_level", v)} />
        <FieldText label="Escalation Date" type="date" value={readOnly ? row?.escalation_date : f.escalation_date}
          onChange={(v) => set("escalation_date", v)} readOnly={readOnly} />
        {readOnly || !officerOptions.length ? (
          <FieldSelect label="Escalated To" value={readOnly ? row?.escalated_to : f.escalated_to}
            options={ESCALATED_TO} readOnly={readOnly}
            onChange={(v) => set("escalated_to", v)} />
        ) : (
          <FieldSelect
            label="Escalated To"
            value={readOnly ? row?.escalated_to : f.escalated_to}
            options={[
              ...officerOptions,
              ...ESCALATED_TO.filter((o) => !officerOptions.some((p) => p.value === o.value)),
            ]}
            readOnly={readOnly}
            onChange={(v) => set("escalated_to", v)}
            placeholder="Select officer or authority"
          />
        )}
      </CardContent>
      {actionLabel && (
        <StageActionFooter
          label={actionLabel}
          onClick={() => handleSaveStage("escalation")}
          saving={saving}
        />
      )}
    </Card>
  );

  const renderResolutionSection = (readOnly: boolean, row?: any, actionLabel?: string | null) => {
    const preview = readOnly
      ? { resolution_days: row?.resolution_days, resolution_within_sla: row?.resolution_within_sla }
      : resolutionPreview;

    const slaLabel = preview.resolution_within_sla == null
      ? ""
      : preview.resolution_within_sla ? "Yes" : "No";

    return (
    <Card className="rounded-2xl border-[#d4e8dc] bg-white shadow-sm w-full py-0 gap-0">
      <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
        <FieldText label="Date Closed" type="date" value={readOnly ? (row?.date_closed ?? row?.resolution_date) : f.date_closed}
          onChange={(v) => set("date_closed", v)} readOnly={readOnly} max={readOnly ? undefined : today} />
        <FieldSelect label="Outcome" value={readOnly ? row?.outcome : f.outcome}
          options={COMPLAINT_OUTCOMES} readOnly={readOnly} onChange={(v) => set("outcome", v)} />
        <div className="col-span-full">
          <FieldText label="Remarks" value={readOnly ? (row?.remarks ?? row?.resolution_notes) : f.remarks}
            onChange={(v) => set("remarks", v)} readOnly={readOnly} />
        </div>
      </CardContent>
      {actionLabel && (
        <StageActionFooter
          label={actionLabel}
          onClick={() => handleSaveStage("resolution")}
          saving={saving}
        />
      )}
    </Card>
    );
  };

  const renderStageContent = (row?: any) => {
    const closed = isComplaintClosed(row?.status);
    const readOnly = closed || activeStage === "registration";
    const actionLabel = row && !readOnly ? getStageActionLabel(row, activeStage) : null;
    return renderActiveStageForm(row, readOnly, actionLabel);
  };

  const renderStageTabs = (row: any) => {
    const completion = getStageCompletion(row);
    return (
      <div className="flex flex-wrap gap-2">
        {COMPLAINT_LIFECYCLE.map((stage) => {
          const isActive = activeStage === stage.id;
          const done = completion[stage.id];
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveStage(stage.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#145c3f] text-white"
                  : "bg-white text-slate-700 border border-[#d4e8dc] hover:bg-[#f6fbf8]"
              }`}
            >
              {done ? (
                <CheckCircle2 className={`w-4 h-4 ${isActive ? "text-white" : "text-[#25a872]"}`} />
              ) : (
                <Circle className={`w-4 h-4 ${isActive ? "text-white/80" : "text-slate-300"}`} />
              )}
              {stage.label}
            </button>
          );
        })}
      </div>
    );
  };

  const getStageActionLabel = (row: any, stage: LifecycleStage): string | null => {
    if (stage === "registration" || isComplaintClosed(row?.status)) return null;
    if (stage === "investigation") {
      const started = !!(row?.investigation_start_date
        || ["Under Investigation", "Awaiting Information", "Awaiting Respondent Action"].includes(row?.status ?? ""));
      return started ? "Update" : "Start Investigation";
    }
    if (stage === "escalation") {
      return row?.escalated || row?.escalation_date ? "Update" : "Save Escalation";
    }
    if (stage === "resolution") {
      return row?.date_closed || row?.outcome ? "Update" : "Close Complaint";
    }
    return "Update";
  };

  if (mode === "register") {
    return (
      <div key="complaint-register" className="bg-[#f4f7f5]">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full hover:bg-[#e8f5ee] shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-slate-900">Register New Complaint</h1>
        </div>
        <div className="w-full px-4 md:px-6 py-4 md:py-6">
          {renderComplaintSection(false)}
        </div>
      </div>
    );
  }

  if (mode === "manage") {
    const row = selected;

    return (
      <div className="bg-[#f4f7f5]">
        <div className="bg-white border-b sticky top-0 z-30">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full shrink-0 hover:bg-[#e8f5ee]" aria-label="Back to list">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight truncate">{row?.complaint_number ?? "Complaint"}</h2>
              <p className="text-xs text-slate-500 truncate">
                {[row?.officer_assigned ?? row?.assigned_officer, row?.date_received].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {renderComplaintSlaBar(row)}
        </div>

        <div className="w-full px-4 md:px-6 py-4 md:py-6 space-y-4">
          {row && renderStageTabs(row)}
          {renderStageContent(row)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f7f5]">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0 hover:bg-[#e8f5ee]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight truncate">Complaints Management</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openRegister}>
            <Plus className="w-4 h-4" /> Register New Complaint
          </Button>
        </div>
      </div>

      <div className="w-full px-4 md:px-6 py-4 md:py-6 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total", value: listStats.total, icon: <MessageSquare className="w-4 h-4 text-[#25a872]" />, accent: "border-[#d4e8dc]" },
              { label: "Open", value: listStats.open, icon: <Clock className="w-4 h-4 text-amber-600" />, accent: "border-amber-200" },
              { label: "Investigation", value: listStats.investigation, icon: <Search className="w-4 h-4 text-blue-600" />, accent: "border-blue-200" },
              { label: "Escalated", value: listStats.escalated, icon: <AlertTriangle className="w-4 h-4 text-purple-600" />, accent: "border-purple-200" },
              { label: "Resolved", value: listStats.resolved, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, accent: "border-emerald-200" },
              {
                label: "SLA Met",
                value: listStats.slaTracked ? `${listStats.slaMet}/${listStats.slaTracked}` : "—",
                icon: <CheckCircle2 className="w-4 h-4 text-slate-600" />,
                accent: "border-slate-200",
              },
            ].map((k) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-4 bg-white border ${k.accent}`}
              >
                <div className="mb-2">{k.icon}</div>
                <p className="text-2xl font-black text-slate-800">{k.value}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">{k.label}</p>
              </motion.div>
            ))}
          </div>

          {showAssignedFilter && (
            <div className="flex items-center gap-2">
              <Button
                variant={filterAssigned === "all" ? "default" : "outline"}
                size="sm"
                className={filterAssigned === "all" ? "bg-[#145c3f] hover:bg-[#0f4a31]" : ""}
                onClick={() => setFilterAssigned("all")}
              >
                All Complaints
              </Button>
              <Button
                variant={filterAssigned === "mine" ? "default" : "outline"}
                size="sm"
                className={filterAssigned === "mine" ? "bg-[#145c3f] hover:bg-[#0f4a31]" : ""}
                onClick={() => setFilterAssigned("mine")}
              >
                Assigned to Me{assignedToMeCount > 0 ? ` (${assignedToMeCount})` : ""}
              </Button>
            </div>
          )}

          {/* Filters */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-[2] min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    className="pl-9 h-9 w-full"
                    placeholder="Search ID, category, type..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
                {!geoLocked && (
                  <>
                    <div className="flex-1 min-w-0">
                      <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                        <SelectTrigger className="h-9 w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}>
                          <SelectValue placeholder="Zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Zones</SelectItem>
                          {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Select value={filterState} onValueChange={setFilterState}>
                        <SelectTrigger className="h-9 w-full" displayValue={filterState === "all" ? "All States" : pickGeoLabel(filterStates, filterState, "State")}>
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
                <div className="flex-1 min-w-0">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 w-full" displayValue={filterStatus === "all" ? "All Statuses" : filterStatus}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {COMPLAINT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-0">
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-9 w-full" displayValue={filterPriority === "all" ? "All Priorities" : filterPriority}>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {PRIORITY_RATINGS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#145c3f]">
                  <MessageSquare className="w-4 h-4" />
                  {loading ? (
                    "Loading..."
                  ) : (
                    <>
                      <span className="font-bold text-base">
                        Complaint{filtered.length === 1 ? "" : "s"} Register
                      </span>
                      <span className="text-slate-500 text-sm ml-2">
                        {filtered.length} Complaint{filtered.length === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </CardTitle>
                {!loading && filtered.length > 0 && (
                  <span className="text-[10px] text-slate-500">Click Manage to continue the lifecycle</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Loading complaints...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#e8f5ee] flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-[#25a872]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">No complaints found</p>
                    <p className="text-xs text-slate-400 mt-1">Register a new complaint or adjust your filters</p>
                  </div>
                  <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openRegister}>
                    <Plus className="w-4 h-4" /> Register  Complaint
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-black text-slate-800">Date</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Offence</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Priority</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Assigned To</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Overdue</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Stage</TableHead>
                        <TableHead className="text-xs font-black text-slate-800">Status</TableHead>
                        <TableHead className="text-xs font-black text-slate-800 text-right w-28">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className={`border-b border-slate-100 transition-colors ${slaRowClass(c.sla?.color)}`}
                        >
                          <TableCell className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {c.date_received || c.complaint_date || "—"}
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="text-xs font-medium text-slate-800 line-clamp-2">
                              {c.description || c.complaint_category || c.category || "—"}
                            </p>
                          </TableCell>
                          <TableCell>{priorityBadge(c.priority_rating)}</TableCell>
                          <TableCell className="text-xs text-slate-700 max-w-[140px] truncate" title={c.officer_assigned ?? c.assigned_officer}>
                            {c.officer_assigned ?? c.assigned_officer ?? "—"}
                          </TableCell>
                          <TableCell>{renderOverdueCell(c)}</TableCell>
                          <TableCell className="font-bold">{stageBadge(c, true)}</TableCell>
                          <TableCell className="font-bold">{statusBadge(c.status, true)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 text-xs font-semibold gap-1.5 border-[#d4e8dc] hover:bg-[#e8f5ee] hover:text-[#145c3f] ${
                                officerMatchesUser(c.officer_assigned ?? c.assigned_officer, userName, userStaffId)
                                  ? "border-[#145c3f] bg-[#f0fdf7]"
                                  : ""
                              }`}
                              onClick={() => openManage(c)}
                            >
                              {officerMatchesUser(c.officer_assigned ?? c.assigned_officer, userName, userStaffId) ? "Open" : "Manage"}
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
