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
  Wallet,
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
  UserPlus,
  Handshake,
  Stethoscope,
  Landmark,
  HeartPulse,
  ClipboardCheck,
  FolderKanban,
  Monitor,
  UserCog,
  Car,
  Zap,
  MessageSquare,
  Search,
  Scale,
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
  SidebarMenuSubItem,
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
  SDO_SOC_NAV_GROUP,
} from "@/src/access/moduleConfig";
import { hasModuleAccess } from "@/src/access/roles";
import { normalizeAllowedTitles, expandAccessEntries } from "@/src/access/accessUtils";
import { NhiaSidebarBrand } from "@/src/components/NhiaCrest";

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
  "SOC/Zones": MapPin,
  [SDO_SOC_NAV_GROUP]: Building,
  Zonal: MapPin,
  "State Offices": Building,
  Enrolment: UserPlus,
  "Beneficiary Management": Users,
  "Stakeholder Management": Handshake,
  "Stakeholder Engagement": Handshake,
  "Provider Management": Stethoscope,
  "Accreditation / Reaccreditation": Stethoscope,
  "Complaint / Compliance": Scale,
  "Internal Management": Landmark,
  Finance: Landmark,
  ICT: Monitor,
  "ICT Support": Monitor,
  "Admin / HR": UserCog,
  "Admin / Human Resource": UserCog,
  "State Office Meeting Report": Users,
  "ETMC Cascading Report": ClipboardCheck,
  "Office Accommodation": Building,
  "Utility Services": Zap,
  "Vehicle Maintenance": Car,
  "Conflict / Infraction Report": ShieldAlert,
  "Enrollee Feedback Survey": MessageSquare,
  Meetings: Users,
  "ETMC Cascading": ClipboardCheck,
  Accommodation: Building,
  Utilities: Zap,
  Vehicles: Car,
  "Staff Feedback": MessageSquare,
  Infractions: ShieldAlert,
  IGR: Landmark,
  "SSHIA Financial Report": Landmark,
  "Expenditure Profile": Receipt,
  "Challenges & Recommendations": AlertTriangle,
  "Additional / Extra Dependant": Users,
  "HMO Selection Process": HeartPulse,
  "Change of HCF": HeartPulse,
  "Migration / Update Requests": ArrowRightLeft,
  "CEmONC & FFP Beneficiaries": HeartPulse,
  "SOC/Zones Dashboard": Activity,
  "Monthly Enrollee Register": ClipboardList,
  "ETMC/TMC Action-Point Register": ClipboardCheck,
  "State/Zonal Office Profile": Building,
  "State/Zonal Focal Persons Register": Users,
  "Weekly Actionable": AlertTriangle,
  "Contracted Services": FileCheck,
  "Stock Assets": PackageSearch,
  "Store Management": Warehouse,
  "Asset Management (SVO)": Warehouse,
  SERVICOM: Megaphone,
  "SPECIAL PROJECT": FolderKanban,
  "Special Project": FolderKanban,
  "STATE OFFICE COORDINATION": Building,
  "Monitoring Visits": MapPin,
  "HMO Indebtedness Collation": Wallet,
  "Mystery Shopping": Search,
  "Operational Monitoring Visit": MapPin,
  "Operation Monitoring Visit": MapPin,
  "Spot Check Visit": MapPin,
  Complaints: Scale,
  "Complaints Management": Scale,
  "Customer Satisfaction Survey": TrendingUp,
  "HCF Customer Satisfaction Survey": TrendingUp,
  "Charter Performance": Megaphone,
  "Satisfaction Ratings": TrendingUp,
  "Comment Cards": Megaphone,
  "SERVICOM Dashboard": Activity,
  "Stock Verification Dashboard": Activity,
  Settings: Settings,
  "Monthly Report": FileText,
  "ICT Support Register": ClipboardList,
  "Ad-hoc / Special Assignment": FileSpreadsheet,
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
  "state-weekly-actionable": "/soc/weekly-actionable",
  "state-contracted-services": "/soc/contracted-services",
  "state-etmc-tmc-action-point": "/soc/etmc-tmc-action-point",
  "state-ict-support-register": "/zonal/ict/support",
  "state-adhoc-special-assignment": "/sdo/projects",
  "state-extra-dependant": "/zonal/beneficiary/extra-dependant",
  "state-hcf-change": "/zonal/beneficiary/hcf-change",
  "state-ict-support": "/zonal/ict/support",
  "state-office-meeting": "/zonal/admin-hr/office-meeting",
  "state-etmc-cascading": "/zonal/admin-hr/etmc-cascading",
  "state-office-accommodation": "/zonal/admin-hr/office-accommodation",
  "state-utility-services": "/zonal/admin-hr/utility-services",
  "state-vehicle-maintenance": "/zonal/admin-hr/vehicle-maintenance",
  "state-conflict-infraction": "/zonal/admin-hr/conflict-infraction",
  "state-enrollee-feedback": "/zonal/admin-hr/enrollee-feedback",
  "state-admin-meetings": "/zonal/admin-hr/office-meeting",
  "state-accommodation": "/zonal/admin-hr/office-accommodation",
  "state-utilities": "/zonal/admin-hr/utility-services",
  "state-vehicles": "/zonal/admin-hr/vehicle-maintenance",
  "state-staff-feedback": "/zonal/admin-hr/enrollee-feedback",
  "state-infractions": "/zonal/admin-hr/conflict-infraction",
  "servicom-visits": "/zonal/monitoring-visits",
  "state-hmo-indebtedness": "/zonal/hmo-indebtedness",
  "state-mystery-shopping": "/zonal/mystery-shopping",
  "servicom-complaints": "/sdo/servicom/complaints",
  "servicom-satisfaction": "/sdo/servicom/satisfaction",
  "servicom-comment-card": "/sdo/servicom/comment-card",
  "special-projects": "/sdo/projects",
  notifications: "/notifications",
  settings: "/settings",
};

