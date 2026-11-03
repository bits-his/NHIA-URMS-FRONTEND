import * as React from "react";
import {
  ArrowLeft,
  Plus,
  Send,
  Eye,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  RefreshCw,
  FileText,
  ChevronRight,
  Layers,
  Sparkles,
  Pencil,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { adhocAssignmentApi } from "@/lib/api";
import SdoAssignmentRegisterPage from "./SdoAssignmentRegisterPage";
import SdoStateDistributionModal from "./SdoStateDistributionModal";
import SdoStateDistributionPage from "./SdoStateDistributionPage";
import StateAssignmentReportModal from "./StateAssignmentReportModal";
import StateAssignmentReportPage from "./StateAssignmentReportPage";
import AdhocMasterDetailModal from "./AdhocMasterDetailModal";
import AdhocMasterDetailPage from "./AdhocMasterDetailPage";

interface Props {
  onBack: () => void;
  user?: any;
  userRole?: string;
}

const PROGRESS_BADGES: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  awaiting_support: { label: "Awaiting Support", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  deferred: { label: "Deferred", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

const REVIEW_BADGES: Record<string, { label: string; cls: string }> = {
  not_due: { label: "Not Due", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  not_submitted: { label: "Not Submitted", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  under_review: { label: "Under Review", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  returned_for_clarification: { label: "Returned for Clarification", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AdhocAssignmentWorkspace({ onBack, user, userRole }: Props) {
  const role = String(userRole || user?.role || "").toLowerCase();
  const isSdo = role === "admin" || role === "sdo" || role.startsWith("sdo") || user?.department_code === "SDU" || user?.department_code === "SPD";
  const isStateUser = !isSdo && (!!user?.state_code || role === "spd-reporting-officer" || role === "state-officer" || role.includes("state"));

  const [activeTab, setActiveTab] = React.useState<"sdo_register" | "state_tasks" | "my_tasks">(
    isStateUser ? "my_tasks" : "sdo_register"
  );

  const [departments, setDepartments] = React.useState<{ department_code: string; name: string }[]>([]);
  const [allStates, setAllStates] = React.useState<any[]>([]);

  // SDO Masters state
  const [masters, setMasters] = React.useState<any[]>([]);
  const [loadingMasters, setLoadingMasters] = React.useState(false);

  // State Tasks state
  const [stateAssignments, setStateAssignments] = React.useState<any[]>([]);
  const [loadingStateTasks, setLoadingStateTasks] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Page vs list view mode
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<"list" | "register" | "edit" | "report" | "distribute" | "view_master">("list");
  const [editMasterData, setEditMasterData] = React.useState<any>(null);

  React.useEffect(() => {
    if (location.pathname.endsWith("/register") || location.pathname.endsWith("/create")) {
      setViewMode("register");
    }
  }, [location.pathname]);

  const [distributionModalOpen, setDistributionModalOpen] = React.useState(false);
  const [dispatchMasterTarget, setDispatchMasterTarget] = React.useState<any>(null);

  const [stateReportModalOpen, setStateReportModalOpen] = React.useState(false);
  const [selectedStateAssignment, setSelectedStateAssignment] = React.useState<any>(null);

  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [detailMasterId, setDetailMasterId] = React.useState<string | null>(null);

  // Load Lookups on mount
  React.useEffect(() => {
    (async () => {
      try {
        const [depRes, stRes] = await Promise.all([
          adhocAssignmentApi.getDepartments(),
          adhocAssignmentApi.getStates(),
        ]);
        setDepartments(depRes.data || []);
        setAllStates(stRes.data || []);
      } catch (_) {}
    })();
  }, []);

  const fetchMasters = React.useCallback(async () => {
    setLoadingMasters(true);
    try {
      const res = await adhocAssignmentApi.listMasters({
        search: search || undefined,
        department: deptFilter || undefined,
        status: statusFilter || undefined,
      });
      setMasters(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load master assignments", { description: err.message });
    } finally {
      setLoadingMasters(false);
    }
  }, [search, deptFilter, statusFilter]);

  const fetchStateTasks = React.useCallback(async () => {
    setLoadingStateTasks(true);
    try {
      const res = await adhocAssignmentApi.listStateAssignments({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setStateAssignments(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load state assignments", { description: err.message });
    } finally {
      setLoadingStateTasks(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    if (activeTab === "sdo_register") {
      fetchMasters();
    } else {
      fetchStateTasks();
    }
  }, [activeTab, fetchMasters, fetchStateTasks]);

  // Aggregate Metrics
  const stats = React.useMemo(() => {
    let totalInstructions = masters.length;
    let totalStatesDispatched = 0;
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalPendingReview = 0;

    masters.forEach((m) => {
      totalStatesDispatched += m.stats?.totalStates || 0;
      totalCompleted += m.stats?.completedStates || 0;
      totalInProgress += m.stats?.inProgressStates || 0;
    });

    stateAssignments.forEach((sa) => {
      if (sa.reports?.[0]?.review_status === "submitted") {
        totalPendingReview++;
      }
    });

    return {
      totalInstructions,
      totalStatesDispatched,
      totalCompleted,
      totalInProgress,
      totalPendingReview,
    };
  }, [masters, stateAssignments]);

  if (viewMode === "register" || viewMode === "edit") {
    return (
      <SdoAssignmentRegisterPage
        onBack={() => {
          setViewMode("list");
          setEditMasterData(null);
          if (location.pathname.endsWith("/register") || location.pathname.endsWith("/create")) {
            navigate("/sdo/projects", { replace: true });
          }
        }}
        onSuccess={(savedMaster, proceedToDispatch) => {
          setViewMode("list");
          setEditMasterData(null);
          if (location.pathname.endsWith("/register") || location.pathname.endsWith("/create")) {
            navigate("/sdo/projects", { replace: true });
          }
          fetchMasters();
          if (proceedToDispatch && savedMaster) {
            setDispatchMasterTarget(savedMaster);
            setViewMode("distribute");
          }
        }}
        departments={departments}
        userName={user?.name || user?.staff_id}
        initialData={viewMode === "edit" ? editMasterData : null}
      />
    );
  }

  if (viewMode === "distribute" && dispatchMasterTarget) {
    return (
      <SdoStateDistributionPage
        onBack={() => {
          setViewMode("list");
          setDispatchMasterTarget(null);
        }}
        onSuccess={() => {
          setViewMode("list");
          setDispatchMasterTarget(null);
          fetchMasters();
          fetchStateTasks();
        }}
        master={dispatchMasterTarget}
        allStates={allStates}
      />
    );
  }

  if (viewMode === "report" && selectedStateAssignment) {
    return (
      <StateAssignmentReportPage
        onBack={() => {
          setViewMode("list");
          setSelectedStateAssignment(null);
        }}
        onSuccess={() => {
          setViewMode("list");
          setSelectedStateAssignment(null);
          fetchStateTasks();
          fetchMasters();
        }}
        stateAssignment={selectedStateAssignment}
        userName={user?.name || user?.staff_id}
      />
    );
  }

  if (viewMode === "view_master" && detailMasterId) {
    return (
      <AdhocMasterDetailPage
        onBack={() => {
          setViewMode("list");
          setDetailMasterId(null);
        }}
        masterId={detailMasterId}
        canReview={isSdo || !!user?.department_code}
        canClose={isSdo}
        onSuccess={() => {
          fetchMasters();
          fetchStateTasks();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* Top Header */}
      <div className="bg-white border-b border-border/60 px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Ad-hoc / Special Assignment Management
            </h1>
          </div>
        </div>

        {isSdo && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditMasterData(null);
                setViewMode("register");
              }}
              className="gap-2 bg-[#145c3f] hover:bg-[#0f3d2e] text-white shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register New Assignment
            </Button>
          </div>
        )}
      </div>

      {/* Activity Tabs Bar (Positioned ABOVE the stats cards, styled like Enrolment tabs) */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[73px] z-20 shadow-xs">
        <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist">
          {isSdo ? (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sdo_register"}
                onClick={() => setActiveTab("sdo_register")}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none ${
                  activeTab === "sdo_register"
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
                }`}
              >
                <FileSpreadsheet
                  className={`h-4 w-4 shrink-0 ${activeTab === "sdo_register" ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`}
                />
                <span>SDO Assignment Register</span>
                <span
                  className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    activeTab === "sdo_register"
                      ? "bg-[#e8f6ee] text-[#145c3f]"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#e8f6ee] group-hover:text-[#145c3f]"
                  }`}
                >
                  {masters.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "state_tasks"}
                onClick={() => setActiveTab("state_tasks")}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none ${
                  activeTab === "state_tasks"
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
                }`}
              >
                <Layers
                  className={`h-4 w-4 shrink-0 ${activeTab === "state_tasks" ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`}
                />
                <span>All State Dispatches & Reports</span>
                <span
                  className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    activeTab === "state_tasks"
                      ? "bg-[#e8f6ee] text-[#145c3f]"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#e8f6ee] group-hover:text-[#145c3f]"
                  }`}
                >
                  {stateAssignments.length}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "my_tasks"}
              onClick={() => setActiveTab("my_tasks")}
              className="group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 border-[#145c3f] text-[#145c3f] outline-none"
            >
              <Clock className="h-4 w-4 shrink-0 text-[#145c3f]" />
              <span>My Assigned Directives</span>
              <span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-[#e8f6ee] text-[#145c3f]">
                {stateAssignments.length}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Metrics Bar (Positioned BELOW the tabs, styled like Enrolment stats cards) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-2xl p-5 border bg-slate-50 border-slate-200 shadow-xs">
            <p className="text-3xl font-black text-slate-700">{stats.totalInstructions}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Total Instructions</p>
          </div>
          <div className="rounded-2xl p-5 border bg-emerald-50/60 border-emerald-200 shadow-xs">
            <p className="text-3xl font-black text-emerald-700">{stats.totalStatesDispatched}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">States Dispatched</p>
          </div>
          <div className="rounded-2xl p-5 border bg-teal-50 border-teal-200 shadow-xs">
            <p className="text-3xl font-black text-teal-700">{stats.totalCompleted}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Reports Completed</p>
          </div>
          <div className="rounded-2xl p-5 border bg-blue-50 border-blue-200 shadow-xs">
            <p className="text-3xl font-black text-blue-700">{stats.totalInProgress}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">In Progress</p>
          </div>
          <div className="rounded-2xl p-5 border bg-amber-50 border-amber-200 shadow-xs">
            <p className="text-3xl font-black text-amber-800">{stats.totalPendingReview}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Pending Review</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by Assignment ID, Title, Reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none shadow-none text-xs focus-visible:ring-0 p-0 h-auto"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === "sdo_register" && (
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.department_code} value={d.department_code}>
                      {d.name} ({d.department_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => (activeTab === "sdo_register" ? fetchMasters() : fetchStateTasks())}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* View 1: SDO Master Register Table */}
        {activeTab === "sdo_register" && (
          <Card className="rounded-2xl border-slate-200 shadow-none overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-600">Master ID</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Assignment Title</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Originating Dept</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Date Received</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Due Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Priority</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">State Recipient Progress</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMasters ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                      Loading assignments…
                    </TableCell>
                  </TableRow>
                ) : masters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                      No master assignments found. Register one to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  masters.map((m) => (
                    <TableRow key={m.master_assignment_id} className="hover:bg-slate-50/60 transition">
                      <TableCell className="font-mono text-xs font-bold text-[#145c3f]">
                        {m.master_assignment_id}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 max-w-[240px] truncate">
                        {m.assignment_title}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {m.originating_department_code}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {m.date_received}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {m.assignment_due_date}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            m.priority === "urgent"
                              ? "border-rose-200 bg-rose-50 text-rose-700 font-bold"
                              : m.priority === "high"
                              ? "border-amber-200 bg-amber-50 text-amber-700 font-semibold"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {m.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-800">{m.stats?.totalStates || 0} States</span>
                          {m.stats?.totalStates > 0 && (
                            <span className="text-[10px] text-slate-400">
                              ({m.stats?.completedStates || 0} done, {m.stats?.inProgressStates || 0} ongoing)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] capitalize font-semibold ${
                            m.status === "dispatched"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : m.status === "closed"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {m.status === "draft" ? "Saved (Pending Dispatch)" : m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSdo && m.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditMasterData(m);
                                setViewMode("edit");
                              }}
                              className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 gap-1"
                              title="Edit Master Assignment Record"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                          )}
                          {isSdo && m.status !== "closed" && (
                            <Button
                              variant={m.status === "draft" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setDispatchMasterTarget(m);
                                setViewMode("distribute");
                              }}
                              className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                                m.status === "draft"
                                  ? "bg-[#145c3f] hover:bg-[#0f3d2e] text-white shadow-xs"
                                  : "text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                              }`}
                              title={m.status === "draft" ? "Dispatch to recipient State Offices" : "Re-dispatch or add more states"}
                            >
                              <Send className="w-3 h-3" />
                              {m.status === "draft" ? "Dispatch to States" : "Add States"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDetailMasterId(m.master_assignment_id);
                              setViewMode("view_master");
                            }}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-[#145c3f] hover:bg-slate-100 gap-1"
                          >
                            <Eye className="w-3 h-3" /> View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* View 2: State Tasks Table (for State officers or SDO detailed monitoring) */}
        {(activeTab === "state_tasks" || activeTab === "my_tasks") && (
          <Card className="rounded-2xl border-slate-200 shadow-none overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-600">State Assignment ID</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">State / Zone</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Assignment Title</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Originating Dept</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Due Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Progress Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Report Review</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-600">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStateTasks ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      Loading state assignments…
                    </TableCell>
                  </TableRow>
                ) : stateAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No assignments issued to your State at this time.
                    </TableCell>
                  </TableRow>
                ) : (
                  stateAssignments.map((sa) => {
                    const pb = PROGRESS_BADGES[sa.progress_status] || PROGRESS_BADGES.not_started;
                    const latestRep = sa.reports?.[0];
                    let reviewBadge = null;
                    if (latestRep?.review_status && REVIEW_BADGES[latestRep.review_status]) {
                      reviewBadge = REVIEW_BADGES[latestRep.review_status];
                    } else if (sa.closure_status === "closed") {
                      reviewBadge = REVIEW_BADGES.accepted;
                    } else if (sa.state_due_date && new Date(sa.state_due_date) < new Date()) {
                      reviewBadge = REVIEW_BADGES.not_submitted;
                    } else {
                      reviewBadge = REVIEW_BADGES.not_due;
                    }

                    return (
                      <TableRow key={sa.state_assignment_id} className="hover:bg-slate-50/60 transition">
                        <TableCell className="font-mono text-xs font-bold text-[#145c3f]">
                          {sa.state_assignment_id}
                        </TableCell>
                        <TableCell className="text-xs text-slate-800">
                          <span className="font-semibold">{sa.state?.description || sa.state_code}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Zone: {sa.zone?.description || sa.zonal_code}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 max-w-[220px] truncate">
                          {sa.master_assignment?.assignment_title || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {sa.master_assignment?.originating_department_code || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {sa.state_due_date ? String(sa.state_due_date).slice(0, 10) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${pb.cls}`}>{pb.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${reviewBadge.cls}`}>{reviewBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStateAssignment(sa);
                              setViewMode("report");
                            }}
                            className="h-7 px-2.5 text-xs text-[#145c3f] hover:bg-emerald-50 gap-1.5 font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            {latestRep ? "View / Edit Report" : "Submit Report"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Modals */}
      <SdoStateDistributionModal
        open={distributionModalOpen}
        onClose={() => setDistributionModalOpen(false)}
        onSuccess={() => {
          fetchMasters();
          fetchStateTasks();
        }}
        master={dispatchMasterTarget}
        allStates={allStates}
      />

      <StateAssignmentReportModal
        open={stateReportModalOpen}
        onClose={() => setStateReportModalOpen(false)}
        onSuccess={() => {
          fetchStateTasks();
          fetchMasters();
        }}
        stateAssignment={selectedStateAssignment}
        userName={user?.name || user?.staff_id}
      />

      <AdhocMasterDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onSuccess={() => {
          fetchMasters();
          fetchStateTasks();
        }}
        masterId={detailMasterId}
        canReview={isSdo || !!user?.department_code}
        canClose={isSdo}
      />
    </div>
  );
}
