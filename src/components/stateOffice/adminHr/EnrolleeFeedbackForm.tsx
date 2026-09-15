import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Section, Field, TextInput, TextArea, SelectField, FormPageTitle } from "./ui";
import {
  FEEDBACK_HEAR_ABOUT, FEEDBACK_VISIT_PURPOSE, RATING_AREAS, RATING_LEVELS,
  YES_NO_PARTIAL, ADMIN_HR_CONFIG,
} from "./constants";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function EnrolleeFeedbackForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [hearAbout, setHearAbout] = React.useState<string[]>([]);
  const [hearOther, setHearOther] = React.useState("");
  const [visitPurpose, setVisitPurpose] = React.useState<string[]>([]);
  const [purposeOther, setPurposeOther] = React.useState("");
  const [ratings, setRatings] = React.useState<Record<string, string>>({});
  const [resolvedToday, setResolvedToday] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [preparedBy, setPreparedBy] = React.useState("");
  const [preparedDate, setPreparedDate] = React.useState(new Date().toISOString().slice(0, 10));

  const toggle = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string, checked: boolean) => {
    setList(checked ? [...list, item] : list.filter((x) => x !== item));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const p = v.payload ?? {};
    setHearAbout(Array.isArray(p.hearAbout) ? (p.hearAbout as string[]) : []);
    setHearOther(String(p.hearOther ?? ""));
    setVisitPurpose(Array.isArray(p.visitPurpose) ? (p.visitPurpose as string[]) : []);
    setPurposeOther(String(p.purposeOther ?? ""));
    setRatings((p.ratings as Record<string, string>) ?? {});
    setResolvedToday(String(p.resolvedToday ?? ""));
    setComments(String(p.comments ?? ""));
    setPreparedBy(String(p.preparedBy ?? ""));
    setPreparedDate(String(p.preparedDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10));
  };

  const title = visitPurpose[0] || hearAbout[0] || ADMIN_HR_CONFIG["enrollee-feedback"].title;

  return (
    <StateOfficeFormShell
      reportType="enrollee-feedback"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          hearAbout, hearOther, visitPurpose, purposeOther,
          ratings, resolvedToday, comments, preparedBy, preparedDate,
        },
      })}
    >
      {() => (
        <div className="space-y-4">
          <FormPageTitle title="Enrollee Feedback / Satisfaction Survey" />
          <Section title="1. How did you hear about health insurance or this office?">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEEDBACK_HEAR_ABOUT.map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <Checkbox checked={hearAbout.includes(item)} onCheckedChange={(c) => toggle(hearAbout, setHearAbout, item, c === true)} />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
            {hearAbout.includes("Other") && (
              <Field label="Other (specify)"><TextInput value={hearOther} onChange={(e) => setHearOther(e.target.value)} /></Field>
            )}
          </Section>

          <Section title="2. Purpose of today’s visit">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEEDBACK_VISIT_PURPOSE.map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <Checkbox checked={visitPurpose.includes(item)} onCheckedChange={(c) => toggle(visitPurpose, setVisitPurpose, item, c === true)} />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
            {visitPurpose.includes("Other") && (
              <Field label="Other (specify)"><TextInput value={purposeOther} onChange={(e) => setPurposeOther(e.target.value)} /></Field>
            )}
          </Section>

          <Section title="3. How would you rate the following?">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-[#145c3f] text-white">
                    <th className="px-3 py-2.5 text-left font-semibold">Service Area</th>
                    {RATING_LEVELS.map((level) => (
                      <th key={level} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{level}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RATING_AREAS.map((area) => (
                    <tr key={area} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 font-medium text-slate-700">{area}</td>
                      {RATING_LEVELS.map((level) => (
                        <td key={level} className="px-3 py-2.5 text-center">
                          <input
                            type="radio"
                            name={`rating-${area}`}
                            checked={ratings[area] === level}
                            onChange={() => setRatings((p) => ({ ...p, [area]: level }))}
                            className="h-4 w-4 accent-[#0f3d2e]"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Was your issue or request resolved today?">
            <Field label="Resolution">
              <SelectField value={resolvedToday} onChange={setResolvedToday} options={YES_NO_PARTIAL} />
            </Field>
          </Section>

          <Section title="5. Comments / Suggestions">
            <Field label="Comments">
              <TextArea value={comments} onChange={(e) => setComments(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Recorded By"><TextInput value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></Field>
              <Field label="Date"><TextInput type="date" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} /></Field>
            </div>
          </Section>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
