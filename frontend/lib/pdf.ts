import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { JobCardDetails } from "@/services/register";
import type {
  LabourItem,
  PartItem,
  WorkItem
} from "@/services/workflow";
import type { GarageSettings } from "@/services/settings";

import { groupComplaintByService } from "@/lib/complaint";

// ============================================================
// MONEY FORMAT
// ============================================================

const pdfAmount = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

function money(value: number) {
  return `Rs. ${pdfAmount.format(value || 0)}`;
}

// ============================================================
// COLORS
// ============================================================

const INK = [15, 23, 42] as const;
const MUTED = [100, 116, 139] as const;
const LINE = [203, 213, 225] as const;
const BRAND = [13, 118, 110] as const;

const WHITE = [255, 255, 255] as const;

// ============================================================
// PAGE
// ============================================================

const PAGE_LEFT = 14;
const PAGE_RIGHT = 196;

// ============================================================
// GST
// ============================================================

const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

// ============================================================
// PARTS ROWS
// ============================================================

function partsRows(partsItems: PartItem[]) {
  return partsItems.map((p, index) => {
    const qty = Number(p.qty) || 0;
    const price = Number(p.price) || 0;

    const base = qty * price;

    const cgst = base * CGST_RATE;
    const sgst = base * SGST_RATE;

    const total = base + cgst + sgst;

    return [
      String(index + 1),
      p.name + (p.partNumber ? ` (${p.partNumber})` : ""),
      String(p.qty),
      money(price),
      money(cgst),
      money(sgst),
      money(total)
    ];
  });
}

// ============================================================
// PARTS TOTAL
// ============================================================

function partsTotal(partsItems: PartItem[]) {
  return partsItems.reduce((sum, p) => {
    const qty = Number(p.qty) || 0;
    const price = Number(p.price) || 0;

    const base = qty * price;

    const cgst = base * CGST_RATE;
    const sgst = base * SGST_RATE;

    return sum + base + cgst + sgst;
  }, 0);
}

// ============================================================
// LABOUR ROWS
// ============================================================

function labourRows(labourItems: LabourItem[]) {
  return labourItems.map((l, index) => {
    const qty = Number(l.qty) || 0;
    const rate = Number(l.rate) || 0;

    const total = qty * rate;

    return [
      String(index + 1),
      l.description,
      money(rate),
      money(total)
    ];
  });
}

// ============================================================
// LABOUR TOTAL
// ============================================================

function labourTotal(labourItems: LabourItem[]) {
  return labourItems.reduce((sum, l) => {
    const qty = Number(l.qty) || 0;
    const rate = Number(l.rate) || 0;

    return sum + qty * rate;
  }, 0);
}

// ============================================================
// PDF HEADER
// ============================================================

