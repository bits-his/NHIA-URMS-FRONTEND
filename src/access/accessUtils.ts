import type { AccessEntry, AccessUser } from "./types";

import type { ParentModule, ChildModule } from "./moduleConfig";

import {

  MODULE_CONFIG,

  flatLeaves,

  isSubGroup,

  resolveModuleTitle,

  ZONAL_MODULE,

  SDO_MODULE,

  modulesVisibleToAdmin,

  adminVisibleChildrenForModule,

} from "./moduleConfig";

import {
  ENROLMENT_DRIVES_NAV_TITLE,
  ENROLMENT_DRIVE_TYPES,
} from "@/src/components/stateOffice/enrolmentDriveTypes";
import {
  BENEFICIARY_MANAGEMENT_NAV_TITLE,
  LEGACY_BENEFICIARY_TITLES,
} from "@/src/components/stateOffice/beneficiaryManagementTypes";
import {
  PROVIDER_MANAGEMENT_NAV_TITLE,
  PROVIDER_PILLAR_CHILDREN,
  STAKEHOLDER_MANAGEMENT_NAV_TITLE,
  STAKEHOLDER_PILLAR_CHILDREN,
} from "@/src/components/stateOffice/enrolmentPillarTypes";
import { HMO_INDEBTEDNESS_CHILDREN } from "@/src/components/stateOffice/hmoIndebtednessTypes";

const HMO_INDEBTEDNESS_TITLES = HMO_INDEBTEDNESS_CHILDREN.map((c) => c.title);
const HMO_INDEBTEDNESS_COLLATION = "HMO Indebtedness Collation";

/** Legacy per-activity privilege titles → single Enrolment Drives leaf */
const LEGACY_ENROLMENT_DRIVE_TITLES = new Set(
  ENROLMENT_DRIVE_TYPES.flatMap((t) => [t.title, t.navLabel]),
);

/** Legacy per-module privilege titles → single Stakeholder Management leaf */
const LEGACY_STAKEHOLDER_TITLES = new Set(
  STAKEHOLDER_PILLAR_CHILDREN.flatMap((c) => [c.title, c.navLabel]),
);

/** Legacy per-module privilege titles → single Provider Management leaf */
const LEGACY_PROVIDER_TITLES = new Set(
  PROVIDER_PILLAR_CHILDREN.flatMap((c) => [c.title, c.navLabel]),
);

/** Legacy beneficiary screens → single Beneficiary Management leaf */
const LEGACY_BENEFICIARY_TITLE_SET = new Set<string>(LEGACY_BENEFICIARY_TITLES);



/** Map retired module titles to current MODULE_CONFIG titles */

export function normalizeModuleTitle(title: string): string {

  return resolveModuleTitle(title);

}



export function findEntry(user: AccessUser, moduleTitle: string): AccessEntry | undefined {

  const normalized = resolveModuleTitle(moduleTitle);

  return (user.access ?? []).find(e => resolveModuleTitle(e.access_to) === normalized);

}



export function canAccessModule(mod: ParentModule, user: AccessUser): boolean {

  if (user.role === "admin") return true;

  const r = mod.roles;

  if (r !== "all") {

    if (r === "!dg-ceo" && user.role === "dg-ceo") return false;

    if (r !== "!dg-ceo" && !(r as string[]).includes(user.role)) return false;

  }

  return !!findEntry(user, mod.title);

}



/**

 * Map retired privilege labels to current moduleConfig leaf titles.

 * Legacy aliases are scoped by module where needed (e.g. SDO "Dashboard" → SERVICOM Dashboard).

 */

