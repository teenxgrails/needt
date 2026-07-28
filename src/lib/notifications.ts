import { toast } from "sonner";

type NotificationOptions = {
  description?: string;
  action?: { label: string; onClick: () => void };
};

export const notify = {
  loading(message: string) {
    return toast.loading(message);
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