function drawHeader(
  doc: jsPDF,
  data: JobCardDetails | undefined,
  title: string,
  shop?: GarageSettings,
  vehicleLinesOverride?: string[]
) {
  // ----------------------------------------------------------
  // GARAGE NAME
  // ----------------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);

  doc.text(
    shop?.name || "GARAGE MANAGEMENT",
    PAGE_LEFT,
    17
  );

  // ----------------------------------------------------------
  // GARAGE ADDRESS
  // ----------------------------------------------------------

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  doc.text(
    shop?.address ||
      "Service center address line, City, State - PIN",
    PAGE_LEFT,
    23
  );

  // ----------------------------------------------------------
  // GST + PHONE
  // ----------------------------------------------------------

  doc.text(
    `GSTIN: ${shop?.gstin || "-"}  |  Phone: ${
      shop?.phone || "-"
    }`,
    PAGE_LEFT,
    28
  );

  // ----------------------------------------------------------
  // DOCUMENT TITLE
  // ----------------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND);

  doc.text(
    title,
    PAGE_RIGHT,
    17,
    {
      align: "right"
    }
  );

  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  doc.text(
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
    PAGE_RIGHT,
    23,
    {
      align: "right"
    }
  );

  // ----------------------------------------------------------
  // JOB CARD NUMBER
  // ----------------------------------------------------------

  doc.text(
    `Job Card: ${data?.jobCardNumber ?? "-"}`,
    PAGE_RIGHT,
    28,
    {
      align: "right"
    }
  );

  // ----------------------------------------------------------
  // HEADER LINE
  // ----------------------------------------------------------

  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);

  doc.line(
    PAGE_LEFT,
    32,
    PAGE_RIGHT,
    32
  );

  doc.setLineWidth(0.2);

  // ==========================================================
  // CUSTOMER / VEHICLE BOXES
  // ==========================================================

  const boxTop = 36;
  const boxHeight = 22;

  const boxWidth =
    (PAGE_RIGHT - PAGE_LEFT - 6) / 2;

  const customerBoxX = PAGE_LEFT;

  const vehicleBoxX =
    PAGE_LEFT + boxWidth + 6;

  // ----------------------------------------------------------
  // BOXES
  // ----------------------------------------------------------

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);

  doc.roundedRect(
    customerBoxX,
    boxTop,
    boxWidth,
    boxHeight,
    1.5,
    1.5
  );

  doc.roundedRect(
    vehicleBoxX,
    boxTop,
    boxWidth,
    boxHeight,
    1.5,
    1.5
  );

  // ----------------------------------------------------------
  // BOX HEADINGS
  // ----------------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);

  doc.text(
    "CUSTOMER",
    customerBoxX + 3,
    boxTop + 5
  );

  doc.text(
    "VEHICLE",
    vehicleBoxX + 3,
    boxTop + 5
  );

  // ----------------------------------------------------------
  // CUSTOMER DETAILS
  // ----------------------------------------------------------

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);

  const customerLines = [
    data?.customer.name ?? "-",
    data?.customer.phone ?? "-",
    data?.customer.address ?? "-"
  ];

  customerLines.forEach((line, index) => {
    doc.text(
      line,
      customerBoxX + 3,
      boxTop + 10 + index * 4.5,
      {
        maxWidth: boxWidth - 6
      }
    );
  });

  // ----------------------------------------------------------
  // VEHICLE DETAILS
  // ----------------------------------------------------------

  const vehicleLines =
    vehicleLinesOverride ?? [
      `Vehicle No: ${
        data?.vehicle.registrationNumber ?? "-"
      }`,
      `Chassis No: ${
        data?.vehicle.chassisNumber ?? "-"
      }`
    ];

  vehicleLines.forEach((line, index) => {
    doc.text(
      line,
      vehicleBoxX + 3,
      boxTop + 10 + index * 4.5,
      {
        maxWidth: boxWidth - 6
      }
    );
  });

  return boxTop + boxHeight + 5;
}

// ============================================================
// PROFESSIONAL BILLING SUMMARY
// ============================================================

function drawTotalsBox(
  doc: jsPDF,
  startY: number,
  rows: [string, string][]
) {
  // ----------------------------------------------------------
  // DIMENSIONS
  // ----------------------------------------------------------

  const boxWidth = 82;
  const headerHeight = 8;
  const rowHeight = 6.5;
  const bottomPadding = 4;

  const boxX =
    PAGE_RIGHT - boxWidth;

  const boxHeight =
    headerHeight +
    rows.length * rowHeight +
    bottomPadding;

  // ----------------------------------------------------------
  // OUTER BORDER
  // ----------------------------------------------------------

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);

  doc.roundedRect(
    boxX,
    startY,
    boxWidth,
    boxHeight,
    1.5,
    1.5
  );

  // ----------------------------------------------------------
  // HEADER BACKGROUND
  // ----------------------------------------------------------

  doc.setFillColor(...BRAND);

  doc.roundedRect(
    boxX,
    startY,
    boxWidth,
    headerHeight,
    1.5,
    1.5,
    "F"
  );

  // Fill bottom corners of header
  doc.rect(
    boxX,
    startY + headerHeight - 1.5,
    boxWidth,
    1.5,
    "F"
  );

  // ----------------------------------------------------------
  // HEADER TEXT
  // ----------------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);

  doc.text(
    "BILLING SUMMARY",
    boxX + 4,
    startY + 5.5
  );

  // ----------------------------------------------------------
  // START ROW POSITION
  // ----------------------------------------------------------

  let y =
    startY +
    headerHeight +
    5;

  // ----------------------------------------------------------
  // ROWS
  // ----------------------------------------------------------

  rows.forEach(
    ([label, value], index) => {
      const isLast =
        index === rows.length - 1;

      // ======================================================
      // TOTAL AMOUNT
      // ======================================================

      if (isLast) {
        // Highlight total row
        doc.setFillColor(...BRAND);

        doc.roundedRect(
          boxX + 1,
          y - 4.5,
          boxWidth - 2,
          rowHeight + 2,
          1,
          1,
          "F"
        );

        // Total label
        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(10);

        doc.setTextColor(
          ...WHITE
        );

        doc.text(
          label,
          boxX + 4,
          y + 1
        );

        // Total amount
        doc.text(
          value,
          boxX + boxWidth - 4,
          y + 1,
          {
            align: "right"
          }
        );
      }

      // ======================================================
      // NORMAL ROW
      // ======================================================

      else {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8.5);

        doc.setTextColor(
          ...INK
        );

        // Label
        doc.text(
          label,
          boxX + 4,
          y
        );

        // Amount
        doc.text(
          value,
          boxX + boxWidth - 4,
          y,
          {
            align: "right"
          }
        );

        // Separator
        if (
          index <
          rows.length - 2
        ) {
          doc.setDrawColor(
            ...LINE
          );

          doc.setLineWidth(
            0.15
          );

          doc.line(
            boxX + 4,
            y + 2.5,
            boxX + boxWidth - 4,
            y + 2.5
          );
        }
      }

      y += rowHeight;
    }
  );

  return startY + boxHeight;
}

