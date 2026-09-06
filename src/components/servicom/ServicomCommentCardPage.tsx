import * as React from "react";
import { ArrowLeft, Plus, RefreshCw, Loader2, MessageSquareText, Eye, Search, CheckCircle2 } from "lucide-react";
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
import {
  COMMENT_CARD_QUESTIONS, computeCommentCardScore, commentCardScaleOptions, commentCardResponseLabel,
} from "./servicomSurveyConstants";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  defaultStateName?: string;
  defaultZoneName?: string;
}

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null) => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  respondent_name: "",
  organisation: "",
  card_date: new Date().toISOString().slice(0, 10),
  responses: {} as Record<string, string>,
});

function parseStoredResponses(raw: unknown): Record<string, string> {
  let rows: { question_id: string; response?: string }[] = [];
  if (Array.isArray(raw)) rows = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch { rows = []; }
  }
  return Object.fromEntries(rows.map((r) => [r.question_id, r.response ?? ""]));
}

function buildResponsesPayload(responses: Record<string, string>) {
  return COMMENT_CARD_QUESTIONS.map((q) => {
    const response = responses[q.id] || null;
    const score = response ? Number(response) : null;
    return { question_id: q.id, section: q.section, question: q.question, response, score };
  });
}

export default function ServicomCommentCardPage({
  onBack,
  defaultStateId,
  defaultZoneId,
}: Props) {
  const geoLocked = !!(defaultZoneId && defaultStateId);
  const [mode, setMode] = React.useState<"list" | "form" | "view">("list");
  const [cards, setCards] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [filterStates, setFilterStates] = React.useState<any[]>([]);
  const [formStates, setFormStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState(emptyForm(defaultZoneId, defaultStateId));

  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [filterSearch, setFilterSearch] = React.useState("");
  const [filterDate, setFilterDate] = React.useState("");

  const scoreSummary = React.useMemo(() => computeCommentCardScore(f.responses), [f.responses]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.listCommentCards({
        state_id: geoLocked ? (defaultStateId ?? undefined) : (filterState !== "all" ? filterState : undefined),
        zone_id: geoLocked ? (defaultZoneId ?? undefined) : (filterZone !== "all" ? filterZone : undefined),
      });
      setCards(res.data);
    } catch (err: any) {
      toast.error("Failed to load records", { description: err.message });
    } finally { setLoading(false); }
  }, [defaultStateId, defaultZoneId, filterState, filterZone, geoLocked]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => {
    if (geoLocked || filterZone === "all") { setFilterStates([]); return; }
    stockApi.getStates(filterZone).then((r) => setFilterStates(r.data)).catch(() => {});
  }, [filterZone, geoLocked]);

  React.useEffect(() => {
    stockApi.getStates().then((r) => setFormStates(r.data)).catch(() => setFormStates([]));
  }, []);

  const filteredCards = React.useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return cards.filter((c) => {
      if (q) {
        const hay = [c.reference_id, c.respondent_name, c.organisation]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterDate && c.card_date !== filterDate) return false;
      return true;
    });
  }, [cards, filterSearch, filterDate]);

  const questionKpis = React.useMemo(() => {
    const shortLabels: Record<string, string> = {
      Q01: "Reception",
      Q02: "Courteous",
      Q03: "Professional",
      Q04: "Prompt",
      Q05: "Overall",
    };
    return COMMENT_CARD_QUESTIONS.map((q) => {
      let answered = 0;
      for (const card of filteredCards) {
        const responses = parseStoredResponses(card.responses);
        if (responses[q.id]) answered += 1;
      }
      return {
        id: q.id,
        label: shortLabels[q.id] || q.section,
        answered,
        total: filteredCards.length,
      };
    });
  }, [filteredCards]);

  const openForm = () => {
    setF(emptyForm(defaultZoneId, defaultStateId));
    setSelected(null);
    setMode("form");
  };

  const openView = async (row: any) => {
    try {
      const res = await servicomApi.getCommentCard(row.id);
      setSelected(res.data);
      setMode("view");
    } catch (err: any) {
      toast.error("Failed to load record", { description: err.message });
    }
  };

  const closeSub = () => {
    setMode("list");
    setSelected(null);
    load();
  };

  const setResponse = (questionId: string, value: string) => {
    setF((p) => ({ ...p, responses: { ...p.responses, [questionId]: value } }));
  };

  const handleSave = async () => {
    if (!f.state_id) {
      toast.error("Please select a State.");
      return;
    }
    if (!f.card_date) {
      toast.error("Date is required.");
      return;
    }
    if (scoreSummary.answered < COMMENT_CARD_QUESTIONS.length) {
      toast.error("Please answer all questions.");
      return;
    }
    const selectedState = formStates.find((s) => String(s.id) === String(f.state_id));
    const zoneId = f.zone_id || (selectedState?.zone_id != null ? String(selectedState.zone_id) : "");
    if (!zoneId) {
      toast.error("Could not resolve zone for the selected state.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        respondent_name: f.respondent_name || undefined,
        organisation: f.organisation || undefined,
        card_date: f.card_date,
        zone_id: Number(zoneId),
        state_id: Number(f.state_id),
        responses: buildResponsesPayload(f.responses),
      };
      if (selected?.id) await servicomApi.updateCommentCard(selected.id, payload);
      else await servicomApi.createCommentCard(payload);
      toast.success("Record saved");
      closeSub();
    } catch (err: any) {
      toast.error("Failed to save record", { description: err.message });
    } finally { setSaving(false); }
  };

  const renderDetailsCard = (readOnly: boolean, row?: any) => (
    <></>
    // <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
    //   <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
    //     <CardTitle className="text-sm font-bold text-[#145c3f]">Response Details</CardTitle>
    //   </CardHeader>
    //   <CardContent className="pt-5 pb-5">
       
    //   </CardContent>
    // </Card>
  );

  const renderQuestions = (responses: Record<string, string>, readOnly = false, row?: any) => {
    const answered = COMMENT_CARD_QUESTIONS.filter((q) => responses[q.id]).length;
    const viewScore = readOnly
      ? {
          total: Number(row?.total_score) || computeCommentCardScore(responses).total,
          average: Number(row?.average_score) || computeCommentCardScore(responses).average,
        }
      : null;

    if (readOnly) {
      return (
        <div className="space-y-4">
          <div className="bg-white border-b border-border/50 px-0 py-1 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#145c3f]">Citizens&apos; Comment Card</h2>
              <p className="text-xs text-muted-foreground">Charter Performance response</p>
            </div>
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
            <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold text-[#145c3f]">Response Summary</CardTitle>
                {viewScore && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold bg-white">
                      Total: {viewScore.total}
                    </Badge>
                    <Badge className="text-xs font-semibold bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]">
                      Avg: {Number(viewScore.average).toFixed(2)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Zone</p>
                  <p className="text-sm font-semibold text-slate-800">{row?.zone?.description || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">State</p>
                  <p className="text-sm font-semibold text-slate-800">{row?.state?.description || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Date</p>
                  <p className="text-sm font-semibold text-slate-800">{row?.card_date || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Respondent</p>
                  <p className="text-sm font-semibold text-slate-800">{row?.respondent_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Organisation</p>
                  <p className="text-sm font-semibold text-slate-800">{row?.organisation || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
              <CardTitle className="text-sm font-bold text-[#145c3f]">Responses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold text-slate-600 w-12">#</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Question</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Answer</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right w-24">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMMENT_CARD_QUESTIONS.map((q, i) => {
                      const val = responses[q.id] ?? "";
                      const options = commentCardScaleOptions(q.scale);
                      const selected = options.find((o) => o.value === val);
                      const answer = selected ? commentCardResponseLabel(selected.label) : "—";
                      const score = val ? Number(val) : null;

                      return (
                        <TableRow key={q.id} className="hover:bg-[#f8fbf9]">
                          <TableCell className="text-xs text-slate-400 align-top">{i + 1}</TableCell>
                          <TableCell className="text-sm text-slate-800 align-top">
                            <p className="font-medium leading-snug">{q.question}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{q.section}</p>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-[#145c3f] align-top">{answer}</TableCell>
                          <TableCell className="text-sm font-bold text-slate-800 text-right align-top tabular-nums">
                            {score != null ? score : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                      <TableCell colSpan={3} className="text-sm text-right text-slate-600">
                        Total / Average
                      </TableCell>
                      <TableCell className="text-sm text-right text-primary tabular-nums">
                        {viewScore ? `${viewScore.total} / ${Number(viewScore.average).toFixed(2)}` : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl font-bold text-center text-[#145c3f]">Citizens&apos; Comment Card</CardTitle>
            <Badge variant="outline" className="text-[10px] font-semibold bg-white">
              {answered} / {COMMENT_CARD_QUESTIONS.length} answered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">State *</Label>
              <Select
                value={f.state_id}
                disabled={geoLocked}
                onValueChange={(v) => {
                  const st = formStates.find((s) => String(s.id) === v);
                  setF((p) => ({
                    ...p,
                    state_id: v,
                    zone_id: st?.zone_id != null ? String(st.zone_id) : p.zone_id,
                  }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${geoLocked ? "opacity-70 bg-slate-50" : ""}`}
                  displayValue={pickGeoLabel(formStates, f.state_id, "Select State")}
                >
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {formStates.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Date *</Label>
              <Input
                type="date"
                value={f.card_date}
                onChange={(e) => setF((p) => ({ ...p, card_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Respondent Name</Label>
              <Input
                placeholder="Optional"
                value={f.respondent_name}
                onChange={(e) => setF((p) => ({ ...p, respondent_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
              <Label className="text-xs text-slate-500">Organisation</Label>
              <Input
                placeholder="Organisation name"
                value={f.organisation}
                onChange={(e) => setF((p) => ({ ...p, organisation: e.target.value }))}
              />
            </div>
          </div>

          {COMMENT_CARD_QUESTIONS.map((q, i) => {
            const val = responses[q.id] ?? "";
            const options = commentCardScaleOptions(q.scale);

            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 md:p-5 transition-colors ${
                  val ? "border-[#d4e8dc] bg-white" : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-xs font-bold text-[#145c3f]">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-800 leading-snug pt-0.5">{q.question}</p>
                  {val && (
                    <CheckCircle2 className="w-5 h-5 text-[#25a872] shrink-0 ml-auto" />
                  )}
                </div>

                <fieldset className="pl-10">
                  <legend className="sr-only">{q.question}</legend>
                  <div className="flex flex-wrap gap-2">
                    {options.map((o) => {
                      const checked = val === o.value;
                      const display = commentCardResponseLabel(o.label);
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
                            name={`cc-${q.id}`}
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
                          {display}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            );
          })}

          <div className="flex items-center justify-end gap-3 ml-auto">
            <Button variant="outline" onClick={closeSub}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-action hover:bg-orange-600 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Record
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (mode === "form" || mode === "view") {
    const row = mode === "view" ? selected : null;
    const responses = mode === "view" ? parseStoredResponses(row?.responses) : f.responses;

    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        {/* <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={closeSub} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div> */}

        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-24 space-y-4">
            {renderDetailsCard(mode === "view", row ?? undefined)}
            {renderQuestions(responses, mode === "view", row ?? undefined)}
            {mode === "form" && (
          <div>
            <p className="text-xs text-slate-500 hidden sm:block">
            
            </p>
           
          </div>
        )}
          </div>
        </ScrollArea>

        
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
         <h2 className="text-xl font-bold tracking-tight">Charter  Performance</h2>
         </div>
       
         <div className="flex items-center gap-3"> <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openForm}>
            <Plus className="w-4 h-4" /> New Comment Card
          </Button></div>
         
        
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {questionKpis.map((kpi) => {
              const pct = kpi.total ? Math.round((kpi.answered / kpi.total) * 100) : 0;
              return (
                <div
                  key={kpi.id}
                  className="rounded-xl border border-[#d4e8dc] bg-[#f8fbf9] px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-500 truncate">{kpi.label}</p>
                    <span className="text-[10px] font-semibold tabular-nums text-[#25a872] bg-white border border-[#d4e8dc] rounded-md px-1.5 py-0.5">
                      {loading ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[#145c3f] leading-none">
                    {loading ? "—" : kpi.answered}
                  </p>
                </div>
              );
            })}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search respondent, organisation..."
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
                <MessageSquareText className="w-4 h-4" />
                {loading ? "Loading..." : `${filteredCards.length} record(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : filteredCards.length === 0 ? (
                <div className="flex justify-center py-16 text-sm text-slate-400">No records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Respondent</TableHead>
                        <TableHead className="text-xs font-bold">Organisation</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                        <TableHead className="text-xs font-bold">Avg Score</TableHead>
                        <TableHead className="text-xs font-bold text-right w-24">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCards.map((c, i) => (
                        <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-slate-100">
                          <TableCell className="text-xs text-slate-500">{c.card_date}</TableCell>
                          <TableCell className="text-sm">{c.respondent_name || "—"}</TableCell>
                          <TableCell className="text-sm">{c.organisation || "—"}</TableCell>
                          <TableCell className="text-xs">{c.state?.description ?? "—"}</TableCell>
                          <TableCell className="text-sm font-semibold">{c.average_score ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-semibold gap-1.5 border-[#d4e8dc] hover:bg-[#e8f5ee] hover:text-[#145c3f]"
                              onClick={() => openView(c)}
                            >
                              View
                              <Eye className="w-3.5 h-3.5" />
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
