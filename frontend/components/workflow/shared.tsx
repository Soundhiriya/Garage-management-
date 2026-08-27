"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobCardDetails } from "@/services/register";
import type { LabourItem, PartItem, WorkItem } from "@/services/workflow";

export const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export const emptyWork: WorkItem = { description: "", technician: "", status: "Pending", notes: "" };
export const emptyPart: PartItem = { name: "", partNumber: "", qty: 1, price: 0, gstPercent: 18, notes: "" };
export const emptyLabour: LabourItem = { description: "", qty: 1, rate: 0, gstPercent: 18, notes: "" };

export function computeTotals(partsItems: PartItem[], labourItems: LabourItem[], discountAmount: number) {
  const partsSubtotal = partsItems.reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const partsGst = partsItems.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.price) || 0)) * ((Number(p.gstPercent) || 0) / 100), 0);
  const labourSubtotal = labourItems.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const labourGst = labourItems.reduce((sum, l) => sum + ((Number(l.qty) || 0) * (Number(l.rate) || 0)) * ((Number(l.gstPercent) || 0) / 100), 0);
  const subtotal = partsSubtotal + labourSubtotal;
  const gstTotal = partsGst + labourGst;
  const grandTotal = Math.max(0, subtotal + gstTotal - (Number(discountAmount) || 0));
  return { partsSubtotal, labourSubtotal, subtotal, gstTotal, grandTotal };
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function SelectBox({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      <select className="focus-ring min-h-12 rounded-md border border-[var(--line)] bg-white px-3 text-base text-slate-950" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option || "Select"}</option>)}
      </select>
    </label>
  );
}

export function PlainInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input className="focus-ring w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <input className="focus-ring w-24 rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm" inputMode="decimal" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />;
}

export function TableCell({ children }: { children: ReactNode }) {
  return <td className="p-1 align-top">{children}</td>;
}

