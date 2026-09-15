export type UserRole =
  | "admin" | "state-officer" | "zonal-coordinator"
  | "state-coordinator" | "department-officer" | "sdo" | "hq-department" | "dg-ceo";

export interface ChildModule {
  title: string;
  /** Shorter label in the sidebar; privilege matching still uses `title`. */
  navLabel?: string;
  view?: string;
  path?: string;
}

export interface SubGroup {
  type: "group";
  label: string;
  children: (ChildModule | SubGroup)[];
}

export interface ParentModule {
  title: string;
  roles: UserRole[] | "all" | string;
  /** Flat children OR nested sub-groups */
  children: (ChildModule | SubGroup)[];
}

export function isSubGroup(c: ChildModule | SubGroup): c is SubGroup {
  return "type" in c && c.type === "group";
}

/** Parent module key for SOC/Zonal reporting (sidebar label: SOC/Zones) */
export const SOC_ZONES_MODULE = "SOC/Zones";

/** Zonal state office reports (nested under SOC/ZONES in SDO sidebar) */
export const ZONAL_MODULE = "Zonal";

/** @deprecated Use ZONAL_MODULE */
export const OTHERS_MODULE = ZONAL_MODULE;

/** SDO privilege key (sidebar parent) */
export const SDO_MODULE = "SDO";

/** SDO sidebar group that hosts SOC + State Office pillars */
export const SDO_SOC_NAV_GROUP = "State Office Coordination";
/** SDO sidebar group for stock verification */
export const SDO_STOCK_NAV_GROUP = "Stock Verification";

export const ZONAL_LEGACY_ALIASES = ["Others"] as const;

/** Dept monthly report modules hidden from admin sidebar */
export const ADMIN_HIDDEN_MODULE_TITLES = [
  "Finance & Admin Dept",
  "Programmes",
] as const;

/** Individual nav items hidden from admin (within modules that stay visible) */
export const ADMIN_HIDDEN_FUNCTIONALITY_TITLES = [
  "SQA Report",
  "Complaints Report",
] as const;

export function isModuleHiddenForAdmin(moduleTitle: string): boolean {
  return (ADMIN_HIDDEN_MODULE_TITLES as readonly string[]).includes(moduleTitle);
}

export function isFunctionalityHiddenForAdmin(functionalityTitle: string): boolean {
  return (ADMIN_HIDDEN_FUNCTIONALITY_TITLES as readonly string[]).includes(functionalityTitle);
}

export function modulesVisibleToAdmin(): ParentModule[] {
  return MODULE_CONFIG.filter((m) => !isModuleHiddenForAdmin(m.title));
}

export function adminAllowedTitlesForModule(mod: ParentModule): Set<string> {
  return new Set(
    flatLeaves(mod).filter((t) => !isFunctionalityHiddenForAdmin(t)),
  );
}

export function adminVisibleChildrenForModule(mod: ParentModule): ParentModule["children"] {
  const out: ParentModule["children"] = [];
  for (const c of mod.children) {
    if (isSubGroup(c)) {
      const children = c.children.filter(
        (child) => isSubGroup(child) || !isFunctionalityHiddenForAdmin(child.title),
      );
      if (children.length > 0) out.push({ ...c, children });
    } else if (!isFunctionalityHiddenForAdmin(c.title)) {
      out.push(c);
    }
  }
  return out;
}

/** Older user records may still store these access_to values */
export const SOC_ZONES_LEGACY_ALIASES = ["State Offices"] as const;

export function resolveModuleTitle(accessTo: string): string {
  if ((SOC_ZONES_LEGACY_ALIASES as readonly string[]).includes(accessTo)) {
    return SOC_ZONES_MODULE;
  }
  if ((ZONAL_LEGACY_ALIASES as readonly string[]).includes(accessTo)) {
    return ZONAL_MODULE;
  }
  if (accessTo === "Store Management") return "Asset Management (SVO)";
  return accessTo;
}