export function normalizeFunctionalityTitle(title: string, moduleTitle?: string): string {

  const mod = moduleTitle ? resolveModuleTitle(moduleTitle) : undefined;



  if (mod === "Dashboard") {

    if (title === "Overview" || title === "Statistics") return "Dashboard";

    return title;

  }



  if (mod === SDO_MODULE) {

    if (title === "Dashboard") return "SERVICOM Dashboard";

    if (title === "Stock Verification") return "Physical Asset Verification";

    if (title === "Special Projects" || title === "Special Project" || title === "SPECIAL PROJECT" || title === "Ad-hoc Project") {
      return "Ad-hoc / Special Assignment";
    }
  }



  if (mod === ZONAL_MODULE) {

    if (title === "Compliance Monitoring") return "Monitoring Visits";

    if (title === "Enrollee Complaints") return "Monitoring Visits";

    if (title === "Reconciliation Meetings") return "Contracted Services";

    if (title === "ICT Support" || title === "Support") return "ICT Support Register";

    if (LEGACY_ENROLMENT_DRIVE_TITLES.has(title)) return ENROLMENT_DRIVES_NAV_TITLE;

    if (LEGACY_STAKEHOLDER_TITLES.has(title)) return STAKEHOLDER_MANAGEMENT_NAV_TITLE;

    if (LEGACY_PROVIDER_TITLES.has(title)) return PROVIDER_MANAGEMENT_NAV_TITLE;

    if (LEGACY_BENEFICIARY_TITLE_SET.has(title)) return BENEFICIARY_MANAGEMENT_NAV_TITLE;

  }



  if (title === "My Submissions" || title === "New Annual Report") return "Annual Report";

  if (title === "Citizens' Comment Card") return "Charter Performance";

  if (title === "Customer Satisfaction Survey" || title === "HCF Customer Satisfaction Survey Survey") {
    return "HCF Customer Satisfaction Survey";
  }

  if (title === "Complaints") return "Complaints Management";

  if (title === "Complaints Register") return "Complaints Management";

  if (title === "Asset Register") return "Asset Master Register";

  if (title === "Prepayment Analysis Register" || title === "Prepayment Analysis") {
    return "Stock Prepayment Register";
  }



  // Legacy records without module context (admin UI reload, old DB rows)

  if (!mod) {

    if (title === "Overview" || title === "Statistics") return "Dashboard";

    if (title === "Special Projects" || title === "Special Project" || title === "SPECIAL PROJECT" || title === "Ad-hoc Project") {
      return "Ad-hoc / Special Assignment";
    }

    if (title === "ICT Support" || title === "Support") return "ICT Support Register";

    if (LEGACY_ENROLMENT_DRIVE_TITLES.has(title)) return ENROLMENT_DRIVES_NAV_TITLE;

    if (LEGACY_STAKEHOLDER_TITLES.has(title)) return STAKEHOLDER_MANAGEMENT_NAV_TITLE;

    if (LEGACY_PROVIDER_TITLES.has(title)) return PROVIDER_MANAGEMENT_NAV_TITLE;

    if (LEGACY_BENEFICIARY_TITLE_SET.has(title)) return BENEFICIARY_MANAGEMENT_NAV_TITLE;

  }



  return title;

}



export function normalizeAllowedTitles(functionalities: string[], moduleTitle?: string): Set<string> {

  return new Set(functionalities.map(f => normalizeFunctionalityTitle(f, moduleTitle)));

}



export function canAccessFunctionality(moduleTitle: string, functionalityTitle: string, user: AccessUser): boolean {

  if (user.role === "admin") return true;

  const entry = findEntry(user, moduleTitle);

  const normalized = normalizeFunctionalityTitle(functionalityTitle, moduleTitle);

  if (entry?.functionalities.some(f => normalizeFunctionalityTitle(f, moduleTitle) === normalized)) {

    return true;

  }



  // Legacy SDO privilege grants Monitoring Visits under Zonal

  if (resolveModuleTitle(moduleTitle) === ZONAL_MODULE && normalized === "Monitoring Visits") {

    const sdo = findEntry(user, SDO_MODULE);

    return !!sdo?.functionalities.some(

      f => normalizeFunctionalityTitle(f, SDO_MODULE) === "Monitoring Visits",

    );

  }

  return false;

}



/** Expand stored privileges for sidebar rendering (legacy SDO → Zonal bridges) */