export function ItemTable<T>({
  columns,
  rows,
  onChange,
  empty,
  renderRow,
  addLabel,
  readOnly
}: {
  columns: string[];
  rows: T[];
  onChange: (rows: T[]) => void;
  empty: T;
  renderRow: (row: T, update: (row: T) => void) => ReactNode;
  addLabel: string;
  readOnly?: boolean;
}) {
  function updateRow(index: number, row: T) {
    onChange(rows.map((existing, i) => (i === index ? row : existing)));
  }
  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-[var(--muted)]">
              {columns.map((col) => <th key={col} className="p-1">{col}</th>)}
              {readOnly ? null : <th className="p-1" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-[var(--line)]">
                {renderRow(row, (updated) => updateRow(index, updated))}
                {readOnly ? null : (
                  <TableCell>
                    <button type="button" onClick={() => removeRow(index)} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                )}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="p-3 text-sm text-[var(--muted)]">No items added yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {readOnly ? null : (
        <Button type="button" variant="secondary" className="w-fit min-h-11" onClick={() => onChange([...rows, { ...empty }])}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export function PrintHeader({ data }: { data: JobCardDetails | undefined }) {
  return (
    <div className="mb-4 border-b border-black pb-3">
      <h1 className="text-xl font-bold">{data?.jobCardNumber ?? "Job Card"}</h1>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>Customer: {data?.customer.name}</div>
        <div>Phone: {data?.customer.phone}</div>
        <div>Address: {data?.customer.address}</div>
        <div>Vehicle Number: {data?.vehicle.registrationNumber ?? "-"}</div>
        <div>Chassis Number: {data?.vehicle.chassisNumber}</div>
        <div>Current KM: {data?.vehicle.currentKm ?? "-"}</div>
      </div>
    </div>
  );
}

export function PrintItemsTable({ partsItems, labourItems }: { partsItems: PartItem[]; labourItems: LabourItem[] }) {
  return (
    <table className="mb-4 w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-black text-left">
          <th className="py-1">Description</th>
          <th className="py-1">Qty</th>
          <th className="py-1">Rate</th>
          <th className="py-1">GST %</th>
          <th className="py-1 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {partsItems.map((p, i) => (
          <tr key={`part-${i}`} className="border-b border-slate-200">
            <td className="py-1">{p.name}{p.partNumber ? ` (${p.partNumber})` : ""}</td>
            <td className="py-1">{p.qty}</td>
            <td className="py-1">{rupees.format(p.price)}</td>
            <td className="py-1">{p.gstPercent}%</td>
            <td className="py-1 text-right">{rupees.format((Number(p.qty) || 0) * (Number(p.price) || 0))}</td>
          </tr>
        ))}
        {labourItems.map((l, i) => (
          <tr key={`labour-${i}`} className="border-b border-slate-200">
            <td className="py-1">{l.description}</td>
            <td className="py-1">{l.qty}</td>
            <td className="py-1">{rupees.format(l.rate)}</td>
            <td className="py-1">{l.gstPercent}%</td>
            <td className="py-1 text-right">{rupees.format((Number(l.qty) || 0) * (Number(l.rate) || 0))}</td>
          </tr>
        ))}
        {partsItems.length === 0 && labourItems.length === 0 ? (
          <tr><td colSpan={5} className="py-2 text-slate-500">No parts or labour items added.</td></tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function PrintableEstimate({
  visible,
  data,
  partsItems,
  labourItems,
  subtotal,
  gstTotal,
  discountAmount,
  grandTotal,
  estimateNotes
}: {
  visible: boolean;
  data: JobCardDetails | undefined;
  partsItems: PartItem[];
  labourItems: LabourItem[];
  subtotal: number;
  gstTotal: number;
  discountAmount: number;
  grandTotal: number;
  estimateNotes: string;
}) {
  return (
    <div className={visible ? "hidden print:block" : "hidden"}>
      <PrintHeader data={data} />
      <h2 className="mb-3 text-sm font-bold uppercase">Estimate</h2>
      <PrintItemsTable partsItems={partsItems} labourItems={labourItems} />
      <div className="ml-auto grid w-64 gap-1 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>{rupees.format(subtotal)}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{rupees.format(gstTotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>-{rupees.format(discountAmount)}</span></div>
        <div className="flex justify-between border-t border-black pt-1 font-bold"><span>Grand Total</span><span>{rupees.format(grandTotal)}</span></div>
      </div>
      {estimateNotes ? <p className="mt-4 text-xs"><strong>Notes:</strong> {estimateNotes}</p> : null}
    </div>
  );
}

export function PrintableInvoice({
  visible,
  data,
  partsItems,
  labourItems,
  subtotal,
  gstTotal,
  discountAmount,
  grandTotal,
  invoiceNumber,
  paidAmount,
  balance,
  paymentStatus
}: {
  visible: boolean;
  data: JobCardDetails | undefined;
  partsItems: PartItem[];
  labourItems: LabourItem[];
  subtotal: number;
  gstTotal: number;
  discountAmount: number;
  grandTotal: number;
  invoiceNumber: string;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
}) {
  return (
    <div className={visible ? "hidden print:block" : "hidden"}>
      <PrintHeader data={data} />
      <h2 className="mb-1 text-sm font-bold uppercase">Invoice {invoiceNumber || `INV-${data?.id ?? ""}`}</h2>
      <p className="mb-3 text-xs">Invoice Date: {new Date().toLocaleDateString()}</p>
      <PrintItemsTable partsItems={partsItems} labourItems={labourItems} />
      <div className="ml-auto grid w-64 gap-1 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>{rupees.format(subtotal)}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{rupees.format(gstTotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>-{rupees.format(discountAmount)}</span></div>
        <div className="flex justify-between border-t border-black pt-1 font-bold"><span>Grand Total</span><span>{rupees.format(grandTotal)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span>{rupees.format(paidAmount)}</span></div>
        <div className="flex justify-between"><span>Balance</span><span>{rupees.format(balance)}</span></div>
        <div className="flex justify-between font-bold"><span>Payment Status</span><span>{paymentStatus}</span></div>
      </div>
    </div>
  );
}
