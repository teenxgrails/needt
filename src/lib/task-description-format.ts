export type TaskDescriptionFormat =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "heading1"
  | "heading2"
  | "bulletList"
  | "numberedList"
  | "checklist"
  | "image"
  | "code"
  | "link";

interface FormattedDescription {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const INLINE_FORMATS: Partial<
  Record<
    TaskDescriptionFormat,
    { before: string; after: string; fallback: string }
  >
> = {
  bold: { before: "**", after: "**", fallback: "bold text" },
  italic: { before: "*", after: "*", fallback: "italic text" },
  underline: { before: "<u>", after: "</u>", fallback: "underlined text" },
  strikethrough: { before: "~~", after: "~~", fallback: "struck text" },
  image: { before: "![", after: "](https://)", fallback: "image description" },
  code: { before: "`", after: "`", fallback: "code" },
  link: { before: "[", after: "](https://)", fallback: "link text" },
};

function prefixLines(
  selected: string,
  prefix: (index: number) => string,
  fallback: string
) {
  const value = selected || fallback;
  return value
    .split("\n")
    .map((line, index) => `${prefix(index)}${line}`)
    .join("\n");
}

export function formatTaskDescription(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: TaskDescriptionFormat
): FormattedDescription {
  const start = Math.max(0, Math.min(value.length, selectionStart));
  const end = Math.max(start, Math.min(value.length, selectionEnd));
  const selected = value.slice(start, end);
  const inline = INLINE_FORMATS[format];

  if (inline) {
    const content = selected || inline.fallback;
    const replacement = `${inline.before}${content}${inline.after}`;
    return {
      value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
      selectionStart: start + inline.before.length,
      selectionEnd: start + inline.before.length + content.length,
    };
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd);
  let replacement: string;

  switch (format) {
    case "heading1":
      replacement = `# ${lines || "Heading"}`;
      break;
    case "heading2":
      replacement = `## ${lines || "Heading"}`;
      break;
    case "bulletList":
      replacement = prefixLines(lines, () => "- ", "List item");
      break;
    case "numberedList":
      replacement = prefixLines(
        lines,
        (index) => `${index + 1}. `,
        "List item"
      );
      break;
    case "checklist":
      replacement = prefixLines(lines, () => "- [ ] ", "Checklist item");
      break;
    default:
      replacement = lines;
  }

  return {
    value: `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  };
}
