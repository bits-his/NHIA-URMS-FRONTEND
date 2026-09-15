import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronRight,
  File,
  Folder,
  Settings,
  Home,
  FileText,
  CheckSquare,
  Bell,
  Users,
  ClipboardList,
  PackageSearch,
  Wrench,
  MapPin,
  Scale,
  Megaphone,
  Activity,
  TrendingUp,
  Boxes,
  PlusCircle,
  ListFilter,
  ArrowRightLeft,
  Trash2,
  Receipt,
  Send,
  Warehouse,
  RotateCcw,
  PackageCheck,
  QrCode,
  FileCheck,
  AlertTriangle,
  FileSpreadsheet,
  Building,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AccessEntry } from "@/src/access/types";
import {
  MODULE_CONFIG,
  type ChildModule,
  type SubGroup,
  flatLeaves,
  moduleConfigForAccess,
  isSubGroup,
  modulesVisibleToAdmin,
  adminAllowedTitlesForModule,
  SOC_ZONES_MODULE,
  ZONAL_MODULE,
  SDO_MODULE,
} from "@/src/access/moduleConfig";
import { hasModuleAccess } from "@/src/access/roles";
import { normalizeAllowedTitles, expandAccessEntries } from "@/src/access/accessUtils";

type View = string;

interface AppSidebarProps {
  role: string;
  user?: import("@/src/store/authSlice").AuthUser;
  access: AccessEntry[];
  view: View;
  setView: (v: View) => void;
  onLogout: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  "Register Asset": PlusCircle,
  "Asset Master Register": ListFilter,
  "Transfers & Movements": ArrowRightLeft,
  "Maintenance & Servicing": Wrench,
  "Board Disposal": Trash2,
  "Inventory Catalog": Boxes,
  "Goods Receipt (GRN)": Receipt,
  "Stock Issue": Send,
  "Store Directory": Warehouse,
  "Stock Returns": RotateCcw,
  "Supply Pre-Verification": PackageCheck,
  "Verification of Supply": PackageCheck,
  "Physical Asset Verification": QrCode,
  "Verification Certificates": FileCheck,
  "Discrepancy Exceptions": AlertTriangle,
  "Reports & Analytics": FileSpreadsheet,
  "User Management": Users,
  "Offices & Locations": Building,
  "Audit Trail Logs": ShieldAlert,
  Dashboard: Home,
  "My Annual Reports": FileText,
  "Submit New Report": PlusCircle,
  "Annual Report": FileText,
  "Zonal Review": CheckSquare,
  "Stock Verification": ClipboardList,
  "STOCK VERIFICATION": ClipboardList,
  "STOCK VERIFICATION (SVD)": ClipboardList,
  "SOC/ZONES": MapPin,
  Zonal: MapPin,
  "SOC/Zones Dashboard": Activity,
  "SOC/Zones Dashboard": Activity,
  "Monthly Enrollee Register": Users,
  "ETMC/TMC Action-Point Register": ClipboardList,
  "State/Zonal Office Profile": Building,
  "State/Zonal Focal Persons Register": Users,
  "Stock Assets": PackageSearch,
  "Store Management": Warehouse,
  "Asset Management (SVO)": Warehouse,
  SERVICOM: Megaphone,
  "SPECIAL PROJECT": FileSpreadsheet,
  "Special Project": FileSpreadsheet,
  "STATE OFFICE COORDINATION": Building,
  "State Offices": Building,
  "SERVICOM Dashboard": Activity,
  "Monitoring Visits": MapPin,
  "Operational Monitoring Visit": MapPin,
  "Operation Monitoring Visit": MapPin,
  "Spot Check Visit": MapPin,
  Complaints: Scale,
  "Complaints Management": Scale,
  "Customer Satisfaction Survey": TrendingUp,
  "HCF Customer Satisfaction": TrendingUp,
  "Charter Performance": Megaphone,
  "Satisfaction Ratings": TrendingUp,
  "Comment Cards": Megaphone,
  Notifications: Bell,
  Settings: Settings,
  "Monthly Report": FileText,
  "ICT Support Desk": ClipboardList,
  "Systems & Network": PackageSearch,
  "Compliance Management": ShieldAlert,
  SDO: ShieldAlert,
};

