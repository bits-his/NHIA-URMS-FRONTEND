import * as React from "react";
import {
  ArrowLeft, Plus, Loader2, Save, Send, CheckCircle2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import AccreditedProviderSelect from "../stateOffice/AccreditedProviderSelect";
import {
  OWNERSHIP_OPTIONS, FACILITY_TYPE_OPTIONS, COMPLAINT_CATEGORIES,
  ESCALATION_OPTIONS, ENFORCEMENT_ACTIONS, COMPLIANCE_SECTIONS,
  COMPLIANCE_RATINGS, CONFIRMATION_OPTIONS,
  quarterFromWeek, ratingLabel,
  COMPLIANCE_LIFECYCLE, getComplianceStepCompletion, complianceStepLabel,
  type ComplianceFormStep,
} from "./complianceConstants";

export type FormStep = ComplianceFormStep;
export const FORM_STEPS = COMPLIANCE_LIFECYCLE;

const inputCls = "h-10 rounded-xl border-[#d4e8dc] bg-[#f4f7f5] text-sm w-full";
const readOnlyCls = `${inputCls} bg-slate-50 text-slate-700`;

function ReqLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs">{children} <span className="text-red-500">*</span></Label>;
}

function ToggleChip({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-xs leading-snug transition-colors ${
        selected
          ? "border-[#145c3f] bg-[#e8f5ee] text-[#0f3d2e] font-medium"
          : "border-[#d4e8dc] bg-white text-slate-600 hover:border-[#25a872]/hover:bg-[#f8fbf9]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
          multi ? "rounded-md" : "rounded-full"
        } ${selected ? "border-[#145c3f] bg-[#145c3f] text-white" : "border-slate-300 bg-white"}`}
      >
        {selected ? <CheckCircle2 className="h-3 w-3" /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

function CardActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e8f0eb] px-6 py-4">
      {children}
    </div>
  );
}

export type Finding = { _key: string; section: string; indicator: string; status: string; remarks: string };
export type Violation = { _key: string; nature_of_violation: string; nhia_act_section: string; occurrences: string; action_taken: string };
export type Enforcement = { _key: string; enforcement_action: string; details: string };

export type FindingDraft = {
  section: string;
  indicators: string[];
  status: string;
  remarks: string;
};

function ReadOnlyText({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}

export interface ComplianceReportFormProps {
  refId: string | null;
  reportRegistered: boolean;
  reportStatus: string;
  reportWeek: string;
  formStep: FormStep;
  setFormStep: (s: FormStep) => void;
  saving: boolean;
  lockZone: boolean;
  lockState: boolean;
  zones: { id: number; label: string }[];
  stateOpts: { id: number; label: string }[];
  zoneId: string;
  stateId: string;
  zoneDisplay: string;
  stateDisplay: string;
  onZoneChange: (v: string) => void;
  onStateChange: (v: string) => void;
  reportYear: string;
  setReportYear: (v: string) => void;
  officerName: string;
  setOfficerName: (v: string) => void;
  officerStaffId: string;
  setOfficerStaffId: (v: string) => void;
  submitDate: string;
  setSubmitDate: (v: string) => void;
  reportQuarter: string;
  certificationFile: File | null;
  setCertificationFile: (f: File | null) => void;
  existingCertName: string | null;
  onRemoveCert: () => void;
  statusConfirmed: string;
  setStatusConfirmed: (v: string) => void;
  followUp: boolean;
  setFollowUp: (v: boolean) => void;
  certification: string;
  setCertification: (v: string) => void;
  facilityProviderId: string;
  onFacilitySelect: (p: { id: string; name: string; code: string; address?: string | null; facility_type?: string | null } | null) => void;
  facilityName: string;
  setFacilityName: (v: string) => void;
  facilityCode: string;
  setFacilityCode: (v: string) => void;
  facilityType: string;
  setFacilityType: (v: string) => void;
  ownership: string;
  setOwnership: (v: string) => void;
  facilityAddress: string;
  setFacilityAddress: (v: string) => void;
  findings: Finding[];
  setFindings: React.Dispatch<React.SetStateAction<Finding[]>>;
  findingDraft: FindingDraft;
  setFindingDraft: React.Dispatch<React.SetStateAction<FindingDraft>>;
  sectionIndicators: string[];
  complaintsReceived: string;
  setComplaintsReceived: (v: string) => void;
  resolvedAtFacility: string;
  setResolvedAtFacility: (v: string) => void;
  complaintCategories: string[];
  toggleCategory: (cat: string) => void;
  escalatedTo: string;
  setEscalatedTo: (v: string) => void;
  complaintSummary: string;
  setComplaintSummary: (v: string) => void;
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
  violationDraft: Omit<Violation, "_key">;
  setViolationDraft: React.Dispatch<React.SetStateAction<Omit<Violation, "_key">>>;
  enforcements: Enforcement[];
  setEnforcements: React.Dispatch<React.SetStateAction<Enforcement[]>>;
  enforcementDraft: { enforcement_action: string; details: string };
  setEnforcementDraft: React.Dispatch<React.SetStateAction<{ enforcement_action: string; details: string }>>;
  stateRemarks: string;
  setStateRemarks: (v: string) => void;
  reviewedBy: string;
  setReviewedBy: (v: string) => void;
  createOnly?: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onSaveStage: () => void;
  onSubmit: () => void;
  uid: () => string;
  statusBadge?: React.ReactNode;
}

export default function ComplianceReportForm(props: ComplianceReportFormProps) {
  const {
    refId, reportRegistered, reportStatus, reportWeek, formStep, setFormStep, saving, lockZone, lockState,
    zones, stateOpts, zoneId, stateId, zoneDisplay, stateDisplay,
    onZoneChange, onStateChange, reportYear, setReportYear,
    officerName, setOfficerName, officerStaffId, setOfficerStaffId,
    submitDate, setSubmitDate, reportQuarter, statusConfirmed, setStatusConfirmed,
    followUp, setFollowUp, certification, setCertification,
    certificationFile, setCertificationFile, existingCertName, onRemoveCert,
    facilityProviderId, onFacilitySelect, facilityName, setFacilityName,
    facilityCode, setFacilityCode, facilityType, setFacilityType, ownership, setOwnership,
    facilityAddress, setFacilityAddress,
    findings, setFindings, findingDraft, setFindingDraft, sectionIndicators,
    complaintsReceived, setComplaintsReceived, resolvedAtFacility, setResolvedAtFacility,
    complaintCategories, toggleCategory, escalatedTo, setEscalatedTo,
    complaintSummary, setComplaintSummary,
    violations, setViolations, violationDraft, setViolationDraft,
    enforcements, setEnforcements, enforcementDraft, setEnforcementDraft,
    stateRemarks, setStateRemarks, reviewedBy, setReviewedBy,
    onCancel, onSaveAndContinue, onSaveStage, onSubmit, uid, statusBadge,
  } = props;

  const completion = getComplianceStepCompletion({
    refId,
    registered: reportRegistered,
    findingsCount: findings.length,
    complaintsReceived,
    complaintSummary,
    complaintCategoriesCount: complaintCategories.length,
    resolvedAtFacility,
    escalatedTo,
    violationsCount: violations.length,
    enforcementsCount: enforcements.length,
    reviewedBy,
    stateRemarks,
  });

  const continueBtn = (
    <Button className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2" onClick={onSaveStage} disabled={saving}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Save &amp; Continue
    </Button>
  );

  const submitBtn = (
    <Button className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2" onClick={onSubmit} disabled={saving}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      Submit Report
    </Button>
  );

  const renderLifecycleStepper = () => (
    <div className="rounded-2xl border border-[#d4e8dc] bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {COMPLIANCE_LIFECYCLE.map((stage, idx) => {
          const done = completion[stage.id];
          const isActive = formStep === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setFormStep(stage.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#145c3f] text-white"
                  : done
                    ? "bg-[#e8f5ee] text-[#145c3f]"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {done && !isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="opacity-70">{idx + 1}.</span>}
              {stage.shortLabel}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          {refId && <span className="font-mono font-semibold text-[#145c3f]">{refId}</span>}
          {statusBadge}
        </div>
      </div>
    </div>
  );

  const renderHeaderSection = (readOnly: boolean) => {
    const geoLocked = lockZone && lockState;
    const showGeoFields = readOnly || !geoLocked;
    return (
      <Card className="rounded-2xl border-[#d4e8dc] w-full">
        <CardHeader>
          <CardTitle className="text-base">Report Header</CardTitle>
          {readOnly && (
            <CardDescription>Q{quarterFromWeek(Number(reportWeek))} · {reportYear}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showGeoFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                {readOnly ? <Label className="text-xs">Zone</Label> : <ReqLabel>Zone</ReqLabel>}
                {readOnly ? (
                  <Input className={readOnlyCls} value={zoneDisplay} readOnly />
                ) : (
                  <Select value={zoneId} onValueChange={onZoneChange} disabled={lockZone}>
                    <SelectTrigger className={inputCls} displayValue={zoneDisplay}>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>{zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                {readOnly ? <Label className="text-xs">State</Label> : <ReqLabel>State</ReqLabel>}
                {readOnly ? (
                  <Input className={readOnlyCls} value={stateDisplay} readOnly />
                ) : (
                  <Select value={stateId} onValueChange={onStateChange} disabled={lockState || !zoneId}>
                    <SelectTrigger className={inputCls} displayValue={stateDisplay}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>{stateOpts.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              {readOnly ? <Label className="text-xs">Date Submitted</Label> : <ReqLabel>Date Submitted</ReqLabel>}
              {readOnly ? (
                <Input className={readOnlyCls} value={submitDate} readOnly />
              ) : (
                <Input className={inputCls} type="date" value={submitDate}
                  onChange={e => setSubmitDate(e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reporting Quarter</Label>
              <Input className={readOnlyCls} value={reportQuarter ? `Q${reportQuarter}` : "—"} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reporting Week</Label>
              <Input className={readOnlyCls} value={reportWeek ? `W${String(reportWeek).padStart(2, "0")}` : "—"} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Report ID</Label>
              <Input className={readOnlyCls} value={refId || "Auto-generated on save"} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Compliance Officer</Label>
              <Input className={readOnlyCls} value={officerName} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Staff ID</Label>
              <Input className={readOnlyCls} value={officerStaffId} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFacilitySection = (readOnly: boolean, showActions = false) => (
    <Card className="rounded-2xl border-[#d4e8dc] w-full">
      <CardHeader>
        <CardTitle className="text-base">Facility Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
          {readOnly ? <Label className="text-xs">Facility Name</Label> : <ReqLabel>Facility Name</ReqLabel>}
          {readOnly ? (
            <Input className={readOnlyCls} value={facilityName} readOnly />
          ) : (
            <AccreditedProviderSelect
              key={`hcp-${stateId}`}
              type="hcp"
              stateId={stateId}
              value={facilityProviderId}
              placeholder="Select facility"
              onChange={onFacilitySelect}
              disabled={!stateId}
            />
          )}
        </div>
        <div className="space-y-1.5">
          {readOnly ? <Label className="text-xs">Facility Code</Label> : <ReqLabel>Facility Code</ReqLabel>}
          {readOnly ? (
            <Input className={readOnlyCls} value={facilityCode} readOnly />
          ) : (
            <Input className={inputCls} value={facilityCode} onChange={e => setFacilityCode(e.target.value)} placeholder="e.g. ABCH" />
          )}
        </div>
        <div className="space-y-1.5">
          {readOnly ? <Label className="text-xs">Facility Type</Label> : <ReqLabel>Facility Type</ReqLabel>}
          {readOnly ? (
            <Input className={readOnlyCls} value={facilityType} readOnly />
          ) : (
            <Select value={facilityType} onValueChange={setFacilityType}>
              <SelectTrigger className={inputCls} displayValue={facilityType || undefined}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>{FACILITY_TYPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1.5">
          {readOnly ? <Label className="text-xs">Ownership</Label> : <ReqLabel>Ownership</ReqLabel>}
          {readOnly ? (
            <Input className={readOnlyCls} value={ownership} readOnly />
          ) : (
            <Select value={ownership} onValueChange={setOwnership}>
              <SelectTrigger className={inputCls} displayValue={ownership || undefined}>
                <SelectValue placeholder="Select ownership" />
              </SelectTrigger>
              <SelectContent>{OWNERSHIP_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
          {readOnly ? <Label className="text-xs">Facility Address</Label> : <ReqLabel>Facility Address</ReqLabel>}
          {readOnly ? (
            <Input className={readOnlyCls} value={facilityAddress} readOnly />
          ) : (
            <Input
              className={inputCls}
              value={facilityAddress}
              onChange={e => setFacilityAddress(e.target.value)}
              placeholder="Facility address"
            />
          )}
        </div>
      </CardContent>
      {showActions && (
        <div className="px-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2" onClick={onSaveAndContinue} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save &amp; Continue
          </Button>
        </div>
      )}
    </Card>
  );

  const renderFindingsSection = () => (
    <Card className="rounded-2xl border-[#d4e8dc] w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Compliance Findings</CardTitle>
        <CardDescription>Pick a section, select indicators, choose one status, then add.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Section</Label>
          <Select
            value={findingDraft.section}
            onValueChange={v => setFindingDraft(d => ({ ...d, section: v, indicators: [] }))}
          >
            <SelectTrigger className={inputCls} displayValue={findingDraft.section || undefined}>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(COMPLIANCE_SECTIONS).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Indicators</Label>
          {!findingDraft.section ? (
            <p className="text-xs text-muted-foreground">Select a section first</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sectionIndicators.map(i => (
                <ToggleChip
                  key={i}
                  multi
                  selected={findingDraft.indicators.includes(i)}
                  onClick={() => setFindingDraft(d => ({
                    ...d,
                    indicators: d.indicators.includes(i)
                      ? d.indicators.filter(x => x !== i)
                      : [...d.indicators, i],
                  }))}
                >
                  {i}
                </ToggleChip>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Status</Label>
          <div className="flex flex-wrap gap-2">
            {COMPLIANCE_RATINGS.map(r => (
              <ToggleChip
                key={r.value}
                selected={findingDraft.status === r.value}
                onClick={() => setFindingDraft(d => ({ ...d, status: r.value }))}
              >
                {r.label}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Remarks</Label>
          <Input
            className={inputCls}
            placeholder="Optional remarks"
            value={findingDraft.remarks}
            onChange={e => setFindingDraft(d => ({ ...d, remarks: e.target.value }))}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            if (!findingDraft.section || findingDraft.indicators.length === 0 || !findingDraft.status) return;
            const rows = findingDraft.indicators.map(indicator => ({
              _key: uid(),
              section: findingDraft.section,
              indicator,
              status: findingDraft.status,
              remarks: findingDraft.remarks,
            }));
            setFindings(p => [...p, ...rows]);
            setFindingDraft({ section: findingDraft.section, indicators: [], status: findingDraft.status, remarks: "" });
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Finding
        </Button>

        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No findings recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {findings.map(f => (
              <div key={f._key} className="flex gap-3 items-start rounded-xl border border-[#d4e8dc] bg-[#f8fbf9] px-3 py-2.5">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-[#d4e8dc]">{f.section}</Badge>
                    <Badge className="text-[10px] bg-white text-[#145c3f] border border-[#d4e8dc]">
                      {ratingLabel(f.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-800">{f.indicator}</p>
                  {f.remarks ? <p className="text-xs text-slate-500">{f.remarks}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setFindings(p => p.filter(x => x._key !== f._key))}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardActions>{continueBtn}</CardActions>
    </Card>
  );

  const renderComplaintsSection = () => (
    <Card className="rounded-2xl border-[#d4e8dc] w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Complaint Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Complaints Received</Label>
          <Input className={inputCls} type="number" min={0} value={complaintsReceived}
            onChange={e => setComplaintsReceived(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Resolved at Facility</Label>
          <Input className={inputCls} type="number" min={0} value={resolvedAtFacility}
            onChange={e => setResolvedAtFacility(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Complaint Categories</Label>
          <div className="flex flex-wrap gap-2">
            {COMPLAINT_CATEGORIES.map(cat => (
              <ToggleChip
                key={cat}
                multi
                selected={complaintCategories.includes(cat)}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Escalated to</Label>
          <Select value={escalatedTo} onValueChange={setEscalatedTo}>
            <SelectTrigger className={inputCls} displayValue={ESCALATION_OPTIONS.find(o => o.value === escalatedTo)?.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{ESCALATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Summary of major complaints and actions taken</Label>
          <Input className={inputCls} value={complaintSummary} onChange={e => setComplaintSummary(e.target.value)} />
        </div>
      </CardContent>
      <CardActions>{continueBtn}</CardActions>
    </Card>
  );

  const renderViolationsSection = () => (
    <Card className="rounded-2xl border-[#d4e8dc] w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Violations Observed</CardTitle>
        <CardDescription>Optional — add any violations found during the visit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input className={inputCls} placeholder="Nature of violation" value={violationDraft.nature_of_violation}
            onChange={e => setViolationDraft(d => ({ ...d, nature_of_violation: e.target.value }))} />
          <Input className={inputCls} placeholder="NHIA Act / Guideline section" value={violationDraft.nhia_act_section}
            onChange={e => setViolationDraft(d => ({ ...d, nhia_act_section: e.target.value }))} />
          <Input className={inputCls} type="number" placeholder="Occurrences" value={violationDraft.occurrences}
            onChange={e => setViolationDraft(d => ({ ...d, occurrences: e.target.value }))} />
          <Input className={inputCls} placeholder="Action taken" value={violationDraft.action_taken}
            onChange={e => setViolationDraft(d => ({ ...d, action_taken: e.target.value }))} />
        </div>
        <Button type="button" variant="outline" onClick={() => {
          if (!violationDraft.nature_of_violation.trim()) return;
          setViolations(p => [...p, { _key: uid(), ...violationDraft }]);
          setViolationDraft({ nature_of_violation: "", nhia_act_section: "", occurrences: "", action_taken: "" });
        }}>
          <Plus className="w-4 h-4 mr-1" /> Add Violation
        </Button>
        {violations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No violations recorded.</p>
        ) : violations.map(v => (
          <div key={v._key} className="flex gap-2 items-start text-sm rounded-xl border border-[#d4e8dc] bg-[#f8fbf9] p-3">
            <div className="flex-1">
              <p className="font-medium">{v.nature_of_violation}</p>
              <p className="text-xs text-muted-foreground">{v.nhia_act_section || "—"} · {v.occurrences || 0} occurrence(s)</p>
              <p className="text-xs mt-1">{v.action_taken || "—"}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setViolations(p => p.filter(x => x._key !== v._key))}>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </Button>
          </div>
        ))}
      </CardContent>
      <CardActions>{continueBtn}</CardActions>
    </Card>
  );

  const renderEnforcementSection = () => (
    <Card className="rounded-2xl border-[#d4e8dc] w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Enforcement Actions &amp; Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={enforcementDraft.enforcement_action}
            onValueChange={v => setEnforcementDraft(d => ({ ...d, enforcement_action: v }))}>
            <SelectTrigger className={inputCls} displayValue={enforcementDraft.enforcement_action || undefined}>
              <SelectValue placeholder="Enforcement action" />
            </SelectTrigger>
            <SelectContent>{ENFORCEMENT_ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Input className={inputCls} placeholder="Details" value={enforcementDraft.details}
            onChange={e => setEnforcementDraft(d => ({ ...d, details: e.target.value }))} />
        </div>
        <Button type="button" variant="outline" onClick={() => {
          if (!enforcementDraft.enforcement_action) return;
          setEnforcements(p => [...p, { _key: uid(), ...enforcementDraft }]);
          setEnforcementDraft({ enforcement_action: "", details: "" });
        }}>
          <Plus className="w-4 h-4 mr-1" /> Add Action
        </Button>
        {enforcements.map(e => (
          <div key={e._key} className="flex gap-2 items-start text-sm rounded-xl border border-[#d4e8dc] bg-[#f8fbf9] p-3">
            <div className="flex-1">
              <p className="font-medium">{e.enforcement_action}</p>
              <p className="text-xs text-muted-foreground">{e.details || "—"}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEnforcements(p => p.filter(x => x._key !== e._key))}>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </Button>
          </div>
        ))}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#e8f0eb]">
          <div className="space-y-1.5">
            <Label className="text-xs">State Office Remarks</Label>
            <Input className={inputCls} value={stateRemarks} onChange={e => setStateRemarks(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Report Reviewed By</Label>
            <Input className={inputCls} value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Compliance Status Confirmed</Label>
            <Select value={statusConfirmed} onValueChange={setStatusConfirmed}>
              <SelectTrigger className={inputCls} displayValue={CONFIRMATION_OPTIONS.find(o => o.value === statusConfirmed)?.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{CONFIRMATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Certification</Label>
            <Input className={inputCls} value={certification} onChange={e => setCertification(e.target.value)} placeholder="Optional note" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Attach certification (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className={`${inputCls} h-auto py-2 file:mr-3 file:text-xs`}
                onChange={e => setCertificationFile(e.target.files?.[0] ?? null)}
              />
              {certificationFile && <span className="text-xs text-slate-600 truncate max-w-[200px]">{certificationFile.name}</span>}
              {!certificationFile && existingCertName ? (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-rose-600" onClick={onRemoveCert}>
                  Remove {existingCertName}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="md:col-span-2">
            <ToggleChip selected={followUp} onClick={() => setFollowUp(!followUp)}>
              Follow-up required
            </ToggleChip>
          </div>
        </div>
      </CardContent>
      <CardActions>{submitBtn}</CardActions>
    </Card>
  );

  const renderStageContent = () => {
    if (formStep === "header") {
      return (
        <>
          {renderHeaderSection(true)}
          {renderFacilitySection(true)}
        </>
      );
    }
    if (formStep === "findings") return renderFindingsSection();
    if (formStep === "complaints") return renderComplaintsSection();
    if (formStep === "violations") return renderViolationsSection();
    return renderEnforcementSection();
  };

  /* ── Step 1 only — no lifecycle stepper until registered ── */
  if (!reportRegistered) {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Facility Compliance Report</h2>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4">
            {renderHeaderSection(false)}
            {renderFacilitySection(false, true)}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight truncate">Facility Compliance Report</h2>
        </div>
        {statusBadge}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          {renderLifecycleStepper()}
          {renderStageContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
