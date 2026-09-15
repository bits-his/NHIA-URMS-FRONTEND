import type { AccessEntry, AccessUser } from "./types";

import type { ParentModule, ChildModule } from "./moduleConfig";

import {

  flatLeaves,

  isSubGroup,

  resolveModuleTitle,

  ZONAL_MODULE,

  SDO_MODULE,

  modulesVisibleToAdmin,

  adminVisibleChildrenForModule,

} from "./moduleConfig";



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

  }



  if (title === "My Submissions" || title === "New Annual Report") return "Annual Report";

  if (title === "Citizens' Comment Card") return "Charter Performance";

  if (title === "Customer Satisfaction Survey" || title === "HCF Customer Satisfaction Survey") {
    return "HCF Customer Satisfaction";
  }

  if (title === "Complaints") return "Complaints Management";

  if (title === "Complaints Register") return "Complaints Management";

  if (title === "Asset Register") return "Asset Master Register";



  // Legacy records without module context (admin UI reload, old DB rows)

  if (!mod) {

    if (title === "Overview" || title === "Statistics") return "Dashboard";

    if (title === "Special Projects" || title === "Special Project" || title === "SPECIAL PROJECT" || title === "Ad-hoc Project") {
      return "Ad-hoc / Special Assignment";
    }

    if (title === "ICT Support" || title === "Support") return "ICT Support Register";

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

  if (!hasLegacyVisits) return out;



  const zonalIdx = out.findIndex(e => resolveModuleTitle(e.access_to) === ZONAL_MODULE);

  if (zonalIdx >= 0) {

    const funcs = out[zonalIdx].functionalities;

    if (!funcs.some(f => normalizeFunctionalityTitle(f, ZONAL_MODULE) === "Monitoring Visits")) {

      out[zonalIdx] = { ...out[zonalIdx], functionalities: [...funcs, "Monitoring Visits"] };

    }

  } else {

    out.push({ access_to: ZONAL_MODULE, functionalities: ["Monitoring Visits"] });

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


