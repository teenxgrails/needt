import type { Prisma } from "@prisma/client";

import { ProjectStatus } from "@/types/project";

/** Tasks without a project remain active; tasks in archived projects do not. */
export const activeProjectTaskWhere: Prisma.TaskWhereInput = {
  OR: [
    { projectId: null },
    { project: { is: { status: ProjectStatus.ACTIVE } } },
  ],
};
