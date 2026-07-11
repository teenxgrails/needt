interface SettingsSectionProps {
  title: string;
  description: string;
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
    <section className="max-w-[998px] text-[var(--text-hi)]">
      <header className="mb-5">
        <h2 className="text-base font-semibold leading-6">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--text-lo)]">
          {description}
        </p>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col space-y-4 border-t border-[#2B2F31] pt-5 first:border-t-0 first:pt-0 md:flex-row md:items-start md:space-x-6 md:space-y-0">
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium leading-none">{label}</div>
        <div className="text-sm text-[var(--text-lo)]">{description}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
