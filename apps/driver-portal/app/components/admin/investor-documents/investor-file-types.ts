export const INVESTOR_DOCUMENT_FILE_TYPES = [
  { label: "PDF", extension: ".pdf" },
  { label: "DOC", extension: ".doc" },
  { label: "DOCX", extension: ".docx" },
  { label: "XLS", extension: ".xls" },
  { label: "XLSX", extension: ".xlsx" },
  { label: "PPT", extension: ".ppt" },
  { label: "PPTX", extension: ".pptx" },
  { label: "JPG", extension: ".jpg" },
  { label: "JPEG", extension: ".jpeg" },
  { label: "PNG", extension: ".png" },
] as const;

export const INVESTOR_DOCUMENT_ACCEPT = INVESTOR_DOCUMENT_FILE_TYPES.map(
  (type) => type.extension,
).join(",");
