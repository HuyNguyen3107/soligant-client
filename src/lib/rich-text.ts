const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const isLikelyHtml = (value: string) => HTML_TAG_REGEX.test(value);

export const sanitizeRichTextHtml = (value: string) => {
  if (!value) return "";

  let sanitized = value;

  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  sanitized = sanitized.replace(/<(iframe|object|embed|meta|link)[^>]*>/gi, "");
  sanitized = sanitized.replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  sanitized = sanitized.replace(
    /\s(href|src)=("|')\s*javascript:[^"']*("|')/gi,
    "",
  );

  return sanitized.trim();
};

export const toRichTextHtml = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  if (isLikelyHtml(normalized)) {
    return sanitizeRichTextHtml(normalized);
  }

  return `<p>${escapeHtml(normalized).replace(/\n/g, "<br />")}</p>`;
};

export const toRichTextPlainText = (value?: string | null) => {
  const normalized = String(value ?? "");
  if (!normalized.trim()) return "";

  if (!isLikelyHtml(normalized)) {
    return normalized.replace(/\s+/g, " ").trim();
  }

  return normalized
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isRichTextEmpty = (value?: string | null) =>
  toRichTextPlainText(value).length === 0;

export const normalizeRichTextForStorage = (value?: string | null) =>
  toRichTextHtml(value);
