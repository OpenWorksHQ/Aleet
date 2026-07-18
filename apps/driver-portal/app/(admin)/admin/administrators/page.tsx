import { redirect } from "next/navigation";

export default function AdministratorsRedirectPage() {
  redirect("/admin/settings?tab=administrators");
}
