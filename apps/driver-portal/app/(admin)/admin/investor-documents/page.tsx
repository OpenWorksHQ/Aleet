import { redirect } from "next/navigation";

export default function InvestorDocumentsRedirectPage() {
  redirect("/admin/settings?tab=investor");
}
