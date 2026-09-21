import * as React from "react";
import {
  ArrowLeft, Save, Send, Loader2, Plus, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { servicomApi, stockApi } from "@/lib/api";
import {
  MONITORING_TYPES, FACILITY_TYPES, SCORE_LABELS,
  computeLiveScore, pickGeoLabel, pickLabel, pickScoreLabel, PRIORITY_OPTIONS,
} from "./servicomConstants";

interface Props {
  visitId?: number | null;
  onBack: () => void;
  /** Called after successful submit; defaults to onBack */
  onSubmitted?: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type FindingRow = { finding_type: "strength" | "challenge"; description: string };
type RecRow = { description: string; priority: string; responsible_officer: string; timeline: string; status: string };

export default function ServicomVisitForm({ visitId, onBack, onSubmitted, defaultStateId, defaultZoneId }: Props) {
  const [loading, setLoading] = React.useState(!!visitId);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(visitId ?? null);
  const [refId, setRefId] = React.useState<string | null>(null);
  const [indicators, setIndicators] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [scores, setScores] = React.useState<Record<number, number>>({});
  const [strengths, setStrengths] = React.useState<FindingRow[]>([{ finding_type: "strength", description: "" }]);
  const [challenges, setChallenges] = React.useState<FindingRow[]>([{ finding_type: "challenge", description: "" }]);
  const [recommendations, setRecommendations] = React.useState<RecRow[]>([{
    description: "", priority: "medium", responsible_officer: "", timeline: "", status: "open",
  }]);
  const [evidence, setEvidence] = React.useState<any[]>([]);

  const [f, setF] = React.useState({
    zone_id: defaultZoneId ?? "",
    state_id: defaultStateId ?? "",
    lga: "", facility_name: "", facility_type: "public",
    address: "", contact_person: "", phone: "", email: "",
    visit_date: new Date().toISOString().slice(0, 10),
    monitoring_type: "routine", monitoring_officer: "",
  });
  const [kpi, setKpi] = React.useState({
    enrollees_served: "", avg_waiting_time_mins: "",
    complaints_received: "", complaints_resolved: "",
    claims_within_timeline: "", beneficiary_satisfaction_rate: "",
    facilities_meeting_standards: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const live = computeLiveScore(scores);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data)).catch(() => {});
    servicomApi.getIndicators().then((r) => setIndicators(r.data)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!f.zone_id) return;
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id]);

  React.useEffect(() => {
    if (!visitId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await servicomApi.getVisit(visitId);
        const v = res.data;
        setSavedId(v.id);
        setRefId(v.reference_id);
        setF({
          zone_id: String(v.zone_id), state_id: String(v.state_id),
          lga: v.lga || "", facility_name: v.facility_name,
          facility_type: v.facility_type, address: v.address || "",
          contact_person: v.contact_person || "", phone: v.phone || "", email: v.email || "",
          visit_date: v.visit_date, monitoring_type: v.monitoring_type,
          monitoring_officer: v.monitoring_officer || "",
        });
        const sc: Record<number, number> = {};
        (v.scores || []).forEach((s: any) => { sc[s.indicator_id] = s.score; });
        setScores(sc);
        if (v.kpi) {
          setKpi({
            enrollees_served: String(v.kpi.enrollees_served ?? ""),
            avg_waiting_time_mins: String(v.kpi.avg_waiting_time_mins ?? ""),
            complaints_received: String(v.kpi.complaints_received ?? ""),
            complaints_resolved: String(v.kpi.complaints_resolved ?? ""),
            claims_within_timeline: String(v.kpi.claims_within_timeline ?? ""),
            beneficiary_satisfaction_rate: String(v.kpi.beneficiary_satisfaction_rate ?? ""),
            facilities_meeting_standards: String(v.kpi.facilities_meeting_standards ?? ""),
          });
        }
        const str = (v.findings || []).filter((x: any) => x.finding_type === "strength");
        const ch = (v.findings || []).filter((x: any) => x.finding_type === "challenge");
        setStrengths(str.length ? str : [{ finding_type: "strength", description: "" }]);
        setChallenges(ch.length ? ch : [{ finding_type: "challenge", description: "" }]);
        setRecommendations(v.recommendations?.length ? v.recommendations : recommendations);
        setEvidence(v.evidence || []);
      } catch (err: any) {
        toast.error("Failed to load visit", { description: err.message });
      } finally { setLoading(false); }
    })();
  }, [visitId]);

  const n = (v: string) => (v === "" ? null : Number(v));

  const buildPayload = (status = "draft") => ({
    ...f,
    zone_id: Number(f.zone_id),
    state_id: Number(f.state_id),
    status,
    scores: Object.entries(scores).map(([indicator_id, score]) => ({
      indicator_id: Number(indicator_id), score,
    })),
    kpi: {
      enrollees_served: n(kpi.enrollees_served),
      avg_waiting_time_mins: n(kpi.avg_waiting_time_mins),
      complaints_received: n(kpi.complaints_received),
      complaints_resolved: n(kpi.complaints_resolved),
      claims_within_timeline: n(kpi.claims_within_timeline),
      beneficiary_satisfaction_rate: n(kpi.beneficiary_satisfaction_rate),
      facilities_meeting_standards: n(kpi.facilities_meeting_standards),
    },
    findings: [
      ...strengths.filter((s) => s.description.trim()),
      ...challenges.filter((c) => c.description.trim()),
    ],
    recommendations: recommendations.filter((r) => r.description.trim()),
  });

  const validate = () => {
    if (!f.zone_id || !f.state_id || !f.facility_name || !f.visit_date) {
      toast.error("Complete zone, state, facility name and visit date.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload("draft");
      const res = savedId
        ? await servicomApi.updateVisit(savedId, payload)
        : await servicomApi.createVisit(payload);
      setSavedId(res.data.id);
      setRefId(res.data.reference_id);
      toast.success("Draft saved", { description: res.data.reference_id });
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let id = savedId;
      if (!id) {
        const res = await servicomApi.createVisit(buildPayload("draft"));
        id = res.data.id;
        setSavedId(id);
        setRefId(res.data.reference_id);
      } else {
        await servicomApi.updateVisit(id, buildPayload("draft"));
      }
      await servicomApi.submitVisit(id!);
      toast.success("Visit submitted for review");
      (onSubmitted ?? onBack)();
    } catch (err: any) {
      toast.error("Submit failed", { description: err.message });
    } finally { setSubmitting(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedId) {
      if (!savedId) toast.error("Save draft first before uploading evidence.");
      return;
    }
    try {
      const res = await servicomApi.uploadEvidence(savedId, file);
      setEvidence((prev) => [...prev, res.data]);
      toast.success("Evidence uploaded");
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" /><span>Loading visit...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {live.percentage > 0 && (
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500">Live Score</p>
            <p className="text-sm font-bold text-[#25a872]">{live.percentage}% — {live.label}</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-24">
          {/* Visit details */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Visit Details</CardTitle>
              <CardDescription className="text-xs">Facility and monitoring information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select value={f.zone_id} onValueChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: "" }))}>
                  <SelectTrigger className="w-full" displayValue={pickGeoLabel(zones, f.zone_id, "Select zone")}>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={f.state_id} onValueChange={(v) => setF((p) => ({ ...p, state_id: v }))}>
                  <SelectTrigger className="w-full" displayValue={pickGeoLabel(states, f.state_id, "Select state")}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>LGA</Label><Input value={f.lga} onChange={set("lga")} /></div>
              <div className="space-y-2"><Label>Facility Name *</Label><Input value={f.facility_name} onChange={set("facility_name")} /></div>
              <div className="space-y-2">
                <Label>Facility Type</Label>
                <Select value={f.facility_type} onValueChange={(v) => setF((p) => ({ ...p, facility_type: v }))}>
                  <SelectTrigger className="w-full" displayValue={pickLabel(FACILITY_TYPES, f.facility_type, "Facility type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{FACILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Visit Date *</Label><Input type="date" value={f.visit_date} onChange={set("visit_date")} /></div>
              <div className="space-y-2">
                <Label>Monitoring Type</Label>
                <Select value={f.monitoring_type} onValueChange={(v) => setF((p) => ({ ...p, monitoring_type: v }))}>
                  <SelectTrigger className="w-full" displayValue={pickLabel(MONITORING_TYPES, f.monitoring_type, "Monitoring type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{MONITORING_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Monitoring Officer</Label><Input value={f.monitoring_officer} onChange={set("monitoring_officer")} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input value={f.address} onChange={set("address")} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={f.contact_person} onChange={set("contact_person")} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={f.phone} onChange={set("phone")} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
            </CardContent>
          </Card>

          {/* Assessment scores */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SERVICOM Compliance Assessment</CardTitle>
              <CardDescription className="text-xs">Score each indicator: 1 (Very Poor) to 5 (Excellent)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {indicators.map((ind) => (
                  <div key={ind.id} className="space-y-2 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                    <Label className="text-sm font-medium leading-snug block">{ind.label}</Label>
                    <Select
                      value={scores[ind.id] ? String(scores[ind.id]) : ""}
                      onValueChange={(v) => setScores((p) => ({ ...p, [ind.id]: Number(v) }))}
                    >
                      <SelectTrigger className="w-full"
                        displayValue={pickScoreLabel(scores[ind.id] ? String(scores[ind.id]) : "")}>
                        <SelectValue placeholder="Score" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <SelectItem key={s} value={String(s)}>{s} — {SCORE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {live.percentage > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-[#f0fdf7] border border-[#d4e8dc] flex flex-wrap gap-4">
                  <div><p className="text-xs text-slate-500">Total Score</p><p className="font-bold">{live.total}</p></div>
                  <div><p className="text-xs text-slate-500">Percentage</p><p className="font-bold text-[#25a872]">{live.percentage}%</p></div>
                  <div><p className="text-xs text-slate-500">Rating</p><p className="font-bold">{live.label}</p></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPI */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3"><CardTitle className="text-sm">KPI Monitoring</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                ["enrollees_served", "Enrollees Served"],
                ["avg_waiting_time_mins", "Avg Waiting Time (mins)"],
                ["complaints_received", "Complaints Received"],
                ["complaints_resolved", "Complaints Resolved"],
                ["claims_within_timeline", "Claims Within Timeline"],
                ["beneficiary_satisfaction_rate", "Beneficiary Satisfaction Rate"],
                ["facilities_meeting_standards", "Facilities Meeting Standards"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min="0" value={kpi[key]}
                    onChange={(e) => setKpi((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Findings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Strengths</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setStrengths((p) => [...p, { finding_type: "strength", description: "" }])}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {strengths.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Describe strength..." value={s.description}
                      onChange={(e) => setStrengths((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                    {strengths.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setStrengths((p) => p.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Challenges</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setChallenges((p) => [...p, { finding_type: "challenge", description: "" }])}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {challenges.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Describe challenge..." value={c.description}
                      onChange={(e) => setChallenges((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                    {challenges.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setChallenges((p) => p.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Recommendations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setRecommendations((p) => [...p, { description: "", priority: "medium", responsible_officer: "", timeline: "", status: "open" }])}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map((r, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={r.description} onChange={(e) => setRecommendations((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={r.priority} onValueChange={(v) => setRecommendations((p) => p.map((x, j) => j === i ? { ...x, priority: v } : x))}>
                      <SelectTrigger className="w-full" displayValue={pickLabel(PRIORITY_OPTIONS, r.priority, "Priority")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timeline</Label>
                    <Input type="date" value={r.timeline} onChange={(e) => setRecommendations((p) => p.map((x, j) => j === i ? { ...x, timeline: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Responsible Officer</Label>
                    <Input value={r.responsible_officer} onChange={(e) => setRecommendations((p) => p.map((x, j) => j === i ? { ...x, responsible_officer: e.target.value } : x))} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Evidence</CardTitle>
              <CardDescription className="text-xs">Photos, PDFs, documents, audio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[#d4e8dc] cursor-pointer hover:bg-[#f0fdf7] text-sm">
                <Upload className="w-4 h-4" /> Upload file
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,audio/*" onChange={handleUpload} />
              </label>
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50">
                  <span className="font-medium truncate">{ev.file_name}</span>
                  <span className="text-xs text-slate-400">{ev.uploaded_by}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {live.percentage > 0 ? (
          <div className="sm:hidden text-center">
            <p className="text-xs text-slate-500">Live Score</p>
            <p className="text-sm font-bold text-[#25a872]">{live.percentage}% — {live.label}</p>
          </div>
        ) : <div />}
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2 flex-1 sm:flex-none">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 flex-1 sm:flex-none" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
