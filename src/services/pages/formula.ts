type FormulaValue = string | number | boolean | null;

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "property"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "(" | ")" };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const character = expression[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if ("+-*/()".includes(character)) {
      tokens.push({
        type: "operator",
        value: character as "+" | "-" | "*" | "/" | "(" | ")",
      });
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      let value = "";
      index += 1;
      while (index < expression.length && expression[index] !== quote) {
        value += expression[index++];
      }
      if (expression[index] !== quote) throw new Error("Unclosed formula string");
      index += 1;
      tokens.push({ type: "string", value });
      continue;
    }
    if (character === "[") {
      const end = expression.indexOf("]", index + 1);
      if (end === -1) throw new Error("Unclosed property reference");
      tokens.push({ type: "property", value: expression.slice(index + 1, end).trim() });
      index = end + 1;
      continue;
    }
    const number = expression.slice(index).match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    throw new Error(`Unsupported formula token at ${index + 1}`);
  }
  return tokens;
}

export function evaluateFormula(
  expression: string,
  properties: Record<string, FormulaValue>
): FormulaValue {
  if (expression.length > 500) throw new Error("Formula is too long");
  const tokens = tokenize(expression);
  let cursor = 0;

  const primary = (): FormulaValue => {
    const token = tokens[cursor++];
    if (!token) throw new Error("Incomplete formula");
    if (token.type === "number" || token.type === "string") return token.value;
    if (token.type === "property") return properties[token.value] ?? null;
    if (token.value === "(") {
      const value = addition();
      const closing = tokens[cursor++];
      if (closing?.type !== "operator" || closing.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      return value;
    }
    if (token.value === "-") {
      const value = primary();
      return -Number(value ?? 0);
    }
    throw new Error("Invalid formula value");
  };

  const multiplication = (): FormulaValue => {
    let value = primary();
    while (
      tokens[cursor]?.type === "operator" &&
      (tokens[cursor].value === "*" || tokens[cursor].value === "/")
    ) {
      const operator = tokens[cursor++].value;
      const right = Number(primary() ?? 0);
      value = operator === "*" ? Number(value ?? 0) * right : Number(value ?? 0) / right;
    }
    return value;
  };

  const addition = (): FormulaValue => {
    let value = multiplication();
    while (
      tokens[cursor]?.type === "operator" &&
      (tokens[cursor].value === "+" || tokens[cursor].value === "-")
    ) {
      const operator = tokens[cursor++].value;
      const right = multiplication();
      value =
        operator === "+"
          ? typeof value === "string" || typeof right === "string"
            ? `${value ?? ""}${right ?? ""}`
            : Number(value ?? 0) + Number(right ?? 0)
          : Number(value ?? 0) - Number(right ?? 0);
    }
    return value;
  };

  if (tokens.length === 0) return null;
  const value = addition();
  if (cursor !== tokens.length) throw new Error("Unexpected formula token");
  return typeof value === "number" && !Number.isFinite(value) ? null : value;
}
