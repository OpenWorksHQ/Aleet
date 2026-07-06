import { TrackingLandingBySlug } from "@/app/components/partner/tracking-landing";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TrackingSlugPage({ params }: PageProps) {
  const { slug } = await params;
  return <TrackingLandingBySlug slug={slug} />;
}
