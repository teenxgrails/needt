import { APP_NAME } from "@/lib/app-config";

export const getTitleFromPathname = (pathname: string) => {
  switch (pathname) {
    case "/calendar":
      return `Calendar | ${APP_NAME}`;
    case "/tasks":
      return `Tasks | ${APP_NAME}`;
    case "/projects":
      return `Projects | ${APP_NAME}`;
    case "/focus":
      return `Focus | ${APP_NAME}`;
    case "/settings":
      return `Settings | ${APP_NAME}`;
    case "/setup":
      return `Setup | ${APP_NAME}`;
    case "/auth/signin":
      return `Sign In | ${APP_NAME}`;
    case "/auth/signup":
      return `Sign Up | ${APP_NAME}`;
    case "/auth/reset-password":
      return `Reset Password | ${APP_NAME}`;
    default:
      return APP_NAME;
  }
};
