import { notFound } from "next/navigation";
import { isTrackingSlug } from "@/lib/partner/registry";
import { TrackingLandingBySlug } from "@/app/components/partner/tracking-landing";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TrackingSlugPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isTrackingSlug(slug)) {
    notFound();
  }

  return <TrackingLandingBySlug slug={slug} />;
}
