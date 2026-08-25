import { warnIfVapidConfigurationIsMissingOnce } from "@/services/reminders/reminder-delivery";
import { runWorkerStartupChecks } from "@/worker/startup";

jest.mock("@/services/reminders/reminder-delivery", () => ({
  warnIfVapidConfigurationIsMissingOnce: jest.fn(),
}));

const mockWarnIfVapidConfigurationIsMissingOnce = jest.mocked(
  warnIfVapidConfigurationIsMissingOnce
);

describe("worker VAPID startup warning", () => {
  it("executes the VAPID configuration check before worker startup", async () => {
    await runWorkerStartupChecks();

    expect(mockWarnIfVapidConfigurationIsMissingOnce).toHaveBeenCalledTimes(1);
  });
});
