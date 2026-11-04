import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowLeft,
  Handshake,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Scale,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator } from "@/src/access/departmentRoles";
import EnrolmentDriveDashboard from "./EnrolmentDriveDashboard";
import ProviderManagementDashboard from "./ProviderManagementDashboard";
import ChallengesSupportDashboard from "./ChallengesSupportDashboard";
import ComplaintRegisterDashboard from "../servicom/ComplaintRegisterDashboard";
import { STAKEHOLDER_MANAGEMENT_PATH } from "./enrolmentPillarTypes";
import { canAccessEnrolmentDriveDashboard } from "./enrolmentDriveTypes";
import PageLayout from "@/src/components/PageLayout";

export type StateOfficeDashTab =
  | "enrolment"
  | "enrolment-drives"
  | "stakeholder"
  | "provider"
  | "complaints"
  | "challenges";

const TABS: { key: StateOfficeDashTab; label: string; icon: React.ReactNode }[] = [
  { key: "enrolment", label: "Enrolment", icon: <UserPlus className="size-4 shrink-0" /> },
  { key: "enrolment-drives", label: "Enrolment Drives", icon: <Megaphone className="size-4 shrink-0" /> },
  { key: "stakeholder", label: "Stakeholder", icon: <Handshake className="size-4 shrink-0" /> },
  { key: "provider", label: "Provider Management", icon: <Stethoscope className="size-4 shrink-0" /> },
  { key: "complaints", label: "Complaints", icon: <Scale className="size-4 shrink-0" /> },
  { key: "challenges", label: "Challenges & Support", icon: <AlertTriangle className="size-4 shrink-0" /> },
];

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  user?: any;
}

function UnavailablePanel({
  moduleLabel,
  registerPath,
}: {
  moduleLabel: string;
  registerPath: string;
}) {
  const navigate = useNavigate();
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="rounded-sm border border-[#d4e8dc] bg-white p-8 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-[#e8f5ee] flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-[#145c3f]" />
          </div>
          <h3 className="text-lg font-bold text-[#0f3d2e]">Dashboard not available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            There is no analytics dashboard for {moduleLabel} yet. Use the register to record and review reports.
          </p>
          <Button
            className="mt-2 bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
            onClick={() => navigate(registerPath)}
          >
            Open register
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

export default function StateOfficeDashboardHub({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  user,
}: Props) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const canEdDash = canAccessEnrolmentDriveDashboard(authUser?.role || userRole, {
    reportScope: authUser?.role_config?.report_scope ?? user?.role_config?.report_scope ?? null,
    stateCode: authUser?.state_code || (authUser as any)?.state?.code || user?.state_code || defaultStateId || null,
    zonalCode: authUser?.zonal_code || (authUser as any)?.zone?.zonal_code || user?.zonal_code || defaultZoneId || null,
  });
  const visibleTabs = React.useMemo(
    () => TABS.filter((tab) => tab.key !== "enrolment-drives" || canEdDash),
    [canEdDash],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as StateOfficeDashTab | null;
  const fallbackTab: StateOfficeDashTab = visibleTabs[0]?.key || "enrolment";
  const initialTab: StateOfficeDashTab =
    tabParam && visibleTabs.some((t) => t.key === tabParam)
      ? tabParam
      : (canEdDash ? "enrolment-drives" : fallbackTab);

  const isStateCoordinator =
    userRole === "state-coordinator" ||
    isDeptStateCoordinator(userRole || "") ||
    userRole === "state-officer" ||
    user?.role_config?.report_scope === "state";

  const isAdminOrNational =
    userRole === "admin" ||
    userRole === "sdo" ||
    userRole === "dg-ceo" ||
    userRole === "hq-department" ||
    user?.role_config?.report_scope === "national";

  // State coordinator sees his own state locked. Admin can select any state.
  const isStateLocked = isStateCoordinator && !isAdminOrNational && !!defaultStateId;

  const [activeTab, setActiveTab] = React.useState<StateOfficeDashTab>(initialTab);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    if (tabParam && visibleTabs.some((t) => t.key === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    } else if (activeTab === "enrolment-drives" && !canEdDash) {
      setActiveTab(fallbackTab);
      setSearchParams({ tab: fallbackTab }, { replace: true });
    }
  }, [tabParam, canEdDash, visibleTabs, fallbackTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (key: StateOfficeDashTab) => {
    if (key === "enrolment-drives" && !canEdDash) return;
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  const shared = {
    defaultZoneId,
    defaultStateId,
  };
  const navigate = useNavigate();

  return (
    <PageLayout
      title="State Office Dashboard"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
          disabled={syncing}
          onClick={handleSync}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      }
      filters={
        <div className="flex gap-4 overflow-x-auto -mb-px w-full" role="tablist">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => selectTab(tab.key)}
              className={`group relative shrink-0 inline-flex items-center gap-2 px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${activeTab === tab.key
                  ? "border-[#145c3f] text-[#145c3f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      }
    >
      <div className="w-full">

        {activeTab === "enrolment" && (
          <UnavailablePanel moduleLabel="Enrolment" registerPath="/zonal/enrolment" />
        )}

        {activeTab === "enrolment-drives" && canEdDash && (
          <EnrolmentDriveDashboard
            key={`ed-dash-${refreshKey}`}
            embedded
            onBack={onBack}
            {...shared}
            onRecordAction={(stateCode, issue) => {
              const params = new URLSearchParams({ tab: "actions" });
              if (stateCode) params.set("state", stateCode);
              if (issue) params.set("issue", issue);
              navigate(`/zonal/enrolment-drives?${params.toString()}`);
            }}
          />
        )}
        {activeTab === "enrolment-drives" && !canEdDash && (
          <UnavailablePanel moduleLabel="Enrolment Drives" registerPath="/zonal/enrolment-drives" />
        )}

        {activeTab === "stakeholder" && (
          <UnavailablePanel moduleLabel="Stakeholder Management" registerPath={STAKEHOLDER_MANAGEMENT_PATH} />
        )}

        {activeTab === "provider" && (
          <ProviderManagementDashboard
            key={`pm-dash-${refreshKey}`}
            embedded
            onBack={onBack}
            {...shared}
          />
        )}

        {activeTab === "complaints" && (
          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 w-full space-y-3.5">
              <ComplaintRegisterDashboard
                key={`state-comp-dash-${refreshKey}`}
                embedded
                defaultStateId={isStateLocked ? defaultStateId : undefined}
                defaultZoneId={isStateLocked ? defaultZoneId : undefined}
                lockLocation={isStateLocked}
                excludeServicom
                title={
                  isStateLocked
                    ? "State Complaints Dashboard"
                    : "State Office Complaints Analytics"
                }
                subtitle={
                  isStateLocked
                    ? `Complaint resolution, SLA tracking, and trends for ${defaultStateId || "your state"}`
                    : "State-level complaint resolution, SLA performance, and trends across states"
                }
              />
            </div>
          </ScrollArea>
        )}

        {activeTab === "challenges" && (
          <ChallengesSupportDashboard
            key={`cs-dash-${refreshKey}`}
            embedded
            onBack={onBack}
          />
        )}
      </div>
    </PageLayout>
  );
}
