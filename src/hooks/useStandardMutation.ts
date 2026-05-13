import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface StandardMutationOptions<TData = any, TVariables = any, TContext = any> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: unknown, variables: TVariables, context: TContext) => void;
  
  /** When true, suppresses all toast notifications */
  silent?: boolean;
  
  /** Custom success message to display in the toast */
  successMessage?: string;
  
  /** Custom error message to display in the toast */
  errorMessage?: string;
}

export function useStandardMutation<TData = any, TVariables = any, TContext = any>(
  options: StandardMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn: options.mutationFn,
    onSuccess: (data, variables, context) => {
      if (!options.silent && options.successMessage) {
        toast({
          title: t('common.success'),
          description: options.successMessage,
          variant: 'default',
        });
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!options.silent && options.errorMessage) {
        toast({
          title: t('common.error'),
          description: options.errorMessage,
          variant: 'destructive',
        });
      }
      options.onError?.(error, variables, context);
    },
  });
}
