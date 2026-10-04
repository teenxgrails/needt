/**
 * Needt's Terms of Service and Privacy Notice, as data.
 *
 * Two things this module is responsible for beyond holding prose.
 *
 * First, the facts only the business owner can supply — the legal entity, its
 * registered address, the contact addresses, the governing law — are a typed
 * sentinel rather than placeholder text. `isLegalContentComplete` reads them,
 * and both pages stay out of search engines until every one is filled. A legal
 * page that quietly ships with "TODO" in it is worse than one that is plainly
 * marked unfinished.
 *
 * Second, the list of who receives personal data is derived from what the code
 * actually calls, not from memory. Every entry below corresponds to an
 * outbound integration that exists in this repository. Adding a service that
 * handles user data means adding it here in the same change.
 */

/** A fact that only the business owner can supply. */
export const PENDING = Symbol("pending-owner-fact");
export type PendingFact = typeof PENDING;
export type OwnerFact = string | PendingFact;

export function isPending(value: OwnerFact): value is PendingFact {
  return value === PENDING;
}

/**
 * Replace each `PENDING` with the real value before these pages go public.
 * Nothing else in the documents needs editing to publish them.
 */
export const LEGAL_IDENTITY = {
  /** Legal name and form of the entity that provides Needt. */
  entity: PENDING as OwnerFact,
  /** Registered address, as it would appear on an invoice. */
  address: PENDING as OwnerFact,
  /** Where a user writes for help with the service. */
  supportEmail: PENDING as OwnerFact,
  /** Where a user writes about their personal data. May be the same address. */
  privacyEmail: PENDING as OwnerFact,
  /** Law applied to these terms, and the courts that hear a dispute. */
  governingLaw: PENDING as OwnerFact,
} as const;

/** The date both documents take effect once the facts above are filled in. */
export const LEGAL_EFFECTIVE_DATE = "4 October 2026";

export type LegalIdentityKey = keyof typeof LEGAL_IDENTITY;

export const PENDING_IDENTITY_LABELS: Record<LegalIdentityKey, string> = {
  entity: "Legal entity name and form",
  address: "Registered address",
  supportEmail: "Support contact address",
  privacyEmail: "Privacy contact address",
  governingLaw: "Governing law and competent courts",
};

export function pendingIdentityKeys(): LegalIdentityKey[] {
  return (Object.keys(LEGAL_IDENTITY) as LegalIdentityKey[]).filter((key) =>
    isPending(LEGAL_IDENTITY[key])
  );
}

export function isLegalContentComplete(): boolean {
  return pendingIdentityKeys().length === 0;
}

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  table?: { columns: [string, string]; rows: Array<[string, string]> };
};

export type LegalDocumentContent = {
  title: string;
  intro: string[];
  sections: LegalSection[];
};

/**
 * Who receives personal data, and what they receive.
 *
 * Checked against the outbound calls in this repository: Hetzner hosts
 * everything, Resend sends transactional mail, Sentry receives scrubbed error
 * reports, Creem handles payment. The rest are reached only after the user
 * connects them, and are listed as such because that is what determines
 * whether a given person's data ever goes there at all.
 */
