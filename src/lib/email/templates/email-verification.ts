import { APP_NAME } from "@/lib/app-config";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getEmailVerificationTemplate(input: {
  name: string;
  verificationUrl: string;
}) {
  const name = escapeHtml(input.name);
  const url = escapeHtml(input.verificationUrl);
  return {
    subject: "Confirm your email to start 14 days of Pro",
    text: `Hi ${input.name},\n\nConfirm your email to start 14 days of Pro: ${input.verificationUrl}\n\nThis one-time link expires in 24 hours.`,
    html: `<h1>Confirm your email</h1><p>Hi ${name},</p><p>Confirm your email to start 14 days of ${APP_NAME} Pro.</p><p><a href="${url}">Confirm email</a></p><p>This one-time link expires in 24 hours.</p>`,
  };
}
