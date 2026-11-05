import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Loader2,
  Eye,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { servicomApi } from "@/lib/api";
import { zonesApi, statesApi } from "@/lib/adminApi";
import { pickGeoLabel } from "./servicomConstants";
import AccreditedProviderSelect from "@/src/components/stateOffice/AccreditedProviderSelect";
import PageLayout from "@/src/components/PageLayout";
import {
  SATISFACTION_QUESTIONS,
  SATISFACTION_CATEGORIES,
  YES_NO_OPTIONS,
  computeSatisfactionScore,
  questionsForCategory,
  satisfactionCategoryLabel,
} from "./servicomSurveyConstants";
import { SubmitConfirmModal, useReportingOfficerSubmitConfirm } from "@/src/components/SubmitConfirmModal";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { RegisterStatsCards } from "@/src/components/stateOffice/RegisterStatsCards";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  defaultStateName?: string;
  defaultZoneName?: string;
  canCreate?: boolean;
  canReview?: boolean;
}

// Consistent NHIA input styling matching the Select component
const inputStyling =
  "h-11 w-full rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a7a52] transition-colors";

const emptyForm = (
  defaultZoneId?: string | null,
  defaultStateId?: string | null,
) => ({
  zonal_code: defaultZoneId ?? "",
  state_code: defaultStateId ?? "",
  provider_name: "",
  survey_date: new Date().toISOString().slice(0, 10),
  teamNames: [""] as string[],
  responses: {} as Record<string, string>,
});

function parseTeamNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((name) => String(name ?? "").trim()).filter(Boolean);
  }
  const text = String(raw ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((name) => String(name ?? "").trim()).filter(Boolean);
      }
    } catch { /* legacy plain text */ }
  }
  return text.split(/[,;\n]/).map((name) => name.trim()).filter(Boolean);
}

function formatTeamNames(raw: unknown) {
  const names = parseTeamNames(raw);
  return names.length ? names.join(", ") : "";
}

function parseStoredResponses(raw: unknown): Record<string, string> {
  let rows: { question_id: string; response?: string; response_value?: string }[] = [];
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
  }
  return Object.fromEntries(
    rows.map((r) => [r.question_id, r.response ?? r.response_value ?? ""]),
  );
}

function buildResponsesPayload(responses: Record<string, string>) {
  return SATISFACTION_QUESTIONS.map((q) => {
    const response = responses[q.id] || null;
    const score = response === "yes" ? 1 : response === "no" ? 0 : null;
    return { question_id: q.id, category: q.category, question: q.question, response, score };
  });
}

