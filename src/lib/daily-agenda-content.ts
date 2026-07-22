import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "u",
  "ul",
];

export function sanitizeDailyAgendaContent(content: string) {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["checked", "data-checked", "data-task-id", "data-type"],
    ALLOW_DATA_ATTR: false,
  }).trim();
}
