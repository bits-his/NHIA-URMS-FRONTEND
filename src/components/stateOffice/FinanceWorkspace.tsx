import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Landmark, LayoutDashboard, Receipt, ShieldCheck } from "lucide-react";
import PageLayout from "../PageLayout";
import IgrWorkspace from "./IgrWorkspace";
import SshiaWorkspace from "./SshiaWorkspace";
import ExpenditureWorkspace from "./ExpenditureWorkspace";
import {
  FINANCE_HUB_NAV_TITLE,
  FINANCE_HUB_PRIVILEGES,
  type FinanceHubTabKey,
} from "@/src/access/hubPrivilegeConfig";
import { useAllowedHubTabs } from "@/src/access/hubAccess";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
}

export type FinanceChrome = {
  mode: "list" | "form" | "detail";
  title: string;
  onInnerBack?: () => void;
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
};


const TAB_META: {
  key: FinanceHubTabKey;
  label: string;
  icon: React.ReactNode;
  listTitle: string;
}[] = [
  {
    key: "igr",
    label: "IGR",
    icon: <Landmark className="size-4 shrink-0" />,
    listTitle: "Internally Generated Revenue (IGR)",
  },
  {
    key: "sshia",
    label: "SSHIA",
    icon: <ShieldCheck className="size-4 shrink-0" />,
    listTitle: "SSHIA Progress Report",
  },
  {
    key: "expenditure",
    label: "Expenditure",
    icon: <Receipt className="size-4 shrink-0" />,
    listTitle: "Expenditure Profile",
  },
];

export default function FinanceWorkspace({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
}: Props) {
  const [params, setParams] = useSearchParams();
  const { allowedTabs, allowedKeys, defaultTab, hideTabStrip } =
    useAllowedHubTabs(FINANCE_HUB_PRIVILEGES);

  const requested = params.get("tab") as FinanceHubTabKey | null;
  const activeTab: FinanceHubTabKey | null =
    requested && allowedKeys.has(requested) ? requested : defaultTab;

  const activeMeta = TAB_META.find((t) => t.key === activeTab);

  const [chrome, setChrome] = React.useState<FinanceChrome | null>(null);

  React.useEffect(() => {
    setChrome(null);
  }, [activeTab]);

  React.useEffect(() => {
    if (!defaultTab) return;
    if (!requested || !allowedKeys.has(requested)) {
      const next = new URLSearchParams(params);
      next.set("tab", defaultTab);
      setParams(next, { replace: true });
    }
  }, [requested, defaultTab, allowedKeys, params, setParams]);

  const selectTab = (tab: FinanceHubTabKey) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
  };

  const shared = {
    onBack,
    defaultZoneId: params.get("zone_id") || defaultZoneId,
    defaultStateId: params.get("state_id") || defaultStateId,
    userRole,
    embedded: true,
    onChromeChange: setChrome,
  };

  const visibleTabs = TAB_META.filter((t) => allowedKeys.has(t.key));
  const inLeaf = chrome?.mode === "form" || chrome?.mode === "detail";
  const pageTitle = chrome?.title || activeMeta?.listTitle || FINANCE_HUB_NAV_TITLE;

  const handleHeaderBack = () => {
    if (inLeaf && chrome?.onInnerBack) chrome.onInnerBack();
    else onBack();
  };

  if (!activeTab || allowedTabs.length === 0) {
    return (
      <PageLayout
        title={FINANCE_HUB_NAV_TITLE}
        variant="fluid"
      >
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-sm border border-[#d4e8dc] bg-white p-8 text-center space-y-3 max-w-md">
            <div className="mx-auto w-10 h-10 rounded-full bg-[#e8f5ee] flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-[#145c3f]" />
            </div>
            <h3 className="text-lg font-bold text-[#0f3d2e]">No access</h3>
            <p className="text-sm text-slate-500">
              You do not have privilege for any Finance tab. Ask an admin to grant IGR, SSHIA, and/or Expenditure.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={pageTitle}
      onBack={inLeaf ? handleHeaderBack : undefined}
      actions={
        <div className="flex items-center gap-2 shrink-0">
          {chrome?.statusBadge}
          {chrome?.actions}
        </div>
      }
      filters={
        !hideTabStrip && !inLeaf ? (
          <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist">
            {visibleTabs.map((tab) => (
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
        ) : undefined
      }
      variant="fluid"
      contentClassName="p-0 flex-1 min-h-0"
    >
      <div className="flex-1 min-h-0">
        {activeTab === "igr" ? (
          <IgrWorkspace {...shared} />
        ) : activeTab === "sshia" ? (
          <SshiaWorkspace {...shared} />
        ) : (
          <ExpenditureWorkspace {...shared} />
        )}
      </div>
    </PageLayout>
  );
}
