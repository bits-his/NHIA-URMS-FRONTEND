import * as React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { stockApi } from "@/lib/api";

interface DropdownOption { id: string | number; label: string; }

export function useStateOfficeHeader(
  defaultZoneId?: string | null,
  defaultStateId?: string | null,
  defaultReportYear?: string | number | null,
  defaultReportMonth?: string | number | null,
) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const userRole = (authUser?.role || "").toLowerCase();
  const isAdmin = ["admin", "sdo", "dg-ceo", "hq-department"].includes(userRole) || authUser?.role_config?.report_scope === "national";

  const resolvedZoneId = defaultZoneId || (!isAdmin ? (authUser?.zonal_code || authUser?.zone?.zonal_code || (authUser?.zone_id ? String(authUser.zone_id) : "")) : "");
  const resolvedStateId = defaultStateId || (!isAdmin ? (authUser?.state_code || authUser?.state?.code || (authUser?.state_id ? String(authUser.state_id) : "")) : "");

  const hydratingRef = React.useRef(false);
  const lockZone  = !!defaultZoneId || (!isAdmin && !!resolvedZoneId);
  const lockState = !!defaultStateId || (!isAdmin && !!resolvedStateId);

  const [zones,  setZones]  = React.useState<DropdownOption[]>([]);
  const [states, setStates] = React.useState<DropdownOption[]>([]);
  const [zoneId, setZoneId] = React.useState(resolvedZoneId ?? "");
  const [stateId, setStateId] = React.useState(resolvedStateId ?? "");
  const [reportYear, setReportYear] = React.useState(String(defaultReportYear || new Date().getFullYear()));
  const [reportMonth, setReportMonth] = React.useState(String(defaultReportMonth || new Date().getMonth() + 1));
  const [submitDate, setSubmitDate] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: any) => ({ id: z.id, label: z.description })))
    ).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (hydratingRef.current) return;
    if (!lockState) setStateId("");
    setStates([]);
    if (!zoneId) return;
    stockApi.getStates(zoneId).then(r => {
      const stateOpts = r.data.map((s: any) => ({ id: s.id, label: s.description }));
      setStates(stateOpts);
      if (lockState && resolvedStateId) setStateId(resolvedStateId);
      else if (resolvedStateId && r.data.some((s: any) => String(s.id) === resolvedStateId || String(s.code) === resolvedStateId)) {
        setStateId(resolvedStateId);
      }
    }).catch(() => {});
  }, [zoneId, lockState, resolvedStateId]);

  React.useEffect(() => { if (resolvedZoneId) setZoneId(resolvedZoneId); }, [resolvedZoneId]);
  React.useEffect(() => { if (resolvedStateId) setStateId(resolvedStateId); }, [resolvedStateId]);
  React.useEffect(() => {
    if (defaultReportYear != null && defaultReportYear !== "") setReportYear(String(defaultReportYear));
  }, [defaultReportYear]);
  React.useEffect(() => {
    if (defaultReportMonth != null && defaultReportMonth !== "") setReportMonth(String(defaultReportMonth));
  }, [defaultReportMonth]);

  const applyHeader = (data: any) => {
    hydratingRef.current = true;
    const zoneIdStr = String(data.zonal_code || data.zone_id || "");
    const stateIdStr = String(data.state_code || data.state_id || "");
    setZoneId(zoneIdStr);
    setStateId(stateIdStr);
    setReportYear(String(data.reporting_year));
    setReportMonth(String(data.reporting_month));
    setSubmitDate(data.submission_date ? String(data.submission_date).slice(0, 10) : "");
    stockApi.getStates(zoneIdStr).then(r => {
      setStates(r.data.map((s: any) => ({ id: s.id, label: s.description })));
      hydratingRef.current = false;
    }).catch(() => { hydratingRef.current = false; });
  };

  const resetHeader = () => {
    setZoneId(resolvedZoneId ?? "");
    setStateId(resolvedStateId ?? "");
    setReportYear(String(defaultReportYear || new Date().getFullYear()));
    setReportMonth(String(defaultReportMonth || new Date().getMonth() + 1));
    setSubmitDate(new Date().toISOString().slice(0, 10));
  };

  const headerPayload = (status: "draft" | "submitted" | "approved") => ({
    zone_id: zoneId,
    state_id: stateId,
    reporting_year: Number(reportYear),
    reporting_month: Number(reportMonth),
    submission_date: submitDate || null,
    submitted_by: "State Office",
    status,
  });

  const validateHeader = (opts?: { requireState?: boolean; requireZone?: boolean; requireMonth?: boolean }) => {
    if (!reportYear) return "Please select reporting year";
    if (opts?.requireMonth !== false && !reportMonth) return "Please select reporting period";
    if (opts?.requireState !== false && !stateId) return "Please select a State";
    // Zone is normally derived from State; still required when State is required.
    if (opts?.requireZone !== false && opts?.requireState !== false && !zoneId) {
      return "Please select a State";
    }
    if (opts?.requireZone === true && !zoneId) return "Please select a State";
    return null;
  };

  return {
    zones, states, zoneId, setZoneId, stateId, setStateId,
    reportYear, setReportYear, reportMonth, setReportMonth, submitDate, setSubmitDate,
    lockZone, lockState, hydratingRef, applyHeader, resetHeader, headerPayload, validateHeader,
  };
}
