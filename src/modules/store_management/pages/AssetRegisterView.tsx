import React, { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAssetManagement, LOOKUPS, CATEGORY_ATTRIBUTES } from "@/src/store/useAssetManagement";
import { useNavigate, useLocation } from "react-router-dom";
import { stockApi } from "@/lib/api";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Tag,
  MapPin,
  CircleDollarSign,
  History,
  Sliders,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

interface Option { id: number; label: string; isHq?: boolean; }

function mapStateOption(s: any): Option {
  return { id: s.id, label: s.description, isHq: Boolean(s.is_hq) };
}

/** Finance completes acquisition cost and depreciation. Hidden until that step is handed to them. */
const FINANCIAL_STEP_ENABLED = false;
const LAST_STEP = FINANCIAL_STEP_ENABLED ? 4 : 3;
const ASSET_VERIFICATION_STATUSES = ["Verified", "Unverified"];
const PHYSICAL_CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Defective", "Damaged", "Missing"];
const CONDITIONS_NEEDING_SERVICEABILITY = new Set(["Fair", "Poor", "Defective", "Damaged", "Missing"]);
const SERVICEABILITY_OPTIONS = ["Serviceable", "Non serviceable"];

export function AssetRegisterView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { createOnly } = useCreateReviewAccess();
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
  const emptyForm = () => ({
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

    // Step 4: Lifecycle & Maintenance
    physicalCondition: "",
    serviceability: "",
    lastVerificationDate: "",
    verificationStatus: "",
    taggingMethod: "",
    comments: "",

    // Category Attributes
    categoryAttributes: {}
  });

  const [formData, setFormData] = useState<any>(emptyForm());

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
        const mapped = (r?.data || []).map(mapStateOption);
        setStates(mapped);
        const selected = mapped.find((s) => String(s.id) === String(prefill.state_id));
        if (!prefill.state_id) return;
        if (selected?.isHq) {
          stockApi.getDepartments(undefined, "hq").then((d: any) => {
            if (d?.data) setDepartments(d.data.map((row: any) => ({ id: row.id, label: row.name })));
          }).catch(() => {});
          if (prefill.department_id) {
            stockApi.getUnits(prefill.department_id, "division").then((u: any) => {
              if (u?.data) setUnits(u.data.map((row: any) => ({ id: row.id, label: row.name })));
            }).catch(() => {});
          }
        } else {
          stockApi.getUnits(undefined, "state").then((u: any) => {
            if (u?.data) setUnits(u.data.map((row: any) => ({ id: row.id, label: row.name })));
          }).catch(() => {});
        }
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
          setStates(r.data.map(mapStateOption));
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

    if (!stateId) return;
    try {
      if (selectedState?.isHq) {
        const r = await stockApi.getDepartments(undefined, "hq");
        if (r?.data) setDepartments(r.data.map((d: any) => ({ id: d.id, label: d.name })));
      } else {
        const r = await stockApi.getUnits(undefined, "state");
        if (r?.data) setUnits(r.data.map((u: any) => ({ id: u.id, label: u.name })));
      }
    } catch (e) {}
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
        const r = await stockApi.getUnits(deptId, "division");
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

  // Step Validations  returns false and sets error + optional jump target
  const validateStep = (step: number, { silentJump = false }: { silentJump?: boolean } = {}): boolean => {
    const fail = (message: string) => {
      setValidationError(message);
      if (!silentJump && step !== currentStep) setCurrentStep(step);
      return false;
    };

    if (step === 1) {
      if (!formData.name?.trim()) return fail("Please enter the Asset Name / Item Description.");
      if (!formData.nhiaTagNumber?.trim()) return fail("Please enter the NHIA Tag.");
      if (!formData.taggingMethod) return fail("Please select a Tagging Method.");
      if (!formData.primaryCategory) return fail("Please select a Primary Category.");
      if (!formData.subCategory) return fail("Please select a Sub Category.");
      if (!formData.specificType) return fail("Please select a Specific Item Type.");
    }
    if (step === 2) {
      if (!formData.zone_id) return fail("Please select a Zone.");
      if (!formData.state_id) return fail("Please select a State.");
      const hqOffice = Boolean(states.find((s) => String(s.id) === String(formData.state_id))?.isHq);
      if (hqOffice) {
        if (!formData.department_id) return fail("Please select a Department.");
        if (!formData.unit_id) return fail("Please select a Division.");
      } else if (!formData.unit_id) {
        return fail("Please select a Unit.");
      }
      if (!formData.trackingOfficer?.trim()) return fail("Please specify the Tracking Officer.");
      if (!formData.assignedCustodian?.trim()) return fail("Please enter the Assigned Custodian.");
      if (!formData.specificLocation?.trim()) return fail("Please enter the Specific Location (Floor / Room).");
      if (!formData.operationalStatus) return fail("Please select an Operational Status.");
    }
    if (FINANCIAL_STEP_ENABLED && step === 3) {
      if (!formData.acquisitionDate) return fail("Please enter the Acquisition Date.");
      if (!formData.acquisitionCost || parseFloat(formData.acquisitionCost) <= 0) {
        return fail("Please enter a valid Acquisition Cost greater than 0.");
      }
      if (!formData.usefulLifeYears || Number(formData.usefulLifeYears) <= 0) {
        return fail("Please enter Useful Life in years.");
      }
      if (!formData.depreciationMethod) return fail("Please select a Depreciation Method.");
    }
    if (step === LAST_STEP) {
      if (!formData.physicalCondition) return fail("Please select the Physical Condition.");
      if (CONDITIONS_NEEDING_SERVICEABILITY.has(formData.physicalCondition) && !formData.serviceability) {
        return fail("Please select whether the asset is serviceable.");
      }
      if (!formData.verificationStatus) return fail("Please select a Verification Status.");
    }
    setValidationError(null);
    return true;
  };

  const validateAllSteps = (): boolean => {
    for (const step of FINANCIAL_STEP_ENABLED ? [1, 2, 3, 4] : [1, 2, 3]) {
      if (!validateStep(step)) return false;
    }
    return true;
  };

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(LAST_STEP, prev + 1));
    }
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation?.();
    if (currentStep !== LAST_STEP) {
      // Never create from an earlier step (e.g. Enter key) — only advance
      if (validateStep(currentStep)) setCurrentStep((s) => Math.min(LAST_STEP, s + 1));
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
        } else if (createOnly) {
          setFormData(emptyForm());
          setStates([]);
          setDepartments([]);
          setUnits([]);
          setCurrentStep(1);
          setValidationError(null);
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
    ...(FINANCIAL_STEP_ENABLED
      ? [{ id: 3, title: "3. Financial & Depreciation Data", icon: CircleDollarSign }]
      : []),
    {
      id: LAST_STEP,
      title: `${LAST_STEP}. Lifecycle & Maintenance`,
      icon: History,
    },
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
          ? "Complete asset details  stock will be deducted from the store on save"
          : fromSupply
            ? "Complete asset details for this verified supply  it will be tagged on the register"
            : "Register new physical assets with dynamic Zone, State, Department, and Unit cascading selects"
      }
      back={true}
      backTo={
        createOnly
          ? "/"
          : capitaliseState
          ? "/store-management/transfers/requests?tab=capitalise"
          : fromSupply
            ? "/store-management/verification/supply"
            : "/store-management/assets/list"
      }
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[600px] w-full">
        {capitaliseState && (
          <div className="m-4 mb-0 p-3 bg-[#e8f5ee] border border-[#25a872]/40 text-[#0f3d2e] rounded-md font-semibold text-xs">
            Capitalising {Number(capitaliseState.quantity || 1)} unit{Number(capitaliseState.quantity || 1) === 1 ? "" : "s"} from store stock. Saving will deduct this quantity from inventory.
          </div>
        )}
        {fromSupply && !capitaliseState && (
          <div className="m-4 mb-0 p-3 bg-[#e8f5ee] border border-[#25a872]/40 text-[#0f3d2e] rounded-md font-semibold text-xs">
            Verified supply  complete the register to capitalise this item as a tagged asset.
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
              ? "Stock capitalised  asset registered and inventory reduced."
              : "Asset successfully registered and persisted in DB!"}
          </div>
        )}

        {/* Form Body Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Block Enter-to-submit on earlier steps; only Save on the last step creates the asset
            if (currentStep === LAST_STEP) handleSave(e);
            else handleNextStep();
          }}
          className="p-6 flex-1 flex flex-col justify-between text-xs space-y-6"
        >
          {/* STEP 1: IDENTIFICATION & CLASSIFICATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NHIA Tag <span className="text-rose-500">*</span>
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tagging Method <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.taggingMethod || undefined}
                    onValueChange={(val) => {
                      setFormData({ ...formData, taggingMethod: val });
                      if (validationError) setValidationError(null);
                    }}
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

                {(() => {
                  const fields = CATEGORY_ATTRIBUTES[formData.primaryCategory] || [];
                  if (!fields.length) {
                    return (
                      <p className="text-xs text-slate-500">No extra attributes for this category.</p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#f4f7f5] p-3.5 rounded-lg border border-slate-200">
                      {fields.map((field) => (
                        <div key={field.key}>
                          <label className="block font-bold text-slate-700 mb-1">{field.label}</label>
                          {field.type === "select" ? (
                            <Select
                              value={formData.categoryAttributes[field.key] || undefined}
                              onValueChange={(val) => handleAttrChange(field.key, val)}
                            >
                              <SelectTrigger size="sm" displayValue={formData.categoryAttributes[field.key] || undefined} className="bg-white">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || []).map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <input
                              type={field.type === "date" ? "date" : "text"}
                              value={formData.categoryAttributes[field.key] || ""}
                              onChange={(e) => handleAttrChange(field.key, e.target.value)}
                              className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                              placeholder={field.placeholder || ""}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION, CUSTODY & OFFICERS (DYNAMIC ZONE, STATE, DEPT, UNIT) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {(() => {
                const hqOffice = Boolean(states.find((s) => String(s.id) === String(formData.state_id))?.isHq);
                return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {hqOffice && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
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
                )}

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {hqOffice ? "Division" : "Unit"} <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.unit_id ? String(formData.unit_id) : ""}
                    disabled={hqOffice ? !formData.department_id : !formData.state_id}
                    onValueChange={(val) => handleUnitChange(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={formData.unit_name || undefined}
                      className="bg-white"
                    >
                      <SelectValue placeholder={
                        !formData.state_id
                          ? "Select State first"
                          : hqOffice
                            ? (formData.department_id ? "-- Select Division --" : "Select Department first")
                            : "-- Select Unit --"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Specific Location (Floor / Room) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.specificLocation}
                    onChange={(e) => {
                      setFormData({ ...formData, specificLocation: e.target.value });
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                    placeholder="e.g. 2nd Floor, Room 204"
                    required
                  />
                </div>
              </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block font-bold text-slate-800 mb-1">Year of Allocation</label>
                  <input
                    type="text"
                    value={formData.yearOfAllocation}
                    onChange={(e) => setFormData({ ...formData, yearOfAllocation: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono bg-white"
                    placeholder="e.g. 2024"
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

          {/* STEP 3: FINANCIAL & DEPRECIATION DATA — completed by the Finance department; hidden for now. */}
          {FINANCIAL_STEP_ENABLED && currentStep === 3 && (
            <div className="space-y-4">
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
                    Acquisition Cost (NGN ?) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
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
                  <Input
                    type="number"
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salvage Value (?)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
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
                  <label className="block font-bold text-slate-700 mb-1">Accumulated Depreciation (?)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.accumulatedDepreciation}
                    onChange={(e) => setFormData({ ...formData, accumulatedDepreciation: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#e8f5ee] border border-[#d4e8dc] rounded-md flex items-center justify-between font-mono">
                <span className="font-bold text-[#145c3f] text-xs">Net Book Value (Acquisition ? Accum. Dep.):</span>
                <span className="font-bold text-[#145c3f] text-base">?{Number(formData.netBookValue || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* LIFECYCLE & MAINTENANCE */}
          {currentStep === LAST_STEP && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Physical Condition <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.physicalCondition || undefined}
                    onValueChange={(val) => setFormData({
                      ...formData,
                      physicalCondition: val,
                      serviceability: CONDITIONS_NEEDING_SERVICEABILITY.has(val) ? formData.serviceability : "",
                    })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.physicalCondition || undefined} className="bg-white text-[#145c3f] font-bold">
                      <SelectValue placeholder="Select Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHYSICAL_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {CONDITIONS_NEEDING_SERVICEABILITY.has(formData.physicalCondition) && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Serviceability <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={formData.serviceability || undefined}
                      onValueChange={(val) => {
                        setFormData({ ...formData, serviceability: val });
                        if (validationError) setValidationError(null);
                      }}
                    >
                      <SelectTrigger size="sm" displayValue={formData.serviceability || undefined} className="bg-white">
                        <SelectValue placeholder="Select serviceability" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICEABILITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Verification Status <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.verificationStatus || undefined}
                    onValueChange={(val) => setFormData({
                      ...formData,
                      verificationStatus: val,
                      lastVerificationDate: val === "Verified" ? formData.lastVerificationDate : "",
                    })}
                  >
                    <SelectTrigger size="sm" displayValue={formData.verificationStatus || undefined} className="bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_VERIFICATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.verificationStatus === "Verified" && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Last Verified
                    </label>
                    <input
                      type="date"
                      value={formData.lastVerificationDate || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, lastVerificationDate: e.target.value });
                        if (validationError) setValidationError(null);
                      }}
                      className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comment / Observations</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 rounded border border-slate-300 text-sm"
                  placeholder="General notes or observations about this asset"
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
              {currentStep < LAST_STEP ? (
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
