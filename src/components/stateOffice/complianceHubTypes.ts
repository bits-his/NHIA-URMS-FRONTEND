/**
 * Complaint / Compliance Management hub.
 * Combines compliance-related registers into a single tabbed interface.
 */

export type ComplianceHubTabKey =
  | "complaints"
  | "weekly-compliance"
  | "hmo-indebtedness"
  | "mystery-shopping";

export const COMPLIANCE_HUB_NAV_TITLE = "Complaint/Compliance Management";
export const COMPLIANCE_HUB_VIEW = "state-compliance-hub";
export const COMPLIANCE_HUB_PATH = "/zonal/compliance-hub";
export const COMPLIANCE_HUB_DEFAULT_TAB: ComplianceHubTabKey = "complaints";

export const COMPLIANCE_HUB_TABS: {
  key: ComplianceHubTabKey;
  tabLabel: string;
  title: string;
}[] = [
  { key: "complaints", tabLabel: "Complaints Register", title: "State Complaints Register" },
  { key: "weekly-compliance", tabLabel: "HCF Compliance Monitoring", title: "HCF Compliance Monitoring" },
  { key: "hmo-indebtedness", tabLabel: "HMO Indebtedness", title: "HMO Indebtedness" },
  { key: "mystery-shopping", tabLabel: "Mystery Shopping", title: "Mystery Shopping" },
];

const TAB_KEYS = new Set<ComplianceHubTabKey>(COMPLIANCE_HUB_TABS.map((t) => t.key));

export function parseComplianceHubTab(raw: string | null): ComplianceHubTabKey {
  if (raw && TAB_KEYS.has(raw as ComplianceHubTabKey)) return raw as ComplianceHubTabKey;
  return COMPLIANCE_HUB_DEFAULT_TAB;
}

/** Legacy deep-link children (kept for redirects / privilege title expansion). */
export type ComplianceHubChild = {
  key: string;
  title: string;
  navLabel: string;
  view: string;
  path: string;
  tab: ComplianceHubTabKey;
};

export const COMPLIANCE_HUB_CHILDREN: ComplianceHubChild[] = [
  {
    key: "complaints",
    title: "State Complaints Register",
    navLabel: "Complaints Register",
    view: "zonal-complaints-register",
    path: "/zonal/complaints-register",
    tab: "complaints",
  },
  {
    key: "weekly-compliance",
    title: "HCF Compliance Monitoring",
    navLabel: "HCF Compliance Monitoring",
    view: "state-weekly-compliance",
    path: "/zonal/weekly-compliance",
    tab: "weekly-compliance",
  },
  {
    key: "hmo-indebtedness",
    title: "HMO Indebtedness",
    navLabel: "HMO Indebtedness",
    view: "state-hmo-indebtedness",
    path: "/zonal/hmo-indebtedness",
    tab: "hmo-indebtedness",
  },
  {
    key: "mystery-shopping",
    title: "Mystery Shopping",
    navLabel: "Mystery Shopping",
    view: "state-mystery-shopping",
    path: "/zonal/mystery-shopping",
    tab: "mystery-shopping",
  },
];