// ============================================================
// FOOTER
// ============================================================

function drawFooter(
  doc: jsPDF,
  y: number,
  note?: string
) {
  // ----------------------------------------------------------
  // LINE
  // ----------------------------------------------------------

  doc.setDrawColor(...LINE);

  doc.line(
    PAGE_LEFT,
    y,
    PAGE_RIGHT,
    y
  );

  // ----------------------------------------------------------
  // LEFT NOTE
  // ----------------------------------------------------------

  doc.setFont(
    "helvetica",
    "italic"
  );

  doc.setFontSize(7.5);

  doc.setTextColor(
    ...MUTED
  );

  doc.text(
    note ??
      "Thank you for choosing our service.",
    PAGE_LEFT,
    y + 5
  );

  // ----------------------------------------------------------
  // RIGHT NOTE
  // ----------------------------------------------------------

  doc.text(
    "This is a computer-generated document.",
    PAGE_RIGHT,
    y + 5,
    {
      align: "right"
    }
  );
}

// ============================================================
// AUTO TABLE Y POSITION
// ============================================================

function lastAutoTableY(doc: jsPDF) {
  return (
    doc as unknown as {
      lastAutoTable: {
        finalY: number;
      };
    }
  ).lastAutoTable.finalY;
}

// ============================================================
// SECTION TITLE
// ============================================================

function drawSectionTitle(
  doc: jsPDF,
  y: number,
  title: string
) {
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.setTextColor(
    ...BRAND
  );

  doc.text(
    title,
    PAGE_LEFT,
    y
  );

  doc.setDrawColor(
    ...LINE
  );

  doc.line(
    PAGE_LEFT,
    y + 1.5,
    PAGE_RIGHT,
    y + 1.5
  );

  return y + 5.5;
}

// ============================================================
// JOB CARD PDF PARAMETERS
// ============================================================

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

// ============================================================
// BUILD JOB CARD PDF
// ============================================================