// ─── Path ↔ View maps ────────────────────────────────────────────────────────
const VIEW_TO_PATH: Record<string, string> = {
  home: "/",
  "annual-reports-list": "/annual-reports/mine",
  "report-entry": "/annual-reports/submit",
  "zonal-review": "/annual-reports/review",
  "stock-verifications-list": "/sdo/stock-verification",
  "stock-assets": "/sdo/assets",
  "servicom-dashboard": "/sdo/servicom",
  "stock-verification-dashboard": "/sdo/stock-dashboard",
  "soc-zones-dashboard": "/soc/dashboard",
  "soc-office-profile": "/soc/office-profile",
  "soc-focal-persons": "/soc/focal-persons",
  "soc-operation-monitoring-visit": "/soc/operation-monitoring-visit",
  "soc-spot-check-visit": "/soc/spot-check-visit",
  "state-enrollee-register": "/soc/enrollee-register",
  "state-etmc-tmc-action-point": "/soc/etmc-tmc-action-point",
  "servicom-visits": "/zonal/monitoring-visits",
  "servicom-complaints": "/sdo/servicom/complaints",
  "servicom-satisfaction": "/sdo/servicom/satisfaction",
  "servicom-comment-card": "/sdo/servicom/comment-card",
  "special-projects": "/sdo/projects",
  notifications: "/notifications",
  settings: "/settings",
};

type TreeNode =
  | { kind: "leaf"; title: string; view?: string; path?: string }
  | { kind: "folder"; title: string; children: TreeNode[] };

/** Folders that must stay as dropdowns even with a single child. */
const PRESERVE_FOLDER_TITLES = new Set(["Zonal", "State Offices", "SOC/ZONES"]);

/** If a folder has only one child, promote that child (no redundant dropdown). */
function collapseSingleChildFolders(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => {
    if (node.kind === "leaf") return node;

    const children = collapseSingleChildFolders(node.children);
    if (PRESERVE_FOLDER_TITLES.has(node.title)) {
      return { ...node, children };
    }
    if (children.length === 1) return children[0];
    return { ...node, children };
  });
}

function filterModuleTree(
  children: (ChildModule | SubGroup)[],
  allowedTitles: Set<string>,
  storeAllowed?: Set<string>,
  socAllowed?: Set<string>,
  zonalAllowed?: Set<string>,
): TreeNode[] {
  const nodes: TreeNode[] = [];

  for (const child of children) {
    if (isSubGroup(child)) {
      let nested: TreeNode[];

      if (child.label === "SOC/ZONES") {
        const hasSoc = socAllowed && socAllowed.size > 0;
        const hasZonal = zonalAllowed && zonalAllowed.size > 0;
        nested = [];

        if (hasSoc) {
          const socMod = MODULE_CONFIG.find((m) => m.title === SOC_ZONES_MODULE);
          nested.push(
            ...filterModuleTree(
              socMod?.children ?? [],
              socAllowed!,
              storeAllowed,
              socAllowed,
              zonalAllowed,
            ),
          );
        }

        if (hasZonal) {
          const zonalMod = MODULE_CONFIG.find((m) => m.title === ZONAL_MODULE);
          const zonalKids = collapseSingleChildFolders(
            filterModuleTree(
              zonalMod?.children ?? [],
              zonalAllowed!,
              storeAllowed,
              socAllowed,
              zonalAllowed,
            ),
          );
          if (zonalKids.length > 0) {
            nested.push({
              kind: "folder",
              title: "Zonal",
              children: [
                {
                  kind: "folder",
                  title: "State Offices",
                  children: zonalKids,
                },
              ],
            });
          }
        }

        nested = collapseSingleChildFolders(nested);
      } else {
        nested = filterModuleTree(child.children, allowedTitles, storeAllowed, socAllowed, zonalAllowed);

        // Nest store privileges under STOCK VERIFICATION (SVD) when granted
        if (
          (child.label === "STOCK VERIFICATION" || child.label === "STOCK VERIFICATION (SVD)") &&
          storeAllowed &&
          storeAllowed.size > 0
        ) {
          const assetMod = MODULE_CONFIG.find((m) => m.title === "Asset Management (SVO)");
          const storeKids = collapseSingleChildFolders(
            filterModuleTree(assetMod?.children ?? [], storeAllowed, storeAllowed, socAllowed, zonalAllowed),
          );
          if (storeKids.length > 0) {
            nested.push(...storeKids);
          }
        }
      }

      nested = collapseSingleChildFolders(nested);
      if (nested.length === 0) continue;

      // One item under this group → show that item only (no group dropdown)
      if (nested.length === 1) {
        nodes.push(nested[0]);
        continue;
      }

      nodes.push({
        kind: "folder",
        title: child.label,
        children: nested,
      });
      continue;
    }

    if (!child.view || !allowedTitles.has(child.title)) continue;

    nodes.push({
      kind: "leaf",
      title: child.title,
      view: child.view,
      path: child.path,
    });
  }

  return nodes;
}

