import * as React from "react";
import {
  ArrowLeft,
  Plus,
  Send,
  Eye,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  FileText,
  Layers,
  Pencil,
  XCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { RegisterStatsCards } from "../RegisterStatsCards";
import { toast } from "sonner";
import { adhocAssignmentApi } from "@/lib/api";
import SdoAssignmentRegisterPage from "./SdoAssignmentRegisterPage";
import SdoStateDistributionModal from "./SdoStateDistributionModal";
import SdoStateDistributionPage from "./SdoStateDistributionPage";
import StateAssignmentReportModal from "./StateAssignmentReportModal";
import StateAssignmentReportPage from "./StateAssignmentReportPage";
import AdhocMasterDetailModal from "./AdhocMasterDetailModal";
import AdhocMasterDetailPage from "./AdhocMasterDetailPage";
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";

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

  const listTitle =
    activeTab === "sdo_register"
      ? "SDO Assignment Register"
      : activeTab === "state_tasks"
        ? "State Dispatches & Reports"
        : "My Assigned Directives";

  const registerTableTitle =
    activeTab === "sdo_register"
      ? "SDO ASSIGNMENT REGISTER"
      : activeTab === "state_tasks"
        ? "STATE DISPATCH & REPORTS REGISTER"
        : "MY ASSIGNED DIRECTIVES REGISTER";

  const refreshList = () => (activeTab === "sdo_register" ? fetchMasters() : fetchStateTasks());

  const masterColumns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "master_assignment_id",
        header: "Master ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[#145c3f]">{row.original.master_assignment_id}</span>
        ),
      },
      {
        accessorKey: "assignment_title",
        header: "Assignment Title",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800 max-w-[240px] truncate block">
            {row.original.assignment_title}
          </span>
        ),
      },
      {
        accessorKey: "originating_department_code",
        header: "Originating Dept",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">{row.original.originating_department_code}</span>
        ),
      },
      { accessorKey: "date_received", header: "Date Received" },
      { accessorKey: "assignment_due_date", header: "Due Date" },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const m = row.original;
          return (
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
          );
        },
      },
      {
        id: "state_progress",
        header: "State Recipient Progress",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-800">{m.stats?.totalStates || 0} States</span>
              {m.stats?.totalStates > 0 && (
                <span className="text-[10px] text-slate-400">
                  ({m.stats?.completedStates || 0} done, {m.stats?.inProgressStates || 0} ongoing)
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const m = row.original;
          return (
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
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {isSdo && m.status !== "closed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailMasterId(m.master_assignment_id);
                  setViewMode("view_master");
                }}
                className="h-7 px-2 text-xs text-slate-600 hover:text-[#145c3f] hover:bg-slate-100 gap-1"
              >
                <Eye className="w-3 h-3" /> View
              </Button>
            </div>
          );
        },
      },
    ],
    [isSdo]
  );

  const stateTaskColumns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "state_assignment_id",
        header: "State Assignment ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[#145c3f]">{row.original.state_assignment_id}</span>
        ),
      },
      {
        id: "state_zone",
        header: "State / Zone",
        cell: ({ row }) => {
          const sa = row.original;
          return (
            <div className="text-xs text-slate-800">
              <span className="font-semibold">{sa.state?.description || sa.state_code}</span>
              <span className="text-[10px] text-slate-400 block font-normal">
                Zone: {sa.zone?.description || sa.zonal_code}
              </span>
            </div>
          );
        },
      },
      {
        id: "title",
        header: "Assignment Title",
        accessorFn: (row) => row.master_assignment?.assignment_title || "—",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800 max-w-[220px] truncate block">
            {row.original.master_assignment?.assignment_title || "—"}
          </span>
        ),
      },
      {
        id: "dept",
        header: "Originating Dept",
        accessorFn: (row) => row.master_assignment?.originating_department_code || "—",
      },
      {
        id: "due",
        header: "Due Date",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {row.original.state_due_date ? String(row.original.state_due_date).slice(0, 10) : "—"}
          </span>
        ),
      },
      {
        id: "progress",
        header: "Progress Status",
        cell: ({ row }) => {
          const pb = PROGRESS_BADGES[row.original.progress_status] || PROGRESS_BADGES.not_started;
          return <Badge className={`text-[10px] border ${pb.cls}`}>{pb.label}</Badge>;
        },
      },
      {
        id: "review",
        header: "Report Review",
        cell: ({ row }) => {
          const sa = row.original;
          const latestRep = sa.reports?.[0];
          let reviewBadge = REVIEW_BADGES.not_due;
          if (latestRep?.review_status && REVIEW_BADGES[latestRep.review_status]) {
            reviewBadge = REVIEW_BADGES[latestRep.review_status];
          } else if (sa.closure_status === "closed") {
            reviewBadge = REVIEW_BADGES.accepted;
          } else if (sa.state_due_date && new Date(sa.state_due_date) < new Date()) {
            reviewBadge = REVIEW_BADGES.not_submitted;
          }
          return <Badge className={`text-[10px] border ${reviewBadge.cls}`}>{reviewBadge.label}</Badge>;
        },
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => {
          const sa = row.original;
          const latestRep = sa.reports?.[0];
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStateAssignment(sa);
                setViewMode("report");
              }}
              className="h-7 px-2.5 text-xs text-[#145c3f] hover:bg-emerald-50 gap-1.5 font-semibold"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              {latestRep ? "View / Edit Report" : "Submit Report"}
            </Button>
          );
        },
      },
    ],
    []
  );

  const hasListFilters = !!(deptFilter || statusFilter);

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

  const adhocTabs = isSdo
    ? [
        {
          id: "sdo_register",
          label: "SDO Assignment Register",
          icon: FileSpreadsheet,
          count: masters.length,
        },
        {
          id: "state_tasks",
          label: "All State Dispatches & Reports",
          icon: Layers,
          count: stateAssignments.length,
        },
      ]
    : [
        {
          id: "my_tasks",
          label: "My Assigned Directives",
          icon: Clock,
          count: stateAssignments.length,
        },
      ];

  return (
    <PageLayout
      title={listTitle}
      showBack={false}
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshList}
            disabled={activeTab === "sdo_register" ? loadingMasters : loadingStateTasks}
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                (activeTab === "sdo_register" ? loadingMasters : loadingStateTasks) ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>
          {isSdo && (
            <Button
              size="sm"
              onClick={() => {
                setEditMasterData(null);
                setViewMode("register");
              }}
              className="h-8.5 gap-1.5 bg-orange-action hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/15 rounded-sm"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Register New Assignment</span>
            </Button>
          )}
        </div>
      }
      tabs={
        <UnderHeaderNavTabs
          tabs={adhocTabs}
          activeTab={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          ariaLabel="SDO assignment register modules"
        />
      }
      contentClassName="space-y-4 pb-8"
    >
      <div className="w-full space-y-4">
        <RegisterStatsCards
          loading={activeTab === "sdo_register" ? loadingMasters : loadingStateTasks}
          stats={[
            { label: "Total Instructions", value: stats.totalInstructions, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
            { label: "States Dispatched", value: stats.totalStatesDispatched, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            { label: "Reports Completed", value: stats.totalCompleted, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
            { label: "In Progress", value: stats.totalInProgress, tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
            { label: "Pending Review", value: stats.totalPendingReview, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
          ]}
        />

        <Card className="rounded-sm border-[#d4e8dc]">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-flow-col auto-cols-fr gap-3">
              {activeTab === "sdo_register" && (
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Select
                    value={deptFilter || "all"}
                    onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.department_code} value={d.department_code}>
                          {d.name} ({d.department_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {activeTab === "sdo_register" ? (
                      <>
                        <SelectItem value="draft">Draft / Saved</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </>
                    ) : (
                      Object.entries(PROGRESS_BADGES).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasListFilters && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 gap-1 shrink-0"
                  onClick={() => {
                    setDeptFilter("");
                    setStatusFilter("");
                  }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {activeTab === "sdo_register" ? (
          <ShadcnDataTable
            title={registerTableTitle}
            columns={masterColumns}
            data={masters}
            loading={loadingMasters}
            searchPlaceholder="Search by Assignment ID, title, reference..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage="No master assignments found. Register one to begin."
            onRowClick={(m) => {
              setDetailMasterId(m.master_assignment_id);
              setViewMode("view_master");
            }}
            pageSize={50}
            showTableOptions={false}
          />
        ) : (
          <ShadcnDataTable
            title={registerTableTitle}
            columns={stateTaskColumns}
            data={stateAssignments}
            loading={loadingStateTasks}
            searchPlaceholder="Search by assignment ID, state, title..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage="No assignments issued to your State at this time."
            onRowClick={(sa) => {
              setSelectedStateAssignment(sa);
              setViewMode("report");
            }}
            pageSize={50}
            showTableOptions={false}
          />
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
    </PageLayout>
  );
}
