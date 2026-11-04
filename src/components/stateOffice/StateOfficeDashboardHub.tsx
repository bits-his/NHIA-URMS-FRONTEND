import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Handshake,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import EnrolmentDriveDashboard from "./EnrolmentDriveDashboard";
import ProviderManagementDashboard from "./ProviderManagementDashboard";
import ChallengesSupportDashboard from "./ChallengesSupportDashboard";
import { STAKEHOLDER_MANAGEMENT_PATH } from "./enrolmentPillarTypes";

export type StateOfficeDashTab =
  | "enrolment"
  | "enrolment-drives"
  | "stakeholder"
  | "provider"
  | "challenges";

const TABS: { key: StateOfficeDashTab; label: string; icon: React.ReactNode }[] = [
  { key: "enrolment", label: "Enrolment", icon: <UserPlus className="size-4 shrink-0" /> },
  { key: "enrolment-drives", label: "Enrolment Drives", icon: <Megaphone className="size-4 shrink-0" /> },
  { key: "stakeholder", label: "Stakeholder", icon: <Handshake className="size-4 shrink-0" /> },
  { key: "provider", label: "Provider Management", icon: <Stethoscope className="size-4 shrink-0" /> },
  { key: "challenges", label: "Challenges & Support", icon: <AlertTriangle className="size-4 shrink-0" /> },
];

const TAB_KEYS = new Set<StateOfficeDashTab>(TABS.map((t) => t.key));

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
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
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as StateOfficeDashTab | null;
  const initialTab: StateOfficeDashTab =
    tabParam && TAB_KEYS.has(tabParam) ? tabParam : "enrolment-drives";

  const [activeTab, setActiveTab] = React.useState<StateOfficeDashTab>(initialTab);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    if (tabParam && TAB_KEYS.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (key: StateOfficeDashTab) => {
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

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            aria-label="Back"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            State Office Dashboard
          </h2>
        </div>

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
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => selectTab(tab.key)}
              className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
                activeTab === tab.key
                  ? "border-[#145c3f] text-[#145c3f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "enrolment" && (
        <UnavailablePanel moduleLabel="Enrolment" registerPath="/zonal/enrolment" />
      )}

      {activeTab === "enrolment-drives" && (
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

      {activeTab === "challenges" && (
        <ChallengesSupportDashboard
          key={`cs-dash-${refreshKey}`}
          embedded
          onBack={onBack}
        />
      )}
    </div>
  );
}