function buildJobCardPdfDoc(
  params: JobCardPdfParams
) {
  const {
    data,
    shop,
    serviceTypes,
    complaint,
    workItems,
    partsItems,
    labourItems
  } = params;

  // ----------------------------------------------------------
  // CREATE DOCUMENT
  // ----------------------------------------------------------

  const doc = new jsPDF();

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  let y = drawHeader(
    doc,
    data,
    "JOB CARD",
    shop
  );

  // ==========================================================
  // SERVICE VISIT
  // ==========================================================

  y = drawSectionTitle(
    doc,
    y,
    "SERVICE VISIT"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8.5);

  doc.setTextColor(
    ...INK
  );

  doc.text(
    "Complaint:",
    PAGE_LEFT,
    y
  );

  y += 4.5;

  // ----------------------------------------------------------
  // COMPLAINT GROUPS
  // ----------------------------------------------------------

  const groups =
    groupComplaintByService(
      complaint
    );

  if (groups.length) {
    groups.forEach(
      (group) => {
        doc.setFont(
          "helvetica",
          "bold"
        );

        const serviceLabel =
          `•  ${group.service}: `;

        doc.text(
          serviceLabel,
          PAGE_LEFT + 3,
          y
        );

        const serviceWidth =
          doc.getTextWidth(
            serviceLabel
          );

        doc.setFont(
          "helvetica",
          "normal"
        );

        const wrapped =
          doc.splitTextToSize(
            group.issues.join(
              ", "
            ),
            177 -
              serviceWidth
          );

        doc.text(
          wrapped,
          PAGE_LEFT +
            3 +
            serviceWidth,
          y,
          {
            maxWidth:
              177 -
              serviceWidth
          }
        );

        y +=
          wrapped.length * 4;
      }
    );

    y += 1.5;
  }

  // ----------------------------------------------------------
  // SERVICE TYPES FALLBACK
  // ----------------------------------------------------------

  else if (
    serviceTypes.length
  ) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    serviceTypes.forEach(
      (type) => {
        const wrapped =
          doc.splitTextToSize(
            `•  ${type}`,
            177
          );

        doc.text(
          wrapped,
          PAGE_LEFT + 3,
          y,
          {
            maxWidth: 177
          }
        );

        y +=
          wrapped.length * 4;
      }
    );

    y += 1.5;
  }

  // ----------------------------------------------------------
  // NO COMPLAINT
  // ----------------------------------------------------------

  else {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "-",
      PAGE_LEFT + 3,
      y
    );

    y += 4.5;
  }

  y += 2;

  // ==========================================================
  // TABLE STYLES
  // ==========================================================

  const compactTable = {
    fontSize: 7.5,

    cellPadding: 1.4,

    textColor:
      INK as unknown as [
        number,
        number,
        number
      ],

    lineColor:
      LINE as unknown as [
        number,
        number,
        number
      ]
  };

  const compactHead = {
    fillColor:
      BRAND as unknown as [
        number,
        number,
        number
      ],

    textColor:
      WHITE as unknown as [
        number,
        number,
        number
      ],

    fontStyle:
      "bold" as const,

    fontSize: 7.5
  };

  // ==========================================================
  // WORK
  // ==========================================================

  y = drawSectionTitle(
    doc,
    y,
    "WORK"
  );

  if (workItems.length) {
    autoTable(doc, {
      startY: y,

      margin: {
        left: PAGE_LEFT,
        right: PAGE_LEFT
      },

      head: [
        [
          "Description",
          "Technician",
          "Status",
          "Notes"
        ]
      ],

      body: workItems.map(
        (w) => [
          w.description,
          w.technician ?? "-",
          w.status,
          w.notes ?? "-"
        ]
      ),

      styles:
        compactTable,

      headStyles:
        compactHead,

      theme: "grid"
    });

    y =
      lastAutoTableY(
        doc
      ) + 5;
  } else {
    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      ...MUTED
    );

    doc.text(
      "No work items added.",
      PAGE_LEFT,
      y
    );

    y += 5;
  }

  // ==========================================================
  // PARTS
  // ==========================================================

  y = drawSectionTitle(
    doc,
    y,
    "PARTS"
  );

  if (partsItems.length) {
    autoTable(doc, {
      startY: y,

      margin: {
        left: PAGE_LEFT,
        right: PAGE_LEFT
      },

      head: [
        [
          "Sl.No",
          "Part Name",
          "Qty",
          "Price",
          "CGST 9%",
          "SGST 9%",
          "Amount"
        ]
      ],

      body:
        partsRows(
          partsItems
        ),

      styles:
        compactTable,

      headStyles:
        compactHead,

      columnStyles: {
        0: {
          cellWidth: 12,
          halign: "center"
        },

        2: {
          halign: "center"
        },

        3: {
          halign: "right"
        },

        4: {
          halign: "right"
        },

        5: {
          halign: "right"
        },

        6: {
          halign: "right"
        }
      },

      theme: "grid"
    });

    y =
      lastAutoTableY(
        doc
      ) + 4;

    // --------------------------------------------------------
    // PARTS TOTAL
    // --------------------------------------------------------

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(8.5);

    doc.setTextColor(
      ...INK
    );

    doc.text(
      `Parts Total: ${money(
        partsTotal(partsItems)
      )}`,
      PAGE_RIGHT,
      y,
      {
        align: "right"
      }
    );

    y += 5.5;
  } else {
    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      ...MUTED
    );

    doc.text(
      "No parts added.",
      PAGE_LEFT,
      y
    );

    y += 5;
  }

  // ==========================================================
  // LABOUR
  // ==========================================================

  y = drawSectionTitle(
    doc,
    y,
    "LABOUR"
  );

  if (labourItems.length) {
    autoTable(doc, {
      startY: y,

      margin: {
        left: PAGE_LEFT,
        right: PAGE_LEFT
      },

      head: [
        [
          "Sl.No",
          "Labour Description",
          "Rate",
          "Total Amount"
        ]
      ],

      body:
        labourRows(
          labourItems
        ),

      styles:
        compactTable,

      headStyles:
        compactHead,

      columnStyles: {
        0: {
          cellWidth: 12,
          halign: "center"
        },

        2: {
          halign: "right"
        },

        3: {
          halign: "right"
        }
      },

      theme: "grid"
    });

    y =
      lastAutoTableY(
        doc
      ) + 4;

    // --------------------------------------------------------
    // LABOUR TOTAL
    // --------------------------------------------------------

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(8.5);

    doc.setTextColor(
      ...INK
    );

    doc.text(
      `Labour Total: ${money(
        labourTotal(
          labourItems
        )
      )}`,
      PAGE_RIGHT,
      y,
      {
        align: "right"
      }
    );

    y += 5.5;
  } else {
    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      ...MUTED
    );

    doc.text(
      "No labour added.",
      PAGE_LEFT,
      y
    );

    y += 5;
  }

  // ==========================================================
  // BILLING SUMMARY
  // ==========================================================

  if (
    partsItems.length ||
    labourItems.length
  ) {
    const partsAmount =
      partsTotal(
        partsItems
      );

    const labourAmount =
      labourTotal(
        labourItems
      );

    const grandTotal =
      partsAmount +
      labourAmount;

    y = drawTotalsBox(
      doc,
      y,
      [
        [
          "Parts Total",
          money(
            partsAmount
          )
        ],

        [
          "Labour Total",
          money(
            labourAmount
          )
        ],

        [
          "TOTAL AMOUNT",
          money(
            grandTotal
          )
        ]
      ]
    );

    y += 6;
  }

  // ==========================================================
  // AUTHORIZED SIGNATURE
  // ==========================================================

  const signatureY = 274;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    ...INK
  );

  doc.text(
    "Authorized Signature: ___________________",
    PAGE_RIGHT,
    Math.max(
      y,
      signatureY
    ),
    {
      align: "right"
    }
  );

  // ==========================================================
  // FOOTER
  // ==========================================================

  drawFooter(
    doc,
    283,
    "Final estimate, GST, and discount are confirmed at the Estimate stage."
  );

  // ==========================================================
  // RETURN PDF
  // ==========================================================

  return {
    doc,

    filename:
      `JobCard-${
        data?.jobCardNumber ??
        "job-card"
      }.pdf`
  };
}

