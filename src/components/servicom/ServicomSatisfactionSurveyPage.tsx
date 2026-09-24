import * as React from "react";
import { ArrowLeft, Plus, RefreshCw, Loader2, ClipboardCheck, Eye, Search, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { servicomApi, stockApi } from "@/lib/api";
import { pickGeoLabel } from "./servicomConstants";
import AccreditedProviderSelect from "@/src/components/stateOffice/AccreditedProviderSelect";
import {
  SATISFACTION_QUESTIONS,
  SATISFACTION_CATEGORIES,
  YES_NO_OPTIONS,
  computeSatisfactionScore,
  questionsForCategory,
  satisfactionCategoryLabel,
} from "./servicomSurveyConstants";
import { SubmitConfirmModal, useReportingOfficerSubmitConfirm } from "@/src/components/SubmitConfirmModal";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  defaultStateName?: string;
  defaultZoneName?: string;
  userName?: string;
  canCreate?: boolean;
  canReview?: boolean;
}

const emptyForm = (
  defaultZoneId?: string | null,
  defaultStateId?: string | null,
  userName?: string,
) => ({
  reference_id: "",
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  provider_name: "",
  survey_date: new Date().toISOString().slice(0, 10),
  survey_officers: userName ?? "",
  team: "",
  responses: {} as Record<string, string>,
});

