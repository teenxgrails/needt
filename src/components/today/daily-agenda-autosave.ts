export type DailyAgendaSaveState = "saving" | "saved" | "error";

type DailyAgendaSave = {
  date: string;
  content: string;
  documentFormatVersion: 1 | 2;
};

type DailyAgendaAutosaveOptions = {
  delayMs?: number;
  getActiveDate: () => string;
  getDocumentFormatVersion: () => 1 | 2;
  onStateChange: (state: DailyAgendaSaveState) => void;
  persistDraft: (date: string, content: string) => void;
  removeDraft: (date: string) => void;
  save: (entry: DailyAgendaSave) => Promise<void>;
};

/** Serializes date-keyed saves without letting stale requests clear newer drafts. */
export class DailyAgendaAutosave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<string, string>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly options: DailyAgendaAutosaveOptions) {}

  schedule(date: string, content: string) {
    this.pending.set(date, content);
    this.options.persistDraft(date, content);
    if (this.options.getActiveDate() === date) {
      this.options.onStateChange("saving");
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () => void this.flush(),
      this.options.delayMs ?? 550
    );
  }

  flush(targetDate?: string) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const batch = Array.from(this.pending.entries())
      .filter(([date]) => !targetDate || date === targetDate)
      .map(([date, content]) => ({ date, content }));
    if (batch.length === 0) return this.queue;

    for (const entry of batch) {
      if (this.pending.get(entry.date) === entry.content) {
        this.pending.delete(entry.date);
      }
    }
    if (batch.some(({ date }) => this.options.getActiveDate() === date)) {
      this.options.onStateChange("saving");
    }

    const request = this.queue
      .catch(() => undefined)
      .then(async () => {
        for (const entry of batch) {
          try {
            await this.options.save({
              ...entry,
              documentFormatVersion: this.options.getDocumentFormatVersion(),
            });
            if (!this.pending.has(entry.date)) {
              this.options.removeDraft(entry.date);
              if (this.options.getActiveDate() === entry.date) {
                this.options.onStateChange("saved");
              }
            }
          } catch {
            // A newer edit always wins over the failed request body.
            if (!this.pending.has(entry.date)) {
              this.pending.set(entry.date, entry.content);
            }
            if (this.options.getActiveDate() === entry.date) {
              this.options.onStateChange("error");
            }
          }
        }
      });
    this.queue = request;
    return request;
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
