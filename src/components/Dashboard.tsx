import * as React from "react";
import {
  Home, FileText, CheckSquare, Compass, Database, Archive, Shield,
  Bell, Settings, LogOut, ChevronRight, TrendingUp,
  Clock, AlertCircle, Plus, Filter, Download, BarChart3,
  Map as MapIcon, Flag, History, Users, Activity, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from "recharts";

import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import ReportEntry from "./ReportEntry";
import ReportPreview from "./ReportPreview";
import ZonalReview from "./ZonalReview";
import ZonalCompose from "./ZonalCompose";
import DGCEOPanel from "./DGCEOPanel";
import SDOPerformance from "./SDOPerformance";
import AnnualReportForm from "./AnnualReportForm";
import AnnualReportsList from "./AnnualReportsList";
import AnnualReportDetail from "./AnnualReportDetail";
import StockVerificationsList from "./StockVerificationsList";
import StockAssetManager from "./StockAssetManager";
import StateOfficeReportsList from "./stateOffice/StateOfficeReportsList";
import StateOfficeComplaintsPage from "./stateOffice/StateOfficeComplaintsPage";
import StateOfficeComplianceVisitsPage from "./stateOffice/StateOfficeComplianceVisitsPage";
import StateOfficeReconciliationPage from "./stateOffice/StateOfficeReconciliationPage";
import ServicomDashboard from "./servicom/ServicomDashboard";
import ServicomVisitsPage from "./servicom/ServicomVisitsPage";
import ServicomComplaintsPage from "./servicom/ServicomComplaintsPage";
import ServicomSatisfactionSurveyPage from "./servicom/ServicomSatisfactionSurveyPage";
import ServicomCommentCardPage from "./servicom/ServicomCommentCardPage";
import StockVerificationDashboard from "./stock/StockVerificationDashboard";
import SocZonesDashboard from "./stateOffice/SocZonesDashboard";
import StateZonalOfficeProfilePage from "./stateOffice/StateZonalOfficeProfilePage";
import StateZonalFocalPersonsPage from "./stateOffice/StateZonalFocalPersonsPage";
import SocPlaceholderPage from "./stateOffice/SocPlaceholderPage";
import FinanceMonthlyForm from "./monthly/FinanceMonthlyForm";
import AdminMonthlyForm from "./monthly/AdminMonthlyForm";
import ProgrammesMonthlyForm from "./monthly/ProgrammesMonthlyForm";
import OutreachMonthlyForm from "./monthly/OutreachMonthlyForm";
import SqaMonthlyForm from "./monthly/SqaMonthlyForm";
import ComplaintsMonthlyForm from "./monthly/ComplaintsMonthlyForm";
import ComplianceManagementPage from "./compliance/ComplianceManagementPage";
import DirectorEnforcementDashboard, { isDirectorEnforcementUser } from "./enforcement/DirectorEnforcementDashboard";
import MonthlyReportsList from "./monthly/MonthlyReportsList";
import DeptMonthlyPage from "./monthly/DeptMonthlyPage";
// SidebarNav logic is now inside AppSidebar.tsx
import AdminSettingsPage from "./admin/AdminSettingsPage";
import AdminDashboard from "./admin/AdminDashboard";
import StateCoordinatorPanel from "./StateCoordinatorPanel";
import ZonalDirectorDashboard from "./ZonalDirectorDashboard";
import StateOfficeDashboard from "./StateOfficeDashboard";
import DepartmentalDashboard from "./DepartmentalDashboard";
import ReportReviewPage from "./ReportReviewPage";
import NotificationsPage from "./NotificationsPage";
import DashboardView from "../modules/store_management/pages/DashboardView";
import CategoriesView from "../modules/store_management/pages/CategoriesView";
import AssetListView from "../modules/store_management/pages/AssetListView";
import AssetRegisterView from "../modules/store_management/pages/AssetRegisterView";
import AssetDetailView from "../modules/store_management/pages/assets/AssetDetailView";
import QrLabelsView from "../modules/store_management/pages/assets/QrLabelsView";
import InventoryItemsView from "../modules/store_management/pages/InventoryItemsView";
import InventoryItemDetailView from "../modules/store_management/pages/InventoryItemDetailView";
import GoodsReceiptView from "../modules/store_management/pages/GoodsReceiptView";
import StockIssuesView from "../modules/store_management/pages/StockIssuesView";
import NewStockIssueView from "../modules/store_management/pages/stores/NewStockIssueView";
import StoreListView from "../modules/store_management/pages/StoreListView";
import StockReturnsView from "../modules/store_management/pages/StockReturnsView";
import AssetTransfersView from "../modules/store_management/pages/AssetTransfersView";
import NewTransferView from "../modules/store_management/pages/transfers/NewTransferView";
import SupplyVerificationView from "../modules/store_management/pages/SupplyVerificationView";
import NewSupplyVerificationView from "../modules/store_management/pages/verification/NewSupplyVerificationView";
import SupplyVerificationDetailView from "../modules/store_management/pages/verification/SupplyVerificationDetailView";
import VerificationView from "../modules/store_management/pages/verification/VerificationView";
import VerifyAssetView from "../modules/store_management/pages/verification/VerifyAssetView";
import PhysicalAssetVerificationDetailView from "../modules/store_management/pages/verification/PhysicalAssetVerificationDetailView";
import VerificationCertificateView from "../modules/store_management/pages/verification/VerificationCertificateView";
import ExceptionsView from "../modules/store_management/pages/verification/ExceptionsView";
import MaintenanceView from "../modules/store_management/pages/MaintenanceView";
import AssetDisposalView from "../modules/store_management/pages/AssetDisposalView";
import AssetReportsView from "../modules/store_management/pages/AssetReportsView";
import UserManagementView from "../modules/store_management/pages/admin/UserManagementView";
import OfficesView from "../modules/store_management/pages/admin/OfficesView";
import AuditView from "../modules/store_management/pages/admin/AuditView";
import AdjustmentsView from "../modules/store_management/pages/AdjustmentsView";
import AssetConversionView from "../modules/store_management/pages/AssetConversionView";
import NewCapitalisationView from "../modules/store_management/pages/NewCapitalisationView";
import MovementLedgerView from "../modules/store_management/pages/MovementLedgerView";
import { getMonthlyReportContext } from "@/src/access/monthlyReportAccess";
import { canAccessFunctionality, expandAccessEntries } from "@/src/access/accessUtils";
import { VIEW_MODULE_ACCESS } from "@/src/access/moduleConfig";

// ─── Types ────────────────────────────────────────────────────────────────────
import AppSidebar from "./AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

type Role = "state-officer" | "zonal-coordinator" | "state-coordinator" | "department-officer" | "sdo" | "hq-department" | "audit" | "dg-ceo" | "admin";
type View = "home" | "report-entry" | "report-preview" | "zonal-review" | "zonal-compose" | "annual-report" | "annual-reports-list" | "annual-report-detail" | "settings" | "stock-verifications-list" | "stock-assets" | "servicom-dashboard" | "servicom-visits" | "servicom-complaints" | "servicom-satisfaction" | "servicom-comment-card" | "finance-monthly" | "admin-monthly" | "programmes-monthly" | "outreach-monthly" | "sqa-monthly" | "sqa-compliance" | "complaints-monthly" | "monthly-reports-list" | "report-review" | "notifications" | "soc-zones-dashboard" | "soc-office-profile" | "soc-focal-persons" | "soc-operation-monitoring-visit" | "soc-spot-check-visit" | "state-enrolment" | "state-migration" | "state-cemonc" | "state-complaints" | "state-compliance-monitoring" | "state-reconciliation" | "state-accreditation" | "state-stakeholder" | "state-hmo-selection" | "state-challenges" | "state-igr" | "state-sshia-financial" | "state-expenditure-profile" | "state-weekly-actionable" | "state-contracted-services" | "store-assets-list" | "store-assets-register" | "store-inventory-catalog" | "store-goods-receipt" | "store-stock-issues" | "store-directory" | "store-stock-returns" | "store-asset-transfers" | "store-supply-verification" | "store-asset-maintenance" | "store-asset-disposal" | "store-asset-reports";
interface DashboardProps { role: Role; user?: import("@/src/store/authSlice").AuthUser; access?: import("@/src/access/types").AccessEntry[]; functionalities?: string; onLogout: () => void; }

// ─── Mock data ────────────────────────────────────────────────────────────────
const CHART_DATA = [
  { name: "Jan", reports: 42, approved: 38 },
  { name: "Feb", reports: 35, approved: 30 },
  { name: "Mar", reports: 58, approved: 52 },
  { name: "Apr", reports: 74, approved: 68 },
  { name: "May", reports: 51, approved: 47 },
  { name: "Jun", reports: 89, approved: 82 },
];

const ZONE_DATA = [
  { zone: "South West", compliance: 98, reports: 18, color: "#25a872" },
  { zone: "North West", compliance: 95, reports: 19, color: "#25a872" },
  { zone: "North Central", compliance: 92, reports: 14, color: "#3b82f6" },
  { zone: "North East", compliance: 88, reports: 10, color: "#f59e0b" },
  { zone: "South East", compliance: 75, reports: 9,  color: "#ef4444" },
  { zone: "Lagos Zone", compliance: 96, reports: 5,  color: "#25a872" },
];

const RECENT_ACTIVITY = [
  { id: 1, action: "Report Submitted",  user: "SO · Lagos",    time: "2 hrs ago",  status: "Pending",   type: "report"    },
  { id: 2, action: "Directive Created", user: "HQ Admin",      time: "4 hrs ago",  status: "Active",    type: "directive" },
  { id: 3, action: "Report Approved",   user: "Zonal Director",time: "1 day ago",  status: "Completed", type: "approved"  },
  { id: 4, action: "Audit Flagged",     user: "Audit Team",    time: "2 days ago", status: "Flagged",   type: "audit"     },
];

const activityDot: Record<string, string> = {
  report: "bg-blue-500", directive: "bg-amber-500",
  approved: "bg-emerald-500", audit: "bg-rose-500",
};

// ─── Sidebar nav items per role ───────────────────────────────────────────────
function getMenuItems(role: Role, view: View, setView: (v: View) => void) {
  const all = [
    { icon: <Home className="w-4 h-4" />,       label: "Dashboard",         active: view === "home",                 onClick: () => setView("home"),                 roles: "all"          },
    { icon: <Flag className="w-4 h-4" />,        label: "Directives",        active: false,                           onClick: undefined,                             roles: "dg-ceo,admin" },
    { icon: <FileText className="w-4 h-4" />,    label: "National Reports",  active: false,                           onClick: undefined,                             roles: "dg-ceo,admin" },
    { icon: <MapIcon className="w-4 h-4" />,     label: "Zonal Performance", active: false,                           onClick: undefined,                             roles: "dg-ceo,admin" },
    { icon: <FileText className="w-4 h-4" />,    label: "Submit Report",     active: view === "report-entry",         onClick: () => setView("report-entry"),         roles: "!dg-ceo"      },
    { icon: <FileText className="w-4 h-4" />,    label: "Annual Report",     active: view === "annual-report",        onClick: () => setView("annual-report"),        roles: "!dg-ceo"      },
    { icon: <History className="w-4 h-4" />,     label: "My Submissions",    active: view === "annual-reports-list",  onClick: () => setView("annual-reports-list"),  roles: "!dg-ceo"      },
    { icon: <CheckSquare className="w-4 h-4" />, label: "Review Reports",    active: view === "zonal-review",         onClick: () => setView("zonal-review"),         roles: "!dg-ceo"      },
    { icon: <Compass className="w-4 h-4" />,     label: "Directives",        active: false,                           onClick: undefined,                             roles: "!dg-ceo"      },
    { icon: <Database className="w-4 h-4" />,    label: "HQ Data",           active: false,                           onClick: undefined,                             roles: "all"          },
    { icon: <Shield className="w-4 h-4" />,      label: "Audit & Compliance",active: false,                           onClick: undefined,                             roles: "dg-ceo,audit,admin" },
    { icon: <Archive className="w-4 h-4" />,     label: "Archive",           active: false,                           onClick: undefined,                             roles: "all"          },
    { icon: <Bell className="w-4 h-4" />,        label: "Notifications",     active: false,                           onClick: undefined,                             roles: "all"          },
    { icon: <Settings className="w-4 h-4" />,    label: "Settings",          active: view === "settings",             onClick: () => setView("settings"),             roles: "admin"        },
    { icon: <Settings className="w-4 h-4" />,    label: "Settings",          active: false,                           onClick: undefined,                             roles: "!admin"       },
  ];
  return all.filter(item => {
    if (item.roles === "all") return true;
    if (item.roles === "!dg-ceo") return role !== "dg-ceo";
    if (item.roles === "!admin")  return role !== "admin";
    return item.roles.split(",").includes(role);
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ title, value, trend, trendUp, icon, tint, sub }: {
  title: string; value: string; trend: string; trendUp?: boolean;
  icon: React.ReactNode; tint: string; sub?: string;
}) {
  return (
    <div className={`${tint} rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
          trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}>
          <TrendingUp className={`w-3 h-3 ${!trendUp ? "rotate-180" : ""}`} />
          {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-1">{title}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Role panels ─────────────────────────────────────────────────────────────
function StateOfficerPanel({ onNewReport, onAnnualReport, onViewSubmissions }: { onNewReport: () => void; onAnnualReport: () => void; onViewSubmissions: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Plus className="w-5 h-5" />,      title: "Submit New Report",   desc: "Start a fresh monthly submission",    action: onNewReport,       primary: true  },
          { icon: <BarChart3 className="w-5 h-5" />, title: "Annual State Report", desc: "Submit the annual data form",         action: onAnnualReport,    primary: false },
          { icon: <FileText className="w-5 h-5" />,  title: "My Submissions",      desc: "View all your submitted reports",     action: onViewSubmissions, primary: false },
        ].map(c => (
          <button key={c.title} onClick={c.action}
            className={`flex flex-col items-start p-5 rounded-2xl border text-left group transition-all hover:shadow-md ${
              c.primary ? "bg-[#145c3f] text-white border-[#0f3d2e]" : "bg-white border-[#d4e8dc] hover:border-[#25a872]"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
              c.primary ? "bg-white/20" : "bg-[#e8f5ee] text-[#145c3f]"
            }`}>
              {c.icon}
            </div>
            <p className={`text-sm font-bold ${c.primary ? "text-white" : "text-slate-800"}`}>{c.title}</p>
            <p className={`text-xs mt-0.5 ${c.primary ? "text-white/70" : "text-slate-500"}`}>{c.desc}</p>
          </button>
        ))}
      </div>
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-800">Assigned Directives</CardTitle>
          <CardDescription>Tasks from HQ / Zonal office</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold text-slate-600">Directive</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Deadline</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow className="hover:bg-[#f0fdf7] transition-colors">
                <TableCell className="text-sm font-medium">Q1 Enrollment Data Verification</TableCell>
                <TableCell className="text-sm text-slate-500">Oct 25, 2025</TableCell>
                <TableCell><Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Pending</Badge></TableCell>
              </TableRow>
              <TableRow className="hover:bg-[#f0fdf7] transition-colors">
                <TableCell className="text-sm font-medium">Monthly Financial Reconciliation</TableCell>
                <TableCell className="text-sm text-slate-500">Oct 30, 2025</TableCell>
                <TableCell><Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Submitted</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ZonalDirectorPanel({ onReviewReports }: { onReviewReports: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <CheckSquare className="w-5 h-5" />, title: "Review Reports", desc: "Validate state submissions", action: onReviewReports, primary: true },
          { icon: <Compass className="w-5 h-5" />, title: "Issue Directive", desc: "Send instructions to states", action: undefined, primary: false },
          { icon: <BarChart3 className="w-5 h-5" />, title: "Zonal Analytics", desc: "View performance trends", action: undefined, primary: false },
        ].map(c => (
          <button key={c.title} onClick={c.action}
            className={`flex flex-col items-start p-5 rounded-2xl border text-left group transition-all hover:shadow-md ${
              c.primary ? "bg-[#145c3f] text-white border-[#0f3d2e]" : "bg-white border-[#d4e8dc] hover:border-[#25a872]"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
              c.primary ? "bg-white/20" : "bg-[#e8f5ee] text-[#145c3f]"
            }`}>{c.icon}</div>
            <p className={`text-sm font-bold ${c.primary ? "text-white" : "text-slate-800"}`}>{c.title}</p>
            <p className={`text-xs mt-0.5 ${c.primary ? "text-white/70" : "text-slate-500"}`}>{c.desc}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">State Reporting Compliance</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                <Bar dataKey="reports"  fill="#d1f5e4" radius={[6,6,0,0]} />
                <Bar dataKey="approved" fill="#25a872" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Zonal Commentary</CardTitle>
            <CardDescription className="text-xs">Oversight notes for HQ</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea className="w-full h-[160px] p-3 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] resize-none text-sm focus:ring-2 focus:ring-[#25a872] outline-none transition-all placeholder:text-slate-400"
              placeholder="Enter zonal performance summary..." />
            <Button className="mt-3 bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl text-sm h-9">Submit Commentary</Button>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">State Reports Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Report Type</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {["Lagos", "Ogun", "Oyo"].map(state => (
                <TableRow key={state} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell className="text-sm font-semibold">{state}</TableCell>
                  <TableCell className="text-sm text-slate-600">Monthly Operations</TableCell>
                  <TableCell className="text-sm text-slate-500">Oct 12, 2025</TableCell>
                  <TableCell><Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Pending Review</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]">Review</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HQPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Departmental Data Analysis</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-[#d4e8dc] hover:bg-[#e8f5ee]">
            <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-[#d4e8dc] hover:bg-[#e8f5ee]">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </Button>
        </div>
      </div>
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold text-slate-600">Zone</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Metric</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600">Value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[1,2,3,4,5].map(i => (
                <TableRow key={i} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell className="text-sm">South West</TableCell>
                  <TableCell className="text-sm">Lagos</TableCell>
                  <TableCell className="text-sm text-slate-600">Claims Processed</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">1,240,000</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="kpi-blue rounded-2xl p-5 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Critical Flags</span>
          </div>
          <p className="text-3xl font-black text-slate-900">12</p>
          <p className="text-xs text-slate-500 mt-1">Inconsistencies in last 24h</p>
        </div>
        <div className="kpi-amber rounded-2xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
              <Flag className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Verification</span>
          </div>
          <p className="text-3xl font-black text-slate-900">45</p>
          <p className="text-xs text-slate-500 mt-1">Reports requiring manual audit</p>
        </div>
      </div>
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">Audit Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold text-slate-600">Report ID</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Submitted By</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Flags</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow className="hover:bg-[#f0fdf7] transition-colors">
                <TableCell className="font-mono text-xs font-bold text-[#145c3f]">REP-2025-001</TableCell>
                <TableCell className="text-sm">Kano State</TableCell>
                <TableCell><Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">Flagged</Badge></TableCell>
                <TableCell className="text-xs text-rose-600 font-medium">Stock Mismatch</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ role, user, access = [], functionalities = "", onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [view, setView] = React.useState<View>(role === "admin" ? "home" : "home");
  // Sidebar state is now managed by shadcn SidebarProvider
  const [selectedReportRef, setSelectedReportRef] = React.useState<string | null>(null);
  const monthlyCtx = getMonthlyReportContext(role, user);

  React.useEffect(() => {
    if (role === "admin") return;

    const viewAccess = VIEW_MODULE_ACCESS[view];
    if (!viewAccess) return;

    const expanded = expandAccessEntries(access);
    const allowed = canAccessFunctionality(
      viewAccess.module,
      viewAccess.functionality,
      { role, access: expanded },
    );
    if (!allowed) setView("home");
  }, [view, role, access]);

  return (
    <SidebarProvider>
      <AppSidebar
        role={role}
        user={user}
        access={access}
        view={view}
        setView={(v) => setView(v as View)}
        onLogout={onLogout}
      />

      {/* ── Main area ── */}
      <SidebarInset className="flex flex-col overflow-hidden bg-[#f4f7f5]">

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Watermark */}
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0">
            <img src="/logo.png" alt="" aria-hidden className="w-[50vw] max-w-xl opacity-[0.03] select-none" />
          </div>

          <Routes>
            {/* ── Home / Main Dashboard Overview ── */}
            <Route path="/" element={
              <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
                {role !== "sdo" && role !== "zonal-coordinator" && role !== "state-officer" && role !== "state-coordinator" && role !== "department-officer" && role !== "admin" && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard title="Reports Submitted" value="124" trend="+12%" trendUp icon={<FileText className="w-5 h-5 text-blue-600" />} tint="kpi-blue" sub="This month" />
                    <KPICard title="Pending Review"    value="18"  trend="-5%"  icon={<Clock className="w-5 h-5 text-amber-600" />}  tint="kpi-amber" sub="Awaiting action" />
                    <KPICard title="Open Directives"   value="06"  trend="+2"   trendUp icon={<Compass className="w-5 h-5 text-[#145c3f]" />} tint="kpi-green" sub="Active tasks" />
                    <KPICard title="Compliance Rate"   value="98.2%" trend="+0.4%" trendUp icon={<CheckSquare className="w-5 h-5 text-purple-600" />} tint="kpi-purple" sub="National average" />
                  </div>
                )}

                {role === "sdo" ? (
                  <SDOPerformance />
                ) : role === "zonal-coordinator" ? (
                  <ZonalDirectorDashboard user={user} zoneName={user?.zone?.description ?? "South West"} onReviewReports={() => setView("zonal-review")} />
                ) : role === "state-officer" ? (
                  <StateOfficeDashboard user={user} role="state-officer" stateName={user?.state?.description ?? "Lagos"} zoneName={user?.zone?.description ?? "South West"} onNewReport={() => setView("report-entry")} onAnnualReport={() => setView("annual-report")} onViewSubmissions={() => setView("annual-reports-list")} onNewSubmission={(targetView) => setView(targetView as View)} />
                ) : role === "state-coordinator" ? (
                  <StateOfficeDashboard user={user} role="state-coordinator" stateName={user?.state?.description ?? "Lagos"} zoneName={user?.zone?.description ?? "South West"} onNewReport={() => setView("report-entry")} onAnnualReport={() => setView("annual-report")} onViewSubmissions={() => setView("annual-reports-list")} onNewSubmission={(targetView) => setView(targetView as View)} />
                ) : isDirectorEnforcementUser(user) ? (
                  <DirectorEnforcementDashboard
                    onNavigate={(path) => {
                      navigate(path);
                      if (path.includes("compliance")) setView("sqa-compliance");
                      else if (path.includes("complaints")) setView("servicom-complaints");
                    }}
                  />
                ) : role === "department-officer" ? (
                  <DepartmentalDashboard user={user} onNewSubmission={(targetView) => setView(targetView as View)} />
                ) : role === "admin" ? (
                  <AdminDashboard onNavigate={() => setView("settings")} />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-800">Reports by Zone</CardTitle>
                            <CardDescription className="text-xs">Submitted vs Approved — 2025</CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={CHART_DATA} barSize={14} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8f5ee" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#5a7a6a" }} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4e8dc", fontSize: 12 }} />
                              <Bar dataKey="reports"  fill="#d1f5e4" radius={[6,6,0,0]} />
                              <Bar dataKey="approved" fill="#25a872" radius={[6,6,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            } />

            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* ── Annual Reports ── */}
            <Route path="/annual-reports/mine" element={<AnnualReportsList onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId ?? (user?.zone_id ? String(user.zone_id) : null)} defaultStateId={monthlyCtx.defaultStateId} reportScope={(user?.role_config?.report_scope as "national" | "zonal" | "state" | "none") ?? "national"} />} />
            <Route path="/annual-reports/submit" element={<ReportEntry onBack={() => setView("home")} onPreview={() => setView("report-preview")} />} />
            <Route path="/annual-reports/review" element={<ZonalReview onCompose={() => setView("zonal-compose")} />} />
            <Route path="/annual-reports/detail/:id" element={<AnnualReportDetail referenceId={selectedReportRef || "1"} onBack={() => setView("annual-reports-list")} />} />

            {/* ── SDO Module ── */}
            <Route path="/sdo/stock-verification" element={<StockVerificationsList onBack={() => setView("home")} />} />
            <Route path="/sdo/stock-dashboard" element={<StockVerificationDashboard onBack={() => setView("home")} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} />} />
            <Route path="/sdo/assets" element={<StockAssetManager onBack={() => setView("home")} />} />
            <Route path="/sdo/servicom" element={<ServicomDashboard onBack={() => setView("home")} defaultStateId={monthlyCtx.defaultStateId} defaultZoneId={monthlyCtx.defaultZoneId} />} />
            <Route path="/sdo/servicom/visits" element={<ServicomVisitsPage onBack={() => setView("home")} defaultStateId={monthlyCtx.defaultStateId} defaultZoneId={monthlyCtx.defaultZoneId} />} />
            <Route path="/sdo/servicom/complaints" element={<ServicomComplaintsPage onBack={() => setView("home")} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} userName={user?.name} userStaffId={user?.staff_id} userRole={user?.role} />} />
            <Route path="/sdo/servicom/satisfaction" element={<ServicomSatisfactionSurveyPage onBack={() => setView("home")} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateName={user?.state?.description} defaultZoneName={user?.zone?.description} userName={user?.name} />} />
            <Route path="/sdo/servicom/comment-card" element={<ServicomCommentCardPage onBack={() => setView("home")} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateName={user?.state?.description} defaultZoneName={user?.zone?.description} />} />
            <Route path="/sdo/projects" element={<SocPlaceholderPage title="SPECIAL PROJECT" onBack={() => setView("home")} />} />

            {/* ── Monthly Reports ── */}
            <Route path="/monthly/finance" element={<DeptMonthlyPage dept="finance" title="Finance Monthly Reports" section="finance" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={FinanceMonthlyForm} />} />
            <Route path="/monthly/admin" element={<DeptMonthlyPage dept="finance" title="Admin / HR Monthly Reports" section="admin" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={AdminMonthlyForm} />} />
            <Route path="/monthly/programmes" element={<DeptMonthlyPage dept="programmes" title="Enrolment Monthly Reports" section="enrolment" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={ProgrammesMonthlyForm} />} />
            <Route path="/monthly/outreach" element={<DeptMonthlyPage dept="programmes" title="Outreach Monthly Reports" section="outreach" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={OutreachMonthlyForm} />} />
            <Route path="/monthly/sqa" element={<DeptMonthlyPage dept="sqa" title="HMO/HCP Quality Assurance Monthly Reports" section="sqa" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={SqaMonthlyForm} />} />
            <Route path="/compliance" element={<ComplianceManagementPage onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} />} />
            <Route path="/enforcement/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/monthly/complaints" element={<DeptMonthlyPage dept="sqa" title="Enrollee Complaints Monthly Reports" section="complaints" onBack={() => setView("home")} defaultZoneId={monthlyCtx.defaultZoneId} defaultStateId={monthlyCtx.defaultStateId} canCreate={monthlyCtx.canCreateMonthly} FormComponent={ComplaintsMonthlyForm} />} />

            {/* ── SOC / Zones ── */}
            <Route path="/soc/dashboard" element={<SocZonesDashboard onBack={() => setView("home")} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} />} />
            <Route path="/soc/office-profile" element={<StateZonalOfficeProfilePage onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/focal-persons" element={<StateZonalFocalPersonsPage onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/weekly-actionable" element={<StateOfficeReportsList key="state-weekly-actionable" reportType="weekly-actionable" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/contracted-services" element={<StateOfficeReportsList key="state-contracted-services" reportType="contracted-services" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/operation-monitoring-visit" element={<SocPlaceholderPage title="Operation Monitoring Visit" onBack={() => setView("home")} />} />
            <Route path="/soc/spot-check-visit" element={<SocPlaceholderPage title="Spot Check Visit" onBack={() => setView("home")} />} />
            <Route path="/soc/complaints" element={<StateOfficeComplaintsPage key="state-complaints" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/reconciliation" element={<StateOfficeReconciliationPage key="state-reconciliation" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/soc/compliance-monitoring" element={<Navigate to="/zonal/monitoring-visits" replace />} />

            {/* Legacy /soc and /others paths → Zonal */}
            <Route path="/soc/enrolment" element={<Navigate to="/zonal/enrolment" replace />} />
            <Route path="/soc/migration" element={<Navigate to="/zonal/migration" replace />} />
            <Route path="/soc/cemonc" element={<Navigate to="/zonal/cemonc" replace />} />
            <Route path="/soc/monitoring-visits" element={<Navigate to="/zonal/monitoring-visits" replace />} />
            <Route path="/soc/accreditation" element={<Navigate to="/zonal/accreditation" replace />} />
            <Route path="/soc/stakeholder" element={<Navigate to="/zonal/stakeholder" replace />} />
            <Route path="/soc/hmo-selection" element={<Navigate to="/zonal/hmo-selection" replace />} />
            <Route path="/soc/challenges" element={<Navigate to="/zonal/challenges" replace />} />
            <Route path="/soc/igr" element={<Navigate to="/zonal/igr" replace />} />
            <Route path="/soc/sshia-financial" element={<Navigate to="/zonal/sshia-financial" replace />} />
            <Route path="/soc/expenditure-profile" element={<Navigate to="/zonal/expenditure-profile" replace />} />
            <Route path="/others/enrolment" element={<Navigate to="/zonal/enrolment" replace />} />
            <Route path="/others/migration" element={<Navigate to="/zonal/migration" replace />} />
            <Route path="/others/cemonc" element={<Navigate to="/zonal/cemonc" replace />} />
            <Route path="/others/monitoring-visits" element={<Navigate to="/zonal/monitoring-visits" replace />} />
            <Route path="/others/accreditation" element={<Navigate to="/zonal/accreditation" replace />} />
            <Route path="/others/stakeholder" element={<Navigate to="/zonal/stakeholder" replace />} />
            <Route path="/others/hmo-selection" element={<Navigate to="/zonal/hmo-selection" replace />} />
            <Route path="/others/challenges" element={<Navigate to="/zonal/challenges" replace />} />
            <Route path="/others/igr" element={<Navigate to="/zonal/igr" replace />} />
            <Route path="/others/sshia-financial" element={<Navigate to="/zonal/sshia-financial" replace />} />
            <Route path="/others/expenditure-profile" element={<Navigate to="/zonal/expenditure-profile" replace />} />

            {/* ── Zonal (state office reports under SOC) ── */}
            <Route path="/zonal/enrolment" element={<StateOfficeReportsList key="state-enrolment" reportType="enrolment" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/migration" element={<StateOfficeReportsList key="state-migration" reportType="migration" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/cemonc" element={<StateOfficeReportsList key="state-cemonc" reportType="cemonc" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/monitoring-visits" element={<StateOfficeComplianceVisitsPage key="state-compliance-monitoring" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/accreditation" element={<StateOfficeReportsList key="state-accreditation" reportType="accreditation" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/stakeholder" element={<StateOfficeReportsList key="state-stakeholder" reportType="stakeholder" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/hmo-selection" element={<StateOfficeReportsList key="state-hmo-selection" reportType="hmo-selection" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/challenges" element={<StateOfficeReportsList key="state-challenges" reportType="challenges" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/igr" element={<StateOfficeReportsList reportType="igr" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/sshia-financial" element={<StateOfficeReportsList reportType="sshia-financial" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />
            <Route path="/zonal/expenditure-profile" element={<StateOfficeReportsList reportType="expenditure-profile" onBack={() => setView("home")} defaultZoneId={user?.zone_id ? String(user.zone_id) : monthlyCtx.defaultZoneId} defaultStateId={user?.state_id ? String(user.state_id) : monthlyCtx.defaultStateId} />} />

            {/* ── Store & Asset Management Module ── */}
            <Route path="/store-management" element={<DashboardView />} />
            <Route path="/store-management/assets/register" element={<AssetRegisterView />} />
            <Route path="/store-management/assets/list" element={<AssetListView />} />
            <Route path="/store-management/assets/detail/:id" element={<AssetDetailView />} />
            <Route path="/store-management/assets/detail/*" element={<AssetDetailView />} />
            <Route path="/store-management/assets/categories" element={<CategoriesView />} />
            <Route path="/store-management/assets/qr-labels" element={<QrLabelsView />} />
            <Route path="/store-management/inventory/items" element={<InventoryItemsView />} />
            <Route path="/store-management/inventory/items/:id" element={<InventoryItemDetailView />} />
            <Route path="/store-management/inventory/receipts" element={<GoodsReceiptView />} />
            <Route path="/store-management/stores/issues" element={<StockIssuesView />} />
            <Route path="/store-management/stores/issues/new" element={<NewStockIssueView />} />
            <Route path="/store-management/stores/list" element={<StoreListView />} />
            <Route path="/store-management/stores/returns" element={<StockReturnsView />} />
            <Route path="/store-management/transfers/requests" element={<StockIssuesView />} />
            <Route path="/store-management/transfers/new" element={<NewStockIssueView />} />
            <Route path="/transfers/requests" element={<StockIssuesView />} />
            <Route path="/transfers/new" element={<NewStockIssueView />} />
            <Route path="/store-management/verification/supply" element={<SupplyVerificationView />} />
            <Route path="/store-management/verification/supply/new" element={<NewSupplyVerificationView />} />
            <Route path="/store-management/verification/supply/:id" element={<SupplyVerificationDetailView />} />
            <Route path="/store-management/verification/verify" element={<VerificationView />} />
            <Route path="/store-management/verification/verify/new" element={<AssetRegisterView />} />
            <Route path="/store-management/verification/verify/asset/:assetId" element={<VerifyAssetView />} />
            <Route path="/store-management/verification/verify/:id" element={<PhysicalAssetVerificationDetailView />} />
            <Route path="/store-management/verification/certificates" element={<VerificationCertificateView />} />
            <Route path="/store-management/verification/exceptions" element={<ExceptionsView />} />
            <Route path="/store-management/maintenance/repairs" element={<MaintenanceView />} />
            <Route path="/store-management/disposal/records" element={<AssetDisposalView />} />
            <Route path="/store-management/reports/analytics" element={<AssetReportsView />} />
            <Route path="/store-management/admin/users" element={<UserManagementView />} />
            <Route path="/store-management/admin/offices" element={<OfficesView />} />
            <Route path="/store-management/admin/logs" element={<AuditView />} />
            <Route path="/store-management/adjustments" element={<AdjustmentsView />} />
            <Route path="/store-management/conversion" element={<AssetConversionView />} />
            <Route path="/store-management/conversion/new" element={<NewCapitalisationView />} />
            <Route path="/store-management/movement-ledger" element={<MovementLedgerView />} />

            {/* ── System Administration ── */}
            <Route path="/notifications" element={<NotificationsPage onBack={() => setView("home")} />} />
            <Route path="/settings" element={<AdminSettingsPage />} />
          </Routes>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
