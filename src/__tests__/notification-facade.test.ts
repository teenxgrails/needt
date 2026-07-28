import fs from "node:fs";
import path from "node:path";

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

describe("notification facade", () => {
  it("keeps product surfaces decoupled from Sonner", () => {
    const roots = [
      path.join(process.cwd(), "src/app"),
      path.join(process.cwd(), "src/components"),
    ];
    const offenders = roots
      .flatMap(sourceFiles)
      .filter(
        (file) =>
          path.relative(process.cwd(), file) !==
          "src/components/ui/sonner.tsx"
      )
      .filter((file) =>
        fs.readFileSync(file, "utf8").includes('from "sonner"')
      )
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
