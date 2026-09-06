import * as React from "react";
import { ArrowLeft, ArrowRight, Save, CheckCircle2, Info, ClipboardList, Hospital, BarChart3, Eye, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { annualReportApi } from "@/lib/api";
import type { AnnualReportPayload } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "general" | "clinical" | "quarterly" | "review";
interface QuarterRow { q1: string; q2: string; q3: string; q4: string; }
const emptyQuarter = (): QuarterRow => ({ q1: "", q2: "", q3: "", q4: "" });

interface GeneralInfo {
  year: string; state: string; staffNo: string; totalVehicles: string;
  totalHCF: string; totalAccreditedHCF2025: string;
  approvedBudget2025: string; totalAmountUtilized2025: string;
}
interface ClinicalData {
  totalAccreditedCEmONC: string; totalCEmONCBeneficiaries: string;
  totalAccreditedFFP: string; totalFFPBeneficiaries: string;
}
interface QuarterlyData {
  gifshipEnrolments: QuarterRow; premiumGIFSHIP: QuarterRow; ops: QuarterRow;
  newEnrolmentsFSSHIP: QuarterRow; extraDependants: QuarterRow;
  premiumExtraDependant: QuarterRow; additionalDependants: QuarterRow;
  changeOfProvider: QuarterRow;
}
interface AnnualReportFormProps {
  onBack: () => void;
  onSubmit: (referenceId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];
const YEARS = ["2025","2024","2023","2022"];
const QUARTERLY_FIELDS: { key: keyof QuarterlyData; label: string }[] = [
  { key: "gifshipEnrolments",    label: "GIFSHIP Enrolments" },
  { key: "premiumGIFSHIP",       label: "Premium on GIFSHIP" },
  { key: "ops",                  label: "OPS" },
  { key: "newEnrolmentsFSSHIP",  label: "New Enrolments / Mop-up (FSSHIP)" },
  { key: "extraDependants",      label: "Extra Dependants" },
  { key: "premiumExtraDependant",label: "Premium on Extra-Dependant" },
  { key: "additionalDependants", label: "Additional Dependants" },
  { key: "changeOfProvider",     label: "Change of Provider" },
];
const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "general",   label: "General Info",   icon: <ClipboardList className="w-4 h-4" /> },
  { id: "clinical",  label: "Clinical Data",  icon: <Hospital className="w-4 h-4" /> },
  { id: "quarterly", label: "Quarterly Data", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "review",    label: "Review",         icon: <Eye className="w-4 h-4" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const subTotal = (row: QuarterRow) =>
  [row.q1, row.q2, row.q3, row.q4].reduce((s, v) => s + (parseFloat(v) || 0), 0);
const fmt = (n: number) => n === 0 ? "—" : n.toLocaleString();

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 z-0" />
        <div className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} />
        {STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done ? "bg-primary border-primary text-white" :
                active ? "bg-white border-primary text-primary shadow-lg shadow-primary/20" :
                "bg-white border-slate-200 text-slate-400"}`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${active ? "text-primary" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuarterInputRow({ label, value, onChange }: {
  label: string; value: QuarterRow; onChange: (v: QuarterRow) => void;
}) {
  const total = subTotal(value);
  const set = (k: keyof QuarterRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-700 pr-2">{label}</span>
      {(["q1","q2","q3","q4"] as const).map(q => (
        <Input key={q} type="number" min="0" placeholder="0" value={value[q]}
          onChange={set(q)} className="text-center h-9 text-sm" />
      ))}
      <div className={`text-center text-sm font-semibold rounded px-2 py-1 ${total > 0 ? "bg-primary/10 text-primary" : "text-slate-400"}`}>
        {fmt(total)}
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value || "—"}</span>
    </div>
  );
}

function ReviewQuarterRow({ label, value }: { label: string; value: QuarterRow }) {
  const total = subTotal(value);
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center py-1.5 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {(["q1","q2","q3","q4"] as const).map(q => (
        <span key={q} className="text-center font-medium">{value[q] || "—"}</span>
      ))}
      <span className={`text-center font-bold ${total > 0 ? "text-primary" : "text-slate-400"}`}>{fmt(total)}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnnualReportForm({ onBack, onSubmit }: AnnualReportFormProps) {
  const [step, setStep] = React.useState<Step>("general");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [draftRefId, setDraftRefId] = React.useState<string | null>(null);

  const [general, setGeneral] = React.useState<GeneralInfo>({
    year: "2025", state: "", staffNo: "", totalVehicles: "",
    totalHCF: "", totalAccreditedHCF2025: "", approvedBudget2025: "", totalAmountUtilized2025: "",
  });
  const [clinical, setClinical] = React.useState<ClinicalData>({
    totalAccreditedCEmONC: "", totalCEmONCBeneficiaries: "",
    totalAccreditedFFP: "", totalFFPBeneficiaries: "",
  });
  const [quarterly, setQuarterly] = React.useState<QuarterlyData>({
    gifshipEnrolments: emptyQuarter(), premiumGIFSHIP: emptyQuarter(),
    ops: emptyQuarter(), newEnrolmentsFSSHIP: emptyQuarter(),
    extraDependants: emptyQuarter(), premiumExtraDependant: emptyQuarter(),
    additionalDependants: emptyQuarter(), changeOfProvider: emptyQuarter(),
  });

  const stepIdx = STEPS.findIndex(s => s.id === step);

  const buildPayload = (status: "draft" | "submitted"): AnnualReportPayload => ({
    general, clinical, quarterly, status,
    submitted_by: general.state ? `SO - ${general.state}` : undefined,
  });

  const handleSaveDraft = async () => {
    if (!general.state || !general.year) {
      toast.error("Select a Year and State before saving a draft.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = buildPayload("draft");
      const res = draftRefId
        ? await annualReportApi.update(draftRefId, payload)
        : await annualReportApi.saveDraft(payload);
      if (!draftRefId) setDraftRefId(res.data.reference_id);
      toast.success("Draft saved", { description: `Reference: ${res.data.reference_id}` });
    } catch (err: any) {
      toast.error("Failed to save draft", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === "general") {
      if (!general.state || !general.year) {
        toast.error("Please select a Year and State before continuing.");
        return;
      }
      setStep("clinical");
    } else if (step === "clinical") {
      setStep("quarterly");
    } else if (step === "quarterly") {
      setStep("review");
    } else {
      setIsSubmitting(true);
      try {
        const payload = buildPayload("submitted");
        const res = draftRefId
          ? await annualReportApi.update(draftRefId, { ...payload, status: "submitted" })
          : await annualReportApi.create(payload);
        const refId: string = res.data.reference_id;
        toast.success("Report submitted successfully", { description: `Reference ID: ${refId}` });
        onSubmit(refId);
      } catch (err: any) {
        toast.error("Submission failed", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step === "general") onBack();
    else if (step === "clinical") setStep("general");
    else if (step === "quarterly") setStep("clinical");
    else setStep("quarterly");
  };

  const gSet = (k: keyof GeneralInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setGeneral(p => ({ ...p, [k]: e.target.value }));
  const cSet = (k: keyof ClinicalData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setClinical(p => ({ ...p, [k]: e.target.value }));
  const setQ = (key: keyof QuarterlyData) => (v: QuarterRow): void => {
    setQuarterly(p => ({ ...p, [key]: v }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : step === "review"
                ? "Submit Report"
                : <>Continue <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-8 space-y-8">
          <Stepper current={step} />

          <AnimatePresence mode="wait">

            {/* STEP 1: GENERAL INFORMATION */}
            {step === "general" && (
              <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>Basic state-level data for the reporting year.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Reporting Year <span className="text-red-500">*</span></Label>
                        <Select value={general.year} onValueChange={v => setGeneral(p => ({ ...p, year: v }))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Year" /></SelectTrigger>
                          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>State <span className="text-red-500">*</span></Label>
                        <Select value={general.state} onValueChange={v => setGeneral(p => ({ ...p, state: v }))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                          <SelectContent>{NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Staff No.</Label>
                        <Input type="number" min="0" placeholder="e.g. 45" value={general.staffNo} onChange={gSet("staffNo")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Vehicles</Label>
                        <Input type="number" min="0" placeholder="e.g. 12" value={general.totalVehicles} onChange={gSet("totalVehicles")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Total HCF Under NHIA</Label>
                        <Input type="number" min="0" placeholder="e.g. 200" value={general.totalHCF} onChange={gSet("totalHCF")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Total Accredited HCFs in {general.year}</Label>
                      <Input type="number" min="0" placeholder="e.g. 180" value={general.totalAccreditedHCF2025} onChange={gSet("totalAccreditedHCF2025")} />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Approved Budget {general.year} (N)</Label>
                        <Input type="number" min="0" placeholder="e.g. 50000000" value={general.approvedBudget2025} onChange={gSet("approvedBudget2025")} />
                        {general.approvedBudget2025
                          ? <p className="text-xs font-semibold text-primary">N {Number(general.approvedBudget2025).toLocaleString()}</p>
                          : <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Enter amount in Naira</p>
                        }
                      </div>
                      <div className="space-y-2">
                        <Label>Total Amount Utilized in Budget {general.year} (N)</Label>
                        <Input type="number" min="0" placeholder="e.g. 42000000" value={general.totalAmountUtilized2025} onChange={gSet("totalAmountUtilized2025")} />
                        {general.totalAmountUtilized2025
                          ? <p className="text-xs font-semibold text-primary">N {Number(general.totalAmountUtilized2025).toLocaleString()}</p>
                          : <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Enter amount in Naira</p>
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* STEP 2: CLINICAL DATA */}
            {step === "clinical" && (
              <motion.div key="clinical" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>CEmONC Data - {general.year}</CardTitle>
                    <CardDescription>Comprehensive Emergency Obstetric and Newborn Care facilities and beneficiaries.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Total Accredited CEmONC HCFs in {general.year}</Label>
                      <Input type="number" min="0" placeholder="0" value={clinical.totalAccreditedCEmONC} onChange={cSet("totalAccreditedCEmONC")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total CEmONC Beneficiaries in {general.year}</Label>
                      <Input type="number" min="0" placeholder="0" value={clinical.totalCEmONCBeneficiaries} onChange={cSet("totalCEmONCBeneficiaries")} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>FFP Data - {general.year}</CardTitle>
                    <CardDescription>Free Family Planning facilities and beneficiaries.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Total Accredited FFP Facilities in {general.year}</Label>
                      <Input type="number" min="0" placeholder="0" value={clinical.totalAccreditedFFP} onChange={cSet("totalAccreditedFFP")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total FFP Beneficiaries in {general.year}</Label>
                      <Input type="number" min="0" placeholder="0" value={clinical.totalFFPBeneficiaries} onChange={cSet("totalFFPBeneficiaries")} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* STEP 3: QUARTERLY DATA */}
            {step === "quarterly" && (
              <motion.div key="quarterly" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quarterly Performance Data - {general.year}</CardTitle>
                    <CardDescription>Enter figures per quarter. Sub-totals are calculated automatically.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 pb-3 border-b border-slate-200 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                      {["Q1","Q2","Q3","Q4"].map(q => (
                        <span key={q} className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">{q}</span>
                      ))}
                      <span className="text-xs font-bold uppercase tracking-wider text-primary text-center">Sub-Total</span>
                    </div>
                    {QUARTERLY_FIELDS.map((f, i) => (
                      <React.Fragment key={i}>
                        <QuarterInputRow label={f.label} value={quarterly[f.key] as QuarterRow} onChange={setQ(f.key)} />
                      </React.Fragment>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* STEP 4: REVIEW */}
            {step === "review" && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">General Information</CardTitle></CardHeader>
                  <CardContent className="space-y-0">
                    <ReviewField label="Reporting Year" value={general.year} />
                    <ReviewField label="State" value={general.state} />
                    <ReviewField label="Staff No." value={general.staffNo} />
                    <ReviewField label="Total Vehicles" value={general.totalVehicles} />
                    <ReviewField label="Total HCF Under NHIA" value={general.totalHCF} />
                    <ReviewField label={`Total Accredited HCFs in ${general.year}`} value={general.totalAccreditedHCF2025} />
                    <ReviewField label={`Approved Budget ${general.year}`} value={general.approvedBudget2025 ? `N ${Number(general.approvedBudget2025).toLocaleString()}` : ""} />
                    <ReviewField label={`Total Amount Utilized ${general.year}`} value={general.totalAmountUtilized2025 ? `N ${Number(general.totalAmountUtilized2025).toLocaleString()}` : ""} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">CEmONC &amp; FFP Data</CardTitle></CardHeader>
                  <CardContent className="space-y-0">
                    <ReviewField label="Accredited CEmONC HCFs" value={clinical.totalAccreditedCEmONC} />
                    <ReviewField label="CEmONC Beneficiaries" value={clinical.totalCEmONCBeneficiaries} />
                    <ReviewField label="Accredited FFP Facilities" value={clinical.totalAccreditedFFP} />
                    <ReviewField label="FFP Beneficiaries" value={clinical.totalFFPBeneficiaries} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Quarterly Data</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 pb-2 border-b border-slate-200 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                      {["Q1","Q2","Q3","Q4"].map(q => (
                        <span key={q} className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">{q}</span>
                      ))}
                      <span className="text-xs font-bold uppercase tracking-wider text-primary text-center">Sub-Total</span>
                    </div>
                    {QUARTERLY_FIELDS.map((f, i) => (
                      <React.Fragment key={i}>
                        <ReviewQuarterRow label={f.label} value={quarterly[f.key] as QuarterRow} />
                      </React.Fragment>
                    ))}
                  </CardContent>
                </Card>
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Please review all entries carefully. Once submitted, the report will be sent for Zonal Director review and cannot be edited.</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Bottom nav */}
          <div className="flex justify-between pt-2 pb-8">
            <Button variant="outline" onClick={handlePrev} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {step === "general" ? "Cancel" : "Back"}
            </Button>
            <span className="flex items-center text-xs text-muted-foreground">
              Step {stepIdx + 1} of {STEPS.length}
            </span>
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : step === "review"
                  ? "Submit Report"
                  : <>Continue <ArrowRight className="w-4 h-4" /></>
              }
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
