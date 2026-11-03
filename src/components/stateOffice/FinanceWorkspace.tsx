import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Landmark, ShieldCheck, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import IgrWorkspace from "./IgrWorkspace";
import SshiaWorkspace from "./SshiaWorkspace";
import ExpenditureWorkspace from "./ExpenditureWorkspace";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
}

type FinanceTab = "igr" | "sshia" | "expenditure";

const TABS: { key: FinanceTab; label: string; icon: React.ReactNode }[] = [
  { key: "igr", label: "IGR", icon: <Landmark className="size-4 shrink-0" /> },
  { key: "sshia", label: "SSHIA", icon: <ShieldCheck className="size-4 shrink-0" /> },
  { key: "expenditure", label: "Expenditure", icon: <Receipt className="size-4 shrink-0" /> },
];

function parseTab(value: string | null): FinanceTab {
  if (value === "sshia" || value === "expenditure") return value;
  return "igr";
}

export default function FinanceWorkspace({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
}: Props) {
  const [params, setParams] = useSearchParams();
  const activeTab = parseTab(params.get("tab"));

  const selectTab = (tab: FinanceTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
  };

  const shared = {
    onBack,
    defaultZoneId,
    defaultStateId,
    userRole,
    embedded: true,
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center sticky top-0 z-30 gap-3">
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
          Finance
        </h2>
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

      <div className="flex-1 min-h-0">
        {activeTab === "igr" ? (
          <IgrWorkspace {...shared} />
        ) : activeTab === "sshia" ? (
          <SshiaWorkspace {...shared} />
        ) : (
          <ExpenditureWorkspace {...shared} />
        )}
      </div>
    </div>
  );
}
