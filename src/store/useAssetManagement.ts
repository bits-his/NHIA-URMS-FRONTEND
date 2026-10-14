import { useState, useEffect } from 'react';
import { storeManagementApi } from '@/src/services/storeManagementApi';

export const LOOKUPS: any = {
  facilitySites: ["HQ", "Zonal Office", "State Office", "Annex Office"],
  locations: ["FCT", "Kano", "Kaduna", "Zamfara"],
  offices: ["HQ Main Office", "SQA", "ENF", "ISD", "FSD", "State Office", "Zonal Office", "Annex Office"],
  departments: ["ICT Department", "Administration", "Finance & Accounts", "Medical & Diagnostics", "Audit & Internal Control", "Store Unit"],
  depreciationMethods: ["Straight-Line", "Declining Balance", "None"],
  operationalStatuses: ["Active (in-use)", "In Store", "Under Repair", "Obsolete", "Retired", "Disposed"],
  physicalConditions: ["Excellent", "Good", "Fair", "Poor", "Defective", "Damaged", "Missing", "Obsolete", "Retired"],
  verificationStatuses: ["Verified", "Unverified", "Missing", "Verified & Passed", "Partial Pass", "Failed"],
  approvalStatuses: ["Pending", "Approved", "Rejected"],
  taggingMethods: ["Barcode", "QR Code", "RFID", "Others"],

  primaryCategories: {
    "Office Equipment": {
      "Printing & Document Management": ["Printers", "Scanners", "Photocopiers", "Paper Shredders", "Binding Machines", "Laminators"],
      "Telecommunications": ["Projector", "Display Screens", "Desk Phones", "Mobile Phones", "Wall-Mounted Display Screens", "Conference Room Speaker/Microphones", "HDMI Splitter"],
      "Office Appliances": ["Air conditioner Units", "Refrigerators", "Microwave Ovens", "Water Dispensers"],
      "Security & Office Automation": ["CCTV Cameras", "Access Control Systems", "Metal Detectors", "Biometric Scanners"],
      "Power Management": ["Extension Cables", "Surge Protectors"]
    },
    "Office Furniture": {
      "Seating": ["Executive Ergonomic Chairs", "Staff Workstation Task Chairs", "Conference Room Chairs", "Visitor Armchairs & Reception Couches"],
      "Desks & Workstations": ["Executive Office Desks", "Modular Open-Plan Workstations", "Reception Counters", "Boardroom Tables"],
      "Storage & Filing Systems": ["Lockable Metal Filing Cabinets", "Wooden Bookshelves", "Credenza Cabinets", "Mobile Pedestals"],
      "Fixtures & Room Fittings": ["Whiteboards", "Notice Boards", "Blinds & Curtains"]
    },
    "Computer Equipment": {
      "User End-Point Devices": ["Desktop PCs", "Workstation Towers", "Laptops", "Tablets / iPads"],
      "Peripherals": ["Keyboards", "Mice", "Docking Stations", "External Hard Drives", "Webcams"],
      "Network Infrastructure": ["Network Switches", "Routers", "Access Points", "Firewalls", "Patch Panels"],
      "Server & Data Center Hardware": ["Rack Servers", "SAN Storage Array", "UPS Backup Systems"]
    },
    "Motor Vehicles": {
      "Executive & Official Cars": ["Executive SUV", "Sedan Official Car"],
      "Operational & Utility Vehicles": ["Operational Pick-up", "Delivery Bus", "Ambulance"]
    },
    "Plant & Machinery": {
      "Power Generation & Energy Systems": ["Industrial Diesel Generator", "Solar Power System (Inverter/Batteries)", "Industrial UPS System"]
    },
    "Building": {
      "Administrative & Offices": ["Main Administrative Building", "Branch Office Structure"],
      "Warehouses & Storage": ["Central Distribution Warehouse"],
      "Residential Property": ["Staff Quarters"]
    },
    "Land": {
      "Freehold Land (Purchased)": ["Residential Plot", "Commercial Plot", "Industrial Plot"],
      "Leasehold Land": ["Leased Office Land"]
    }
  }
};

