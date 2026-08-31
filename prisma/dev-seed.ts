/**
 * Local development seed.
 *
 * Fills one month with a deliberately UNEVEN load, because a month view only
 * breaks on edge cases: empty days, ordinary days, and one day carrying more
 * tasks than a cell can show. Pretty data hides exactly the layout bugs this
 * seed exists to expose.
 *
 * Never run this against a database that holds real data — it writes to the
 * local dev user only.
 *
 * Usage: npx tsx prisma/dev-seed.ts
 */
import {
  PrismaClient,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEV_EMAIL = "dev@needt.local";
const DEV_PASSWORD = "Needt-dev-Password1";

/** Categories carry the colour: the calendar reads a task's first tag. */
const CATEGORIES = [
  { name: "Resale", color: "#f5c451" },
  { name: "DEMESURES", color: "#f0565b" },
  { name: "Deutsch", color: "#2dd4bf" },
  { name: "Photo", color: "#82cffa" },
  { name: "Needt", color: "#3cc487" },
] as const;

type CategoryName = (typeof CATEGORIES)[number]["name"];

interface SeedTask {
  day: number;
  title: string;
  category: CategoryName;
  /** Hour of day; omit for a due-date-only task (renders all-day). */
  hour?: number;
  minutes?: number;
  status?: "todo" | "in_progress" | "completed";
  priority?: "high" | "medium" | "low";
}

/**
 * September 2026. The shape is the point:
 *  - many empty days, which is what a real month looks like
 *  - a few days with one or two items
 *  - day 8 carries eleven, so cell overflow and the "+N more" affordance are
 *    exercised rather than assumed
 *  - day 17 carries seven, a heavy-but-not-absurd day
 *  - mixed categories on the same day, so grouping and colour logic are visible
 */
const SEPTEMBER: SeedTask[] = [
  {
    day: 1,
    title: "Ответить покупателям на Vinted",
    category: "Resale",
    hour: 9,
    minutes: 30,
  },
  {
    day: 1,
    title: "Deutsch: Perfekt повторить",
    category: "Deutsch",
    hour: 19,
    minutes: 45,
  },

  {
    day: 3,
    title: "Отснять партию курток",
    category: "Photo",
    hour: 14,
    minutes: 120,
  },

  {
    day: 4,
    title: "Забрать посылку на почте",
    category: "Resale",
    hour: 8,
    minutes: 30,
  },
  {
    day: 4,
    title: "Выставить 6 позиций",
    category: "Resale",
    hour: 10,
    minutes: 90,
  },
  {
    day: 4,
    title: "Правки в tech pack",
    category: "DEMESURES",
    hour: 13,
    minutes: 60,
  },
  {
    day: 4,
    title: "Созвон с фабрикой",
    category: "DEMESURES",
    hour: 15,
    minutes: 45,
  },
  {
    day: 4,
    title: "Deutsch: Wortschatz",
    category: "Deutsch",
    hour: 18,
    minutes: 30,
  },
  {
    day: 4,
    title: "Ретушь для лукбука",
    category: "Photo",
    hour: 20,
    minutes: 60,
  },

  {
    day: 7,
    title: "Отправить 3 заказа",
    category: "Resale",
    hour: 9,
    minutes: 45,
  },
  { day: 7, title: "Разбор инбокса", category: "Needt", hour: 11, minutes: 30 },
  {
    day: 7,
    title: "Deutsch: аудирование",
    category: "Deutsch",
    hour: 19,
    minutes: 40,
  },

  // The overload day — eleven items in one cell.
  {
    day: 8,
    title: "Инвентаризация склада",
    category: "Resale",
    hour: 8,
    minutes: 90,
  },
  {
    day: 8,
    title: "Сфотать 12 позиций",
    category: "Photo",
    hour: 10,
    minutes: 120,
  },
  {
    day: 8,
    title: "Замеры и описания",
    category: "Resale",
    hour: 12,
    minutes: 60,
  },
  { day: 8, title: "Обед с Лукой", category: "Needt", hour: 13, minutes: 60 },
  {
    day: 8,
    title: "Выставить партию",
    category: "Resale",
    hour: 14,
    minutes: 90,
  },
  {
    day: 8,
    title: "Ответить на 20 сообщений",
    category: "Resale",
    hour: 16,
    minutes: 45,
  },
  {
    day: 8,
    title: "Правки лекал",
    category: "DEMESURES",
    hour: 17,
    minutes: 60,
  },
  {
    day: 8,
    title: "Счёт от фабрики проверить",
    category: "DEMESURES",
    hour: 18,
    minutes: 30,
  },
  {
    day: 8,
    title: "Deutsch: урок",
    category: "Deutsch",
    hour: 19,
    minutes: 60,
  },
  { day: 8, title: "Бэкап карточек", category: "Photo", hour: 21, minutes: 30 },
  {
    day: 8,
    title: "Закрыть неделю в брейне",
    category: "Needt",
    hour: 22,
    minutes: 30,
  },

  {
    day: 10,
    title: "Упаковать и отправить",
    category: "Resale",
    hour: 10,
    minutes: 60,
  },
  {
    day: 10,
    title: "Deutsch: грамматика",
    category: "Deutsch",
    hour: 19,
    minutes: 45,
  },

  {
    day: 11,
    title: "Сдать налоговую форму",
    category: "Needt",
    priority: "high",
  },

  {
    day: 14,
    title: "Закупка на барахолке",
    category: "Resale",
    hour: 7,
    minutes: 180,
  },
  {
    day: 14,
    title: "Чистка и стирка",
    category: "Resale",
    hour: 13,
    minutes: 90,
  },
  {
    day: 14,
    title: "Съёмка для DEMESURES",
    category: "Photo",
    hour: 16,
    minutes: 120,
  },
  {
    day: 14,
    title: "Deutsch: разговор",
    category: "Deutsch",
    hour: 20,
    minutes: 45,
  },

  {
    day: 16,
    title: "Выложить новые позиции",
    category: "Resale",
    hour: 11,
    minutes: 60,
  },
  {
    day: 16,
    title: "Обновить прайс",
    category: "Resale",
    hour: 15,
    minutes: 30,
  },

  {
    day: 17,
    title: "Sample от фабрики принять",
    category: "DEMESURES",
    hour: 9,
    minutes: 60,
  },
  {
    day: 17,
    title: "Замеры sample",
    category: "DEMESURES",
    hour: 10,
    minutes: 45,
  },
  { day: 17, title: "Фото sample", category: "Photo", hour: 12, minutes: 60 },
  {
    day: 17,
    title: "Написать фабрике правки",
    category: "DEMESURES",
    hour: 14,
    minutes: 45,
  },
  {
    day: 17,
    title: "Отправить 4 заказа",
    category: "Resale",
    hour: 16,
    minutes: 45,
  },
  {
    day: 17,
    title: "Deutsch: тест B1",
    category: "Deutsch",
    hour: 18,
    minutes: 90,
  },
  { day: 17, title: "Разбор дня", category: "Needt", hour: 22, minutes: 20 },

  {
    day: 18,
    title: "Забрать плёнку из проявки",
    category: "Photo",
    hour: 12,
    minutes: 30,
  },

  {
    day: 21,
    title: "Ответить покупателям",
    category: "Resale",
    hour: 9,
    minutes: 45,
  },
  {
    day: 21,
    title: "Правки в лендинге",
    category: "Needt",
    hour: 14,
    minutes: 120,
  },
  {
    day: 21,
    title: "Deutsch: Wortschatz",
    category: "Deutsch",
    hour: 19,
    minutes: 30,
  },

  {
    day: 23,
    title: "Отправка партии",
    category: "Resale",
    hour: 10,
    minutes: 60,
  },
  {
    day: 23,
    title: "Счета за месяц",
    category: "Needt",
    hour: 12,
    minutes: 45,
  },
  {
    day: 23,
    title: "Съёмка на плёнку",
    category: "Photo",
    hour: 15,
    minutes: 150,
  },
  {
    day: 23,
    title: "Созвон по ткани",
    category: "DEMESURES",
    hour: 18,
    minutes: 30,
  },
  {
    day: 23,
    title: "Deutsch: аудирование",
    category: "Deutsch",
    hour: 20,
    minutes: 40,
  },

  { day: 24, title: "Продлить абонемент", category: "Needt" },

  {
    day: 25,
    title: "Выставить остатки",
    category: "Resale",
    hour: 11,
    minutes: 90,
  },
  { day: 25, title: "Ретушь", category: "Photo", hour: 16, minutes: 60 },

  {
    day: 28,
    title: "Инвентаризация",
    category: "Resale",
    hour: 9,
    minutes: 60,
  },
  {
    day: 28,
    title: "План на октябрь",
    category: "Needt",
    hour: 11,
    minutes: 45,
  },
  {
    day: 28,
    title: "Deutsch: урок",
    category: "Deutsch",
    hour: 19,
    minutes: 60,
  },

  {
    day: 30,
    title: "Закрыть месяц по деньгам",
    category: "Needt",
    hour: 10,
    minutes: 60,
  },
  {
    day: 30,
    title: "Отправить последние заказы",
    category: "Resale",
    hour: 14,
    minutes: 45,
  },
];

/** A few completed items in late August, so past-day styling is visible too. */
const AUGUST: SeedTask[] = [
  {
    day: 26,
    title: "Забрать заказ",
    category: "Resale",
    hour: 10,
    minutes: 30,
    status: "completed",
  },
  {
    day: 27,
    title: "Deutsch: урок",
    category: "Deutsch",
    hour: 19,
    minutes: 60,
    status: "completed",
  },
  {
    day: 28,
    title: "Съёмка",
    category: "Photo",
    hour: 15,
    minutes: 120,
    status: "completed",
  },
  {
    day: 31,
    title: "Разгрести инбокс",
    category: "Needt",
    hour: 11,
    minutes: 45,
    status: "in_progress",
  },
  {
    day: 31,
    title: "Ответить покупателям",
    category: "Resale",
    hour: 16,
    minutes: 30,
  },
];

async function main() {
  const passwordHash = await hash(DEV_PASSWORD, 8);

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { role: "admin" },
    create: { email: DEV_EMAIL, name: "Dev", role: "admin" },
  });

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credentials",
        providerAccountId: DEV_EMAIL,
      },
    },
    update: { userId: user.id, id_token: passwordHash },
    create: {
      userId: user.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: DEV_EMAIL,
      id_token: passwordHash,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: SubscriptionPlan.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      plan: SubscriptionPlan.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  const tagIds = new Map<CategoryName, string>();
  for (const category of CATEGORIES) {
    const tag = await prisma.tag.upsert({
      where: { name_userId: { name: category.name, userId: user.id } },
      update: { color: category.color },
      create: { name: category.name, color: category.color, userId: user.id },
    });
    tagIds.set(category.name, tag.id);
  }

  // Rebuild the seeded set on every run so repeated runs stay idempotent.
  const seededTitles = [...SEPTEMBER, ...AUGUST].map((task) => task.title);
  await prisma.task.deleteMany({
    where: { userId: user.id, title: { in: seededTitles } },
  });

  const createTask = async (task: SeedTask, year: number, month: number) => {
    const tagId = tagIds.get(task.category);
    if (!tagId) throw new Error(`Unknown category: ${task.category}`);

    const scheduled = task.hour !== undefined;
    const start = new Date(year, month, task.day, task.hour ?? 0, 0, 0, 0);
    const end = new Date(start.getTime() + (task.minutes ?? 60) * 60 * 1000);
    const status = task.status ?? "todo";

    await prisma.task.create({
      data: {
        title: task.title,
        status,
        userId: user.id,
        priority: task.priority ?? "medium",
        duration: task.minutes ?? 60,
        dueDate: new Date(year, month, task.day, 12, 0, 0, 0),
        isAutoScheduled: scheduled,
        scheduledStart: scheduled ? start : null,
        scheduledEnd: scheduled ? end : null,
        completedAt: status === "completed" ? end : null,
        tags: { connect: { id: tagId } },
      },
    });
  };

  for (const task of SEPTEMBER) await createTask(task, 2026, 8);
  for (const task of AUGUST) await createTask(task, 2026, 7);

  const counts = SEPTEMBER.reduce<Record<number, number>>((acc, task) => {
    acc[task.day] = (acc[task.day] ?? 0) + 1;
    return acc;
  }, {});
  const busiest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  console.log(
    `Seeded ${SEPTEMBER.length + AUGUST.length} tasks for ${DEV_EMAIL}`
  );
  console.log(`Password: ${DEV_PASSWORD}`);
  console.log(
    `September: ${Object.keys(counts).length} days carry work, ${30 - Object.keys(counts).length} are empty`
  );
  console.log(`Busiest day: September ${busiest[0]} with ${busiest[1]} tasks`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
