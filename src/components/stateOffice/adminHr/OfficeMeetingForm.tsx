import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, Field, TextInput, TextArea, SelectField, AddRowButton, RemoveRowButton, FormPageTitle,
} from "./ui";
import {
  MEETING_TYPES, VENUE_MODES, YES_NO, YES_NO_PARTIAL, ACTION_STATUSES,
  FOLLOWUP_STATUSES, PRIORITIES, ADMIN_HR_CONFIG,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type Row = { _key: string; [k: string]: string };

const emptyKeyIssue = (): Row => ({ _key: uid(), agenda: "", keyIssue: "", keyOutcome: "", requiresAction: "" });
const emptyDecision = (): Row => ({ _key: uid(), decision: "", actionPoint: "", expectedOutput: "", responsibleOfficer: "", deadline: "", status: "" });
const emptyFollowup = (): Row => ({ _key: uid(), actionPoint: "", progress: "", remarks: "", responsibleOfficer: "", dueDate: "", status: "" });
const emptyMatter = (): Row => ({ _key: uid(), matter: "", reason: "", actionExpected: "", programArea: "", supportRequired: "", priority: "", status: "" });

export default function OfficeMeetingForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [meetingDate, setMeetingDate] = React.useState("");
  const [meetingType, setMeetingType] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [presidingOfficer, setPresidingOfficer] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [staffStrength, setStaffStrength] = React.useState("");
  const [attendeesCount, setAttendeesCount] = React.useState("");
  const [attendanceNote, setAttendanceNote] = React.useState("");
  const [keyIssues, setKeyIssues] = React.useState<Row[]>([]);
  const [decisions, setDecisions] = React.useState<Row[]>([]);
  const [followups, setFollowups] = React.useState<Row[]>([]);
  const [matters, setMatters] = React.useState<Row[]>([]);
  const [effectiveness, setEffectiveness] = React.useState({
    previousReviewed: "", programmeDiscussed: "", decisionsDocumented: "",
    officersAssigned: "", deadlinesAssigned: "", attendanceAdequate: "",
    mattersEscalated: "", evidenceNote: "",
  });
  const [preparedBy, setPreparedBy] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [preparedDate, setPreparedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endorsedBy, setEndorsedBy] = React.useState("");

  const staffNum = Number(staffStrength) || 0;
  const attendeesNum = Number(attendeesCount) || 0;
  const attendanceRate = staffNum > 0 ? ((attendeesNum / staffNum) * 100).toFixed(0) : null;

  const updateRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, key: string, field: string, value: string) => {
    setter((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const stripKeys = (rows: Row[]) => rows.map(({ _key, ...rest }) => rest);

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const p = v.payload ?? {};
    setMeetingDate(String(p.meetingDate ?? "").slice(0, 10));
    setMeetingType(String(p.meetingType ?? ""));
    setPurpose(String(p.purpose ?? ""));
    setPresidingOfficer(String(p.presidingOfficer ?? ""));
    setVenue(String(p.venue ?? ""));
    setStaffStrength(p.staffStrength != null ? String(p.staffStrength) : "");
    setAttendeesCount(p.attendeesCount != null ? String(p.attendeesCount) : "");
    setAttendanceNote(String(p.attendanceNote ?? ""));
    setKeyIssues((p.keyIssues as Row[] | undefined)?.map((r) => ({ _key: uid(), ...r })) ?? []);
    setDecisions((p.decisions as Row[] | undefined)?.map((r) => ({ _key: uid(), ...r })) ?? []);
    setFollowups((p.followups as Row[] | undefined)?.map((r) => ({ _key: uid(), ...r })) ?? []);
    setMatters((p.matters as Row[] | undefined)?.map((r) => ({ _key: uid(), ...r })) ?? []);
    const eff = (p.effectiveness ?? {}) as Record<string, string>;
    setEffectiveness({
      previousReviewed: eff.previousReviewed ?? "",
      programmeDiscussed: eff.programmeDiscussed ?? "",
      decisionsDocumented: eff.decisionsDocumented ?? "",
      officersAssigned: eff.officersAssigned ?? "",
      deadlinesAssigned: eff.deadlinesAssigned ?? "",
      attendanceAdequate: eff.attendanceAdequate ?? "",
      mattersEscalated: eff.mattersEscalated ?? "",
      evidenceNote: eff.evidenceNote ?? "",
    });
    setPreparedBy(String(p.preparedBy ?? ""));
    setDesignation(String(p.designation ?? ""));
    setPreparedDate(String(p.preparedDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10));
    setEndorsedBy(String(p.endorsedBy ?? ""));
  };

  const title = meetingType || purpose.slice(0, 60) || ADMIN_HR_CONFIG["office-meeting"].title;

  return (
    <StateOfficeFormShell
      reportType="office-meeting"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      validate={() => (!meetingDate ? "Enter the meeting date" : !meetingType ? "Select meeting type" : null)}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          meetingDate, meetingType, purpose, presidingOfficer, venue,
          staffStrength: staffNum || null,
          attendeesCount: attendeesNum || null,
          attendanceNote,
          keyIssues: stripKeys(keyIssues),
          decisions: stripKeys(decisions),
          followups: stripKeys(followups),
          matters: stripKeys(matters),
          effectiveness,
          preparedBy, designation, preparedDate, endorsedBy,
        },
      })}
    >
      {() => (
        <div className="space-y-4">
          <FormPageTitle title="State Office Meeting Reporting Template" />
          <Section title="1. MEETING INFORMATION">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Meeting Date" required>
                <TextInput type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
              </Field>
              <Field label="Meeting Type" required>
                <SelectField value={meetingType} onChange={setMeetingType} options={MEETING_TYPES} />
              </Field>
              <Field label="Venue Mode">
                <SelectField value={venue} onChange={setVenue} options={VENUE_MODES} />
              </Field>
              <Field label="Presiding Officer">
                <TextInput value={presidingOfficer} onChange={(e) => setPresidingOfficer(e.target.value)} />
              </Field>
              <Field label="Staff Strength">
                <TextInput type="number" min={0} value={staffStrength} onChange={(e) => setStaffStrength(e.target.value)} />
              </Field>
              <Field label="Attendees Count">
                <TextInput type="number" min={0} value={attendeesCount} onChange={(e) => setAttendeesCount(e.target.value)} />
              </Field>
              {attendanceRate != null && (
                <div className="md:col-span-2 lg:col-span-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-600">Attendance rate: </span>
                  <span className="font-bold text-[#0f3d2e]">{attendanceRate}%</span>
                  <span className="text-slate-500 ml-2">({attendeesNum} of {staffNum} staff)</span>
                </div>
              )}
            </div>
            <Field label="Purpose of Meeting">
              <TextArea value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </Field>
            <Field label="Attendance Note">
              <TextArea value={attendanceNote} onChange={(e) => setAttendanceNote(e.target.value)} />
            </Field>
          </Section>

          <Section title="2. KEY ISSUE ITEMS DISCUSSED">
            <div className="space-y-3">
              {keyIssues.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Agenda Item"><TextInput value={row.agenda} onChange={(e) => updateRow(setKeyIssues, row._key, "agenda", e.target.value)} /></Field>
                    <Field label="Requires Action"><SelectField value={row.requiresAction} onChange={(v) => updateRow(setKeyIssues, row._key, "requiresAction", v)} options={YES_NO} /></Field>
                    <Field label="Key Issue"><TextArea value={row.keyIssue} onChange={(e) => updateRow(setKeyIssues, row._key, "keyIssue", e.target.value)} /></Field>
                    <Field label="Key Outcome"><TextArea value={row.keyOutcome} onChange={(e) => updateRow(setKeyIssues, row._key, "keyOutcome", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setKeyIssues((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Key Issue" onClick={() => setKeyIssues((p) => [...p, emptyKeyIssue()])} />
            </div>
          </Section>

          <Section title="3. DECISIONS / RESOLUTIONS">
            <div className="space-y-3">
              {decisions.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Decision"><TextArea value={row.decision} onChange={(e) => updateRow(setDecisions, row._key, "decision", e.target.value)} /></Field>
                    <Field label="Action Point"><TextInput value={row.actionPoint} onChange={(e) => updateRow(setDecisions, row._key, "actionPoint", e.target.value)} /></Field>
                    <Field label="Expected Output"><TextInput value={row.expectedOutput} onChange={(e) => updateRow(setDecisions, row._key, "expectedOutput", e.target.value)} /></Field>
                    <Field label="Responsible Officer"><TextInput value={row.responsibleOfficer} onChange={(e) => updateRow(setDecisions, row._key, "responsibleOfficer", e.target.value)} /></Field>
                    <Field label="Deadline"><TextInput type="date" value={row.deadline} onChange={(e) => updateRow(setDecisions, row._key, "deadline", e.target.value)} /></Field>
                    <Field label="Status"><SelectField value={row.status} onChange={(v) => updateRow(setDecisions, row._key, "status", v)} options={ACTION_STATUSES} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setDecisions((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Decision" onClick={() => setDecisions((p) => [...p, emptyDecision()])} />
            </div>
          </Section>

          <Section title="4. FOLLOW-UP ON PREVIOUS MEETING ACTION POINTS" accent="yellow">
            <div className="space-y-3">
              {followups.map((row) => (
                <div key={row._key} className="rounded-lg border border-amber-200 p-3 space-y-3 bg-amber-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Action Point" required><TextInput value={row.actionPoint} onChange={(e) => updateRow(setFollowups, row._key, "actionPoint", e.target.value)} /></Field>
                    <Field label="Progress"><TextInput value={row.progress} onChange={(e) => updateRow(setFollowups, row._key, "progress", e.target.value)} /></Field>
                    <Field label="Status"><SelectField value={row.status} onChange={(v) => updateRow(setFollowups, row._key, "status", v)} options={FOLLOWUP_STATUSES} /></Field>
                    <Field label="Responsible Officer"><TextInput value={row.responsibleOfficer} onChange={(e) => updateRow(setFollowups, row._key, "responsibleOfficer", e.target.value)} /></Field>
                    <Field label="Due Date"><TextInput type="date" value={row.dueDate} onChange={(e) => updateRow(setFollowups, row._key, "dueDate", e.target.value)} /></Field>
                    <Field label="Remarks"><TextArea value={row.remarks} onChange={(e) => updateRow(setFollowups, row._key, "remarks", e.target.value)} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setFollowups((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Follow-up Item" onClick={() => setFollowups((p) => [...p, emptyFollowup()])} />
            </div>
          </Section>

          <Section title="5. MATTERS REQUIRING ZONAL / SDO ATTENTION">
            <div className="space-y-3">
              {matters.map((row) => (
                <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Matter"><TextInput value={row.matter} onChange={(e) => updateRow(setMatters, row._key, "matter", e.target.value)} /></Field>
                    <Field label="Program Area"><TextInput value={row.programArea} onChange={(e) => updateRow(setMatters, row._key, "programArea", e.target.value)} /></Field>
                    <Field label="Priority"><SelectField value={row.priority} onChange={(v) => updateRow(setMatters, row._key, "priority", v)} options={PRIORITIES} /></Field>
                    <Field label="Reason"><TextArea value={row.reason} onChange={(e) => updateRow(setMatters, row._key, "reason", e.target.value)} /></Field>
                    <Field label="Action Expected"><TextInput value={row.actionExpected} onChange={(e) => updateRow(setMatters, row._key, "actionExpected", e.target.value)} /></Field>
                    <Field label="Support Required"><TextInput value={row.supportRequired} onChange={(e) => updateRow(setMatters, row._key, "supportRequired", e.target.value)} /></Field>
                    <Field label="Status"><SelectField value={row.status} onChange={(v) => updateRow(setMatters, row._key, "status", v)} options={FOLLOWUP_STATUSES} /></Field>
                  </div>
                  <div className="flex justify-end"><RemoveRowButton onClick={() => setMatters((p) => p.filter((r) => r._key !== row._key))} /></div>
                </div>
              ))}
              <AddRowButton label="Add Matter" onClick={() => setMatters((p) => [...p, emptyMatter()])} />
            </div>
          </Section>

          <Section title="6. MEETING EFFECTIVENESS / MANAGEMENT OBSERVATIONS">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {([
                ["previousReviewed", "Previous action points reviewed?"],
                ["programmeDiscussed", "Programme adequately discussed?"],
                ["decisionsDocumented", "Decisions documented?"],
                ["officersAssigned", "Officers assigned?"],
                ["deadlinesAssigned", "Deadlines assigned?"],
                ["attendanceAdequate", "Attendance adequate?"],
              ] as const).map(([key, label]) => (
                <Field key={key} label={label}>
                  <SelectField
                    value={effectiveness[key]}
                    onChange={(v) => setEffectiveness((p) => ({ ...p, [key]: v }))}
                    options={YES_NO_PARTIAL}
                  />
                </Field>
              ))}
              <Field label="Matters escalated?">
                <SelectField
                  value={effectiveness.mattersEscalated}
                  onChange={(v) => setEffectiveness((p) => ({ ...p, mattersEscalated: v }))}
                  options={YES_NO}
                />
              </Field>
            </div>
            <Field label="Evidence / Notes">
              <TextArea value={effectiveness.evidenceNote} onChange={(e) => setEffectiveness((p) => ({ ...p, evidenceNote: e.target.value }))} />
            </Field>
          </Section>

          <Section title="7. SUBMISSION AND CERTIFICATION">
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