export type CategoryAttrField = {
  key: string;
  label: string;
  type?: "text" | "date" | "select";
  placeholder?: string;
  options?: string[];
};

const officeEquipmentAttrs: CategoryAttrField[] = [
  { key: "make", label: "Make / Manufacturer", placeholder: "e.g. HP" },
  { key: "modelNumber", label: "Model Number", placeholder: "e.g. LaserJet MFP" },
  { key: "serialNumber", label: "Serial Number", placeholder: "e.g. CNB890123" },
  { key: "powerSpecification", label: "Power Specification (W)", placeholder: "e.g. 500W" },
  { key: "capacityOutputRating", label: "Capacity / Output Rating", placeholder: "e.g. 40 ppm" },
  { key: "vendor", label: "Vendor", placeholder: "Supplier name" },
  { key: "lastMaintenanceDate", label: "Last Maintenance Service Date", type: "date" },
  { key: "nextMaintenanceDate", label: "Next Maintenance Service Date", type: "date" },
];

const computerEquipmentAttrs: CategoryAttrField[] = [
  { key: "serialNumber", label: "Serial Number", placeholder: "Manufacturer serial" },
  { key: "processor", label: "Processor (CPU)", placeholder: "e.g. Intel Core i7" },
  { key: "ramGb", label: "RAM (GB)", placeholder: "e.g. 16" },
  { key: "storageGb", label: "Storage (GB)", placeholder: "e.g. 512" },
  { key: "operatingSystem", label: "Operating System", placeholder: "e.g. Windows 11" },
  { key: "macAddress", label: "MAC Address", placeholder: "e.g. 00:1B:44:11:3A:B7" },
  { key: "ipAddress", label: "IP Address", placeholder: "e.g. 10.0.0.12" },
  { key: "encryption", label: "Encryption", placeholder: "e.g. BitLocker enabled" },
  { key: "antivirusAgent", label: "Antivirus Agent Status", placeholder: "e.g. Active" },
];

const motorVehicleAttrs: CategoryAttrField[] = [
  { key: "make", label: "Make / Manufacturer", placeholder: "e.g. Toyota" },
  { key: "modelYear", label: "Model & Year", placeholder: "e.g. Prado 2024" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "engineNumber", label: "Engine Number" },
  { key: "licencePlateNumber", label: "Licence Plate Number", placeholder: "e.g. FG-8801-NHIA" },
  { key: "fuelType", label: "Fuel Type", placeholder: "e.g. Petrol" },
  { key: "chassisVin", label: "Chassis / VIN Number" },
  { key: "insurancePolicy", label: "Insurance Policy" },
  { key: "odometerReading", label: "Current Odometer Reading (Km)", placeholder: "e.g. 24500" },
  { key: "assignedDriver", label: "Assigned Driver Name" },
];

const buildingAttrs: CategoryAttrField[] = [
  { key: "numberOfFloors", label: "Number of Floors" },
  { key: "grossFloorArea", label: "Gross Floor Area" },
  { key: "occupancyPermit", label: "Occupancy Permit" },
  { key: "ownershipStatus", label: "Ownership Status", placeholder: "e.g. Owned / Leased" },
  { key: "insurancePolicyNo", label: "Property Insurance Policy No." },
  { key: "tenureType", label: "Tenure Type" },
  { key: "leaseMonthYear", label: "Lease Month / Year", placeholder: "e.g. Jan 2024" },
  { key: "leaseExpiry", label: "Lease Expiry Month / Year", placeholder: "e.g. Dec 2029" },
  { key: "leaseAmount", label: "Lease Amount" },
];