const RECIPIENTS: Array<[string, string]> = [
  [
    "Hetzner Online GmbH (Finland)",
    "Hosts the application, the database and the background worker. All stored data lives here, in Helsinki.",
  ],
  [
    "Resend",
    "Sends transactional email: sign-in and confirmation links, password resets, reminders and alerts you have enabled. Receives your email address and the content of those messages.",
  ],
  [
    "Sentry",
    "Receives error diagnostics. These are filtered before they leave: an event carries the error type and the source file, function and line it came from. Request contents, your account, local variables, and error messages themselves are removed.",
  ],
  [
    "Creem",
    "Processes payment and holds the subscription record. Receives what a payment needs: your email address, the plan, and billing details you enter on their checkout. Card numbers are never sent to or stored by Needt.",
  ],
  [
    "Google — only if you connect it",
    "Calendar, Tasks or Gmail, whichever you connect. Needt reads the calendars, tasks or mail you select and writes back the changes you make in Needt.",
  ],
  [
    "Microsoft — only if you connect it",
    "Outlook calendar, tasks or mail, whichever you connect, on the same terms as Google.",
  ],
  [
    "A CalDAV server you name — only if you connect it",
    "Needt talks to the server you give it. Who operates that server is your choice, not ours.",
  ],
  [
    "Composio — only if you connect a third-party tool through it",
    "Brokers connections to tools Needt does not integrate with directly. Receives the data the tool you picked needs.",
  ],
  [
    "OpenRouter — only when you use the built-in AI",
    "Routes your request to a model host. Needt asks it to exclude hosts that retain or train on the request. Receives the text of the request, which includes whatever Needt content you pointed the assistant at.",
  ],
  [
    "An AI provider you name — only if you bring your own key",
    "Your key, your account with them, your agreement with them. Needt sends the request and keeps no copy of your key in readable form.",
  ],
  [
    "Your browser's push service — only if you enable notifications",
    "Apple, Google or Mozilla, depending on your browser. Receives the notification in order to deliver it. Needt does not choose this service; your browser does.",
  ],
];

export const PRIVACY_CONTENT: LegalDocumentContent = {
  title: "Privacy Notice",
  intro: [
    "Needt is a planner. Almost everything in it is there because you put it there, and the point of this notice is to say plainly what happens to it.",
    "Two things are worth knowing before the detail. Needt stores your calendars and tasks in its own database rather than reading your providers live, so a copy of what you connect does live here. And several of the services named below receive nothing at all unless you connect them yourself.",
  ],
  sections: [
    {
      heading: "Who is responsible for your data",
      paragraphs: [
        "The controller is the entity named at the end of this notice. Write to the privacy address there with any question about your data, including the requests described under “Your rights”.",
      ],
    },
    {
      heading: "What Needt collects",
      list: [
        "Your account: email address, the name you choose, and a hash of your password. If you sign in with Google or Microsoft instead, we receive your email address and name from them and store no password.",
        "What you create in Needt: tasks, projects, documents and their contents, boards, moodboards, habits, focus sessions, time entries, notes and the files you attach. Attachments and documents are stored in Needt's own database.",
        "What you connect: calendars and their events, tasks from an external provider, and mail if you connect a mailbox. These are copied into Needt's database so the app can work on them without calling your provider on every screen.",
        "Workspace membership: if you share a workspace, the other members and what role each has.",
        "Payment: your plan, its status and period, and the identifiers Creem gives us. Card details are entered on Creem's checkout and never reach Needt.",
        "Use of the AI assistant: a count of requests per month. The text of a conversation is stored so you can return to it.",
        "Diagnostics: filtered error reports, and server logs that record which requests were served.",
        "Notifications: if you turn on push notifications, the subscription your browser issues.",
        "Bug reports: whatever you write in one, and any screenshot you attach.",
      ],
    },
    {
      heading: "Why, and on what legal basis",
      table: {
        columns: ["Purpose", "Basis"],
        rows: [
          [
            "Running the account and the planner you signed up for",
            "Performance of our contract with you",
          ],
          [
            "Syncing a calendar, task list or mailbox you connected",
            "Performance of our contract, at your instruction",
          ],
          [
            "Taking payment and keeping billing records",
            "Performance of our contract, and our legal obligation to keep records",
          ],
          [
            "Transactional email you need to use the service",
            "Performance of our contract",
          ],
          [
            "Reminders, nudges and push notifications",
            "Your consent, withdrawable in settings at any time",
          ],
          [
            "Error diagnostics and keeping the service standing up",
            "Our legitimate interest in a service that works, balanced by filtering the reports before they are sent",
          ],
          [
            "The AI assistant",
            "Performance of our contract when you use it; it is never used on your data unless you ask it to be",
          ],
        ],
      },
    },
    {
      heading: "Who receives it",
      paragraphs: [
        "Needt uses the services below and no others. Each receives only what its job needs. Nothing is sold, and nothing is shared for advertising — Needt runs no advertising and no third-party analytics.",
      ],
      table: { columns: ["Service", "What it receives"], rows: RECIPIENTS },
    },
    {
      heading: "Where your data is processed",
      paragraphs: [
        "The application, its database and its background worker run on servers in Helsinki, Finland, inside the European Union.",
        "Some of the services above are outside the EU. Where that is so, the transfer rests on the European Commission's standard contractual clauses or on an adequacy decision for the country concerned. Every one of the “only if you connect it” services is a transfer you initiate by connecting it, and you can see which ones you have connected, and disconnect them, in settings.",
      ],
    },
    {
      heading: "How long it is kept",
      list: [
        "Your account and its contents: while the account exists.",
        "Deleting your account: it is scheduled for deletion seven days ahead, and you can cancel within those seven days. After that the account and the data belonging to it are erased.",
        "A data export you request: held until you download it, and then only until it expires. It is deleted after that.",
        "Deleted documents: kept in trash until you empty it, so a mistake can be undone.",
        "Diagnostics in Sentry: kept for Sentry's retention period and not longer.",
        "Billing records: kept as long as the law requires us to keep them, which outlives the account.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "If you are in the European Union or the United Kingdom you have the right to see your data, correct it, have it erased, restrict or object to how it is used, and receive it in a portable form. Two of these are already buttons rather than requests: Settings has a data export, and it has account deletion.",
        "For anything else, write to the privacy address below. You can also complain to your national data-protection authority, and you do not have to go through us first.",
      ],
    },
    {
      heading: "The AI assistant, specifically",
      paragraphs: [
        "The assistant only sees what you point it at. When it runs on Needt's own key, the request goes to OpenRouter, and Needt asks it to exclude hosts that would retain the request or train on it. When you bring your own provider key, the request goes to the provider you chose, under your agreement with them, and Needt stores that key encrypted.",
        "Conversations are stored in Needt so you can return to them. Deleting a conversation deletes it. Neither Needt nor its AI providers use your content to train models.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "Connections are encrypted in transit. Passwords are stored hashed, never recoverable. Access tokens for the services you connect, and any AI provider key you supply, are encrypted at rest. Error reports are filtered so your content does not travel with them.",
        "No system is beyond reach. If something happens that affects your data, we will tell you and the relevant authority as the law requires.",
      ],
    },
    {
      heading: "Changes to this notice",
      paragraphs: [
        "If this notice changes in a way that matters, the date below changes with it and we will tell you in the app before it takes effect.",
      ],
    },
  ],
};

