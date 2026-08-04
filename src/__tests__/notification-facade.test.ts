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
      path.join(process.cwd(), "src/hooks"),
      path.join(process.cwd(), "src/lib"),
      path.join(process.cwd(), "src/store"),
    ];
    const offenders = roots
      .flatMap(sourceFiles)
      .filter(
        (file) =>
          ![
            "src/components/ui/sonner.tsx",
            "src/lib/notifications.ts",
          ].includes(path.relative(process.cwd(), file))
      )
      .filter((file) =>
        fs.readFileSync(file, "utf8").includes('from "sonner"')
      )
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("uses the shared accessible toast queue", () => {
    const toaster = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/sonner.tsx"),
      "utf8"
    );
    const facade = fs.readFileSync(
      path.join(process.cwd(), "src/lib/notifications.ts"),
      "utf8"
    );

    expect(toaster).toContain("visibleToasts={3}");
    expect(toaster).toContain('containerAriaLabel="Needt notifications"');
    expect(toaster).toContain('closeButtonAriaLabel: "Dismiss notification"');
    expect(facade).toContain("dedupeKey");
  });
});
