import React, { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAssetManagement, LOOKUPS } from "@/src/store/useAssetManagement";
import { useNavigate, useLocation } from "react-router-dom";
import { stockApi } from "@/lib/api";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Save,
  Tag,
  MapPin,
  CircleDollarSign,
  History,
  Sliders,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

interface Option { id: number; label: string; }

export function AssetRegisterView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const capitaliseState = (location.state as any)?.fromCapitalisation
    ? (location.state as any)
    : null;
  const fromSupply = Boolean((location.state as any)?.fromSupplyVerification);
  const { registerAsset } = useAssetManagement();
  const [currentStep, setCurrentStep] = useState(1);
  const [successMsg, setSuccessMsg] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Dynamic Zone, State, Department, Unit Options from stockApi (same as StockAssetManager)
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);

  // Clean empty form state
  const [formData, setFormData] = useState<any>({
    // Step 2 Location, Custody & Officers (Cascading Zone, State, Dept, Unit)
    zone_id: "",
    zone_name: "",
    state_id: "",
    state_name: "",
    department_id: "",
    department_name: "",
    unit_id: "",
    unit_name: "",
    officeDeptUnit: "",
    coordinator: "",
    trackingOfficer: "",
    supervisor: "",
    date: new Date().toISOString().split("T")[0],

    // Step 1: Identification, Classification & Category Attributes
    name: "",
    primaryCategory: "Office Equipment",
    subCategory: "Printing & Document Management",
    specificType: "Printers",
    nhiaTagNumber: "",

    // Step 2: Location & Custody
    facilitySite: "HQ",
    specificLocation: "",
    yearOfAllocation: new Date().getFullYear().toString(),
    assignedCustodian: "",
    operationalStatus: "Active (in-use)",

    // Step 3: Financial & Depreciation
    acquisitionDate: new Date().toISOString().split("T")[0],
    acquisitionCost: "",
    usefulLifeYears: 5,
    salvageValue: 0,
    depreciationMethod: "Straight-Line",
    accumulatedDepreciation: 0,
    netBookValue: 0,

    // Step 4: Lifecycle & Maintenance — left empty until the officer fills them in
    physicalCondition: "",
    lastVerificationDate: "",
    verificationStatus: "",
    taggingMethod: "",
    comments: "",

    // Category Attributes
    categoryAttributes: {}
  });

  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill) return;
    setFormData((prev: any) => ({
      ...prev,
      ...prefill,
      name: prefill.name || prev.name,
      primaryCategory: prefill.primaryCategory || prev.primaryCategory,
      subCategory: prefill.subCategory || prev.subCategory,
      specificType: prefill.specificType || prev.specificType,
      acquisitionCost: prefill.acquisitionCost ?? prev.acquisitionCost,
      facilitySite: prefill.facilitySite || prev.facilitySite,
      specificLocation: prefill.specificLocation || prev.specificLocation,
    }));
    if (prefill.zone_id) {
      stockApi.getStates(prefill.zone_id).then((r: any) => {
        if (r?.data) setStates(r.data.map((s: any) => ({ id: s.id, label: s.description })));
      }).catch(() => {});
    }
    if (prefill.state_id) {
      stockApi.getDepartments(prefill.state_id).then((r: any) => {
        if (r?.data) setDepartments(r.data.map((d: any) => ({ id: d.id, label: d.name })));
      }).catch(() => {});
    }
  }, [location.state]);

  useEffect(() => {
    stockApi.getZones().then((r: any) => {
      if (r?.data) {
        setZones(r.data.map((z: any) => ({ id: z.id, label: z.description })));
      }
    }).catch(() => {});
  }, []);

  const handleZoneChange = async (zoneId: string) => {
    const selectedZone = zones.find(z => String(z.id) === zoneId);
    setFormData((prev: any) => ({
      ...prev,
      zone_id: zoneId,
      zone_name: selectedZone ? selectedZone.label : "",
      state_id: "",
      state_name: "",
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
      officeDeptUnit: ""
    }));
    setStates([]);
    setDepartments([]);
    setUnits([]);

    if (zoneId) {
      try {
        const r = await stockApi.getStates(zoneId);
        if (r?.data) {
          setStates(r.data.map((s: any) => ({ id: s.id, label: s.description })));
        }
      } catch (e) {}
    }
  };

  const handleStateChange = async (stateId: string) => {
    const selectedState = states.find(s => String(s.id) === stateId);
    setFormData((prev: any) => ({
      ...prev,
      state_id: stateId,
      state_name: selectedState ? selectedState.label : "",
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
      officeDeptUnit: selectedState ? selectedState.label : ""
    }));
    setDepartments([]);
    setUnits([]);

    if (stateId) {
      try {
        const r = await stockApi.getDepartments(stateId);
        if (r?.data) {
          setDepartments(r.data.map((d: any) => ({ id: d.id, label: d.name })));
        }
      } catch (e) {}
    }
  };

  const handleDepartmentChange = async (deptId: string) => {
    const selectedDept = departments.find(d => String(d.id) === deptId);
    const deptName = selectedDept ? selectedDept.label : "";
    setFormData((prev: any) => ({
      ...prev,
      department_id: deptId,
      department_name: deptName,
      unit_id: "",
      unit_name: "",
      officeDeptUnit: deptName
    }));
    setUnits([]);

    if (deptId) {
      try {
        const r = await stockApi.getUnits(deptId);
        if (r?.data) {
          setUnits(r.data.map((u: any) => ({ id: u.id, label: u.name })));
        }
      } catch (e) {}
    }
  };

  const handleUnitChange = (unitId: string) => {
    const selectedUnit = units.find(u => String(u.id) === unitId);
    const unitName = selectedUnit ? selectedUnit.label : "";
    const combined = formData.department_name ? `${formData.department_name} / ${unitName}` : unitName;
    setFormData((prev: any) => ({
      ...prev,
      unit_id: unitId,
      unit_name: unitName,
      officeDeptUnit: combined
    }));
  };

  const availableSubCats = Object.keys(
    LOOKUPS.primaryCategories[formData.primaryCategory] || {}
  );

  const availableTypes =
    LOOKUPS.primaryCategories[formData.primaryCategory]?.[formData.subCategory] || [];

  const handlePrimaryCategoryChange = (cat: string) => {
    const subCats = Object.keys(LOOKUPS.primaryCategories[cat] || {});
    const firstSub = subCats[0] || "";
    const types = LOOKUPS.primaryCategories[cat]?.[firstSub] || [];
    const firstType = types[0] || "";

    setFormData({
      ...formData,
      primaryCategory: cat,
      subCategory: firstSub,
      specificType: firstType,
      categoryAttributes: {}
    });
  };

  const handleSubCategoryChange = (sub: string) => {
    const types = LOOKUPS.primaryCategories[formData.primaryCategory]?.[sub] || [];
    const firstType = types[0] || "";
    setFormData({
      ...formData,
      subCategory: sub,
      specificType: firstType
    });
  };

  useEffect(() => {
    const cost = parseFloat(formData.acquisitionCost || 0);
    const accum = parseFloat(formData.accumulatedDepreciation || 0);
    setFormData((prev: any) => ({ ...prev, netBookValue: Math.max(0, cost - accum) }));
  }, [formData.acquisitionCost, formData.accumulatedDepreciation]);

  const handleAttrChange = (field: string, val: any) => {
    setFormData({
      ...formData,
      categoryAttributes: { ...formData.categoryAttributes, [field]: val }
    });
  };

  // Step Validations — returns false and sets error + optional jump target
  const validateStep = (step: number, { silentJump = false }: { silentJump?: boolean } = {}): boolean => {
    const fail = (message: string) => {
      setValidationError(message);
      if (!silentJump && step !== currentStep) setCurrentStep(step);
      return false;
    };

    if (step === 1) {
      if (!formData.name?.trim()) return fail("Please enter the Asset Name / Item Description.");
      if (!formData.nhiaTagNumber?.trim()) return fail("Please enter the NHIA Serial Number / Tag.");
      if (!formData.primaryCategory) return fail("Please select a Primary Category.");
      if (!formData.subCategory) return fail("Please select a Sub Category.");
      if (!formData.specificType) return fail("Please select a Specific Item Type.");
    }
    if (step === 2) {
      if (!formData.zone_id) return fail("Please select a Zone.");
      if (!formData.state_id) return fail("Please select a State.");
      if (!formData.trackingOfficer?.trim()) return fail("Please specify the Tracking Officer.");
      if (!formData.assignedCustodian?.trim()) return fail("Please enter the Assigned Custodian.");
      if (!formData.facilitySite) return fail("Please select a Facility Site.");
      if (!formData.specificLocation?.trim()) return fail("Please enter the Specific Location (Floor / Room).");
      if (!formData.yearOfAllocation?.trim()) return fail("Please enter the Year of Allocation.");
      if (!formData.operationalStatus) return fail("Please select an Operational Status.");
    }
    if (step === 3) {
      if (!formData.acquisitionDate) return fail("Please enter the Acquisition Date.");
      if (!formData.acquisitionCost || parseFloat(formData.acquisitionCost) <= 0) {
        return fail("Please enter a valid Acquisition Cost greater than 0.");
      }
      if (!formData.usefulLifeYears || Number(formData.usefulLifeYears) <= 0) {
        return fail("Please enter Useful Life in years.");
      }
      if (!formData.depreciationMethod) return fail("Please select a Depreciation Method.");
    }
    if (step === 4) {
      if (!formData.physicalCondition) return fail("Please select the Physical Condition.");
      if (!formData.lastVerificationDate) return fail("Please enter the Last Physical Verification Date.");
      if (!formData.verificationStatus) return fail("Please select a Verification Status.");
      if (!formData.taggingMethod) return fail("Please select a Tagging Method.");
    }
    setValidationError(null);
    return true;
  };

  const validateAllSteps = (): boolean => {
    for (const step of [1, 2, 3, 4]) {
      if (!validateStep(step)) return false;
    }
    return true;
  };

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation?.();
    if (currentStep !== 4) {
      // Never create from an earlier step (e.g. Enter key) — only advance
      if (validateStep(currentStep)) setCurrentStep((s) => Math.min(4, s + 1));
      return;
    }
    if (!validateAllSteps()) return;
    const tag = (formData.nhiaTagNumber || "").trim();
    const payload = {
      ...formData,
      nhiaTagNumber: tag,
      category: formData.primaryCategory,
      // Asset ID is auto-generated on the server from category (e.g. OFE-001)
    };
    try {
      if (capitaliseState?.inventoryItemId) {
        await stockApi.capitaliseInventory({
          inventoryItemId: capitaliseState.inventoryItemId,
          quantity: Number(capitaliseState.quantity || 1),
          asset: payload,
        });
      } else {
        await registerAsset(payload);
      }
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        if (capitaliseState) {
          navigate("/store-management/transfers/requests?tab=capitalise");
        } else if (onNavigate) {
          onNavigate("store-assets-list");
        } else {
          navigate("/store-management/assets/list");
        }
      }, 1200);
    } catch (err: any) {
      setValidationError(err?.message || "Failed to save asset");
    }
  };

  const steps = [
    { id: 1, title: "1. Identification, Classification & Attributes", icon: Tag },
    { id: 2, title: "2. Location, Custody & Officers", icon: MapPin },
    { id: 3, title: "3. Financial & Depreciation Data", icon: CircleDollarSign },
    { id: 4, title: "4. Lifecycle & Maintenance", icon: History }
  ];

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#25a872]" /> {capitaliseState ? "Capitalise Store Item" : fromSupply ? "Capitalise Verified Supply" : "Asset Registration Form"}
        </span>
      }
      description={
        capitaliseState
          ? "Complete asset details — stock will be deducted from the store on save"
          : fromSupply
            ? "Complete asset details for this verified supply — it will be tagged on the register"
            : "Register new physical assets with dynamic Zone, State, Department, and Unit cascading selects"
      }
      back={true}
      backTo={
        capitaliseState
          ? "/store-management/transfers/requests?tab=capitalise"
          : fromSupply
            ? "/store-management/verification/supply"
            : "/store-management/assets/list"
      }
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[600px] w-full">
        {/* Header Banner */}
        <div className="bg-[#145c3f] text-white p-4 border-b border-[#0f3d2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/20 rounded-lg text-emerald-200">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Asset Data Entry Form</h2>
              <p className="text-xs text-emerald-100/90">National Health Insurance Authority Master Asset Register</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-emerald-200 border border-white/20">
              Category: {formData.primaryCategory}
            </span>
          </div>
        </div>

        {capitaliseState && (
          <div className="m-4 mb-0 p-3 bg-[#e8f5ee] border border-[#25a872]/40 text-[#0f3d2e] rounded-md font-semibold text-xs">
            Capitalising {Number(capitaliseState.quantity || 1)} unit{Number(capitaliseState.quantity || 1) === 1 ? "" : "s"} from store stock. Saving will deduct this quantity from inventory.
          </div>
        )}
        {fromSupply && !capitaliseState && (
          <div className="m-4 mb-0 p-3 bg-[#e8f5ee] border border-[#25a872]/40 text-[#0f3d2e] rounded-md font-semibold text-xs">
            Verified supply — complete the register to capitalise this item as a tagged asset.
          </div>
        )}

        {/* Step Tabs Navigation */}
        <div className="bg-[#f4f7f5] border-b border-slate-200 flex overflow-x-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-r border-slate-200 cursor-pointer ${
                  isActive
                    ? "bg-white text-[#145c3f] border-b-2 border-b-[#145c3f] shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#25a872]" : "text-slate-400"}`} />
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-semibold text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            {validationError}
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-semibold text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {capitaliseState
              ? "Stock capitalised — asset registered and inventory reduced."
              : "Asset successfully registered and persisted in DB!"}
          </div>
        )}

        {/* Form Body Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Block Enter-to-submit on steps 1–3; only Save on step 4 creates the asset
            if (currentStep === 4) handleSave(e);
            else handleNextStep();
          }}
          className="p-6 flex-1 flex flex-col justify-between text-xs space-y-6"
        >
          {/* STEP 1: IDENTIFICATION & CLASSIFICATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#145c3f]" />
                1. IDENTIFICATION & CLASSIFICATION
              </h3>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asset Name / Item Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-semibold focus:ring-1 focus:ring-[#25a872]"
                  placeholder="e.g. HP LaserJet Enterprise MFP Printer"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NHIA Serial Number / Tag <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nhiaTagNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, nhiaTagNumber: e.target.value });
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono font-semibold focus:ring-1 focus:ring-[#25a872]"
                  placeholder="e.g. NHIA/OG/SQA/OF/0018"
                  required
                />
              </div>

              {/* Dynamic Cascading Category Selects */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#f4f7f5] p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Primary Category</label>
                  <Select
                    value={formData.primaryCategory}
                    onValueChange={(cat) => handlePrimaryCategoryChange(cat)}
                  >
                    <SelectTrigger size="sm" displayValue={formData.primaryCategory} className="bg-white">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(LOOKUPS.primaryCategories).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Sub Category</label>
                  <Select
                    value={formData.subCategory}
                    onValueChange={(sub) => handleSubCategoryChange(sub)}
                  >
                    <SelectTrigger size="sm" displayValue={formData.subCategory} className="bg-white">
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubCats.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Specific Item Type</label>
                  <Select
                    value={formData.specificType}
                    onValueChange={(type) => setFormData({ ...formData, specificType: type })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.specificType} className="bg-white">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CATEGORY-SPECIFIC ATTRIBUTES */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#145c3f] flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-[#25a872]" />
                  Category-Specific Attributes for {formData.primaryCategory}
                </h4>

                {(formData.primaryCategory === "Office Equipment" || formData.primaryCategory === "Plant & Machinery" || formData.primaryCategory === "Plant and Machinery") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#f4f7f5] p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={formData.categoryAttributes.serialNumber || ""}
                        onChange={(e) => handleAttrChange("serialNumber", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 font-mono bg-white"
                        placeholder="e.g. CNB890123"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Power Specification (W)</label>
                      <input
                        type="text"
                        value={formData.categoryAttributes.powerSpecification || ""}
                        onChange={(e) => handleAttrChange("powerSpecification", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                        placeholder="e.g. 500W"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Capacity / Output Rating</label>
                      <input
                        type="text"
                        value={formData.categoryAttributes.capacityOutputRating || ""}
                        onChange={(e) => handleAttrChange("capacityOutputRating", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                        placeholder="e.g. 40 ppm"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Last Maintenance Service Date</label>
                      <input
                        type="date"
                        value={formData.categoryAttributes.lastMaintenanceDate || ""}
                        onChange={(e) => handleAttrChange("lastMaintenanceDate", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Next Maintenance Service Date</label>
                      <input
                        type="date"
                        value={formData.categoryAttributes.nextMaintenanceDate || ""}
                        onChange={(e) => handleAttrChange("nextMaintenanceDate", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 font-mono bg-white"
                      />
                    </div>
                  </div>
                )}

                {formData.primaryCategory === "Computer Equipment" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#f4f7f5] p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Processor</label>
                      <input
                        type="text"
                        value={formData.categoryAttributes.processor || ""}
                        onChange={(e) => handleAttrChange("processor", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                        placeholder="e.g. Intel Core i7 13th Gen"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">RAM (GB)</label>
                      <input
                        type="text"
                        value={formData.categoryAttributes.ramGb || ""}
                        onChange={(e) => handleAttrChange("ramGb", e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 font-mono bg-white"
                        placeholder="e.g. 16"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION, CUSTODY & OFFICERS (DYNAMIC ZONE, STATE, DEPT, UNIT) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#145c3f]" />
                2. LOCATION, CUSTODY & OFFICERS
              </h3>

              {/* Dynamic Zone -> State -> Department -> Unit Cascading Selects */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#f4f7f5] p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Zone <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.zone_id ? String(formData.zone_id) : ""}
                    onValueChange={(val) => handleZoneChange(val)}
                  >
                    <SelectTrigger size="sm" displayValue={formData.zone_name || undefined} className="bg-white">
                      <SelectValue placeholder="-- Select Zone --" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    State <span className="text-rose-500">*</span>
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
                      <SelectValue placeholder={formData.zone_id ? "-- Select State --" : "Select Zone first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Department (Select)</label>
                  <Select
                    value={formData.department_id ? String(formData.department_id) : ""}
                    disabled={!formData.state_id}
                    onValueChange={(val) => handleDepartmentChange(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={formData.department_name || undefined}
                      className="bg-white"
                    >
                      <SelectValue placeholder={formData.state_id ? "-- Select Department --" : "Select State first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Unit (Select)</label>
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
                      <SelectValue placeholder={formData.department_id ? "-- Select Unit --" : "Select Dept first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Coordinator / Director</label>
                  <input
                    type="text"
                    value={formData.coordinator}
                    onChange={(e) => setFormData({ ...formData, coordinator: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                    placeholder="e.g. Alhaji Bello"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tracking Officer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.trackingOfficer}
                    onChange={(e) => {
                      setFormData({ ...formData, trackingOfficer: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                    placeholder="e.g. Musa Ibrahim"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Supervisor Name</label>
                  <input
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                    placeholder="e.g. Director SQA"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Assigned Custodian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.assignedCustodian}
                    onChange={(e) => {
                      setFormData({ ...formData, assignedCustodian: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-semibold bg-white"
                    placeholder="e.g. Ahmadu Bello"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Year of Allocation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.yearOfAllocation}
                    onChange={(e) => {
                      setFormData({ ...formData, yearOfAllocation: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono bg-white"
                    placeholder="e.g. 2024"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Facility Site <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.facilitySite}
                    onValueChange={(val) => setFormData({ ...formData, facilitySite: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.facilitySite} className="bg-white">
                      <SelectValue placeholder="Select Facility Site" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.facilitySites.map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Specific Location (Floor / Room) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.specificLocation}
                    onChange={(e) => {
                      setFormData({ ...formData, specificLocation: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300"
                    placeholder="e.g. 2nd Floor, Room 204"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Operational Status <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.operationalStatus}
                    onValueChange={(val) => setFormData({ ...formData, operationalStatus: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.operationalStatus} className="bg-white text-[#145c3f] font-bold">
                      <SelectValue placeholder="Select Operational Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.operationalStatuses.map((st: string) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIAL & DEPRECIATION DATA */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-[#25a872]" />
                3. FINANCIAL & DEPRECIATION DATA
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Acquisition Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Acquisition Cost (NGN ₦) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.acquisitionCost}
                    onChange={(e) => {
                      setFormData({ ...formData, acquisitionCost: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono font-bold text-slate-900"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Useful Life (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salvage Value (₦)</label>
                  <input
                    type="number"
                    value={formData.salvageValue}
                    onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Depreciation Method <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.depreciationMethod}
                    onValueChange={(val) => setFormData({ ...formData, depreciationMethod: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.depreciationMethod} className="bg-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.depreciationMethods.map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Accumulated Depreciation (₦)</label>
                  <input
                    type="number"
                    value={formData.accumulatedDepreciation}
                    onChange={(e) => setFormData({ ...formData, accumulatedDepreciation: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#e8f5ee] border border-[#d4e8dc] rounded-md flex items-center justify-between font-mono">
                <span className="font-bold text-[#145c3f] text-xs">Net Book Value (Acquisition − Accum. Dep.):</span>
                <span className="font-bold text-[#145c3f] text-base">₦{Number(formData.netBookValue || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* STEP 4: LIFECYCLE & MAINTENANCE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-amber-600" />
                4. LIFECYCLE & MAINTENANCE
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Physical Condition <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.physicalCondition || undefined}
                    onValueChange={(val) => setFormData({ ...formData, physicalCondition: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.physicalCondition || undefined} className="bg-white text-[#145c3f] font-bold">
                      <SelectValue placeholder="Select Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.physicalConditions.map((c: string) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Last Physical Verification Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.lastVerificationDate || ""}
                    onChange={(e) => setFormData({ ...formData, lastVerificationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Verification Status <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.verificationStatus || undefined}
                    onValueChange={(val) => setFormData({ ...formData, verificationStatus: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.verificationStatus || undefined} className="bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.verificationStatuses.map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tagging Method <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.taggingMethod || undefined}
                    onValueChange={(val) => setFormData({ ...formData, taggingMethod: val })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.taggingMethod || undefined} className="bg-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKUPS.taggingMethods.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comment / Observations</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 rounded border border-slate-300 text-sm"
                  placeholder="General notes or observations about this asset…"
                />
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="flex items-center justify-between border-t pt-4">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1 px-4 py-2 rounded border border-slate-300 text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Step
            </button>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1 px-5 py-2 rounded bg-[#145c3f] text-white font-semibold hover:bg-[#0f3d2e] shadow-sm cursor-pointer"
                >
                  <span>Next Step</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{capitaliseState ? "Capitalise to Register" : "Save Asset to Register"}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

export default AssetRegisterView;
