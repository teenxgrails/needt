import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";
import { authSecret } from "@/lib/auth/auth-secret";
import { authenticateUser } from "@/lib/auth/credentials-provider";
import { GOOGLE_SIGN_IN_SCOPES } from "@/lib/google-oauth-scopes";
import { logger } from "@/lib/logger";
import { MICROSOFT_GRAPH_SCOPES } from "@/lib/outlook";
import { prisma } from "@/lib/prisma";
import { markEmailVerifiedAndStartTrial } from "@/lib/trials/trial-service";

// Define a type for our user with role
interface UserWithRole {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
}

const LOG_SOURCE = "AuthOptions";

// Create a function to get the auth options with the credentials
export async function getAuthOptions(): Promise<NextAuthOptions> {
  // Get credentials from database or environment variables
  const googleCredentials = await getGoogleCredentials();
  const outlookCredentials = await getOutlookCredentials();

  const providers: NextAuthOptions["providers"] = [
    // Add credentials provider for email/password authentication
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn("Missing credentials", {}, LOG_SOURCE);
          return null;
        }

        try {
          const user = await authenticateUser(
            credentials.email,
            credentials.password
          );
          return user;
        } catch (error) {
          logger.error(
            "Error in credentials authorization",
            {
              error: error instanceof Error ? error.message : "Unknown error",
            },
            LOG_SOURCE
          );
          return null;
        }
      },
    }),
  ];

  if (googleCredentials.clientId && googleCredentials.clientSecret) {
    providers.unshift(
      GoogleProvider({
        clientId: googleCredentials.clientId,
        clientSecret: googleCredentials.clientSecret,
        authorization: {
          params: {
            scope: GOOGLE_SIGN_IN_SCOPES.join(" "),
          },
        },
      })
    );
  }

  if (
    outlookCredentials.clientId &&
    outlookCredentials.clientSecret &&
    outlookCredentials.tenantId
  ) {
    providers.unshift(
      AzureADProvider({
        clientId: outlookCredentials.clientId,
        clientSecret: outlookCredentials.clientSecret,
        tenantId: outlookCredentials.tenantId,
        authorization: {
          params: {
            scope: MICROSOFT_GRAPH_SCOPES.join(" "),
          },
        },
      })
    );
  }

  return {
    adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
    // Add secret for production - required for security
    secret: authSecret(),

    providers,
    callbacks: {
      async jwt({ token, account, user }) {
        if (user) {
          token.sub = user.id;
          token.role = (user as UserWithRole).role;
        }

        // Initial sign in
        if (account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.provider = account.provider;
          if (account.type === "oauth" && user?.id && user.email) {
            await markEmailVerifiedAndStartTrial({
              userId: user.id,
              email: user.email,
            });
            await prisma.userSettings.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id, theme: "dark", timeZone: "UTC" },
            });
            await prisma.autoScheduleSettings.upsert({
              where: { userId: user.id },
              update: {},
              create: {
                userId: user.id,
                workDays: "[1,2,3,4,5]",
                workHourStart: 9,
                workHourEnd: 17,
                bufferMinutes: 15,
              },
            });
          }
        }

        return token;
      },
      async session({ session, token }) {
        // Add user role to the session
        if (session.user) {
          session.user.id = token.sub;
          session.user.role = token.role;
        }

        return {
          ...session,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          provider: token.provider,
        };
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/signin",
    },
    debug: process.env.NODE_ENV === "development",
    session: {
      strategy: "jwt",
      // Set a very long maxAge to keep users logged in indefinitely
      // They will only be logged out if they click the logout button
      maxAge: 365 * 24 * 60 * 60, // 1 year
    },
  };
}
