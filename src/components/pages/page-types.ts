export type PageSummary = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  isPrivate: boolean;
  isFavorite: boolean;
  updatedAt: string;
  database: { id: string } | null;
};

export type PageBlock = {
  id: string;
  parentBlockId: string | null;
  type: string;
  content: unknown;
  position: number;
  createdBy: "HUMAN" | "AI";
};

export type PageDetail = PageSummary & {
  userId: string;
  workspaceId: string | null;
  accessRole?: "FULL_ACCESS" | "EDITOR" | "VIEWER";
  coverUrl: string | null;
  blocks: PageBlock[];
  children: PageSummary[];
};
