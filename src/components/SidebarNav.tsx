import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Settings, Home, BarChart3, FileText,
  CheckSquare, Banknote, ShieldCheck, Wifi, LayoutGrid, Briefcase,
  Bell, Users, ClipboardList, PackageSearch, Search,
  FolderKanban, Radio, Wrench, MapPin, Scale, Megaphone, BookOpen,
  Activity, TrendingUp, Boxes, PlusCircle, ListFilter, ArrowRightLeft,
  Trash2, Receipt, Send, Warehouse, RotateCcw, PackageCheck, QrCode,
  FileCheck, AlertTriangle, FileSpreadsheet, Building, ShieldAlert, Wallet,
} from "lucide-react";
import type { AccessEntry } from "@/src/access/types";
import { MODULE_CONFIG, SOC_ZONES_MODULE, type ChildModule, type SubGroup, hasRoutableView, flatLeaves, moduleConfigForAccess, isSubGroup, modulesVisibleToAdmin, adminAllowedTitlesForModule } from "@/src/access/moduleConfig";
import { hasModuleAccess } from "@/src/access/roles";
import { normalizeAllowedTitles, normalizeModuleTitle, expandAccessEntries } from "@/src/access/accessUtils";

type View = string;

interface SidebarNavProps {
  role: string;
  access: AccessEntry[];
  view: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
}

// ─── Item specific icon map matching store_mng_nhia & NHIA ─────────────────────
const ALL_ITEM_ICONS: Record<string, React.ReactNode> = {
  // Store Management
  "Register Asset":          <PlusCircle className="w-4 h-4" />,
  "Asset Master Register":   <ListFilter className="w-4 h-4" />,
  "Transfers & Movements":   <ArrowRightLeft className="w-4 h-4" />,
  "Maintenance & Servicing": <Wrench className="w-4 h-4" />,
  "Board Disposal":          <Trash2 className="w-4 h-4" />,
  "Inventory Catalog":       <Boxes className="w-4 h-4" />,
  "Goods Receipt (GRN)":     <Receipt className="w-4 h-4" />,
  "Stock Issue":             <Send className="w-4 h-4" />,
  "Store Directory":         <Warehouse className="w-4 h-4" />,
  "Stock Returns":           <RotateCcw className="w-4 h-4" />,
  "Supply Pre-Verification": <PackageCheck className="w-4 h-4" />,
  "Physical Asset Verification": <QrCode className="w-4 h-4" />,
  "Verification Certificates": <FileCheck className="w-4 h-4" />,
  "Discrepancy Exceptions":   <AlertTriangle className="w-4 h-4" />,
  "Reports & Analytics":     <FileSpreadsheet className="w-4 h-4" />,
  "User Management":         <Users className="w-4 h-4" />,
  "Offices & Locations":     <Building className="w-4 h-4" />,
  "Audit Trail Logs":        <ShieldAlert className="w-4 h-4" />,

  // Core NHIA
  "Dashboard":               <Home className="w-4 h-4" />,
  "My Annual Reports":       <FileText className="w-4 h-4" />,
  "Submit New Report":       <PlusCircle className="w-4 h-4" />,
  "Zonal Review":            <CheckSquare className="w-4 h-4" />,
  "Stock Verification":      <ClipboardList className="w-4 h-4" />,
  "Stock Assets":            <PackageSearch className="w-4 h-4" />,
  "SERVICOM Dashboard":      <Activity className="w-4 h-4" />,
  "Monitoring Visits":       <MapPin className="w-4 h-4" />,
  "HMO Indebtedness Collation": <Wallet className="w-4 h-4" />,
  "Mystery Shopping":        <Search className="w-4 h-4" />,
  "Complaints":              <Scale className="w-4 h-4" />,
  "Satisfaction Ratings":    <TrendingUp className="w-4 h-4" />,
  "Comment Cards":           <Megaphone className="w-4 h-4" />,
  "Notifications":           <Bell className="w-4 h-4" />,
  "Settings":                <Settings className="w-4 h-4" />,
};

// ─── Path → view key map for known routed views ───────────────────────────────
const PATH_TO_VIEW: Record<string, string> = {
  "/":                            "home",
  "/dashboard":                   "home",
  "/annual-reports/mine":         "annual-reports-list",
  "/annual-reports/submit":       "report-entry",
  "/annual-reports/review":       "zonal-review",
  "/sdo/stock-verification":      "stock-verifications-list",
  "/sdo/assets":                  "stock-assets",
  "/sdo/servicom":                "servicom-dashboard",
  "/sdo/servicom/visits":         "servicom-visits",
  "/zonal/monitoring-visits":    "servicom-visits",
  "/zonal/hmo-indebtedness":     "state-hmo-indebtedness",
  "/zonal/mystery-shopping":     "state-mystery-shopping",
  "/soc/operation-monitoring-visit": "soc-operation-monitoring-visit",
  "/soc/spot-check-visit":        "soc-spot-check-visit",
  "/sdo/servicom/complaints":     "servicom-complaints",
  "/sdo/servicom/satisfaction":   "servicom-satisfaction",
  "/sdo/servicom/comment-card":   "servicom-comment-card",
  "/notifications":               "notifications",
  "/settings":                    "settings",
};

