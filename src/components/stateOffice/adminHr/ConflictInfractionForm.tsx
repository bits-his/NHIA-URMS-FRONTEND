import * as React from "react";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import StateOfficeFormShell from "../StateOfficeFormShell";
import ReportBasicInfo from "../shared/ReportBasicInfo";
import { Field, TextInput, TextArea, Notice } from "./ui";
import { CONFLICT_NATURES, ADMIN_HR_CONFIG } from "./constants";

const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const choiceClass = "flex items-start gap-2 rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3 py-2.5 cursor-pointer hover:bg-white";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function ConflictInfractionForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [refNo, setRefNo] = React.useState("");
  const [dateOfReport, setDateOfReport] = React.useState(new Date().toISOString().slice(0, 10));
  const [reportingOfficer, setReportingOfficer] = React.useState("");
  const [officeLocation, setOfficeLocation] = React.useState("");
  const [staff1, setStaff1] = React.useState("");
  const [staff2, setStaff2] = React.useState("");
  const [incidentDate, setIncidentDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [natures, setNatures] = React.useState<string[]>([]);
  const [otherSpecify, setOtherSpecify] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [immediateAction, setImmediateAction] = React.useState("");
  const [recommendedResolution, setRecommendedResolution] = React.useState("");
  const [escalatedTo, setEscalatedTo] = React.useState("");
  const [dateEscalated, setDateEscalated] = React.useState("");
  const [expectedResponseDate, setExpectedResponseDate] = React.useState("");
  const [preparedBy, setPreparedBy] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [preparedDate, setPreparedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endorsedBy, setEndorsedBy] = React.useState("");

  const toggleNature = (nature: string, checked: boolean) => {
    setNatures((prev) => (checked ? [...prev, nature] : prev.filter((n) => n !== nature)));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const p = v.payload ?? {};
    setRefNo(String(p.refNo ?? ""));
    setDateOfReport(String(p.dateOfReport ?? new Date().toISOString().slice(0, 10)).slice(0, 10));
    setReportingOfficer(String(p.reportingOfficer ?? ""));
    setOfficeLocation(String(p.officeLocation ?? ""));
    setStaff1(String(p.staff1 ?? ""));
    setStaff2(String(p.staff2 ?? ""));
    setIncidentDate(String(p.incidentDate ?? "").slice(0, 10));
    setLocation(String(p.location ?? ""));
    setNatures(Array.isArray(p.natures) ? (p.natures as string[]) : []);
    setOtherSpecify(String(p.otherSpecify ?? ""));
    setDescription(String(p.description ?? ""));
    setImmediateAction(String(p.immediateAction ?? ""));
    setRecommendedResolution(String(p.recommendedResolution ?? ""));
    setEscalatedTo(String(p.escalatedTo ?? ""));
    setDateEscalated(String(p.dateEscalated ?? "").slice(0, 10));
    setExpectedResponseDate(String(p.expectedResponseDate ?? "").slice(0, 10));
    setPreparedBy(String(p.preparedBy ?? ""));
    setDesignation(String(p.designation ?? ""));
    setPreparedDate(String(p.preparedDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10));
    setEndorsedBy(String(p.endorsedBy ?? ""));
  };

  const title = reportingOfficer || natures[0] || ADMIN_HR_CONFIG["conflict-infraction"].title;

  return (
    <StateOfficeFormShell
      reportType="conflict-infraction"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={ADMIN_HR_CONFIG["conflict-infraction"].formTitle}
      hideBasicInfo
      hideFooterActions
      onLoaded={onLoaded}
      validate={() => {
        if (!dateOfReport) return "Enter date of report";
        if (!reportingOfficer.trim()) return "Enter reporting officer";
        if (!incidentDate) return "Enter incident date";
        if (!description.trim()) return "Enter incident description";
        return null;
      }}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          refNo: refNo || null,
          dateOfReport, reportingOfficer, officeLocation,
          staff1, staff2,
          incidentDate, location, natures, otherSpecify,
          description, immediateAction, recommendedResolution,
          escalatedTo, dateEscalated, expectedResponseDate,
          preparedBy, designation, preparedDate, endorsedBy,
        },
      })}
    >
      {({ header, saving, submitting, persist, requestSubmit }) => (
        <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible">
          <CardContent className="p-4 md:p-5 space-y-5">
            <ReportBasicInfo {...header} lockZone={header.lockZone} lockState={header.lockState} showQuarter embedded />
            <Notice>
              Escalation path: forward to the Zonal Coordinator within 48 hours of filing.
              Where unresolved at zonal level, escalate to the Director, Special Duties Office (SDO).
            </Notice>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Reference No."><TextInput value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generated if blank" /></Field>
              <Field label="Date of report" required><TextInput type="date" value={dateOfReport} onChange={(e) => setDateOfReport(e.target.value)} /></Field>
              <Field label="Reporting officer" required><TextInput value={reportingOfficer} onChange={(e) => setReportingOfficer(e.target.value)} /></Field>
              <Field label="Office location"><TextInput value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} /></Field>
              <Field label="State office staff (1)"><TextInput value={staff1} onChange={(e) => setStaff1(e.target.value)} placeholder="Name / designation" /></Field>
              <Field label="State office staff (2)"><TextInput value={staff2} onChange={(e) => setStaff2(e.target.value)} placeholder="Name / designation" /></Field>
              <Field label="Incident date" required><TextInput type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} /></Field>
              <Field label="Location"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Nature of conflict / infraction">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CONFLICT_NATURES.map((nature) => (
                      <label key={nature} className={choiceClass}>
                        <Checkbox
                          checked={natures.includes(nature)}
                          onCheckedChange={(c) => toggleNature(nature, c === true)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-snug">{nature}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              {natures.includes("Other") && (
                <Field label="Other (specify)"><TextInput value={otherSpecify} onChange={(e) => setOtherSpecify(e.target.value)} /></Field>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Description" required><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Immediate action taken"><TextArea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} /></Field>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Recommended resolution"><TextArea value={recommendedResolution} onChange={(e) => setRecommendedResolution(e.target.value)} /></Field>
              </div>
              <Field label="Escalated to"><TextInput value={escalatedTo} onChange={(e) => setEscalatedTo(e.target.value)} placeholder="Zonal coordinator name" /></Field>
              <Field label="Date escalated"><TextInput type="date" value={dateEscalated} onChange={(e) => setDateEscalated(e.target.value)} /></Field>
              <Field label="Expected response date"><TextInput type="date" value={expectedResponseDate} onChange={(e) => setExpectedResponseDate(e.target.value)} /></Field>
              <Field label="Prepared by"><TextInput value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></Field>
              <Field label="Designation"><TextInput value={designation} onChange={(e) => setDesignation(e.target.value)} /></Field>
              <Field label="Prepared date"><TextInput type="date" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} /></Field>
              <Field label="Endorsed by"><TextInput value={endorsedBy} onChange={(e) => setEndorsedBy(e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
              <Button type="button" variant="ghost" onClick={onCancel || onBack} disabled={saving || submitting}>
                <ArrowLeft className="w-4 h-4 mr-2" />Cancel
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" disabled={saving || submitting} onClick={() => void persist("draft")}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </Button>
                <Button type="button" className={ACTION} disabled={saving || submitting} onClick={() => requestSubmit(() => persist("submitted"))}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
