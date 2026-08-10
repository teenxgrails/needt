/* Hallmark · pre-emit critique: P4 H5 E5 S5 R5 V4
 * macrostructure: Long Document · tone: utilitarian · theme: Needt tokens
 */

type LegalDraftProps = {
  title: string;
  summary: string;
  requirements: string[];
};

export function LegalDraft({
  title,
  summary,
  requirements,
}: LegalDraftProps) {
  return (
    <main className="min-h-dvh bg-[var(--surface-canvas)] px-4 py-12 text-[var(--text-primary)] sm:px-6 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Needt legal draft
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
          {summary}
        </p>

        <section
          className="mt-10 border-l-2 border-[var(--color-warning)] pl-4"
          role="status"
        >
          <h2 className="text-base font-semibold">Owner review required</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This is a draft placeholder. It is not a published legal agreement
            or privacy notice and does not create terms for visitors.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Required before publication</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
