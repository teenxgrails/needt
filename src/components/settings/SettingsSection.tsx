import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title?: string;
  description?: string;
  showDescription?: boolean;
  children: React.ReactNode;
}

interface SettingRowProps {
  label: string;
  description?: React.ReactNode;
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
  showDescription = false,
  children,
}: SettingsSectionProps) {
  return (
    <section className="max-w-[896px] text-[var(--text-primary)]">
      {(title || (description && showDescription)) && (
        <header className="mb-5">
          {title && (
            <h2 className="text-[16px] font-semibold leading-6">{title}</h2>
          )}
          {description && showDescription && (
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
      className="grid min-h-[38px] gap-1 py-1.5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-3"
    >
      <div
        className="pt-1 text-[14px] leading-5 text-[var(--text-secondary)]"
        title={typeof description === "string" ? description : undefined}
      >
        {label}:
      </div>
      {description && <div className="sr-only">{description}</div>}
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
        "needt-raised-depth overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)]",
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
