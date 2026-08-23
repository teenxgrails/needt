import { Resend } from "resend";

import { EmailService } from "@/lib/email/email-service";

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("EmailService sender contract", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.RESEND_FROM_EMAIL = "mail@needt.example";
    mockSend.mockResolvedValue({
      data: { id: "resend-message-id" },
      error: null,
    });
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFromEmail === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFromEmail;
  });

  it("sends with the configured Needt sender", async () => {
    await expect(
      EmailService.sendEmail({
        to: "recipient@example.com",
        subject: "Test message",
        html: "<p>Test</p>",
      })
    ).resolves.toEqual({ jobId: "resend-message-id" });

    expect(Resend).toHaveBeenCalledWith("resend-test-key");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Needt <mail@needt.example>",
        to: "recipient@example.com",
      })
    );
  });

  it("preserves an already formatted sender mailbox", async () => {
    process.env.RESEND_FROM_EMAIL = "  Needt <noreply@needt.app>  ";

    await EmailService.sendEmail({
      to: "recipient@example.com",
      subject: "Test message",
      html: "<p>Test</p>",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Needt <noreply@needt.app>" })
    );
  });

  it("fails before calling Resend when the sender is missing", async () => {
    delete process.env.RESEND_FROM_EMAIL;

    await expect(
      EmailService.sendEmail({
        to: "recipient@example.com",
        subject: "Test message",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow("RESEND_FROM_EMAIL is required to send email");
    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each([
    "Needt <Needt <noreply@needt.app>>",
    "Needt <>",
    "noreply@needt.app, other@needt.app",
    "noreply@needt",
    ".noreply@needt.app",
    "noreply..mail@needt.app",
    "Needt <noreply@-needt.app>",
    "Needt <noreply@needt.app>\r\nBcc: attacker@example.com",
    "noreply@needt.app\0",
  ])("rejects an invalid sender before calling Resend: %s", async (sender) => {
    process.env.RESEND_FROM_EMAIL = sender;

    await expect(
      EmailService.sendEmail({
        to: "recipient@example.com",
        subject: "Test message",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow("RESEND_FROM_EMAIL must contain one valid mailbox");
    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects an unsafe display name", () => {
    expect(() =>
      EmailService.formatSender("Needt\r\nBcc: attacker@example.com")
    ).toThrow("RESEND_FROM_EMAIL must contain one valid mailbox");
  });
});
