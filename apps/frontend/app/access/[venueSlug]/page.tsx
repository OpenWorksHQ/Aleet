import { VenueAccessLandingBySlug } from "@/app/components/partner/venue-access-landing";

type PageProps = {
  params: Promise<{ venueSlug: string }>;
};

export default async function VenueAccessPage({ params }: PageProps) {
  const { venueSlug } = await params;
  return <VenueAccessLandingBySlug venueSlug={venueSlug} />;
}
