import * as React from "react";
import {
  ArrowLeft,
  BarChart3,
  Receipt,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FinanceDashboardTab from "./FinanceDashboardTab";
import FinanceIgrTab from "./FinanceIgrTab";
import FinanceSshiaTab from "./FinanceSshiaTab";
import FinanceExpenditureTab from "./FinanceExpenditureTab";
import IgrReportPage from "./IgrReportPage";
import IgrReportDetail from "./IgrReportDetail";
import SshiaFinancialReportPage from "./SshiaFinancialReportPage";
import SshiaFinancialReportDetail from "./SshiaFinancialReportDetail";
import ExpenditureProfileReportPage from "./ExpenditureProfileReportPage";
import ExpenditureProfileReportDetail from "./ExpenditureProfileReportDetail";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";

export type FinanceTabKey = "dashboard" | "igr" | "sshia" | "expenditure";
export type FinanceMode =
  | "tabs"
  | "igr-form"
  | "igr-detail"
  | "sshia-form"
  | "sshia-detail"
  | "expenditure-form"
  | "expenditure-detail";

interface Props {
  onBack: () => void;
  initialTab?: FinanceTabKey;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
}

export default function FinanceWorkspace({
  onBack,
  initialTab = "dashboard",
  defaultZoneId,
  defaultStateId,
  userRole,
}: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [activeTab, setActiveTab] = React.useState<FinanceTabKey>(initialTab);
  const [mode, setMode] = React.useState<FinanceMode>("tabs");
  const [selectedId, setSelectedId] = React.useState<string | number | null>(null);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  // Sync activeTab whenever the route changes (e.g. user clicks another sidebar item)
  React.useEffect(() => {
    setActiveTab(initialTab);
    setMode("tabs");
    setSelectedId(null);
    setEditingId(null);
  }, [initialTab]);

  // Sync / Refresh handler
  const handleSync = async () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  const handleBack = () => {
    if (mode !== "tabs") {
      setMode("tabs");
      setSelectedId(null);
      setEditingId(null);
    } else {
      onBack();
    }
  };

  // Open Form views
  const openNewIgr = () => {
    setEditingId(null);
    setMode("igr-form");
  };
  const openNewSshia = () => {
    setEditingId(null);
    setMode("sshia-form");
  };
  const openNewExpenditure = () => {
    setEditingId(null);
    setMode("expenditure-form");
  };

  // Open Detail views
  const openIgrDetail = (id: string | number) => {
    setSelectedId(id);
    setMode("igr-detail");
  };
  const openSshiaDetail = (id: string | number) => {
    setSelectedId(id);
    setMode("sshia-detail");
  };
  const openExpenditureDetail = (id: string | number) => {
    setSelectedId(id);
    setMode("expenditure-detail");
  };

  // Dynamic Page Title
  const pageTitle = React.useMemo(() => {
    if (mode === "igr-form") return editingId ? "Edit IGR Transaction" : "Record IGR Transaction";
    if (mode === "igr-detail") return "IGR Transaction Details";
    if (mode === "sshia-form") return editingId ? "Edit SSHIA Progress Report" : "Submit SSHIA Progress Report";
    if (mode === "sshia-detail") return "SSHIA Progress Report Details";
    if (mode === "expenditure-form") return editingId ? "Edit Expenditure Profile" : "Record Expenditure Profile";
    if (mode === "expenditure-detail") return "Expenditure Profile Details";

    switch (activeTab) {
      case "igr":
        return "Internally Generated Revenue (IGR)";
      case "sshia":
        return "SSHIA Financial Report";
      case "expenditure":
        return "Expenditure Profile";
      case "dashboard":
      default:
        return "Finance Dashboard";
    }
  }, [mode, editingId, activeTab]);

  // Dynamic Subtitle
  const pageSubtitle = React.useMemo(() => {
    if (mode !== "tabs") return "Manage financial records, expenditure tracking, and reviews";
    switch (activeTab) {
      case "igr":
        return "IGR revenue performance dashboard, fee collections, and transactions register";
      case "sshia":
        return "State Social Health Insurance Agency quarterly progress, utilisation, and financial position";
      case "expenditure":
        return "Operational expenditure profiles across 9 statutory budget heads and spending register";
      case "dashboard":
      default:
        return "Executive overview of Internally Generated Revenue (IGR) and SSHIA quarterly progress";
    }
  }, [mode, activeTab]);

  // Header
  const header = (
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          aria-label="Back"
          onClick={handleBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            {pageTitle}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            {pageSubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {mode === "tabs" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
              disabled={syncing}
              onClick={handleSync}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </Button>

            {canCreate && (
              <>
                {(activeTab === "igr" || activeTab === "dashboard") && (
                  <Button
                    size="sm"
                    className="h-8.5 bg-[#1a7a52] hover:bg-[#145c3f] text-white border border-[#145c3f] font-bold text-xs gap-1.5 rounded-sm shadow-xs"
                    onClick={openNewIgr}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record IGR</span>
                  </Button>
                )}

                {(activeTab === "sshia" || activeTab === "dashboard") && (
                  <Button
                    variant={activeTab === "sshia" ? "default" : "outline"}
                    size="sm"
                    className={`h-8.5 font-bold text-xs gap-1.5 rounded-sm shadow-xs ${
                      activeTab === "sshia"
                        ? "bg-[#1a7a52] hover:bg-[#145c3f] text-white border border-[#145c3f]"
                        : "bg-white hover:bg-[#f4f7f5] text-[#1a7a52] border border-[#1a7a52]"
                    }`}
                    onClick={openNewSshia}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Submit SSHIA</span>
                  </Button>
                )}

                {(activeTab === "expenditure" || activeTab === "dashboard") && (
                  <Button
                    variant={activeTab === "expenditure" ? "default" : "outline"}
                    size="sm"
                    className={`h-8.5 font-bold text-xs gap-1.5 rounded-sm shadow-xs ${
                      activeTab === "expenditure"
                        ? "bg-[#1a7a52] hover:bg-[#145c3f] text-white border border-[#145c3f]"
                        : "bg-white hover:bg-[#f4f7f5] text-[#1a7a52] border border-[#1a7a52] hidden md:inline-flex"
                    }`}
                    onClick={openNewExpenditure}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Expenditure</span>
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Tabs Bar
  const tabsBar = mode === "tabs" && (
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
      <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist" aria-label="Finance Workspace Tabs">
        {[
          { key: "dashboard", label: "Finance Dashboard", icon: BarChart3 },
          { key: "igr", label: "Internally Generated Revenue (IGR)", icon: Receipt },
          { key: "sshia", label: "SSHIA Progress Report", icon: ShieldCheck },
          { key: "expenditure", label: "Expenditure Profile", icon: CreditCard },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key as FinanceTabKey)}
            className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${
              activeTab === key
                ? "border-[#145c3f] text-[#145c3f]"
                : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {header}
      {tabsBar}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          {mode === "tabs" && (
            <>
              {activeTab === "dashboard" && (
                <FinanceDashboardTab
                  key={`dash-${refreshKey}`}
                  userRole={userRole}
                  defaultZoneId={defaultZoneId}
                  defaultStateId={defaultStateId}
                  lockZone={userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal"))}
                />
              )}

              {activeTab === "igr" && (
                <FinanceIgrTab
                  key={`igr-${refreshKey}`}
                  onView={openIgrDetail}
                  userRole={userRole}
                  defaultZoneId={defaultZoneId}
                  defaultStateId={defaultStateId}
                  lockZone={userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal"))}
                />
              )}

              {activeTab === "sshia" && (
                <FinanceSshiaTab
                  key={`sshia-${refreshKey}`}
                  onView={openSshiaDetail}
                  userRole={userRole}
                  defaultZoneId={defaultZoneId}
                  defaultStateId={defaultStateId}
                  lockZone={userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal"))}
                />
              )}

              {activeTab === "expenditure" && (
                <FinanceExpenditureTab
                  key={`exp-${refreshKey}`}
                  onView={openExpenditureDetail}
                  userRole={userRole}
                  defaultZoneId={defaultZoneId}
                  defaultStateId={defaultStateId}
                  lockZone={userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal"))}
                />
              )}
            </>
          )}

          {/* Form views */}
          {mode === "igr-form" && (
            <IgrReportPage
              reportId={editingId}
              onBack={() => setMode("tabs")}
              onSubmitted={() => {
                setMode("tabs");
                handleSync();
              }}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
            />
          )}

          {mode === "igr-detail" && selectedId && (
            <IgrReportDetail
              reportId={selectedId}
              onBack={() => setMode("tabs")}
              onEdit={() => {
                setEditingId(selectedId);
                setMode("igr-form");
              }}
            />
          )}

          {mode === "sshia-form" && (
            <SshiaFinancialReportPage
              reportId={editingId}
              onBack={() => setMode("tabs")}
              onSubmitted={() => {
                setMode("tabs");
                handleSync();
              }}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
            />
          )}

          {mode === "sshia-detail" && selectedId && (
            <SshiaFinancialReportDetail
              reportId={selectedId}
              onBack={() => setMode("tabs")}
              onEdit={() => {
                setEditingId(selectedId);
                setMode("sshia-form");
              }}
            />
          )}

          {mode === "expenditure-form" && (
            <ExpenditureProfileReportPage
              reportId={editingId}
              onBack={() => setMode("tabs")}
              onSubmitted={() => {
                setMode("tabs");
                handleSync();
              }}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
            />
          )}

          {mode === "expenditure-detail" && selectedId && (
            <ExpenditureProfileReportDetail
              reportId={selectedId}
              onBack={() => setMode("tabs")}
              onEdit={() => {
                setEditingId(selectedId);
                setMode("expenditure-form");
              }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