type TreeNode =
  | { kind: "leaf"; title: string; navLabel?: string; view?: string; path?: string }
  | { kind: "folder"; title: string; children: TreeNode[] };

/**
 * Folders that must stay as dropdowns even with a single child.
 * Keep empty so a lone granted page (e.g. only Complaints) shows standalone
 * without its group label (SERVICOM, Stock Verification, etc.).
 */
const PRESERVE_FOLDER_TITLES = new Set<string>([]);

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
  socAllowed?: Set<string>,
  zonalAllowed?: Set<string>,
): TreeNode[] {
  const nodes: TreeNode[] = [];

  for (const child of children) {
    if (isSubGroup(child)) {
      let nested: TreeNode[];

      if (child.label === SDO_SOC_NAV_GROUP || child.label === "SOC/ZONES") {
        const hasSoc = socAllowed && socAllowed.size > 0;
        const hasZonal = zonalAllowed && zonalAllowed.size > 0;
        nested = [];

        if (hasSoc) {
          const socMod = MODULE_CONFIG.find((m) => m.title === SOC_ZONES_MODULE);
          nested.push(
            ...filterModuleTree(
              socMod?.children ?? [],
              socAllowed!,
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
              socAllowed,
              zonalAllowed,
            ),
          );
          if (zonalKids.length > 0) {
            nested.push({
              kind: "folder",
              title: "State Offices",
              children: zonalKids,
            });
          }
        }

        nested = collapseSingleChildFolders(nested);
      } else {
        nested = filterModuleTree(child.children, allowedTitles, socAllowed, zonalAllowed);
      }

      nested = collapseSingleChildFolders(nested);
      if (nested.length === 0) continue;

      // One item under this group → show that item only (no group dropdown)
      if (nested.length === 1 && !PRESERVE_FOLDER_TITLES.has(child.label)) {
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
      navLabel: child.navLabel,
      view: child.view,
      path: child.path,
    });
  }

  return nodes;
}

function buildVisibleTree(
  mod: (typeof MODULE_CONFIG)[0],
  allowedTitles: Set<string>,
  socAllowed?: Set<string>,
  zonalAllowed?: Set<string>,
): TreeNode | null {
  const children = collapseSingleChildFolders(
    filterModuleTree(
      mod.children,
      allowedTitles,
      mod.title === SDO_MODULE ? socAllowed : undefined,
      mod.title === SDO_MODULE ? zonalAllowed : undefined,
    )
  );
  if (children.length === 0) return null;

  if (mod.title === SOC_ZONES_MODULE) {
    return { kind: "folder", title: SDO_SOC_NAV_GROUP, children };
  }

  if (mod.title === ZONAL_MODULE) {
    return { kind: "folder", title: "State Offices", children };
  }

  // Only one navigable item → flat link, no parent dropdown
  if (children.length === 1 && !PRESERVE_FOLDER_TITLES.has(mod.title)) return children[0];

  return {
    kind: "folder",
    title: mod.title,
    children,
  };
}

