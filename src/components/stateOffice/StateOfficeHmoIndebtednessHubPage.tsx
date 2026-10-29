import * as React from "react";
import {
  ArrowLeft, FileSpreadsheet, GitCompareArrows, Layers3, Shield, type LucideIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  HMO_INDEBTEDNESS_DEFAULT_TAB,
  HMO_INDEBTEDNESS_NAV_TITLE,
  HMO_INDEBTEDNESS_PATH,
  HMO_INDEBTEDNESS_TABS,
  type HmoIndebtednessTabKey,
  type HmoReconStream,
} from "./hmoIndebtednessTypes";
import StateOfficeHmoMasterPage from "./StateOfficeHmoMasterPage";
import StateOfficeHmoReconPage from "./StateOfficeHmoReconPage";
import StateOfficeHmoIndebtednessPage from "./StateOfficeHmoIndebtednessPage";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
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
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const activeMeta = HMO_INDEBTEDNESS_TABS.find((t) => t.key === activeTab) ?? HMO_INDEBTEDNESS_TABS[0];

  const setActiveTab = (tab: HmoIndebtednessTabKey) => {
    const next = new URLSearchParams(searchParams);
    if (tab === HMO_INDEBTEDNESS_DEFAULT_TAB) next.delete("tab");
    else next.set("tab", tab);
    next.delete("stream");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {HMO_INDEBTEDNESS_NAV_TITLE}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {activeMeta.title}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div
          className="flex gap-0 overflow-x-auto -mb-px"
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
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "master" && (
          <StateOfficeHmoMasterPage
            embedded
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        )}
        {activeMeta.stream && (
          <StateOfficeHmoReconPage
            key={activeMeta.stream}
            embedded
            stream={activeMeta.stream}
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        )}
        {activeTab === "collation" && (
          <StateOfficeHmoIndebtednessPage
            embedded
            onBack={onBack}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
          />
        )}
      </div>
    </div>
  );
}

/** Redirect legacy per-sheet URLs into the hub with the matching tab. */
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
    if (tab !== HMO_INDEBTEDNESS_DEFAULT_TAB) params.set("tab", tab);
    const qs = params.toString();
    navigate(`${HMO_INDEBTEDNESS_PATH}${qs ? `?${qs}` : ""}`, { replace: true });
  }, [navigate, tab]);
  return null;
}
