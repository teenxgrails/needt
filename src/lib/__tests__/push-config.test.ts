import { VAPID_VARIABLE_NAMES, getVapidConfiguration } from "@/lib/push-config";

const configuredEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  VAPID_SUBJECT: "mailto:push@example.com",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public-key",
  VAPID_PRIVATE_KEY: "private-key",
};

describe("VAPID configuration", () => {
  it("returns the configured values when the full VAPID identity is present", () => {
    expect(getVapidConfiguration(configuredEnvironment)).toEqual({
      configured: true,
      missingVariables: [],
      subject: "mailto:push@example.com",
      publicKey: "public-key",
      privateKey: "private-key",
    });
  });

  it.each(VAPID_VARIABLE_NAMES)(
    "reports %s when that variable is missing",
    (missingVariable) => {
      const environment = { ...configuredEnvironment };
      delete environment[missingVariable];

      expect(getVapidConfiguration(environment)).toEqual({
        configured: false,
        missingVariables: [missingVariable],
      });
    }
  );
});
