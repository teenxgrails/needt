import { Resend } from "resend";

import { APP_NAME } from "@/lib/app-config";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "EmailService";

export interface EmailJobData {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

/**
 * Email service for sending emails directly in the unified Needt build.
 */
export class EmailService {
  /**
   * Send an email directly using Resend
   * @param emailData The email data to send
   * @returns A promise that resolves when the email is sent
   */
  static async sendEmail(emailData: EmailJobData): Promise<{ jobId: string }> {
    try {
      const { to, subject } = emailData;

      logger.info(
        `Sending email to ${to}`,
        {
          to,
          subject,
          from: emailData.from || "default",
          hasAttachments:
            !!emailData.attachments && emailData.attachments.length > 0,
        },
        LOG_SOURCE
      );

      const fromEmail = EmailService.formatSender(APP_NAME);

      const emailToSend = {
        from: fromEmail,
        to,
        subject,
        html: emailData.html,
        text: emailData.text,
      };

      // Add attachments if they exist
      if (emailData.attachments && emailData.attachments.length > 0) {
        const formattedAttachments = emailData.attachments.map(
          (attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            content_type: attachment.contentType,
          })
        );

        Object.assign(emailToSend, { attachments: formattedAttachments });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is required to send email");
      }

      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send(emailToSend);

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      logger.info(
        `Email sent successfully to ${to}`,
        {
          to,
          subject,
          resendId: data?.id || null,
        },
        LOG_SOURCE
      );

      return { jobId: data?.id || "" };
    } catch (error) {
      logger.error(
        `Failed to send email`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          to: emailData.to,
          subject: emailData.subject,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Format a sender email address with a display name
   * @param displayName The display name to use
   * @param email Optional custom email address
   * @returns Formatted email string
   */
  static formatSender(displayName: string, email?: string): string {
    const fromEmail =
      email || process.env.RESEND_FROM_EMAIL || "noreply@localhost";
    return `${displayName} <${fromEmail}>`;
  }
}
