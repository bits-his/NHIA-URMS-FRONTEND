import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  LayoutDashboard,
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
  type ComplianceHubTabKey,
} from "./complianceHubTypes";
import {
  HMO_INDEBTEDNESS_DEFAULT_TAB,
  HMO_INDEBTEDNESS_NAV_TITLE,
  HMO_INDEBTEDNESS_TABS,
  type HmoIndebtednessTabKey,
} from "./hmoIndebtednessTypes";
import { COMPLIANCE_HUB_PRIVILEGES } from "@/src/access/hubPrivilegeConfig";
import { useAllowedHubTabs } from "@/src/access/hubAccess";
import ServicomComplaintsPage from "../servicom/ServicomComplaintsPage";
import StateOfficeWeeklyCompliancePage from "./StateOfficeWeeklyCompliancePage";
import StateOfficeHmoIndebtednessHubPage from "./StateOfficeHmoIndebtednessHubPage";
import StateOfficeMysteryShoppingPage from "./StateOfficeMysteryShoppingPage";
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";

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

export type ComplianceChrome = {
  mode: "list" | "form" | "detail";
  title?: string;
  onInnerBack?: () => void;
  actions?: React.ReactNode;
};

const ICON_MAP: Record<ComplianceHubTabKey, React.ElementType> = {
  complaints: Scale,
  "weekly-compliance": ClipboardCheck,
  "hmo-indebtedness": Wallet,
  "mystery-shopping": Search,
};

const HMO_TAB_KEYS = new Set<HmoIndebtednessTabKey>(
  HMO_INDEBTEDNESS_TABS.map((t) => t.key),
);

function parseHmoTab(raw: string | null): HmoIndebtednessTabKey {
  if (raw && HMO_TAB_KEYS.has(raw as HmoIndebtednessTabKey)) {
    return raw as HmoIndebtednessTabKey;
  }
  if (raw === "reconciliation") return "phi";
  return HMO_INDEBTEDNESS_DEFAULT_TAB;
}

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
  const { allowedTabs, allowedKeys, defaultTab, hideTabStrip } =
    useAllowedHubTabs(COMPLIANCE_HUB_PRIVILEGES);

  const requested = searchParams.get("tab") as ComplianceHubTabKey | null;
  const activeTab: ComplianceHubTabKey | null =
    requested && allowedKeys.has(requested)
      ? requested
      : defaultTab;

  const [chrome, setChrome] = React.useState<ComplianceChrome | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    setChrome(null);
  }, [activeTab]);

  React.useEffect(() => {
    if (!defaultTab) return;
    if (!requested || !allowedKeys.has(requested)) {
      const params = new URLSearchParams(searchParams);
      params.set("tab", defaultTab);
      setSearchParams(params, { replace: true });
    }
  }, [requested, defaultTab, allowedKeys, searchParams, setSearchParams]);

  const setActiveTab = (tab: ComplianceHubTabKey) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

  const shared = {
    onBack,
    defaultZoneId,
    defaultStateId,
    embedded: true as const,
    onChromeChange: setChrome,
  };

  const visibleTabMeta = COMPLIANCE_HUB_TABS.filter((t) => allowedKeys.has(t.key));
  const activeTabMeta = visibleTabMeta.find((t) => t.key === activeTab);
  const inLeaf = chrome?.mode === "form" || chrome?.mode === "detail";
  const onHmoModule = activeTab === "hmo-indebtedness";
  const activeHmoTab = parseHmoTab(searchParams.get("hmoTab"));
  const activeHmoMeta = HMO_INDEBTEDNESS_TABS.find((t) => t.key === activeHmoTab);
  const hmoListTitle = `${HMO_INDEBTEDNESS_NAV_TITLE} - ${activeHmoMeta?.tabLabel ?? "Collation Sheet"}`;
  const pageTitle =
    chrome?.title
    || (onHmoModule ? hmoListTitle : undefined)
    || activeTabMeta?.title
    || COMPLIANCE_HUB_NAV_TITLE;

  const handleHeaderBack = () => {
    // Prefer inner navigation (form/detail → list) when the child registered a handler.
    if (chrome?.onInnerBack) {
      chrome.onInnerBack();
      return;
    }
    onBack();
  };

  if (!activeTab || allowedTabs.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#f4f7f5]">
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            {COMPLIANCE_HUB_NAV_TITLE}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-sm border border-[#d4e8dc] bg-white p-8 text-center space-y-3 max-w-md">
            <div className="mx-auto w-10 h-10 rounded-full bg-[#e8f5ee] flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-[#145c3f]" />
            </div>
            <h3 className="text-lg font-bold text-[#0f3d2e]">No access</h3>
            <p className="text-sm text-slate-500">
              You do not have privilege for any Complaint/Compliance tab. Ask an admin to grant the forms you need.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title={pageTitle}
      onBack={inLeaf ? handleHeaderBack : undefined}
      showBack={inLeaf}
      maxWidth="full"
      variant="fluid"
      contentClassName="p-0 flex-1 min-h-0"
      actions={
        // On form/detail, never fall back to the hub Refresh — only show child actions.
        inLeaf
          ? (chrome?.actions ?? undefined)
          : (chrome?.actions ?? (
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
              disabled={refreshing}
              onClick={handleRefresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          ))
      }
      tabs={
        !hideTabStrip && !inLeaf ? (
          <UnderHeaderNavTabs
            tabs={visibleTabMeta.map((tab) => ({
              id: tab.key,
              label: tab.tabLabel,
              icon: ICON_MAP[tab.key],
            }))}
            activeTab={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            ariaLabel="Compliance modules"
          />
        ) : undefined
      }
    >
      <div className="flex-1 min-h-0 w-full h-full">
        {activeTab === "complaints" && (
          <ServicomComplaintsPage
            key={`complaints-${refreshKey}`}
            stateScope
            channelScope="exclude-servicom"
            defaultZoneId={defaultZoneId}
            defaultStateId={null}
            userName={userName}
            userStaffId={userStaffId}
            userRole={userRole}
            userDepartment={userDepartment}
            canCreate={canCreate}
            canReview={canReview}
            {...shared}
          />
        )}

        {activeTab === "weekly-compliance" && (
          <StateOfficeWeeklyCompliancePage
            key={`weekly-${refreshKey}`}
            {...shared}
          />
        )}

        {activeTab === "hmo-indebtedness" && (
          <StateOfficeHmoIndebtednessHubPage
            key={`hmo-${refreshKey}`}
            {...shared}
          />
        )}

        {activeTab === "mystery-shopping" && (
          <StateOfficeMysteryShoppingPage
            key={`mystery-${refreshKey}`}
            {...shared}
          />
        )}
      </div>
    </PageLayout>
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