// ============================================================
// QUICK ESTIMATE PDF PARAMETERS
// ============================================================

type QuickEstimatePdfParams = {
  shop?: GarageSettings;

  customerName: string;
  phone: string;
  vehicleName: string;
  currentKm: string;

  complaintDetails: string;
  customerRequirements: string;

  partsItems: PartItem[];
  labourItems: LabourItem[];
  discountAmount: number;
};

// ============================================================
// BUILD QUICK ESTIMATE PDF
// ============================================================

function buildQuickEstimatePdfDoc(params: QuickEstimatePdfParams) {
  const {
    shop,
    customerName,
    phone,
    vehicleName,
    currentKm,
    complaintDetails,
    customerRequirements,
    partsItems,
    labourItems,
    discountAmount
  } = params;

  const doc = new jsPDF();

  const headerData = {
    jobCardNumber: "-",
    customer: { name: customerName || "-", phone: phone || "-", address: "-" },
    vehicle: { registrationNumber: vehicleName || "-", chassisNumber: "-" }
  } as unknown as JobCardDetails;

  let y = drawHeader(doc, headerData, "QUICK ESTIMATE", shop, [`Vehicle Name: ${vehicleName || "-"}`]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(`Current KM: ${currentKm || "-"}`, PAGE_LEFT, y);
  y += 6;

  // ==========================================================
  // SERVICE / COMPLAINT
  // ==========================================================

  y = drawSectionTitle(doc, y, "SERVICE / COMPLAINT DETAILS");

  const groups = groupComplaintByService(complaintDetails);

  if (groups.length) {
    groups.forEach((group) => {
      doc.setFont("helvetica", "bold");
      const serviceLabel = `•  ${group.service}: `;
      doc.text(serviceLabel, PAGE_LEFT + 3, y);
      const serviceWidth = doc.getTextWidth(serviceLabel);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(group.issues.join(", "), 177 - serviceWidth);
      doc.text(wrapped, PAGE_LEFT + 3 + serviceWidth, y, { maxWidth: 177 - serviceWidth });
      y += wrapped.length * 4;
    });
  } else if (complaintDetails?.trim()) {
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(complaintDetails.trim(), 177);
    doc.text(wrapped, PAGE_LEFT + 3, y, { maxWidth: 177 });
    y += wrapped.length * 4;
  } else {
    doc.setFont("helvetica", "normal");
    doc.text("-", PAGE_LEFT + 3, y);
    y += 4.5;
  }

  y += 3;

  // ==========================================================
  // CUSTOMER REQUIREMENTS
  // ==========================================================

  function drawTextBlock(label: string, text: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`${label}:`, PAGE_LEFT, y);
    y += 4.2;
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(text?.trim() || "-", 177);
    doc.text(wrapped, PAGE_LEFT + 3, y, { maxWidth: 177 });
    y += wrapped.length * 4 + 2.5;
  }

  drawTextBlock("Customer Requirements", customerRequirements);

  y += 2;

  const compactTable = {
    fontSize: 7.5,
    cellPadding: 1.4,
    textColor: INK as unknown as [number, number, number],
    lineColor: LINE as unknown as [number, number, number]
  };

  const compactHead = {
    fillColor: BRAND as unknown as [number, number, number],
    textColor: WHITE as unknown as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 7.5
  };

  // ==========================================================
  // PARTS
  // ==========================================================

  y = drawSectionTitle(doc, y, "PARTS");

  if (partsItems.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_LEFT, right: PAGE_LEFT },
      head: [["Sl.No", "Part Name", "Qty", "Price", "CGST 9%", "SGST 9%", "Amount"]],
      body: partsRows(partsItems),
      styles: compactTable,
      headStyles: compactHead,
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" }
      },
      theme: "grid"
    });

    y = lastAutoTableY(doc) + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`Parts Total: ${money(partsTotal(partsItems))}`, PAGE_RIGHT, y, { align: "right" });
    y += 5.5;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("No parts added.", PAGE_LEFT, y);
    y += 5;
  }

  // ==========================================================
  // LABOUR
  // ==========================================================

  y = drawSectionTitle(doc, y, "LABOUR");

  if (labourItems.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_LEFT, right: PAGE_LEFT },
      head: [["Sl.No", "Labour Description", "Rate", "Labour Total"]],
      body: labourRows(labourItems),
      styles: compactTable,
      headStyles: compactHead,
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" }
      },
      theme: "grid"
    });

    y = lastAutoTableY(doc) + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`Labour Total: ${money(labourTotal(labourItems))}`, PAGE_RIGHT, y, { align: "right" });
    y += 5.5;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("No labour added.", PAGE_LEFT, y);
    y += 5;
  }

  // ==========================================================
  // BILLING SUMMARY
  // ==========================================================

  const partsAmount = partsTotal(partsItems);
  const labourAmount = labourTotal(labourItems);
  const discount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, partsAmount + labourAmount - discount);

  const rows: [string, string][] = [
    ["Parts Total", money(partsAmount)],
    ["Labour Total", money(labourAmount)]
  ];
  if (discount > 0) rows.push(["Discount", `- ${money(discount)}`]);
  rows.push(["GRAND TOTAL", money(grandTotal)]);

  y = drawTotalsBox(doc, y, rows);
  y += 6;

  // ==========================================================
  // AUTHORIZED SIGNATURE
  // ==========================================================

  const signatureY = 274;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("Authorized Signature: ___________________", PAGE_RIGHT, Math.max(y, signatureY), { align: "right" });

  return {
    doc,
    filename: `Estimate-${vehicleName || customerName || "quick"}.pdf`
  };
}

