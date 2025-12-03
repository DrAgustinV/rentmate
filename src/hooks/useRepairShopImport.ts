import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RepairShopImportRecord {
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  specializations?: string[];
  license_number?: string | null;
  notes?: string | null;
}

export interface RepairShopImportSummary {
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: Array<{ record: string; error: string }>;
}

interface UseRepairShopImportArgs {
  data: RepairShopImportRecord[];
  fileName?: string;
  fileSize?: number;
}

export function useRepairShopImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ data }: UseRepairShopImportArgs) => {
      const { data: result, error } = await supabase.functions.invoke(
        'bulk-import-repair-shops',
        {
          body: { data },
        }
      );

      if (error) {
        throw error;
      }

      return result as { summary: RepairShopImportSummary };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-shops'] });
      toast({
        title: 'Import completed',
        description: 'Repair shops were imported successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
