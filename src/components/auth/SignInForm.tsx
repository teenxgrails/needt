"use client";

import { useEffect, useState } from "react";

import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { APP_NAME } from "@/lib/app-config";
import { isPublicSignupEnabledClient } from "@/lib/auth/client-public-signup";
import { safeCallbackPath } from "@/lib/auth/callback-url";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SignInForm";

type AuthMode = "signin" | "signup";

type OAuthProviderId = "google" | "azure-ad";

const OAUTH_PROVIDERS: Record<OAuthProviderId, string> = {
  google: "Google",
  "azure-ad": "Microsoft",
};

export function SignInForm({
  callbackUrl,
  error,
}: {
  callbackUrl?: string;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [publicSignupEnabled, setPublicSignupEnabled] = useState(false);
  const [providers, setProviders] = useState<Partial<
    Record<OAuthProviderId, ClientSafeProvider>
  >>({});
  const [oauthLoading, setOauthLoading] = useState<OAuthProviderId | null>(
    null
  );
  const router = useRouter();
  const safeCallbackUrl = safeCallbackPath(callbackUrl);

  useEffect(() => {
    void isPublicSignupEnabledClient().then(setPublicSignupEnabled);
    void getProviders()
      .then((available) => {
        if (!available) return;
        setProviders({
          google: available.google,
          "azure-ad": available["azure-ad"],
        });
      })
      .catch((providerError) => {
        logger.warn(
          "Could not load OAuth providers",
          {
            error:
              providerError instanceof Error
                ? providerError.message
                : "Unknown error",
          },
          LOG_SOURCE
        );
      });
  }, []);

  const finishSignIn = () => {
    notify.success("Signed in successfully");
    window.location.href = safeCallbackUrl;
  };

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      if (result?.error) {
        notify.error("Authentication failed", {
          description: "Please check your email and password and try again.",
        });
      } else {
        finishSignIn();
      }
    } catch (error) {
      logger.error(
        "Error signing in",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      notify.error("Sign in failed", { description: "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        notify.error("Registration failed", {
          description: data.error || "Please try again.",
        });
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });
      if (result?.error) {
        notify.success("Account created", {
          description: "Sign in with your new credentials.",
        });
        setMode("signin");
        return;
      }

      notify.success("Account created successfully");
      finishSignIn();
    } catch (error) {
      logger.error(
        "Error signing up",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      notify.error("Registration failed", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProviderId) => {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: safeCallbackUrl });
    } catch (providerError) {
      logger.error(
        "OAuth sign in failed",
        {
          provider,
          error:
            providerError instanceof Error
              ? providerError.message
              : "Unknown error",
        },
        LOG_SOURCE
      );
      notify.error(`Could not continue with ${OAUTH_PROVIDERS[provider]}`);
      setOauthLoading(null);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign in to {APP_NAME}</CardTitle>
        <CardDescription>
          Access your calendar, tasks, and workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as AuthMode)}
        >
          <TabsList
            className={
              publicSignupEnabled
                ? "mb-6 grid w-full grid-cols-2"
                : "mb-6 grid w-full grid-cols-1"
            }
          >
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            {publicSignupEnabled && (
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  We couldn&apos;t sign you in. Please try again.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <div className="text-right">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-muted-foreground"
                    onClick={() => router.push("/auth/reset-password")}
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            {(providers.google || providers["azure-ad"]) && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                  Or continue with
                </div>
                {(["google", "azure-ad"] as const).map(
                  (provider) =>
                    providers[provider] && (
                      <Button
                        key={provider}
                        className="w-full"
                        variant="outline"
                        disabled={oauthLoading !== null}
                        onClick={() => void handleOAuthSignIn(provider)}
                        type="button"
                      >
                        {oauthLoading === provider
                          ? `Connecting to ${OAUTH_PROVIDERS[provider]}...`
                          : `Continue with ${OAUTH_PROVIDERS[provider]}`}
                      </Button>
                    )
                )}
              </div>
            )}
          </TabsContent>

          {publicSignupEnabled && (
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">
                    Confirm password
                  </Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center gap-1 text-center text-xs text-muted-foreground">
        By continuing, you agree to the
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        and
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </CardFooter>
    </Card>
  );
}