export function expandAccessEntries(access: AccessEntry[]): AccessEntry[] {

  const out = [...(access ?? [])];

  const sdo = out.find(e => resolveModuleTitle(e.access_to) === SDO_MODULE);

  const hasLegacyVisits = sdo?.functionalities.some(

    f => normalizeFunctionalityTitle(f, SDO_MODULE) === "Monitoring Visits",

  );

  let zonalIdx = out.findIndex(e => resolveModuleTitle(e.access_to) === ZONAL_MODULE);

  if (hasLegacyVisits) {
    if (zonalIdx >= 0) {
      const funcs = out[zonalIdx].functionalities;
      if (!funcs.some(f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === "Monitoring Visits")) {
        out[zonalIdx] = { ...out[zonalIdx], functionalities: [...funcs, "Monitoring Visits"] };
      }
    } else {
      out.push({ access_to: ZONAL_MODULE, functionalities: ["Monitoring Visits"] });
      zonalIdx = out.length - 1;
    }
  }

  // Merge legacy per-activity Enrolment Drive / Stakeholder privileges into single leaves
  zonalIdx = out.findIndex(e => resolveModuleTitle(e.access_to) === ZONAL_MODULE);
  if (zonalIdx >= 0) {
    let funcs = out[zonalIdx].functionalities;
    const hasDrive = funcs.some(
      f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === ENROLMENT_DRIVES_NAV_TITLE,
    );
    if (hasDrive) {
      funcs = funcs.filter(
        f => !LEGACY_ENROLMENT_DRIVE_TITLES.has(f) && f !== ENROLMENT_DRIVES_NAV_TITLE,
      );
      funcs.push(ENROLMENT_DRIVES_NAV_TITLE);
    }
    const hasStakeholder = funcs.some(
      f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === STAKEHOLDER_MANAGEMENT_NAV_TITLE,
    );
    if (hasStakeholder) {
      funcs = funcs.filter(
        f => !LEGACY_STAKEHOLDER_TITLES.has(f) && f !== STAKEHOLDER_MANAGEMENT_NAV_TITLE,
      );
      funcs.push(STAKEHOLDER_MANAGEMENT_NAV_TITLE);
    }
    const hasProvider = funcs.some(
      f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === PROVIDER_MANAGEMENT_NAV_TITLE,
    );
    if (hasProvider) {
      funcs = funcs.filter(
        f => !LEGACY_PROVIDER_TITLES.has(f) && f !== PROVIDER_MANAGEMENT_NAV_TITLE,
      );
      funcs.push(PROVIDER_MANAGEMENT_NAV_TITLE);
    }
    const hasBeneficiary = funcs.some(
      f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === BENEFICIARY_MANAGEMENT_NAV_TITLE,
    );
    if (hasBeneficiary) {
      funcs = funcs.filter(
        f => !LEGACY_BENEFICIARY_TITLE_SET.has(f) && f !== BENEFICIARY_MANAGEMENT_NAV_TITLE,
      );
      funcs.push(BENEFICIARY_MANAGEMENT_NAV_TITLE);
    }
    // Legacy collation privilege unlocks all HMO Indebtedness submenu items
    const hasHmoCollation = funcs.some(
      f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === HMO_INDEBTEDNESS_COLLATION,
    );
    if (hasHmoCollation) {
      for (const title of HMO_INDEBTEDNESS_TITLES) {
        if (!funcs.some(f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === title)) {
          funcs.push(title);
        }
      }
    }
    out[zonalIdx] = { ...out[zonalIdx], functionalities: funcs };
  }

  return out;

}



