import { notFound } from "next/navigation";
import { resolveVenueSlug } from "@/lib/partner/registry";
import { VenueAccessLanding } from "@/app/components/partner/venue-access-landing";

type PageProps = {
  params: Promise<{ venueSlug: string }>;
};

export default async function VenueAccessPage({ params }: PageProps) {
  const { venueSlug } = await params;
  const partner = resolveVenueSlug(venueSlug);

  if (!partner) {
    notFound();
  }

  return <VenueAccessLanding venueSlug={venueSlug} partner={partner} />;
}
