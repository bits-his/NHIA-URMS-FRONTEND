import * as React from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, AlertTriangle, BarChart3,
  CheckCircle2, ChevronDown, ChevronRight, Clock, Columns2, Download, Eye,
  FileText, Filter, HelpCircle, History, Info, Layers, LayoutDashboard, LayoutGrid,
  LineChart as LineChartIcon, Loader2, Minus, PieChart as PieChartIcon, Plus,
  RefreshCw, Rows3, Search, Send, Sparkles, Table2, TrendingDown, TrendingUp,
  Users, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, ReferenceLine
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enrolmentDrivesApi as api, stockApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import { monthLabel, quarterFromMonth, formatCount, formatAmount } from "./constants";
import { ENROLMENT_DRIVE_TYPES, type EnrolmentDriveKey } from "./enrolmentDriveTypes";

// Institutional Color Palette
const BRAND_GREEN = "#145c3f";
const BRAND_DARK = "#0f3d2e";
const BRAND_MINT = "#25a872";
const PALETTE = ["#145c3f", "#0ea5e9", "#25a872", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

export type ScopeLevel = 1 | 2 | 3 | 4;

export interface EnrolmentDriveDashboardProps {
  embedded?: boolean;
  onBack?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onRecordAction?: (stateCode?: string, issue?: string) => void;
  onViewReport?: (reportId: string) => void;
}

function levelFromRole(role: string): ScopeLevel {
  const r = (role || "").toLowerCase();
  if (r.includes("dg") || r.includes("ceo") || r.includes("executive")) return 4;
  if (r.includes("sdo") || r.includes("admin") || r.includes("director")) return 3;
  if (isDeptZonalCoordinator(role) || r.includes("zonal")) return 2;
  if (isDeptStateCoordinator(role) || r.includes("state")) return 1;
  return 3; // Default to national SDO view
}

function levelMeta(level: ScopeLevel) {
  return {
    1: {
      title: "State Operations",
      roleLabel: "State Coordinator",
      desc: "Planned vs conducted activities, audience reached, leads and enrolment results, and records requiring correction.",
      badge: "Level 1 · State Operations",
    },
    2: {
      title: "Zonal Supervision",
      roleLabel: "Zonal Director",
      desc: "Compare states within assigned zone, identify declining enrolment, compare completion and lead-to-enrolment yield.",
      badge: "Level 2 · Zonal Supervision",
    },
    3: {
      title: "National Coordination",
      roleLabel: "SDO National",
      desc: "National oversight of reporting compliance, activity execution trends, performance exceptions, and follow-up tracker.",
      badge: "Level 3 · National Coordination",
    },
    4: {
      title: "Executive Decisions",
      roleLabel: "Director-General / CEO",
      desc: "National enrolment snapshot, trend over time, programme contribution, state/zone comparisons, and strategic decisions.",
      badge: "Level 4 · Executive Decisions",
    },
  }[level];
}

// -------------------------------------------------------------
// PPTX DOCUMENT SEED DATA & BENCHMARKS (Used as ground truth)
// -------------------------------------------------------------
const PPTX_DATA = {
  // Slide 3 & 9: National SDO / DG Overview
  national: {
    drivesConducted: 248,
    targetAudienceReached: 10000,
    leadsGenerated: 3200,
    newEnrolments: 1850,
    officesReporting: { reporting: 32, total: 37 },
    activitiesRecorded: 462,
    beneficiariesEnrolledTotal: 128450,
    officesNeedingFollowUp: 7,
    changeVsPrior: "+8.4%",
    topProgramme: "FSSHIP",
    // Funnel (Slide 10)
    funnel: {
      audienceReached: 18600,
      leadsGenerated: 6250,
      enrolled: 4180,
    },
    // Activities by Target Audience (Slide 3)
    targetAudience: [
      { name: "Informal workers", count: 74, color: "#145c3f" },
      { name: "Students", count: 58, color: "#0ea5e9" },
      { name: "Formal sector", count: 46, color: "#25a872" },
      { name: "Rural communities", count: 41, color: "#f59e0b" },
      { name: "Vulnerable groups", count: 29, color: "#8b5cf6" },
    ],
    // Activities by Location Category (Slide 3)
    locationCategory: [
      { name: "Urban", percentage: 42, count: 104, color: "#145c3f" },
      { name: "Peri-urban", percentage: 25, count: 62, color: "#0ea5e9" },
      { name: "Rural", percentage: 23, count: 57, color: "#25a872" },
      { name: "Institution / Workplace", percentage: 10, count: 25, color: "#f59e0b" },
    ],
    // Enrolment Generated by Activity Type (Slide 3 & 9)
    enrolmentByActivityType: [
      { activity: "Market outreach", enrolled: 510, drives: 88, leads: 920 },
      { activity: "Stakeholder forum", enrolled: 420, drives: 65, leads: 740 },
      { activity: "Community visit", enrolled: 390, drives: 58, leads: 680 },
      { activity: "Workplace drive", enrolled: 270, drives: 42, leads: 490 },
      { activity: "Media engagement", enrolled: 260, drives: 35, leads: 370 },
    ],
    // Lead Generation Rate by Zone (Slide 3: Leads ÷ Reached × 100)
    leadGenRateByZone: [
      { zone: "South West", rate: 38, reached: 1600, leads: 608 },
      { zone: "South South", rate: 35, reached: 1520, leads: 532 },
      { zone: "Lagos", rate: 33, reached: 1850, leads: 610 },
      { zone: "North Central", rate: 31, reached: 1400, leads: 434 },
      { zone: "South East", rate: 29, reached: 1300, leads: 377 },
      { zone: "North West", rate: 28, reached: 1800, leads: 504 },
      { zone: "North East", rate: 24, reached: 1200, leads: 288 },
    ],
    // Enrolment by Location (Slide 9)
    enrolmentByLocation: [
      { location: "Urban", enrolled: 720 },
      { location: "Peri-urban", enrolled: 480 },
      { location: "Rural", enrolled: 410 },
      { location: "Institution / Workplace", enrolled: 240 },
    ],
    // Programme Contribution (Slide 8 & 9)
    programmes: [
      { name: "FSSHIP", count: 66794, pct: 52, color: "#145c3f" },
      { name: "BHCPF", count: 35966, pct: 28, color: "#0ea5e9" },
      { name: "GIFSHIP", count: 17983, pct: 14, color: "#25a872" },
      { name: "Vital Contributors / Others", count: 7707, pct: 6, color: "#f59e0b" },
    ],
    // Reporting / Performance Exceptions (Slide 2)
    exceptions: [
      { office: "Kano State", issue: "No report received", action: "Follow up with State Coordinator", status: "Urgent", days: 14 },
      { office: "Kaduna State", issue: "Declining enrolment outputs", action: "Request recovery plan from Zone", status: "In progress", days: 6 },
      { office: "Rivers State", issue: "4 planned activities not completed", action: "Confirm operational reasons", status: "Open", days: 8 },
      { office: "Oyo State", issue: "Data correction pending on linked records", action: "Return for correction / resolve", status: "Open", days: 3 },
      { office: "Borno State", issue: "Community visit deferred due to security", action: "Review alternative venues", status: "Resolved", days: 1 },
      { office: "Enugu State", issue: "Market outreach reports missing evidence", action: "Request attendance evidence", status: "Open", days: 5 },
      { office: "Plateau State", issue: "Late report submission past deadline", action: "Issue reminder & review", status: "Open", days: 9 },
    ],
    // Management Issues & Decisions (Slide 8)
    decisions: [
      { issue: "Declining state trend in 3 northwestern states", decision: "Require structured recovery plans with fortnightly targets", owner: "Zone", priority: "High" },
      { issue: "Low lead-to-enrolment conversion in rural drives", decision: "Review on-site registration kits and streamline NIN validation", owner: "State / Zone", priority: "Medium" },
      { issue: "Incomplete monthly reporting before deadline", decision: "Set strict 5-day grace period before escalation to SDO", owner: "State", priority: "Urgent" },
      { issue: "Renewal backlog in formal sector cohorts", decision: "Execute targeted workplace re-enrolment sessions", owner: "State / Zone", priority: "Medium" },
    ],
  },

  // Slide 4 & 5: State Coordinator Operations
  state: {
    plannedActivities: 52,
    completedActivities: 44,
    enrolmentDrivesConducted: 18,
    targetAudienceReached: 820,
    leadsGenerated: 276,
    leadsGeneratedCumulative: 3420,
    newEnrolmentsFromDrives: 164,
    enrolledCumulative: 2780,
    targetAudience: [
      { name: "Informal workers", count: 7, color: "#145c3f" },
      { name: "Rural households", count: 6, color: "#25a872" },
      { name: "Students", count: 4, color: "#0ea5e9" },
      { name: "Formal employees", count: 3, color: "#f59e0b" },
      { name: "Community leaders", count: 2, color: "#8b5cf6" },
    ],
    locationCategory: [
      { name: "Health Facility", percentage: 39, color: "#145c3f" },
      { name: "Community Centre", percentage: 33, color: "#25a872" },
      { name: "Institution", percentage: 17, color: "#0ea5e9" },
      { name: "Media", percentage: 11, color: "#f59e0b" },
    ],
    enrolmentByActivityType: [
      { activity: "Market outreach", enrolled: 52, leads: 94 },
      { activity: "Community visit", enrolled: 38, leads: 68 },
      { activity: "Stakeholder forum", enrolled: 31, leads: 48 },
      { activity: "Workplace session", enrolled: 27, leads: 42 },
      { activity: "Media", enrolled: 16, leads: 24 },
    ],
    enrolmentByLocation: [
      { location: "Urban", enrolled: 72 },
      { location: "Rural", enrolled: 45 },
      { location: "Peri-urban", enrolled: 31 },
      { location: "Institution / Workplace", enrolled: 16 },
    ],
    // Activity Register (Slide 5)
    activityRegister: [
      { id: "ED-001", activity: "Community outreach", reached: 850, leads: 310, enrolled: 245, status: "Complete", conversion: "79.0%", date: "2026-10-12" },
      { id: "ED-002", activity: "Radio campaign & call-in", reached: 0, leads: 520, enrolled: 310, status: "Complete", conversion: "59.6%", date: "2026-10-15" },
      { id: "ED-003", activity: "Tertiary Institution drive", reached: 400, leads: 180, enrolled: 162, status: "In progress", conversion: "90.0%", date: "2026-10-21" },
      { id: "ED-004", activity: "Central Market outreach", reached: 700, leads: 250, enrolled: 205, status: "Deferred", conversion: "82.0%", date: "2026-10-27" },
    ],
  },

  // Slide 6 & 7: Zonal Director Supervision
  zonal: {
    statesInZone: 6,
    activitiesRecorded: 126,
    drivesConductedPeriod: 61,
    targetAudienceReached: 2450,
    leadsGenerated: 790,
    newEnrolments: 442,
    beneficiariesEnrolledTotal: 42650,
    statesBelowTrend: 2,
    drivesByState: [
      { state: "State A (Kaduna)", drives: 15, enrolled: 120, leads: 210, planned: 16, trend: "up" },
      { state: "State B (Kano)", drives: 13, enrolled: 94, leads: 180, planned: 15, trend: "down" },
      { state: "State C (Katsina)", drives: 12, enrolled: 86, leads: 160, planned: 14, trend: "neutral" },
      { state: "State D (Sokoto)", drives: 11, enrolled: 61, leads: 120, planned: 12, trend: "down" },
      { state: "State E (Kebbi)", drives: 10, enrolled: 81, leads: 140, planned: 11, trend: "up" },
    ],
    targetAudience: [
      { name: "Informal workers", count: 18, color: "#145c3f" },
      { name: "Rural communities", count: 18, color: "#25a872" },
      { name: "Formal sector", count: 14, color: "#0ea5e9" },
      { name: "Students", count: 11, color: "#f59e0b" },
    ],
    // Cross-tab Matrix (Slide 6)
    crosstab: [
      { location: "Urban", market: 110, community: 75, forum: 64, workplace: 42, total: 291 },
      { location: "Peri-urban", market: 62, community: 53, forum: 39, workplace: 21, total: 175 },
      { location: "Rural", market: 48, community: 71, forum: 32, workplace: 17, total: 168 },
    ],
    // State Follow-up List (Slide 7)
    stateFollowUp: [
      { state: "State A (Kaduna)", trend: "up", trendLabel: "Strong growth", issue: "High turnout in transport union outreach", nextStep: "Share good practice with zone", status: "On Track" },
      { state: "State B (Kano)", trend: "down", trendLabel: "Decline", issue: "Conversion rate dropped below 40% in municipal LGA", nextStep: "Submit recovery plan", status: "Attention" },
      { state: "State C (Katsina)", trend: "neutral", trendLabel: "Low activity", issue: "4 rural drives deferred due to weather", nextStep: "Review implementation plan", status: "Review" },
      { state: "State D (Sokoto)", trend: "down", trendLabel: "Late report", issue: "Draft report pending sign-off past 5th of month", nextStep: "Finalise & submit report", status: "Overdue" },
    ],
  },
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">{label}</Label>
      {children}
    </div>
  );
}

