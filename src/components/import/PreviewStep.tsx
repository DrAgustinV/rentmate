import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { ParsedRow } from '@/lib/import/csvParser';

interface PreviewStepProps {
  rows: ParsedRow[];
  onBack: () => void;
  onContinue: (validRows: ParsedRow[]) => void;
}

export function PreviewStep({ rows, onBack, onContinue }: PreviewStepProps) {
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const validRows = rows.filter(r => r._errors.length === 0);
  const errorRows = rows.filter(r => r._errors.length > 0);
  const warningRows = rows.filter(r => r._warnings.length > 0 && r._errors.length === 0);

  const filteredRows = rows.filter(row => {
    if (filter === 'errors') return row._errors.length > 0;
    if (filter === 'warnings') return row._warnings.length > 0 && row._errors.length === 0;
    return true;
  });

  const toggleRow = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  const getRowIcon = (row: ParsedRow) => {
    if (row._errors.length > 0) {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    if (row._warnings.length > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Import Preview</h2>
        <p className="text-muted-foreground">
          Review and validate your import data
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Valid ({validRows.length})
        </Badge>
        <Badge variant="outline" className="gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Warnings ({warningRows.length})
        </Badge>
        <Badge variant="outline" className="gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Errors ({errorRows.length})
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({rows.length})
        </Button>
        <Button
          variant={filter === 'errors' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('errors')}
        >
          Errors Only ({errorRows.length})
        </Button>
        <Button
          variant={filter === 'warnings' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('warnings')}
        >
          Warnings Only ({warningRows.length})
        </Button>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <div className="p-4 space-y-2">
          {filteredRows.map((row) => (
            <Card key={row._rowNumber} className="p-4">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => toggleRow(row._rowNumber)}
              >
                {expandedRows.has(row._rowNumber) ? (
                  <ChevronDown className="w-5 h-5 mt-0.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 mt-0.5 text-muted-foreground" />
                )}
                {getRowIcon(row)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {row.title || row.property_title || (row as any).company_name || `Row ${row._rowNumber}`}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      Row {row._rowNumber}
                    </Badge>
                  </div>
                  {row._errors.length > 0 && (
                    <p className="text-sm text-destructive mt-1">
                      {row._errors.length} error{row._errors.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {row._warnings.length > 0 && row._errors.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      {row._warnings.length} warning{row._warnings.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {expandedRows.has(row._rowNumber) && (
                <div className="mt-4 ml-8 space-y-3">
                  {row._errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-destructive">Errors:</p>
                      {row._errors.map((error, i) => (
                        <p key={i} className="text-sm text-muted-foreground ml-4">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                  {row._warnings.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-600">Warnings:</p>
                      {row._warnings.map((warning, i) => (
                        <p key={i} className="text-sm text-muted-foreground ml-4">
                          • {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Data:</p>
                    <div className="text-sm text-muted-foreground ml-4 space-y-1">
                      {Object.entries(row)
                        .filter(([key]) => !key.startsWith('_'))
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {value || '(empty)'}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {errorRows.length > 0 && (
            <Button variant="outline" onClick={() => onContinue(validRows)}>
              Skip Invalid ({errorRows.length}) & Import Valid ({validRows.length})
            </Button>
          )}
          <Button
            onClick={() => onContinue(validRows)}
            disabled={validRows.length === 0}
          >
            Import {validRows.length} Record{validRows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
