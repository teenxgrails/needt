export enum ProjectStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  progress?: number;
  completed?: number;
  total?: number;
  blockerCount?: number;
  status: ProjectStatus;
  workspaceId?: string | null;
  startDate?: Date | string | null;
  deadline?: Date | string | null;
  stages?: ProjectStage[];
  blockers?: ProjectBlocker[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    tasks: number;
  };
  onClose?: () => void;
}

export interface NewProject {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  progress?: number;
  startDate?: Date | string | null;
  deadline?: Date | string | null;
  status?: ProjectStatus;
}

export type UpdateProject = Partial<NewProject>;

export interface ProjectStage {
  id: string;
  projectId: string;
  name: string;
  color?: string | null;
  position: number;
  startDate?: Date | string | null;
  deadline?: Date | string | null;
  expectedDurationDays?: number | null;
  completed?: number;
  total?: number;
  progress?: number;
}

export interface ProjectBlocker {
  id: string;
  projectId: string;
  taskId?: string | null;
  stageId?: string | null;
  blockerTaskId?: string | null;
  title?: string | null;
  resolvedAt?: Date | string | null;
}

export enum ProjectTemplateKind {
  REGULAR = "REGULAR",
  WORKFLOW = "WORKFLOW",
}
