export type CredentialAttemptVerdict = "succeeded" | "failed" | "inconclusive";

/**
 * Decides what a credentials response says about the *password*, which is the
 * only thing the brute-force counter may react to.
 *
 * A 5xx means our own infrastructure failed — Redis unreachable, the rate
 * limiter throwing, the database down — and says nothing about the password.
 * Counting it as a failure meant a brief Redis outage locked real people out of
 * their accounts after five attempts they never got to make. Clearing the
 * counter would be just as wrong: an attacker could wipe their strikes by
 * provoking errors between guesses. Hence a third answer — leave the counter
 * exactly as it was.
 */
export function classifyCredentialAttempt(
  status: number,
  location: string,
  body: string
): CredentialAttemptVerdict {
  if (status >= 500) return "inconclusive";
  const signalsRejection =
    status >= 400 ||
    /[?&]error=|CredentialsSignin/i.test(location) ||
    /[?&]error=|CredentialsSignin/i.test(body);
  return signalsRejection ? "failed" : "succeeded";
}
