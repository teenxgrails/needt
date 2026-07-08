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
    <Card className="rounded-md border-[#323234] bg-[#262627] text-white shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-[#9AA0A6]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col space-y-4 border-t border-[#323234] pt-5 first:border-t-0 first:pt-0 md:flex-row md:items-start md:space-x-6 md:space-y-0">
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium leading-none">{label}</div>
        <div className="text-sm text-[#9AA0A6]">{description}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
