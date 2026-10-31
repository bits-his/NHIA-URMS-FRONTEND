import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Scale,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  COMPLIANCE_HUB_TABS,
  COMPLIANCE_HUB_NAV_TITLE,
  COMPLIANCE_HUB_DEFAULT_TAB,
  type ComplianceHubTabKey,
} from "./complianceHubTypes";
import ComplaintsReportForm from "./ComplaintsReportForm";
import StateOfficeWeeklyCompliancePage from "./StateOfficeWeeklyCompliancePage";
import StateOfficeHmoIndebtednessHubPage from "./StateOfficeHmoIndebtednessHubPage";
import StateOfficeMysteryShoppingPage from "./StateOfficeMysteryShoppingPage";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const ICON_MAP: Record<ComplianceHubTabKey, React.ElementType> = {
  complaints: Scale,
  "weekly-compliance": ClipboardCheck,
  "hmo-indebtedness": Wallet,
  "mystery-shopping": Search,
};

export default function ComplianceHubPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ComplianceHubTabKey =
    (searchParams.get("tab") as ComplianceHubTabKey) || COMPLIANCE_HUB_DEFAULT_TAB;

  const [tabCounts, setTabCounts] = React.useState<Record<ComplianceHubTabKey, number>>({
    complaints: 0,
    "weekly-compliance": 0,
    "hmo-indebtedness": 0,
    "mystery-shopping": 0,
  });

  const setActiveTab = (tab: ComplianceHubTabKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  // Mock counts - in production, these would come from API calls
  React.useEffect(() => {
    setTabCounts({
      complaints: 2,
      "weekly-compliance": 1,
      "hmo-indebtedness": 1,
      "mystery-shopping": 1,
    });
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "complaints":
        return (
          <div className="p-6">
            <ComplaintsReportForm
              onBack={onBack}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
            />
          </div>
        );
      case "weekly-compliance":
        return (
          <StateOfficeWeeklyCompliancePage
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        );
      case "hmo-indebtedness":
        return (
          <StateOfficeHmoIndebtednessHubPage
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        );
      case "mystery-shopping":
        return (
          <StateOfficeMysteryShoppingPage
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {COMPLIANCE_HUB_NAV_TITLE}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Complaints register, compliance reports, HMO indebtedness & mystery shopping
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div
          className="flex gap-0 overflow-x-auto -mb-px"
          role="tablist"
          aria-label="Compliance modules"
        >
          {COMPLIANCE_HUB_TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = ICON_MAP[tab.key];
            const count = tabCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${
                  active
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`}
                  strokeWidth={2}
                />
                <span>{tab.tabLabel}</span>
                <span
                  className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-[#e8f6ee] text-[#145c3f]"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#e8f6ee] group-hover:text-[#145c3f]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {renderTabContent()}
      </ScrollArea>
    </div>
  );
}

/** Legacy redirect component for old deep links */
export function ComplianceHubLegacyRedirect({ tab }: { tab: ComplianceHubTabKey }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(`/zonal/compliance-hub?tab=${tab}`, { replace: true });
  }, [navigate, tab]);
  return null;
}
