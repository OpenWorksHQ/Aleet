import { redirect } from "next/navigation";

export default function RegionsRedirectPage() {
  redirect("/admin/platform?tab=regions");
}
