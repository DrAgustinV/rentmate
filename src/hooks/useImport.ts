import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParsedRow } from '@/lib/import/csvParser';

export const IMPORT_LOGS_QUERY_KEY = 'import-logs';

interface ImportOptions {
  skipInvalid: boolean;
  sendInvitations: boolean;
  createAgreements: boolean;
}

interface ImportPayload {
  importType: 'properties' | 'properties_and_tenants' | 'tenants_only';
  data: any[];
  options: ImportOptions;
}

export function useImportLogs() {
  return useQuery({
    queryKey: [IMPORT_LOGS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useImportMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, fileName, fileSize }: { 
      payload: ImportPayload; 
      fileName: string;
      fileSize: number;
    }) => {
      const startTime = Date.now();

      // Create initial import log
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const { data: logData, error: logError } = await supabase
        .from('import_logs')
        .insert({
          manager_id: userId,
          import_type: payload.importType,
          file_name: fileName,
          file_size_bytes: fileSize,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Call edge function to process import
      const { data, error } = await supabase.functions.invoke('bulk-import-properties', {
        body: { ...payload, importLogId: logData.id },
      });

      if (error) throw error;

      // Update import log with results
      const processingTime = Date.now() - startTime;
      await supabase
        .from('import_logs')
        .update({
          records_processed: data.summary.recordsProcessed,
          records_succeeded: data.summary.recordsSucceeded,
          records_failed: data.summary.recordsFailed,
          error_log: data.summary.errors,
          processing_time_ms: processingTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logData.id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [IMPORT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-tenants'] });
      
      toast({
        title: 'Import completed',
        description: `Successfully imported ${data.summary.recordsSucceeded} records`,
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
