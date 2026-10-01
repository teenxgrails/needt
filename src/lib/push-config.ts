export const VAPID_VARIABLE_NAMES = [
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
] as const;

export type VapidVariableName = (typeof VAPID_VARIABLE_NAMES)[number];

export type VapidConfiguration =
  | {
      configured: true;
      missingVariables: [];
      subject: string;
      publicKey: string;
      privateKey: string;
    }
  | {
      configured: false;
      missingVariables: VapidVariableName[];
    };

export function getVapidConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): VapidConfiguration {
  const values: Record<VapidVariableName, string | undefined> = {
    VAPID_SUBJECT: environment.VAPID_SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: environment.VAPID_PRIVATE_KEY,
  };
  const missingVariables = VAPID_VARIABLE_NAMES.filter((name) => !values[name]);

  if (missingVariables.length > 0) {
    return { configured: false, missingVariables };
  }

  return {
    configured: true,
    missingVariables: [],
    subject: values.VAPID_SUBJECT as string,
    publicKey: values.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    privateKey: values.VAPID_PRIVATE_KEY as string,
  };
}
