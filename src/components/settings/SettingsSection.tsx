import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

interface SettingRowProps {
  label: string;
  description: React.ReactNode;
  children: React.ReactNode;
}

interface SettingsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface SettingsAdvancedProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="max-w-[896px] text-[var(--text-primary)]">
      {(title || description) && (
        <header className="mb-5">
          {title && (
            <h2 className="text-[16px] font-semibold leading-6">{title}</h2>
          )}
          {description && (
            <p
              className={cn(
                "max-w-[760px] text-[13px] leading-5 text-[var(--text-secondary)]",
                title && "mt-1"
              )}
            >
              {description}
            </p>
          )}
        </header>
      )}
      <div className="[&>[data-setting-row]+[data-setting-row]]:border-t [&>[data-setting-row]+[data-setting-row]]:border-[var(--border-subtle)]">
        {children}
      </div>
    </section>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div
      data-setting-row
      className="grid gap-3 py-4 first:pt-0 md:grid-cols-[minmax(220px,1fr)_minmax(300px,1.2fr)] md:gap-8"
    >
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

export function SettingsCard({
  children,
  className,
  ...props
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SettingsAdvanced({
  title,
  description,
  children,
}: SettingsAdvancedProps) {
  return (
    <details className="group border-t border-[var(--border-subtle)] pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--control-radius)] py-1 text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <span>
          <span className="block">{title}</span>
          {description && (
            <span className="mt-1 block text-[12px] font-normal leading-5 text-[var(--text-muted)]">
              {description}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="text-[16px] transition-transform duration-150 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}
