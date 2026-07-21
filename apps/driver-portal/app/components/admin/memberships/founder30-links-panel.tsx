"use client";

import { useEffect, useState } from "react";
import {
  createFounder30LinkClient,
  deactivateFounder30LinkClient,
  listFounder30LinksClient,
  type Founder30Link,
} from "@/lib/admin-memberships-api";
import { fetchAllRegionsClient, type ApiRegion } from "@/lib/admin-api";

export function Founder30LinksPanel() {
  const [links, setLinks] = useState<Founder30Link[]>([]);
  const [regions, setRegions] = useState<ApiRegion[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [label, setLabel] = useState("Founder 30 private deal");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [linkRows, regionRows] = await Promise.all([
        listFounder30LinksClient(),
        fetchAllRegionsClient(),
      ]);
      setLinks(linkRows);
      setRegions(regionRows.filter((r) => r.isActive !== false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Founder 30 links");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleRegion(id: string) {
    setSelectedRegionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const created = await createFounder30LinkClient({
        label: label.trim() || "Founder 30 private deal",
        regionIds: selectedRegionIds,
      });
      setLinks((prev) => [created, ...prev]);
      await navigator.clipboard.writeText(created.url);
      setCopiedId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(link: Founder30Link) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm("Deactivate this Founder 30 link?")) return;
    setBusy(true);
    try {
      const updated = await deactivateFounder30LinkClient(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
      <h3 className="text-base font-semibold text-text">Founder 30 private links</h3>
      <p className="mt-1 text-sm text-muted">
        Generate a copyable link for selected states/locations. Recipients open it,
        log in, and Founder 30 unlocks on their account for checkout.
      </p>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-xs text-muted">
          Link label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
          />
        </label>

        <div>
          <p className="mb-2 text-xs text-muted">
            Limit to regions (optional — leave empty for all)
          </p>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => {
              const active = selectedRegionIds.includes(r._id);
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => toggleRegion(r._id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border text-muted hover:text-text"
                  }`}
                >
                  {r.name} ({r.code})
                </button>
              );
            })}
            {regions.length === 0 && !loading ? (
              <span className="text-xs text-muted">No active regions found</span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCreate()}
          className="w-fit rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/20 disabled:opacity-50"
        >
          {busy ? "Working…" : "Generate & copy link"}
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        {loading ? (
          <p className="text-sm text-muted">Loading links…</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted">No Founder 30 links yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {links.map((link) => (
              <li
                key={link.id}
                className="rounded-xl border border-border bg-page-bg px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">
                      {link.label}
                      {!link.active ? (
                        <span className="ml-2 text-xs text-red-400">Inactive</span>
                      ) : null}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted">{link.url}</p>
                    <p className="mt-1 text-xs text-muted">
                      Uses: {link.useCount}
                      {link.maxUses != null ? ` / ${link.maxUses}` : ""}
                      {link.regions.length > 0
                        ? ` · Regions: ${link.regions.map((r) => r.code || r.name).join(", ")}`
                        : " · All regions"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy(link)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-gold/40 hover:text-gold"
                    >
                      {copiedId === link.id ? "Copied" : "Copy"}
                    </button>
                    {link.active ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeactivate(link.id)}
                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