function buildVisibleTree(
  mod: (typeof MODULE_CONFIG)[0],
  allowedTitles: Set<string>,
  storeAllowed?: Set<string>,
  socAllowed?: Set<string>,
  zonalAllowed?: Set<string>,
): TreeNode | null {
  const children = collapseSingleChildFolders(
    filterModuleTree(
      mod.children,
      allowedTitles,
      mod.title === SDO_MODULE ? storeAllowed : undefined,
      mod.title === SDO_MODULE ? socAllowed : undefined,
      mod.title === SDO_MODULE ? zonalAllowed : undefined,
    )
  );
  if (children.length === 0) return null;

  // Only one navigable item → flat link, no parent dropdown
  if (children.length === 1) return children[0];

  return {
    kind: "folder",
    title: mod.title,
    children,
  };
}

function isSdoFolder(node: TreeNode): boolean {
  return node.kind === "folder" && node.title === SDO_MODULE;
}

/** Non-admin users see SDO sections at top level (no SDO parent folder). */
function flattenSdoForNonAdmin(trees: TreeNode[], role: string): TreeNode[] {
  if (role === "admin") return trees;

  const out: TreeNode[] = [];
  for (const node of trees) {
    if (isSdoFolder(node)) {
      out.push(...node.children);
    } else {
      out.push(node);
    }
  }
  return out;
}

export function getUserDepartmentLabel(
  user?: import("@/src/store/authSlice").AuthUser,
  role?: string,
): string | null {
  const dept = user?.department?.name?.trim();
  if (dept) return dept;

  if (role === "admin") return "NHIA Headquarters";

  const state = user?.state?.description?.trim();
  const zone = user?.zone?.description?.trim();
  if (state) return `${state} State Office`;
  if (zone) return `${zone} Zone`;

  return user?.role_label || role?.replace(/-/g, " ") || null;
}

function UserSidebarDepartment({
  user,
  role,
}: {
  user?: import("@/src/store/authSlice").AuthUser;
  role?: string;
}) {
  const department = getUserDepartmentLabel(user, role);
  if (!department) return null;

  return (
    <div className="mx-1 mb-2 rounded-xl border-2 border-white/25 bg-[#145c3f] px-3 py-2.5 group-data-[collapsible=icon]:hidden">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
        Department
      </p>
      <p className="mt-1 text-sm font-extrabold leading-snug text-white">
        {department}
      </p>
    </div>
  );
}

const navItemClass =
  "h-auto! min-h-8 items-start whitespace-normal overflow-visible py-2 font-semibold [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-wrap [&>span:last-child]:leading-snug [&>span:last-child]:font-semibold";

