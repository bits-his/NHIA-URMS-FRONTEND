/**
 * HMO Indebtedness / Reconciliation templates (Enforcement Department).
 * Matches RECONCILIATION TEMPLATES_UPDATED.xlsx
 */

export type HmoReconStream = "phi" | "ffs" | "cap";

export type HmoIndebtednessChild = {
  key: string;
  title: string;
  navLabel: string;
  view: string;
  path: string;
  template: "1" | "2A" | "2B" | "2C" | "3";
  stream?: HmoReconStream;
};

export const HMO_INDEBTEDNESS_CHILDREN: HmoIndebtednessChild[] = [
  {
    key: "collation",
    title: "HMO Indebtedness Collation",
    navLabel: "Collation Sheet",
    view: "state-hmo-indebtedness",
    path: "/zonal/hmo-indebtedness",
    template: "1",
  },
  {
    key: "phi",
    title: "Private Health Insurance Reconciliation",
    navLabel: "PHI Reconciliation",
    view: "state-hmo-recon-phi",
    path: "/zonal/hmo-indebtedness/phi",
    template: "2A",
    stream: "phi",
  },
  {
    key: "ffs",
    title: "FFS Reconciliation",
    navLabel: "FFS Reconciliation",
    view: "state-hmo-recon-ffs",
    path: "/zonal/hmo-indebtedness/ffs",
    template: "2B",
    stream: "ffs",
  },
  {
    key: "cap",
    title: "Capitation Reconciliation",
    navLabel: "Capitation Reconciliation",
    view: "state-hmo-recon-cap",
    path: "/zonal/hmo-indebtedness/cap",
    template: "2C",
    stream: "cap",
  },
  {
    key: "master",
    title: "Reconciliation Master Sheet",
    navLabel: "Master Data Sheet",
    view: "state-hmo-master",
    path: "/zonal/hmo-indebtedness/master",
    template: "3",
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
    pageTitle: "FFS Reconciliation",
    actualLabel: "Actual Indebtedness",
  },
  cap: {
    template: "2C",
    pageTitle: "Capitation Reconciliation",
    actualLabel: "Returned Capitation",
  },
};
