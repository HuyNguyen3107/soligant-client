import DOMPurify from "dompurify";

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

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "b",
      "i",
      "u",
      "strong",
      "em",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "span",
      "div",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "class",
      "style",
      "width",
      "height",
    ],
    ALLOW_DATA_ATTR: false,
  }).trim();
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
