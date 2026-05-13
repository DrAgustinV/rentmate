import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ReactNode } from "react";

export interface StandardMutationOptions<TData, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, unknown, TVariables, TContext>, "onSuccess" | "onError"> {
  successToast?: { title: ReactNode; description?: ReactNode };
  errorToast?: { title: ReactNode; description?: ReactNode };
  silentOnError?: boolean;
}

export function useStandardMutation<TData, TVariables, TContext>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: StandardMutationOptions<TData, TVariables, TContext> = {}
) {
  const { toast } = useToast();
  const { successToast, errorToast, silentOnError, onSuccess, onError, ...rest } = options;

  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn,
    ...rest,
    onSuccess: (data, variables, context) => {
      if (successToast) {
        toast({
          title: successToast.title,
          description: successToast.description,
        });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!silentOnError && errorToast) {
        toast({
          title: errorToast.title,
          description: errorToast.description,
          variant: "destructive",
        });
      }
      onError?.(error, variables, context);
    },
  });
}
