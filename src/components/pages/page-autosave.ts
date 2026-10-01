import type { JSONContent } from "@tiptap/core";

export type PageSaveState = "saved" | "saving" | "failed" | "offline";
export type PageWriteAuthority =
  | "rest"
  | "collaboration"
  | "collaboration-offline";

export function selectLatestPageRevision(
  current: number | null | undefined,
  candidate: number
) {
  return current === null || current === undefined
    ? candidate
    : Math.max(current, candidate);
}

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
  private authority: PageWriteAuthority = "rest";

  constructor(private readonly options: PageAutosaveOptions) {}

  setWriteAuthority(authority: PageWriteAuthority) {
    this.authority = authority;
    if (authority === "rest") return false;
    const hadPendingWrite = this.pending !== null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (authority === "collaboration") this.pending = null;
    return hadPendingWrite;
  }

  schedule(document: JSONContent) {
    this.revision += 1;
    this.pending = { document, revision: this.revision };
    this.options.persistDraft(document);
    if (this.authority === "collaboration") {
      this.options.onStateChange("saving");
      return;
    }
    if (this.authority === "collaboration-offline") {
      this.options.onStateChange("offline");
      return;
    }
    this.options.onStateChange("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () => void this.flush(),
      this.options.delayMs ?? 650
    );
  }

  retryWhenOnline() {
    if (this.authority === "rest" && this.pending && this.options.isOnline()) {
      void this.flush();
    }
  }

  hasPendingWrite() {
    return this.pending !== null;
  }

  acknowledgeCollaborationSync(unsyncedChanges: number) {
    if (this.authority !== "collaboration" || unsyncedChanges !== 0) {
      return false;
    }
    this.pending = null;
    this.options.removeDraft();
    this.options.onStateChange("saved");
    return true;
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private collaborationOwnsWrites() {
    return this.authority !== "rest";
  }

  private async flush() {
    if (this.collaborationOwnsWrites()) {
      return;
    }
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
      if (this.collaborationOwnsWrites()) return;
      this.options.persistDraft(pending.document);
      this.options.onStateChange(
        this.options.isOnline() ? "failed" : "offline"
      );
    }
  }
}
