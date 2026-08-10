import { parseDesignTokens } from "@/lib/design-tokens";

const tokens = {
  name: "Night blue",
  mode: "dark",
  canvas: "#101820",
  control: "#18242f",
  controlHover: "#20303d",
  hover: "#223541",
  borderSubtle: "#2d3c48",
  border: "#405364",
  text: "#edf5ff",
  textSecondary: "#adc1d3",
  muted: "#73889b",
  accent: "#4a7bff",
  radius: 8,
};

describe("design tokens", () => {
  it("accepts a complete semantic token object", () => {
    expect(parseDesignTokens(tokens)).toEqual(tokens);
  });

  it("rejects incomplete and unsafe token objects", () => {
    expect(parseDesignTokens({ ...tokens, accent: "red" })).toBeNull();
    expect(parseDesignTokens({ ...tokens, radius: 20 })).toBeNull();
    expect(parseDesignTokens({ ...tokens, mode: "system" })).toBeNull();
  });
});