export default function ServicomSatisfactionSurveyPage({
  onBack,
  defaultStateId,
  defaultZoneId,
  defaultStateName,
  defaultZoneName,
  canCreate = true,
  canReview = true,
}: Props) {
  const createOnly = canCreate && !canReview;
  const geoLocked = !!(defaultZoneId && defaultStateId);
  const submitConfirm = useReportingOfficerSubmitConfirm();

  // Navigation & State
  const [mode, setMode] = React.useState<"list" | "form" | "view">(createOnly ? "form" : "list");
  const [formKey, setFormKey] = React.useState(0);

  // Data
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [filterStates, setFilterStates] = React.useState<any[]>([]);

  // Form State
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId));
  const [selectedProviderId, setSelectedProviderId] = React.useState("");

  // Filters
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [filterSearch, setFilterSearch] = React.useState("");
  const [filterDate, setFilterDate] = React.useState("");

  const scoreSummary = React.useMemo(() => computeSatisfactionScore(f.responses), [f.responses]);
  const activeStateCode = defaultStateId ?? f.state_code;

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await servicomApi.listSatisfactionSurveys({
        state_code: defaultStateId ? defaultStateId : (filterState !== "all" ? filterState : undefined),
        zonal_code: defaultZoneId ? defaultZoneId : (filterZone !== "all" ? filterZone : undefined),
      });
      setSurveys(res.data);
    } catch (err: any) {
      toast.error("Failed to load surveys", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [defaultStateId, defaultZoneId, filterState, filterZone, createOnly]);

  React.useEffect(() => {
    if (mode === "list" && !createOnly) load();
  }, [load, mode, createOnly]);

  React.useEffect(() => {
    zonesApi.list().then((r) => setZones(r.data)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (geoLocked) return;
    statesApi.list().then((r) => setStates(r.data)).catch(() => {});
  }, [geoLocked]);

  React.useEffect(() => {
    if (geoLocked || filterZone === "all") {
      setFilterStates([]);
      return;
    }
    statesApi.list(filterZone).then((r) => setFilterStates(r.data)).catch(() => {});
  }, [filterZone, geoLocked]);

  const filteredSurveys = React.useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return surveys.filter((s) => {
      if (q) {
        const hay = [s.reference_id, s.provider_name, formatTeamNames(s.team)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterDate && s.survey_date !== filterDate) return false;
      return true;
    });
  }, [surveys, filterSearch, filterDate]);

  const listStats = React.useMemo(() => {
    const pcts = filteredSurveys
      .map((s) => Number(s.percentage_score))
      .filter((n) => !Number.isNaN(n));
    const avgPct =
      pcts.length > 0
        ? Math.round(pcts.reduce((sum, n) => sum + n, 0) / pcts.length)
        : null;
    const excellent = pcts.filter((p) => p >= 70).length;
    const needsImprovement = pcts.filter((p) => p < 70).length;
    return {
      total: filteredSurveys.length,
      avgPct,
      excellent,
      needsImprovement,
    };
  }, [filteredSurveys]);

  const openForm = () => {
    if (!canCreate) return;
    setF(emptyForm(defaultZoneId, defaultStateId));
    setSelectedProviderId("");
    setSelected(null);
    setMode("form");
  };

  const openView = async (row: any) => {
    try {
      const res = await servicomApi.getSatisfactionSurvey(row.reference_id);
      setSelected(res.data);
      setMode("view");
    } catch (err: any) {
      toast.error("Failed to load survey", { description: err.message });
    }
  };

  const resetCreateForm = () => {
    setF(emptyForm(defaultZoneId, defaultStateId));
    setSelectedProviderId("");
    setSelected(null);
    setFormKey((k) => k + 1);
    setMode("form");
  };

  const closeSub = () => {
    if (createOnly) {
      resetCreateForm();
      return;
    }
    setMode("list");
    setSelected(null);
    load();
  };

  const setResponse = (questionId: string, value: string) => {
    setF((p) => ({ ...p, responses: { ...p.responses, [questionId]: value } }));
  };

  const validateDetails = () => {
    if (!f.state_code || !f.provider_name || !f.survey_date) {
      toast.error("State, provider name, and survey date are required.");
      return false;
    }
    return true;
  };

  const validateCategory = (category: string) => {
    const qs = questionsForCategory(category);
    const missing = qs.some((q) => !f.responses[q.id]);
    if (missing) {
      toast.error(`Please answer all ${satisfactionCategoryLabel(category)} questions.`);
      return false;
    }
    return true;
  };

  const leaveForm = () => {
    if (createOnly) onBack();
    else closeSub();
  };

  const handleSave = async () => {
    if (!validateDetails()) return;
    for (const category of SATISFACTION_CATEGORIES) {
      if (!validateCategory(category)) return;
    }
    if (scoreSummary.answered < SATISFACTION_QUESTIONS.length) {
      toast.error("Please answer all survey questions.");
      return;
    }
    setSaving(true);
    try {
      const selectedState = states.find((s) => s.code === f.state_code);
      const zonalCode = f.zonal_code || selectedState?.zonal_code || "";
      if (!zonalCode) {
        toast.error("Could not resolve zone for the selected state.");
        setSaving(false);
        return;
      }
      const payload = {
        provider_name: f.provider_name,
        survey_date: f.survey_date,
        zonal_code: zonalCode,
        state_code: f.state_code,
        team: parseTeamNames(f.teamNames),
        responses: buildResponsesPayload(f.responses),
      };
      if (selected?.reference_id) {
        await servicomApi.updateSatisfactionSurvey(selected.reference_id, payload);
      } else {
        await servicomApi.createSatisfactionSurvey(payload);
      }
      toast.success("Survey saved successfully");
      closeSub();
    } catch (err: any) {
      toast.error("Failed to save survey", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Columns for ShadcnDataTable
  const tableColumns: ColumnDef<any>[] = [
    {
      accessorKey: "reference_id",
      header: "Survey ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#1a7a52]">
          #{row.original.reference_id}
        </span>
      ),
    },
    {
      accessorKey: "survey_date",
      header: "Survey Date",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
          {row.original.survey_date}
        </span>
      ),
    },
    {
      accessorKey: "provider_name",
      header: "Healthcare Provider / Facility",
      cell: ({ row }) => (
        <div className="min-w-[190px]">
          <p className="text-xs font-bold text-slate-900">{row.original.provider_name}</p>
          <span className="text-[11px] text-slate-500 font-normal">
            {row.original.state?.description || row.original.state_code || "State Office"}
          </span>
        </div>
      ),
    },
    {
      id: "geo",
      header: "Zone & State",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 font-semibold">
          {row.original.state?.description || row.original.state_code}
          {row.original.zonal_code && (
            <span className="text-slate-400 font-normal ml-1">({row.original.zonal_code})</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "percentage_score",
      header: "Score & Performance",
      cell: ({ row }) => {
        const score = Number(row.original.percentage_score) || 0;
        const isGood = score >= 70;
        return (
          <Badge
            variant="outline"
            className={`font-black text-xs px-2 py-0.5 rounded-sm tabular-nums ${
              isGood
                ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                : "border-amber-600 text-amber-700 bg-amber-50"
            }`}
          >
            {row.original.total_score}/{row.original.max_score} ({row.original.percentage_score}%)
          </Badge>
        );
      },
    },
    {
      id: "team",
      header: "Survey Team",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-[180px]">
          {formatTeamNames(row.original.team) || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openView(row.original)}
            className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] hover:bg-[#e8f5ee] rounded-sm gap-1"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  const renderDetailsCard = (readOnly: boolean, row?: any, footer?: React.ReactNode) => (
    <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
      <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2.5 px-4 rounded-none m-0">
        <CardTitle className="text-sm font-bold text-slate-800">Survey Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 pb-5 px-4">
        {readOnly && row?.reference_id && (
          <div className="mb-5 pb-4 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Survey Reference</p>
            <p className="text-base font-mono font-bold text-[#1a7a52] mt-0.5">#{row.reference_id}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Survey Date *</Label>
            {readOnly ? (
              <p className="text-sm font-medium">{row?.survey_date}</p>
            ) : (
              <input
                type="date"
                value={f.survey_date}
                onChange={(e) => setF((p) => ({ ...p, survey_date: e.target.value }))}
                className={inputStyling}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">State *</Label>
            {readOnly ? (
              <p className="text-sm font-medium">{row?.state?.description || "—"}</p>
            ) : geoLocked ? (
              <p className="text-sm font-medium text-slate-900">
                {defaultStateName ?? pickGeoLabel(states, f.state_code, "State")}
              </p>
            ) : (
              <Select
                value={f.state_code}
                onValueChange={(v) => {
                  const state = states.find((s) => s.code === v);
                  setSelectedProviderId("");
                  setF((p) => ({
                    ...p,
                    state_code: v,
                    zonal_code: state?.zonal_code || "",
                    provider_name: "",
                  }));
                }}
              >
                <SelectTrigger displayValue={pickGeoLabel(states, f.state_code, "Select state")}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Provider Name *</Label>
            {readOnly ? (
              <p className="text-sm font-medium">{row?.provider_name}</p>
            ) : (
              <AccreditedProviderSelect
                type="hcp"
                stateId={activeStateCode || undefined}
                value={selectedProviderId}
                onChange={(p) => {
                  setSelectedProviderId(p?.id ?? "");
                  setF((prev) => ({ ...prev, provider_name: p?.name ?? "" }));
                }}
                placeholder={activeStateCode ? "Select healthcare facility" : "Select a state first"}
                disabled={!activeStateCode}
              />
            )}
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label className="text-xs font-bold text-slate-700">Team</Label>
            {readOnly ? (
              <p className="text-sm">{formatTeamNames(row?.team) || "—"}</p>
            ) : (
              <div className="space-y-2">
                {f.teamNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      placeholder={`Team member name ${index + 1}`}
                      value={name}
                      onChange={(e) =>
                        setF((p) => ({
                          ...p,
                          teamNames: p.teamNames.map((entry, i) =>
                            i === index ? e.target.value : entry
                          ),
                        }))
                      }
                      className={inputStyling}
                    />
                    {f.teamNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-slate-400 hover:text-rose-600 rounded-sm"
                        onClick={() =>
                          setF((p) => ({
                            ...p,
                            teamNames: p.teamNames.filter((_, i) => i !== index),
                          }))
                        }
                        aria-label={`Remove name ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#1a7a52] text-[#1a7a52] hover:bg-[#e8f5ee] rounded-sm"
                  onClick={() => setF((p) => ({ ...p, teamNames: [...p.teamNames, ""] }))}
                >
                  <Plus className="w-4 h-4" /> Add team member
                </Button>
              </div>
            )}
          </div>
        </div>

        {footer ? (
          <div className="mt-6 pt-4 border-t border-[#d4e8dc] flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const renderQuestionList = (
    questions: typeof SATISFACTION_QUESTIONS[number][],
    responses: Record<string, string>,
    readOnly = false,
    startNumber = 1,
  ) => (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const n = startNumber + i;
        const val = responses[q.id] ?? "";
        const score = val === "yes" ? 1 : val === "no" ? 0 : null;

        return (
          <div
            key={q.id}
            className={`rounded-sm border p-4 transition-colors ${
              val
                ? "border-slate-300 bg-white shadow-xs"
                : "border-slate-200 bg-[#f4f7f5]"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#e8f5ee] text-xs font-bold text-[#1a7a52]">
                  {n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{q.question}</p>
                </div>
                {val && !readOnly && (
                  <CheckCircle2 className="w-5 h-5 text-[#1a7a52] shrink-0 md:hidden" />
                )}
              </div>

              {readOnly ? (
                <div className="flex items-center gap-3 shrink-0 md:pl-0 pl-10">
                  {val ? (
                    <Badge
                      className={
                        val === "yes"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                          : "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                      }
                    >
                      {val === "yes" ? "Yes" : "No"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                  {score !== null && (
                    <span className="text-xs text-slate-500 font-medium">
                      Score: <strong>{score}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <fieldset className="shrink-0 md:pl-0 pl-10">
                  <legend className="sr-only">{q.question}</legend>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {YES_NO_OPTIONS.map((o) => {
                      const checked = val === o.value;
                      return (
                        <label
                          key={o.value}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-sm border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                            checked
                              ? "border-[#1a7a52] bg-[#e8f5ee] text-[#1a7a52] shadow-xs"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#1a7a52] hover:bg-[#f4f7f5]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`sat-${q.id}`}
                            value={o.value}
                            checked={checked}
                            onChange={() => setResponse(q.id, o.value)}
                            className="sr-only"
                          />
                          <span
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              checked ? "border-[#1a7a52]" : "border-slate-300"
                            }`}
                          >
                            {checked && <span className="h-1.5 w-1.5 rounded-full bg-[#1a7a52]" />}
                          </span>
                          {o.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAllQuestions = (responses: Record<string, string>, readOnly = false) => {
    let questionNumber = 1;
    return (
      <div className="space-y-4">
        {SATISFACTION_CATEGORIES.map((category) => {
          const questions = questionsForCategory(category);
          const start = questionNumber;
          questionNumber += questions.length;
          return (
            <Card key={category} className="rounded-sm border border-slate-200/80 shadow-xs overflow-hidden bg-white p-0 gap-0">
              <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2.5 px-4 rounded-none m-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {satisfactionCategoryLabel(category)}
                  </CardTitle>
                  {!readOnly && (
                    <Badge variant="outline" className="text-[10px] font-bold border-[#1a7a52] text-[#1a7a52] bg-white">
                      {questions.filter((q) => responses[q.id]).length} / {questions.length} Answered
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-5">
                {renderQuestionList(questions, responses, readOnly, start)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // FORM VIEW
  if (mode === "form") {
    const formActions = (
      <>
        <Button variant="outline" onClick={leaveForm} className="rounded-sm border-slate-300">
          Cancel
        </Button>
        <Button
          onClick={() => submitConfirm.requestSubmit(handleSave)}
          disabled={saving}
          className="bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold gap-2 rounded-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Survey
        </Button>
      </>
    );

    return (
      <PageLayout
        key={formKey}
        title="New HCF Customer Satisfaction Survey"
        onBack={leaveForm}
        maxWidth="5xl"
        actions={
          <Badge variant="outline" className="text-xs font-bold border border-[#1a7a52] text-[#1a7a52] shrink-0 bg-[#f4f7f5] rounded-sm">
            {scoreSummary.answered} / {SATISFACTION_QUESTIONS.length} answered
          </Badge>
        }
      >
        <div className="w-full space-y-4 pb-8">
          {renderDetailsCard(false)}
          {renderAllQuestions(f.responses, false)}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {formActions}
          </div>
        </div>
        <SubmitConfirmModal
          open={submitConfirm.open}
          busy={submitConfirm.busy || saving}
          onConfirm={submitConfirm.confirm}
          onCancel={submitConfirm.cancel}
        />
      </PageLayout>
    );
  }

  // SINGLE SURVEY VIEW MODE
  if (mode === "view") {
    const row = selected;
    const responses = parseStoredResponses(row?.responses);

    return (
      <PageLayout
        title="HCF Customer Satisfaction Survey Detail"
        onBack={closeSub}
        maxWidth="5xl"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={closeSub}
            className="rounded-sm border-[#1a7a52] text-[#1a7a52] font-bold text-xs"
          >
            Back to Register
          </Button>
        }
      >
        <div className="w-full space-y-4 pb-8">
          {renderDetailsCard(true, row ?? undefined)}
          {renderAllQuestions(responses, true)}
        </div>
      </PageLayout>
    );
  }

  // MAIN WORKSPACE VIEW (Register)
  return (
    <PageLayout
      title="HCF Customer Satisfaction Survey"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="h-8.5 bg-orange-action hover:bg-orange-600 text-white text-xs font-bold gap-1.5 rounded-sm shadow-md shadow-orange-500/15"
              onClick={openForm}
            >
              <Plus className="w-3.5 h-3.5" /> New Survey
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-4 pb-8"
    >
      <div className="w-full space-y-4">
        <RegisterStatsCards
          loading={loading}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          stats={[
            { label: "Total", value: listStats.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
            {
              label: "Avg satisfaction",
              value: listStats.avgPct != null ? `${listStats.avgPct}%` : "—",
              tone: "text-teal-800 bg-teal-50/80 border-teal-100",
            },
            {
              label: "Excellent (≥70%)",
              value: listStats.excellent,
              tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
            },
            {
              label: "Needs improvement",
              value: listStats.needsImprovement,
              tone: "text-amber-800 bg-amber-50/80 border-amber-100",
            },
          ]}
        />

        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
            <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
              {!geoLocked && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Zone</Label>
                    <Select
                      value={filterZone}
                      onValueChange={(v) => {
                        setFilterZone(v);
                        setFilterState("all");
                      }}
                    >
                      <SelectTrigger className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}>
                        <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.zonal_code} value={z.zonal_code}>
                            {z.description || z.name || z.zonal_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Select value={filterState} onValueChange={setFilterState}>
                      <SelectTrigger
                        className="w-full"
                        displayValue={
                          filterState === "all"
                            ? "All States"
                            : pickGeoLabel(filterStates.length ? filterStates : states, filterState, "State")
                        }
                      >
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {(filterStates.length ? filterStates : states).map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.description || s.name || s.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Survey date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="SURVEY SUBMISSIONS REGISTER"
            infoTooltip="Comprehensive register of accredited healthcare facility customer satisfaction survey assessments."
            columns={tableColumns}
            data={filteredSurveys}
            loading={loading}
            searchPlaceholder="Search provider, ID, team..."
            searchValue={filterSearch}
            onSearchChange={setFilterSearch}
            onRowClick={openView}
            emptyMessage="No customer satisfaction surveys found for the selected criteria."
            pageSize={50}
            enableSelection={false}
            showTableOptions={false}
          />
        </div>
    </PageLayout>
  );
}
