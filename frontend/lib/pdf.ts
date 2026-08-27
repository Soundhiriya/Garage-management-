import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { JobCardDetails } from "@/services/register";
import type { LabourItem, PartItem, WorkItem } from "@/services/workflow";
import type { GarageSettings } from "@/services/settings";

// jsPDF's built-in core fonts (Helvetica etc.) do not include the ₹ glyph, so it renders
// as a broken box in the PDF. Use a plain "Rs." prefix with proper thousands separators instead.
const pdfAmount = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
function money(value: number) {
  return `Rs. ${pdfAmount.format(value || 0)}`;
}

const INK = [15, 23, 42] as const;
const MUTED = [100, 116, 139] as const;
const LINE = [203, 213, 225] as const;
const BRAND = [13, 118, 110] as const;
const PAGE_LEFT = 14;
const PAGE_RIGHT = 196;

function itemRows(partsItems: PartItem[], labourItems: LabourItem[]) {
  let sl = 0;
  return [
    ...partsItems.map((p) => {
      sl += 1;
      return [
        String(sl),
        p.name + (p.partNumber ? ` (${p.partNumber})` : ""),
        String(p.qty),
        money(p.price),
        `${p.gstPercent}%`,
        money((Number(p.qty) || 0) * (Number(p.price) || 0))
      ];
    }),
    ...labourItems.map((l) => {
      sl += 1;
      return [
        String(sl),
        l.description,
        String(l.qty),
        money(l.rate),
        `${l.gstPercent}%`,
        money((Number(l.qty) || 0) * (Number(l.rate) || 0))
      ];
    })
  ];
}

