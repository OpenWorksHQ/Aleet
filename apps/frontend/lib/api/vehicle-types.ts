import { apiFetch } from "@/lib/api";

export type VehicleType = {
  _id: string;
  name: string;
  description: string;
  hourlyPrice: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export function getVehicleTypes() {
  return apiFetch<VehicleType[]>("/vehicle-types", { method: "GET" });
}
