import { redirect } from "next/navigation";

export default function LicensingRedirectPage() {
  redirect("/admin/drivers?tab=licensing");
}
