import type { JSONContent } from "@tiptap/core";

export type PageSaveState = "saved" | "saving" | "failed" | "offline";

type PageAutosaveOptions = {
  delayMs?: number;
  isOnline: () => boolean;
  onStateChange: (state: PageSaveState) => void;
  persistDraft: (document: JSONContent) => void;
  removeDraft: () => void;
  save: (document: JSONContent) => Promise<void>;
};

/** Keeps the latest page draft durable while coalescing editor updates. */
export class PageAutosave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private revision = 0;
  private pending: { document: JSONContent; revision: number } | null = null;

  constructor(private readonly options: PageAutosaveOptions) {}

  schedule(document: JSONContent) {
    this.revision += 1;
    this.pending = { document, revision: this.revision };
    this.options.persistDraft(document);
    this.options.onStateChange("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () => void this.flush(),
      this.options.delayMs ?? 650
    );
  }

  retryWhenOnline() {
    if (this.pending && this.options.isOnline()) void this.flush();
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async flush() {
    const pending = this.pending;
    this.timer = null;
    if (!pending) return;
    if (!this.options.isOnline()) {
      this.options.onStateChange("offline");
      return;
    }

    this.options.onStateChange("saving");
    try {
      await this.options.save(pending.document);
      if (this.revision !== pending.revision) return;
      this.pending = null;
      this.options.removeDraft();
      this.options.onStateChange("saved");
    } catch {
      this.options.persistDraft(pending.document);
      this.options.onStateChange(
        this.options.isOnline() ? "failed" : "offline"
      );
    }
  }
}
