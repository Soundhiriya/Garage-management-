import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type WorkItem = { description: string; technician: string | null; status: string; notes: string | null };
export type PartItem = { name: string; partNumber: string | null; qty: number; price: number; gstPercent: number; notes: string | null };
export type LabourItem = { description: string; qty: number; rate: number; gstPercent: number; notes: string | null };

export type WorkflowJobCard = {
  id: number;
  jobCardNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  vehicleId: number;
  registrationNumber: string | null;
  chassisNumber: string;
  serviceTypes: string | null;
  complaint: string | null;
  workItems: WorkItem[];
  partsItems: PartItem[];
  labourItems: LabourItem[];
  subtotal: number;
  gstTotal: number;
  discountAmount: number;
  estimateAmount: number;
  estimateNotes: string | null;
  approvalStatus: string;
  approvalNotes: string | null;
  finalReviewNotes: string | null;
  invoiceNumber: string | null;
  invoiceAmount: number;
  paymentStatus: string;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  followUpAt: string | null;
  followUpNotes: string | null;
  whatsappReminderAt: string | null;
  returnNotes: string | null;
  nextServiceAt: string | null;
  nextServiceKm: number | null;
  followUpType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowUpdate = Partial<{
  status: string;
  workItems: WorkItem[];
  partsItems: PartItem[];
  labourItems: LabourItem[];
  discountAmount: number;
  estimateNotes: string;
  approvalStatus: string;
  approvalNotes: string;
  finalReviewNotes: string;
  invoiceNumber: string;
  paymentStatus: string;
  paidAmount: number;
  paymentMode: string;
  deliveredAt: string;
  deliveryNotes: string;
  followUpAt: string;
  followUpNotes: string;
  whatsappReminderAt: string;
  returnNotes: string;
  nextServiceAt: string;
  nextServiceKm: number;
  followUpType: string;
}>;

export async function getWorkflowJobCards() {
  const response = await api.get<ApiResponse<WorkflowJobCard[]>>("/workflow/job-cards");
  return response.data.data;
}

export async function getWorkflowJobCard(id: number) {
  const response = await api.get<ApiResponse<WorkflowJobCard>>(`/workflow/job-cards/${id}`);
  return response.data.data;
}

export async function updateWorkflowJobCard(id: number, input: WorkflowUpdate) {
  const response = await api.put<ApiResponse<WorkflowJobCard>>(`/job-cards/${id}/workflow`, input);
  return response.data.data;
}

export async function getVehicleHistory(vehicleId: number) {
  const response = await api.get<ApiResponse<WorkflowJobCard[]>>(`/vehicles/${vehicleId}/history`);
  return response.data.data;
}
