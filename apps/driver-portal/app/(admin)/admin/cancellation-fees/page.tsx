import { redirect } from "next/navigation";

export default function CancellationFeesRedirectPage() {
  redirect("/admin/platform/finance?tab=cancellation");
}
