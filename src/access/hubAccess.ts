import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import type { AccessUser } from "./types";
import { expandAccessEntries, findEntry, userAccessEntries } from "./accessUtils";
import {
  type HubPrivilegeConfig,
  type HubTabPrivilege,
  canonicalHubTabTitle,
} from "./hubPrivilegeConfig";

function accessUserFromAuth(user: AccessUser | null | undefined): AccessUser | null {
  if (!user) return null;
  const entries = userAccessEntries(user);
  return {
    role: user.role,
    access: expandAccessEntries(entries),
    functionalities: entries,
  };
}

function functionalityList(user: AccessUser | null | undefined, moduleTitle: string): string[] {
  if (!user) return [];
  if (user.role === "admin") return ["*"];
  const entry = findEntry(user, moduleTitle);
  return Array.isArray(entry?.functionalities) ? entry!.functionalities : [];
}

/** True if stored privileges include this tab (or hub-wide grant). */
export function canAccessHubTab(
  user: AccessUser | null | undefined,
  hub: HubPrivilegeConfig,
  tabKey: string,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const resolved = accessUserFromAuth(user) ?? user;
  const funcs = functionalityList(resolved, hub.moduleTitle);
  const canonical = funcs
    .map((f) => canonicalHubTabTitle(f, hub))
    .filter(Boolean) as string[];

  // Hub title alone (no explicit tabs) → all tabs
  const hasHub = canonical.includes(hub.hubTitle);
  const tabTitles = new Set(
    canonical.filter((t) => t !== hub.hubTitle),
  );
  if (hasHub && tabTitles.size === 0) return true;

  const tab = hub.tabs.find((t) => t.key === tabKey);
  if (!tab) return false;
  return tabTitles.has(tab.privilegeTitle);
}

export function getAllowedHubTabs<K extends string>(
  user: AccessUser | null | undefined,
  hub: HubPrivilegeConfig<K>,
): HubTabPrivilege<K>[] {
  if (!user) return [];
  if (user.role === "admin") return hub.tabs;
  return hub.tabs.filter((t) => canAccessHubTab(user, hub, t.key));
}

export function useAllowedHubTabs<K extends string>(hub: HubPrivilegeConfig<K>) {
  const authUser = useSelector((s: RootState) => s.auth.user) as AccessUser | null;
  const allowedTabs = useMemo(
    () => getAllowedHubTabs(accessUserFromAuth(authUser), hub),
    [authUser, hub],
  );
  const allowedKeys = useMemo(() => new Set(allowedTabs.map((t) => t.key)), [allowedTabs]);

  return {
    user: authUser,
    allowedTabs,
    allowedKeys,
    canAccessTab: (key: K) => allowedKeys.has(key),
    defaultTab: allowedTabs[0]?.key ?? null,
    hideTabStrip: allowedTabs.length <= 1,
  };
}
