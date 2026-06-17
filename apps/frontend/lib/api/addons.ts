import { apiFetch } from "@/lib/api";

export type ApiAddon = {
  _id: string;
  name: string;
  description?: string;
  price?: number; // only on paid addons
};

export type AddonsResponse = {
  free: ApiAddon[];
  paid: ApiAddon[];
};

export function fetchAddons(token?: string) {
  return apiFetch<AddonsResponse>("/addons", { token });
}
