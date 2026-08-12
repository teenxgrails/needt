import { readFileSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

// Issue #151: the Docker quick-start failed for operators whose `.env` contained
// an unrelated `PORT` (e.g. `PORT=80`). `docker-compose.yml` forwards the whole
// `.env` into the app container via `env_file`, and the published image's
// Next.js standalone server honors `process.env.PORT` for its bind port - so the
// app bound to the wrong port while compose still mapped host 3000 -> container
// 3000, leaving nothing on localhost:3000. The fix pins `PORT=3000` on the app
// service's `environment` (which overrides `env_file`), so the published port
// always reaches a listening server. These tests pin that behavior + the docs.

const repoRoot = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

interface ComposeService {
  environment?: string[] | Record<string, string | number | null>;
  env_file?: string | string[];
  ports?: Array<string | number | { target?: number; published?: number }>;
}

describe("Docker quick-start (issue #151)", () => {
  const compose = parseYaml(read("docker-compose.yml")) as {
    services: Record<string, ComposeService>;
  };
  const app = compose.services.app;

  // Normalize the app service `environment` (list or map form) to a plain map.
  const appEnv: Record<string, string> = (() => {
    const env = app.environment;
    if (!env) return {};
    if (Array.isArray(env)) {
      return Object.fromEntries(
        env.map((entry) => {
          const idx = entry.indexOf("=");
          return idx === -1
            ? [entry, ""]
            : [entry.slice(0, idx), entry.slice(idx + 1)];
        })
      );
    }
    return Object.fromEntries(
      Object.entries(env).map(([k, v]) => [k, String(v ?? "")])
    );
  })();

  it("pins the container PORT to 3000 via environment (overrides any .env PORT)", () => {
    expect(appEnv.PORT).toBe("3000");
  });

  it("pins the container HOSTNAME to 0.0.0.0 so a .env HOSTNAME can't bind it to an unreachable address", () => {
    // The Next.js standalone server binds to process.env.HOSTNAME; a stray
    // HOSTNAME (e.g. `localhost`) forwarded from the operator's .env would bind
    // the server to loopback inside the container, leaving the published
    // 3000:3000 mapping pointed at an unreachable address - same failure class
    // as the PORT bug (#151 review).
    expect(appEnv.HOSTNAME).toBe("0.0.0.0");
  });

  it("publishes the app on container port 3000, matching the pinned PORT", () => {
    const ports = app.ports ?? [];
    const containerPorts = ports.map((p) => {
      if (typeof p === "object") return String(p.target ?? "");
      // "host:container" or "container" -> take the container side
      const str = String(p);
      const parts = str.split(":");
      return parts[parts.length - 1].split("/")[0];
    });
    expect(containerPorts).toContain("3000");
  });

  it("still loads the operator's .env via env_file", () => {
    const envFile = app.env_file;
    const envFiles = Array.isArray(envFile)
      ? envFile
      : envFile
        ? [envFile]
        : [];
    expect(envFiles).toContain(".env");
  });

  describe("README quick-start docs", () => {
    const readme = read("README.md");
    // Scope assertions to the Docker quick-start section.
    const section = (() => {
      const idx = readme.indexOf("### Quick Start with Docker");
      if (idx === -1) return readme;
      const next = readme.indexOf("\n### ", idx + 1);
      return next === -1 ? readme.slice(idx) : readme.slice(idx, next);
    })();

    // Isolate the explicit port note so trivial mentions elsewhere in the
    // quick-start (e.g. the NEXTAUTH_URL line in the env example) cannot mask a
    // missing instruction.
    const portNote = (() => {
      const idx = section.indexOf("Note on the port");
      if (idx === -1) return "";
      const next = section.indexOf("\n\n", idx);
      return next === -1 ? section.slice(idx) : section.slice(idx, next);
    })();

    it("explains the container port is fixed and PORT in .env does not change it", () => {
      expect(portNote).toContain("PORT");
      expect(portNote.toLowerCase()).toContain("ports");
    });

    it("warns that changing the host port also requires updating NEXTAUTH_URL to the same origin", () => {
      // Issue #151 review: the quick-start sets NEXTAUTH_URL=http://localhost:3000
      // and the app derives OAuth redirect URLs from it, so remapping the host
      // port without updating NEXTAUTH_URL breaks auth. The note must say so.
      expect(portNote).toContain("NEXTAUTH_URL");
    });
  });
});

describe("production migration tooling", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dockerfile = read("docker/production/Dockerfile");
  const rootDockerfile = read("Dockerfile");
  const entrypoint = read("entrypoint.sh");

  it("ships the pinned Prisma CLI in the production dependency layer", () => {
    expect(packageJson.dependencies?.prisma).toBe("^6.3.1");
    expect(packageJson.devDependencies?.prisma).toBeUndefined();
    expect(dockerfile).toContain("npm ci --omit=dev --ignore-scripts");
    expect(dockerfile).toContain(
      "/app/node_modules/@prisma/engines ./node_modules/@prisma/engines"
    );
    expect(dockerfile).toContain(
      "test -x /app/node_modules/@prisma/engines/schema-engine-*"
    );
    expect(dockerfile).toContain("RUN npm run build:worker");
    expect(dockerfile).toContain("/app/dist ./dist");
    expect(entrypoint).toContain('"$PRISMA_BIN" migrate deploy');
  });

  it("bundles the lockfile-pinned Prisma CLI in every runtime image", () => {
    expect(rootDockerfile).toContain("FROM base AS runtime-deps");
    expect(rootDockerfile).toContain(
      "npm ci --omit=dev --legacy-peer-deps --ignore-scripts"
    );
    expect(rootDockerfile).toContain(
      "/app/node_modules/@prisma/engines ./node_modules/@prisma/engines"
    );
    expect(rootDockerfile).toContain(
      "test -x /app/node_modules/@prisma/engines/schema-engine-*"
    );
    expect(rootDockerfile.match(/COPY --from=runtime-deps/g)).toHaveLength(3);
    expect(entrypoint).toContain("/app/node_modules/.bin/prisma");
  });

  it("starts collaboration from its ESM bundle", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.["build:collaboration"]).toContain(
      "--format=esm"
    );
    expect(packageJson.scripts?.["build:collaboration"]).toContain(
      "dist/collaboration/index.mjs"
    );
    expect(packageJson.scripts?.["start:collaboration"]).toContain(
      "dist/collaboration/index.mjs"
    );
    expect(rootDockerfile).toContain(
      'CMD ["node", "dist/collaboration/index.mjs"]'
    );
  });

  it("exposes the Coolify source commit as the runtime build identity", () => {
    expect(rootDockerfile).toContain("ARG SOURCE_COMMIT=local");
    expect(rootDockerfile).toContain("ENV NEEDT_BUILD_SHA=$SOURCE_COMMIT");
  });

  it("never downloads a floating Prisma major during container startup", () => {
    expect(entrypoint).not.toContain("npx --yes prisma");
    expect(entrypoint).not.toContain("prisma generate");
    expect(entrypoint).toContain('"$PRISMA_BIN" migrate deploy');
  });

  it("fails the container when migrations or required environment fail", () => {
    expect(entrypoint).toMatch(/^#!\/bin\/sh\nset -eu\n/);
  });
});

describe("production root redirect", () => {
  const middleware = read("src/middleware.ts");
  const homePage = read("src/app/page.tsx");

  it("does not fetch the application from its own middleware", () => {
    expect(middleware).not.toContain("getHomepageSetting");
    expect(middleware).not.toContain("Error fetching homepage setting");
    expect(middleware).not.toContain("X-Internal-Request");
  });

  it("leaves the auth-aware root redirect to the server page", () => {
    expect(homePage).toContain(
      'redirect(session ? "/calendar" : "/auth/signin")'
    );
    expect(middleware).toContain('if (pathname === "/")');
  });
});
