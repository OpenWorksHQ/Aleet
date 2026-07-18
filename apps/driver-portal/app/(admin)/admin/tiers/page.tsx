import { redirect } from "next/navigation";

export default function TiersRedirectPage() {
  redirect("/admin/platform?tab=tiers");
}