// ============================================================
// DOWNLOAD QUICK ESTIMATE PDF
// ============================================================

export function downloadQuickEstimatePdf(params: QuickEstimatePdfParams) {
  const { doc, filename } = buildQuickEstimatePdfDoc(params);
  doc.save(filename);
}

// ============================================================
// SHARE QUICK ESTIMATE PDF ON WHATSAPP
// ============================================================

export async function shareQuickEstimatePdfOnWhatsApp(params: QuickEstimatePdfParams) {
  const { doc, filename } = buildQuickEstimatePdfDoc(params);

  const partsAmount = partsTotal(params.partsItems);
  const labourAmount = labourTotal(params.labourItems);
  const discount = Number(params.discountAmount) || 0;
  const grandTotal = Math.max(0, partsAmount + labourAmount - discount);

  const blob = doc.output("blob") as Blob;
  const file = new File([blob], filename, { type: "application/pdf" });

  const shareText =
    `Estimate for ${params.customerName || "customer"}\n` +
    `Vehicle: ${params.vehicleName || "-"}\n` +
    `Parts Total: ${money(partsAmount)}\n` +
    `Labour Total: ${money(labourAmount)}\n` +
    `Estimate Amount: ${money(grandTotal)}`;

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename, text: shareText });
      return;
    } catch {
      // User cancelled the share sheet or native sharing failed. Continue to fallback.
    }
  }

  doc.save(filename);

  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
}