function parseStoredResponses(raw: unknown): Record<string, string> {
  let rows: { question_id: string; response?: string }[] = [];
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
  return Object.fromEntries(rows.map((r) => [r.question_id, r.response ?? ""]));
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
  userName,
  canCreate = true,
  canReview = true,
}: Props) {
  const createOnly = canCreate && !canReview;
  const geoLocked = !!(defaultZoneId && defaultStateId);
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const [mode, setMode] = React.useState<"list" | "form" | "view">(createOnly ? "form" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [filterStates, setFilterStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId, userName));

  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [filterSearch, setFilterSearch] = React.useState("");
  const [filterDate, setFilterDate] = React.useState("");
  const [selectedProviderId, setSelectedProviderId] = React.useState("");

  const scoreSummary = React.useMemo(() => computeSatisfactionScore(f.responses), [f.responses]);
  const activeStateId = defaultStateId ?? f.state_id;

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await servicomApi.listSatisfactionSurveys({
        state_id: geoLocked ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
        zone_id: geoLocked ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
      });
      setSurveys(res.data);
    } catch (err: any) {
      toast.error("Failed to load surveys", { description: err.message });
    } finally { setLoading(false); }
  }, [defaultStateId, defaultZoneId, filterState, filterZone, geoLocked, createOnly]);

  React.useEffect(() => { if (mode === "list" && !createOnly) load(); }, [load, mode, createOnly]);
  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data)).catch(() => {});
  }, []);
  React.useEffect(() => {
    if (geoLocked) return;
    stockApi.getStates().then((r) => setStates(r.data)).catch(() => {});
  }, [geoLocked]);
  React.useEffect(() => {
    if (geoLocked || filterZone === "all") { setFilterStates([]); return; }
    stockApi.getStates(filterZone).then((r) => setFilterStates(r.data)).catch(() => {});
  }, [filterZone, geoLocked]);

  const filteredSurveys = React.useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return surveys.filter((s) => {
      if (q) {
        const hay = [s.reference_id, s.provider_name, s.survey_officers, s.team]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterDate && s.survey_date !== filterDate) return false;
      return true;
    });
  }, [surveys, filterSearch, filterDate]);

  const openForm = () => {
    if (!canCreate) return;
    setF(emptyForm(defaultZoneId, defaultStateId, userName));
    setSelectedProviderId("");
    setSelected(null);
    setMode("form");
  };

  const openView = async (row: any) => {
    try {
      const res = await servicomApi.getSatisfactionSurvey(row.id);
      setSelected(res.data);
      setMode("view");
    } catch (err: any) {
      toast.error("Failed to load survey", { description: err.message });
    }
  };

  const resetCreateForm = () => {
    setF(emptyForm(defaultZoneId, defaultStateId, userName));
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
    if (!f.state_id || !f.provider_name || !f.survey_date) {
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
      const payload = {
        ...f,
        reference_id: f.reference_id.trim() || undefined,
        zone_id: f.zone_id ? Number(f.zone_id) : null,
        state_id: f.state_id ? Number(f.state_id) : null,
        responses: buildResponsesPayload(f.responses),
      };
      if (selected?.id) await servicomApi.updateSatisfactionSurvey(selected.id, payload);
      else await servicomApi.createSatisfactionSurvey(payload);
      toast.success("Survey saved");
      closeSub();
    } catch (err: any) {
      toast.error("Failed to save survey", { description: err.message });
    } finally { setSaving(false); }
  };

  const renderDetailsCard = (readOnly: boolean, row?: any, footer?: React.ReactNode) => (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
      <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
        <CardTitle className="text-sm font-bold text-[#145c3f]">Survey Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 pb-5">
        {readOnly && row?.reference_id && (
          <div className="mb-5 pb-4 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Survey ID</p>
            <p className="text-sm font-mono font-bold text-primary mt-0.5">{row.reference_id}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Survey Date *</Label>
            {readOnly ? (
              <p className="text-sm">{row?.survey_date}</p>
            ) : (
              <Input
                type="date"
                value={f.survey_date}
                onChange={(e) => setF((p) => ({ ...p, survey_date: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">State *</Label>
            {readOnly ? (
              <Input
                readOnly
                value={row?.state?.description || "—"}
                className="bg-slate-50 text-slate-800"
              />
            ) : geoLocked ? (
              <Input
                readOnly
                value={defaultStateName ?? pickGeoLabel(states, f.state_id, "State")}
                className="bg-slate-50 text-slate-800 font-medium"
              />
            ) : (
              <Select value={f.state_id} onValueChange={(v) => {
                const state = states.find((s) => String(s.id) === v);
                setSelectedProviderId("");
                setF((p) => ({
                  ...p,
                  state_id: v,
                  zone_id: state?.zonal_id ? String(state.zonal_id) : "",
                  provider_name: "",
                }));
              }}>
                <SelectTrigger displayValue={pickGeoLabel(states, f.state_id, "Select state")}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Provider Name *</Label>
            {readOnly ? (
              <p className="text-sm font-medium">{row?.provider_name}</p>
            ) : (
              <AccreditedProviderSelect
                type="hcp"
                stateId={activeStateId || undefined}
                value={selectedProviderId}
                onChange={(p) => {
                  setSelectedProviderId(p?.id ?? "");
                  setF((prev) => ({ ...prev, provider_name: p?.name ?? "" }));
                }}
                placeholder={activeStateId ? "Select healthcare facility" : "Select a state first"}
                disabled={!activeStateId}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Survey Officer(s)</Label>
            {readOnly ? (
              <p className="text-sm">{row?.survey_officers || "—"}</p>
            ) : (
              <Input
                placeholder="Officer name(s)"
                value={f.survey_officers}
                onChange={(e) => setF((p) => ({ ...p, survey_officers: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Team</Label>
            {readOnly ? (
              <p className="text-sm">{row?.team || "—"}</p>
            ) : (
              <Input
                placeholder="Survey team"
                value={f.team}
                onChange={(e) => setF((p) => ({ ...p, team: e.target.value }))}
              />
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
    <div className="space-y-4">
      {questions.map((q, i) => {
        const n = startNumber + i;
        const val = responses[q.id] ?? "";
        const score = val === "yes" ? 1 : val === "no" ? 0 : null;

        return (
          <div
            key={q.id}
            className={`rounded-xl border p-4 md:p-5 transition-colors ${
              val ? "border-[#d4e8dc] bg-white" : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-xs font-bold text-[#145c3f]">
                  {n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{q.question}</p>
                </div>
                {val && !readOnly && (
                  <CheckCircle2 className="w-5 h-5 text-[#25a872] shrink-0 md:hidden" />
                )}
              </div>

              {readOnly ? (
                <div className="flex items-center gap-3 shrink-0 md:pl-0 pl-10">
                  {val ? (
                    <Badge className={val === "yes" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"}>
                      {val === "yes" ? "Yes" : "No"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                  {score !== null && (
                    <span className="text-xs text-slate-500">Score: <strong>{score}</strong></span>
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
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            checked
                              ? "border-[#25a872] bg-[#e8f5ee] text-[#145c3f] shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#d4e8dc] hover:bg-[#f8fbf9]"
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
                            className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              checked ? "border-[#25a872]" : "border-slate-300"
                            }`}
                          >
                            {checked && <span className="h-2 w-2 rounded-full bg-[#25a872]" />}
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
            <Card key={category} className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-[#145c3f]">
                    {satisfactionCategoryLabel(category)}
                  </CardTitle>
                  {!readOnly && (
                    <Badge variant="outline" className="text-[10px] font-semibold bg-white">
                      {questions.filter((q) => responses[q.id]).length} / {questions.length}
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

  if (mode === "form") {
    const formActions = (
      <>
        <Button variant="outline" onClick={leaveForm}>Cancel</Button>
        <Button
          onClick={() => submitConfirm.requestSubmit(handleSave)}
          disabled={saving}
          className="bg-orange-action hover:bg-orange-600 gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Survey
        </Button>
      </>
    );

    return (
      <div key={formKey} className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={leaveForm}
              className="rounded-full shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">
                HCF Customer Satisfaction Survey
              </h2>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
            {scoreSummary.answered} / {SATISFACTION_QUESTIONS.length} answered
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-8 space-y-4">
            {renderDetailsCard(false)}
            {renderAllQuestions(f.responses, false)}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {formActions}
            </div>
          </div>
        </ScrollArea>
        <SubmitConfirmModal
          open={submitConfirm.open}
          busy={submitConfirm.busy || saving}
          onConfirm={submitConfirm.confirm}
          onCancel={submitConfirm.cancel}
        />
      </div>
    );
  }

  if (mode === "view") {
    const row = selected;
    const responses = parseStoredResponses(row?.responses);

    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSub}
            className="rounded-full hover:bg-[#e8f5ee] shrink-0"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">HCF Customer Satisfaction Survey</h2>
            {row?.provider_name && (
              <p className="text-xs text-slate-500 truncate">{row.provider_name}</p>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-8 space-y-4">
            {renderDetailsCard(true, row ?? undefined)}
            {renderAllQuestions(responses, true)}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold tracking-tight">HCF Customer Satisfaction Survey</h2>
      </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openForm}>
            <Plus className="w-4 h-4" /> New Survey
          </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search provider, ID, officer..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
                {!geoLocked && (
                  <>
                    <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}>
                      <SelectTrigger displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}>
                        <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterState} onValueChange={setFilterState}>
                      <SelectTrigger displayValue={filterState === "all" ? "All States" : pickGeoLabel(filterStates, filterState, "State")}>
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {filterStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                {loading ? "Loading..." : `${filteredSurveys.length} survey(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : filteredSurveys.length === 0 ? (
                <div className="flex justify-center py-16 text-sm text-slate-400">No surveys found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Provider</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                        <TableHead className="text-xs font-bold">Score</TableHead>
                        <TableHead className="text-xs font-bold">Officer(s)</TableHead>
                        <TableHead className="text-xs font-bold w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSurveys.map((s, i) => (
                        <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-slate-100">
                          <TableCell className="text-xs text-slate-500">{s.survey_date}</TableCell>
                          <TableCell className="text-sm">{s.provider_name}</TableCell>
                          <TableCell className="text-xs">{s.state?.description ?? "—"}</TableCell>
                          <TableCell className="text-sm font-semibold">{s.total_score}/{s.max_score} ({s.percentage_score}%)</TableCell>
                          <TableCell className="text-xs">{s.survey_officers || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(s)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
