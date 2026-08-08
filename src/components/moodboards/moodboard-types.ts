export type MoodboardSummary = {
  id: string;
  title: string;
  createdById: string;
  updatedAt: string;
};

export type MoodboardDetail = MoodboardSummary & {
  accessRole: "FULL_ACCESS" | "EDITOR" | "VIEWER";
};

export type MoodboardSnapshot = {
  id: string;
  createdAt: string;
};
