import { toast, type ExternalToast } from "sonner";

type NotificationOptions = ExternalToast;

export const notify = {
  loading(message: string, options?: NotificationOptions) {
    return toast.loading(message, options);
  },
  success(message: string, options?: NotificationOptions) {
    return toast.success(message, options);
  },
  warning(message: string, options?: NotificationOptions) {
    return toast.warning(message, options);
  },
  error(message: string, options?: NotificationOptions) {
    return toast.error(message, options);
  },
  info(message: string, options?: NotificationOptions) {
    return toast.info(message, options);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
