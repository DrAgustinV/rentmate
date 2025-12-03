import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RepairShopImportSummary } from '@/hooks/useRepairShopImport';

interface ResultsRepairShopsStepProps {
  summary: RepairShopImportSummary;
  onStartNew: () => void;
}

export function ResultsRepairShopsStep({ summary, onStartNew }: ResultsRepairShopsStepProps) {
  const navigate = useNavigate();

  const downloadErrorReport = () => {
    const csvContent = [
      'Record,Error',
      ...summary.errors.map((e) => `"${e.record}","${e.error}"`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repair-shops-import-errors-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        {summary.recordsFailed === 0 ? (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2 text-green-600">Import Complete!</h2>
            <p className="text-muted-foreground">All repair shops were imported successfully.</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold mb-2">Import Completed with Issues</h2>
            <p className="text-muted-foreground">Some repair shops could not be imported.</p>
          </>
        )}
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{summary.recordsSucceeded}</div>
            <div className="text-sm text-muted-foreground">Successfully Imported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive">{summary.recordsFailed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total records processed:</span>
            <Badge variant="outline">{summary.recordsProcessed}</Badge>
          </div>
        </div>

        {summary.errors.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-destructive">
                Failed Records ({summary.errors.length})
              </h3>
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
            <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto space-y-1">
              {summary.errors.slice(0, 5).map((error, i) => (
                <div key={i}>• {error.record}: {error.error}</div>
              ))}
              {summary.errors.length > 5 && (
                <div className="text-xs pt-2">...and {summary.errors.length - 5} more errors</div>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onStartNew} className="flex-1">
          Import More
        </Button>
        <Button onClick={() => navigate('/repair-shops')} className="flex-1">
          View Repair Shops
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
