/**
 * HMO Indebtedness / Reconciliation templates (Enforcement Department).
 * Matches RECONCILIATION TEMPLATES_UPDATED.xlsx
 *
 * UI is a single hub page with standalone tabs:
 * Collation (default) | PHI | FFS | Capitation | Master (last).
 */

export type HmoReconStream = "phi" | "ffs" | "cap";

export type HmoIndebtednessTabKey = "master" | "phi" | "ffs" | "cap" | "collation";

export const HMO_INDEBTEDNESS_NAV_TITLE = "HMO Indebtedness";
export const HMO_INDEBTEDNESS_VIEW = "state-hmo-indebtedness";
export const HMO_INDEBTEDNESS_PATH = "/zonal/hmo-indebtedness";
export const HMO_INDEBTEDNESS_DEFAULT_TAB: HmoIndebtednessTabKey = "collation";

export const HMO_INDEBTEDNESS_TABS: {
  key: HmoIndebtednessTabKey;
  tabLabel: string;
  title: string;
  stream?: HmoReconStream;
}[] = [
  { key: "collation", tabLabel: "Collation Sheet", title: "HMO Indebtedness Collation" },
  { key: "phi", tabLabel: "PHI Reconciliation", title: "Private Health Insurance Reconciliation", stream: "phi" },
  { key: "ffs", tabLabel: "Fee For Service Reconciliation", title: "Fee For Service Reconciliation", stream: "ffs" },
  { key: "cap", tabLabel: "Capitation Reconciliation", title: "Capitation Reconciliation", stream: "cap" },
  { key: "master", tabLabel: "Master Data Sheet", title: "Reconciliation Master Sheet" },
];

/** Legacy deep-link children (kept for redirects / privilege title expansion). */
export type HmoIndebtednessChild = {
  key: string;
  title: string;
  navLabel: string;
  view: string;
  path: string;
  template: "1" | "2A" | "2B" | "2C" | "3";
  stream?: HmoReconStream;
  tab: HmoIndebtednessTabKey;
};

export const HMO_INDEBTEDNESS_CHILDREN: HmoIndebtednessChild[] = [
  {
    key: "master",
    title: "Reconciliation Master Sheet",
    navLabel: "Master Data Sheet",
    view: "state-hmo-master",
    path: "/zonal/hmo-indebtedness/master",
    template: "3",
    tab: "master",
  },
  {
    key: "phi",
    title: "Private Health Insurance Reconciliation",
    navLabel: "PHI Reconciliation",
    view: "state-hmo-recon-phi",
    path: "/zonal/hmo-indebtedness/phi",
    template: "2A",
    stream: "phi",
    tab: "phi",
  },
  {
    key: "ffs",
    title: "Fee For Service Reconciliation",
    navLabel: "Fee For Service Reconciliation",
    view: "state-hmo-recon-ffs",
    path: "/zonal/hmo-indebtedness/ffs",
    template: "2B",
    stream: "ffs",
    tab: "ffs",
  },
  {
    key: "cap",
    title: "Capitation Reconciliation",
    navLabel: "Capitation Reconciliation",
    view: "state-hmo-recon-cap",
    path: "/zonal/hmo-indebtedness/cap",
    template: "2C",
    stream: "cap",
    tab: "cap",
  },
  {
    key: "collation",
    title: "HMO Indebtedness Collation",
    navLabel: "Collation Sheet",
    view: "state-hmo-indebtedness",
    path: "/zonal/hmo-indebtedness",
    template: "1",
    tab: "collation",
  },
];

export const HMO_RECON_STREAM_META: Record<
  HmoReconStream,
  { template: string; pageTitle: string; actualLabel: string }
> = {
  phi: {
    template: "2A",
    pageTitle: "Private Health Insurance Reconciliation",
    actualLabel: "Actual Indebtedness",
  },
  ffs: {
    template: "2B",
    pageTitle: "Fee For Service Reconciliation",
    actualLabel: "Actual Indebtedness",
  },
  cap: {
    template: "2C",
    pageTitle: "Capitation Reconciliation",
    actualLabel: "Returned Capitation",
  },
};
