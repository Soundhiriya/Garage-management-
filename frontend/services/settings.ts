import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type GarageSettings = {
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
};

export async function getGarageSettings() {
  const response = await api.get<ApiResponse<GarageSettings>>("/settings/garage");
  return response.data.data;
}

export async function updateGarageSettings(input: GarageSettings) {
  const response = await api.put<ApiResponse<GarageSettings>>("/settings/garage", input);
  return response.data.data;
}