// ============================================================
// DOWNLOAD JOB CARD PDF
// ============================================================


export function downloadJobCardPdf(
  params: JobCardPdfParams
) {
  const {
    doc,
    filename
  } =
    buildJobCardPdfDoc(
      params
    );

  doc.save(
    filename
  );
}

// ============================================================
// SHARE JOB CARD PDF ON WHATSAPP
// ============================================================

export async function shareJobCardPdfOnWhatsApp(
  params: JobCardPdfParams
) {
  const {
    doc,
    filename
  } =
    buildJobCardPdfDoc(
      params
    );

  // ----------------------------------------------------------
  // PDF BLOB
  // ----------------------------------------------------------

  const blob =
    doc.output(
      "blob"
    ) as Blob;

  // ----------------------------------------------------------
  // FILE
  // ----------------------------------------------------------

  const file =
    new File(
      [blob],
      filename,
      {
        type:
          "application/pdf"
      }
    );

  // ----------------------------------------------------------
  // SHARE TEXT
  // ----------------------------------------------------------

  const shareText =
    `Job Card ${
      params.data
        ?.jobCardNumber ??
      ""
    } for ${
      params.data
        ?.customer.name ??
      "customer"
    }`;

  // ----------------------------------------------------------
  // NAVIGATOR SHARE
  // ----------------------------------------------------------

  const nav =
    navigator as Navigator & {
      canShare?: (
        data?: ShareData
      ) => boolean;

      share?: (
        data: ShareData
      ) => Promise<void>;
    };

  // ----------------------------------------------------------
  // NATIVE FILE SHARING
  // ----------------------------------------------------------

  if (
    nav.canShare?.({
      files: [file]
    }) &&
    nav.share
  ) {
    try {
      await nav.share({
        files: [file],
        title: filename,
        text: shareText
      });

      return;
    } catch {
      // User cancelled the share sheet
      // or native sharing failed.
      // Continue to fallback.
    }
  }

  // ----------------------------------------------------------
  // FALLBACK DOWNLOAD
  // ----------------------------------------------------------

  doc.save(
    filename
  );

  // ----------------------------------------------------------
  // WHATSAPP FALLBACK
  // ----------------------------------------------------------

  const whatsappMessage =
    `${shareText}\n` +
    "(PDF downloaded — attach it from your Downloads in WhatsApp)";

  window.open(
    `https://wa.me/?text=${encodeURIComponent(
      whatsappMessage
    )}`,
    "_blank"
  );
}