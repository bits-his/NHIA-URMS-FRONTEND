import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useListSearch } from "./useListSearch";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { RegisterStatsCards } from "./RegisterStatsCards";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Eye,
  Pencil,
  RefreshCw,
  Loader2,
  Save,
  Mail,
  Building2,
  CalendarDays,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeMysteryShoppingApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import {
  ENROLLEE_ITEMS,
  ENROLLEE_MAX,
  ENROLLEE_SCALE,
  FACILITY_TYPES,
  OBSERVATION_ITEMS,
  OBS_MAX,
  STEPS,
  labelOf,
  mapHcfFacilityType,
  optionLabel,
  sumScoreMap,
  type ScoreMap,
} from "./mysteryShoppingConfig";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  embedded?: boolean;
  onChromeChange?: (chrome: {
    mode: "list" | "form" | "detail";
    title?: string;
    onInnerBack?: () => void;
    actions?: React.ReactNode;
  } | null) => void;
}

type Geo = { id?: number | string; code?: string; zonal_code?: string; description: string };
type Mode = "list" | "create" | "edit" | "view";

type FormState = {
  zone_id: string;
  state_id: string;
  email: string;
  mystery_shopper_name: string;
  facility_name: string;
  facility_hcf_id: string;
  facility_nhia_code: string;
  facility_type: string;
  facility_email: string;
  visit_date: string;
  observations: ScoreMap;
  enrollee_card_1: ScoreMap;
  enrollee_card_2: ScoreMap;
  enrollee_card_3: ScoreMap;
  key_strengths: string;
  gaps_identified: string;
  recommendation: string;
  follow_up_action_plan: string;
};

const emptyScores = (): ScoreMap => ({});

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null): FormState => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  email: "",
  mystery_shopper_name: "",
  facility_name: "",
  facility_hcf_id: "",
  facility_nhia_code: "",
  facility_type: "",
  facility_email: "",
  visit_date: new Date().toISOString().slice(0, 10),
  observations: emptyScores(),
  enrollee_card_1: emptyScores(),
  enrollee_card_2: emptyScores(),
  enrollee_card_3: emptyScores(),
  key_strengths: "",
  gaps_identified: "",
  recommendation: "",
  follow_up_action_plan: "",
});

/** Match enrolment form controls: equal height, green border, filled surface. */
const controlClass = cn(
  "h-11 text-sm font-medium",
  "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none",
  "hover:border-[#0f3d2e] hover:bg-white",
  "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20"
);
const searchControlClass = "h-11 px-3.5 text-sm font-medium";

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-600">
        {label.replace(/\s*\*$/, "")}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full min-h-[5.5rem] rounded-sm px-3.5 py-2.5 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-none outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
        props.className
      )}
    />
  );
}

function geoId(o: Geo) {
  return String(o.zonal_code ?? o.code ?? o.id ?? "");
}

function pickGeoLabel(options: Geo[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => geoId(o) === value)?.description ?? fallback;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function asScoreMap(v: unknown): ScoreMap {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v) || {};
    } catch {
      return {};
    }
  }
  if (typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, String(val ?? "")])
    );
  }
  return {};
}

function rowToForm(row: any, fallbackZone?: string | null, fallbackState?: string | null): FormState {
  return {
    zone_id: String(row?.zonal_code ?? row?.zone_id ?? fallbackZone ?? ""),
    state_id: String(row?.state_code ?? row?.state_id ?? fallbackState ?? ""),
    email: row?.email ?? "",
    mystery_shopper_name: row?.mystery_shopper_name ?? "",
    facility_name: row?.facility_name ?? "",
    facility_hcf_id: row?.facility_id ?? row?.facility_hcf_id ?? "",
    facility_nhia_code: row?.facility_nhia_code ?? "",
    facility_type: row?.facility_type ?? "",
    facility_email: row?.facility_email ?? "",
    visit_date: row?.visit_date ? String(row.visit_date).slice(0, 10) : "",
    observations: asScoreMap(row?.observations),
    enrollee_card_1: asScoreMap(row?.enrollee_card_1),
    enrollee_card_2: asScoreMap(row?.enrollee_card_2),
    enrollee_card_3: asScoreMap(row?.enrollee_card_3),
    key_strengths: row?.key_strengths ?? "",
    gaps_identified: row?.gaps_identified ?? "",
    recommendation: row?.recommendation ?? "",
    follow_up_action_plan: row?.follow_up_action_plan ?? "",
  };
}