export function moduleConfigForAccess(accessTo: string): ParentModule | undefined {
  return MODULE_CONFIG.find((m) => m.title === resolveModuleTitle(accessTo));
}

/**
 * Exact match of the sidebar nav JSON structure.
 * title = access_to key stored in user.functionalities
 */
export const MODULE_CONFIG: ParentModule[] = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  {
    title: "Dashboard",
    roles: "all",
    children: [
      { title: "Dashboard", view: "home", path: "/" },
    ],
  },

  // ── Annual Reports ─────────────────────────────────────────────────────────
  {
    title: "Annual Reports",
    roles: "!dg-ceo",
    children: [
      { title: "Annual Report", view: "annual-reports-list", path: "/annual-reports/mine" },
    ],
  },
  {
    title: "Finance & Admin Dept",
    roles: "all",
    children: [
      { type: "group", label: "Finance", children: [
        { title: "Finance Report", view: "finance-monthly", path: "/monthly/finance" },
      ]},
      { type: "group", label: "Admin", children: [
        { title: "Admin Report", view: "admin-monthly", path: "/monthly/admin" },
      ]},
    ],
  },

  // ── Standards & Quality Assurance ─────────────────────────────────────────
  {
    title: "Standards & Quality Assurance",
    roles: "all",
    children: [
      { type: "group", label: "HMO/HCP Quality Assurance", children: [
        { title: "SQA Report", view: "sqa-monthly", path: "/monthly/sqa" },
      ]},
      { type: "group", label: "Enrollee Complaints / SHIA Liaison", children: [
        { title: "Complaints Report", view: "complaints-monthly", path: "/monthly/complaints" },
      ]},
      { type: "group", label: "Compliance Management", children: [
        { title: "Compliance Management", view: "sqa-compliance", path: "/compliance" },
      ]},
    ],
  },

  // ── Zonal ICT Support ──────────────────────────────────────────────────────
  {
    title: "Zonal ICT Support",
    roles: "all",
    children: [
      { title: "ICT Support Desk", path: "/ict/desk" },
      { title: "Systems & Network", path: "/ict/systems" },
    ],
  },

  // ── Programmes ─────────────────────────────────────────────────────────────
  {
    title: "Programmes",
    roles: "all",
    children: [
      { type: "group", label: "Enrolment", children: [
        { title: "Programmes Report", view: "programmes-monthly", path: "/monthly/programmes" },
      ]},
      { type: "group", label: "Enrollment Enquiries & Outreach", children: [
        { title: "Outreach Report", view: "outreach-monthly", path: "/monthly/outreach" },
      ]},
    ],
  },

  // ── SDO ────────────────────────────────────────────────────────────────────
  {
    title: SDO_MODULE,
    roles: "all",
    children: [
      { type: "group", label: "SERVICOM", children: [
        { title: "SERVICOM Dashboard", view: "servicom-dashboard", path: "/sdo/servicom", navLabel: "Dashboard" },
        { title: "Charter Performance",          view: "servicom-comment-card", path: "/sdo/servicom/comment-card" },
        { title: "Complaints Management",        view: "servicom-complaints",   path: "/sdo/servicom/complaints", navLabel: "Complaints Register" },
        { title: "Customer Satisfaction Survey", view: "servicom-satisfaction", path: "/sdo/servicom/satisfaction", navLabel: "Satisfaction Survey" },
      ]},
      { type: "group", label: SDO_STOCK_NAV_GROUP, children: [
        { title: "Stock Verification Dashboard", view: "stock-verification-dashboard", path: "/sdo/stock-dashboard", navLabel: "Dashboard" },
        { title: "Physical Asset Verification", view: "store-verification-verify", path: "/store-management/verification/verify", navLabel: "Asset Verification" },
        { title: "Verification of Supply",      view: "store-supply-verification", path: "/store-management/verification/supply", navLabel: "Supply Verification" },
        { title: "Prepayment Analysis Register", view: "store-prepayment-analysis", path: "/store-management/prepayment-analysis", navLabel: "Prepayment Analysis" },
        { type: "group", label: "Store Management", children: [
          { title: "Inventory Register",          view: "store-inventory-catalog",   path: "/store-management/inventory/items", navLabel: "Inventory" },
          { title: "Capitalisation & Issuance",   view: "store-asset-transfers",     path: "/store-management/transfers/requests", navLabel: "Issuance" },
        ]},
      ]},
      { type: "group", label: SDO_SOC_NAV_GROUP, children: [] },
      { type: "group", label: "Special Project", children: [
        { title: "SPECIAL PROJECT", view: "special-projects", path: "/sdo/projects", navLabel: "Ad-hoc Project" },
      ]},
    ],
  },

  // ── Stock Management — grant separately when assigning role access ────


  // ── SOC/Zonal (core SOC unit pages) ─────────────────────────────────────────
  {
    title: SOC_ZONES_MODULE,
    roles: "all",
    children: [
      { title: "SOC/Zones Dashboard", view: "soc-zones-dashboard", path: "/soc/dashboard", navLabel: "Dashboard" },
      { title: "State/Zonal Office Profile", view: "soc-office-profile", path: "/soc/office-profile", navLabel: "Office Profile" },
      { title: "State/Zonal Focal Persons Register", view: "soc-focal-persons", path: "/soc/focal-persons", navLabel: "Focal Persons" },
      { title: "Monthly Enrollee Register", view: "state-enrollee-register", path: "/soc/enrollee-register", navLabel: "Enrollee Register" },
      { title: "ETMC/TMC Action-Point Register", view: "state-etmc-tmc-action-point", path: "/soc/etmc-tmc-action-point", navLabel: "ETMC Action Points" },
      { title: "Weekly Actionable", view: "state-weekly-actionable", path: "/soc/weekly-actionable", navLabel: "Escalated Issues" },
      { title: "Contracted Services", view: "state-contracted-services", path: "/soc/contracted-services" },
      { title: "Operation Monitoring Visit", view: "soc-operation-monitoring-visit", path: "/soc/operation-monitoring-visit", navLabel: "Operation Monitoring" },
      { title: "Spot Check Visit", view: "soc-spot-check-visit", path: "/soc/spot-check-visit", navLabel: "Spot Check" },
    ],
  },

  // ── Zonal (state office reports under SOC/ZONES) ─────────────────────────────
  {
    title: ZONAL_MODULE,
    roles: "all",
    children: [
      { type: "group", label: "Enrolment", children: [
        { title: "Enrolment", view: "state-enrolment", path: "/zonal/enrolment" },
        { title: "Migration / Update Requests", view: "state-migration", path: "/zonal/migration", navLabel: "Migration" },
        { title: "CEmONC & FFP Beneficiaries", view: "state-cemonc", path: "/zonal/cemonc", navLabel: "CEmONC & FFP" },
      ]},
      { type: "group", label: "Beneficiary Management", children: [
        { title: "Additional / Extra Dependant", view: "state-extra-dependant", path: "/zonal/beneficiary/extra-dependant", navLabel: "Extra Dependant" },
        { title: "HMO Selection Process", view: "state-hmo-selection", path: "/zonal/hmo-selection", navLabel: "MDA HMO Selection" },
        { title: "Change of HCF", view: "state-hcf-change", path: "/zonal/beneficiary/hcf-change", navLabel: "Change of HCP" },
      ]},
      { type: "group", label: "Stakeholder Management", children: [
        { title: "Stakeholder Engagement", view: "state-stakeholder", path: "/zonal/stakeholder", navLabel: "Engagements" },
      ]},
      { type: "group", label: "Provider Management", children: [
        { title: "Accreditation / Reaccreditation", view: "state-accreditation", path: "/zonal/accreditation", navLabel: "Accreditation" },
      ]},
      { type: "group", label: "Complaint / Compliance", children: [
        { title: "Monitoring Visits", view: "servicom-visits", path: "/zonal/monitoring-visits" },
      ]},
      { type: "group", label: "Finance", children: [
        { title: "IGR", view: "state-igr", path: "/zonal/igr" },
        { title: "SSHIA Financial Report", view: "state-sshia-financial", path: "/zonal/sshia-financial", navLabel: "SSHIA Report" },
        { title: "Expenditure Profile", view: "state-expenditure-profile", path: "/zonal/expenditure-profile", navLabel: "Expenditure" },
        { title: "Challenges & Recommendations", view: "state-challenges", path: "/zonal/challenges", navLabel: "Challenges" },
      ]},
      { type: "group", label: "ICT", children: [
        { title: "ICT Support", view: "state-ict-support", path: "/zonal/ict/support", navLabel: "Support" },
      ]},
      { type: "group", label: "Admin / Human Resource", children: [
        { title: "Meetings", view: "state-admin-meetings", path: "/zonal/admin-hr/meetings" },
        { title: "ETMC Cascading", view: "state-etmc-cascading", path: "/zonal/admin-hr/etmc-cascading" },
        { title: "Accommodation", view: "state-accommodation", path: "/zonal/admin-hr/accommodation" },
        { title: "Utilities", view: "state-utilities", path: "/zonal/admin-hr/utilities" },
        { title: "Vehicles", view: "state-vehicles", path: "/zonal/admin-hr/vehicles" },
        { title: "Staff Feedback", view: "state-staff-feedback", path: "/zonal/admin-hr/feedback", navLabel: "Feedback" },
        { title: "Infractions", view: "state-infractions", path: "/zonal/admin-hr/infractions" },
      ]},
    ],
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  {
    title: "Notifications",
    roles: "all",
    children: [{ title: "Notifications", view: "notifications", path: "/notifications" }],
  },

  // ── Settings (granted via Privileges) ─────────────────────────────────────
  {
    title: "Settings",
    roles: "all",
    children: [{ title: "Settings", view: "settings", path: "/settings" }],
  },
];

