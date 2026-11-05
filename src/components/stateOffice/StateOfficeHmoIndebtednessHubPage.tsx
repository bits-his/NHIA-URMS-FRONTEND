import * as React from "react";
import {
  ArrowLeft, FileSpreadsheet, GitCompareArrows, Layers3, Shield, type LucideIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  HMO_INDEBTEDNESS_DEFAULT_TAB,
  HMO_INDEBTEDNESS_NAV_TITLE,
  HMO_INDEBTEDNESS_TABS,
  type HmoIndebtednessTabKey,
  type HmoReconStream,
} from "./hmoIndebtednessTypes";
import { COMPLIANCE_HUB_PATH } from "./complianceHubTypes";
import type { ComplianceChrome } from "./ComplianceHubPage";
import StateOfficeHmoMasterPage from "./StateOfficeHmoMasterPage";
import StateOfficeHmoReconPage from "./StateOfficeHmoReconPage";
import StateOfficeHmoIndebtednessPage from "./StateOfficeHmoIndebtednessPage";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** When true, hide outer chrome (parent hub owns title/back) and use `hmoTab` query. */
  embedded?: boolean;
  onChromeChange?: (chrome: ComplianceChrome | null) => void;
}

const TAB_KEYS = new Set<HmoIndebtednessTabKey>(
  HMO_INDEBTEDNESS_TABS.map((t) => t.key),
);

function parseTab(raw: string | null): HmoIndebtednessTabKey {
  if (raw && TAB_KEYS.has(raw as HmoIndebtednessTabKey)) {
    return raw as HmoIndebtednessTabKey;
  }
  // Legacy nested-recon query → PHI
  if (raw === "reconciliation") return "phi";
  return HMO_INDEBTEDNESS_DEFAULT_TAB;
}

const TAB_ICONS: Record<HmoIndebtednessTabKey, LucideIcon> = {
  master: FileSpreadsheet,
  phi: Shield,
  ffs: GitCompareArrows,
  cap: GitCompareArrows,
  collation: Layers3,
};

/**
 * HMO Indebtedness hub — Collation default; PHI / FFS / Capitation; Master last.
 */
export default function StateOfficeHmoIndebtednessHubPage({
  onBack,
  defaultZoneId,
  defaultStateId,
  embedded = false,
  onChromeChange,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParamKey = embedded ? "hmoTab" : "tab";
  const activeTab = parseTab(searchParams.get(tabParamKey));
  const activeMeta = HMO_INDEBTEDNESS_TABS.find((t) => t.key === activeTab) ?? HMO_INDEBTEDNESS_TABS[0];
  const [childChrome, setChildChrome] = React.useState<ComplianceChrome | null>(null);

  React.useEffect(() => {
    setChildChrome(null);
  }, [activeTab]);

  React.useEffect(() => {
    if (!embedded || !onChromeChange) return;
    onChromeChange(childChrome);
  }, [embedded, onChromeChange, childChrome]);

  React.useEffect(() => () => onChromeChange?.(null), [onChromeChange]);

  const setActiveTab = (tab: HmoIndebtednessTabKey) => {
    const next = new URLSearchParams(searchParams);
    if (embedded) {
      next.set("tab", "hmo-indebtedness");
      if (tab === HMO_INDEBTEDNESS_DEFAULT_TAB) next.delete("hmoTab");
      else next.set("hmoTab", tab);
    } else {
      if (tab === HMO_INDEBTEDNESS_DEFAULT_TAB) next.delete("tab");
      else next.set("tab", tab);
      next.delete("stream");
    }
    setSearchParams(next, { replace: true });
  };

  const inLeaf = childChrome?.mode === "form" || childChrome?.mode === "detail";
  const sharedChild = {
    embedded: true as const,
    onBack,
    defaultZoneId,
    defaultStateId,
    onChromeChange: setChildChrome,
  };

  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-[#f4f7f5]"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {HMO_INDEBTEDNESS_NAV_TITLE}
            </h2>
          </div>
        </div>
      )}

      {!inLeaf && (
        <div className={`bg-white border-b border-[#d4e8dc] px-4 md:px-6 ${embedded ? "sticky top-0 z-10" : "sticky top-[57px] z-20"}`}>
          <div
            className="flex gap-4 overflow-x-auto -mb-px"
            role="tablist"
            aria-label="HMO Indebtedness sections"
          >
            {HMO_INDEBTEDNESS_TABS.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = TAB_ICONS[tab.key];
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
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "master" && (
          <StateOfficeHmoMasterPage {...sharedChild} />
        )}
        {activeMeta.stream && (
          <StateOfficeHmoReconPage
            key={activeMeta.stream}
            stream={activeMeta.stream}
            {...sharedChild}
          />
        )}
        {activeTab === "collation" && (
          <StateOfficeHmoIndebtednessPage {...sharedChild} />
        )}
      </div>
    </div>
  );
}

/** Redirect legacy per-sheet URLs into the compliance hub HMO tab. */
export function HmoIndebtednessLegacyRedirect({
  tab,
}: {
  tab: HmoIndebtednessTabKey;
  /** @deprecated nested stream; use tab=phi|ffs|cap instead */
  stream?: HmoReconStream;
}) {
  const navigate = useNavigate();
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", "hmo-indebtedness");
    if (tab !== HMO_INDEBTEDNESS_DEFAULT_TAB) params.set("hmoTab", tab);
    navigate(`${COMPLIANCE_HUB_PATH}?${params.toString()}`, { replace: true });
  }, [navigate, tab]);
  return null;
}
