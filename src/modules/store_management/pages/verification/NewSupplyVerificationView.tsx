import React, { useEffect, useState } from "react";
import PageLayout from "../../components/PageLayout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { stockApi } from "@/lib/api";
import {
  PackageCheck,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Building2,
  FileText,
  ListOrdered,
  User,
  Plus,
  Trash2,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  SUPPLY_NATURES,
  getSupplySubcategories,
  getPrimaryCategoryKeys,
  getSubCategoryKeys,
  getSpecificTypeKeys,
  classificationForCategory,
  PHYSICAL_CONDITIONS,
  VERIFICATION_STATUSES,
  APPROVAL_STATUSES,
  storeNameFromState,
} from "../../lib/storeOptions";

type LineItem = {
  description: string;
  quantityDelivered: number;
  unitPrice: number;
};

type Option = { id: number; label: string };

const STEPS = [
  { id: 1, title: "Classification & Location", icon: MapPin },
  { id: 2, title: "Identification & Contract", icon: Building2 },
  { id: 3, title: "Compliance", icon: ShieldCheck },
  { id: 4, title: "Line Items", icon: ListOrdered },
  { id: 5, title: "Sign-off", icon: User },
];

function nextControlNumber() {
  const y = new Date().getFullYear();
  const seq = String(Date.now()).slice(-4);
  return `SVC-${y}-${seq}`;
}

function labelOf(options: Option[], id: string) {
  if (!id) return "";
  return options.find((o) => String(o.id) === String(id))?.label || "";
}

