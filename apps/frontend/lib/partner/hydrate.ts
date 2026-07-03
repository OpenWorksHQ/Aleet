import { validatePartnerCode } from "@/lib/api/partners";
import {
  getPartnerCodeFromCookie,
  loadPartnerContext,
  savePartnerContext,
} from "./attribution";
import type { PartnerContext } from "./types";

/** Restore partner context from storage, or re-fetch from cookie if needed. */
export async function hydratePartnerContext(): Promise<PartnerContext | null> {
  const existing = loadPartnerContext();
  if (existing) return existing;

  const code = getPartnerCodeFromCookie();
  if (!code) return null;

  const res = await validatePartnerCode(code);
  if (!res.data) return null;

  savePartnerContext(res.data);
  return res.data;
}
