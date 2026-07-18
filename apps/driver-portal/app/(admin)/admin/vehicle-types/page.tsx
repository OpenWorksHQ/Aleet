import { redirect } from "next/navigation";

export default function VehicleTypesRedirectPage() {
  redirect("/admin/platform?tab=vehicles");
}
