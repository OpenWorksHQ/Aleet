"use client";

import { useEffect, useState } from "react";
import { Building2, Car, Lock, MapPin } from "lucide-react";
import { getInvestorDocuments, type InvestorDocument } from "@/lib/api/teams";
import { AccessRequestForm } from "./access-request-form";

const BUILDING_BLOCKS = [
  {
    title: "Transportation Layer",
    description:
      "A luxury chauffeur network with routing, matching, and client logistics tech behind the scenes.",
    icon: Car,
  },
  {
    title: "Operation Layer",
    description:
      "Opening legal, investor, and market leads in select cities. Equity or cash-based.",
    icon: Building2,
  },
  {
    title: "Expansion Plan",
    description: "DC is live, NYC, Miami and LA are queued.",
    icon: MapPin,
  },
] as const;

export function TeamsPortal() {
  const [documents, setDocuments] = useState<InvestorDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  console.log("documents", documents);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const response = await getInvestorDocuments();
        if (!cancelled) {
          setDocuments(response.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocuments(false);
        }
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  const openDocument = (document: InvestorDocument) => {
    window.open(document.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <section className="flex flex-1 flex-col px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div className="flex items-start gap-3">
            <Lock
              className="mt-2 h-5 w-5 shrink-0 text-[#bca066] sm:mt-3"
              strokeWidth={1.75}
              aria-hidden
            />
            <div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
                Aleet Teams Portal
              </h1>
              <p className="mt-1 text-[15px] text-[#9a9a9a]">
                Private Access for Strategic Builders
              </p>
            </div>
          </div>

          <p className="mt-8 max-w-[620px] text-[14px] leading-[1.65] text-[#b8b8b8] sm:text-[15px]">
            Submit your info to join Aleet&apos;s early investor, legal, or
            leadership circle. One page. One form. No noise. Just execution.
          </p>

          <h2 className="mt-10 max-w-[640px] text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[30px]">
            Aleet is building the future of luxury transportation — quietly.
          </h2>

          <p className="mt-5 max-w-[620px] text-[14px] leading-[1.65] text-[#9a9a9a] sm:text-[15px]">
            We&apos;re building a legal investor network, routing, matching, and
            client logistics tech behind the scenes.
          </p>

          <div className="mt-12">
            <h3 className="text-[22px] font-bold text-[#d8d8d8]">
              What We&apos;re Building Toward
            </h3>

            <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
              {BUILDING_BLOCKS.map(({ title, description, icon: Icon }) => (
                <li key={title} className="flex gap-3">
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#bca066]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[14px] font-medium text-white sm:text-[15px]">
                      {title}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-[1.6] text-[#8a8a8a] sm:text-[14px]">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {isLoadingDocuments ? (
            <p className="mt-12 text-[13px] text-[#666666]">
              Loading resources...
            </p>
          ) : documents.length > 0 ? (
            <div className="mt-12 flex flex-wrap gap-3">
              {documents.map((document) => (
                <button
                  key={document._id}
                  type="button"
                  onClick={() => openDocument(document)}
                  title={document.title}
                  className="rounded-md border border-[#333333] px-4 py-2 text-[13px] text-[#e8e8e8] transition-colors hover:border-[#bca066] hover:text-[#ffffff]"
                >
                  {document.label}
                </button>
              ))}
            </div>
          ) : null}

          <p className="mt-6 text-[14px] leading-[1.6] text-[#666666]">
            All content is shared for early alignment only. Internal tools,
            client lists, and ops models are protected.
          </p>
        </section>

        <div className="hidden w-px bg-[#222222] lg:block" aria-hidden />

        <section className="border-t border-[#222222] px-6 py-10 sm:px-10 sm:py-12 lg:w-[440px] lg:shrink-0 lg:border-t-0 lg:px-10 lg:py-16 xl:w-[480px] xl:px-12">
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">
            Join Aleet&apos;s Early Builder Circle
          </h2>

          <div className="mt-8">
            <AccessRequestForm />
          </div>
        </section>
      </div>
    </div>
  );
}
