import { toast } from "sonner";

export type NotificationVariant = 'success' | 'error' | 'info' | 'silent';

export interface NotificationOptions {
  title?: string;
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

    if (variant === 'silent') {
      return;
    }

    switch (variant) {
      case 'success':
        toast.success(title || 'Success', { description, duration, action });
        break;
      case 'error':
        toast.error(title || 'Error', { description, duration, action });
        break;
      case 'info':
        toast.info(title || 'Info', { description, duration, action });
        break;
      default:
        toast(title || 'Notification', { description, duration, action });
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