function NavTreeItem({
  node,
  currentView,
  setView,
  role,
  depth = 0,
}: {
  node: TreeNode;
  currentView: View;
  setView: (v: View) => void;
  role: string;
  depth?: number;
}) {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  // Nested (and top-level) groups start closed — opening a parent never auto-opens children
  const [open, setOpen] = React.useState(false);
  const closeMobile = () => {
    if (isMobile) toggleSidebar();
  };

  if (node.kind === "leaf") {
    const path = node.path || VIEW_TO_PATH[node.view || ""] || "/";
    const isActive = location.pathname === path || currentView === node.view;
    const LeafIcon = ICON_MAP[node.title] || File;
    const label =
      role === "sdo" && node.title === "Dashboard" ? "SDO Dashboard" : node.title;

    return (
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        className={navItemClass}
        render={
          <NavLink
            to={path}
            onClick={() => {
              if (node.view) setView(node.view);
              closeMobile();
            }}
          />
        }
      >
        <LeafIcon className="mt-0.5" />
        <span>{label}</span>
      </SidebarMenuButton>
    );
  }

  const FolderIcon = ICON_MAP[node.title] || Folder;
  const folderLabel =
    role === "sdo" && node.title === "Dashboard" ? "SDO Dashboard" : node.title;

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={folderLabel} className={navItemClass} />
          }
        >
          <FolderIcon className="mt-0.5" />
          <span className="flex-1 text-left">{folderLabel}</span>
          <ChevronRight
            className={`mt-0.5 ml-auto shrink-0 transition-transform duration-200 ${
              open ? "rotate-90" : "rotate-0"
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-2 mr-0 gap-1 overflow-visible py-1 pr-0">
            {node.children.map((child, index) => (
              <NavTreeItem
                key={`${child.kind}-${child.title}-${index}`}
                node={child}
                currentView={currentView}
                setView={setView}
                role={role}
                depth={depth + 1}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function NavMain({
  modules,
  currentView,
  setView,
  role,
}: {
  modules: { mod: (typeof MODULE_CONFIG)[0]; allowedTitles: Set<string> }[];
  currentView: View;
  setView: (v: View) => void;
  role: string;
}) {
  const trees = React.useMemo(() => {
    const hasSdo = modules.some(({ mod }) => mod.title === SDO_MODULE);
    const storeMod = modules.find(({ mod }) => mod.title === "Asset Management (SVO)");
    const socMod = modules.find(({ mod }) => mod.title === SOC_ZONES_MODULE);
    const zonalMod = modules.find(({ mod }) => mod.title === ZONAL_MODULE);
    const storeAllowed = storeMod?.allowedTitles;
    const socAllowed = socMod?.allowedTitles;
    const zonalAllowed = zonalMod?.allowedTitles;

    const built = modules
      .filter(({ mod }) => {
        if (mod.title === "Notifications" || mod.title === "Settings") return false;
        // When SDO is shown, Asset Management (SVO) is nested under STOCK VERIFICATION (SVD)
        if (hasSdo && mod.title === "Asset Management (SVO)") return false;
        // When SDO is shown, SOC/Zones and Zonal are nested under SOC/ZONES
        if (hasSdo && mod.title === SOC_ZONES_MODULE) return false;
        if (hasSdo && mod.title === ZONAL_MODULE) return false;
        return true;
      })
      .map(({ mod, allowedTitles }) =>
        buildVisibleTree(
          mod,
          allowedTitles,
          mod.title === SDO_MODULE ? storeAllowed : undefined,
          mod.title === SDO_MODULE ? socAllowed : undefined,
          mod.title === SDO_MODULE ? zonalAllowed : undefined,
        )
      )
      .filter(Boolean) as TreeNode[];

    return flattenSdoForNonAdmin(built, role);
  }, [modules, role]);

  return (
    <SidebarGroup >
      {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {trees.map((node, index) => (
            <NavTreeItem
              key={`${node.kind}-${node.title}-${index}`}
              node={node}
              currentView={currentView}
              setView={setView}
              role={role}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function collectLeafTitles(children: (ChildModule | SubGroup)[]): string[] {
  const out: string[] = [];
  for (const c of children) {
    if (isSubGroup(c)) out.push(...collectLeafTitles(c.children));
    else out.push(c.title);
  }
  return out;
}

// ─── Main AppSidebar ──────────────────────────────────────────────────────────
export function AppSidebar({
  role,
  user,
  access,
  view,
  setView,
  onLogout,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const visibleModules = React.useMemo(() => {
    if (role === "admin") {
      return modulesVisibleToAdmin()
        .map((mod) => ({
          mod,
          allowedTitles: adminAllowedTitlesForModule(mod),
        }))
        .filter(({ allowedTitles }) => allowedTitles.size > 0);
    }

    const effectiveAccess = expandAccessEntries(access);
    const result = effectiveAccess
      .map((entry) => {
        const mod = moduleConfigForAccess(entry.access_to);
        if (!mod) return null;
        const funcs = Array.isArray(entry.functionalities)
          ? entry.functionalities
          : [];
        const allowedTitles =
          funcs.length > 0
            ? normalizeAllowedTitles(funcs, mod.title)
            : new Set(flatLeaves(mod));
        return { mod, allowedTitles };
      })
      .filter(Boolean) as {
      mod: (typeof MODULE_CONFIG)[0];
      allowedTitles: Set<string>;
    }[];

    return result;
  }, [role, access]);

  const showSettings = hasModuleAccess(access, "Settings", role);
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();

  const closeMobile = () => {
    if (isMobile) toggleSidebar();
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-2 pt-3 pb-3">
        <div className="flex h-12 items-center justify-center">
          <img
            src="/logo.png"
            alt="NHIA"
            className="h-10 w-auto object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain modules={visibleModules} currentView={view} setView={setView} role={role} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border gap-1 pt-2">
        <UserSidebarDepartment user={user} role={role} />

        <SidebarMenu>
          <SidebarMenuItem onClick={closeMobile}>
            <SidebarMenuButton
              tooltip="Notifications"
              isActive={
                location.pathname === "/notifications" ||
                view === "notifications"
              }
              render={
                <NavLink
                  to="/notifications"
                  onClick={() => setView("notifications")}
                />
              }
            >
              <Bell />
              <span>Notifications</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {showSettings && (
            <SidebarMenuItem onClick={closeMobile}>
              <SidebarMenuButton
                tooltip="Settings"
                isActive={
                  location.pathname === "/settings" || view === "settings"
                }
                render={
                  <NavLink
                    to="/settings"
                    onClick={() => setView("settings")}
                  />
                }
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={onLogout}
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
