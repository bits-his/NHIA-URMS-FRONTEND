import * as React from "react";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StateOfficeFormShell from "../StateOfficeFormShell";
import ReportBasicInfo from "../shared/ReportBasicInfo";
import { Field, TextInput, TextArea } from "./ui";
import {
  FEEDBACK_HEAR_ABOUT, FEEDBACK_VISIT_PURPOSE, RATING_AREAS, RATING_LEVELS,
  YES_NO_PARTIAL, ADMIN_HR_CONFIG,
} from "./constants";

const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";

function ChoicePill({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-sm border-2 px-3 py-1.5 text-xs font-bold transition-all ${
        checked
          ? "border-[#1a7a52] bg-[#e8f5ee] text-[#1a7a52] shadow-xs"
          : "border-slate-200 bg-white text-slate-600 hover:border-[#1a7a52] hover:bg-[#f4f7f5]"
      }`}
    >
      <span
        className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
          checked ? "border-[#1a7a52]" : "border-slate-300"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-[#1a7a52]" />}
      </span>
      {children}
    </label>
  );
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function EnrolleeFeedbackForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
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
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={ADMIN_HR_CONFIG["enrollee-feedback"].formTitle}
      hideBasicInfo
      hideFooterActions
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
      {({ header, saving, submitting, persist, requestSubmit }) => (
        <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible">
          <CardContent className="p-4 md:p-5 space-y-5">
            <ReportBasicInfo {...header} lockZone={header.lockZone} lockState={header.lockState} showQuarter embedded />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="How did you hear about health insurance or this office?">
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_HEAR_ABOUT.map((item) => (
                      <ChoicePill key={item} checked={hearAbout.includes(item)} onSelect={() => toggle(hearAbout, setHearAbout, item, !hearAbout.includes(item))}>
                        {item}
                      </ChoicePill>
                    ))}
                  </div>
                </Field>
              </div>
              {hearAbout.includes("Other") && (
                <Field label="Other (specify)"><TextInput value={hearOther} onChange={(e) => setHearOther(e.target.value)} /></Field>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Purpose of today’s visit">
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_VISIT_PURPOSE.map((item) => (
                      <ChoicePill key={item} checked={visitPurpose.includes(item)} onSelect={() => toggle(visitPurpose, setVisitPurpose, item, !visitPurpose.includes(item))}>
                        {item}
                      </ChoicePill>
                    ))}
                  </div>
                </Field>
              </div>
              {visitPurpose.includes("Other") && (
                <Field label="Other (specify)"><TextInput value={purposeOther} onChange={(e) => setPurposeOther(e.target.value)} /></Field>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="How would you rate the following?">
                  <div className="space-y-3">
                    {RATING_AREAS.map((area, i) => {
                      const val = ratings[area] ?? "";
                      return (
                        <div
                          key={area}
                          className={`rounded-sm border p-2 transition-colors ${
                            val ? "border-slate-300 bg-white shadow-xs" : "border-slate-200 bg-[#f4f7f5]"
                          }`}
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#e8f5ee] text-xs font-bold text-[#1a7a52]">
                                {i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 leading-snug">{area}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end shrink-0 md:pl-0 pl-10">
                              {RATING_LEVELS.map((level) => (
                                <ChoicePill key={level} checked={val === level} onSelect={() => setRatings((p) => ({ ...p, [area]: level }))}>
                                  {level}
                                </ChoicePill>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Was your issue or request resolved today?">
                  <div className="flex flex-wrap gap-2">
                    {YES_NO_PARTIAL.map((opt) => (
                      <ChoicePill key={opt} checked={resolvedToday === opt} onSelect={() => setResolvedToday(opt)}>
                        {opt}
                      </ChoicePill>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Comments / suggestions">
                  <TextArea value={comments} onChange={(e) => setComments(e.target.value)} />
                </Field>
              </div>
              <Field label="Recorded by"><TextInput value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></Field>
              <Field label="Date"><TextInput type="date" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} /></Field>
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
