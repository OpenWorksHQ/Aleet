import { Suspense } from "react";
import { cookies } from "next/headers";
import { fetchAdmins, type ApiAdmin } from "@/lib/admin-api";
import { fetchInvestorDocuments, type InvestorDocument } from "@/lib/investor-documents-api";
import { SettingsAdminPanel } from "@/app/components/admin/settings/settings-admin-panel";
import {
  fetchAdminPermissions,
  hasAdminPermission,
} from "@/lib/admin-access";

export const metadata = {
  title: "Settings — Aleet Admin",
};

export default async function SettingsPage() {
  const token = (await cookies()).get("auth_token")?.value ?? "";
  const permissions = await fetchAdminPermissions(token);
  const canManageAdmins = hasAdminPermission(permissions, "super-admin");

  let admins: ApiAdmin[] = [];
  let documents: InvestorDocument[] = [];
  let loadError: string | null = null;

  try {
    const docsPromise = fetchInvestorDocuments(token);
    if (canManageAdmins) {
      const [adminResult, docs] = await Promise.all([
        fetchAdmins(token),
        docsPromise,
      ]);
      admins = adminResult.admins;
      documents = docs;
    } else {
      documents = await docsPromise;
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load settings data";
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <SettingsAdminPanel
        admins={admins}
        documents={documents}
        loadError={loadError}
        permissions={permissions}
      />
    </Suspense>
  );
}