const landAttrs: CategoryAttrField[] = [
  { key: "landUse", label: "Land Use Classification", type: "select", options: ["Residential Plot", "Commercial Plot", "Industrial"] },
  { key: "titleDocumentType", label: "Title Document Type" },
  { key: "documentNumber", label: "Document Number" },
  { key: "cofoTitleNo", label: "Certificate of Occupancy (C of O) / Title No." },
  { key: "plotNo", label: "Plot No." },
  { key: "areaSqm", label: "Area (SqM)" },
  { key: "landSize", label: "Land Size" },
  { key: "fencingStatus", label: "Fencing Status" },
  { key: "annualGroundRent", label: "Annual Ground Rent" },
  { key: "developmentLevel", label: "Development Level" },
  { key: "description", label: "Description" },
];

/** Fields from the Fixed Asset Register category-attribute sheets. */
export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttrField[]> = {
  "Office Equipment": officeEquipmentAttrs,
  "Office Furniture": [
    { key: "description", label: "Description" },
    { key: "color", label: "Color" },
    { key: "dimension", label: "Dimension", placeholder: "e.g. 120 x 60 cm" },
  ],
  "Computer Equipment": computerEquipmentAttrs,
  "Motor Vehicles": motorVehicleAttrs,
  "Plant & Machinery": [
    { key: "serialNumber", label: "Serial Number" },
    { key: "model", label: "Model" },
    { key: "capacityKva", label: "Capacity (KVA)", placeholder: "e.g. 100" },
  ],
  "Plant and Machinery": [
    { key: "serialNumber", label: "Serial Number" },
    { key: "model", label: "Model" },
    { key: "capacityKva", label: "Capacity (KVA)", placeholder: "e.g. 100" },
  ],
  Building: buildingAttrs,
  Land: landAttrs,
};