function drawHeader(doc: jsPDF, data: JobCardDetails | undefined, title: string, shop?: GarageSettings) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(shop?.name || "GARAGE MANAGEMENT", PAGE_LEFT, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(shop?.address || "Service center address line, City, State - PIN", PAGE_LEFT, 23);
  doc.text(`GSTIN: ${shop?.gstin || "-"}  |  Phone: ${shop?.phone || "-"}`, PAGE_LEFT, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND);
  doc.text(title, PAGE_RIGHT, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, PAGE_RIGHT, 23, { align: "right" });
  doc.text(`Job Card: ${data?.jobCardNumber ?? "-"}`, PAGE_RIGHT, 28, { align: "right" });

  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(PAGE_LEFT, 33, PAGE_RIGHT, 33);
  doc.setLineWidth(0.2);

  // Two bordered info boxes: Customer and Vehicle
  const boxTop = 39;
  const boxHeight = 30;
  const boxWidth = (PAGE_RIGHT - PAGE_LEFT - 6) / 2;
  const customerBoxX = PAGE_LEFT;
  const vehicleBoxX = PAGE_LEFT + boxWidth + 6;

  doc.setDrawColor(...LINE);
  doc.roundedRect(customerBoxX, boxTop, boxWidth, boxHeight, 1.5, 1.5);
  doc.roundedRect(vehicleBoxX, boxTop, boxWidth, boxHeight, 1.5, 1.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND);
  doc.text("CUSTOMER", customerBoxX + 4, boxTop + 6);
  doc.text("VEHICLE", vehicleBoxX + 4, boxTop + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const customerLines = [data?.customer.name ?? "-", data?.customer.phone ?? "-", data?.customer.address ?? "-"];
  const vehicleLines = [
    `Vehicle No: ${data?.vehicle.registrationNumber ?? "-"}`,
    `Chassis No: ${data?.vehicle.chassisNumber ?? "-"}`,
    `Current KM: ${data?.vehicle.currentKm != null ? data.vehicle.currentKm.toLocaleString("en-IN") : "-"}`
  ];
  customerLines.forEach((line, i) => doc.text(line, customerBoxX + 4, boxTop + 12 + i * 5.5, { maxWidth: boxWidth - 8 }));
  vehicleLines.forEach((line, i) => doc.text(line, vehicleBoxX + 4, boxTop + 12 + i * 5.5, { maxWidth: boxWidth - 8 }));

  return boxTop + boxHeight + 8;
}

function drawTotalsBox(doc: jsPDF, startY: number, rows: [string, string][]) {
  const boxWidth = 78;
  const rowHeight = 6.5;
  const boxX = PAGE_RIGHT - boxWidth;
  const boxHeight = rows.length * rowHeight + 6;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(boxX, startY, boxWidth, boxHeight);

  let y = startY + 7;
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1;
    if (isLast) {
      doc.setFillColor(...BRAND);
      doc.rect(boxX, y - 5, boxWidth, rowHeight + 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
    } else {
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    doc.text(label, boxX + 4, y);
    doc.text(value, boxX + boxWidth - 4, y, { align: "right" });
    y += rowHeight;
  });

  return startY + boxHeight;
}

function drawFooter(doc: jsPDF, y: number, note?: string) {
  doc.setDrawColor(...LINE);
  doc.line(PAGE_LEFT, y, PAGE_RIGHT, y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(note ?? "Thank you for choosing our service.", PAGE_LEFT, y + 6);
  doc.text("This is a computer-generated document.", PAGE_RIGHT, y + 6, { align: "right" });
}

function lastAutoTableY(doc: jsPDF) {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function ensureSpace(doc: jsPDF, y: number, needed = 40) {
  if (y + needed > 285) {
    doc.addPage();
    return 16;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND);
  doc.text(title, PAGE_LEFT, y);
  doc.setDrawColor(...LINE);
  doc.line(PAGE_LEFT, y + 2, PAGE_RIGHT, y + 2);
  return y + 8;
}

type JobCardPdfParams = {
  data: JobCardDetails | undefined;
  shop?: GarageSettings;
  serviceTypes: string[];
  complaint: string;
  odometerKm: string;
  expectedDeliveryAt: string;
  workItems: WorkItem[];
  partsItems: PartItem[];
  labourItems: LabourItem[];
};

// Full Job Card record (Steps 1-6): service visit, work, parts, labour — everything
// collected before the record moves to the Estimate stage.
function buildJobCardPdfDoc(params: JobCardPdfParams) {
  const { data, shop, serviceTypes, complaint, odometerKm, expectedDeliveryAt, workItems, partsItems, labourItems } = params;
  const doc = new jsPDF();
  let y = drawHeader(doc, data, "JOB CARD", shop);

  // Service Visit
  y = drawSectionTitle(doc, y, "SERVICE VISIT");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Odometer / KM: ${odometerKm || "-"}`, PAGE_LEFT, y);
  doc.text(`Expected Delivery: ${expectedDeliveryAt ? new Date(expectedDeliveryAt).toLocaleString("en-IN") : "-"}`, 110, y);
  y += 6;
  doc.text(`Service Type: ${serviceTypes.length ? serviceTypes.join(", ") : "-"}`, PAGE_LEFT, y, { maxWidth: 182 });
  y += 6;
  if (complaint) {
    doc.setFont("helvetica", "bold");
    doc.text("Complaint:", PAGE_LEFT, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(complaint, 160);
    doc.text(wrapped, PAGE_LEFT + 20, y);
    y += wrapped.length * 5 + 4;
  } else {
    y += 4;
  }

  // Work
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, y, "WORK");
  if (workItems.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_LEFT, right: PAGE_LEFT },
      head: [["Description", "Technician", "Status", "Notes"]],
      body: workItems.map((w) => [w.description, w.technician ?? "-", w.status, w.notes ?? "-"]),
      styles: { fontSize: 9, cellPadding: 2.5, textColor: INK as unknown as [number, number, number], lineColor: LINE as unknown as [number, number, number] },
      headStyles: { fillColor: BRAND as unknown as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      theme: "grid"
    });
    y = lastAutoTableY(doc) + 10;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No work items added.", PAGE_LEFT, y);
    y += 10;
  }

  // Parts + Labour
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, y, "PARTS & LABOUR");
  if (partsItems.length || labourItems.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_LEFT, right: PAGE_LEFT },
      head: [["Sl.No", "Description", "Qty", "Rate", "GST %", "Amount"]],
      body: itemRows(partsItems, labourItems),
      styles: { fontSize: 9, cellPadding: 2.5, textColor: INK as unknown as [number, number, number], lineColor: LINE as unknown as [number, number, number] },
      headStyles: { fillColor: BRAND as unknown as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 14, halign: "center" }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "center" }, 5: { halign: "right" } },
      theme: "grid"
    });
    y = lastAutoTableY(doc) + 8;

    const totals = computeTotals(partsItems, labourItems);
    y = ensureSpace(doc, y, 30);
    y = drawTotalsBox(doc, y, [
      ["Subtotal", money(totals.subtotal)],
      ["GST", money(totals.gstTotal)],
      ["Total (before discount)", money(totals.subtotal + totals.gstTotal)]
    ]);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No parts or labour added.", PAGE_LEFT, y);
    y += 10;
  }

  drawFooter(doc, Math.max(y + 10, 270), "Final estimate, GST, and discount are confirmed at the Estimate stage.");

  return { doc, filename: `JobCard-${data?.jobCardNumber ?? "job-card"}.pdf` };
}

export function downloadJobCardPdf(params: JobCardPdfParams) {
  const { doc, filename } = buildJobCardPdfDoc(params);
  doc.save(filename);
}

// Shares the PDF as an actual file attachment via the device's native share sheet
// (which lists WhatsApp) when supported — mainly Android/iOS mobile browsers over HTTPS.
// Falls back to downloading the file and opening a WhatsApp chat so it can be attached manually.
export async function shareJobCardPdfOnWhatsApp(params: JobCardPdfParams) {
  const { doc, filename } = buildJobCardPdfDoc(params);
  const blob = doc.output("blob") as Blob;
  const file = new File([blob], filename, { type: "application/pdf" });
  const shareText = `Job Card ${params.data?.jobCardNumber ?? ""} for ${params.data?.customer.name ?? "customer"}`;

  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename, text: shareText });
      return;
    } catch {
      // user cancelled the share sheet, or it failed — fall through to the manual fallback
    }
  }

  doc.save(filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n(PDF downloaded — attach it from your Downloads in WhatsApp)`)}`, "_blank");
}

function computeTotals(partsItems: PartItem[], labourItems: LabourItem[]) {
  const partsSubtotal = partsItems.reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const partsGst = partsItems.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.price) || 0)) * ((Number(p.gstPercent) || 0) / 100), 0);
  const labourSubtotal = labourItems.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const labourGst = labourItems.reduce((sum, l) => sum + ((Number(l.qty) || 0) * (Number(l.rate) || 0)) * ((Number(l.gstPercent) || 0) / 100), 0);
  return { subtotal: partsSubtotal + labourSubtotal, gstTotal: partsGst + labourGst };
}
