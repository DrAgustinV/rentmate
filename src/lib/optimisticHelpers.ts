import { QueryClient } from '@tanstack/react-query';

export interface OptimisticContext<T> {
  previousData: T | undefined;
}

export async function setupOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: (old: T | undefined) => T
): Promise<OptimisticContext<T>> {
  await queryClient.cancelQueries({ queryKey });
  const previousData = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, updater);
  return { previousData };
}

export function rollbackOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  context: OptimisticContext<T> | undefined
) {
  if (context?.previousData !== undefined) {
    queryClient.setQueryData(queryKey, context.previousData);
  }
}
