import type { ReactNode } from "react";
import type { BillData } from "@/lib/bill";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function TaxInvoice({ data }: { data: BillData }) {
  return (
    <div className="mx-auto w-full max-w-[794px] border border-slate-300 bg-white text-[11px] leading-snug text-slate-900 shadow-sm sm:text-xs">
      <div className="bg-slate-50 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">{data.garage.name}</p>
            <p className="mt-1.5 text-slate-600">{data.garage.address}</p>
            <p className="text-slate-600">GSTIN: {data.garage.gstin}</p>
            <p className="text-slate-600">Phone: {data.garage.phone}</p>
            <p className="text-slate-600">Email: {data.garage.email}</p>
          </div>

          <div className="rounded-md border border-teal-200 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wide text-teal-800">Tax Invoice</p>
            <p className="mt-1"><span className="font-semibold text-slate-950">Invoice No:</span> {data.invoice.number}</p>
            <p><span className="font-semibold text-slate-950">Invoice Date:</span> {data.invoice.date}</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        <div className="grid gap-4 border-t border-slate-300 py-4 sm:grid-cols-2">
          <div className="grid gap-1 text-left">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">Bill To</p>
            <p><span className="font-semibold text-slate-950">Name:</span> {data.customer.name}</p>
            <p><span className="font-semibold text-slate-950">Address:</span> {data.customer.address}</p>
            <p><span className="font-semibold text-slate-950">Phone:</span> {data.customer.phone}</p>
          </div>
          <div className="grid gap-1 text-right">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">Job Card / Vehicle</p>
            <p><span className="font-semibold text-slate-950">Job Card Date:</span> {data.jobCard.date}</p>
            <p><span className="font-semibold text-slate-950">Job Card No:</span> {data.jobCard.number}</p>
            <p><span className="font-semibold text-slate-950">Vehicle Reg No:</span> {data.vehicle.registrationNumber}</p>
            <p><span className="font-semibold text-slate-950">Odometer:</span> {data.vehicle.odometer}</p>
            <p><span className="font-semibold text-slate-950">Chassis No:</span> {data.vehicle.chassisNumber}</p>
          </div>
        </div>
        <div className="border-t border-slate-300" />

        {data.serviceItems.length || data.complaintRaw ? (
          <div className="mt-4 rounded-md border border-slate-200 p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-800">Service Visit</p>
            <p className="mb-1 font-bold text-slate-950">Complaint:</p>
            {data.serviceItems.length ? (
              <div className="grid gap-1">
                {data.serviceItems.map((group) => (
                  <p key={group.service}>
                    {"•  "}
                    <span className="font-bold text-slate-950">{group.service}:</span>{" "}
                    <span className="font-normal text-slate-700">{group.issues.join(", ")}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-line font-normal text-slate-700">{data.complaintRaw}</p>
            )}
          </div>
        ) : null}

        {data.parts.length ? (
          <div className="mt-4">
            <div className="overflow-x-auto rounded-md border border-slate-300">
              <table className="w-full min-w-[760px] border-collapse text-[10px]">
                <thead>
                  <tr className="bg-teal-700 text-left uppercase tracking-wide text-white">
                    <Th>S.No</Th>
                    <Th>Part No</Th>
                    <Th>Description</Th>
                    <Th>HSN</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Unit Price</Th>
                    <Th align="right">Disc.</Th>
                    <Th align="right">Disc Amt</Th>
                    <Th align="right">Taxable Amt.</Th>
                    <Th align="right">GST %</Th>
                    <Th align="right">GST</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.parts.map((p, index) => (
                    <tr key={`part-${p.sno}`} className={`border-b border-slate-200 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                      <Td>{p.sno}</Td>
                      <Td>{p.partNumber}</Td>
                      <Td>{p.description}</Td>
                      <Td>{p.hsn}</Td>
                      <Td align="right">{p.qty}</Td>
                      <Td align="right">{rupees.format(p.unitPrice)}</Td>
                      <Td align="right">{p.discountPercent}%</Td>
                      <Td align="right">{rupees.format(p.discountAmount)}</Td>
                      <Td align="right">{rupees.format(p.taxableAmount)}</Td>
                      <Td align="right">{p.gstPercent}%</Td>
                      <Td align="right">{rupees.format(p.gstAmount)}</Td>
                      <Td align="right"><span className="font-semibold">{rupees.format(p.total)}</span></Td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-100">
                    <td colSpan={11} className="px-2 py-1.5 text-right font-bold text-slate-900">Parts Total</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-900">{rupees.format(data.partsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {data.labour.length ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-800">Labour</p>
            <div className="overflow-x-auto rounded-md border border-slate-300">
              <table className="w-full min-w-[420px] border-collapse text-[10px]">
                <thead>
                  <tr className="bg-teal-700 text-left uppercase tracking-wide text-white">
                    <Th>S.No</Th>
                    <Th>Description</Th>
                    <Th align="right">Rate</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.labour.map((l, index) => (
                    <tr key={`labour-${l.sno}`} className={`border-b border-slate-200 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                      <Td>{l.sno}</Td>
                      <Td>{l.description}</Td>
                      <Td align="right">{rupees.format(l.rate)}</Td>
                      <Td align="right"><span className="font-semibold">{rupees.format(l.total)}</span></Td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-100">
                    <td colSpan={3} className="px-2 py-1.5 text-right font-bold text-slate-900">Labour Total</td>
                    <td className="px-2 py-1.5 text-right font-bold text-slate-900">{rupees.format(data.labourTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[280px] overflow-hidden rounded-md border border-slate-300">
            <SummaryRow label="Total Taxable Amount" value={rupees.format(data.summary.totalTaxableAmount)} />
            <SummaryRow label="Total CGST" value={rupees.format(data.summary.totalCgst)} />
            <SummaryRow label="Total SGST" value={rupees.format(data.summary.totalSgst)} />
            <SummaryRow label="Discount" value={data.summary.discount > 0 ? `- ${rupees.format(data.summary.discount)}` : rupees.format(0)} />
            <SummaryRow label="Round Off" value={rupees.format(data.summary.roundOff)} last />
            <div className="flex items-center justify-between bg-teal-700 px-3 py-2 text-white">
              <span className="text-xs font-bold uppercase tracking-wide">Grand Total</span>
              <span className="text-sm font-extrabold">{rupees.format(data.summary.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <div className="border-t border-slate-400 pt-1 text-center font-medium text-slate-700">Customer Signature</div>
          <div className="border-t border-slate-400 pt-1 text-center font-medium text-slate-700">Authorised Signatory</div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
          <p>Subject to Chennai Jurisdiction. This is a computer generated Invoice and does not require signature.</p>
          <p className="mt-1 font-medium text-slate-600">Powered by {data.garage.name}</p>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={`whitespace-nowrap px-2 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, align }: { children: ReactNode; align?: "left" | "right" }) {
  return <td className={`px-2 py-1.5 ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 ${last ? "" : "border-b border-slate-200"}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
