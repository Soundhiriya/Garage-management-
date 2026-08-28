"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Save, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGarageSettings } from "@/services/settings";
import { getWorkflowJobCards, updateWorkflowJobCard, type LabourItem, type PartItem, type WorkflowJobCard } from "@/services/workflow";
import { downloadQuickEstimatePdf, shareQuickEstimatePdfOnWhatsApp } from "@/lib/pdf";
import { ItemTable, TableCell, Row, computeTotals, emptyLabour, emptyPart, NumberInput, PlainInput, rupees } from "@/components/workflow/shared";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      {children}
    </label>
  );
}

const fieldClass =
  "focus-ring min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-base text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-slate-400 hover:border-slate-400";

const textareaClass =
  "focus-ring min-h-20 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-slate-400 hover:border-slate-400";

export function QuickEstimateForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: jobCards = [] } = useQuery({ queryKey: ["workflow-job-cards"], queryFn: getWorkflowJobCards, retry: false });
  const { data: shopSettings } = useQuery({ queryKey: ["garage-settings"], queryFn: getGarageSettings });

  const [sourceJobCardId, setSourceJobCardId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [currentKm, setCurrentKm] = useState("");
  const [complaintDetails, setComplaintDetails] = useState("");
  const [customerRequirements, setCustomerRequirements] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [busy, setBusy] = useState<"print" | "share" | null>(null);
  const [message, setMessage] = useState("");

  function applySourceJobCard(id: string) {
    setSourceJobCardId(id);
    const jc = jobCards.find((row) => String(row.id) === id);
    if (!jc) return;
    setCustomerName(jc.customerName ?? "");
    setPhone(jc.customerPhone ?? "");
    setVehicleName(jc.registrationNumber ?? jc.chassisNumber ?? "");
    setCurrentKm(String(jc.vehicleCurrentKm ?? jc.odometerKm ?? ""));
    setComplaintDetails(jc.complaint ?? "");
    setPartsItems(jc.partsItems ?? []);
    setLabourItems(jc.labourItems ?? []);
  }

  const totals = computeTotals(partsItems, labourItems, Number(discountAmount) || 0);

  function partBaseAmount(part: PartItem) {
    return (Number(part.qty) || 0) * (Number(part.price) || 0);
  }
  function partGstAmount(part: PartItem) {
    return partBaseAmount(part) * ((Number(part.gstPercent) || 0) / 100);
  }
  function partCgstAmount(part: PartItem) {
    return partGstAmount(part) / 2;
  }
  function partSgstAmount(part: PartItem) {
    return partGstAmount(part) / 2;
  }
  function partTotalAmount(part: PartItem) {
    return partBaseAmount(part) + partGstAmount(part);
  }
  function amountInputValue(value: number) {
    return value.toFixed(2);
  }
  function labourTotalAmount(labour: LabourItem) {
    return Number(labour.rate) || 0;
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!sourceJobCardId) throw new Error("Link a Job Card before saving.");
      return updateWorkflowJobCard(Number(sourceJobCardId), {
        status: "ESTIMATE",
        partsItems,
        labourItems: labourItems.map((item) => ({ ...item, qty: 1 })),
        discountAmount: Number(discountAmount) || 0
      });
    },
    onSuccess: async () => {
      setMessage("Estimate saved.");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", sourceJobCardId] });
    },
    onError: (error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not save the estimate.");
    }
  });

  function buildPdfParams() {
    return {
      shop: shopSettings,
      customerName,
      phone,
      vehicleName,
      currentKm,
      complaintDetails,
      customerRequirements,
      partsItems,
      labourItems,
      discountAmount: Number(discountAmount) || 0
    };
  }

  async function handlePrint() {
    setBusy("print");
    try {
      downloadQuickEstimatePdf(buildPdfParams());
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      await shareQuickEstimatePdfOnWhatsApp(buildPdfParams());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/50 sm:items-start sm:overflow-y-auto sm:p-6" role="dialog" aria-modal="true">
      <div className="flex h-full w-full flex-col bg-white shadow-xl sm:my-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-full sm:max-w-3xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--primary)] sm:text-sm">Customer Call</p>
            <h2 className="text-base font-bold tracking-normal text-slate-950 sm:text-lg">Create Estimate</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-4 sm:p-5">
          <Field label="Link Job Card (required to save)">
            <select
              className={fieldClass}
              value={sourceJobCardId}
              onChange={(e) => applySourceJobCard(e.target.value)}
            >
              <option value="">Select a Job Card</option>
              {jobCards.map((jc: WorkflowJobCard) => (
                <option key={jc.id} value={jc.id}>
                  {jc.jobCardNumber} - {jc.customerName} ({jc.registrationNumber || jc.chassisNumber})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer Name">
              <input className={fieldClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </Field>
            <Field label="Phone Number">
              <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" inputMode="tel" />
            </Field>
            <Field label="Vehicle Name">
              <input className={fieldClass} value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="e.g. Honda Activa" />
            </Field>
            <Field label="Current KM">
              <input className={fieldClass} value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} placeholder="Odometer reading" inputMode="numeric" />
            </Field>
          </div>

          <Field label="Service / Complaint Details">
            <textarea className={textareaClass} value={complaintDetails} onChange={(e) => setComplaintDetails(e.target.value)} placeholder="e.g. Running Repair: Brake Issue, Oil Issue" />
          </Field>
          <Field label="Customer Requirements">
            <textarea className={textareaClass} value={customerRequirements} onChange={(e) => setCustomerRequirements(e.target.value)} placeholder="What the customer asked for" />
          </Field>

          <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Parts</h3>
            <ItemTable
              columns={["Part Name", "Part Number", "Quantity", "Price", "CGST 9%", "SGST 9%", "Amount"]}
              rows={partsItems}
              onChange={setPartsItems}
              empty={emptyPart}
              addLabel="ADD PART"
              addPosition="top"
              renderRow={(row, update) => (
                <>
                  <TableCell className="min-w-[220px]"><PlainInput className="w-full min-w-[200px]" value={row.name} onChange={(v) => update({ ...row, name: v })} placeholder="e.g. Brake Pad Set" /></TableCell>
                  <TableCell className="min-w-[160px]"><PlainInput className="w-full min-w-[140px]" value={row.partNumber ?? ""} onChange={(v) => update({ ...row, partNumber: v })} placeholder="e.g. BP-1234" /></TableCell>
                  <TableCell><NumberInput className="w-14" value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                  <TableCell><NumberInput value={row.price} onChange={(v) => update({ ...row, price: v })} /></TableCell>
                  <TableCell>
                    <input
                      className="focus-ring w-24 rounded-md border border-[var(--line)] bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-900"
                      value={amountInputValue(partCgstAmount(row))}
                      readOnly
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      className="focus-ring w-24 rounded-md border border-[var(--line)] bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-900"
                      value={amountInputValue(partSgstAmount(row))}
                      readOnly
                    />
                  </TableCell>
                  <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(partTotalAmount(row))}</span></TableCell>
                </>
              )}
            />
            <p className="mt-3 text-right text-sm font-semibold text-slate-800">Parts Total: {rupees.format(totals.partsSubtotal + totals.gstTotal)}</p>

            <section className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Labour</h3>
              <ItemTable
                columns={["Labour Description", "Rate", "Total Amount"]}
                rows={labourItems}
                onChange={setLabourItems}
                empty={emptyLabour}
                addLabel="ADD LABOUR"
                addPosition="top"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.description} onChange={(v) => update({ ...row, description: v })} placeholder="e.g. Brake labour" /></TableCell>
                    <TableCell><NumberInput value={row.rate} onChange={(v) => update({ ...row, rate: v })} /></TableCell>
                    <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(labourTotalAmount(row))}</span></TableCell>
                  </>
                )}
              />
              <p className="text-right text-sm font-semibold text-slate-800">Labour Total: {rupees.format(totals.labourSubtotal)}</p>
            </section>
          </article>

          <article className="rounded-lg border border-[var(--line)] bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Estimate Summary</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Parts Total" value={rupees.format(totals.partsSubtotal)} />
              <Row label="Labour Total" value={rupees.format(totals.labourSubtotal)} />
              <Row label="GST (Parts only)" value={rupees.format(totals.gstTotal)} />
              <Row
                label="Discount"
                value={
                  <input
                    className="focus-ring w-28 rounded-md border border-[var(--line)] bg-white px-2 py-1 text-right text-sm"
                    inputMode="decimal"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                  />
                }
              />
              <Row label="Grand Total" value={<strong className="text-base text-[var(--primary-dark)]">{rupees.format(totals.grandTotal)}</strong>} />
            </div>
          </article>

          {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="secondary" loading={busy === "print"} onClick={handlePrint} className="w-full sm:w-auto">
              <Printer className="h-4 w-4" />
              PRINT PDF
            </Button>
            <Button type="button" variant="secondary" loading={busy === "share"} onClick={handleShare} className="w-full sm:w-auto">
              <Share2 className="h-4 w-4" />
              SHARE ON WHATSAPP
            </Button>
            <Button type="button" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              SAVE ESTIMATE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
