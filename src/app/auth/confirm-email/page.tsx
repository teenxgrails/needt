import { ConfirmEmailForm } from "@/components/auth/ConfirmEmailForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirm email | Needt",
};

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email = "", token = "" } = await searchParams;
  return <ConfirmEmailForm email={email} token={token} />;
}
