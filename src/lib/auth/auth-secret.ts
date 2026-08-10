const LOCAL_AUTH_SECRET = "needt-local-development-auth-secret";

export function authSecret(): string {
  const configured = process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET is required in production");
  }

  return LOCAL_AUTH_SECRET;
}
