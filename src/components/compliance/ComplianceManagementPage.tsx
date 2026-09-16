import * as React from "react";
import {
  ArrowLeft, Plus, Loader2, RefreshCw, Eye,
  FileText, CheckCircle2, Clock, XCircle, Pencil,
  AlertTriangle, ShieldAlert, MinusCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { complianceApi, stockApi, apiFileUrl } from "@/lib/api";
import { useAppSelector } from "@/src/store/hooks";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import {
  OWNERSHIP_OPTIONS, FACILITY_TYPE_OPTIONS, COMPLAINT_CATEGORIES,
  ESCALATION_OPTIONS, ENFORCEMENT_ACTIONS, COMPLIANCE_SECTIONS,
  COMPLIANCE_RATINGS, CONFIRMATION_OPTIONS,
  currentISOWeek, quarterFromWeek, ratingLabel,
} from "./complianceConstants";
import { labelOf } from "../stateOffice/constants";
import ComplianceReportForm, { FORM_STEPS, type FormStep } from "./ComplianceReportForm";
import {
  firstOpenComplianceStep, getComplianceStepCompletion, complianceStepLabel,
  nextComplianceStep, parseComplaintCategories, countFindingStatuses,
} from "./complianceConstants";
import DashboardDrillPanel, { type DrillContext, type DrillRow } from "@/components/dashboard/DashboardDrillPanel";
import { ClickableKpi, getUnitHeadScope } from "@/components/dashboard/dashboardUi";
import type { DrillStatChip } from "@/components/dashboard/drillStats";
import {
  buildComplianceDrillRows, computeComplianceKpis, parseReportIdFromDrillRow,
  COMPLIANCE_DRILL_TITLES, type ComplianceDrillKind,
} from "./complianceDrill";

const MODULE_NAME = "Facility Compliance Report";

const uid = () => Math.random().toString(36).slice(2);

function pickGeoLabel(
  options: { id: number; label?: string; description?: string }[],
  value: string,
  fallback: string,
) {
  if (!value) return fallback;
  const match = options.find(o => String(o.id) === value);
  return match?.description ?? match?.label ?? fallback;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

const STATUS_CFG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type Finding = { _key: string; section: string; indicator: string; status: string; remarks: string };
type Violation = { _key: string; nature_of_violation: string; nhia_act_section: string; occurrences: string; action_taken: string };
type Enforcement = { _key: string; enforcement_action: string; details: string };

function mapProviderFacilityType(raw?: string | null): string {
  if (!raw) return "";
  const t = raw.toLowerCase();
  if (t.includes("tertiary") || t.includes("primary")) return t.includes("tertiary") ? "Secondary" : "Primary";
  if (t.includes("secondary")) return "Secondary";
  if (t.includes("phc")) return "PHC";
  return FACILITY_TYPE_OPTIONS.includes(raw) ? raw : "Other";
}

export default function ComplianceManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const authUser = useAppSelector(s => s.auth.user);
  const [mode, setMode] = React.useState<"list" | "form" | "view">("list");
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [refId, setRefId] = React.useState<string | null>(null);
  const [reportStatus, setReportStatus] = React.useState("draft");
  const [viewReport, setViewReport] = React.useState<any>(null);

  const {
    showStateFilter, filterState, setFilterState, apiStateId, stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<{ id: number; description: string }[]>([]);
  const [filterYear, setFilterYear] = React.useState(String(new Date().getFullYear()));
  const [filterStatus, setFilterStatus] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: number; label: string }[]>([]);
  const [stateOpts, setStateOpts] = React.useState<{ id: number; label: string }[]>([]);
  const [zoneLabel, setZoneLabel] = React.useState("");
  const [stateLabel, setStateLabel] = React.useState("");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [reportYear, setReportYear] = React.useState(String(new Date().getFullYear()));
  const [reportWeek, setReportWeek] = React.useState(String(currentISOWeek()));

  const [officerName, setOfficerName] = React.useState(authUser?.name ?? "");
  const [officerStaffId, setOfficerStaffId] = React.useState(authUser?.staff_id ?? "");
  const [submitDate, setSubmitDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [reviewedBy, setReviewedBy] = React.useState("");
  const [statusConfirmed, setStatusConfirmed] = React.useState("pending");
  const [followUp, setFollowUp] = React.useState(false);
  const [certification, setCertification] = React.useState("");
  const [certificationFile, setCertificationFile] = React.useState<File | null>(null);
  const [existingCertName, setExistingCertName] = React.useState<string | null>(null);
  const [removeCertification, setRemoveCertification] = React.useState(false);
  const [stateRemarks, setStateRemarks] = React.useState("");

  const [facilityName, setFacilityName] = React.useState("");
  const [facilityCode, setFacilityCode] = React.useState("");
  const [facilityType, setFacilityType] = React.useState("");
  const [ownership, setOwnership] = React.useState("");
  const [facilityAddress, setFacilityAddress] = React.useState("");

  const [complaintsReceived, setComplaintsReceived] = React.useState("");
  const [complaintCategories, setComplaintCategories] = React.useState<string[]>([]);
  const [resolvedAtFacility, setResolvedAtFacility] = React.useState("");
  const [escalatedTo, setEscalatedTo] = React.useState("none");
  const [complaintSummary, setComplaintSummary] = React.useState("");

  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [violations, setViolations] = React.useState<Violation[]>([]);
  const [enforcements, setEnforcements] = React.useState<Enforcement[]>([]);

  const [findingDraft, setFindingDraft] = React.useState({ section: "", indicators: [] as string[], statuses: ["fully_compliant"], remarks: "" });
  const [violationDraft, setViolationDraft] = React.useState({ nature_of_violation: "", nhia_act_section: "", occurrences: "", action_taken: "" });
  const [enforcementDraft, setEnforcementDraft] = React.useState({ enforcement_action: "", details: "" });
  const [formStep, setFormStep] = React.useState<FormStep>("header");
  const [facilityProviderId, setFacilityProviderId] = React.useState("");

  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: any) => ({ id: z.id, label: z.description }))),
    ).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (defaultZoneId) setFilterZone(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    if (!zid) { setDashboardStates([]); return; }
    stockApi.getStates(zid).then(r => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState(ALL_STATES);
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);

  React.useEffect(() => {
    if (!zoneId) { setStateOpts([]); return; }
    stockApi.getStates(zoneId).then(r =>
      setStateOpts(r.data.map((s: any) => ({ id: s.id, label: s.description }))),
    ).catch(() => {});
  }, [zoneId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await complianceApi.list({
        zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId ?? undefined),
        state_id: apiStateId || defaultStateId || undefined,
        year: filterYear !== "all" ? filterYear : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      setReports(res.data);
    } catch (err: any) {
      toast.error("Failed to load reports", { description: err.message });
    } finally { setLoading(false); }
  }, [defaultZoneId, defaultStateId, filterZone, apiStateId, filterYear, filterStatus]);

  React.useEffect(() => { if (mode === "list") load(); }, [mode, load]);

  const kpiStats = React.useMemo(() => computeComplianceKpis(reports), [reports]);

  const unitScope = React.useMemo(
    () => getUnitHeadScope(MODULE_NAME, defaultStateId, defaultZoneId),
    [defaultStateId, defaultZoneId],
  );

  const [drillOpen, setDrillOpen] = React.useState(false);
  const [drillContext, setDrillContext] = React.useState<DrillContext | null>(null);
  const [drillRows, setDrillRows] = React.useState<DrillRow[]>([]);
  const [drillStackDepth, setDrillStackDepth] = React.useState(0);
  const drillStackRef = React.useRef<{ context: DrillContext; rows: DrillRow[] }[]>([]);

  const closeDrill = React.useCallback(() => {
    setDrillOpen(false);
    setDrillContext(null);
    setDrillRows([]);
    drillStackRef.current = [];
    setDrillStackDepth(0);
  }, []);

  const openComplianceDrill = React.useCallback((kind: ComplianceDrillKind) => {
    const rows = buildComplianceDrillRows(reports, kind);
    const ctx: DrillContext = {
      title: COMPLIANCE_DRILL_TITLES[kind],
      subtitle: unitScope.drillSubtitle,
      breadcrumbs: [MODULE_NAME],
    };
    drillStackRef.current = [];
    setDrillStackDepth(0);
    setDrillRows(rows);
    setDrillContext(ctx);
    setDrillOpen(true);
  }, [reports, unitScope.drillSubtitle]);

  const drillBack = React.useCallback(() => {
    const prev = drillStackRef.current.pop();
    setDrillStackDepth(drillStackRef.current.length);
    if (!prev) {
      closeDrill();
      return;
    }
    setDrillContext(prev.context);
    setDrillRows(prev.rows);
  }, [closeDrill]);

  const handleDrillStatClick = React.useCallback((stat: DrillStatChip) => {
    if (stat.row) return;
    let filtered = drillRows;
    if (stat.filter?.status) {
      filtered = filtered.filter(r =>
        (r.status || "").toLowerCase() === stat.filter!.status!.toLowerCase(),
      );
    }
    if (stat.filter?.zone_id) {
      filtered = filtered.filter(r => String(r.zone_id) === stat.filter!.zone_id);
    }
    if (stat.filter?.state_id) {
      filtered = filtered.filter(r => String(r.state_id) === stat.filter!.state_id);
    }
    if (!stat.filter || filtered.length === drillRows.length) return;
    if (drillContext) {
      drillStackRef.current = [...drillStackRef.current, { context: drillContext, rows: drillRows }];
      setDrillStackDepth(drillStackRef.current.length);
    }
    setDrillRows(filtered);
    setDrillContext({
      title: `${drillContext?.title ?? COMPLIANCE_DRILL_TITLES.total} — ${stat.label}`,
      subtitle: drillContext?.subtitle,
      breadcrumbs: [...(drillContext?.breadcrumbs ?? [MODULE_NAME]), stat.label],
    });
  }, [drillRows, drillContext]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map(r => r.reporting_year)),
    [reports],
  );

  const hasFilters = filterYear !== "all" || filterStatus !== "all" || stateFilterActive
    || (filterZone !== "all" && !zoneLocked);

  const clearFilters = () => {
    setFilterYear(String(new Date().getFullYear()));
    setFilterStatus("all");
    if (!zoneLocked) setFilterZone("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  const resetForm = () => {
    setSelectedId(null); setRefId(null); setViewReport(null);
    setReportStatus("draft");
    setFormStep("header");
    setZoneId(defaultZoneId ?? ""); setStateId(defaultStateId ?? "");
    setZoneLabel(""); setStateLabel("");
    setReportYear(String(new Date().getFullYear()));
    setReportWeek(String(currentISOWeek()));
    setOfficerName(authUser?.name ?? ""); setOfficerStaffId(authUser?.staff_id ?? "");
    setSubmitDate(new Date().toISOString().slice(0, 10));
    setReviewedBy(""); setStatusConfirmed("pending"); setFollowUp(false);
    setCertification(""); setCertificationFile(null); setExistingCertName(null); setRemoveCertification(false); setStateRemarks("");
    setFacilityProviderId(""); setFacilityName(""); setFacilityCode(""); setFacilityType("");
    setOwnership(""); setFacilityAddress("");
    setComplaintsReceived(""); setComplaintCategories([]);
    setResolvedAtFacility(""); setEscalatedTo("none"); setComplaintSummary("");
    setFindings([]); setViolations([]); setEnforcements([]);
  };

  const applyReport = (v: any) => {
    setSelectedId(v.id); setRefId(v.reference_id);
    setReportStatus(v.status ?? "draft");
    setZoneId(String(v.zone_id)); setStateId(String(v.state_id));
    setZoneLabel(v.zone?.description ?? "");
    setStateLabel(v.state?.description ?? "");
    if (v.zone_id) {
      stockApi.getStates(String(v.zone_id)).then(r =>
        setStateOpts(r.data.map((s: any) => ({ id: s.id, label: s.description }))),
      ).catch(() => {});
    }
    setReportYear(String(v.reporting_year)); setReportWeek(String(v.reporting_week));
    setOfficerName(v.officer_name ?? ""); setOfficerStaffId(v.officer_staff_id ?? "");
    setSubmitDate(v.date_submitted?.slice(0, 10) ?? "");
    setReviewedBy(v.reviewed_by ?? ""); setStatusConfirmed(v.compliance_status_confirmed ?? "pending");
    setFollowUp(!!v.follow_up_required); setCertification(v.certification ?? "");
    setCertificationFile(null);
    setExistingCertName(v.certification_original_name || (v.certification_file_path ? "Certification" : null));
    setRemoveCertification(false);
    setStateRemarks(v.state_office_remarks ?? "");
    setFacilityName(v.facility_name ?? ""); setFacilityCode(v.facility_code ?? "");
    setFacilityProviderId("");
    setFacilityType(v.facility_type ?? ""); setOwnership(v.ownership ?? "");
    setFacilityAddress(v.facility_address ?? "");
    setComplaintsReceived(String(v.complaints_received ?? ""));
    setComplaintCategories(parseComplaintCategories(v.complaint_categories));
    setResolvedAtFacility(String(v.resolved_at_facility ?? ""));
    setEscalatedTo(v.escalated_to ?? "none"); setComplaintSummary(v.complaint_summary ?? "");
    setFindings((v.findings ?? []).map((f: any) => ({ _key: uid(), ...f })));
    setViolations((v.violations ?? []).map((x: any) => ({ _key: uid(), ...x, occurrences: String(x.occurrences ?? "") })));
    setEnforcements((v.enforcement_actions ?? []).map((e: any) => ({ _key: uid(), ...e })));
    const completion = getComplianceStepCompletion({
      refId: v.reference_id,
      registered: true,
      findingsCount: (v.findings ?? []).length,
      complaintsReceived: v.complaints_received,
      complaintSummary: v.complaint_summary,
      complaintCategoriesCount: parseComplaintCategories(v.complaint_categories).length,
      resolvedAtFacility: v.resolved_at_facility,
      escalatedTo: v.escalated_to,
      violationsCount: (v.violations ?? []).length,
      enforcementsCount: (v.enforcement_actions ?? []).length,
      reviewedBy: v.reviewed_by,
      stateRemarks: v.state_office_remarks,
    });
    setFormStep(firstOpenComplianceStep(completion));
  };

  React.useEffect(() => {
    if (authUser?.name) setOfficerName(authUser.name);
    if (authUser?.staff_id) setOfficerStaffId(authUser.staff_id);
  }, [authUser]);

  const buildPayload = (status: "draft" | "submitted") => {
    const submitD = submitDate ? new Date(submitDate) : new Date();
    const derivedYear = submitD.getFullYear();
    const derivedWeek = currentISOWeek(submitD);
    return {
      zone_id: Number(zoneId), state_id: Number(stateId),
      reporting_year: derivedYear, reporting_week: derivedWeek,
      officer_name: officerName || null,
      officer_staff_id: officerStaffId || null,
      date_submitted: submitDate || null, reviewed_by: reviewedBy || null,
      compliance_status_confirmed: statusConfirmed,
      follow_up_required: followUp, certification: certification || null,
      remove_certification: removeCertification ? "true" : undefined,
      facility_name: facilityName, facility_code: facilityCode,
      facility_type: facilityType, ownership, facility_address: facilityAddress,
      complaints_received: Number(complaintsReceived) || 0,
      complaint_categories: complaintCategories,
      resolved_at_facility: Number(resolvedAtFacility) || 0,
      escalated_to: escalatedTo, complaint_summary: complaintSummary || null,
      state_office_remarks: stateRemarks || null,
      submitted_by: authUser?.name ?? officerName,
      status,
      findings: findings.map(({ _key, ...f }) => f),
      violations: violations.map(({ _key, ...v }) => ({ ...v, occurrences: Number(v.occurrences) || 0 })),
      enforcement_actions: enforcements.map(({ _key, ...e }) => e),
    };
  };

  const clearFacility = () => {
    setFacilityProviderId("");
    setFacilityName("");
    setFacilityCode("");
    setFacilityType("");
    setFacilityAddress("");
  };

  const handleZoneChange = (v: string) => {
    setZoneId(v);
    if (!defaultStateId) setStateId("");
    clearFacility();
  };

  const handleStateChange = (v: string) => {
    setStateId(v);
    clearFacility();
  };

  const handleFacilitySelect = (p: {
    id: string; name: string; code: string;
    address?: string | null; facility_type?: string | null;
  } | null) => {
    if (!p) {
      clearFacility();
      return;
    }
    setFacilityProviderId(p.id);
    setFacilityName(p.name);
    setFacilityCode(p.code);
    if (p.address) setFacilityAddress(p.address);
    const mappedType = mapProviderFacilityType(p.facility_type);
    if (mappedType) setFacilityType(mappedType);
  };

  const validateStep = (step: FormStep): string | null => {
    if (step === "header") {
      if (!zoneId) return "Select zone";
      if (!stateId) return "Select state";
      if (!submitDate) return "Date submitted is required";
      if (!officerName.trim()) return "Compliance officer is required";
      if (!officerStaffId.trim()) return "Staff ID is required";
      if (!facilityProviderId && !facilityName.trim()) return "Select or enter a facility";
      if (!facilityCode.trim()) return "Facility code is required";
      if (!facilityType) return "Select facility type";
      if (!facilityAddress.trim()) return "Facility address is required";
      if (!ownership) return "Select ownership";
    }
    if (step === "findings" && findings.length === 0) {
      return "Add at least one compliance finding";
    }
    if (step === "complaints") {
      const complaintsDone = getComplianceStepCompletion({
        registered: true,
        findingsCount: findings.length,
        complaintsReceived,
        complaintSummary,
        complaintCategoriesCount: complaintCategories.length,
        resolvedAtFacility,
        escalatedTo,
      }).complaints;
      if (!complaintsDone) {
        return "Complete the complaint summary (record complaints received, categories, or a summary note)";
      }
    }
    if (step === "enforcement") {
      const enforcementDone = getComplianceStepCompletion({
        enforcementsCount: enforcements.length,
        reviewedBy,
        stateRemarks,
      }).enforcement;
      if (!enforcementDone) {
        return "Complete the enforcement review (add an action, reviewer, or state office remarks)";
      }
    }
    return null;
  };

  const validate = () => {
    for (const step of FORM_STEPS) {
      const err = validateStep(step.id);
      if (err) return err;
    }
    return null;
  };

  const lockZone = !!defaultZoneId;
  const lockState = !!defaultStateId;

  const saveDraft = async (opts?: { advanceTo?: FormStep; toastMsg?: string }) => {
    setSaving(true);
    try {
      const payload = buildPayload("draft");
      const res = selectedId
        ? await complianceApi.update(selectedId, payload, certificationFile)
        : await complianceApi.create(payload, certificationFile);
      const report = res.data;
      if (!report?.id) throw new Error("Save failed — no report returned");
      setSelectedId(report.id);
      setRefId(report.reference_id ?? null);
      setReportStatus(report.status ?? "draft");
      setCertificationFile(null);
      setExistingCertName(report.certification_original_name || (report.certification_file_path ? "Certification" : null));
      setRemoveCertification(false);
      setComplaintCategories(parseComplaintCategories(report.complaint_categories));
      toast.success(opts?.toastMsg ?? "Draft saved", {
        description: report.reference_id ?? undefined,
      });
      if (opts?.advanceTo) setFormStep(opts.advanceTo);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAndContinue = async () => {
    const err = validateStep("header");
    if (err) { toast.error(err); return; }
    await saveDraft({ advanceTo: "findings", toastMsg: "Report registered — proceed to findings" });
  };

  const saveStage = async () => {
    if (formStep === "findings") {
      const err = validateStep("findings");
      if (err) { toast.error(err); return; }
    }
    const next = nextComplianceStep(formStep);
    await saveDraft({
      advanceTo: next ?? undefined,
      toastMsg: next
        ? `${complianceStepLabel(formStep)} saved — continue to ${complianceStepLabel(next)}`
        : `${complianceStepLabel(formStep)} saved`,
    });
  };

  const submitReport = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload = buildPayload("submitted");
      const res = selectedId
        ? await complianceApi.update(selectedId, payload, certificationFile)
        : await complianceApi.create(payload, certificationFile);
      toast.success("Report submitted", { description: res.data.reference_id });
      setMode("list");
      resetForm();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const openView = async (id: number) => {
    try {
      const res = await complianceApi.get(id);
      setViewReport({
        ...res.data,
        complaint_categories: parseComplaintCategories(res.data.complaint_categories),
      });
      setMode("view");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDrillRowClick = React.useCallback((row: DrillRow) => {
    const reportId = parseReportIdFromDrillRow(row);
    if (reportId) {
      closeDrill();
      void openView(reportId);
    }
  }, [closeDrill]);

  const toggleCategory = (cat: string) => {
    setComplaintCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  };

  const sectionIndicators = findingDraft.section
    ? COMPLIANCE_SECTIONS[findingDraft.section] ?? []
    : [];

  const zoneDisplay = labelOf(
    zones.map(z => ({ value: String(z.id), label: z.label })),
    zoneId,
    zoneLabel || "—",
  );
  const stateDisplay = labelOf(
    stateOpts.map(s => ({ value: String(s.id), label: s.label })),
    stateId,
    stateLabel || "—",
  );
  const escalationLabel = (v: string) =>
    ESCALATION_OPTIONS.find(o => o.value === v)?.label ?? v;
  const confirmationLabel = (v: string) =>
    CONFIRMATION_OPTIONS.find(o => o.value === v)?.label ?? v;

  if (mode === "view" && viewReport) {
    const v = viewReport;
    const st = STATUS_CFG[v.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
    const findingsList = v.findings ?? [];
    const violationsList = v.violations ?? [];
    const enforcementsList = v.enforcement_actions ?? [];
    const categories = parseComplaintCategories(v.complaint_categories);

    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => { setMode("list"); setViewReport(null); }} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] border gap-1 ${st.cls}`}>{st.icon}{st.label}</Badge>
            {v.status !== "approved" && (
              <Button variant="outline" size="sm" onClick={() => { applyReport(v); setViewReport(null); setMode("form"); }} className="gap-2">
                <Pencil className="w-4 h-4" /> {v.status === "draft" ? "Edit Draft" : "Edit"}
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader>
              <CardTitle className="text-base">Report Header</CardTitle>
              <CardDescription>Q{v.reporting_quarter ?? quarterFromWeek(Number(v.reporting_week))} · {v.reporting_year}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <InfoField label="Report ID" value={v.reference_id ?? "—"} />
              <InfoField label="Zone" value={v.zone?.description ?? "—"} />
              <InfoField label="State" value={v.state?.description ?? "—"} />
              <InfoField label="Reporting Week" value={v.reporting_week ? `W${String(v.reporting_week).padStart(2, "0")}` : "—"} />
              <InfoField label="Reporting Quarter" value={`Q${v.reporting_quarter ?? quarterFromWeek(Number(v.reporting_week))}`} />
              <InfoField label="Reporting Year" value={String(v.reporting_year ?? "—")} />
              <InfoField label="Compliance Officer" value={v.officer_name ?? "—"} />
              <InfoField label="Staff ID" value={v.officer_staff_id ?? "—"} />
              <InfoField label="Date Submitted" value={v.date_submitted?.slice(0, 10) ?? "—"} />
              <InfoField label="Status Confirmed" value={confirmationLabel(v.compliance_status_confirmed ?? "pending")} />
              <InfoField label="Follow-up Required" value={v.follow_up_required ? "Yes" : "No"} />
              <div className="md:col-span-2">
                <InfoField label="Certification" value={v.certification ?? "—"} />
              </div>
              {v.certification_file_path && (
                <div className="md:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Certification file</p>
                  <a className="text-sm font-semibold text-primary hover:underline" href={apiFileUrl(v.certification_file_path)} target="_blank" rel="noreferrer">
                    {v.certification_original_name || "Open certification"}
                  </a>
                </div>
              )}
              {v.reviewed_by && <InfoField label="Reviewed By" value={v.reviewed_by} />}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader><CardTitle className="text-base">1. Facility Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <InfoField label="Facility Name" value={v.facility_name ?? "—"} />
              <InfoField label="Facility Code" value={v.facility_code ?? "—"} />
              <InfoField label="Facility Type" value={v.facility_type ?? "—"} />
              <InfoField label="Ownership" value={v.ownership ?? "—"} />
              <div className="md:col-span-2">
                <InfoField label="Facility Address" value={v.facility_address ?? "—"} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader>
              <CardTitle className="text-base">2. Compliance Findings</CardTitle>
              {(() => {
                const fc = v.finding_counts ?? countFindingStatuses(findingsList);
                const labels = [
                  fc.fully_compliant > 0 && { text: "Fully Compliant", cls: "text-emerald-700" },
                  fc.partially_compliant > 0 && { text: "Partially Compliant", cls: "text-amber-700" },
                  fc.non_compliant > 0 && { text: "Non-Compliant", cls: "text-red-700" },
                ].filter(Boolean) as { text: string; cls: string }[];
                if (!labels.length) return null;
                return (
                  <CardDescription className="flex flex-wrap gap-3 pt-1">
                    {labels.map(item => (
                      <span key={item.text} className={`${item.cls} font-medium`}>{item.text}</span>
                    ))}
                  </CardDescription>
                );
              })()}
            </CardHeader>
            <CardContent>
              {findingsList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No findings recorded.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Section</TableHead><TableHead>Indicator</TableHead>
                    <TableHead>Status</TableHead><TableHead>Remarks</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {findingsList.map((f: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{f.section}</TableCell>
                        <TableCell className="text-xs max-w-[200px]">{f.indicator}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{ratingLabel(f.status)}</Badge></TableCell>
                        <TableCell className="text-xs">{f.remarks || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader><CardTitle className="text-base">3. Complaint Summary</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <InfoField label="Complaints Received" value={String(v.complaints_received ?? 0)} />
              <InfoField label="Resolved at Facility" value={String(v.resolved_at_facility ?? 0)} />
              <InfoField label="Escalated to" value={escalationLabel(v.escalated_to ?? "none")} />
              <div className="md:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Complaint Categories</p>
                {categories.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <Badge key={cat} variant="outline" className="text-[10px] font-medium">{cat}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-800">—</p>
                )}
              </div>
              <div className="md:col-span-3">
                <InfoField label="Summary" value={v.complaint_summary ?? "—"} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader><CardTitle className="text-base">4. Violations Observed</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {violationsList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No violations recorded.</p>
              ) : violationsList.map((x: any, i: number) => (
                <div key={i} className="text-sm border rounded-xl p-3">
                  <p className="font-medium">{x.nature_of_violation}</p>
                  <p className="text-xs text-muted-foreground">{x.nhia_act_section || "—"} · {x.occurrences || 0} occurrence(s)</p>
                  <p className="text-xs mt-1">{x.action_taken || "—"}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader><CardTitle className="text-base">5. Enforcement Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {enforcementsList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No enforcement actions recorded.</p>
              ) : enforcementsList.map((e: any, i: number) => (
                <div key={i} className="text-sm border rounded-xl p-3">
                  <p className="font-medium">{e.enforcement_action}</p>
                  <p className="text-xs text-muted-foreground">{e.details || "—"}</p>
                </div>
              ))}
              {v.state_office_remarks && (
                <div className="pt-2">
                  <InfoField label="State Office Remarks" value={v.state_office_remarks} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode === "form") {
    const st = STATUS_CFG[reportStatus as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
    return (
      <ComplianceReportForm
        refId={refId}
        reportRegistered={!!selectedId}
        reportStatus={reportStatus}
        reportWeek={String(submitDate ? currentISOWeek(new Date(submitDate)) : reportWeek)}
        formStep={formStep}
        setFormStep={setFormStep}
        saving={saving}
        lockZone={lockZone}
        lockState={lockState}
        zones={zones}
        stateOpts={stateOpts}
        zoneId={zoneId}
        stateId={stateId}
        zoneDisplay={zoneDisplay}
        stateDisplay={stateDisplay}
        onZoneChange={handleZoneChange}
        onStateChange={handleStateChange}
        reportYear={reportYear}
        setReportYear={setReportYear}
        reportQuarter={String(quarterFromWeek(Number(submitDate ? currentISOWeek(new Date(submitDate)) : reportWeek)))}
        officerName={officerName}
        setOfficerName={setOfficerName}
        officerStaffId={officerStaffId}
        setOfficerStaffId={setOfficerStaffId}
        submitDate={submitDate}
        setSubmitDate={setSubmitDate}
        statusConfirmed={statusConfirmed}
        setStatusConfirmed={setStatusConfirmed}
        followUp={followUp}
        setFollowUp={setFollowUp}
        certification={certification}
        setCertification={setCertification}
        certificationFile={certificationFile}
        setCertificationFile={(f) => { setCertificationFile(f); if (f) setRemoveCertification(false); }}
        existingCertName={existingCertName}
        onRemoveCert={() => { setCertificationFile(null); setExistingCertName(null); setRemoveCertification(true); }}
        facilityProviderId={facilityProviderId}
        onFacilitySelect={handleFacilitySelect}
        facilityName={facilityName}
        setFacilityName={setFacilityName}
        facilityCode={facilityCode}
        setFacilityCode={setFacilityCode}
        facilityType={facilityType}
        setFacilityType={setFacilityType}
        ownership={ownership}
        setOwnership={setOwnership}
        facilityAddress={facilityAddress}
        setFacilityAddress={setFacilityAddress}
        findings={findings}
        setFindings={setFindings}
        findingDraft={findingDraft}
        setFindingDraft={setFindingDraft}
        sectionIndicators={sectionIndicators}
        complaintsReceived={complaintsReceived}
        setComplaintsReceived={setComplaintsReceived}
        resolvedAtFacility={resolvedAtFacility}
        setResolvedAtFacility={setResolvedAtFacility}
        complaintCategories={complaintCategories}
        toggleCategory={toggleCategory}
        escalatedTo={escalatedTo}
        setEscalatedTo={setEscalatedTo}
        complaintSummary={complaintSummary}
        setComplaintSummary={setComplaintSummary}
        violations={violations}
        setViolations={setViolations}
        violationDraft={violationDraft}
        setViolationDraft={setViolationDraft}
        enforcements={enforcements}
        setEnforcements={setEnforcements}
        enforcementDraft={enforcementDraft}
        setEnforcementDraft={setEnforcementDraft}
        stateRemarks={stateRemarks}
        setStateRemarks={setStateRemarks}
        reviewedBy={reviewedBy}
        setReviewedBy={setReviewedBy}
        onCancel={() => { setMode("list"); resetForm(); }}
        onSaveAndContinue={saveAndContinue}
        onSaveStage={saveStage}
        onSubmit={submitReport}
        statusBadge={
          <Badge className={`text-[10px] border gap-1 ${st.cls}`}>{st.icon}{st.label}</Badge>
        }
        uid={uid}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2 shadow-lg shadow-emerald-500/20"
            onClick={() => { resetForm(); setMode("form"); }}
          >
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState(ALL_STATES); }}>
                  <SelectTrigger className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones.map(z => ({ id: z.id, description: z.label })), filterZone, "Zone")}>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full" displayValue={
                    stateLocked
                      ? pickGeoLabel(dashboardStates, filterState, "State")
                      : (filterState === ALL_STATES ? "All States" : pickGeoLabel(dashboardStates, filterState, "State"))
                  }>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value={ALL_STATES}>All States</SelectItem>}
                    {dashboardStates.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full" displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CFG[filterStatus as keyof typeof STATUS_CFG]?.label}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.keys(STATUS_CFG).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CFG[s as keyof typeof STATUS_CFG].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
                <ClickableKpi
                  label="Total Reports"
                  value={kpiStats.total}
                  icon={<FileText className="w-5 h-5 text-slate-600" />}
                  onClick={() => openComplianceDrill("total")}
                />
                <ClickableKpi
                  label="Fully Compliant"
                  value={kpiStats.fully}
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  onClick={() => openComplianceDrill("fully")}
                />
                <ClickableKpi
                  label="Partially Compliant"
                  value={kpiStats.partially}
                  icon={<MinusCircle className="w-5 h-5 text-amber-600" />}
                  onClick={() => openComplianceDrill("partially")}
                />
                <ClickableKpi
                  label="Non-Compliant"
                  value={kpiStats.non}
                  icon={<XCircle className="w-5 h-5 text-red-600" />}
                  onClick={() => openComplianceDrill("non")}
                />
                <ClickableKpi
                  label="Violations"
                  value={kpiStats.violations}
                  icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                  onClick={() => openComplianceDrill("violations")}
                  detail="Reports with violations"
                />
                <ClickableKpi
                  label="Enforcement"
                  value={kpiStats.enforcement}
                  icon={<ShieldAlert className="w-5 h-5 text-violet-600" />}
                  onClick={() => openComplianceDrill("enforcement")}
                  detail="Reports with enforcement"
                />
              </div>

              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold">
                    {`${reports.length} report${reports.length !== 1 ? "s" : ""}`}
                  </CardTitle>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" className="text-slate-500 gap-1" onClick={clearFilters}>
                      <XCircle className="w-3.5 h-3.5" /> Clear filters
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <FileText className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">{hasFilters ? "No reports match your filters" : "No compliance reports yet"}</p>
                      {!hasFilters && (
                        <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => { resetForm(); setMode("form"); }}>
                          <Plus className="w-4 h-4" /> New Report
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Facility</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Period</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Officer</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((r, i) => {
                            const st = STATUS_CFG[r.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
                            return (
                              <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                  {r.date_submitted?.slice(0, 10) ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.facility_name || "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                  Q{r.reporting_quarter ?? quarterFromWeek(Number(r.reporting_week))} · {r.reporting_year}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.officer_name || "—"}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${st.cls}`}>
                                    {st.icon} {st.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                                    onClick={() => openView(r.id)}>
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>

      <DashboardDrillPanel
        open={drillOpen}
        context={drillContext}
        rows={drillRows}
        onClose={closeDrill}
        onBack={drillStackDepth > 0 ? drillBack : undefined}
        onRowClick={handleDrillRowClick}
        onStatClick={handleDrillStatClick}
      />
    </div>
  );
}
