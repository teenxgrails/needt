import { WorkspaceRoute } from "@/components/needt/workspace";

export default function ProjectsPage() {
  return (
    <div className="absolute inset-0 max-lg:bottom-[calc(68px+env(safe-area-inset-bottom))] max-lg:top-14">
      <WorkspaceRoute />
    </div>
  );
}