export function filterSidebar(

  config: ParentModule[],

  user: AccessUser

): Array<ParentModule & { visibleChildren: ParentModule["children"] }> {

  if (user.role === "admin") {

    return modulesVisibleToAdmin()

      .map((mod) => ({

        ...mod,

        visibleChildren: adminVisibleChildrenForModule(mod),

      }))

      .filter((mod) => mod.visibleChildren.length > 0);

  }



  const result: Array<ParentModule & { visibleChildren: ParentModule["children"] }> = [];



  for (const entry of (user.access ?? [])) {

    const mod = config.find(m => m.title === resolveModuleTitle(entry.access_to));

    if (!mod) continue;



    const allowed = normalizeAllowedTitles(entry.functionalities, mod.title);



    const visibleChildren = mod.children.filter(c => {

      if (isSubGroup(c)) {

        return flatLeaves({ ...mod, children: c.children }).some((t) => allowed.has(t));

      }

      return allowed.has((c as ChildModule).title);

    });



    if (visibleChildren.length > 0) {

      result.push({ ...mod, visibleChildren });

    }

  }



  return result;

}

/** Dashboards are controlled by user access privileges (not a global kill-switch). */
export const DASHBOARDS_ENABLED = true;

/** Temporary kill-switch: hide Annual Reports module for all roles. */
export const ANNUAL_REPORTS_ENABLED = false;

/** Director role assigned to the Enforcement Department. */
export function isDirectorEnforcementUser(
  user: {
    role?: string | null;
    role_label?: string | null;
    department?: { name?: string | null; department_code?: string | null } | null;
  } | null | undefined,
): boolean {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase().trim();
  const roleLabel = String(user.role_label || "").toLowerCase().trim();
  const isDirector = role === "director" || roleLabel === "director";
  if (!isDirector) return false;

  const code = String(user.department?.department_code || "").toUpperCase().trim();
  const deptName = String(user.department?.name || "").toLowerCase().trim();
  return code === "ENF" || deptName.includes("enforcement");
}

export function isDashboardNavTitle(title: string | null | undefined): boolean {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return false;
  if (t === "dashboard" || t === "sdo dashboard") return true;
  return t.includes("dashboard");
}

export function isAnnualReportNavTitle(title: string | null | undefined): boolean {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return false;
  if (t === "annual reports" || t === "annual report") return true;
  if (t === "my annual reports" || t === "my submissions" || t === "new annual report") return true;
  return t.includes("annual report");
}

function isTemporarilyHiddenNavTitle(title: string | null | undefined): boolean {
  if (!ANNUAL_REPORTS_ENABLED && isAnnualReportNavTitle(title)) return true;
  return false;
}

/**
 * First navigable path the user may open (MODULE_CONFIG order).
 * Used after login and when `/` is opened without Dashboard access.
 */
export function getFirstAccessiblePath(
  access: AccessEntry[] | undefined,
  role?: string,
  _authUser?: Parameters<typeof isDirectorEnforcementUser>[0],
): string {
  if (role === "admin") return "/";

  const user: AccessUser = { role: role ?? "", access: access ?? [] };

  const walk = (
    modTitle: string,
    nodes: ParentModule["children"],
  ): string | null => {
    for (const c of nodes) {
      if (isSubGroup(c)) {
        const found = walk(modTitle, c.children);
        if (found) return found;
      } else if (
        c.path
        && !isTemporarilyHiddenNavTitle(c.title)
        && canAccessFunctionality(modTitle, c.title, user)
      ) {
        return c.path;
      }
    }
    return null;
  };

  for (const mod of MODULE_CONFIG) {
    if (mod.title === "Notifications" || mod.title === "Settings") continue;
    if (isTemporarilyHiddenNavTitle(mod.title)) continue;
    const path = walk(mod.title, mod.children);
    if (path) return path;
  }

  for (const title of ["Settings", "Notifications"] as const) {
    const mod = MODULE_CONFIG.find((m) => m.title === title);
    if (!mod) continue;
    const path = walk(mod.title, mod.children);
    if (path) return path;
  }

  return "/notifications";
}

/** True when the user may open the main `/` dashboard home. */
export function canAccessHomeDashboard(
  access: AccessEntry[] | undefined,
  role?: string,
  _authUser?: Parameters<typeof isDirectorEnforcementUser>[0],
): boolean {
  if (role === "admin") return true;
  return canAccessFunctionality("Dashboard", "Dashboard", {
    role: role ?? "",
    access: access ?? [],
  });
}

