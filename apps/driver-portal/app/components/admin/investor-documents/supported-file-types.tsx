import { INVESTOR_DOCUMENT_FILE_TYPES } from "./investor-file-types";

type Props = {
  compact?: boolean;
};

export function SupportedFileTypes({ compact = false }: Props) {
  return (
    <div
      className={
        compact
          ? "mt-2"
          : "rounded-xl border border-border bg-card-bg px-4 py-3"
      }
    >
      <p
        className={
          compact
            ? "mb-1.5 text-xs text-muted"
            : "mb-2 text-xs font-medium uppercase tracking-wider text-muted"
        }
      >
        Supported file formats
      </p>
      <div className="flex flex-wrap gap-1.5">
        {INVESTOR_DOCUMENT_FILE_TYPES.map((type) => (
          <span
            key={type.label}
            className="rounded-md border border-border/60 bg-page-bg px-2 py-0.5 text-xs font-medium text-text"
          >
            {type.label}
          </span>
        ))}
      </div>
    </div>
  );
}
