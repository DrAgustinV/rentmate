import { toast } from 'sonner';

export type HandleResponseOptions = {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
};

export function handleResponse(
  result: { success: boolean; data?: any; error?: any } | any,
  options: HandleResponseOptions = {}
) {
  const { successMessage, errorMessage, silent, onSuccess, onError } = options;

  if (silent) {
    if (result?.success && onSuccess) onSuccess(result.data);
    if (!result?.success && onError) onError(result?.error);
    return;
  }

  if (result?.success) {
    toast.success(successMessage || 'Success');
    if (onSuccess) onSuccess(result.data);
  } else {
    toast.error(errorMessage || result?.error?.message || 'An error occurred');
    if (onError) onError(result?.error);
  }
}
