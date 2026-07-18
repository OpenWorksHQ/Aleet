import { redirect } from "next/navigation";

export default function AddonsRedirectPage() {
  redirect("/admin/platform?tab=addons");
}
