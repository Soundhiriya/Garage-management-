import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type { RegisterInput } from "@/schemas/register";

export type RegisterResult = {
  customerId: number;
  vehicleId: number;
  jobCardId: number;
  jobCardNumber: string;
};

export type JobCardDetails = {
  id: number;
  jobCardNumber: string;
  status: string;
  createdAt: string;
  odometerKm: number | null;
  expectedDeliveryAt: string | null;
  complaint: string | null;
  serviceTypes: string | null;
  fuelLevel: string | null;
  vehicleCondition: string | null;
  accessories: string | null;
  photoUrls: string | null;
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  };
  vehicle: {
    id: number;
    chassisNumber: string;
    registrationNumber: string | null;
    currentKm: number | null;
  };
};

export type VehicleSearchResult = {
  vehicleId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  chassisNumber: string;
  registrationNumber: string | null;
  currentKm: number | null;
  lastServiceDate: string | null;
  lastKm: number | null;
  lastJobCardId: number | null;
  lastJobCardNumber: string | null;
};

export async function registerVehicle(input: RegisterInput) {
  const response = await api.post<ApiResponse<RegisterResult>>("/register", input);
  return response.data.data;
}

export async function getJobCard(id: string) {
  const response = await api.get<ApiResponse<JobCardDetails>>(`/job-cards/${id}`);
  return response.data.data;
}

export async function searchVehicleEntry(query: string) {
  const response = await api.get<ApiResponse<VehicleSearchResult | null>>("/vehicle-entry/search", { params: { query } });
  return response.data.data;
}

export async function updateJobCard(id: string, input: {
  odometerKm: number | null;
  expectedDeliveryAt: string | null;
  complaint: string;
  serviceTypes: string[];
  fuelLevel?: string;
  vehicleCondition?: string;
  accessories?: string;
  photoUrls?: string;
}) {
  const response = await api.put<ApiResponse<JobCardDetails>>(`/job-cards/${id}`, input);
  return response.data.data;
}
