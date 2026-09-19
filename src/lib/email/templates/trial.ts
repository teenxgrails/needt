export function getTrialEmailTemplate(input: {
  milestone: "day11" | "day14";
  payUrl: string;
}) {
  if (input.milestone === "day11") {
    return {
      subject: "Your Pro trial ends in 3 days",
      text: `Your Needt Pro trial ends in 3 days. Choose Pro to keep Pro features: ${input.payUrl}`,
      html: `<h1>Your Pro trial ends in 3 days</h1><p>Choose Pro to keep Pro features after the trial.</p><p><a href="${input.payUrl}">Choose Pro</a></p>`,
    };
  }
  return {
    subject: "Your Pro trial has ended",
    text: `Your Needt account is now on Free. Your data is still here. Choose Pro: ${input.payUrl}`,
    html: `<h1>Your Pro trial has ended</h1><p>Your account is now on Free. Your data is still here.</p><p><a href="${input.payUrl}">Choose Pro</a></p>`,
  };
}
