export const CALENDAR_EDITOR_CONTENT_CLASS =
  "needt-overlay-depth !bottom-0 !left-0 !top-auto h-[92dvh] max-h-[92dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden !rounded-b-none !rounded-t-2xl border-[var(--dialog-border)] p-0 text-[var(--text-primary)] shadow-lg sm:!bottom-auto sm:!left-1/2 sm:!top-1/2 sm:h-[min(767px,calc(100dvh-3.875rem))] sm:max-h-[calc(100dvh-3.875rem)] sm:!w-[calc(100vw-3rem)] sm:!max-w-[960px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-[var(--dialog-radius)] lg:[&>button.absolute]:-right-8 lg:[&>button.absolute]:top-0";

export const CALENDAR_EDITOR_FORM_CLASS =
  "flex h-full min-h-0 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:grid-rows-[95px_minmax(0,1fr)_54px] lg:overflow-hidden lg:[grid-template-areas:'header_aside''main_aside''mainFooter_asideFooter']";

export const CALENDAR_EDITOR_MAIN_FOOTER_CLASS =
  "hidden items-center border-t border-[var(--border-subtle)] px-6 sm:flex lg:[grid-area:mainFooter] lg:px-10";

export const CALENDAR_EDITOR_ASIDE_FOOTER_CLASS =
  "needt-panel-depth sticky bottom-0 z-10 mt-auto flex min-h-[54px] flex-none items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-3 lg:static lg:[grid-area:asideFooter] lg:border-l";