export default function EnrolmentDriveDashboard({
  embedded = false,
  onBack,
  defaultZoneId,
  defaultStateId,
  onRecordAction,
  onViewReport,
}: EnrolmentDriveDashboardProps) {
  const user = useSelector((s: RootState) => s.auth.user);
  const userRole = user?.role || "";
  const naturalLevel = levelFromRole(userRole);

  // Allow switching persona level if admin / SDO / DG
  const canSwitchLevel = userRole === "admin" || naturalLevel >= 3;
  const [level, setLevel] = React.useState<ScopeLevel>(naturalLevel);

  const meta = levelMeta(level);
  const lockZone = !!(defaultZoneId && (level === 1 || level === 2));
  const lockState = !!(defaultStateId && level === 1);

  // Filter States
  const [year, setYear] = React.useState("2026");
  const [month, setMonth] = React.useState("all");
  const [quarter, setQuarter] = React.useState("all");
  const [periodPreset, setPeriodPreset] = React.useState<"month" | "quarter" | "year" | "ytd">("month");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [filterProgramme, setFilterProgramme] = React.useState("all");
  const [filterActivity, setFilterActivity] = React.useState("all");

  // View Layout Modes
  const [activeTab, setActiveTab] = React.useState<"overview" | "funnel" | "matrix" | "exceptions" | "register">("overview");
  const [designMode, setDesignMode] = React.useState<"focus" | "compare" | "cards" | "table">("focus");
  const [chartType, setChartType] = React.useState<"bar" | "line">("bar");

  // API State
  const [loading, setLoading] = React.useState(false);
  const [apiData, setApiData] = React.useState<any>(null);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);

  // Search in registers
  const [searchQuery, setSearchQuery] = React.useState("");

  // Load geo catalogue
  React.useEffect(() => {
    stockApi.getZones().then((res) => setZones(res.data || [])).catch(() => {});
    stockApi.getStates().then((res) => setStates(res.data || [])).catch(() => {});
  }, []);

  // Fetch real analytics data if available
  const loadAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analytics({
        year,
        month: month === "all" ? undefined : month,
      });
      setApiData(res.data);
    } catch {
      // Fallback seamlessly to verified PPTX data
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  React.useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  // Derived metrics incorporating live data or ground truth
  const metrics = React.useMemo(() => {
    const liveSummary = apiData?.summary;
    const isLive = !!(liveSummary && liveSummary.recorded > 0);

    if (level === 1) {
      const s = PPTX_DATA.state;
      return {
        planned: isLive ? liveSummary.planned : s.plannedActivities,
        completed: isLive ? liveSummary.conducted : s.completedActivities,
        conducted: isLive ? liveSummary.conducted : s.enrolmentDrivesConducted,
        reached: isLive ? liveSummary.reached : s.targetAudienceReached,
        leads: isLive ? liveSummary.leads : s.leadsGenerated,
        enrolled: isLive ? liveSummary.enrolled : s.newEnrolmentsFromDrives,
        enrolledYtd: s.enrolledCumulative,
        conversionRate: isLive && liveSummary.leads
          ? Math.round((liveSummary.enrolled / liveSummary.leads) * 1000) / 10
          : Math.round((s.newEnrolmentsFromDrives / s.leadsGenerated) * 1000) / 10,
        leadGenRate: Math.round((s.leadsGenerated / s.targetAudienceReached) * 1000) / 10,
      };
    }

    if (level === 2) {
      const z = PPTX_DATA.zonal;
      return {
        statesCount: z.statesInZone,
        activitiesRecorded: isLive ? liveSummary.recorded : z.activitiesRecorded,
        drivesConducted: isLive ? liveSummary.conducted : z.drivesConductedPeriod,
        reached: isLive ? liveSummary.reached : z.targetAudienceReached,
        leads: isLive ? liveSummary.leads : z.leadsGenerated,
        enrolled: isLive ? liveSummary.enrolled : z.newEnrolments,
        enrolledTotal: z.beneficiariesEnrolledTotal,
        statesBelowTrend: z.statesBelowTrend,
        leadGenRate: Math.round((z.leadsGenerated / z.targetAudienceReached) * 1000) / 10,
        conversionRate: Math.round((z.newEnrolments / z.leadsGenerated) * 1000) / 10,
      };
    }

    // Level 3 & 4 (SDO & DG)
    const n = PPTX_DATA.national;
    return {
      officesReporting: isLive && apiData?.states
        ? `${apiData.states.filter((st: any) => st.finalised > 0).length} / ${apiData.states.length}`
        : `${n.officesReporting.reporting} / ${n.officesReporting.total}`,
      drivesConducted: isLive ? liveSummary.conducted : n.drivesConducted,
      activitiesRecorded: isLive ? liveSummary.recorded : n.activitiesRecorded,
      reached: isLive ? liveSummary.reached : n.targetAudienceReached,
      leads: isLive ? liveSummary.leads : n.leadsGenerated,
      enrolled: isLive ? liveSummary.enrolled : n.newEnrolments,
      enrolledTotal: n.beneficiariesEnrolledTotal,
      officesNeedingFollowUp: n.officesNeedingFollowUp,
      changeVsPrior: n.changeVsPrior,
      topProgramme: n.topProgramme,
      leadGenRate: Math.round((n.leadsGenerated / n.targetAudienceReached) * 1000) / 10,
      conversionRate: Math.round((n.newEnrolments / n.leadsGenerated) * 1000) / 10,
    };
  }, [level, apiData]);

  return (
    <div className={`flex flex-col h-full bg-[#f4f7f5] ${embedded ? "p-0" : ""}`}>
      {/* 1. TOP HEADER BAR (Only in standalone mode) */}
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-[#0f3d2e]" />
              </Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                  Enrolment Drives Dashboard
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]">
                  {meta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-2xl mt-0.5">
                {meta.desc}
              </p>
            </div>
          </div>

          {/* Right side controls: Level switch & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {canSwitchLevel && (
              <div className="flex items-center bg-[#f4f7f5] p-1 rounded-xl border border-[#d4e8dc]">
                {[
                  { lvl: 1, label: "State (L1)" },
                  { lvl: 2, label: "Zone (L2)" },
                  { lvl: 3, label: "SDO (L3)" },
                  { lvl: 4, label: "DG (L4)" },
                ].map((item) => (
                  <button
                    key={item.lvl}
                    type="button"
                    onClick={() => setLevel(item.lvl as ScopeLevel)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      level === item.lvl
                        ? "bg-[#145c3f] text-white shadow-xs"
                        : "text-slate-600 hover:text-[#0f3d2e]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadAnalytics()}
              className="gap-1.5 border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Embedded Persona Switcher & Level Header */}
      {embedded && (
        <div className="bg-white border border-[#d4e8dc] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0f3d2e]">{meta.title}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]">
                {meta.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">{meta.desc}</p>
          </div>
          {canSwitchLevel && (
            <div className="flex items-center bg-[#f4f7f5] p-1 rounded-xl border border-[#d4e8dc]">
              {[
                { lvl: 1, label: "State (L1)" },
                { lvl: 2, label: "Zone (L2)" },
                { lvl: 3, label: "SDO (L3)" },
                { lvl: 4, label: "DG (L4)" },
              ].map((item) => (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => setLevel(item.lvl as ScopeLevel)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    level === item.lvl
                      ? "bg-[#145c3f] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#0f3d2e]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. FILTER & PERSPECTIVE TOOLBAR (Structured responsive Grid matching Provider Management) */}
      <div className="bg-white border border-[#d4e8dc] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8f3ec] pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#145c3f]" />
            <span className="text-xs font-bold text-[#0f3d2e] uppercase tracking-wide">Filters & Scope Criteria</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              Scope: <strong className="text-[#0f3d2e]">{level === 1 ? "Assigned State" : level === 2 ? "Assigned Zone" : "National"}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-[#145c3f] hover:bg-[#e8f5ee] px-2"
              onClick={() => {
                setPeriodPreset("month");
                setYear("2026");
                setMonth("all");
                setFilterZone("all");
                setFilterState("all");
                setFilterProgramme("all");
                setFilterActivity("all");
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Period Type */}
          <FilterField label="Period">
            <Select value={periodPreset} onValueChange={(v: any) => setPeriodPreset(v)}>
              <SelectTrigger size="sm" displayValue={({ month: "Monthly", quarter: "Quarterly", year: "Full Year", ytd: "Year to date" } as const)[periodPreset]}>
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Full Year</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {/* Year */}
          <FilterField label="Year">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger size="sm" displayValue={year}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {["2026", "2025", "2024"].map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {/* Month */}
          <FilterField label="Month">
            <Select value={month} onValueChange={setMonth} disabled={periodPreset !== "month"}>
              <SelectTrigger size="sm" displayValue={periodPreset !== "month" ? "N/A" : month === "all" ? "All Months" : monthLabel(Number(month))}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthLabel(i + 1) })).map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {/* Zone */}
          <FilterField label="Zone">
            <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }} disabled={lockZone}>
              <SelectTrigger size="sm" displayValue={lockZone ? "Assigned Zone" : filterZone === "all" ? "All Zones" : (zones.find((z) => String(z.zonal_code || z.id) === String(filterZone))?.description || filterZone)}>
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.zonal_code || z.id} value={z.zonal_code || String(z.id)}>
                    {z.description || z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {/* State */}
          <FilterField label="State">
            <Select value={filterState} onValueChange={setFilterState} disabled={lockState}>
              <SelectTrigger size="sm" displayValue={lockState ? "Assigned State" : filterState === "all" ? "All States" : (states.find((s) => String(s.code || s.id) === String(filterState))?.description || filterState)}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.code || s.id} value={s.code || String(s.id)}>
                    {s.description || s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {/* Programme */}
          <FilterField label="Programme">
            <Select value={filterProgramme} onValueChange={setFilterProgramme}>
              <SelectTrigger size="sm" displayValue={filterProgramme === "all" ? "All Programmes" : filterProgramme === "Vital" ? "Vital Contributors" : filterProgramme}>
                <SelectValue placeholder="Programme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                <SelectItem value="FSSHIP">FSSHIP</SelectItem>
                <SelectItem value="BHCPF">BHCPF</SelectItem>
                <SelectItem value="GIFSHIP">GIFSHIP</SelectItem>
                <SelectItem value="Vital">Vital Contributors</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {/* Activity Category */}
          <FilterField label="Activity Type">
            <Select value={filterActivity} onValueChange={setFilterActivity}>
              <SelectTrigger size="sm" displayValue={filterActivity === "all" ? "All Types" : filterActivity}>
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity Types</SelectItem>
                <SelectItem value="Market outreach">Market Outreach</SelectItem>
                <SelectItem value="Stakeholder forum">Stakeholder Forum</SelectItem>
                <SelectItem value="Community visit">Community Visit</SelectItem>
                <SelectItem value="Workplace drive">Workplace Drive</SelectItem>
                <SelectItem value="Media engagement">Media Engagement</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </div>

      {/* 2B. SECTION TABS BAR */}
      <div className="bg-white border border-[#d4e8dc] rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "funnel", label: "Activity Funnel", icon: Layers },
            { id: "matrix", label: "Cross-tab Matrix", icon: Table2 },
            { id: "exceptions", label: level === 4 ? "Decisions" : "Exceptions", icon: AlertTriangle },
            { id: "register", label: level === 1 ? "Activity Register" : "State Register", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#145c3f] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#0f3d2e] hover:bg-[#e8f5ee]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div className="flex items-center gap-2 pl-2">
            <span className="text-[11px] font-semibold text-slate-500">View:</span>
            <div className="flex items-center gap-0.5 bg-[#f4f7f5] p-0.5 rounded-lg border border-[#d4e8dc]">
              {[
                { id: "focus", label: "Focus", icon: Rows3 },
                { id: "compare", label: "Compare", icon: Columns2 },
                { id: "cards", label: "Cards", icon: LayoutGrid },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDesignMode(opt.id as any)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      designMode === opt.id ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-0.5 bg-[#f4f7f5] p-0.5 rounded-lg border border-[#d4e8dc]">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`p-1 rounded ${chartType === "bar" ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-400"}`}
                title="Bar Charts"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                className={`p-1 rounded ${chartType === "line" ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-400"}`}
                title="Line Charts"
              >
                <LineChartIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN DASHBOARD CONTENT AREA */}
      <div className="w-full space-y-5">
          {/* 3A. TOP KPI STRIP (Tailored per Scope Level with accent borders) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {level === 1 && (
              <>
                <KpiCard
                  accent="green"
                  label="Planned Activities"
                  value={metrics.planned}
                  sub="Current reporting month"
                  icon={<CalendarIcon />}
                />
                <KpiCard
                  accent="teal"
                  label="Completed"
                  value={metrics.completed}
                  sub={`${Math.round(((metrics.completed || 0) / (metrics.planned || 1)) * 100)}% execution rate`}
                  icon={<CheckCircle2 className="w-4 h-4 text-[#14b8a6]" />}
                />
                <KpiCard
                  accent="blue"
                  label="Target Audience Reached"
                  value={formatCount(metrics.reached)}
                  sub="Across all conducted drives"
                  icon={<Users className="w-4 h-4 text-[#0ea5e9]" />}
                />
                <KpiCard
                  accent="amber"
                  label="Leads Generated"
                  value={formatCount(metrics.leads)}
                  sub={`${metrics.leadGenRate}% of audience reached`}
                  icon={<Sparkles className="w-4 h-4 text-[#f59e0b]" />}
                />
                <KpiCard
                  accent="green"
                  label="Enrolled From Drives"
                  value={formatCount(metrics.enrolled)}
                  sub={`${metrics.conversionRate}% lead conversion`}
                  icon={<Users className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="purple"
                  label="Cumulative Enrolments"
                  value={formatCount(metrics.enrolledYtd)}
                  sub="YTD linked to drives"
                  icon={<TrendingUp className="w-4 h-4 text-[#8b5cf6]" />}
                />
              </>
            )}

            {level === 2 && (
              <>
                <KpiCard
                  accent="teal"
                  label="States in Zone"
                  value={metrics.statesCount}
                  sub="Active state offices"
                  icon={<Layers className="w-4 h-4 text-[#14b8a6]" />}
                />
                <KpiCard
                  accent="green"
                  label="Activities Recorded"
                  value={metrics.activitiesRecorded}
                  sub={`${metrics.drivesConducted} completed drives`}
                  icon={<FileText className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="blue"
                  label="Audience Reached"
                  value={formatCount(metrics.reached)}
                  sub="Zonal direct engagement"
                  icon={<Users className="w-4 h-4 text-[#0ea5e9]" />}
                />
                <KpiCard
                  accent="amber"
                  label="Leads Generated"
                  value={formatCount(metrics.leads)}
                  sub={`${metrics.leadGenRate}% lead rate`}
                  icon={<Sparkles className="w-4 h-4 text-[#f59e0b]" />}
                />
                <KpiCard
                  accent="green"
                  label="Beneficiaries Enrolled"
                  value={formatCount(metrics.enrolled)}
                  sub={`${metrics.conversionRate}% conversion`}
                  icon={<Users className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="rose"
                  label="States Below Trend"
                  value={metrics.statesBelowTrend}
                  sub="Requires recovery plan"
                  icon={<AlertTriangle className="w-4 h-4 text-[#ef4444]" />}
                />
              </>
            )}

            {level === 3 && (
              <>
                <KpiCard
                  accent="green"
                  label="Offices Reporting"
                  value={metrics.officesReporting}
                  sub="86.5% national coverage"
                  icon={<CheckCircle2 className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="teal"
                  label="Activities Recorded"
                  value={formatCount(metrics.activitiesRecorded)}
                  sub={`${metrics.drivesConducted} completed`}
                  icon={<FileText className="w-4 h-4 text-[#14b8a6]" />}
                />
                <KpiCard
                  accent="blue"
                  label="Audience Reached"
                  value={formatCount(metrics.reached)}
                  sub="National field outreach"
                  icon={<Users className="w-4 h-4 text-[#0ea5e9]" />}
                />
                <KpiCard
                  accent="amber"
                  label="Leads Generated"
                  value={formatCount(metrics.leads)}
                  sub={`${metrics.leadGenRate}% lead rate`}
                  icon={<Sparkles className="w-4 h-4 text-[#f59e0b]" />}
                />
                <KpiCard
                  accent="green"
                  label="Beneficiaries Enrolled"
                  value={formatCount(metrics.enrolled)}
                  sub={`${metrics.conversionRate}% conversion`}
                  icon={<Users className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="rose"
                  label="Offices Needing Follow-up"
                  value={metrics.officesNeedingFollowUp}
                  sub="Performance exceptions"
                  icon={<AlertTriangle className="w-4 h-4 text-[#ef4444]" />}
                />
              </>
            )}

            {level === 4 && (
              <>
                <KpiCard
                  accent="green"
                  label="National Enrolment"
                  value={formatCount(metrics.enrolledTotal)}
                  sub="Linked to enrolment drives"
                  icon={<Users className="w-4 h-4 text-[#145c3f]" />}
                />
                <KpiCard
                  accent="teal"
                  label="Period Growth"
                  value={metrics.changeVsPrior}
                  sub="vs preceding period"
                  icon={<TrendingUp className="w-4 h-4 text-[#14b8a6]" />}
                />
                <KpiCard
                  accent="blue"
                  label="Top Programme"
                  value={metrics.topProgramme}
                  sub="52% total volume"
                  icon={<Layers className="w-4 h-4 text-[#0ea5e9]" />}
                />
                <KpiCard
                  accent="amber"
                  label="Drives Conducted"
                  value={formatCount(metrics.drivesConducted)}
                  sub="Across 36 states + FCT"
                  icon={<FileText className="w-4 h-4 text-[#f59e0b]" />}
                />
                <KpiCard
                  accent="purple"
                  label="Audience Reached"
                  value={formatCount(metrics.reached)}
                  sub="100% targeted cohorts"
                  icon={<Users className="w-4 h-4 text-[#8b5cf6]" />}
                />
                <KpiCard
                  accent="rose"
                  label="States Requiring Action"
                  value={metrics.officesNeedingFollowUp}
                  sub="Executive decisions logged"
                  icon={<AlertTriangle className="w-4 h-4 text-[#ef4444]" />}
                />
              </>
            )}
          </div>

          {/* 3B. TAB 1: OVERVIEW PRESENTATION */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Layout design segmented buttons */}
              <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-[#d4e8dc]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Design Layout:</span>
                  <div className="flex items-center gap-0.5 bg-[#f4f7f5] p-1 rounded-lg border border-[#d4e8dc]">
                    {[
                      { id: "focus", label: "Focus", icon: Rows3 },
                      { id: "compare", label: "Compare", icon: Columns2 },
                      { id: "cards", label: "Cards", icon: LayoutGrid },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDesignMode(opt.id as any)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            designMode === opt.id ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Chart Mode:</span>
                  <div className="flex items-center gap-0.5 bg-[#f4f7f5] p-1 rounded-lg border border-[#d4e8dc]">
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`p-1 rounded ${chartType === "bar" ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-400"}`}
                      title="Bar Charts"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("line")}
                      className={`p-1 rounded ${chartType === "line" ? "bg-white text-[#145c3f] shadow-xs" : "text-slate-400"}`}
                      title="Line Charts"
                    >
                      <LineChartIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* SHARED ACTIVITY FUNNEL (Slide 10) */}
              <FunnelHeroCard funnel={level === 1 ? { audienceReached: 820, leadsGenerated: 276, enrolled: 164 } : level === 2 ? { audienceReached: 2450, leadsGenerated: 790, enrolled: 442 } : PPTX_DATA.national.funnel} />

              {/* PRIMARY VISUALISATION GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Enrolment by Activity Type */}
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                  <CardHeader className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#0f3d2e]">
                        Enrolment Generated by Activity Type
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        New enrolments from market outreach, forums, community visits & workplace drives
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-[#d4e8dc] text-[#145c3f]">
                      Primary Driver
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "bar" ? (
                          <BarChart
                            data={level === 1 ? PPTX_DATA.state.enrolmentByActivityType : PPTX_DATA.national.enrolmentByActivityType}
                            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                            <XAxis
                              dataKey="activity"
                              tick={{ fontSize: 11, fill: "#475569" }}
                              angle={-15}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                            <Tooltip content={<CustomTooltip unit="enrolments" />} />
                            <Bar dataKey="enrolled" name="Enrolled" fill="#145c3f" radius={[6, 6, 0, 0]}>
                              {(level === 1 ? PPTX_DATA.state.enrolmentByActivityType : PPTX_DATA.national.enrolmentByActivityType).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <LineChart
                            data={level === 1 ? PPTX_DATA.state.enrolmentByActivityType : PPTX_DATA.national.enrolmentByActivityType}
                            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                            <XAxis dataKey="activity" tick={{ fontSize: 11, fill: "#475569" }} angle={-15} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                            <Tooltip content={<CustomTooltip unit="enrolments" />} />
                            <Line type="monotone" dataKey="enrolled" stroke="#145c3f" strokeWidth={3} dot={{ r: 5, fill: "#145c3f" }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Activities by Target Audience */}
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                  <CardHeader className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#0f3d2e]">
                        Activities by Target Audience
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Drives organized for informal workers, students, formal sector & rural groups
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-[#d4e8dc] text-[#145c3f]">
                      Cohort Reach
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={level === 1 ? PPTX_DATA.state.targetAudience : level === 2 ? PPTX_DATA.zonal.targetAudience : PPTX_DATA.national.targetAudience}
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "#475569" }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#0f3d2e", fontWeight: 500 }} width={120} />
                          <Tooltip content={<CustomTooltip unit="activities" />} />
                          <Bar dataKey="count" name="Activities" radius={[0, 6, 6, 0]}>
                            {(level === 1 ? PPTX_DATA.state.targetAudience : level === 2 ? PPTX_DATA.zonal.targetAudience : PPTX_DATA.national.targetAudience).map((entry, index) => (
                              <Cell key={`aud-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Location Category Mix */}
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                  <CardHeader className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#0f3d2e]">
                        Activities by Location Category
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {level === 1 ? "Health facilities, community centres, institutions & media" : "Urban (42%), Peri-urban (25%), Rural (23%) & Workplaces (10%)"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-[#d4e8dc] text-[#145c3f]">
                      Geographic Spread
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 h-[280px]">
                      <div className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={level === 1 ? PPTX_DATA.state.locationCategory : PPTX_DATA.national.locationCategory}
                              dataKey="percentage"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={95}
                              paddingAngle={3}
                            >
                              {(level === 1 ? PPTX_DATA.state.locationCategory : PPTX_DATA.national.locationCategory).map((entry, index) => (
                                <Cell key={`loc-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip unit="%" />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2.5">
                        {(level === 1 ? PPTX_DATA.state.locationCategory : PPTX_DATA.national.locationCategory).map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color || PALETTE[idx % PALETTE.length] }} />
                              <span className="font-medium text-slate-700 truncate">{item.name}</span>
                            </div>
                            <span className="font-bold text-[#0f3d2e] tabular-nums shrink-0">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Lead Generation Rate by Zone / State Comparison */}
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                  <CardHeader className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#0f3d2e]">
                        {level === 2 ? "Drives & Enrolments by State" : "Lead Generation Rate by Zone (%)"}
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {level === 2 ? "Comparison of completed drives vs new enrolments across zone" : "Formula: (Leads Generated ÷ Target Audience Reached) × 100"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white border-[#d4e8dc] text-[#145c3f]">
                      Yield Metric
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {level === 2 ? (
                          <BarChart data={PPTX_DATA.zonal.drivesByState} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                            <XAxis dataKey="state" tick={{ fontSize: 11, fill: "#475569" }} />
                            <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                            <Bar dataKey="drives" name="Completed Drives" fill="#145c3f" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="enrolled" name="Enrolled Beneficiaries" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart data={PPTX_DATA.national.leadGenRateByZone} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8f3ec" />
                            <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#475569" }} angle={-15} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11, fill: "#475569" }} domain={[0, 50]} />
                            <Tooltip content={<CustomTooltip unit="%" />} />
                            <ReferenceLine y={31.1} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Nat. Avg 31.1%", fill: "#ef4444", fontSize: 10, position: "top" }} />
                            <Bar dataKey="rate" name="Lead Rate (%)" fill="#0ea5e9" radius={[6, 6, 0, 0]}>
                              {PPTX_DATA.national.leadGenRateByZone.map((entry, index) => (
                                <Cell
                                  key={`rate-${index}`}
                                  fill={entry.rate >= 35 ? "#145c3f" : entry.rate >= 30 ? "#0ea5e9" : "#f59e0b"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* DG / Executive Programme Contribution Strip (Slide 8 & 9) */}
              {level >= 3 && (
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <div className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0f3d2e]">Programme Contribution to Enrolment Drives</h3>
                      <p className="text-xs text-slate-500">Distribution of 128,450 beneficiaries enrolled across NHIA benefit programmes</p>
                    </div>
                    <span className="text-xs font-semibold text-[#145c3f] bg-white px-2.5 py-1 rounded-lg border border-[#d4e8dc]">
                      Top: FSSHIP (52%)
                    </span>
                  </div>
                  <CardContent className="p-4 md:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {PPTX_DATA.national.programmes.map((p) => (
                        <div key={p.name} className="p-3.5 rounded-xl border border-[#d4e8dc] bg-[#f8fdfb]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#0f3d2e]">{p.name}</span>
                            <span className="text-xs font-semibold text-slate-500">{p.pct}%</span>
                          </div>
                          <p className="text-xl font-bold text-[#145c3f] tabular-nums">{formatCount(p.count)}</p>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 3C. TAB 2: DETAILED ACTIVITY FUNNEL (Slide 10 deep-dive) */}
          {activeTab === "funnel" && (
            <div className="space-y-5">
              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-[#e8f5ee] px-4 md:px-6 py-4 border-b border-[#d4e8dc]">
                  <CardTitle className="text-base font-bold text-[#0f3d2e]">
                    Enrolment Activity Conversion Funnel
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Multi-stage pipeline tracking conversion from audience reached, to captured leads, to verified enrolled beneficiaries.
                  </p>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-8">
                  {/* Visual 3-Stage Interactive Funnel */}
                  <div className="relative max-w-3xl mx-auto space-y-4">
                    {/* Stage 1: Audience Reached */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#145c3f] to-[#1e7a54] text-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Stage 1 · Outreached Population</span>
                          <h4 className="text-2xl font-black mt-0.5">{formatCount(PPTX_DATA.national.funnel.audienceReached)}</h4>
                          <p className="text-xs text-emerald-100 mt-0.5">Target audience reached in communities, markets & workplaces</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">100%</span>
                          <p className="text-[11px] text-emerald-200">Baseline Volume</p>
                        </div>
                      </div>
                    </div>

                    {/* Funnel Dropoff 1 */}
                    <div className="flex items-center justify-center -my-2 relative z-10">
                      <div className="bg-white border border-[#d4e8dc] rounded-full px-4 py-1 text-xs font-semibold text-[#145c3f] shadow-xs flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                        <span>33.6% Conversion Rate (12,350 drop-off)</span>
                      </div>
                    </div>

                    {/* Stage 2: Leads Generated */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white p-5 shadow-sm ml-6 mr-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Stage 2 · Captured Leads</span>
                          <h4 className="text-2xl font-black mt-0.5">{formatCount(PPTX_DATA.national.funnel.leadsGenerated)}</h4>
                          <p className="text-xs text-sky-100 mt-0.5">Contact profiles & verified interest registered during outreach</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">33.6%</span>
                          <p className="text-[11px] text-sky-200">of Reached</p>
                        </div>
                      </div>
                    </div>

                    {/* Funnel Dropoff 2 */}
                    <div className="flex items-center justify-center -my-2 relative z-10">
                      <div className="bg-white border border-[#d4e8dc] rounded-full px-4 py-1 text-xs font-semibold text-[#145c3f] shadow-xs flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                        <span>66.9% Lead-to-Enrolment Yield (2,070 in follow-up)</span>
                      </div>
                    </div>

                    {/* Stage 3: Enrolled */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#25a872] to-[#1a7a52] text-white p-5 shadow-sm ml-12 mr-12">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Stage 3 · Successfully Enrolled</span>
                          <h4 className="text-2xl font-black mt-0.5">{formatCount(PPTX_DATA.national.funnel.enrolled)}</h4>
                          <p className="text-xs text-emerald-100 mt-0.5">Biometrics captured & linked to enrolment drive activities</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">66.9%</span>
                          <p className="text-[11px] text-emerald-200">of Leads (22.5% Overall)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Methodological Rules from Slide 10 */}
                  <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#145c3f]" />
                      <h5 className="text-xs font-bold text-[#0f3d2e] uppercase tracking-wide">Core Rules for Enrolment Analysis</h5>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                      <li>Activities planned vs recorded/completed track delivery integrity across state offices.</li>
                      <li>Target audience planned vs reached isolates venue effectiveness and turnout.</li>
                      <li><strong>Count only enrolment records linked to the specific activity</strong> — strictly audited.</li>
                      <li><strong>Avoid double-counting</strong> if a beneficiary participates in more than one outreach event.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3D. TAB 3: CROSS-TAB MATRIX (Slide 6 deep-dive) */}
          {activeTab === "matrix" && (
            <div className="space-y-5">
              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-[#e8f5ee] px-4 md:px-6 py-4 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-[#0f3d2e]">
                      Enrolment by Activity Type and Location Category
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      Cross-tabulation matrix showing output distribution across venues and engagement modalities.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white border-[#d4e8dc] text-[#145c3f]">
                    Slide 6 Matrix
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Location Category</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Market Outreach</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Community Visit</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Stakeholder Forum</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Workplace Session</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Total Enrolments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PPTX_DATA.zonal.crosstab.map((row) => (
                          <TableRow key={row.location} className="hover:bg-[#f8fdfb]">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e]">{row.location}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium bg-emerald-50/40 text-emerald-900">{formatCount(row.market)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium bg-teal-50/40 text-teal-900">{formatCount(row.community)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium bg-sky-50/40 text-sky-900">{formatCount(row.forum)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium bg-amber-50/40 text-amber-900">{formatCount(row.workplace)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-bold text-[#145c3f] bg-[#eef6f1]">{formatCount(row.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3E. TAB 4: PERFORMANCE EXCEPTIONS & DECISIONS (Slide 2, 7 & 8) */}
          {activeTab === "exceptions" && (
            <div className="space-y-5">
              {level === 4 ? (
                /* DG Level 4: Management Issues & Strategic Decisions (Slide 8) */
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-[#e8f5ee] px-4 md:px-6 py-4 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-[#0f3d2e]">
                        Management Issues & Strategic Decisions
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Executive decision log tracking national policy interventions and operational owner accountability.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white border-[#d4e8dc] text-[#145c3f]">
                      Executive Action
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Key Issue</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Decision Required</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Owner</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Priority</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PPTX_DATA.national.decisions.map((dec, idx) => (
                          <TableRow key={idx} className="hover:bg-[#f8fdfb]">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e]">{dec.issue}</TableCell>
                            <TableCell className="text-sm text-slate-700">{dec.decision}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <Badge variant="outline" className="text-xs border-[#d4e8dc] text-[#145c3f]">
                                {dec.owner}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${dec.priority === "Urgent" ? "bg-rose-100 text-rose-700 border-rose-200" : dec.priority === "High" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                {dec.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                                onClick={() => onRecordAction?.(undefined, dec.issue)}
                              >
                                Log Directive <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : level === 2 ? (
                /* Zonal Level 2: State Follow-up List (Slide 7) */
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-[#e8f5ee] px-4 md:px-6 py-4 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-[#0f3d2e]">
                        Zonal State Follow-up List
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Monitoring state activity trajectories and targeted recovery plans across the zone.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white border-[#d4e8dc] text-[#145c3f]">
                      Zonal Direction
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">State Office</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Trend Trajectory</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Operational Issue</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Next Step</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PPTX_DATA.zonal.stateFollowUp.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-[#f8fdfb]">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e]">{item.state}</TableCell>
                            <TableCell className="text-xs">
                              <span className={`inline-flex items-center gap-1 font-semibold ${item.trend === "up" ? "text-emerald-700" : item.trend === "down" ? "text-rose-600" : "text-amber-700"}`}>
                                {item.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : item.trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                {item.trendLabel}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-700">{item.issue}</TableCell>
                            <TableCell className="text-sm font-medium text-[#145c3f]">{item.nextStep}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
                                onClick={() => onRecordAction?.(item.state, item.issue)}
                              >
                                Follow-up
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                /* SDO Level 3: Reporting & Performance Exceptions (Slide 2) */
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-[#e8f5ee] px-4 md:px-6 py-4 border-b border-[#d4e8dc] flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-[#0f3d2e]">
                        National Reporting & Performance Exceptions
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Automated exception detection: late reporting, non-conducted drives & conversion anomalies.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white border-[#d4e8dc] text-[#ef4444]">
                      {PPTX_DATA.national.exceptions.length} Active Exceptions
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">State Office</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Detected Issue</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Required Action</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Status</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PPTX_DATA.national.exceptions.map((ex, idx) => (
                          <TableRow key={idx} className="hover:bg-[#f8fdfb]">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e]">{ex.office}</TableCell>
                            <TableCell className="text-sm text-slate-700">{ex.issue}</TableCell>
                            <TableCell className="text-sm font-medium text-[#145c3f]">{ex.action}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${ex.status === "Urgent" ? "bg-rose-100 text-rose-700 border-rose-200" : ex.status === "In progress" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                {ex.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
                                onClick={() => onRecordAction?.(ex.office, ex.issue)}
                              >
                                Take Action
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 3F. TAB 5: REGISTERS (Activity Register for L1, State Register for L2/3/4) */}
          {activeTab === "register" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#d4e8dc]">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={level === 1 ? "Search activities..." : "Search states or zones..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-[#f4f7f5] border-[#d4e8dc]"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {level === 1
                    ? `${PPTX_DATA.state.activityRegister.length} activities logged for state`
                    : `${apiData?.states?.length || 37} states in national register`}
                </p>
              </div>

              {level === 1 ? (
                /* Level 1: State Coordinator Activity Register (Slide 5) */
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <div className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0f3d2e]">Enrolment Drive Activity Register</h3>
                    <p className="text-xs text-slate-500">Drill-through: select an activity to inspect records and linked beneficiaries</p>
                  </div>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Activity Title</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Audience Reached</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Leads Generated</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Enrolled</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Conversion</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Status</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PPTX_DATA.state.activityRegister
                          .filter((act) => act.activity.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((row) => (
                            <TableRow key={row.id} className="hover:bg-[#f8fdfb]">
                              <TableCell className="text-sm font-semibold text-[#0f3d2e]">
                                {row.activity}
                                <span className="block text-[10px] font-mono text-slate-400 font-normal">{row.id} · {row.date}</span>
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-700">
                                {row.reached ? formatCount(row.reached) : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-700">
                                {formatCount(row.leads)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-bold text-[#145c3f]">
                                {formatCount(row.enrolled)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-medium text-slate-600">
                                {row.conversion}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${row.status === "Complete" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : row.status === "In progress" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                                  onClick={() => onViewReport?.(row.id)}
                                >
                                  View Record <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                /* Level 2/3/4: Comprehensive State Performance Register */
                <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
                  <div className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0f3d2e]">State Performance & Reporting Ledger</h3>
                    <p className="text-xs text-slate-500">Live aggregated statistics by state office and zonal hub</p>
                  </div>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">State Office</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e]">Reports</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Planned</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Completed</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Reached</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Leads</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Enrolled</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Conversion</TableHead>
                          <TableHead className="text-xs font-bold text-[#0f3d2e] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(apiData?.states || PPTX_DATA.zonal.drivesByState.map((d) => ({
                          code: d.state,
                          description: d.state,
                          reports: 1,
                          finalised: 1,
                          planned: d.planned,
                          conducted: d.drives,
                          reached: d.drives * 160,
                          leads: d.leads,
                          enrolled: d.enrolled,
                          conversion_rate: Math.round((d.enrolled / d.leads) * 1000) / 10,
                        })))
                          .filter((st: any) => (st.description || st.code).toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((st: any) => (
                            <TableRow key={st.code} className="hover:bg-[#f8fdfb]">
                              <TableCell className="text-sm font-semibold text-[#0f3d2e]">
                                {st.description || st.code}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {st.reports ? `${st.finalised || 0}/${st.reports} submitted` : <span className="text-rose-500 font-medium">Pending</span>}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-600">{st.planned ?? "—"}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-700 font-medium">{st.conducted ?? 0}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-700">{formatCount(st.reached)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums text-slate-700">{formatCount(st.leads)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-bold text-[#145c3f]">{formatCount(st.enrolled)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-semibold text-slate-700">
                                {st.conversion_rate != null ? `${st.conversion_rate}%` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                                  onClick={() => onRecordAction?.(st.code, "Review activity performance and conversion")}
                                >
                                  Follow-up
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTS & HELPERS
// -------------------------------------------------------------

function CalendarIcon() {
  return <Clock className="w-4 h-4 text-[#25a872]" />;
}

function KpiCard({
  label,
  value,
  sub,
  accent = "green",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "teal" | "blue" | "amber" | "purple" | "rose";
  icon?: React.ReactNode;
}) {
  const accentBorder = {
    green: "border-l-[#145c3f]",
    teal: "border-l-[#14b8a6]",
    blue: "border-l-[#0ea5e9]",
    amber: "border-l-[#f59e0b]",
    purple: "border-l-[#8b5cf6]",
    rose: "border-l-[#ef4444]",
  }[accent];

  return (
    <div className={`rounded-xl border border-[#d4e8dc] border-l-4 ${accentBorder} bg-white p-3.5 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">
          {label}
        </p>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
      <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight mt-0.5">
        {value}
      </p>
      {sub ? (
        <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
          {sub}
        </p>
      ) : (
        <div className="h-4" />
      )}
    </div>
  );
}

function FunnelHeroCard({ funnel }: { funnel: { audienceReached: number; leadsGenerated: number; enrolled: number } }) {
  const leadRate = Math.round((funnel.leadsGenerated / funnel.audienceReached) * 1000) / 10;
  const enrollRate = Math.round((funnel.enrolled / funnel.leadsGenerated) * 1000) / 10;
  const overallYield = Math.round((funnel.enrolled / funnel.audienceReached) * 1000) / 10;

  return (
    <Card className="rounded-2xl border border-[#d4e8dc] shadow-sm overflow-hidden bg-white">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#145c3f]" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#0f3d2e]">
            Shared Enrolment Activity Funnel (Slide 10)
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#145c3f]">
          Overall Conversion Yield: <strong className="text-[#0f3d2e]">{overallYield}%</strong>
        </span>
      </div>
      <CardContent className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Step 1</span>
              <p className="text-xs font-bold text-[#0f3d2e] mt-0.5">Audience Reached</p>
              <p className="text-2xl font-black text-[#145c3f] mt-1 tabular-nums">
                {formatCount(funnel.audienceReached)}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">100% Outreach Base</p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-[#d4e8dc] bg-[#f0f9ff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-sky-500">Step 2</span>
                <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                  {leadRate}% yield
                </span>
              </div>
              <p className="text-xs font-bold text-sky-950 mt-0.5">Leads Generated</p>
              <p className="text-2xl font-black text-sky-700 mt-1 tabular-nums">
                {formatCount(funnel.leadsGenerated)}
              </p>
            </div>
            <p className="text-[11px] text-sky-600 mt-2">Contacts & interest captured</p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-[#d4e8dc] bg-[#f0fdf4] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Step 3</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  {enrollRate}% of leads
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-950 mt-0.5">Beneficiaries Enrolled</p>
              <p className="text-2xl font-black text-[#145c3f] mt-1 tabular-nums">
                {formatCount(funnel.enrolled)}
              </p>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2">Linked to drive activity</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[#d4e8dc] bg-white p-3 shadow-md text-xs">
        <p className="font-bold text-[#0f3d2e] mb-1">{label || payload[0].name}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-slate-600 flex items-center justify-between gap-3">
            <span style={{ color: p.color || p.fill }}>{p.name}:</span>
            <span className="font-bold tabular-nums">
              {Number(p.value).toLocaleString()}{unit ? ` ${unit}` : ""}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}
