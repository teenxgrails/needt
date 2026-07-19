import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";

import {
  VISUAL_TEST_BOARD_COLUMNS,
  VISUAL_TEST_BOARD_ID,
  VISUAL_TEST_EMAIL,
  VISUAL_TEST_PASSWORD,
  VISUAL_TEST_TASK_IDS,
} from "./fixtures";

export default async function globalSetup() {
  const passwordHash = await hash(VISUAL_TEST_PASSWORD, 8);
  const user = await prisma.user.upsert({
    where: { email: VISUAL_TEST_EMAIL },
    update: {
      name: "Visual QA",
      role: "admin",
    },
    create: {
      email: VISUAL_TEST_EMAIL,
      name: "Visual QA",
      role: "admin",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credentials",
        providerAccountId: VISUAL_TEST_EMAIL,
      },
    },
    update: {
      userId: user.id,
      id_token: passwordHash,
    },
    create: {
      userId: user.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: VISUAL_TEST_EMAIL,
      id_token: passwordHash,
    },
  });

  await Promise.all([
    prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        theme: "dark",
        defaultView: "week",
        timeZone: "Europe/Zurich",
        weekStartDay: "monday",
        timeFormat: "12h",
      },
      create: {
        userId: user.id,
        theme: "dark",
        defaultView: "week",
        timeZone: "Europe/Zurich",
        weekStartDay: "monday",
        timeFormat: "12h",
      },
    }),
    prisma.calendarSettings.upsert({
      where: { userId: user.id },
      update: {
        workingHoursEnabled: true,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        workingHoursDays: "[1,2,3,4,5]",
      },
      create: {
        userId: user.id,
        workingHoursEnabled: true,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        workingHoursDays: "[1,2,3,4,5]",
      },
    }),
    prisma.userCustomization.upsert({
      where: { userId: user.id },
      update: {
        themePreset: "needt",
        animationsEnabled: false,
        sidebarWidth: 244,
      },
      create: {
        userId: user.id,
        themePreset: "needt",
        animationsEnabled: false,
        sidebarWidth: 244,
      },
    }),
    prisma.systemSettings.upsert({
      where: { id: "default" },
      update: { disableHomepage: false, publicSignup: false },
      create: {
        id: "default",
        disableHomepage: false,
        publicSignup: false,
        logDestination: "db",
        logLevel: "error",
      },
    }),
  ]);

  await prisma.focusSession.deleteMany({ where: { userId: user.id } });

  await prisma.board.upsert({
    where: { id: VISUAL_TEST_BOARD_ID },
    update: {
      userId: user.id,
      name: "Launch plan",
      icon: "🚀",
      position: 0,
    },
    create: {
      id: VISUAL_TEST_BOARD_ID,
      userId: user.id,
      name: "Launch plan",
      icon: "🚀",
      position: 0,
    },
  });
  await prisma.boardColumn.deleteMany({
    where: { boardId: VISUAL_TEST_BOARD_ID },
  });
  await prisma.boardColumn.createMany({
    data: [
      {
        id: VISUAL_TEST_BOARD_COLUMNS.next,
        boardId: VISUAL_TEST_BOARD_ID,
        name: "Next",
        color: "#60a5fa",
        position: 0,
      },
      {
        id: VISUAL_TEST_BOARD_COLUMNS.doing,
        boardId: VISUAL_TEST_BOARD_ID,
        name: "In progress",
        color: "#fbbf24",
        position: 1,
      },
      {
        id: VISUAL_TEST_BOARD_COLUMNS.done,
        boardId: VISUAL_TEST_BOARD_ID,
        name: "Done",
        color: "#34d399",
        position: 2,
      },
    ],
  });

  await prisma.task.deleteMany({
    where: {
      OR: [{ userId: user.id }, { id: { in: [...VISUAL_TEST_TASK_IDS] } }],
    },
  });
  await prisma.task.createMany({
    data: [
      {
        id: "visual-task-plan",
        userId: user.id,
        title: "Plan the launch",
        description:
          "<!--needt-rich-text:v1--><p>Review the brief and choose the <strong>next action</strong>.</p>",
        status: "todo",
        duration: 30,
        estimatedMinutes: 30,
        startDate: new Date("2026-07-16T00:00:00+02:00"),
        dueDate: new Date("2026-07-16T23:59:00+02:00"),
        isAutoScheduled: false,
        boardId: VISUAL_TEST_BOARD_ID,
        boardColumnId: VISUAL_TEST_BOARD_COLUMNS.next,
        boardPosition: 0,
      },
      {
        id: "visual-task-morning",
        userId: user.id,
        title: "Morning deep work",
        description:
          '<!--needt-rich-text:v1--><h2>Focus block</h2><ul data-type="taskList"><li data-checked="false"><p>Draft the first section</p></li></ul>',
        status: "todo",
        duration: 60,
        estimatedMinutes: 60,
        scheduledStart: new Date("2026-07-16T09:00:00+02:00"),
        scheduledEnd: new Date("2026-07-16T10:00:00+02:00"),
        startDate: new Date("2026-07-16T00:00:00+02:00"),
        dueDate: new Date("2026-07-16T23:59:00+02:00"),
        isAutoScheduled: true,
        autoScheduled: true,
        boardId: VISUAL_TEST_BOARD_ID,
        boardColumnId: VISUAL_TEST_BOARD_COLUMNS.doing,
        boardPosition: 0,
      },
      {
        id: "visual-task-afternoon",
        userId: user.id,
        title: "Review calendar sync",
        description: "Check the latest provider status.",
        status: "todo",
        duration: 45,
        estimatedMinutes: 45,
        scheduledStart: new Date("2026-07-16T14:00:00+02:00"),
        scheduledEnd: new Date("2026-07-16T14:45:00+02:00"),
        startDate: new Date("2026-07-16T00:00:00+02:00"),
        dueDate: new Date("2026-07-16T23:59:00+02:00"),
        isAutoScheduled: true,
        autoScheduled: true,
        boardId: VISUAL_TEST_BOARD_ID,
        boardColumnId: VISUAL_TEST_BOARD_COLUMNS.next,
        boardPosition: 1,
      },
      {
        id: "visual-task-evening",
        userId: user.id,
        title: "Evening shutdown",
        status: "todo",
        duration: 20,
        estimatedMinutes: 20,
        scheduledStart: new Date("2026-07-16T18:30:00+02:00"),
        scheduledEnd: new Date("2026-07-16T18:50:00+02:00"),
        startDate: new Date("2026-07-16T00:00:00+02:00"),
        dueDate: new Date("2026-07-16T23:59:00+02:00"),
        isAutoScheduled: true,
        autoScheduled: true,
      },
    ],
  });

  const mailAccount = await prisma.mailAccount.upsert({
    where: {
      userId_provider_address: {
        userId: user.id,
        provider: "IMAP",
        address: "visual@needt.local",
      },
    },
    update: {
      status: "ACTIVE",
      lastSyncAt: new Date("2026-07-16T10:20:00+02:00"),
    },
    create: {
      userId: user.id,
      provider: "IMAP",
      address: "visual@needt.local",
      status: "ACTIVE",
      lastSyncAt: new Date("2026-07-16T10:20:00+02:00"),
    },
  });
  await prisma.mailMessage.deleteMany({ where: { accountId: mailAccount.id } });
  await prisma.mailMessage.createMany({
    data: [
      {
        accountId: mailAccount.id,
        externalId: "visual-mail-launch",
        fromName: "Maya Chen",
        fromAddress: "maya@example.com",
        toAddresses: ["visual@needt.local"],
        subject: "Launch review notes",
        snippet: "The timeline looks good. Two decisions are still open.",
        date: new Date("2026-07-16T09:42:00+02:00"),
        isRead: false,
        labels: ["inbox"],
        bodyHtml:
          "<p>Hi,</p><p>The timeline looks good. We only need to settle the launch copy and the final calendar check.</p><p>Thanks,<br>Maya</p>",
      },
      {
        accountId: mailAccount.id,
        externalId: "visual-mail-calendar",
        fromName: "Calendar operations",
        fromAddress: "ops@example.com",
        toAddresses: ["visual@needt.local"],
        subject: "Calendar sync is ready",
        snippet: "All provider checks passed this morning.",
        date: new Date("2026-07-16T08:15:00+02:00"),
        isRead: true,
        labels: ["inbox"],
        bodyHtml:
          "<p>All provider checks passed this morning. No action is needed.</p>",
      },
    ],
  });

  await prisma.aISettings.upsert({
    where: { userId: user.id },
    update: { provider: "NONE", encryptedApiKey: null },
    create: { userId: user.id, provider: "NONE" },
  });
  await prisma.aiConversation.deleteMany({ where: { userId: user.id } });
  await prisma.aiConversation.create({
    data: {
      id: "visual-ai-conversation",
      userId: user.id,
      title: "Today’s priorities",
      createdAt: new Date("2026-07-16T08:00:00+02:00"),
      updatedAt: new Date("2026-07-16T08:05:00+02:00"),
      messages: {
        create: [
          {
            id: "visual-ai-message-user",
            userId: user.id,
            role: "user",
            content: "What should I focus on first?",
            createdAt: new Date("2026-07-16T08:00:00+02:00"),
          },
          {
            id: "visual-ai-message-assistant",
            userId: user.id,
            role: "assistant",
            content:
              "Start with Morning deep work while your energy window is high, then review calendar sync after lunch.",
            createdAt: new Date("2026-07-16T08:01:00+02:00"),
          },
        ],
      },
    },
  });
}
