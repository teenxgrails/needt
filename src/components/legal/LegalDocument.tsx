import {
  LEGAL_IDENTITY,
  type LegalDocumentContent,
  type LegalSection,
  PENDING_IDENTITY_LABELS,
  isPending,
  pendingIdentityKeys,
} from "@/lib/legal/needt-legal";

function Section({ section }: { section: LegalSection }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">
        {section.heading}
      </h2>
      {section.paragraphs?.map((paragraph) => (
        <p
          key={paragraph}
          className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]"
        >
          {paragraph}
        </p>
      ))}
      {section.list ? (
        <ul className="mt-4 space-y-3">
          {section.list.map((item) => (
            <li
              key={item}
              className="border-l border-[var(--border-subtle)] pl-4 text-[15px] leading-7 text-[var(--text-secondary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {section.table ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr>
                {section.table.columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-[var(--border-subtle)] pb-2 pr-6 font-medium"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map(([left, right]) => (
                <tr key={left}>
                  <td className="border-b border-[var(--border-subtle)] py-3 pr-6 align-top font-medium">
                    {left}
                  </td>
                  <td className="border-b border-[var(--border-subtle)] py-3 align-top leading-6 text-[var(--text-secondary)]">
                    {right}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Renders one legal document.
 *
 * While any owner-supplied fact is still missing, the page says so at the top
 * and lists what is outstanding, and the route keeps itself out of search
 * engines. A legal page that looks finished and is not is the failure mode
 * worth engineering against.
 */
export function LegalDocument({
  content,
  effectiveDate,
}: {
  content: LegalDocumentContent;
  effectiveDate: string;
}) {
  const pending = pendingIdentityKeys();

  return (
    <main className="min-h-dvh bg-[var(--surface-canvas)] px-4 py-12 text-[var(--text-primary)] sm:px-6 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {pending.length > 0
            ? "Draft — not yet in force"
            : `In force since ${effectiveDate}`}
        </p>

        {pending.length > 0 ? (
          <section
            className="mt-8 border-l-2 border-[var(--color-warning)] pl-4"
            role="note"
          >
            <h2 className="text-sm font-semibold">
              This page is not published yet
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
              The terms below are complete except for details only the business
              can supply. Until these are filled in, the page stays a draft and
              is hidden from search engines.
            </p>
            <ul className="mt-3 space-y-1 text-[14px] text-[var(--text-secondary)]">
              {pending.map((key) => (
                <li key={key}>— {PENDING_IDENTITY_LABELS[key]}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.intro.map((paragraph) => (
          <p key={paragraph} className="mt-6 text-base leading-7">
            {paragraph}
          </p>
        ))}

        {content.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}

        <section className="mt-12 border-t border-[var(--border-subtle)] pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Who you are dealing with
          </h2>
          <dl className="mt-4 space-y-3 text-[15px] leading-7">
            {(
              [
                ["Provider", LEGAL_IDENTITY.entity],
                ["Registered address", LEGAL_IDENTITY.address],
                ["Support", LEGAL_IDENTITY.supportEmail],
                ["Privacy enquiries", LEGAL_IDENTITY.privacyEmail],
                ["Governing law", LEGAL_IDENTITY.governingLaw],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium">{label}</dt>
                <dd className="text-[var(--text-secondary)]">
                  {isPending(value) ? (
                    <span className="text-[var(--color-warning)]">
                      To be completed before publication
                    </span>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </main>
  );
}
