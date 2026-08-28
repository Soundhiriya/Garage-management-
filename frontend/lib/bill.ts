import type { JobCardDetails } from "@/services/register";
import type { WorkflowJobCard } from "@/services/workflow";
import type { GarageSettings } from "@/services/settings";
import { groupComplaintByService, type GroupedComplaint } from "@/lib/complaint";

export type BillPartRow = {
  sno: number;
  partNumber: string;
  description: string;
  hsn: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
};

export type BillLabourRow = {
  sno: number;
  description: string;
  rate: number;
  total: number;
};

export type BillData = {
  garage: { name: string; address: string; gstin: string; phone: string; email: string };
  customer: { name: string; address: string; phone: string };
  vehicle: {
    registrationNumber: string;
    chassisNumber: string;
    make: string;
    model: string;
    modelYear: string;
    odometer: string;
  };
  jobCard: { number: string; date: string };
  invoice: { number: string; date: string };
  serviceTypes: string[];
  complaintGroups: GroupedComplaint[];
  serviceItems: GroupedComplaint[];
  complaintRaw: string;
  parts: BillPartRow[];
  partsTotal: number;
  labour: BillLabourRow[];
  labourTotal: number;
  summary: {
    totalTaxableAmount: number;
    totalCgst: number;
    totalSgst: number;
    total: number;
    discount: number;
    roundOff: number;
    grandTotal: number;
  };
  payment: { paidAmount: number; balanceAmount: number; paymentStatus: string };
};

// Vehicle make/model/year aren't captured anywhere in the current schema yet;
// read them defensively so the bill shows "-" instead of fabricating values.
type VehicleExtras = { make?: string; model?: string; modelYear?: string | number };

export function buildBillData(jobCard: JobCardDetails, workflow: WorkflowJobCard, shop: GarageSettings | undefined): BillData {
  const vehicleExtras = jobCard.vehicle as unknown as VehicleExtras;

  const parts: BillPartRow[] = workflow.partsItems.map((p, index) => {
    const qty = Number(p.qty) || 0;
    const unitPrice = Number(p.price) || 0;
    const taxableAmount = qty * unitPrice;
    const gstPercent = Number(p.gstPercent) || 0;
    const gstAmount = taxableAmount * (gstPercent / 100);
    return {
      sno: index + 1,
      partNumber: p.partNumber || "-",
      description: p.name || "-",
      hsn: "-",
      qty,
      unitPrice,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount,
      gstPercent,
      gstAmount,
      total: taxableAmount + gstAmount
    };
  });

  const partsTotal = parts.reduce((sum, p) => sum + p.total, 0);
  const partsTaxable = parts.reduce((sum, p) => sum + p.taxableAmount, 0);
  const partsGst = parts.reduce((sum, p) => sum + p.gstAmount, 0);

  const labour: BillLabourRow[] = workflow.labourItems.map((l, index) => ({
    sno: index + 1,
    description: l.description || "-",
    rate: Number(l.rate) || 0,
    total: Number(l.rate) || 0
  }));
  const labourTotal = labour.reduce((sum, l) => sum + l.total, 0);

  const totalTaxableAmount = partsTaxable + labourTotal;
  const totalCgst = partsGst / 2;
  const totalSgst = partsGst / 2;
  const total = totalTaxableAmount + totalCgst + totalSgst;
  const discount = Number(workflow.discountAmount) || 0;
  const afterDiscount = Math.max(0, total - discount);
  const grandTotal = Math.round(afterDiscount);
  const roundOff = grandTotal - afterDiscount;

  const serviceTypes = workflow.serviceTypes
    ? workflow.serviceTypes.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const complaintGroups = groupComplaintByService(jobCard.complaint);

  // Each service type appears exactly once, with all of its selected issues
  // combined on that one line. A service with no selected issues is omitted.
  const serviceItems: GroupedComplaint[] = complaintGroups.filter((group) => group.issues.length > 0);

  // Some Job Cards carry a free-text complaint that doesn't fit the
  // "Service: Issue" pattern groupComplaintByService expects (e.g. entries
  // created outside the full wizard) — fall back to showing it verbatim
  // rather than silently hiding the complaint section.
  const complaintRaw = !serviceItems.length ? (jobCard.complaint ?? "").trim() : "";

  return {
    garage: {
      name: shop?.name || "-",
      address: shop?.address || "-",
      gstin: shop?.gstin || "-",
      phone: shop?.phone || "-",
      email: shop?.email || "-"
    },
    customer: {
      name: jobCard.customer.name || "-",
      address: jobCard.customer.address || "-",
      phone: jobCard.customer.phone || "-"
    },
    vehicle: {
      registrationNumber: jobCard.vehicle.registrationNumber || "-",
      chassisNumber: jobCard.vehicle.chassisNumber || "-",
      make: vehicleExtras?.make || "-",
      model: vehicleExtras?.model || "-",
      modelYear: vehicleExtras?.modelYear ? String(vehicleExtras.modelYear) : "-",
      odometer: jobCard.vehicle.currentKm != null ? `${jobCard.vehicle.currentKm.toLocaleString("en-IN")} KM` : "-"
    },
    jobCard: {
      number: jobCard.jobCardNumber || "-",
      date: jobCard.createdAt ? new Date(jobCard.createdAt).toLocaleDateString("en-IN") : "-"
    },
    invoice: {
      number: workflow.invoiceNumber || "-",
      date: workflow.invoiceNumber
        ? new Date(workflow.updatedAt).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN")
    },
    serviceTypes,
    complaintGroups,
    serviceItems,
    complaintRaw,
    parts,
    partsTotal,
    labour,
    labourTotal,
    summary: { totalTaxableAmount, totalCgst, totalSgst, total, discount, roundOff, grandTotal },
    payment: {
      paidAmount: Number(workflow.paidAmount) || 0,
      balanceAmount: Number(workflow.balanceAmount) || 0,
      paymentStatus: workflow.paymentStatus || "-"
    }
  };
}
