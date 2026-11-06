import * as React from "react";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "../StateOfficeFormShell";
import ReportBasicInfo from "../shared/ReportBasicInfo";
import { Field, TextInput, TextArea, SelectField } from "./ui";
import {
  FEEDBACK_HEAR_ABOUT, FEEDBACK_VISIT_PURPOSE, RATING_AREAS, RATING_LEVELS,
  YES_NO_PARTIAL, ADMIN_HR_CONFIG,
} from "./constants";

const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const choiceClass = "flex items-center gap-2 rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3 py-2.5 cursor-pointer hover:bg-white";

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FEEDBACK_HEAR_ABOUT.map((item) => (
                      <label key={item} className={choiceClass}>
                        <Checkbox checked={hearAbout.includes(item)} onCheckedChange={(c) => toggle(hearAbout, setHearAbout, item, c === true)} />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              {hearAbout.includes("Other") && (
                <Field label="Other (specify)"><TextInput value={hearOther} onChange={(e) => setHearOther(e.target.value)} /></Field>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Purpose of today’s visit">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FEEDBACK_VISIT_PURPOSE.map((item) => (
                      <label key={item} className={choiceClass}>
                        <Checkbox checked={visitPurpose.includes(item)} onCheckedChange={(c) => toggle(visitPurpose, setVisitPurpose, item, c === true)} />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              {visitPurpose.includes("Other") && (
                <Field label="Other (specify)"><TextInput value={purposeOther} onChange={(e) => setPurposeOther(e.target.value)} /></Field>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="How would you rate the following?">
                  <div className="overflow-x-auto rounded-sm border border-[#d4e8dc]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Service area</TableHead>
                          {RATING_LEVELS.map((level) => (
                            <TableHead key={level} className="text-xs font-bold text-[#0f3d2e] text-center whitespace-nowrap">{level}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {RATING_AREAS.map((area) => (
                          <TableRow key={area} className="border-b border-[#e8f3ec] last:border-0">
                            <TableCell className="text-sm font-medium text-slate-800">{area}</TableCell>
                            {RATING_LEVELS.map((level) => (
                              <TableCell key={level} className="text-center">
                                <input
                                  type="radio"
                                  name={`rating-${area}`}
                                  checked={ratings[area] === level}
                                  onChange={() => setRatings((p) => ({ ...p, [area]: level }))}
                                  className="h-4 w-4 accent-[#145c3f]"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Field>
              </div>
              <Field label="Was your issue or request resolved today?">
                <SelectField value={resolvedToday} onChange={setResolvedToday} options={YES_NO_PARTIAL} placeholder="Select" />
              </Field>
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
