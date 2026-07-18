import { redirect } from "next/navigation";

export default function PayoutsRedirectPage() {
  redirect("/admin/platform/finance");
}
