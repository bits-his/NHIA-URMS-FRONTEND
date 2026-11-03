import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  RefreshCw,
  Scale,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COMPLIANCE_HUB_TABS,
  COMPLIANCE_HUB_NAV_TITLE,
  COMPLIANCE_HUB_PATH,
  parseComplianceHubTab,
  type ComplianceHubTabKey,
} from "./complianceHubTypes";
import ServicomComplaintsPage from "../servicom/ServicomComplaintsPage";
import StateOfficeWeeklyCompliancePage from "./StateOfficeWeeklyCompliancePage";
import StateOfficeHmoIndebtednessHubPage from "./StateOfficeHmoIndebtednessHubPage";
import StateOfficeMysteryShoppingPage from "./StateOfficeMysteryShoppingPage";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userName?: string | null;
  userStaffId?: string | null;
  userRole?: string | null;
  userDepartment?: { name?: string | null; department_code?: string | null } | null;
  canCreate?: boolean;
  canReview?: boolean;
}

const ICON_MAP: Record<ComplianceHubTabKey, React.ElementType> = {
  complaints: Scale,
  "weekly-compliance": ClipboardCheck,
  "hmo-indebtedness": Wallet,
  "mystery-shopping": Search,
};

export default function ComplianceHubPage({
  onBack,
  defaultZoneId,
  defaultStateId,
  userName,
  userStaffId,
  userRole,
  userDepartment,
  canCreate = true,
  canReview = true,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseComplianceHubTab(searchParams.get("tab"));
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  const setActiveTab = (tab: ComplianceHubTabKey) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  const shared = {
    onBack,
    defaultZoneId,
    defaultStateId,
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
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
          <div className="min-w-0 flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#145c3f] shrink-0" />
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {COMPLIANCE_HUB_NAV_TITLE}
            </h2>
          </div>
        </div>

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
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist" aria-label="Compliance modules">
          {COMPLIANCE_HUB_TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = ICON_MAP[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
                  active
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                <span>{tab.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "complaints" && (
          <ServicomComplaintsPage
            key={`complaints-${refreshKey}`}
            embedded
            stateScope
            defaultZoneId={defaultZoneId}
            defaultStateId={null}
            userName={userName}
            userStaffId={userStaffId}
            userRole={userRole}
            userDepartment={userDepartment}
            canCreate={canCreate}
            canReview={canReview}
          />
        )}

        {activeTab === "weekly-compliance" && (
          <StateOfficeWeeklyCompliancePage
            key={`weekly-${refreshKey}`}
            embedded
            {...shared}
          />
        )}

        {activeTab === "hmo-indebtedness" && (
          <StateOfficeHmoIndebtednessHubPage
            key={`hmo-${refreshKey}`}
            embedded
            {...shared}
          />
        )}

        {activeTab === "mystery-shopping" && (
          <StateOfficeMysteryShoppingPage
            key={`mystery-${refreshKey}`}
            embedded
            {...shared}
          />
        )}
      </div>
    </div>
  );
}

/** Legacy redirect component for old deep links */
export function ComplianceHubLegacyRedirect({ tab }: { tab: ComplianceHubTabKey }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(`${COMPLIANCE_HUB_PATH}?tab=${tab}`, { replace: true });
  }, [navigate, tab]);
  return null;
}
