interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

interface SettingRowProps {
  label: string;
  description: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="max-w-[896px] text-[var(--text-primary)]">
      <header className="mb-4">
        <h2 className="text-[16px] font-semibold leading-6">{title}</h2>
        {description && (
          <p className="mt-1 max-w-[720px] text-[13px] leading-5 text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="grid gap-3 border-t border-[var(--border-subtle)] py-4 first:border-t-0 first:pt-0 md:grid-cols-[minmax(220px,1fr)_minmax(300px,1.2fr)] md:gap-8">
      <div className="space-y-1">
        <div className="text-[14px] font-medium leading-5">{label}</div>
        <div className="max-w-[360px] text-[13px] leading-5 text-[var(--text-secondary)]">
          {description}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
