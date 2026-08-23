import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/prisma";

type AppliedMigrationRow = {
  migration_name: string;
};

export type MigrationStatus = {
  pending: string[];
};

type MigrationStatusDependencies = {
  getAppliedMigrationNames?: () => Promise<string[]>;
  getPackagedMigrationNames?: () => Promise<string[]>;
};

export async function getPackagedMigrationNames(): Promise<string[]> {
  const migrationsDirectory = join(process.cwd(), "prisma", "migrations");
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function getAppliedMigrationNames(): Promise<string[]> {
  const rows = await prisma.$queryRaw<AppliedMigrationRow[]>`
    SELECT "migration_name"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
  `;

  return rows.map((row) => row.migration_name);
}

export async function getMigrationStatus(
  dependencies: MigrationStatusDependencies = {}
): Promise<MigrationStatus> {
  const [packagedMigrationNames, appliedMigrationNames] = await Promise.all([
    (dependencies.getPackagedMigrationNames ?? getPackagedMigrationNames)(),
    (dependencies.getAppliedMigrationNames ?? getAppliedMigrationNames)(),
  ]);
  const appliedMigrations = new Set(appliedMigrationNames);

  return {
    pending: packagedMigrationNames.filter(
      (migrationName) => !appliedMigrations.has(migrationName)
    ),
  };
}
