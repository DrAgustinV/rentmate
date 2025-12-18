import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadStepProps {
  onFileSelect: (file: File) => void;
  importType: 'properties' | 'properties_and_tenants' | 'tenants_only';
  setImportType: (type: 'properties' | 'properties_and_tenants' | 'tenants_only') => void;
}

export function UploadStep({ onFileSelect, importType, setImportType }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const validTypes = ['.csv', 'text/csv', 'application/vnd.ms-excel'];
    const isValid = validTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith('.csv')
    );

    if (!isValid) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5 MB',
        variant: 'destructive',
      });
      return;
    }

    onFileSelect(file);
  };

  const downloadTemplate = (template: string) => {
    const link = document.createElement('a');
    link.href = `/templates/${template}`;
    link.download = template;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-3 block">Choose Import Type</label>
          <div className="grid gap-3">
            <Card
              className={`p-4 cursor-pointer transition-colors ${
                importType === 'properties' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
              onClick={() => setImportType('properties')}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={importType === 'properties'}
                  onChange={() => setImportType('properties')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-medium">Properties Only</h3>
                  <p className="text-sm text-muted-foreground">
                    Import property list without tenants
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate('properties_import_template.csv');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-colors ${
                importType === 'properties_and_tenants' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
              onClick={() => setImportType('properties_and_tenants')}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={importType === 'properties_and_tenants'}
                  onChange={() => setImportType('properties_and_tenants')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-medium">Properties + Tenants</h3>
                  <p className="text-sm text-muted-foreground">
                    Import full portfolio with rent agreements
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate('full_portfolio_import.csv');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-colors ${
                importType === 'tenants_only' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
              onClick={() => setImportType('tenants_only')}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={importType === 'tenants_only'}
                  onChange={() => setImportType('tenants_only')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-medium">Tenants for Existing Properties</h3>
                  <p className="text-sm text-muted-foreground">
                    Add tenants to properties already created
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate('tenants_import_template.csv');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">Upload CSV File</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drag & drop or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports: .csv • Max size: 5 MB
              </p>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
