import { PrismaClient } from "@prisma/client";
import type { PrismaNeon as PrismaNeonAdapter } from "@prisma/adapter-neon";

type PrismaClientOptions = NonNullable<
  ConstructorParameters<typeof PrismaClient>[0]
>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isNeonPooledUrl(url: string | undefined): boolean {
  return Boolean(url?.includes("neon.tech") && url.includes("-pooler."));
}

function createNeonAdapter(url: string): PrismaNeonAdapter | null {
  try {
    // Optional runtime dependency: local development can run without these
    // packages installed, while Vercel/Neon uses them once dependencies are
    // installed from package.json.
    const optionalRequire = eval("require") as (moduleName: string) => unknown;
    const { PrismaNeon } = optionalRequire("@prisma/adapter-neon") as {
      PrismaNeon: new (config: {
        connectionString: string;
      }) => PrismaNeonAdapter;
    };
    return new PrismaNeon({ connectionString: url });
  } catch {
    return null;
  }
}

// Properly handle connection lifecycle
function createPrismaClient() {
  const neonAdapter = isNeonPooledUrl(process.env.DATABASE_URL)
    ? createNeonAdapter(process.env.DATABASE_URL!)
    : null;
  // Prisma 6.3's generated constructor type predates the adapter option while
  // Prisma 6.19 (used by pnpm/Vercel) includes it. Keep the compatibility cast
  // at this boundary; the adapter itself remains strongly typed above.
  const options = {
    ...(neonAdapter
      ? {
          adapter: neonAdapter,
        }
      : {}),
    log: ["error"],
  } as PrismaClientOptions;
  const client = new PrismaClient(options);

  // Ensure connection is properly closed before process exits
  process.on("beforeExit", async () => {
    await client.$disconnect();
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
