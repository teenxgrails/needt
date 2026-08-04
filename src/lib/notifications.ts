import { toast, type ExternalToast } from "sonner";

export type NotificationOptions = ExternalToast & {
  /**
   * Reuses a Sonner toast ID so repeated status updates replace the existing
   * notification instead of adding another item to the visual queue.
   */
  dedupeKey?: string;
};

function withDedupeKey(options?: NotificationOptions): ExternalToast | undefined {
  if (!options?.dedupeKey) return options;

  const { dedupeKey, ...sonnerOptions } = options;
  return { ...sonnerOptions, id: sonnerOptions.id ?? dedupeKey };
}

export const notify = {
  loading(message: string, options?: NotificationOptions) {
    return toast.loading(message, withDedupeKey(options));
  },
  success(message: string, options?: NotificationOptions) {
    return toast.success(message, withDedupeKey(options));
  },
  warning(message: string, options?: NotificationOptions) {
    return toast.warning(message, withDedupeKey(options));
  },
  error(message: string, options?: NotificationOptions) {
    return toast.error(message, withDedupeKey(options));
  },
  info(message: string, options?: NotificationOptions) {
    return toast.info(message, withDedupeKey(options));
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
