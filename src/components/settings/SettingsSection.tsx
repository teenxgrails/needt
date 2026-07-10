import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="rounded-md border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-hi)] shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-[var(--text-lo)]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col space-y-4 border-t border-[var(--line-strong)] pt-5 first:border-t-0 first:pt-0 md:flex-row md:items-start md:space-x-6 md:space-y-0">
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium leading-none">{label}</div>
        <div className="text-sm text-[var(--text-lo)]">{description}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
