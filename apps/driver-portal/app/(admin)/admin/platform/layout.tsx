import { PlatformSubnav } from "@/app/components/admin/platform/platform-subnav";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PlatformSubnav />
      {children}
    </div>
  );
}
