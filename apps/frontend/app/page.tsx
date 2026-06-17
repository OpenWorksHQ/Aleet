import { AuthFooter } from "./components/auth-shell";
import { SiteMenu } from "./components/site-menu";
import { Button, PayoutIcon, EliteIcon, ScheduleIcon } from "./components/ui";
import {
  DayNightBackground,
  DayNightProvider,
  DayNightToggleButton,
} from "./components/day-night-toggle";
import { BookingForm } from "./components/booking-form";
import bgNight from "@/public/images/homepage/homepage_night.png";
import bgDay from "@/public/images/homepage/homepage_day.png";

export default function HomePage() {
  return (
    <DayNightProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-[#050d0c] text-white">
        <DayNightBackground bgDay={bgDay} bgNight={bgNight} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,13,12,0.22)_0%,rgba(5,13,12,0.48)_36%,rgba(5,13,12,0.92)_100%)]" />

        <div className="relative z-10 flex min-h-screen flex-col px-4 pt-6 pb-8 sm:px-10 sm:pt-10">
          <header className="flex justify-between items-center gap-2 sm:gap-6">
            <SiteMenu />
            <DayNightToggleButton />
          </header>

          <section className="mx-auto mt-8 w-full max-w-205 text-center sm:mt-4 2xl:mt-10">
            <h1 className="font-serif text-[32px] leading-[1.08] text-white sm:text-[56px]">
              Your Ride. Your Rules.
            </h1>
            <p className="mx-auto mt-3 max-w-175 text-[13px] leading-[1.4] text-white/88 sm:text-[20px]">
              Receive a huge % off every ride, every time. Aleet Access gives you exclusive low
              rates across all vehicle types — book premium for less
            </p>
            <Button className="mx-auto max-w-48 mt-4 mb-2 h-11 w-auto px-6 text-[14px] sm:mt-6 sm:mb-3 sm:h-12.5 sm:px-8 sm:text-[16px]">
              Membership
            </Button>
          </section>

          <div className="mt-8 w-full sm:mt-4 2xl:mt-auto">
            <div className="mx-auto w-full max-w-295">
              <div className="relative z-30">
                <BookingForm />
              </div>

              <section className="relative z-10 mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4">
                <FeatureCard
                  title="Instant Pay Out"
                  text="Get paid faster on every completed trip"
                  icon={<PayoutIcon className="h-5 w-5 text-[#0d0e0b]" />}
                />
                <FeatureCard
                  title="Elite Guests Only"
                  text="Drive discerning clients who value luxury"
                  icon={<EliteIcon className="h-5 w-5 text-[#0d0e0b]" />}
                />
                <FeatureCard
                  title="Fully Controlled Schedule"
                  text="Enjoy total flexibility pick the rides you want"
                  icon={<ScheduleIcon className="h-5 w-5 text-[#0d0e0b]" />}
                />
              </section>
            </div>

            <AuthFooter />
          </div>
        </div>
      </div>
    </DayNightProvider>
  );
}

function FeatureCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-white/6 bg-[#111614] p-3 sm:rounded-2xl sm:p-6">
      <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-[#bca066]/8 blur-2xl" />

      <div className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#bca066] sm:mb-4 sm:h-12 sm:w-12">
        {icon}
      </div>

      <h3 className="text-[13px] font-semibold leading-snug text-white sm:text-[19px]">{title}</h3>
      <p className="mt-1 hidden text-[13px] leading-relaxed text-white/50 sm:mt-2 sm:block sm:text-[14px]">{text}</p>
    </article>
  );
}
