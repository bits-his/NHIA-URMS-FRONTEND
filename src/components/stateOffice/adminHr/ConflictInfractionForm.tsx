import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Section, Field, TextInput, TextArea, FormPageTitle, Notice } from "./ui";
import { CONFLICT_NATURES, ADMIN_HR_CONFIG } from "./constants";

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
      {() => (
        <div className="space-y-4">
          <FormPageTitle title="CONFLICT / INFRACTION REPORT" />
          <Notice>
            Escalation Path: Forward to the Zonal Coordinator within 48 hours of filing.
            Where unresolved at Zonal level, escalate to the Director, Special Duties Office (SDO).
          </Notice>
          <Section title="1. REPORT IDENTIFICATION">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Reference No. (optional)"><TextInput value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generated if blank" /></Field>
              <Field label="Date of Report" required><TextInput type="date" value={dateOfReport} onChange={(e) => setDateOfReport(e.target.value)} /></Field>
              <Field label="Reporting Officer" required><TextInput value={reportingOfficer} onChange={(e) => setReportingOfficer(e.target.value)} /></Field>
              <Field label="Office Location"><TextInput value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="2. PARTIES INVOLVED">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="State Office Staff (1) — Name / Designation"><TextInput value={staff1} onChange={(e) => setStaff1(e.target.value)} /></Field>
              <Field label="State Office Staff (2) — Name / Designation"><TextInput value={staff2} onChange={(e) => setStaff2(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="3. INCIDENT DETAILS">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Incident Date" required><TextInput type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} /></Field>
              <Field label="Location"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
            </div>
            <Field label="Nature of Conflict / Infraction">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {CONFLICT_NATURES.map((nature) => (
                  <label key={nature} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
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
            {natures.includes("Other") && (
              <Field label="Other (specify)"><TextInput value={otherSpecify} onChange={(e) => setOtherSpecify(e.target.value)} /></Field>
            )}
            <Field label="Description" required><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Immediate Action Taken"><TextArea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} /></Field>
            <Field label="Recommended Resolution"><TextArea value={recommendedResolution} onChange={(e) => setRecommendedResolution(e.target.value)} /></Field>
          </Section>

          <Section title="4. ESCALATION">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Escalated To (Zonal Coordinator — Name)"><TextInput value={escalatedTo} onChange={(e) => setEscalatedTo(e.target.value)} /></Field>
              <Field label="Date Escalated"><TextInput type="date" value={dateEscalated} onChange={(e) => setDateEscalated(e.target.value)} /></Field>
              <Field label="Expected Response Date"><TextInput type="date" value={expectedResponseDate} onChange={(e) => setExpectedResponseDate(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="5. CERTIFICATION & SIGNATURES">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Prepared By"><TextInput value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></Field>
              <Field label="Designation"><TextInput value={designation} onChange={(e) => setDesignation(e.target.value)} /></Field>
              <Field label="Prepared Date"><TextInput type="date" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} /></Field>
              <Field label="Endorsed By"><TextInput value={endorsedBy} onChange={(e) => setEndorsedBy(e.target.value)} /></Field>
            </div>
          </Section>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