export function NewSupplyVerificationView() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    supplyRefNo: nextControlNumber(),
    certificateDate: new Date().toISOString().slice(0, 10),
    supplyNature: "Goods" as (typeof SUPPLY_NATURES)[number],
    goodsCategory: "Office Equipment",
    storeSubcategory: getSubCategoryKeys("Office Equipment")[0] || "",
    specificType: getSpecificTypeKeys("Office Equipment", getSubCategoryKeys("Office Equipment")[0] || "")[0] || "",
    storeLocation: "",
    procurementInstrument: "",
    procurementDate: new Date().toISOString().slice(0, 10),
    supplierName: "",
    contractorAddress: "",
    purchaseOrderRef: "",
    srvNo: "",
    srvDate: new Date().toISOString().slice(0, 10),
    physicalCondition: "Good",
    verdict: "VERIFIED_PASSED",
    specificationMatch: true,
    priceConformance: true,
    classification: "STORE_INVENTORY" as "ASSET_REGISTER" | "STORE_INVENTORY",
    zone_id: "",
    state_id: "",
    department_id: "",
    unit_id: "",
    zone_name: "",
    state_name: "",
    department_name: "",
    unit_name: "",
    verifiedBy: user?.name || "",
    officerDesignation: user?.role_label || user?.role?.replace(/-/g, " ") || "",
    signOffDate: new Date().toISOString().slice(0, 10),
    approvalStatus: "PENDING",
    remarks: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: getSpecificTypeKeys("Office Equipment", getSubCategoryKeys("Office Equipment")[0] || "")[0] || "", quantityDelivered: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    stockApi
      .getZones()
      .then((r) => {
        setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.name) {
      setFormData((p) => ({ ...p, verifiedBy: p.verifiedBy || user.name }));
    }
  }, [user?.name]);

  const setField = (key: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationError) setValidationError(null);
  };

  const handleZoneChange = async (zoneId: string) => {
    setFormData((p) => ({
      ...p,
      zone_id: zoneId,
      zone_name: labelOf(zones, zoneId),
      state_id: "",
      state_name: "",
      storeLocation: "",
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
    }));
    setStates([]);
    setDepartments([]);
    setUnits([]);
    if (!zoneId) return;
    try {
      const r = await stockApi.getStates(zoneId);
      setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
    } catch {
      setStates([]);
    }
  };

  const handleStateChange = async (stateId: string) => {
    const stateName = labelOf(states, stateId);
    setFormData((p) => ({
      ...p,
      state_id: stateId,
      state_name: stateName,
      storeLocation: storeNameFromState(stateName),
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
    }));
    setDepartments([]);
    setUnits([]);
    if (!stateId) return;
    try {
      const r = await stockApi.getDepartments(stateId);
      setDepartments((r.data || []).map((d: any) => ({ id: d.id, label: d.name })));
    } catch {
      setDepartments([]);
    }
  };

  const handleDeptChange = async (deptId: string) => {
    setFormData((p) => ({
      ...p,
      department_id: deptId,
      department_name: labelOf(departments, deptId),
      unit_id: "",
      unit_name: "",
    }));
    setUnits([]);
    if (!deptId) return;
    try {
      const r = await stockApi.getUnits(deptId);
      setUnits((r.data || []).map((u: any) => ({ id: u.id, label: u.name })));
    } catch {
      setUnits([]);
    }
  };

  const handleUnitChange = (unitId: string) => {
    setFormData((p) => ({
      ...p,
      unit_id: unitId,
      unit_name: labelOf(units, unitId),
    }));
  };

  const updateLine = (index: number, key: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.goodsCategory) {
        setValidationError("Select a primary goods category");
        return false;
      }
      if (!formData.zone_id || !formData.state_id) {
        setValidationError("Zone and State office are required — the state office is the receiving store");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.supplyRefNo.trim()) {
        setValidationError("Control number is required");
        return false;
      }
      if (!formData.supplierName.trim()) {
        setValidationError("Contractor / supplier name is required");
        return false;
      }
    }
    if (step === 4) {
      const validLines = lineItems.filter((l) => l.description.trim());
      if (validLines.length === 0) {
        setValidationError("Add at least one line item with a description");
        return false;
      }
    }
    if (step === 5) {
      if (!formData.verifiedBy.trim()) {
        setValidationError("Verifying officer name is required");
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(5, s + 1));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    const validLines = lineItems.filter((l) => l.description.trim());
    setSaving(true);
    try {
      const first = validLines[0];
      const classification = classificationForCategory(formData.supplyNature, formData.goodsCategory);
      const { specificType: _specificType, ...formFields } = formData;
      const payload = {
        ...formFields,
        classification,
        goodsCategory:
          formData.supplyNature === "Goods" ? formData.goodsCategory : formData.supplyNature,
        zone_id: formData.zone_id ? Number(formData.zone_id) : null,
        state_id: formData.state_id ? Number(formData.state_id) : null,
        department_id: formData.department_id ? Number(formData.department_id) : null,
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        zone_name: formData.zone_name || labelOf(zones, formData.zone_id),
        state_name: formData.state_name || labelOf(states, formData.state_id),
        department_name: formData.department_name || labelOf(departments, formData.department_id),
        unit_name: formData.unit_name || labelOf(units, formData.unit_id),
        storeLocation: storeNameFromState(formData.state_name || labelOf(states, formData.state_id)),
        physicalCondition: formData.physicalCondition.toUpperCase(),
        lineItems: validLines,
        expectedItemName: first.description,
        suppliedItemName: first.description,
        expectedQuantity: validLines.reduce((sum, l) => sum + Number(l.quantityDelivered || 0), 0),
        suppliedQuantity: validLines.reduce((sum, l) => sum + Number(l.quantityDelivered || 0), 0),
      };

      const res = await stockApi.createSupplyVerification(payload);
      if (!res.success) throw new Error("Save failed");

      setSuccessMsg(true);
      const posted = (res as any).inventoryPosted?.length || 0;
      const savedId = res.data?.id;
      toast.success(
        classification === "STORE_INVENTORY"
          ? `Saved — ${posted} item(s) posted to Inventory Catalog`
          : "Saved — continue on the Asset Register to capitalise"
      );

      setTimeout(() => {
        if (classification === "ASSET_REGISTER") {
          navigate("/store-management/assets/register", {
            state: {
              fromSupplyVerification: true,
              prefill: {
                name: first.description || formData.specificType,
                primaryCategory: formData.goodsCategory,
                subCategory: formData.storeSubcategory,
                specificType: formData.specificType,
                acquisitionCost: first.unitPrice || "",
                zone_id: formData.zone_id,
                state_id: formData.state_id,
                department_id: formData.department_id,
                unit_id: formData.unit_id,
                zone_name: payload.zone_name,
                state_name: payload.state_name,
                facilitySite: "State Office",
                specificLocation: payload.storeLocation,
              },
            },
          });
          return;
        }
        if (savedId) {
          navigate(`/store-management/verification/supply/${savedId}`, {
            state: { justCreated: true, from: "/store-management/verification/supply" },
          });
        } else {
          navigate("/store-management/verification/supply");
        }
      }, 700);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save verification");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25a872]/40 disabled:bg-slate-50 disabled:text-slate-500";
  const labelCls = "block text-[11px] font-semibold text-slate-600 mb-1.5";

  return (
    <PageLayout
      title="Verification of Supply"
      description="Inspect delivered goods and generate verification certificate"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back
        </Button>
      }
    >
      <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-[#145c3f] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-white/10 border border-white/20 flex items-center justify-center">
              <PackageCheck className="h-5 w-5 text-[#25a872]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Supply Verification Certificate</h2>
              <p className="text-xs text-emerald-100/90">National Health Insurance Authority</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-emerald-200 border border-white/20">
            {formData.supplyRefNo}
          </span>
        </div>

        <div className="bg-[#f4f7f5] border-b border-slate-200 flex overflow-x-auto">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-r border-slate-200 ${
                  isActive
                    ? "bg-white text-[#145c3f] border-b-2 border-b-[#145c3f] shadow-sm"
                    : isDone
                      ? "text-[#145c3f] hover:bg-slate-200/60"
                      : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive || isDone ? "text-[#25a872]" : "text-slate-400"}`} />
                <span>
                  {step.id}. {step.title}
                </span>
              </button>
            );
          })}
        </div>

        {validationError && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-semibold text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            {validationError}
          </div>
        )}

        {successMsg && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-semibold text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Certificate saved — opening paper view…
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep < 5) handleNext();
            else handleSubmit();
          }}
          className="p-6 space-y-5 text-xs"
        >
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#145c3f]" />
                1. Classification & Location
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#f4f7f5] p-4 rounded-lg border border-slate-200">
                <div>
                  <label className={labelCls} htmlFor="goods-category">
                    Primary Category <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.goodsCategory}
                    onValueChange={(nextCategory) => {
                      const nextSubs = getSubCategoryKeys(nextCategory);
                      const nextSub = nextSubs[0] || "";
                      const nextTypes = getSpecificTypeKeys(nextCategory, nextSub);
                      const nextType = nextTypes[0] || "";
                      setFormData((p) => ({
                        ...p,
                        goodsCategory: nextCategory,
                        storeSubcategory: nextSub,
                        specificType: nextType,
                        classification: classificationForCategory("Goods", nextCategory),
                      }));
                      setLineItems((rows) => {
                        const first = rows[0];
                        if (!first) return rows;
                        const prevType = formData.specificType;
                        if (!first.description.trim() || first.description === prevType) {
                          return rows.map((row, i) => (i === 0 ? { ...row, description: nextType } : row));
                        }
                        return rows;
                      });
                    }}
                  >
                    <SelectTrigger size="sm" displayValue={formData.goodsCategory} className="bg-white">
                      <SelectValue placeholder="Select primary category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPrimaryCategoryKeys().map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="store-subcategory">Sub Category</label>
                  <Select
                    value={formData.storeSubcategory}
                    onValueChange={(nextSub) => {
                      const nextType = getSpecificTypeKeys(formData.goodsCategory, nextSub)[0] || "";
                      setFormData((p) => ({ ...p, storeSubcategory: nextSub, specificType: nextType }));
                      setLineItems((rows) => {
                        const first = rows[0];
                        if (!first) return rows;
                        if (!first.description.trim() || first.description === formData.specificType) {
                          return rows.map((row, i) => (i === 0 ? { ...row, description: nextType } : row));
                        }
                        return rows;
                      });
                    }}
                  >
                    <SelectTrigger size="sm" displayValue={formData.storeSubcategory} className="bg-white">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubCategoryKeys(formData.goodsCategory).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="specific-type">Specific Item Type</label>
                  <Select
                    value={formData.specificType}
                    onValueChange={(nextType) => {
                      setFormData((p) => ({ ...p, specificType: nextType }));
                      setLineItems((rows) => {
                        const first = rows[0];
                        if (!first) return rows;
                        if (!first.description.trim() || first.description === formData.specificType) {
                          return rows.map((row, i) => (i === 0 ? { ...row, description: nextType } : row));
                        }
                        return rows;
                      });
                    }}
                  >
                    <SelectTrigger size="sm" displayValue={formData.specificType} className="bg-white">
                      <SelectValue placeholder="Select specific item type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSpecificTypeKeys(formData.goodsCategory, formData.storeSubcategory).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls} htmlFor="zone-select">
                    Zone <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.zone_id ? String(formData.zone_id) : ""}
                    onValueChange={(val) => handleZoneChange(val)}
                  >
                    <SelectTrigger size="sm" displayValue={formData.zone_name || undefined} className="bg-white">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="state-select">
                    State office <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.state_id ? String(formData.state_id) : ""}
                    disabled={!formData.zone_id}
                    onValueChange={(val) => handleStateChange(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={formData.state_name || undefined}
                      className="bg-white"
                    >
                      <SelectValue placeholder={formData.zone_id ? "Select state office…" : "Select zone first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="dept-select">Department</label>
                  <Select
                    value={formData.department_id ? String(formData.department_id) : ""}
                    disabled={!formData.state_id}
                    onValueChange={(val) => handleDeptChange(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={formData.department_name || undefined}
                      className="bg-white"
                    >
                      <SelectValue placeholder={formData.state_id ? "Select department" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="unit-select">Unit</label>
                  <Select
                    value={formData.unit_id ? String(formData.unit_id) : ""}
                    disabled={!formData.department_id}
                    onValueChange={(val) => handleUnitChange(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={formData.unit_name || undefined}
                      className="bg-white"
                    >
                      <SelectValue placeholder={formData.department_id ? "Select unit" : "Select dept first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#145c3f]" />
                2. Identification & Contract
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Control Number (PK)</label>
                  <input
                    className={`${inputCls} font-mono`}
                    required
                    value={formData.supplyRefNo}
                    onChange={(e) => setField("supplyRefNo", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Certificate Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={formData.certificateDate}
                    onChange={(e) => setField("certificateDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Instrument of Procurement</label>
                  <input
                    className={inputCls}
                    value={formData.procurementInstrument}
                    onChange={(e) => setField("procurementInstrument", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Procurement Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={formData.procurementDate}
                    onChange={(e) => setField("procurementDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Purchase Order Ref</label>
                  <input
                    className={`${inputCls} font-mono`}
                    value={formData.purchaseOrderRef}
                    onChange={(e) => setField("purchaseOrderRef", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Contractor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputCls}
                    value={formData.supplierName}
                    onChange={(e) => setField("supplierName", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Contractor Address</label>
                  <input
                    className={inputCls}
                    value={formData.contractorAddress}
                    onChange={(e) => setField("contractorAddress", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>SRV No.</label>
                  <input
                    className={`${inputCls} font-mono`}
                    value={formData.srvNo}
                    onChange={(e) => setField("srvNo", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>SRV Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={formData.srvDate}
                    onChange={(e) => setField("srvDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#145c3f]" />
                3. Verification & Compliance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Physical Condition</label>
                  <Select
                    value={formData.physicalCondition}
                    onValueChange={(val) => setField("physicalCondition", val)}
                  >
                    <SelectTrigger size="sm" displayValue={formData.physicalCondition} className="bg-white">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHYSICAL_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Verification Status</label>
                  <Select
                    value={formData.verdict}
                    onValueChange={(val) => setField("verdict", val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={VERIFICATION_STATUSES.find((s) => s.value === formData.verdict)?.label || formData.verdict}
                      className="bg-white"
                    >
                      <SelectValue placeholder="Select verdict" />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Specification Conformity</label>
                  <Select
                    value={formData.specificationMatch ? "Yes" : "No"}
                    onValueChange={(val) => setField("specificationMatch", val === "Yes")}
                  >
                    <SelectTrigger size="sm" displayValue={formData.specificationMatch ? "Yes" : "No"} className="bg-white">
                      <SelectValue placeholder="Conformity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Price Conformance</label>
                  <Select
                    value={formData.priceConformance ? "Yes" : "No"}
                    onValueChange={(val) => setField("priceConformance", val === "Yes")}
                  >
                    <SelectTrigger size="sm" displayValue={formData.priceConformance ? "Yes" : "No"} className="bg-white">
                      <SelectValue placeholder="Conformance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-[#145c3f]" />
                  4. Line Items / Deliverables
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setLineItems((p) => [...p, { description: "", quantityDelivered: 1, unitPrice: 0 }])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                </Button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3 w-28">Control No.</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 w-28">Qty</th>
                      <th className="p-3 w-36">Unit Price (₦)</th>
                      <th className="p-3 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono text-slate-500">{formData.supplyRefNo}</td>
                        <td className="p-2">
                          <input
                            className={inputCls}
                            placeholder="Item description"
                            value={row.description}
                            onChange={(e) => updateLine(i, "description", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            className={inputCls}
                            value={row.quantityDelivered}
                            onChange={(e) => updateLine(i, "quantityDelivered", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={inputCls}
                            value={row.unitPrice}
                            onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                              onClick={() => setLineItems((p) => p.filter((_, idx) => idx !== i))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-[#145c3f]" />
                5. Sign-off & Signature Record
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>
                    Verifying Officer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputCls}
                    value={formData.verifiedBy}
                    onChange={(e) => setField("verifiedBy", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Officer Designation</label>
                  <input
                    className={inputCls}
                    value={formData.officerDesignation}
                    onChange={(e) => setField("officerDesignation", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sign-off Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={formData.signOffDate}
                    onChange={(e) => setField("signOffDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Approval Status</label>
                  <Select
                    value={formData.approvalStatus}
                    onValueChange={(val) => setField("approvalStatus", val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={APPROVAL_STATUSES.find((s) => s.value === formData.approvalStatus)?.label || formData.approvalStatus}
                      className="bg-white"
                    >
                      <SelectValue placeholder="Select approval status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVAL_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className={labelCls}>Remarks</label>
                  <textarea
                    className={`${inputCls} min-h-[80px]`}
                    value={formData.remarks}
                    onChange={(e) => setField("remarks", e.target.value)}
                    placeholder="Optional notes from inspection"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous Step
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold"
              >
                Next Step
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold min-w-[200px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4 mr-1.5" />
                )}
                Submit Certificate
              </Button>
            )}
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

export default NewSupplyVerificationView;
