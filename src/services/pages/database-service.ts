import { DatabasePropertyType, DatabaseViewType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { evaluateFormula } from "./formula";

async function ownedDatabase(userId: string, databaseId: string) {
  return prisma.pageDatabase.findFirst({
    where: { id: databaseId, page: { userId, trashedAt: null } },
    include: {
      page: true,
      properties: { orderBy: { position: "asc" } },
      views: { orderBy: { position: "asc" } },
      records: {
        orderBy: { position: "asc" },
        include: { page: true, values: true },
      },
    },
  });
}

export async function getDatabase(userId: string, databaseId: string) {
  return ownedDatabase(userId, databaseId);
}

export async function createDatabaseProperty(
  userId: string,
  databaseId: string,
  input: {
    name: string;
    type: DatabasePropertyType;
    config?: Prisma.InputJsonValue;
  }
) {
  const database = await ownedDatabase(userId, databaseId);
  if (!database) return null;
  return prisma.databaseProperty.create({
    data: {
      databaseId,
      name: input.name.trim().slice(0, 120) || "Property",
      type: input.type,
      config: input.config,
      position: (database.properties.at(-1)?.position ?? 0) + 1024,
    },
  });
}

export async function createDatabaseView(
  userId: string,
  databaseId: string,
  input: { name: string; type: DatabaseViewType }
) {
  const database = await ownedDatabase(userId, databaseId);
  if (!database) return null;
  return prisma.databaseView.create({
    data: {
      databaseId,
      name: input.name.trim().slice(0, 120) || input.type.toLowerCase(),
      type: input.type,
      position: (database.views.at(-1)?.position ?? 0) + 1024,
    },
  });
}

export async function createDatabaseRecord(
  userId: string,
  databaseId: string,
  input: { title?: string; values?: Record<string, Prisma.InputJsonValue> }
) {
  const database = await ownedDatabase(userId, databaseId);
  if (!database) return null;
  const validPropertyIds = new Set(
    database.properties.map((property) => property.id)
  );
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.create({
      data: {
        userId,
        parentId: database.pageId,
        title: input.title?.trim().slice(0, 240) || "Untitled",
        isPrivate: database.page.isPrivate,
        position: (database.records.at(-1)?.position ?? 0) + 1024,
        blocks: {
          create: { type: "PARAGRAPH", content: { text: "" }, position: 1024 },
        },
      },
    });
    return tx.databaseRecord.create({
      data: {
        databaseId,
        pageId: page.id,
        position: page.position,
        values: {
          create: Object.entries(input.values ?? {})
            .filter(([propertyId]) => validPropertyIds.has(propertyId))
            .map(([propertyId, value]) => ({ propertyId, value })),
        },
      },
      include: { page: true, values: true },
    });
  });
}

export async function updateDatabaseRecord(
  userId: string,
  recordId: string,
  input: { title?: string; values?: Record<string, Prisma.InputJsonValue> }
) {
  const record = await prisma.databaseRecord.findFirst({
    where: { id: recordId, database: { page: { userId, trashedAt: null } } },
    include: { database: { include: { properties: true } } },
  });
  if (!record) return null;
  const validPropertyIds = new Set(
    record.database.properties.map((property) => property.id)
  );
  return prisma.$transaction(async (tx) => {
    if (input.title !== undefined) {
      await tx.page.update({
        where: { id: record.pageId },
        data: { title: input.title.trim().slice(0, 240) || "Untitled" },
      });
    }
    for (const [propertyId, value] of Object.entries(input.values ?? {})) {
      if (!validPropertyIds.has(propertyId)) continue;
      await tx.databaseValue.upsert({
        where: { recordId_propertyId: { recordId, propertyId } },
        create: { recordId, propertyId, value },
        update: { value },
      });
    }
    return tx.databaseRecord.findUnique({
      where: { id: recordId },
      include: { page: true, values: true },
    });
  });
}

export async function deleteDatabaseRecord(userId: string, recordId: string) {
  const record = await prisma.databaseRecord.findFirst({
    where: { id: recordId, database: { page: { userId, trashedAt: null } } },
    select: { pageId: true },
  });
  if (!record) return false;
  await prisma.page.delete({ where: { id: record.pageId } });
  return true;
}

interface QueryFilter {
  propertyId: string;
  operator: "equals" | "contains" | "is_empty";
  value?: unknown;
}

interface QuerySort {
  propertyId?: string;
  field?: "title" | "updatedAt";
  direction: "asc" | "desc";
}

export async function queryDatabase(
  userId: string,
  databaseId: string,
  input: { filters?: QueryFilter[]; sort?: QuerySort[] }
) {
  const database = await ownedDatabase(userId, databaseId);
  if (!database) return null;
  const propertyById = new Map(
    database.properties.map((property) => [property.id, property])
  );
  const projected = database.records.map((record) => {
    const values = Object.fromEntries(
      record.values.map((entry) => [entry.propertyId, entry.value])
    );
    const byName = Object.fromEntries(
      database.properties.map((property) => [
        property.name,
        values[property.id] as string | number | boolean | null,
      ])
    );
    for (const property of database.properties) {
      if (property.type !== DatabasePropertyType.FORMULA) continue;
      const expression =
        property.config &&
        typeof property.config === "object" &&
        !Array.isArray(property.config)
          ? (property.config as Prisma.JsonObject).expression
          : undefined;
      if (typeof expression === "string") {
        try {
          values[property.id] = evaluateFormula(expression, byName);
        } catch {
          values[property.id] = null;
        }
      }
    }
    return { ...record, values };
  });

  const filtered = projected.filter((record) =>
    (input.filters ?? []).every((filter) => {
      if (!propertyById.has(filter.propertyId)) return true;
      const value = record.values[filter.propertyId];
      if (filter.operator === "is_empty")
        return value === null || value === undefined || value === "";
      if (filter.operator === "contains")
        return String(value ?? "")
          .toLowerCase()
          .includes(String(filter.value ?? "").toLowerCase());
      return (
        JSON.stringify(value ?? null) === JSON.stringify(filter.value ?? null)
      );
    })
  );

  return filtered.sort((left, right) => {
    for (const sort of input.sort ?? []) {
      const leftValue = sort.field
        ? left.page[sort.field]
        : sort.propertyId
          ? left.values[sort.propertyId]
          : null;
      const rightValue = sort.field
        ? right.page[sort.field]
        : sort.propertyId
          ? right.values[sort.propertyId]
          : null;
      const comparison = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        undefined,
        { numeric: true }
      );
      if (comparison !== 0)
        return sort.direction === "desc" ? -comparison : comparison;
    }
    return left.position - right.position;
  });
}
