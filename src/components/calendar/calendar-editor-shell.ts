// 840x620 rather than 960x767. The old size was set by the screen, not by the
// content: the right column ran out of fields long before the bottom, and the
// description area held a half-window of blank space. A dialog that is larger
// than what it holds reads as unfinished.
export const CALENDAR_EDITOR_CONTENT_CLASS =
  "needt-overlay-depth !bottom-0 !left-0 !top-auto h-[92dvh] max-h-[92dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden !rounded-b-none !rounded-t-2xl border-[var(--dialog-border)] p-0 text-[var(--text-primary)] shadow-lg sm:!bottom-auto sm:!left-1/2 sm:!top-1/2 sm:h-[min(620px,calc(100dvh-3.875rem))] sm:max-h-[calc(100dvh-3.875rem)] sm:!w-[calc(100vw-3rem)] sm:!max-w-[840px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-[var(--dialog-radius)] lg:[&>button.absolute]:-right-8 lg:[&>button.absolute]:top-0";

// The header row drops from 95px to 84px: at 620px tall the old header carried
// dead space, but 76px pressed the title into the type switch above it and the
// formatting bar below. The aside narrows with the window so the description
// keeps roughly the same share of the width.
export const CALENDAR_EDITOR_FORM_CLASS =
  "flex h-full min-h-0 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,356px)] lg:grid-rows-[84px_minmax(0,1fr)_54px] lg:overflow-hidden lg:[grid-template-areas:'header_aside''main_aside''mainFooter_asideFooter']";

export const CALENDAR_EDITOR_MAIN_FOOTER_CLASS =
  "hidden items-center border-t border-[var(--border-subtle)] px-6 sm:flex lg:[grid-area:mainFooter] lg:px-10";

export const CALENDAR_EDITOR_ASIDE_FOOTER_CLASS =
  "needt-panel-depth sticky bottom-0 z-10 mt-auto flex min-h-[54px] flex-none items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-3 lg:static lg:[grid-area:asideFooter] lg:border-l";