export const TERMS_CONTENT: LegalDocumentContent = {
  title: "Terms of Service",
  intro: [
    "These terms are the agreement between you and the entity named at the end of this page, for the use of Needt. Creating an account means accepting them.",
  ],
  sections: [
    {
      heading: "What Needt is",
      paragraphs: [
        "Needt is a planner. It keeps your tasks, documents, calendars and related work in one place, schedules work automatically when you ask it to, and connects to services you already use.",
        "Needt is a tool, not an adviser. It does not give legal, financial, medical or professional advice, and the output of its AI assistant is a suggestion you remain responsible for checking.",
      ],
    },
    {
      heading: "Your account",
      list: [
        "You need a working email address, and the address must be yours.",
        "Keep your credentials to yourself. Anything done through your account is treated as done by you.",
        "One account is for one person. A workspace is how you share work with others; handing out your own login is not.",
        "You must be old enough to enter a contract where you live. If local law sets a minimum age for a service like this, that age applies.",
      ],
    },
    {
      heading: "Plans and payment",
      paragraphs: [
        "There is a free plan with limits, and paid plans that remove them. The current prices and what each plan includes are shown on the pricing page and in the app before you pay. Prices are in US dollars and may carry VAT or an equivalent tax depending on where you are; the checkout shows the total before you confirm.",
        "Payment is handled by Creem, who act as the merchant for the transaction. A subscription renews for the same period until you cancel. A one-time Lifetime purchase does not renew.",
      ],
    },
    {
      heading: "The trial",
      paragraphs: [
        "A trial gives you the paid features for a fixed period without a card. It ends by itself. Nothing is charged, and when it ends the account continues on the free plan with its limits.",
      ],
    },
    {
      heading: "Lifetime access",
      paragraphs: [
        "Lifetime is sold to a limited number of buyers and is withdrawn once that number is reached. It covers the lifetime of the service, not of the buyer, and it does not commit us to any particular future feature.",
        "If you pay for Lifetime, you receive it. If the limit is reached at the same moment you pay, your access is granted regardless and the limit gives way, not your purchase.",
      ],
    },
    {
      heading: "Cancelling, and getting your money back",
      list: [
        "Cancel any time from Settings. Access continues to the end of the period you have paid for; we do not cut it short.",
        "If you are a consumer in the European Union or the United Kingdom you have fourteen days to withdraw from the purchase. Because Needt is made available immediately, starting to use it means you ask us to begin at once, and you keep the right to withdraw within those fourteen days.",
        "A refund ends the access it paid for. A full refund or a payment dispute returns the account to the free plan, and a Lifetime seat returned this way goes back to the pool. A partial refund leaves your access as it is.",
      ],
    },
    {
      heading: "How you may use it",
      paragraphs: [
        "Use Needt for your own work and anything lawful. Do not do these things with it:",
      ],
      list: [
        "Break the law, or store or distribute material that is unlawful where you or we are.",
        "Interfere with the service: attack it, overload it, work around its limits, or try to reach another account's data.",
        "Resell Needt as your own service, or use it to build a copy of it.",
        "Use the AI assistant to generate material that is unlawful, or that is designed to deceive someone about who wrote it or what it is.",
      ],
    },
    {
      heading: "The content you put in",
      paragraphs: [
        "Your content stays yours. You give us only the permission needed to run the service for you: to store it, to show it back to you and to the workspace members you share it with, to back it up, and to send it to a service you connected because you asked us to.",
        "You can take it out. Settings has an export, and it is there whether or not you are paying.",
        "We do not read your content, and we do not train anything on it.",
      ],
    },
    {
      heading: "What we do not promise",
      paragraphs: [
        "Needt is provided as it is. We work to keep it available and correct, and we do not guarantee that it will be uninterrupted, or that automatic scheduling will always arrange your day the way you would have.",
        "Keep your own copies of anything you cannot afford to lose. The export exists for that.",
      ],
    },
    {
      heading: "Liability",
      paragraphs: [
        "To the extent the law allows, we are not liable for indirect or consequential loss, for lost profit, or for data you could have exported and did not. Where we are liable, our total liability is limited to what you paid in the twelve months before the claim.",
        "Nothing here limits liability that cannot be limited by law, including for death or personal injury caused by negligence, for fraud, and the statutory rights of a consumer.",
      ],
    },
    {
      heading: "Ending the agreement",
      paragraphs: [
        "You can delete your account at any time from Settings. Deletion is scheduled seven days ahead and can be cancelled within that window; after that the data is erased.",
        "We may suspend or close an account that breaks these terms. Where it is reasonable to warn you first, we will, and where a closure is our decision and not your breach, we refund the unused part of what you paid.",
      ],
    },
    {
      heading: "Changes to these terms",
      paragraphs: [
        "If these terms change in a way that affects you, we will tell you in the app before the change takes effect. Continuing to use Needt after that means accepting the new terms; if you would rather not, cancel and we refund the unused part of your period.",
      ],
    },
    {
      heading: "Law and disputes",
      paragraphs: [
        "The governing law and the competent courts are named at the end of this page. If you are a consumer, this does not take away the protection of the law where you live, or your right to bring a claim in your own courts.",
      ],
    },
  ],
};
