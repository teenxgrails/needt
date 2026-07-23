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
  type: string;
  content: unknown;
  position: number;
  createdBy: "HUMAN" | "AI";
};

export type PageDetail = PageSummary & {
  coverUrl: string | null;
  blocks: PageBlock[];
  children: PageSummary[];
};
