import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Globe,
  HandHelping,
  HelpCircle,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import type { ColumnDef } from "@tanstack/react-table";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626", // Red-600
  High: "#f59e0b",     // Amber-500
  Medium: "#3b82f6",   // Blue-500
  Low: "#10b981",      // Emerald-500
};

const STATUS_COLORS: Record<string, string> = {
  "In-progress": "#f59e0b",
  "In Progress": "#f59e0b",
  "Under Review": "#6366f1",
  Escalated: "#dc2626",
  "Action Initiated": "#0284c7",
  Resolved: "#16a34a",
  Closed: "#64748b",
  Submitted: "#3b82f6",
  Assigned: "#8b5cf6",
};

interface Props {
  challenges: any[];
  supportList: any[];
  catalogue: any;
  loading?: boolean;
  onRefresh: () => void;
  onOpenChallengeDetail: (id: string) => void;
  onOpenSupportDetail: (id: string) => void;
  onNewChallenge?: () => void;
  onNewSupport?: () => void;
}

export default function ChallengesSupportDashboardTab({
  challenges,
  supportList,
  catalogue,
  loading = false,
  onRefresh,
  onOpenChallengeDetail,
  onOpenSupportDetail,
  onNewChallenge,
  onNewSupport,
}: Props) {
  const authUser = useSelector((s: RootState) => (s.auth as any)?.user);
  const role = (authUser?.role || "").toLowerCase();

  const isNationalUser = role === "admin" || role === "sdo" || role === "dg-ceo";
  const isDG = role === "dg-ceo";
  const isZonalUser = role.includes("zonal") || role === "soc-zonal-coordinator";
  const isStateUser = role.includes("state") && !isNationalUser && !isZonalUser;

  // Assigned codes from auth or catalogue
  const assignedZoneCode =
    catalogue?.default_zone || authUser?.zonal_code || (isZonalUser ? "NC" : null);
  const assignedStateCode =
    catalogue?.default_state || authUser?.state_code || null;

  // View state: "dg" | "national" | "zonal" | "state"
  type ViewMode = "dg" | "national" | "zonal" | "state";
  const defaultView: ViewMode = isDG
    ? "dg"
    : isNationalUser
    ? "national"
    : isZonalUser
    ? "zonal"
    : "state";

  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView);

  // Filters
  const [filterPeriod, setFilterPeriod] = React.useState<string>("current-quarter");
  const [filterZone, setFilterZone] = React.useState<string>(
    isZonalUser ? (assignedZoneCode || "NC") : (isStateUser ? (assignedZoneCode || "NC") : "all")
  );
  const [filterState, setFilterState] = React.useState<string>(
    isStateUser ? (assignedStateCode || "all") : "all"
  );
  const [filterSeverity, setFilterSeverity] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");

  const zones: { zonal_code: string; description: string }[] = catalogue?.zones || [];
  const states: { code: string; description: string; zonal_code: string }[] =
    catalogue?.states || [];

  // Filtered states based on zone
  const availableStates = React.useMemo(() => {
    const activeZone = isZonalUser ? (assignedZoneCode || filterZone) : filterZone;
    if (activeZone === "all") return states;
    return states.filter((s) => s.zonal_code === activeZone);
  }, [states, filterZone, assignedZoneCode, isZonalUser]);

  // Active Zone to display
  const activeZoneCode = isZonalUser
    ? (assignedZoneCode || "NC")
    : (filterZone !== "all" ? filterZone : "NC");
  const activeZoneObj = zones.find((z) => z.zonal_code === activeZoneCode);
  const activeZoneLabel = activeZoneObj?.description || activeZoneCode;

  // Apply scoped filters to challenges
  const scopedChallenges = React.useMemo(() => {
    return challenges.filter((c) => {
      if (isStateUser && assignedStateCode && c.state_code !== assignedStateCode) return false;
      if (viewMode === "state" && filterState !== "all" && c.state_code !== filterState) return false;
      if (viewMode === "zonal" || isZonalUser) {
        if (c.zonal_code !== activeZoneCode) return false;
        if (filterState !== "all" && c.state_code !== filterState) return false;
      } else if (viewMode === "national" || viewMode === "dg") {
        if (filterZone !== "all" && c.zonal_code !== filterZone) return false;
        if (filterState !== "all" && c.state_code !== filterState) return false;
      }
      if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterCategory !== "all" && c.category_key !== filterCategory) return false;
      return true;
    });
  }, [
    challenges,
    isStateUser,
    assignedStateCode,
    viewMode,
    filterState,
    isZonalUser,
    activeZoneCode,
    filterZone,
    filterSeverity,
    filterStatus,
    filterCategory,
  ]);

  // Apply scoped filters to support requests
  const scopedSupport = React.useMemo(() => {
    return supportList.filter((s) => {
      if (isStateUser && assignedStateCode && s.state_code !== assignedStateCode) return false;
      if (viewMode === "state" && filterState !== "all" && s.state_code !== filterState) return false;
      if (viewMode === "zonal" || isZonalUser) {
        if (s.zonal_code !== activeZoneCode) return false;
        if (filterState !== "all" && s.state_code !== filterState) return false;
      } else if (viewMode === "national" || viewMode === "dg") {
        if (filterZone !== "all" && s.zonal_code !== filterZone) return false;
        if (filterState !== "all" && s.state_code !== filterState) return false;
      }
      if (filterSeverity !== "all" && s.priority !== filterSeverity) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      return true;
    });
  }, [
    supportList,
    isStateUser,
    assignedStateCode,
    viewMode,
    filterState,
    isZonalUser,
    activeZoneCode,
    filterZone,
    filterSeverity,
    filterStatus,
  ]);

  // KPI Calculations
  const totalChallenges = scopedChallenges.length;
  const criticalHighCount = scopedChallenges.filter(
    (c) => c.severity === "Critical" || c.severity === "High"
  ).length;
  const criticalCount = scopedChallenges.filter((c) => c.severity === "Critical").length;
  const resolvedChallengesCount = scopedChallenges.filter(
    (c) => c.status === "Resolved" || c.status === "Closed"
  ).length;
  const escalatedChallengesCount = scopedChallenges.filter(
    (c) => c.status === "Escalated"
  ).length;

  const totalSupport = scopedSupport.length;
  const openSupportCount = scopedSupport.filter(
    (s) => s.status !== "Resolved" && s.status !== "Closed"
  ).length;
  const awaitingActionSupportCount = scopedSupport.filter(
    (s) => s.status === "Submitted" || s.status === "Under Review"
  ).length;

  // Overdue actions: required_by_date in past and not resolved
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = scopedSupport.filter(
    (s) => s.required_by_date && s.required_by_date < todayStr && s.status !== "Resolved"
  ).length;

  // Slide 3: Challenges by category
  const categoryCounts: Record<string, number> = {};
  scopedChallenges.forEach((c) => {
    const cat = c.category_label || c.category_key || "Other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryChartData = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + "..." : name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Slide 3: Support requests by status
  const supportStatusCounts: Record<string, number> = {};
  scopedSupport.forEach((s) => {
    const st = s.status || "Submitted";
    supportStatusCounts[st] = (supportStatusCounts[st] || 0) + 1;
  });
  const supportStatusChartData = Object.entries(supportStatusCounts).map(([name, count]) => ({
    name,
    count,
    color: STATUS_COLORS[name] || "#64748b",
  }));

  // Slide 4: Challenges by state in active zone
  const stateChartData = availableStates
    .map((st) => {
      const cnt = scopedChallenges.filter((c) => c.state_code === st.code).length;
      return {
        code: st.code,
        state: st.description || st.code,
        count: cnt,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Slide 4: Support requests by action owner
  const actionOwnerCounts: Record<string, number> = {};
  scopedSupport.forEach((s) => {
    const owner = s.action_required_from || "Other";
    actionOwnerCounts[owner] = (actionOwnerCounts[owner] || 0) + 1;
  });
  const actionOwnerChartData = Object.entries(actionOwnerCounts).map(([name, count]) => ({
    name: name.length > 18 ? name.slice(0, 16) + "..." : name,
    count,
  }));

  // Slide 5: Challenges by zone (National view)
  const zoneChartData = zones.map((z) => {
    const cnt = challenges.filter((c) => c.zonal_code === z.zonal_code).length;
    return {
      code: z.zonal_code,
      zone: z.description || z.zonal_code,
      count: cnt,
    };
  });

  // Slide 5: Support requests by department
  const deptCounts: Record<string, number> = {};
  scopedSupport.forEach((s) => {
    const dept = s.nhia_department || (s.action_required_from === "SDO" ? "SDO" : "Zonal Office");
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptChartData = Object.entries(deptCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Slide 7: Challenge severity profile
  const severityChartData = ["Critical", "High", "Medium", "Low"].map((sev) => ({
    name: sev,
    count: scopedChallenges.filter((c) => c.severity === sev).length,
    color: SEVERITY_COLORS[sev],
  }));

  // Slide 7: Challenge status distribution
  const challengeStatusCounts: Record<string, number> = {};
  scopedChallenges.forEach((c) => {
    const st = c.status || "In-progress";
    challengeStatusCounts[st] = (challengeStatusCounts[st] || 0) + 1;
  });
  const challengeStatusChartData = Object.entries(challengeStatusCounts).map(([name, count]) => ({
    name,
    count,
    color: STATUS_COLORS[name] || "#0284c7",
  }));

  // Slide 9: Alerts & Operational Queue (Top Critical & Overdue items)
  const priorityQueue = React.useMemo(() => {
    const items: any[] = [];
    scopedChallenges.forEach((c) => {
      if (c.severity === "Critical" || c.status === "Escalated") {
        items.push({
          id: c.challenge_id,
          type: "Challenge",
          priority: c.severity || "Critical",
          ref: c.challenge_id,
          title: c.specific_challenge || c.category_label || "Operational Challenge",
          state: c.state_code,
          owner: c.escalation_department || "SDO",
          status: c.status,
          requiredBy: c.date_reported,
          isOverdue: false,
          raw: c,
        });
      }
    });
    scopedSupport.forEach((s) => {
      const isPast = s.required_by_date && s.required_by_date < todayStr && s.status !== "Resolved";
      if (s.priority === "Critical" || s.priority === "High" || isPast) {
        items.push({
          id: s.support_id,
          type: "Support",
          priority: s.priority || "High",
          ref: s.support_id,
          title: s.specific_support || s.support_category || "Support Request",
          state: s.state_code,
          owner: s.nhia_department || s.action_required_from || "SDO",
          status: s.status,
          requiredBy: s.required_by_date || "—",
          isOverdue: isPast,
          raw: s,
        });
      }
    });
    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.priority === "Critical" && b.priority !== "Critical") return -1;
      if (a.priority !== "Critical" && b.priority === "Critical") return 1;
      return 0;
    });
  }, [scopedChallenges, scopedSupport, todayStr]);

  const priorityColumns: ColumnDef<any>[] = React.useMemo(() => [
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              item.priority === "Critical"
                ? "bg-rose-100 text-rose-700"
                : item.priority === "High"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {item.priority}
          </span>
        );
      },
    },
    {
      accessorKey: "ref",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-[#1a7a52]">
          {row.original.ref}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Challenge / Support Description",
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-slate-800 line-clamp-1 max-w-[280px]">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-slate-700">
          {row.original.state}
        </span>
      ),
    },
    {
      accessorKey: "owner",
      header: "Action Owner",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-slate-600">
          {row.original.owner}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "requiredBy",
      header: "Required By",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={item.isOverdue ? "text-rose-600 font-bold" : "text-slate-600"}>
              {item.requiredBy}
            </span>
            {item.isOverdue && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-black rounded uppercase">
                Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (row.original.type === "Challenge") onOpenChallengeDetail(row.original.id);
              else onOpenSupportDetail(row.original.id);
            }}
            className="h-6 px-2 text-[11px] text-[#1a7a52] hover:bg-[#e8f5ee] font-bold gap-1 rounded-sm"
          >
            <Eye className="size-3" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ], [onOpenChallengeDetail, onOpenSupportDetail]);

  return (
    <div className="space-y-3.5">
      {/* ── Top Role-Based View Switcher ── */}
      {(isNationalUser || isDG) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-sm border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[#1a7a52]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Executive View:
            </span>
            <div className="flex items-center gap-1.5 bg-[#f4f7f5] p-1 rounded-sm border border-slate-200">
              {isDG && (
                <Button
                  variant={viewMode === "dg" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("dg")}
                  className={`h-7 px-2.5 text-xs font-bold rounded-sm gap-1.5 transition-all ${
                    viewMode === "dg"
                      ? "bg-[#1a7a52] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldAlert className="size-3.5" />
                  <span>DG Executive</span>
                </Button>
              )}
              <Button
                variant={viewMode === "national" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("national")}
                className={`h-7 px-2.5 text-xs font-bold rounded-sm gap-1.5 transition-all ${
                  viewMode === "national"
                    ? "bg-[#1a7a52] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe className="size-3.5" />
                <span>National SDO</span>
              </Button>
              <Button
                variant={viewMode === "zonal" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("zonal")}
                className={`h-7 px-2.5 text-xs font-bold rounded-sm gap-1.5 transition-all ${
                  viewMode === "zonal"
                    ? "bg-[#1a7a52] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="size-3.5" />
                <span>Zonal View</span>
              </Button>
              <Button
                variant={viewMode === "state" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("state")}
                className={`h-7 px-2.5 text-xs font-bold rounded-sm gap-1.5 transition-all ${
                  viewMode === "state"
                    ? "bg-[#1a7a52] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MapPin className="size-3.5" />
                <span>State Office</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters Bar (Matching Select style: h-11, rounded-sm, border-2 border-[#1a7a52], bg-[#f4f7f5]) ── */}
      <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs">
        <CardContent className="p-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Period */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Reporting Period
              </label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger displayValue={filterPeriod === "current-quarter" ? "Current Quarter" : "Full Year 2026"}>
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="full-year">Full Year 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zone Filter (Locked to assigned zone for zonal user, selectable for national) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Zone {isZonalUser && "• Assigned"}
              </label>
              <Select
                value={isZonalUser ? (assignedZoneCode || filterZone) : filterZone}
                onValueChange={(val) => {
                  setFilterZone(val);
                  setFilterState("all");
                }}
                disabled={isZonalUser || isStateUser}
              >
                <SelectTrigger
                  displayValue={
                    isZonalUser
                      ? (zones.find((z) => z.zonal_code === (assignedZoneCode || filterZone))?.description || assignedZoneCode)
                      : filterZone === "all"
                      ? "All Zones"
                      : (zones.find((z) => z.zonal_code === filterZone)?.description || filterZone)
                  }
                >
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {isZonalUser ? (
                    <SelectItem value={assignedZoneCode || filterZone}>
                      {zones.find((z) => z.zonal_code === (assignedZoneCode || filterZone))?.description || assignedZoneCode || "Assigned Zone"}
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.zonal_code} value={z.zonal_code}>
                          {z.description || z.zonal_code}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* State Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                State Office {isStateUser && "• Assigned"}
              </label>
              <Select
                value={filterState}
                onValueChange={setFilterState}
                disabled={isStateUser}
              >
                <SelectTrigger
                  displayValue={
                    filterState === "all"
                      ? "All States"
                      : (states.find((s) => s.code === filterState)?.description || filterState)
                  }
                >
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {availableStates.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.description || s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Severity Level
              </label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger displayValue={filterSeverity === "all" ? "All Levels" : filterSeverity}>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Status
              </label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger displayValue={filterStatus === "all" ? "All Statuses" : filterStatus}>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="In-progress">In-progress</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Escalated">Escalated</SelectItem>
                  <SelectItem value="Action Initiated">Action Initiated</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4 Top KPI Cards (Matching PPT Slides 3, 4, 5, 6) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {viewMode === "dg" || viewMode === "national"
                ? "CHALLENGES REPORTED"
                : viewMode === "zonal"
                ? "ZONE CHALLENGES"
                : "MY CHALLENGES"}
            </span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {totalChallenges}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">Distinct Challenge IDs</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {viewMode === "dg" ? "CRITICAL CHALLENGES" : "CRITICAL / HIGH"}
            </span>
            <ShieldAlert className="size-4 text-rose-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-rose-600 tabular-nums">
              {viewMode === "dg" ? criticalCount : criticalHighCount}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">Priority attention risks</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              SUPPORT REQUESTS
            </span>
            <HandHelping className="size-4 text-[#1a7a52]" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {totalSupport}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">Distinct Support IDs</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {viewMode === "dg"
                ? "OVERDUE ACTIONS"
                : viewMode === "zonal"
                ? "AWAITING ACTION"
                : "OPEN SUPPORT"}
            </span>
            <Clock className="size-4 text-indigo-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-black text-indigo-700 tabular-nums">
              {viewMode === "dg"
                ? overdueCount
                : viewMode === "zonal"
                ? awaitingActionSupportCount
                : openSupportCount}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {viewMode === "dg"
                ? "Past required-by date"
                : "Not yet resolved / closed"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 2: Charts Depending on Active View (Slides 3, 4, 5, 6) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Left Chart */}
        <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs overflow-hidden p-0 gap-0">
          <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>
                {viewMode === "national"
                  ? "Challenges by Zone"
                  : viewMode === "zonal"
                  ? `Challenges by State (${activeZoneLabel})`
                  : viewMode === "dg"
                  ? "Top National Challenge Themes"
                  : "Challenges by Category"}
              </span>
              <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                Volume
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === "national" ? (
                  <BarChart data={zoneChartData} margin={{ top: 8, right: 10, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#1a7a52" radius={[3, 3, 0, 0]} name="Challenges" />
                  </BarChart>
                ) : viewMode === "zonal" ? (
                  <BarChart data={stateChartData} margin={{ top: 8, right: 10, left: 0, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="state" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#1a7a52" radius={[3, 3, 0, 0]} name="Challenges" />
                  </BarChart>
                ) : (
                  <BarChart
                    data={categoryChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={105} tick={{ fontSize: 9 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#1a7a52" radius={[0, 3, 3, 0]} name="Challenges" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Chart */}
        <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs overflow-hidden p-0 gap-0">
          <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>
                {viewMode === "national"
                  ? "Support Requests by Department"
                  : viewMode === "zonal"
                  ? "Support Requests by Action Owner"
                  : viewMode === "dg"
                  ? "Requests Routed to Action Owners"
                  : "Support Requests by Status"}
              </span>
              <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                Support
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === "state" ? (
                  <BarChart data={supportStatusChartData} margin={{ top: 8, right: 10, left: 0, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {supportStatusChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    data={viewMode === "national" ? deptChartData : actionOwnerChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={105} tick={{ fontSize: 9 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 3, 3, 0]} name="Requests" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Challenge & Support Detailed Breakdown (Slides 7 & 8) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Severity Profile */}
        <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs overflow-hidden p-0 gap-0">
          <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Challenge Severity Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 space-y-2">
            {severityChartData.map((sev) => {
              const pct = totalChallenges ? Math.round((sev.count / totalChallenges) * 100) : 0;
              return (
                <div key={sev.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sev.color }} />
                      {sev.name}
                    </span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {sev.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: sev.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs overflow-hidden p-0 gap-0">
          <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Challenge Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 space-y-2">
            {challengeStatusChartData.slice(0, 5).map((st) => {
              const pct = totalChallenges ? Math.round((st.count / totalChallenges) * 100) : 0;
              return (
                <div key={st.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[11px]">{st.name}</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: st.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Key Operational Rates (Slide 10 KPIs) */}
        <Card className="rounded-sm border border-slate-200/80 bg-white shadow-xs overflow-hidden p-0 gap-0">
          <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-600 font-medium">Resolution Rate</span>
              <span className="text-xs font-bold text-[#1a7a52]">
                {totalChallenges ? Math.round((resolvedChallengesCount / totalChallenges) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-600 font-medium">Escalation Rate</span>
              <span className="text-xs font-bold text-rose-600">
                {totalChallenges ? Math.round((escalatedChallengesCount / totalChallenges) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-600 font-medium">Linked Support Share</span>
              <span className="text-xs font-bold text-indigo-600">
                {totalSupport
                  ? Math.round(
                      (scopedSupport.filter((s) => s.challenge_id).length / totalSupport) * 100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-medium">Overdue Requests</span>
              <span className="text-xs font-bold text-amber-600">
                {overdueCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Priority Alerts & Operational Queue (Slide 9 - ShadcnDataTable) ── */}
      <ShadcnDataTable
        title="PRIORITY ALERTS, OUTSTANDING REQUESTS & ACTION QUEUE"
        infoTooltip="Immediate notifications, critical items, and requests awaiting action"
        columns={priorityColumns}
        data={priorityQueue}
        searchPlaceholder="Filter priority alerts & queue..."
        emptyMessage="No critical or outstanding operational items for this scope."
        onRowClick={(item) => {
          if (item.type === "Challenge") onOpenChallengeDetail(item.id);
          else onOpenSupportDetail(item.id);
        }}
        pageSize={10}
        showTableOptions={false}
      />
    </div>
  );
}