let globalState: any = {
  loading: false,
  stats: {
    totalAssets: 4,
    activeAssets: 4,
    damagedAssets: 0,
    missingAssets: 0,
    verificationsCount: 2,
    verifiedPassed: 2,
    pendingVerification: 0,
    totalInventoryItems: 5
  },
  assets: [
    {
      id: "ast-001",
      assetId: "NHIA/OG/SQA/OF/0018",
      assetNumber: "NHIA/OG/SQA/OF/0018",
      controlNumber: "CTRL-2026-8801",
      name: "HP LaserJet Enterprise MFP Printer",
      officeDeptUnit: "HQ / SQA Unit",
      coordinator: "Alhaji Bello",
      trackingOfficer: "Musa Ibrahim",
      supervisor: "Director SQA",
      date: "2026-02-01",
      primaryCategory: "Office Equipment",
      subCategory: "Printing & Document Management",
      specificType: "Printers",
      nhiaTagNumber: "NHIA/OG/SQA/OF/0018",
      facilitySite: "HQ",
      specificLocation: "2nd Floor, Room 204",
      yearOfAllocation: "2024",
      assignedCustodian: "Ahmadu Bello",
      operationalStatus: "Active (in-use)",
      acquisitionDate: "2024-03-15",
      acquisitionCost: 850000,
      usefulLifeYears: 5,
      salvageValue: 50000,
      depreciationMethod: "Straight-Line",
      accumulatedDepreciation: 170000,
      netBookValue: 680000,
      physicalCondition: "Excellent",
      lastVerificationDate: "2026-02-05",
      verificationStatus: "Verified & Passed",
      taggingMethod: "QR Code",
      barcodeQrCode: "QR-NHIA-0018801",
      categoryAttributes: {
        serialNumber: "CNB890123",
        powerSpecification: "500W",
        capacityOutput: "45 PPM",
        lastServiceDate: "2026-01-10",
        nextServiceDate: "2026-07-10"
      }
    },
    {
      id: "ast-002",
      assetId: "NHIA/AST/2026/002",
      assetNumber: "NHIA/AST/2026/002",
      controlNumber: "CTRL-2026-8802",
      name: "Toyota Prado Executive SUV 3.5L V6",
      officeDeptUnit: "Kano Zonal Office / Admin",
      coordinator: "Alhaji Danladi Usman",
      trackingOfficer: "Sani Umar",
      supervisor: "Director Zonal Operations",
      date: "2026-01-10",
      primaryCategory: "Motor Vehicles",
      subCategory: "Executive & Official Cars",
      specificType: "Executive SUV",
      nhiaTagNumber: "NHIA/MV/KAN/004",
      facilitySite: "Zonal Office",
      specificLocation: "Kano Branch Parking",
      yearOfAllocation: "2025",
      assignedCustodian: "Alhaji Danladi Usman",
      operationalStatus: "Active (in-use)",
      acquisitionDate: "2025-01-20",
      acquisitionCost: 65000000,
      usefulLifeYears: 7,
      salvageValue: 5000000,
      depreciationMethod: "Straight-Line",
      accumulatedDepreciation: 8571428,
      netBookValue: 56428572,
      physicalCondition: "Good",
      lastVerificationDate: "2026-02-04",
      verificationStatus: "Verified & Passed",
      taggingMethod: "Barcode",
      barcodeQrCode: "QR-NHIA-0028802",
      categoryAttributes: {
        serialNumber: "JTEBH9FJ3008912",
        engineNumber: "1GR-FE-90123",
        licencePlateNumber: "FG-8801-NHIA",
        chassisVinNumber: "JTEBH9FJ3008912",
        insurancePolicy: "Leadway Policy #90812",
        odometerReading: "24,500 Km"
      }
    },
    {
      id: "ast-003",
      assetId: "NHIA/AST/2026/003",
      assetNumber: "NHIA/AST/2026/003",
      controlNumber: "CTRL-2026-8803",
      name: "Cisco Catalyst 9300 48-Port Core Switch",
      officeDeptUnit: "HQ / ICT Unit",
      coordinator: "Grace Danjuma",
      trackingOfficer: "Ahmadu Bello",
      supervisor: "Director ICT",
      date: "2026-01-15",
      primaryCategory: "Computer Equipment",
      subCategory: "Network Infrastructure",
      specificType: "Network Switches",
      nhiaTagNumber: "NHIA/COMP/HQ/003",
      facilitySite: "HQ",
      specificLocation: "Data Center Rack 04",
      yearOfAllocation: "2025",
      assignedCustodian: "Grace Danjuma",
      operationalStatus: "Active (in-use)",
      acquisitionDate: "2025-02-01",
      acquisitionCost: 4800000,
      usefulLifeYears: 5,
      salvageValue: 300000,
      depreciationMethod: "Straight-Line",
      accumulatedDepreciation: 900000,
      netBookValue: 3900000,
      physicalCondition: "Good",
      lastVerificationDate: "2026-02-03",
      verificationStatus: "Verified & Passed",
      taggingMethod: "QR Code",
      barcodeQrCode: "QR-NHIA-0038803",
      categoryAttributes: {
        processor: "Cisco UADP 2.0",
        macAddress: "00:1B:44:11:3A:B7"
      }
    }
  ],
  inventoryItems: [],
  transfers: [
    {
      id: 'atf-1',
      transferNumber: 'ATF-2026-101',
      assetNumber: 'NHIA/OG/SQA/OF/0018',
      assetName: 'HP LaserJet Enterprise MFP Printer',
      fromOffice: 'HQ Main Office',
      toOffice: 'Kano Zonal Office',
      fromCustodian: 'Ahmadu Bello',
      toCustodian: 'Sani Umar',
      status: 'SUBMITTED',
      requestedBy: 'Musa Ibrahim',
      approvedBy: 'Director ICT',
      remarks: 'Reassigned for Zonal Office SQA Operations',
      date: '2026-02-05'
    }
  ],
  verifications: [],
  maintenances: [],
  disposals: [],
  goodsReceipts: [],
  stockIssues: [],
  stockReturns: [],
  historyTimeline: [
    { id: 'h-1', date: '2026-02-01 09:00', assetNumber: 'NHIA/OG/SQA/OF/0018', assetName: 'HP LaserJet Enterprise MFP Printer', action: 'CREATED', fromState: 'Registration', toState: 'HQ / SQA Unit (Ahmadu Bello)', performedBy: 'Musa Ibrahim', referenceNo: 'CTRL-2026-8801', notes: 'Asset Entry Form Saved' },
    { id: 'h-2', date: '2026-02-05 14:30', assetNumber: 'NHIA/OG/SQA/OF/0018', assetName: 'HP LaserJet Enterprise MFP Printer', action: 'VERIFIED', fromState: 'Field Audit', toState: 'Verified & Passed (Excellent)', performedBy: 'Inspector Sarah John', referenceNo: 'GVC-2026-9001', notes: 'Goods Verification Certificate Issued' }
  ]
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function syncDataFromBackend() {
  try {
    globalState.loading = true;
    notify();
    const [assetsRes, transfersRes] = await Promise.all([
      storeManagementApi.getAssets().catch(() => null),
      storeManagementApi.getTransfers().catch(() => null)
    ]);

    if (assetsRes?.success && Array.isArray(assetsRes.data) && assetsRes.data.length > 0) {
      const dbAssets = assetsRes.data.map((item: any) => ({
        ...item,
        assetId: item.assetId || item.assetNumber,
        primaryCategory: item.primaryCategory || item.category,
        subCategory: item.subCategory || item.subcategory,
        assignedCustodian: item.assignedCustodian || item.custodian,
        officeDeptUnit: item.officeDeptUnit || item.department,
        specificLocation: item.specificLocation || item.location,
        acquisitionCost: parseFloat(item.acquisitionCost || item.acquisitionValue || 0),
        netBookValue: parseFloat(item.netBookValue || item.currentValue || 0),
      }));
      globalState.assets = dbAssets;
    }

    if (transfersRes?.success && Array.isArray(transfersRes.data) && transfersRes.data.length > 0) {
      globalState.transfers = transfersRes.data;
    }
  } catch (err) {
    console.warn("Backend API sync fallback to local state:", err);
  } finally {
    globalState.loading = false;
    notify();
  }
}

let initialSyncDone = false;

export function useAssetManagement() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);

    if (!initialSyncDone) {
      initialSyncDone = true;
      syncDataFromBackend();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const registerAsset = async (assetData: any) => {
    const count = globalState.assets.length + 1;
    const newAsset = {
      assetId: assetData.assetId || `NHIA/AST/2026/${String(count).padStart(4, '0')}`,
      assetNumber: assetData.nhiaTagNumber || assetData.assetId || `NHIA/AST/2026/${String(count).padStart(4, '0')}`,
      controlNumber: assetData.controlNumber || `CTRL-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      name: assetData.name || "New Asset Item",
      description: assetData.name || "New Asset Item",
      category: assetData.primaryCategory || "Office Equipment",
      primaryCategory: assetData.primaryCategory || "Office Equipment",
      subCategory: assetData.subCategory || "Printing & Document Management",
      specificType: assetData.specificType || "Printers",
      nhiaTagNumber: assetData.nhiaTagNumber || `NHIA/AST/${Date.now().toString().slice(-4)}`,
      officeDeptUnit: assetData.officeDeptUnit || "HQ / Admin",
      department: assetData.officeDeptUnit || "HQ / Admin",
      coordinator: assetData.coordinator || "Coordinator Name",
      trackingOfficer: assetData.trackingOfficer || "Tracking Officer",
      supervisor: assetData.supervisor || "Supervisor Name",
      facilitySite: assetData.facilitySite || "HQ",
      location: assetData.specificLocation || "Room 101",
      specificLocation: assetData.specificLocation || "Room 101",
      yearOfAllocation: assetData.yearOfAllocation || "2026",
      assignedCustodian: assetData.assignedCustodian || "Custodian Name",
      custodian: assetData.assignedCustodian || "Custodian Name",
      operationalStatus: assetData.operationalStatus || "Active (in-use)",
      status: "ACTIVE",
      acquisitionDate: assetData.acquisitionDate || new Date().toISOString().split('T')[0],
      acquisitionCost: parseFloat(assetData.acquisitionCost || 0),
      acquisitionValue: parseFloat(assetData.acquisitionCost || 0),
      usefulLifeYears: parseInt(assetData.usefulLifeYears || 5),
      salvageValue: parseFloat(assetData.salvageValue || 0),
      depreciationMethod: assetData.depreciationMethod || "Straight-Line",
      accumulatedDepreciation: parseFloat(assetData.accumulatedDepreciation || 0),
      netBookValue: parseFloat(assetData.netBookValue || assetData.acquisitionCost || 0),
      physicalCondition: assetData.physicalCondition || "Excellent",
      categoryAttributes: {
        ...(assetData.categoryAttributes || {}),
        ...(assetData.serviceability ? { serviceability: assetData.serviceability } : {}),
      },
      lastVerificationDate: assetData.lastVerificationDate || null,
      verificationStatus: assetData.verificationStatus || "Verified & Passed",
      taggingMethod: assetData.taggingMethod || "QR Code",
      barcodeQrCode: `QR-NHIA-${Date.now().toString().slice(-6)}`,
    };

    const historyEntry = {
      id: `h-${Date.now()}`,
      date: new Date().toLocaleString(),
      assetNumber: newAsset.assetId,
      assetName: newAsset.name,
      action: 'CREATED',
      fromState: 'Registration',
      toState: `${newAsset.officeDeptUnit} (${newAsset.assignedCustodian})`,
      performedBy: newAsset.trackingOfficer,
      referenceNo: newAsset.controlNumber,
      notes: 'Asset Entry Form Saved & Persisted to DB'
    };

    globalState = {
      ...globalState,
      assets: [newAsset, ...globalState.assets],
      historyTimeline: [historyEntry, ...globalState.historyTimeline]
    };
    notify();

    try {
      const res = await storeManagementApi.createAsset(newAsset);
      if (res.success && res.data) {
        syncDataFromBackend();
      }
    } catch (err) {
      console.error("Error creating asset in DB:", err);
    }
  };

  const addTransfer = async (transferData: any) => {
    const count = globalState.transfers.length + 100;
    const newTrf = {
      id: `atf-${Date.now()}`,
      transferNumber: `ATF-2026-${count}`,
      assetNumber: transferData.assetNumber,
      assetName: transferData.assetName,
      fromOffice: transferData.fromOffice,
      toOffice: transferData.toOffice,
      fromCustodian: transferData.fromCustodian,
      toCustodian: transferData.toCustodian,
      status: 'SUBMITTED',
      requestedBy: transferData.requestedBy,
      remarks: transferData.remarks,
      date: new Date().toISOString().split('T')[0]
    };

    globalState = {
      ...globalState,
      transfers: [newTrf, ...globalState.transfers]
    };
    notify();

    try {
      const res = await storeManagementApi.createTransfer(newTrf);
      if (res.success) {
        syncDataFromBackend();
      }
    } catch (err) {
      console.error("Error creating transfer in DB:", err);
    }
  };

  const updateTransferStatus = async (id: string | number, newStatus: string) => {
    const updatedTransfers = globalState.transfers.map((t: any) =>
      t.id === id || t.transferNumber === id ? { ...t, status: newStatus } : t
    );

    globalState = {
      ...globalState,
      transfers: updatedTransfers
    };
    notify();

    try {
      await storeManagementApi.updateTransfer(id, { status: newStatus });
    } catch (err) {
      console.error("Error updating transfer status in DB:", err);
    }
  };

  return {
    ...state,
    registerAsset,
    addTransfer,
    updateTransferStatus,
    refetchAssets: syncDataFromBackend,
  };
}
