import { toast } from "sonner";

export type NotificationVariant = 'success' | 'error' | 'info' | 'silent';

export interface NotificationOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useNotification = () => {
  const show = (variant: NotificationVariant, options: NotificationOptions) => {
    const { title, description, duration = 3000, action } = options;

    switch (variant) {
      case 'success':
        toast.success(title, { description, duration, action });
        break;
      case 'error':
        toast.error(title, { description, duration, action });
        break;
      case 'info':
        toast.info(title, { description, duration, action });
        break;
      case 'silent':
        // Silent: neutral styling, typically used for informational updates or non-intrusive feedback
        // Uses infinite duration to require manual dismissal or auto-dismiss after a longer period if configured globally
        toast(title, { description, duration: Infinity, action });
        break;
      default:
        toast(title, { description, duration, action });
    }
  };

  const success = (title: string, description?: string, duration?: number) => {
    show('success', { title, description, duration });
  };

  const error = (title: string, description?: string, duration?: number) => {
    show('error', { title, description, duration });
  };

  const info = (title: string, description?: string, duration?: number) => {
    show('info', { title, description, duration });
  };

  const silent = (title: string, description?: string) => {
    show('silent', { title, description });
  };

  return { show, success, error, info, silent };
};