const VIEW_TO_PATH: Record<string, string> = Object.entries(PATH_TO_VIEW).reduce((acc, [path, view]) => {
  acc[view] = path;
  return acc;
}, {} as Record<string, string>);

function DepartmentChildren({ children, allowedTitles, currentView, setView, sidebarOpen, baseDepth }: {
  children: (ChildModule | SubGroup)[];
  allowedTitles: Set<string>;
  currentView: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  baseDepth: number;
}) {
  const visibleChildren = children.filter(c => {
    if (isSubGroup(c)) {
      return flatLeaves({ title: "", roles: "all", children: c.children }).some(t => allowedTitles.has(t));
    }
    return allowedTitles.has((c as ChildModule).title);
  });

  if (visibleChildren.length === 0) return null;

  return (
    <>
      {visibleChildren.map((child, i) => {
        if (isSubGroup(child)) {
          return (
            <NavSubGroup key={i} group={child} allowedTitles={allowedTitles}
              currentView={currentView} setView={setView} sidebarOpen={sidebarOpen} baseDepth={baseDepth} />
          );
        }
        const leaf = child as ChildModule;
        return (
          <NavLeaf key={i} title={leaf.title} nodeView={leaf.view} nodePath={leaf.path}
            currentView={currentView} setView={setView} depth={baseDepth} sidebarOpen={sidebarOpen} />
        );
      })}
    </>
  );
}

// ─── Leaf link ────────────────────────────────────────────────────────────────
function NavLeaf({ title, nodeView, nodePath, currentView, setView, depth, sidebarOpen }: {
  title: string; nodeView?: string; nodePath?: string; currentView: View;
  setView: (v: View) => void; depth: number; sidebarOpen: boolean;
}) {
  const location = useLocation();
  const targetPath = nodePath || (nodeView ? VIEW_TO_PATH[nodeView] || "/" : "/");
  const active = location.pathname === targetPath || (!!nodeView && currentView === nodeView);
  const itemIcon = ALL_ITEM_ICONS[title];

  return (
    <Link
      to={targetPath}
      onClick={() => nodeView && setView(nodeView)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
        active
          ? "bg-[#25a872] text-white shadow-md shadow-[#25a872]/30"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      } ${!targetPath ? "opacity-60 cursor-default" : "cursor-pointer"}`}
    >
      {itemIcon ? (
        <span className={`shrink-0 ${active ? "text-white" : "text-white/60 group-hover:text-white"}`}>
          {itemIcon}
        </span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          active ? "bg-white" : "bg-white/40 group-hover:bg-white/70"
        }`} />
      )}
      {sidebarOpen && <span className="truncate flex-1">{title}</span>}
      {sidebarOpen && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70 shrink-0" />}
    </Link>
  );
}

