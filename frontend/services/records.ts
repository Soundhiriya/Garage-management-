import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type CustomerListItem = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export type VehicleListItem = {
  id: number;
  chassisNumber: string;
  registrationNumber: string | null;
  currentKm: number | null;
  customerName: string;
  customerPhone: string;
  createdAt: string;
};

export type JobCardListItem = {
  id: number;
  jobCardNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  chassisNumber: string;
  createdAt: string;
};

export async function getCustomers() {
  const response = await api.get<ApiResponse<CustomerListItem[]>>("/customers");
  return response.data.data;
}

export async function getVehicles() {
  const response = await api.get<ApiResponse<VehicleListItem[]>>("/vehicles");
  return response.data.data;
}

export async function getJobCards() {
  const response = await api.get<ApiResponse<JobCardListItem[]>>("/job-cards");
  return response.data.data;
}
