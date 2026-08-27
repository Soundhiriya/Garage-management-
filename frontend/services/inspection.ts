import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type InspectionCondition = "GOOD" | "ATTENTION" | "REPLACE";

export type InspectionRow = {
  itemId: number;
  itemName: string;
  condition: InspectionCondition | null;
  notes: string | null;
  photoUrl: string | null;
};

export async function getInspection(jobCardId: string) {
  const response = await api.get<ApiResponse<InspectionRow[]>>(`/job-cards/${jobCardId}/inspection`);
  return response.data.data;
}

export async function saveInspection(jobCardId: string, items: InspectionRow[]) {
  const response = await api.post<ApiResponse<InspectionRow[]>>(`/job-cards/${jobCardId}/inspection`, {
    items: items
      .filter((item) => item.condition)
      .map((item) => ({
        itemId: item.itemId,
        condition: item.condition,
        notes: item.notes ?? "",
        photoUrl: item.photoUrl ?? ""
      }))
  });
  return response.data.data;
}

