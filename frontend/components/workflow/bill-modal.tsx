"use client";

import { useMemo } from "react";
import { Printer, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobCardDetails } from "@/services/register";
import type { WorkflowJobCard } from "@/services/workflow";
import type { GarageSettings } from "@/services/settings";
import { buildBillData } from "@/lib/bill";
import { downloadTaxInvoicePdf, printTaxInvoicePdf } from "@/lib/pdf";
import { TaxInvoice } from "@/components/workflow/tax-invoice";

export function BillModal({
  jobCard,
  workflow,
  shop,
  onClose
}: {
  jobCard: JobCardDetails;
  workflow: WorkflowJobCard;
  shop?: GarageSettings;
  onClose: () => void;
}) {
  const billData = useMemo(() => buildBillData(jobCard, workflow, shop), [jobCard, workflow, shop]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/50 sm:items-start sm:overflow-y-auto sm:p-6" role="dialog" aria-modal="true">
      <div className="flex h-full w-full flex-col bg-white shadow-xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:w-full sm:max-w-4xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--primary)] sm:text-sm">Job Card {jobCard.jobCardNumber}</p>
            <h2 className="text-base font-bold tracking-normal text-slate-950 sm:text-lg">Bill Preview</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6">
          <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white shadow-sm">
            <TaxInvoice data={billData} />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5 sm:py-4">
          <Button type="button" variant="secondary" onClick={() => printTaxInvoicePdf(billData)} className="w-full sm:w-auto">
            <Printer className="h-4 w-4" />
            PRINT
          </Button>
          <Button type="button" onClick={() => downloadTaxInvoicePdf(billData)} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            SAVE
          </Button>
        </div>
      </div>
    </div>
  );
}
