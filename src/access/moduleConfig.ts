export type UserRole =
  | "admin" | "state-officer" | "zonal-coordinator"
  | "state-coordinator" | "department-officer" | "sdo" | "hq-department" | "dg-ceo";

export interface ChildModule {
  title: string;
  view?: string;
  path?: string;
}

export interface SubGroup {
  type: "group";
  label: string;
  /** Flat leaves and/or nested sub-groups (tree nav) */
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

/** SDO privilege key (sidebar label: SDO) */
export const SDO_MODULE = "SDO";

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
        (leaf) => !isFunctionalityHiddenForAdmin(leaf.title),
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
        { title: "SERVICOM Dashboard", view: "servicom-dashboard", path: "/sdo/servicom" },
        { title: "Charter Performance",          view: "servicom-comment-card", path: "/sdo/servicom/comment-card" },
        { title: "Complaints Management",        view: "servicom-complaints",   path: "/sdo/servicom/complaints" },
        { title: "Customer Satisfaction Survey", view: "servicom-satisfaction", path: "/sdo/servicom/satisfaction" },
      ]},
      { type: "group", label: "STOCK VERIFICATION (SVD)", children: [
        { title: "Stock Verification Dashboard", view: "stock-verification-dashboard", path: "/sdo/stock-dashboard" },
        { title: "Physical Asset Verification", view: "store-verification-verify", path: "/store-management/verification/verify" },
        { title: "Verification of Supply",      view: "store-supply-verification", path: "/store-management/verification/supply" },
        { title: "Prepayment Analysis Register", view: "store-prepayment-analysis", path: "/store-management/prepayment-analysis" },
        { type: "group", label: "Store Management", children: [
          { title: "Inventory Register",          view: "store-inventory-catalog",   path: "/store-management/inventory/items" },
            { title: "Capitalisation & Issuance",   view: "store-asset-transfers",     path: "/store-management/transfers/requests" },
          ]},
      ]},
      { type: "group", label: "SOC/ZONES", children: [] },
      { type: "group", label: "SPECIAL PROJECT", children: [
        { title: "SPECIAL PROJECT", view: "special-projects", path: "/sdo/projects" },
      ]},
    ],
  },

  // ── Stock Management — grant separately when assigning role access ────


  // ── SOC/Zonal (core SOC unit pages) ─────────────────────────────────────────
  {
    title: SOC_ZONES_MODULE,
    roles: "all",
    children: [
      { title: "SOC/Zones Dashboard", view: "soc-zones-dashboard", path: "/soc/dashboard" },
      { title: "State/Zonal Office Profile", view: "soc-office-profile", path: "/soc/office-profile" },
      { title: "State/Zonal Focal Persons Register", view: "soc-focal-persons", path: "/soc/focal-persons" },
      { title: "Weekly Actionable", view: "state-weekly-actionable", path: "/soc/weekly-actionable" },
      { title: "Contracted Services", view: "state-contracted-services", path: "/soc/contracted-services" },
      { title: "Monthly Enrollee Register", view: "state-enrollee-register", path: "/soc/enrollee-register" },
      { title: "ETMC/TMC Action-Point Register", view: "state-etmc-tmc-action-point", path: "/soc/etmc-tmc-action-point" },
      { title: "Operation Monitoring Visit", view: "soc-operation-monitoring-visit", path: "/soc/operation-monitoring-visit" },
      { title: "Spot Check Visit", view: "soc-spot-check-visit", path: "/soc/spot-check-visit" },
    ],
  },

  // ── Zonal (state office reports under SOC/ZONES) ─────────────────────────────
  {
    title: ZONAL_MODULE,
    roles: "all",
    children: [
      { type: "group", label: "Enrolment", children: [
        { title: "Enrolment", view: "state-enrolment", path: "/zonal/enrolment" },
      ]},
      { type: "group", label: "Migration", children: [
        { title: "Migration / Update Requests", view: "state-migration", path: "/zonal/migration" },
      ]},
      { type: "group", label: "CEmONC & FFP", children: [
        { title: "CEmONC & FFP Beneficiaries", view: "state-cemonc", path: "/zonal/cemonc" },
      ]},
      { type: "group", label: "Monitoring", children: [
        { title: "Monitoring Visits", view: "servicom-visits", path: "/zonal/monitoring-visits" },
      ]},
      { type: "group", label: "Accreditation & Reaccreditation", children: [
        { title: "Accreditation / Reaccreditation", view: "state-accreditation", path: "/zonal/accreditation" },
      ]},
      { type: "group", label: "Stakeholder Engagement", children: [
        { title: "Stakeholder Engagement", view: "state-stakeholder", path: "/zonal/stakeholder" },
      ]},
      { type: "group", label: "HMO Selection", children: [
        { title: "HMO Selection Process", view: "state-hmo-selection", path: "/zonal/hmo-selection" },
      ]},
      { type: "group", label: "Challenges & Recommendations", children: [
        { title: "Challenges & Recommendations", view: "state-challenges", path: "/zonal/challenges" },
      ]},
      { type: "group", label: "Finance", children: [
        { title: "IGR", view: "state-igr", path: "/zonal/igr" },
        { title: "SSHIA Financial Report", view: "state-sshia-financial", path: "/zonal/sshia-financial" },
        { title: "Expenditure Profile", view: "state-expenditure-profile", path: "/zonal/expenditure-profile" },
      ]},
      { type: "group", label: "Admin / HR", children: [
        { title: "State Office Meeting Report", view: "state-office-meeting", path: "/zonal/admin-hr/office-meeting" },
        { title: "ETMC Cascading Report", view: "state-etmc-cascading", path: "/zonal/admin-hr/etmc-cascading" },
        { title: "Office Accommodation", view: "state-office-accommodation", path: "/zonal/admin-hr/office-accommodation" },
        { title: "Utility Services", view: "state-utility-services", path: "/zonal/admin-hr/utility-services" },
        { title: "Vehicle Maintenance", view: "state-vehicle-maintenance", path: "/zonal/admin-hr/vehicle-maintenance" },
        { title: "Conflict / Infraction Report", view: "state-conflict-infraction", path: "/zonal/admin-hr/conflict-infraction" },
        { title: "Enrollee Feedback Survey", view: "state-enrollee-feedback", path: "/zonal/admin-hr/enrollee-feedback" },
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