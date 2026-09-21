import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, Field, TextInput, TextArea, SelectField, AddRowButton, RemoveRowButton, FormPageTitle,
} from "./ui";
import {
  VENUE_MODES, PRIORITIES, YES_NO, YES_NO_NA, ADMIN_HR_CONFIG,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);
const ETMC_SESSIONS = ["Q1", "Q2", "Q3", "Q4"] as const;

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type Row = { _key: string; [k: string]: string };

const emptyHighlight = (): Row => ({ _key: uid(), agendaItem: "", highlight: "", discussionSummary: "", implication: "", priority: "" });
const emptyDept = (): Row => ({ _key: uid(), hqDepartment: "", subject: "", summary: "", relevance: "" });
const emptyResolution = (): Row => ({
  _key: uid(), resolution: "", responsibleOffice: "", deadline: "", communicated: "",
  dateCommunicated: "", planOfAction: "", implementationStatus: "", remarks: "",
});
const emptyComment = (): Row => ({ _key: uid(), question: "", relatedAgenda: "", response: "", furtherClarification: "", responsibleAuthority: "" });
const emptyFeedback = (): Row => ({ _key: uid(), feedback: "", relatedAgenda: "", reason: "", impact: "", authority: "", actionTaken: "" });

export default function EtmcCascadingForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [etmcMeetingDate, setEtmcMeetingDate] = React.useState("");
  const [cascadeSessionDate, setCascadeSessionDate] = React.useState("");
  const [etmcSession, setEtmcSession] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [cascadeMode, setCascadeMode] = React.useState("");
  const [personLeading, setPersonLeading] = React.useState("");
  const [staffStrength, setStaffStrength] = React.useState("");
  const [staffPresent, setStaffPresent] = React.useState("");
  const [highlights, setHighlights] = React.useState<Row[]>([]);
  const [departments, setDepartments] = React.useState<Row[]>([]);
  const [resolutions, setResolutions] = React.useState<Row[]>([]);
  const [comments, setComments] = React.useState<Row[]>([]);
  const [feedback, setFeedback] = React.useState<Row[]>([]);
  const [evidence, setEvidence] = React.useState({
    attendanceList: "", minutes: "", presentation: "", photographs: "", actionTracker: "", escalationIssues: "",
  });
  const [preparedBy, setPreparedBy] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [preparedDate, setPreparedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endorsedBy, setEndorsedBy] = React.useState("");

  const updateRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, key: string, field: string, value: string) => {
    setter((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };
  const stripKeys = (rows: Row[]) => rows.map(({ _key, ...rest }) => rest);

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const p = v.payload ?? {};
    setEtmcMeetingDate(String(p.etmcMeetingDate ?? "").slice(0, 10));
    setCascadeSessionDate(String(p.cascadeSessionDate ?? "").slice(0, 10));
    setEtmcSession(String(p.etmcSession ?? ""));
    setVenue(String(p.venue ?? ""));
    setCascadeMode(String(p.cascadeMode ?? ""));
    setPersonLeading(String(p.personLeading ?? ""));
    setStaffStrength(p.staffStrength != null ? String(p.staffStrength) : "");
    setStaffPresent(p.staffPresent != null ? String(p.staffPresent) : "");
    setHighlights((p.highlights as Row[] | undefined)?.map((r) => ({ ...r, _key: uid() })) ?? []);
    setDepartments((p.departments as Row[] | undefined)?.map((r) => ({ ...r, _key: uid() })) ?? []);
    setResolutions((p.resolutions as Row[] | undefined)?.map((r) => ({ ...r, _key: uid() })) ?? []);
    setComments((p.comments as Row[] | undefined)?.map((r) => ({ ...r, _key: uid() })) ?? []);
    setFeedback((p.feedback as Row[] | undefined)?.map((r) => ({ ...r, _key: uid() })) ?? []);
    const ev = (p.evidence ?? {}) as Record<string, string>;
    setEvidence({
      attendanceList: ev.attendanceList ?? "", minutes: ev.minutes ?? "", presentation: ev.presentation ?? "",
      photographs: ev.photographs ?? "", actionTracker: ev.actionTracker ?? "", escalationIssues: ev.escalationIssues ?? "",
    });
    setPreparedBy(String(p.preparedBy ?? ""));
    setDesignation(String(p.designation ?? ""));
    setPreparedDate(String(p.preparedDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10));
    setEndorsedBy(String(p.endorsedBy ?? ""));
  };

  const title = personLeading || etmcSession || ADMIN_HR_CONFIG["etmc-cascading"].title;

  return (
    <StateOfficeFormShell
      reportType="etmc-cascading"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      validate={() => (!etmcMeetingDate ? "Enter ETMC meeting date" : !cascadeSessionDate ? "Enter cascade session date" : null)}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          etmcMeetingDate, cascadeSessionDate, etmcSession, venue, cascadeMode, personLeading,
          staffStrength: Number(staffStrength) || null,
          staffPresent: Number(staffPresent) || null,
          highlights: stripKeys(highlights),
          departments: stripKeys(departments),
          resolutions: stripKeys(resolutions),
          comments: stripKeys(comments),
          feedback: stripKeys(feedback),
          evidence,
          preparedBy, designation, preparedDate, endorsedBy,
        },
      })}
    >
      {() => (
        <div className="space-y-4">
          <FormPageTitle title="ETMC Cascading Reporting Template" />
          <Section title="1. CASCADE DETAILS">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="ETMC Meeting Date" required><TextInput type="date" value={etmcMeetingDate} onChange={(e) => setEtmcMeetingDate(e.target.value)} /></Field>
              <Field label="Cascade Session Date" required><TextInput type="date" value={cascadeSessionDate} onChange={(e) => setCascadeSessionDate(e.target.value)} /></Field>
              <Field label="ETMC Session"><SelectField value={etmcSession} onChange={setEtmcSession} options={ETMC_SESSIONS} /></Field>
              <Field label="Venue Mode"><SelectField value={venue} onChange={setVenue} options={VENUE_MODES} /></Field>
              <Field label="Cascade Mode"><TextInput value={cascadeMode} onChange={(e) => setCascadeMode(e.target.value)} placeholder="e.g. Physical briefing, virtual session" /></Field>
              <Field label="Person Leading"><TextInput value={personLeading} onChange={(e) => setPersonLeading(e.target.value)} /></Field>
              <Field label="Staff Strength"><TextInput type="number" min={0} value={staffStrength} onChange={(e) => setStaffStrength(e.target.value)} /></Field>
              <Field label="Staff Present"><TextInput type="number" min={0} value={staffPresent} onChange={(e) => setStaffPresent(e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="2. ETMC Highlights">
            <div className="space-y-3">
              {highlights.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Agenda Item"><TextInput value={row.agendaItem} onChange={(e) => updateRow(setHighlights, row._key, "agendaItem", e.target.value)} /></Field>
                    <Field label="Priority"><SelectField value={row.priority} onChange={(v) => updateRow(setHighlights, row._key, "priority", v)} options={PRIORITIES} /></Field>
                    <Field label="Highlight"><TextArea value={row.highlight} onChange={(e) => updateRow(setHighlights, row._key, "highlight", e.target.value)} /></Field>
                    <Field label="Discussion Summary"><TextArea value={row.discussionSummary} onChange={(e) => updateRow(setHighlights, row._key, "discussionSummary", e.target.value)} /></Field>
                    <Field label="Implication"><TextArea value={row.implication} onChange={(e) => updateRow(setHighlights, row._key, "implication", e.target.value)} className="md:col-span-2" /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setHighlights((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Highlight" onClick={() => setHighlights((p) => [...p, emptyHighlight()])} />
            </div>
          </Section>

          <Section title="3. Departmental Updates">
            <div className="space-y-3">
              {departments.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="HQ Department"><TextInput value={row.hqDepartment} onChange={(e) => updateRow(setDepartments, row._key, "hqDepartment", e.target.value)} /></Field>
                    <Field label="Subject"><TextInput value={row.subject} onChange={(e) => updateRow(setDepartments, row._key, "subject", e.target.value)} /></Field>
                    <Field label="Summary"><TextArea value={row.summary} onChange={(e) => updateRow(setDepartments, row._key, "summary", e.target.value)} /></Field>
                    <Field label="Relevance"><TextArea value={row.relevance} onChange={(e) => updateRow(setDepartments, row._key, "relevance", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setDepartments((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Department Update" onClick={() => setDepartments((p) => [...p, emptyDept()])} />
            </div>
          </Section>

          <Section title="4. Resolutions / Action Points — complete communication fields" accent="yellow">
            <div className="space-y-3">
              {resolutions.map((row) => (
                <div key={row._key} className="rounded-lg border border-amber-200 p-3 space-y-3 bg-amber-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Resolution"><TextArea value={row.resolution} onChange={(e) => updateRow(setResolutions, row._key, "resolution", e.target.value)} /></Field>
                    <Field label="Responsible Office"><TextInput value={row.responsibleOffice} onChange={(e) => updateRow(setResolutions, row._key, "responsibleOffice", e.target.value)} /></Field>
                    <Field label="Deadline"><TextInput type="date" value={row.deadline} onChange={(e) => updateRow(setResolutions, row._key, "deadline", e.target.value)} /></Field>
                    <Field label="Communicated"><SelectField value={row.communicated} onChange={(v) => updateRow(setResolutions, row._key, "communicated", v)} options={YES_NO} /></Field>
                    <Field label="Date Communicated"><TextInput type="date" value={row.dateCommunicated} onChange={(e) => updateRow(setResolutions, row._key, "dateCommunicated", e.target.value)} /></Field>
                    <Field label="Implementation Status"><TextInput value={row.implementationStatus} onChange={(e) => updateRow(setResolutions, row._key, "implementationStatus", e.target.value)} /></Field>
                    <Field label="Plan of Action"><TextArea value={row.planOfAction} onChange={(e) => updateRow(setResolutions, row._key, "planOfAction", e.target.value)} /></Field>
                    <Field label="Remarks"><TextArea value={row.remarks} onChange={(e) => updateRow(setResolutions, row._key, "remarks", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setResolutions((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Resolution" onClick={() => setResolutions((p) => [...p, emptyResolution()])} />
            </div>
          </Section>

          <Section title="5. Staff Comments">
            <div className="space-y-3">
              {comments.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Question"><TextArea value={row.question} onChange={(e) => updateRow(setComments, row._key, "question", e.target.value)} /></Field>
                    <Field label="Related Agenda"><TextInput value={row.relatedAgenda} onChange={(e) => updateRow(setComments, row._key, "relatedAgenda", e.target.value)} /></Field>
                    <Field label="Response"><TextArea value={row.response} onChange={(e) => updateRow(setComments, row._key, "response", e.target.value)} /></Field>
                    <Field label="Further Clarification Needed"><SelectField value={row.furtherClarification} onChange={(v) => updateRow(setComments, row._key, "furtherClarification", v)} options={YES_NO} /></Field>
                    <Field label="Responsible Authority"><TextInput value={row.responsibleAuthority} onChange={(e) => updateRow(setComments, row._key, "responsibleAuthority", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setComments((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Comment" onClick={() => setComments((p) => [...p, emptyComment()])} />
            </div>
          </Section>

          <Section title="6. Feedback to HQ">
            <div className="space-y-3">
              {feedback.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Feedback"><TextArea value={row.feedback} onChange={(e) => updateRow(setFeedback, row._key, "feedback", e.target.value)} /></Field>
                    <Field label="Related Agenda"><TextInput value={row.relatedAgenda} onChange={(e) => updateRow(setFeedback, row._key, "relatedAgenda", e.target.value)} /></Field>
                    <Field label="Reason"><TextInput value={row.reason} onChange={(e) => updateRow(setFeedback, row._key, "reason", e.target.value)} /></Field>
                    <Field label="Impact"><TextInput value={row.impact} onChange={(e) => updateRow(setFeedback, row._key, "impact", e.target.value)} /></Field>
                    <Field label="Authority"><TextInput value={row.authority} onChange={(e) => updateRow(setFeedback, row._key, "authority", e.target.value)} /></Field>
                    <Field label="Action Taken"><TextInput value={row.actionTaken} onChange={(e) => updateRow(setFeedback, row._key, "actionTaken", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setFeedback((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Feedback" onClick={() => setFeedback((p) => [...p, emptyFeedback()])} />
            </div>
          </Section>

          <Section title="7. Supporting Evidence Checklist">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {([
                ["attendanceList", "Attendance list"],
                ["minutes", "Minutes"],
                ["presentation", "Presentation"],
                ["photographs", "Photographs"],
                ["actionTracker", "Action tracker"],
                ["escalationIssues", "Escalation issues documented"],
              ] as const).map(([key, label]) => (
                <Field key={key} label={label}>
                  <SelectField value={evidence[key]} onChange={(v) => setEvidence((p) => ({ ...p, [key]: v }))} options={YES_NO_NA} />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="8. Submission">
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