function isSdoFolder(node: TreeNode): node is Extract<TreeNode, { kind: "folder" }> {
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

function getUserDepartmentLabel(
  user?: import("@/src/store/authSlice").AuthUser,
  role?: string,
): string | null {
  const dept = user?.department?.name?.trim();
  if (dept) return dept;

  if (role === "admin") return "NHIA Headquarters";

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
  const unit = user?.unit?.name?.trim() || null;
  if (!department && !unit) return null;

  return (
    <div className="mx-0 mt-2.5 rounded-xl bg-white/8 px-3 py-2 space-y-0.5 group-data-[collapsible=icon]:hidden">
      {department ? (
        <p className="text-[13px] font-semibold leading-snug text-white/95">
          {department}
        </p>
      ) : null}
      {unit ? (
        <p className="text-[13px] font-semibold leading-snug text-white/95">
          {unit}
        </p>
      ) : null}
    </div>
  );
}

function nodePath(node: Extract<TreeNode, { kind: "leaf" }>) {
  return node.path || VIEW_TO_PATH[node.view || ""] || "/";
}

function treeContainsPath(node: TreeNode, pathname: string): boolean {
  if (node.kind === "leaf") {
    const path = nodePath(node);
    return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
  }
  return node.children.some((child) => treeContainsPath(child, pathname));
}

function formatNavTitle(title: string) {
  const letters = title.replace(/[^A-Za-z]/g, "");
  if (letters.length > 3 && title === title.toUpperCase() && /\s/.test(title)) {
    return title.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }
  return title;
}

function displayName(node: TreeNode, role: string) {
  if (role === "sdo" && node.title === "Dashboard") return "SDO Dashboard";
  return formatNavTitle(node.title);
}

const navItemClass =
  "h-auto! min-h-8 items-start gap-2.5 overflow-visible py-1.5 pr-1.5 font-medium leading-snug whitespace-normal [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1 [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal [&>span:last-child]:text-pretty [&>span:last-child]:break-words [&>span:last-child]:leading-[1.35]";

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
  const containsActive = treeContainsPath(node, location.pathname);
  const [open, setOpen] = React.useState(containsActive);
  React.useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);
  const closeMobile = () => {
    if (isMobile) toggleSidebar();
  };

  if (node.kind === "leaf") {
    const path = nodePath(node);
    const isActive = location.pathname === path || currentView === node.view;
    const LeafIcon = ICON_MAP[node.title] || File;
    const label = displayName(node, role);
    const Wrapper = depth > 0 ? SidebarMenuSubItem : SidebarMenuItem;

    return (
      <Wrapper>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={label}
          className={`${navItemClass} ${depth > 0 ? "text-[12.5px] font-normal" : "text-[13px]"}`}
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
          <LeafIcon className="mt-[3px] size-4 shrink-0 opacity-80" />
          <span>{label}</span>
        </SidebarMenuButton>
      </Wrapper>
    );
  }

  const FolderIcon = ICON_MAP[node.title] || Folder;
  const folderLabel = displayName(node, role);
  const FolderWrap = depth > 0 ? SidebarMenuSubItem : SidebarMenuItem;

  return (
    <FolderWrap>
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={folderLabel} className={`${navItemClass} ${depth === 0 ? "text-[13px] font-semibold" : "text-[12.5px]"}`} />
          }
        >
          <FolderIcon className="mt-[3px] size-4 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1 text-left text-pretty">{folderLabel}</span>
          <ChevronRight
            className={`mt-[5px] ml-auto size-3.5 shrink-0 opacity-60 transition-transform duration-200 ${
              open ? "rotate-90" : "rotate-0"
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-2 mr-0 gap-0.5 overflow-visible border-white/10 py-1 pr-0.5">
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
    </FolderWrap>
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
    const socMod = modules.find(({ mod }) => mod.title === SOC_ZONES_MODULE);
    const zonalMod = modules.find(({ mod }) => mod.title === ZONAL_MODULE);
    const socAllowed = socMod?.allowedTitles;
    const zonalAllowed = zonalMod?.allowedTitles;

    const built = modules
      .filter(({ mod }) => {
        if (mod.title === "Notifications" || mod.title === "Settings") return false;
        // When SDO is shown, SOC/Zones and Zonal nest under State Office Coordination
        if (hasSdo && mod.title === SOC_ZONES_MODULE) return false;
        if (hasSdo && mod.title === ZONAL_MODULE) return false;
        return true;
      })
      .map(({ mod, allowedTitles }) =>
        buildVisibleTree(
          mod,
          allowedTitles,
          mod.title === SDO_MODULE ? socAllowed : undefined,
          mod.title === SDO_MODULE ? zonalAllowed : undefined,
        )
      )
      .filter(Boolean) as TreeNode[];

    return flattenSdoForNonAdmin(built, role);
  }, [modules, role]);

  const sections = React.useMemo(() => {
    const headingFor = (title: string) => {
      if (title === "State Offices") return "State Offices";
      return "";
    };
    const out: { heading: string; nodes: TreeNode[] }[] = [];
    const push = (heading: string, nodes: TreeNode[]) => {
      const last = out[out.length - 1];
      if (last && last.heading === heading) last.nodes.push(...nodes);
      else out.push({ heading, nodes: [...nodes] });
    };
    for (const node of trees) {
      const heading = headingFor(node.title);
      if (heading && node.kind === "folder" && node.title === heading) {
        push(heading, node.children);
        continue;
      }
      push(heading, [node]);
    }
    return out;
  }, [trees]);

  return (
    <>
      {sections.map((section, i) => (
        <SidebarGroup key={`${section.heading}-${i}`} className={i === 0 ? "pt-1" : "pt-0"}>
          {section.heading ? (
            <SidebarGroupLabel className="h-auto px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {section.heading}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.nodes.map((node, index) => (
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
      ))}
    </>
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
      <SidebarHeader className="gap-0 border-b border-white/10 p-0">
        <div className="px-3 pt-3.5 pb-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
          <NhiaSidebarBrand />
          <UserSidebarDepartment user={user} role={role} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain modules={visibleModules} currentView={view} setView={setView} role={role} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border gap-1 pt-2">
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
                tooltip="Staff Management"
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
                <span>Staff Management</span>
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
