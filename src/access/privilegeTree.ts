/**
 * Privilege UI tree — mirrors AppSidebar hierarchy while preserving
 * storage keys (`access_to` = MODULE_CONFIG parent title).
 */
import {
  MODULE_CONFIG,
  SDO_MODULE,
  SOC_ZONES_MODULE,
  ZONAL_MODULE,
  SDO_SOC_NAV_GROUP,
  flatLeaves,
  isSubGroup,
  type ChildModule,
  type ParentModule,
  type SubGroup,
} from "./moduleConfig";

export type PrivilegeLeafNode = {
  kind: "leaf";
  title: string;
  navLabel?: string;
  /** MODULE_CONFIG parent title written to functionalities[].access_to */
  accessTo: string;
  /** Extra parents to auto-grant when this leaf is checked (e.g. SDO when nesting SOC) */
  alsoGrant?: string[];
};

export type PrivilegeFolderNode = {
  kind: "folder";
  label: string;
  /** When set, folder checkbox toggles this storage parent + all descendant leaves */
  accessTo?: string;
  alsoGrant?: string[];
  children: PrivilegeNode[];
};

export type PrivilegeNode = PrivilegeLeafNode | PrivilegeFolderNode;

export type PrivilegeSection = {
  heading?: string;
  nodes: PrivilegeNode[];
};

function convertChildren(
  nodes: (ChildModule | SubGroup)[],
  accessTo: string,
  alsoGrant?: string[],
): PrivilegeNode[] {
  const out: PrivilegeNode[] = [];
  for (const c of nodes) {
    if (isSubGroup(c)) {
      out.push({
        kind: "folder",
        label: c.label,
        accessTo,
        alsoGrant,
        children: convertChildren(c.children, accessTo, alsoGrant),
      });
    } else {
      out.push({
        kind: "leaf",
        title: c.title,
        navLabel: c.navLabel,
        accessTo,
        alsoGrant,
      });
    }
  }
  return out;
}

function moduleFolder(mod: ParentModule, label?: string): PrivilegeFolderNode {
  return {
    kind: "folder",
    label: label ?? mod.title,
    accessTo: mod.title,
    children: convertChildren(mod.children, mod.title),
  };
}

function findMod(title: string): ParentModule {
  const mod = MODULE_CONFIG.find((m) => m.title === title);
  if (!mod) throw new Error(`Missing MODULE_CONFIG entry: ${title}`);
  return mod;
}

/** Hidden from privilege assignment UI for now (still in MODULE_CONFIG / sidebar for other roles). */
export const PRIVILEGE_UI_HIDDEN_MODULES = [
  "Finance & Admin Dept",
  "Zonal ICT Support",
  "Programmes",
] as const;

function isPrivilegeUiHidden(title: string): boolean {
  return (PRIVILEGE_UI_HIDDEN_MODULES as readonly string[]).includes(title);
}

/** Sidebar-aligned privilege sections for admin user/privileges UI */
export function buildPrivilegeSections(): PrivilegeSection[] {
  const sdo = findMod(SDO_MODULE);
  const soc = findMod(SOC_ZONES_MODULE);
  const zonal = findMod(ZONAL_MODULE);

  // Promote SDO’s four main groups to top-level cards (less nesting)
  const sdoTopCards: PrivilegeNode[] = [];
  for (const c of sdo.children) {
    if (isSubGroup(c) && c.label === SDO_SOC_NAV_GROUP) {
      sdoTopCards.push({
        kind: "folder",
        label: SDO_SOC_NAV_GROUP,
        alsoGrant: [SDO_MODULE],
        children: [
          {
            kind: "folder",
            label: "SOC/Zones",
            accessTo: SOC_ZONES_MODULE,
            alsoGrant: [SDO_MODULE],
            children: convertChildren(soc.children, SOC_ZONES_MODULE, [SDO_MODULE]),
          },
          {
            kind: "folder",
            label: "State Offices",
            accessTo: ZONAL_MODULE,
            alsoGrant: [SDO_MODULE],
            children: convertChildren(zonal.children, ZONAL_MODULE, [SDO_MODULE]),
          },
        ],
      });
      continue;
    }
    if (isSubGroup(c)) {
      sdoTopCards.push({
        kind: "folder",
        label: c.label,
        accessTo: SDO_MODULE,
        alsoGrant: [SDO_MODULE],
        children: convertChildren(c.children, SDO_MODULE, [SDO_MODULE]),
      });
    } else {
      sdoTopCards.push({
        kind: "leaf",
        title: c.title,
        navLabel: c.navLabel,
        accessTo: SDO_MODULE,
        alsoGrant: [SDO_MODULE],
      });
    }
  }

  return [
    {
      nodes: [
        moduleFolder(findMod("Dashboard")),
        moduleFolder(findMod("Annual Reports")),
      ],
    },
    {
      heading: "Headquarters",
      nodes: [
        // moduleFolder(findMod("Finance & Admin Dept")),
        moduleFolder(findMod("Standards & Quality Assurance")),
        // moduleFolder(findMod("Zonal ICT Support")),
        // moduleFolder(findMod("Programmes")),
      ],
    },
    {
      heading: "SDO Portal",
      // Four main SDO groups as their own cards (not nested under one SDO parent)
      nodes: sdoTopCards,
    },
    {
      nodes: [
        moduleFolder(findMod("Notifications")),
        moduleFolder(findMod("Settings")),
      ],
    },
  ];
}

/** Collect every leaf under a privilege node */
export function privilegeLeafTitles(node: PrivilegeNode): string[] {
  if (node.kind === "leaf") return [node.title];
  return node.children.flatMap(privilegeLeafTitles);
}

/** All storage parents referenced under a node */
export function privilegeAccessTargets(node: PrivilegeNode): string[] {
  const set = new Set<string>();
  const walk = (n: PrivilegeNode) => {
    if (n.kind === "leaf") {
      set.add(n.accessTo);
      n.alsoGrant?.forEach((p) => set.add(p));
      return;
    }
    if (n.accessTo) set.add(n.accessTo);
    n.alsoGrant?.forEach((p) => set.add(p));
    n.children.forEach(walk);
  };
  walk(node);
  return [...set];
}

export type AccessEntry = { access_to: string; functionalities: string[] };

/** Build API payload from the granted title set (parents + leaf titles) */
export function buildAccessPayload(granted: Set<string>): AccessEntry[] {
  return MODULE_CONFIG
    .filter((mod) => granted.has(mod.title))
    .map((mod) => ({
      access_to: mod.title,
      functionalities: flatLeaves(mod).filter((t) => granted.has(t)),
    }));
}

export function countGrantedParents(granted: Set<string>): number {
  return MODULE_CONFIG.filter((m) => granted.has(m.title) && !isPrivilegeUiHidden(m.title)).length;
}

export function selectAllPrivilegeKeys(): Set<string> {
  const all = new Set<string>();
  MODULE_CONFIG.forEach((m) => {
    if (isPrivilegeUiHidden(m.title)) return;
    all.add(m.title);
    flatLeaves(m).forEach((t) => all.add(t));
  });
  return all;
}
