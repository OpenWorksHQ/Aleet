import { cookies } from "next/headers";
import {
  fetchAdminPartners,
  fetchPartnerApplications,
  type AdminPartnersPage,
  type PartnerApplicationsPage,
} from "@/lib/admin-api";
import { PartnersAdminPanel } from "@/app/components/admin/partners/partners-admin-panel";

export default async function AdminPartnersPage() {
  const token = (await cookies()).get("auth_token")?.value ?? "";

  let initialApplications: PartnerApplicationsPage = {
    applications: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  };
  let initialPartners: AdminPartnersPage = {
    partners: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  };

  try {
    initialApplications = await fetchPartnerApplications(token, { limit: 50 });
  } catch {
    // shown as empty in UI
  }

  try {
    initialPartners = await fetchAdminPartners(token, { limit: 50, status: "active" });
  } catch {
    // shown as empty in UI
  }

  return (
    <PartnersAdminPanel
      initialApplications={initialApplications}
      initialPartners={initialPartners}
    />
  );
}
