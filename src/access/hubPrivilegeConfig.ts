/**
 * Hub shell (one sidebar leaf) + granular tab privileges (grantable one-by-one).
 */
import { ZONAL_MODULE } from "./moduleConfig";
import {
  COMPLIANCE_HUB_NAV_TITLE,
  COMPLIANCE_HUB_PATH,
  type ComplianceHubTabKey,
} from "@/src/components/stateOffice/complianceHubTypes";
import { HMO_INDEBTEDNESS_NAV_TITLE } from "@/src/components/stateOffice/hmoIndebtednessTypes";

export type HubTabPrivilege<K extends string = string> = {
  key: K;
  tabLabel: string;
  /** Canonical title stored in user.functionalities */
  privilegeTitle: string;
  /** Legacy / alternate names that count as this tab */
  aliases?: string[];
};

export type HubPrivilegeConfig<K extends string = string> = {
  /** Sidebar / moduleConfig leaf title */
  hubTitle: string;
  hubPath: string;
  moduleTitle: string;
  tabs: HubTabPrivilege<K>[];
};

export const FINANCE_HUB_NAV_TITLE = "IGR, SSHIA & Expenditure";
export const FINANCE_HUB_PATH = "/zonal/finance/records";

export type FinanceHubTabKey = "igr" | "sshia" | "expenditure";

export const COMPLIANCE_HUB_PRIVILEGES: HubPrivilegeConfig<ComplianceHubTabKey> = {
  hubTitle: COMPLIANCE_HUB_NAV_TITLE,
  hubPath: COMPLIANCE_HUB_PATH,
  moduleTitle: ZONAL_MODULE,
  tabs: [
    {
      key: "complaints",
      tabLabel: "Complaints Register",
      privilegeTitle: "State Complaints Register",
      aliases: ["Complaints Register", "State Complaints Register"],
    },
    {
      key: "weekly-compliance",
      tabLabel: "Weekly Compliance",
      privilegeTitle: "Weekly Compliance Report",
      aliases: ["Weekly Compliance"],
    },
    {
      key: "hmo-indebtedness",
      tabLabel: "HMO Indebtedness",
      privilegeTitle: HMO_INDEBTEDNESS_NAV_TITLE,
      aliases: [
        "HMO Indebtedness Collation",
        "HMO Indebtedness & Reconciliation",
        "PHI Reconciliation",
        "Private Health Insurance Reconciliation",
        "FFS Reconciliation",
        "Fee For Service Reconciliation",
        "Capitation Reconciliation",
        "Reconciliation Master Sheet",
      ],
    },
    {
      key: "mystery-shopping",
      tabLabel: "Mystery Shopping",
      privilegeTitle: "Mystery Shopping",
    },
  ],
};

export const FINANCE_HUB_PRIVILEGES: HubPrivilegeConfig<FinanceHubTabKey> = {
  hubTitle: FINANCE_HUB_NAV_TITLE,
  hubPath: FINANCE_HUB_PATH,
  moduleTitle: ZONAL_MODULE,
  tabs: [
    {
      key: "igr",
      tabLabel: "IGR",
      privilegeTitle: "Internally Generated Revenue (IGR)",
      aliases: ["IGR", "Internally Generated Revenue"],
    },
    {
      key: "sshia",
      tabLabel: "SSHIA",
      privilegeTitle: "SSHIA Financial Report",
      aliases: ["SSHIA Financial", "SSHIA Financial Reports", "SSHIA"],
    },
    {
      key: "expenditure",
      tabLabel: "Expenditure",
      privilegeTitle: "Expenditure Profile",
      aliases: ["Expenditure"],
    },
  ],
};

export const HUB_PRIVILEGE_CONFIGS: HubPrivilegeConfig[] = [
  COMPLIANCE_HUB_PRIVILEGES,
  FINANCE_HUB_PRIVILEGES,
];

export function hubConfigByTitle(hubTitle: string): HubPrivilegeConfig | undefined {
  return HUB_PRIVILEGE_CONFIGS.find((h) => h.hubTitle === hubTitle);
}

export function isHubNavTitle(title: string): boolean {
  return HUB_PRIVILEGE_CONFIGS.some((h) => h.hubTitle === title);
}

/** All canonical + alias titles that belong to a hub’s tabs */
export function hubTabTitleSet(hub: HubPrivilegeConfig): Set<string> {
  const set = new Set<string>();
  for (const tab of hub.tabs) {
    set.add(tab.privilegeTitle);
    tab.aliases?.forEach((a) => set.add(a));
  }
  set.add(hub.hubTitle);
  // Casing variant used in older nav labels
  if (hub.hubTitle === COMPLIANCE_HUB_NAV_TITLE) {
    set.add("Complaint/Compliance management");
  }
  return set;
}

export function canonicalHubTabTitle(raw: string, hub: HubPrivilegeConfig): string | null {
  if (raw === hub.hubTitle) return hub.hubTitle;
  if (hub.hubTitle === COMPLIANCE_HUB_NAV_TITLE && raw === "Complaint/Compliance management") {
    return hub.hubTitle;
  }
  for (const tab of hub.tabs) {
    if (raw === tab.privilegeTitle || tab.aliases?.includes(raw)) return tab.privilegeTitle;
  }
  return null;
}

/** Extra privilege titles assignable under a module (beyond sidebar flatLeaves). */
export function hubTabPrivilegeTitlesForModule(moduleTitle: string): string[] {
  return HUB_PRIVILEGE_CONFIGS
    .filter((h) => h.moduleTitle === moduleTitle)
    .flatMap((h) => h.tabs.map((t) => t.privilegeTitle));
}

export function allHubAssignableTitles(): string[] {
  return HUB_PRIVILEGE_CONFIGS.flatMap((h) => [
    h.hubTitle,
    ...h.tabs.map((t) => t.privilegeTitle),
  ]);
}

/** Whether a sidebar hub leaf should appear given normalized allowed titles. */
export function isHubLeafAllowed(leafTitle: string, allowedTitles: Set<string>): boolean {
  const hub = hubConfigByTitle(leafTitle);
  if (!hub) return allowedTitles.has(leafTitle);
  if (allowedTitles.has(hub.hubTitle)) return true;
  if (
    hub.hubTitle === COMPLIANCE_HUB_NAV_TITLE
    && allowedTitles.has("Complaint/Compliance management")
  ) {
    return true;
  }
  return hub.tabs.some(
    (tab) =>
      allowedTitles.has(tab.privilegeTitle)
      || tab.aliases?.some((a) => allowedTitles.has(a)),
  );
}