export interface ViewModuleAccess {
  module: string;
  functionality: string;
}

const GUARDED_MODULE_TITLES = [SOC_ZONES_MODULE, ZONAL_MODULE, SDO_MODULE] as const;

/** Map routable view keys to parent module + functionality (for access guards) */
export const VIEW_MODULE_ACCESS: Record<string, ViewModuleAccess> = (() => {
  const out: Record<string, ViewModuleAccess> = {};
  for (const modTitle of GUARDED_MODULE_TITLES) {
    const mod = MODULE_CONFIG.find((m) => m.title === modTitle);
    if (!mod) continue;
    const walk = (nodes: (ChildModule | SubGroup)[]) => {
      for (const c of nodes) {
        if (isSubGroup(c)) {
          walk(c.children);
        } else if (c.view) {
          out[c.view] = { module: modTitle, functionality: c.title };
        }
      }
    };
    walk(mod.children);
  }
  return out;
})();

/** @deprecated Use VIEW_MODULE_ACCESS */
export const STATE_VIEW_TO_FUNCTIONALITY: Record<string, string> = Object.fromEntries(
  Object.entries(VIEW_MODULE_ACCESS).map(([view, { functionality }]) => [view, functionality]),
);

/** Flatten all leaf titles from a module (for privilege checkboxes) */
export function flatLeaves(mod: ParentModule): string[] {
  const out: string[] = [];
  const walk = (nodes: (ChildModule | SubGroup)[]) => {
    for (const c of nodes) {
      if (isSubGroup(c)) {
        walk(c.children);
      } else {
        out.push(c.title);
      }
    }
  };
  walk(mod.children);
  return out;
}

/** True if the module has at least one child with a routable view */
export function hasRoutableView(mod: ParentModule): boolean {
  const walk = (nodes: (ChildModule | SubGroup)[]): boolean =>
    nodes.some((c) => {
      if (isSubGroup(c)) return walk(c.children);
      return !!c.view;
    });
  return walk(mod.children);
}