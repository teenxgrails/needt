import { prisma } from "@/lib/prisma";

type ConnectorWebhookEvent = "schedule.changed" | "task.completed";

export async function sendConnectorWebhook(input: {
  userId: string;
  event: ConnectorWebhookEvent;
  payload: unknown;
}) {
  const settings = await prisma.connectorSettings.findUnique({
    where: { userId: input.userId },
  });

  if (!settings?.webhookUrl) return;
  if (input.event === "schedule.changed" && !settings.webhookSchedule) return;
  if (input.event === "task.completed" && !settings.webhookTaskComplete) return;

  await fetch(settings.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: input.event,
      createdAt: new Date().toISOString(),
      payload: input.payload,
    }),
  }).catch(() => {
    // Webhooks are best-effort; scheduling and task completion must not fail.
  });
}
