import { redirect } from "next/navigation";

export default function MembershipsRedirectPage() {
  redirect("/admin/platform/memberships");
}
