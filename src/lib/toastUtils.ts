// Re-export from the unified toast module to maintain backward compatibility
export { showToast, type ToastVariant, type ToastOptions } from "./toast";

export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  const err = error as { message?: string; data?: { message?: string } };
  return err.message || err.data?.message || 'An unexpected error occurred';
}