function ScorePills({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string; score: number }[];
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-sm border-2 px-3.5 py-2 text-left transition-all disabled:opacity-60",
              active
                ? "border-[#145c3f] bg-[#145c3f] text-white shadow-xs"
                : "border-[#d4e8dc] bg-[#f8faf9] text-slate-700 hover:border-[#1a7a52] hover:bg-white"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold leading-snug">{opt.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums font-mono",
                  active ? "bg-white/20 text-white" : "bg-[#e8f3ec] text-[#145c3f]"
                )}
              >
                {opt.score}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-xs font-semibold text-slate-800 break-words whitespace-pre-wrap">
        {value || "—"}
      </div>
    </div>
  );
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const tone = pct >= 75 ? "bg-emerald-600" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <Badge className={`${tone} hover:${tone} text-white font-mono text-[11px]`}>
      {score} / {max}
    </Badge>
  );
}

function answeredCount(map: ScoreMap, keys: readonly { key: string }[]) {
  return keys.filter((k) => map[k.key] !== undefined && map[k.key] !== "").length;
}

const STEP_SHORT_LABELS = [
  "General Info",
  "Observations",
  "Enrollee 1",
  "Enrollee 2",
  "Enrollee 3",
  "Remarks",
] as const;

export default function StateOfficeMysteryShoppingPage({
  onBack,
  defaultStateId,
  defaultZoneId,
  embedded = false,
  onChromeChange,
}: Props) {
  const { canCreate, createOnly } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<Mode>(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [step, setStep] = React.useState(0);
  const [allRows, setRows] = React.useState<any[]>([]);
  const { search, setSearch, matchesSearch } = useListSearch();
  const rows = React.useMemo(() => allRows.filter(matchesSearch), [allRows, matchesSearch]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detailMeta, setDetailMeta] = React.useState<{
    zone?: string;
    state?: string;
    reference?: string;
  }>({});
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);
  const [f, setF] = React.useState<FormState>(emptyForm(defaultZoneId, defaultStateId));

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(
    defaultStateId,
    defaultZoneId
  );
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(
    () => ({
      zone_id: filterZone && filterZone !== "all" ? filterZone : defaultZoneId || undefined,
      state_id: apiStateId || defaultStateId || undefined,
      year: filterYear,
      month: filterMonth,
    }),
    [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]
  );

  const obsScore = sumScoreMap(f.observations);
  const cardScores = [
    sumScoreMap(f.enrollee_card_1),
    sumScoreMap(f.enrollee_card_2),
    sumScoreMap(f.enrollee_card_3),
  ];
  const enrolleeTotal = cardScores.reduce((a, b) => a + b, 0);
  const obsAnswered = answeredCount(f.observations, OBSERVATION_ITEMS);
  const cardAnswered = [
    answeredCount(f.enrollee_card_1, ENROLLEE_ITEMS),
    answeredCount(f.enrollee_card_2, ENROLLEE_ITEMS),
    answeredCount(f.enrollee_card_3, ENROLLEE_ITEMS),
  ];

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateOfficeMysteryShoppingApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load mystery shopping visits", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiFilters, createOnly]);

  React.useEffect(() => {
    if (!createOnly && mode === "list") void load();
  }, [load, mode, createOnly]);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (defaultZoneId) setFilterZone(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : defaultZoneId || "";
    if (!zid) {
      setDashboardStates([]);
      return;
    }
    stockApi
      .getStates(zid)
      .then((r) => setDashboardStates(r.data))
      .catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);

  React.useEffect(() => {
    if (!f.zone_id) {
      setStates([]);
      return;
    }
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [f.zone_id]);

  const openCreate = () => {
    if (!canCreate) return;
    setF(emptyForm(defaultZoneId, defaultStateId));
    setEditingId(null);
    setStep(0);
    setMode("create");
  };

  const leaveForm = () => {
    if (createOnly) {
      onBack();
      return;
    }
    setMode("list");
  };

  const remountCreateForm = () => {
    openCreate();
    setFormKey((k) => k + 1);
  };

  const openView = React.useCallback(
    (row: any) => {
      setF(rowToForm(row, defaultZoneId, defaultStateId));
      setEditingId(String(row.reference_id ?? row.id));
      setDetailMeta({
        zone: row.zone?.description,
        state: row.state?.description,
        reference: row.reference_id,
      });
      setMode("view");
    },
    [defaultZoneId, defaultStateId]
  );

  const listColumns = React.useMemo(
    (): ColumnDef<any>[] => [
      {
        id: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">
            {row.original.reference_id}
          </span>
        ),
      },
      {
        id: "facility",
        header: "Facility",
        cell: ({ row }) => <span className="text-xs font-semibold">{row.original.facility_name}</span>,
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => <span className="text-xs">{safeDate(row.original.visit_date)}</span>,
      },
      {
        id: "shopper",
        header: "Shopper",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.mystery_shopper_name || "—"}</span>
        ),
      },
      {
        id: "std_score",
        header: "Std Score",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-semibold text-[#145c3f]">
            {row.original.standard_expectations_score ?? 0}/{OBS_MAX}
          </span>
        ),
      },
      {
        id: "enrollee",
        header: "Enrollee",
        cell: ({ row }) => {
          const v = row.original;
          const total =
            (v.enrollee_score_1 || 0) + (v.enrollee_score_2 || 0) + (v.enrollee_score_3 || 0);
          return (
            <span className="text-xs font-mono font-semibold text-orange-700">
              {total}/{ENROLLEE_MAX * 3}
            </span>
          );
        },
      },
      {
        id: "state",
        header: "State",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.state?.description ?? "—"}</span>
        ),
      },
      {
        id: "view",
        header: "View",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-[#145c3f] hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(row.original);
            }}
          >
            <Eye className="w-4 h-4" /> View
          </Button>
        ),
      },
    ],
    [openView]
  );

  const openEdit = () => {
    setStep(0);
    setMode("edit");
  };

  const validateStep = (page: number) => {
    if (page === 0) {
      if (!f.email.trim()) return "Shopper email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Enter a valid email.";
      if (!f.zone_id || !f.state_id) return "Zone and state are required.";
      if (!f.facility_name.trim()) return "Name of facility is required.";
      if (!f.visit_date) return "Date of visit is required.";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateStep(0);
    if (err) {
      toast.error(err);
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...f,
        zone_id: f.zone_id,
        state_id: f.state_id,
        zonal_code: f.zone_id,
        state_code: f.state_id,
        facility_type: f.facility_type || null,
        reporting_year: f.visit_date ? new Date(f.visit_date).getFullYear() : Number(filterYear),
        reporting_month: f.visit_date
          ? new Date(f.visit_date).getMonth() + 1
          : Number(filterMonth),
        status: "submitted",
      };
      if (mode === "edit" && editingId) {
        await stateOfficeMysteryShoppingApi.update(editingId, payload);
        toast.success("Mystery shopping visit updated");
      } else {
        await stateOfficeMysteryShoppingApi.create(payload);
        toast.success("Mystery shopping visit recorded");
      }
      if (createOnly && mode === "create") remountCreateForm();
      else setMode("list");
    } catch (e: any) {
      toast.error("Failed to save visit", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const setObs = (key: string, value: string) =>
    setF((p) => ({ ...p, observations: { ...p.observations, [key]: value } }));
  const setCard = (
    card: "enrollee_card_1" | "enrollee_card_2" | "enrollee_card_3",
    key: string,
    value: string
  ) => setF((p) => ({ ...p, [card]: { ...p[card], [key]: value } }));

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  // ── Unified Circle Stepper ──────────────────────────────────────────────────
  const circleStepper = (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between max-w-4xl mx-auto relative px-3">
        {/* Background Track Line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 z-0">
          {/* Active Filled Track Line */}
          <div
            className="h-full bg-[#145c3f] transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((label, idx) => {
          const isCompleted = idx < step;
          const isActive = idx === step;
          const shortLabel = STEP_SHORT_LABELS[idx] || label;

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (idx <= step || !validateStep(0)) setStep(idx);
              }}
              className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold text-xs",
                  isCompleted
                    ? "bg-[#145c3f] border-[#145c3f] text-white shadow-xs"
                    : isActive
                      ? "bg-white border-[#145c3f] text-[#145c3f] shadow-md shadow-[#145c3f]/20 ring-4 ring-[#145c3f]/10"
                      : "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5 text-white" /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wider text-center max-w-[105px] leading-tight transition-colors hidden sm:block",
                  isActive
                    ? "text-[#145c3f]"
                    : isCompleted
                      ? "text-slate-700"
                      : "text-slate-400"
                )}
              >
                {shortLabel}
              </span>
            </button>
          );
        })}
      </div>
      {/* Mobile Step Heading */}
      <div className="sm:hidden text-center mt-3">
        <span className="text-xs font-bold text-[#145c3f] uppercase tracking-wider">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </span>
      </div>
    </div>
  );

  // ── Unified In-Card Bottom Navigation ───────────────────────────────────────
  const formCardFooter = (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[#e8f3ec] mt-6">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={step === 0 ? leaveForm : () => setStep((s) => s - 1)}
        className="h-9 px-4 text-xs font-semibold border-slate-300 text-slate-700 gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 0 ? "Cancel" : "Back"}
      </Button>

      <span className="text-xs text-slate-400 font-medium">
        Step {step + 1} of {STEPS.length}
      </span>

      <div className="flex items-center gap-2.5">
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="h-9 px-5 bg-orange-action hover:bg-orange-600 text-white font-bold text-xs gap-1.5 shadow-xs"
            onClick={goNext}
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="h-9 px-5 bg-orange-action hover:bg-orange-600 text-white font-bold text-xs gap-2 shadow-xs"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === "edit" ? "Update Visit" : "Save Visit"}
          </Button>
        )}
      </div>
    </div>
  );

  // ── Enrollee Experience Card Form ───────────────────────────────────────────
  const enrolleeCardForm = (
    cardKey: "enrollee_card_1" | "enrollee_card_2" | "enrollee_card_3",
    index: number
  ) => (
    <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
      <CardContent className="space-y-4 p-4 md:p-6">
        {ENROLLEE_ITEMS.map((item, idx) => (
          <div
            key={item.key}
            className="space-y-2 border-b border-[#e8f3ec] pb-3.5 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#e8f3ec] text-[10px] font-bold font-mono text-[#145c3f]">
                {idx + 1}
              </span>
              <Label className="text-xs font-semibold text-slate-800 leading-snug">
                {item.label}
              </Label>
            </div>
            <ScorePills
              value={f[cardKey][item.key] ?? ""}
              options={ENROLLEE_SCALE}
              onChange={(v) => setCard(cardKey, item.key, v)}
            />
          </div>
        ))}

        <div className="rounded-sm bg-[#f0fdf7] border border-[#d4e8dc] px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#145c3f]">
            Card {index} Total Score ({cardAnswered[index - 1]}/{ENROLLEE_ITEMS.length} answered)
          </span>
          <span className="font-mono text-base font-bold text-[#145c3f]">
            {cardScores[index - 1]} / {ENROLLEE_MAX}
          </span>
        </div>

        {/* Back & Next Navigation inside the card */}
        {formCardFooter}
      </CardContent>
    </Card>
  );

  React.useEffect(() => {
    if (!embedded || !onChromeChange) return;
    if (mode === "list") {
      onChromeChange({
        mode: "list",
        actions: (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-sm"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" /> New Visit
              </Button>
            )}
          </>
        ),
      });
      return;
    }
    if (mode === "view") {
      onChromeChange({
        mode: "detail",
        title: "View Mystery Shopping",
        onInnerBack: () => setMode(createOnly ? "create" : "list"),
        actions: canCreate ? (
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2"
            onClick={openEdit}
          >
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        ) : undefined,
      });
      return;
    }
    onChromeChange({
      mode: "form",
      title: mode === "edit" ? "Edit Mystery Shopping" : "New Mystery Shopping",
      onInnerBack: mode === "edit" ? () => setMode("view") : leaveForm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, onChromeChange, mode, loading, canCreate, createOnly]);

  React.useEffect(() => () => onChromeChange?.(null), [onChromeChange]);

  // ── View Mode ──────────────────────────────────────────────────────────────
  if (mode === "view") {
    const stateName =
      detailMeta.state ||
      pickGeoLabel(states.length ? states : dashboardStates, f.state_id, "—");

    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode(createOnly ? "create" : "list")}
                className="rounded-full hover:bg-emerald-50 text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e]">
                View Mystery Shopping
              </h2>
            </div>
            {canCreate && (
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 h-9 text-xs font-bold"
                onClick={openEdit}
              >
                <Pencil className="w-4 h-4" /> Edit Visit
              </Button>
            )}
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
            <Card className="rounded-sm border-[#d4e8dc] overflow-hidden shadow-2xs">
              <div className="bg-[#145c3f] text-white px-6 py-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/70">
                    {detailMeta.reference || "Mystery shopping visit"}
                  </p>
                  <h3 className="text-2xl font-bold">{f.facility_name || "Facility"}</h3>
                  <p className="text-xs text-white/80 mt-1">
                    {stateName} · {safeDate(f.visit_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-white text-[#145c3f] hover:bg-white font-mono text-xs">
                    Std {obsScore}/{OBS_MAX}
                  </Badge>
                  <Badge className="bg-orange-action hover:bg-orange-action text-white font-mono text-xs">
                    Enrollee {enrolleeTotal}/{ENROLLEE_MAX * 3}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <InfoField
                  label="Email"
                  value={
                    f.email ? (
                      <a
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                        href={`mailto:${f.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {f.email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoField label="Mystery Shopper Name" value={f.mystery_shopper_name} />
                <InfoField label="State" value={stateName} />
                <InfoField
                  label="Name of Facility"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      {f.facility_name}
                    </span>
                  }
                />
                <InfoField label="Facility NHIA Code" value={f.facility_nhia_code} />
                <InfoField
                  label="Facility Accreditation Type"
                  value={labelOf(FACILITY_TYPES, f.facility_type)}
                />
                <InfoField label="Facility Email" value={f.facility_email} />
                <InfoField
                  label="Date of Visit"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      {safeDate(f.visit_date)}
                    </span>
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-sm border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-[#e2efe7]">
                <CardTitle className="text-sm font-bold text-[#145c3f]">
                  Observations
                </CardTitle>
                <ScoreBadge score={obsScore} max={OBS_MAX} />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {OBSERVATION_ITEMS.map((item) => (
                  <InfoField
                    key={item.key}
                    label={item.label}
                    value={optionLabel(OBSERVATION_ITEMS, item.key, f.observations[item.key])}
                  />
                ))}
              </CardContent>
            </Card>

            {[f.enrollee_card_1, f.enrollee_card_2, f.enrollee_card_3].map((card, i) => (
              <Card key={i} className="rounded-sm border-[#d4e8dc] shadow-2xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-[#e2efe7]">
                  <CardTitle className="text-sm font-bold text-[#145c3f]">
                    Enrollee Experience Score Card {i + 1}
                  </CardTitle>
                  <ScoreBadge score={cardScores[i]} max={ENROLLEE_MAX} />
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {ENROLLEE_ITEMS.map((item) => (
                    <InfoField
                      key={item.key}
                      label={item.label}
                      value={labelOf(ENROLLEE_SCALE, card[item.key])}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}

            <Card className="rounded-sm border-[#d4e8dc] shadow-2xs">
              <CardHeader className="pb-2 border-b border-[#e2efe7]">
                <CardTitle className="text-sm font-bold text-[#145c3f]">
                  Remarks & Follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                <InfoField label="Key Strengths" value={f.key_strengths} />
                <InfoField label="Gaps Identified" value={f.gaps_identified} />
                <InfoField label="Recommendation" value={f.recommendation} />
                <InfoField label="Follow-up Action Plan" value={f.follow_up_action_plan} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── Create / Edit Form Mode ────────────────────────────────────────────────
  if (mode !== "list") {
    return (
      <div key={formKey} className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={mode === "edit" ? () => setMode("view") : leaveForm}
                className="rounded-full hover:bg-emerald-50 text-slate-600 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                {mode === "edit" ? "Edit Mystery Shopping Visit" : "New Mystery Shopping Visit"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#e8f6ee] text-[#145c3f] border border-emerald-300 font-mono text-xs">
                Std {obsScore}/{OBS_MAX}
              </Badge>
              <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-mono text-xs">
                Enrollee {enrolleeTotal}/{ENROLLEE_MAX * 3}
              </Badge>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-5 space-y-6 pb-20">
            {/* 1. Circle Stepper at Top */}
            {circleStepper}

            {/* 2. Step 0: General Information Card */}
            {step === 0 && (
              <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Shopper Email" required>
                      <Input
                        type="email"
                        placeholder="shopper@nhia.gov.ng"
                        value={f.email}
                        onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))}
                        className={controlClass}
                      />
                    </Field>

                    <Field label="Mystery Shopper Name">
                      <Input
                        placeholder="Full name of officer"
                        value={f.mystery_shopper_name}
                        onChange={(e) =>
                          setF((p) => ({ ...p, mystery_shopper_name: e.target.value }))
                        }
                        className={controlClass}
                      />
                    </Field>

                    <Field label="Date of Visit" required>
                      <Input
                        type="date"
                        value={f.visit_date}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setF((p) => ({ ...p, visit_date: e.target.value }))}
                        className={controlClass}
                      />
                    </Field>

                    <Field label="Zone" required>
                      <Select
                        value={f.zone_id}
                        disabled={zoneLocked}
                        onValueChange={(v) =>
                          setF((p) => ({
                            ...p,
                            zone_id: v,
                            state_id: stateLocked ? p.state_id : "",
                            facility_hcf_id: "",
                            facility_name: "",
                            facility_nhia_code: "",
                            facility_type: "",
                            facility_email: "",
                          }))
                        }
                      >
                        <SelectTrigger
                          className={controlClass}
                          displayValue={pickGeoLabel(zones, f.zone_id, "Select zone")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => {
                            const id = geoId(z);
                            return (
                              <SelectItem key={id} value={id}>
                                {z.description}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="State" required>
                      <Select
                        value={f.state_id}
                        disabled={stateLocked || !f.zone_id}
                        onValueChange={(v) =>
                          setF((p) => ({
                            ...p,
                            state_id: v,
                            facility_hcf_id: "",
                            facility_name: "",
                            facility_nhia_code: "",
                            facility_type: "",
                            facility_email: "",
                          }))
                        }
                      >
                        <SelectTrigger
                          className={controlClass}
                          displayValue={pickGeoLabel(
                            states,
                            f.state_id,
                            f.zone_id ? "Select state" : "Select zone first"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((s) => {
                            const id = geoId(s);
                            return (
                              <SelectItem key={id} value={id}>
                                {s.description}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field
                      label="Name of Facility"
                      required
                      className="sm:col-span-2 lg:col-span-3"
                    >
                      <AccreditedProviderSelect
                        className={searchControlClass}
                        type="hcp"
                        stateId={f.state_id || undefined}
                        value={f.facility_hcf_id}
                        displayName={f.facility_name || undefined}
                        placeholder={
                          f.state_id
                            ? "Search accredited healthcare facility"
                            : "Select a state first"
                        }
                        disabled={!f.state_id}
                        onChange={(fac) => {
                          if (!fac) {
                            setF((p) => ({
                              ...p,
                              facility_hcf_id: "",
                              facility_name: "",
                              facility_nhia_code: "",
                              facility_type: "",
                            }));
                            return;
                          }
                          setF((p) => ({
                            ...p,
                            facility_hcf_id: fac.id,
                            facility_name: fac.name,
                            facility_nhia_code: fac.code || p.facility_nhia_code,
                            facility_type: mapHcfFacilityType(fac.facility_type) || p.facility_type,
                          }));
                        }}
                      />
                      {!f.facility_hcf_id && f.facility_name ? (
                        <p className="text-xs text-amber-700 mt-1">
                          Saved facility: {f.facility_name}. Re-select from the list to refresh NHIA code and type.
                        </p>
                      ) : null}
                    </Field>

                    <Field label="Facility NHIA Code">
                      <Input
                        placeholder="e.g. NHIA/HCF/..."
                        value={f.facility_nhia_code}
                        onChange={(e) =>
                          setF((p) => ({ ...p, facility_nhia_code: e.target.value }))
                        }
                        className={controlClass}
                      />
                    </Field>

                    <Field label="Facility Email">
                      <Input
                        type="email"
                        placeholder="facility@hospital.org"
                        value={f.facility_email}
                        onChange={(e) =>
                          setF((p) => ({ ...p, facility_email: e.target.value }))
                        }
                        className={controlClass}
                      />
                    </Field>

                    {/* Facility Accreditation Type is now a Select */}
                    <Field label="Facility Accreditation Type">
                      <Select
                        value={f.facility_type}
                        onValueChange={(v) => setF((p) => ({ ...p, facility_type: v }))}
                      >
                        <SelectTrigger
                          className={controlClass}
                          displayValue={
                            FACILITY_TYPES.find((t) => t.value === f.facility_type)?.label
                          }
                        >
                          <SelectValue placeholder="Select accreditation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACILITY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Back & Next Navigation inside the card */}
                  {formCardFooter}
                </CardContent>
              </Card>
            )}

            {/* Step 1: Standard Expectations Checklist Card */}
            {step === 1 && (
              <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <CardContent className="space-y-4 p-4 md:p-6">
                  {OBSERVATION_ITEMS.map((item, idx) => (
                    <div
                      key={item.key}
                      className="space-y-2 border-b border-[#e8f3ec] pb-3.5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#e8f3ec] text-[10px] font-bold font-mono text-[#145c3f]">
                          {idx + 1}
                        </span>
                        <Label className="text-xs font-semibold text-slate-800 leading-snug">
                          {item.label}
                        </Label>
                      </div>
                      <ScorePills
                        value={f.observations[item.key] ?? ""}
                        options={item.options}
                        onChange={(v) => setObs(item.key, v)}
                      />
                    </div>
                  ))}

                  <div className="rounded-sm bg-[#f0fdf7] border border-[#d4e8dc] px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#145c3f]">
                      Standard Expectations Score ({obsAnswered}/{OBSERVATION_ITEMS.length} answered)
                    </span>
                    <span className="font-mono text-base font-bold text-[#145c3f]">
                      {obsScore} / {OBS_MAX}
                    </span>
                  </div>

                  {/* Back & Next Navigation inside the card */}
                  {formCardFooter}
                </CardContent>
              </Card>
            )}

            {/* Steps 2, 3, 4: Enrollee Experience Cards */}
            {step === 2 && enrolleeCardForm("enrollee_card_1", 1)}
            {step === 3 && enrolleeCardForm("enrollee_card_2", 2)}
            {step === 4 && enrolleeCardForm("enrollee_card_3", 3)}

            {/* Step 5: Remarks & Follow-up Card */}
            {step === 5 && (
              <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Key Strengths">
                      <Textarea
                        placeholder="What positive practices or compliant services were observed during the visit..."
                        value={f.key_strengths}
                        onChange={(e) => setF((p) => ({ ...p, key_strengths: e.target.value }))}
                      />
                    </Field>

                    <Field label="Gaps Identified">
                      <Textarea
                        placeholder="Specific infractions, delays, drug shortages, or complaints noted..."
                        value={f.gaps_identified}
                        onChange={(e) => setF((p) => ({ ...p, gaps_identified: e.target.value }))}
                      />
                    </Field>

                    <Field label="Recommendation">
                      <Textarea
                        placeholder="Actionable recommendations for facility management or HMOs..."
                        value={f.recommendation}
                        onChange={(e) => setF((p) => ({ ...p, recommendation: e.target.value }))}
                      />
                    </Field>

                    <Field label="Follow-up Action Plan">
                      <Textarea
                        placeholder="Target corrective steps, responsible officer, and expected timeline..."
                        value={f.follow_up_action_plan}
                        onChange={(e) =>
                          setF((p) => ({ ...p, follow_up_action_plan: e.target.value }))
                        }
                      />
                    </Field>
                  </div>

                  {/* Assessment Recap Summary */}
                  <div className="rounded-sm border border-[#d4e8dc] bg-[#f8faf9] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Standard Score
                      </p>
                      <p className="font-mono font-bold text-sm text-[#145c3f] mt-0.5">
                        {obsScore} / {OBS_MAX}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Enrollee Total
                      </p>
                      <p className="font-mono font-bold text-sm text-orange-700 mt-0.5">
                        {enrolleeTotal} / {ENROLLEE_MAX * 3}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Facility
                      </p>
                      <p className="font-semibold text-slate-800 mt-0.5 truncate">
                        {f.facility_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Visit Date
                      </p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {safeDate(f.visit_date)}
                      </p>
                    </div>
                  </div>

                  {/* Back & Save Visit Navigation inside the card */}
                  {formCardFooter}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── List Mode ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-slate-50/30"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 gap-3">
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            Mystery Shopping
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-sm text-xs font-bold"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" /> New Visit
              </Button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <RegisterStatsCards
            loading={loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              {
                label: "Total visits",
                value: rows.length,
                tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]",
              },
              {
                label: "Facilities",
                value: new Set(rows.map((r) => r.facility_name || r.reference_id)).size,
                tone: "text-slate-600 bg-white border-slate-200",
              },
              {
                label: "Avg std score",
                value: rows.length
                  ? Math.round(
                      rows.reduce(
                        (sum, r) => sum + Number(r.standard_expectations_score || 0),
                        0
                      ) / rows.length
                    )
                  : 0,
                tone: "text-teal-800 bg-teal-50/80 border-teal-100",
              },
              {
                label: "Avg enrollee",
                value: rows.length
                  ? Math.round(
                      rows.reduce(
                        (sum, r) =>
                          sum +
                          Number(r.enrollee_score_1 || 0) +
                          Number(r.enrollee_score_2 || 0) +
                          Number(r.enrollee_score_3 || 0),
                        0
                      ) / rows.length
                    )
                  : 0,
                tone: "text-amber-800 bg-amber-50/80 border-amber-100",
              },
            ]}
          />

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Zone
                </Label>
                <Select
                  value={filterZone}
                  disabled={zoneLocked}
                  onValueChange={(v) => {
                    setFilterZone(v);
                    if (!stateLocked) setFilterState("all");
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    displayValue={
                      filterZone === "all"
                        ? "All Zones"
                        : pickGeoLabel(zones, filterZone, "Zone")
                    }
                  >
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => {
                      const id = geoId(z);
                      return (
                        <SelectItem key={id} value={id}>
                          {z.description}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  State
                </Label>
                <Select
                  value={filterState}
                  disabled={stateLocked}
                  onValueChange={setFilterState}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    displayValue={
                      stateLocked
                        ? pickGeoLabel(dashboardStates, filterState, "State")
                        : filterState === "all"
                          ? "All States"
                          : pickGeoLabel(dashboardStates, filterState, "State")
                    }
                  >
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => {
                      const id = geoId(s);
                      return (
                        <SelectItem key={id} value={id}>
                          {s.description}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Year
                </Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterYear}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildReportingYearOptions().map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Month
                </Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    displayValue={monthLabel(filterMonth)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="MYSTERY SHOPPING REGISTER"
            columns={listColumns}
            data={rows}
            loading={loading}
            searchPlaceholder="Search mystery shopping visits..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage="No mystery shopping visits for this period yet."
            onRowClick={openView}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