// ─── Sub-group (e.g. "Asset Management", "Store / Inventory", "Finance", etc.) ───
function NavSubGroup({ group, allowedTitles, currentView, setView, sidebarOpen, baseDepth = 1 }: {
  group: SubGroup; allowedTitles: Set<string>;
  currentView: View; setView: (v: View) => void; sidebarOpen: boolean;
  baseDepth?: number;
}) {
  const visibleChildren = group.children.filter((c): c is ChildModule => !isSubGroup(c) && allowedTitles.has(c.title));
  if (visibleChildren.length === 0) return null;

  const childDepth = baseDepth + 1;

  if (visibleChildren.length === 1 && visibleChildren[0].view) {
    return (
      <NavLeaf
        title={group.label}
        nodeView={visibleChildren[0].view}
        nodePath={visibleChildren[0].path}
        currentView={currentView}
        setView={setView}
        depth={baseDepth}
        sidebarOpen={sidebarOpen}
      />
    );
  }

  const location = useLocation();
  const hasActive = visibleChildren.some(c => (c.path && location.pathname === c.path) || (c.view && currentView === c.view));
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  return (
    <div className="space-y-1 my-1">
      <button
        onClick={() => sidebarOpen && setOpen((o: boolean) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors"
      >
        <span className="truncate">{group.label}</span>
        {sidebarOpen && (
          <ChevronRight className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      {sidebarOpen && open && (
        <div className="space-y-0.5 pl-1.5 border-l border-white/10 ml-2">
          {visibleChildren.map((child, i) => (
            <NavLeaf key={i} title={child.title} nodeView={child.view} nodePath={child.path}
              currentView={currentView} setView={setView} depth={childDepth} sidebarOpen={sidebarOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top-level module group (Shadcn Collapsible Style) ────────────────────────
function ModuleGroup({ title, children, allowedTitles, currentView, setView, sidebarOpen, isOpen, onToggle }: {
  title: string;
  children: (ChildModule | SubGroup)[];
  allowedTitles: Set<string>;
  currentView: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const visibleChildren = children.filter(c => {
    if (isSubGroup(c)) {
      return flatLeaves({ title: "", roles: "all", children: c.children }).some(t => allowedTitles.has(t));
    }
    return allowedTitles.has((c as ChildModule).title);
  });

  if (visibleChildren.length === 0) return null;

  return (
    <div className="space-y-1 my-2">
      <button
        onClick={() => sidebarOpen && onToggle()}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
      >
        <span className="truncate text-[11px] font-bold">{title}</span>
        {sidebarOpen && (
          <ChevronRight className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
        )}
      </button>

      {sidebarOpen && isOpen && (
        <div className="space-y-0.5 pl-1 border-l border-white/10 ml-3 mt-1">
          <DepartmentChildren
            children={children}
            allowedTitles={allowedTitles}
            currentView={currentView}
            setView={setView}
            sidebarOpen={sidebarOpen}
            baseDepth={1}
          />
        </div>
      )}
    </div>
  );
}

// ─── Notifications leaf ───────────────────────────────────────────────────────
function NotificationsLeaf({ view, setView, sidebarOpen }: {
  view: View; setView: (v: View) => void; sidebarOpen: boolean;
}) {
  const location = useLocation();
  const active = location.pathname === "/notifications" || view === "notifications";
  return (
    <Link to="/notifications" onClick={() => setView("notifications")}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
        active
          ? "bg-[#25a872] text-white shadow-md shadow-[#25a872]/30"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`shrink-0 ${active ? "text-white" : "text-white/60 group-hover:text-white"}`}>
        <Bell className="w-4 h-4" />
      </span>
      {sidebarOpen && <span className="truncate flex-1">Notifications</span>}
      {sidebarOpen && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70 shrink-0" />}
    </Link>
  );
}

// ─── Settings leaf ────────────────────────────────────────────────────────────
function SettingsLeaf({ view, setView, sidebarOpen }: {
  view: View; setView: (v: View) => void; sidebarOpen: boolean;
}) {
  const location = useLocation();
  const active = location.pathname === "/settings" || view === "settings";
  return (
    <Link to="/settings" onClick={() => setView("settings")}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
        active
          ? "bg-[#25a872] text-white shadow-md shadow-[#25a872]/30"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`shrink-0 ${active ? "text-white" : "text-white/60 group-hover:text-white"}`}>
        <Settings className="w-4 h-4" />
      </span>
      {sidebarOpen && <span className="truncate flex-1">Settings</span>}
      {sidebarOpen && active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70 shrink-0" />}
    </Link>
  );
}

// ─── Main SidebarNav ──────────────────────────────────────────────────────────
export default function SidebarNav({ role, access, view, setView, sidebarOpen }: SidebarNavProps) {
  const [openModule, setOpenModule] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (String(view).startsWith("state-")) setOpenModule(SOC_ZONES_MODULE);
  }, [view]);

  const toggle = (title: string) =>
    setOpenModule((prev: string | null) => prev === title ? null : title);

  // Build visible modules from user's access array
  const visibleModules = React.useMemo(() => {
    if (role === "admin") {
      return modulesVisibleToAdmin()
        .map(mod => ({
          mod,
          allowedTitles: adminAllowedTitlesForModule(mod),
        }))
        .filter(({ allowedTitles }) => allowedTitles.size > 0);
    }

    const effectiveAccess = expandAccessEntries(access);
    const result = effectiveAccess
      .map(entry => {
        const mod = moduleConfigForAccess(entry.access_to);
        if (!mod) return null;

        const funcs = Array.isArray(entry.functionalities) ? entry.functionalities : [];
        const allowedTitles = funcs.length > 0
          ? normalizeAllowedTitles(funcs, mod.title)
          : new Set(flatLeaves(mod));

        return { mod, allowedTitles };
      })
      .filter(Boolean) as { mod: typeof MODULE_CONFIG[0]; allowedTitles: Set<string> }[];

    return result;
  }, [role, access]);

  const showSettings = hasModuleAccess(access, "Settings", role);

  return (
    <nav className="space-y-3">
      {visibleModules.length === 0 && role !== "admin" && sidebarOpen && (
        <p className="text-[10px] text-white/40 px-3 py-2 italic">No modules assigned</p>
      )}

      {visibleModules.map(({ mod, allowedTitles }, i) => {
        if (mod.title === "Notifications" || mod.title === "Settings") return null;
        if (!hasRoutableView(mod)) return null;

        return (
          <ModuleGroup
            key={i}
            title={mod.title}
            children={mod.children}
            allowedTitles={allowedTitles}
            currentView={view}
            setView={setView}
            sidebarOpen={sidebarOpen}
            isOpen={openModule === null || openModule === mod.title}
            onToggle={() => toggle(mod.title)}
          />
        );
      })}

      <div className="pt-2 border-t border-white/10 space-y-1">
        <NotificationsLeaf view={view} setView={setView} sidebarOpen={sidebarOpen} />
        {showSettings && <SettingsLeaf view={view} setView={setView} sidebarOpen={sidebarOpen} />}
      </div>
    </nav>
  );
}
