import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FILE_SIZE_LIMITS } from '@/constants';

interface UploadRepairShopsStepProps {
  onFileSelect: (file: File) => void;
}

export function UploadRepairShopsStep({ onFileSelect }: UploadRepairShopsStepProps) {
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
    const isValid = validTypes.some(
      (type) => file.type === type || file.name.toLowerCase().endsWith('.csv')
    );

    if (!isValid) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > FILE_SIZE_LIMITS.IMPORT_FILE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5 MB',
        variant: 'destructive',
      });
      return;
    }

    onFileSelect(file);
  };

  const downloadTemplate = () => {
    const template = 'repair_shops_import_template.csv';
    const link = document.createElement('a');
    link.href = `/templates/${template}`;
    link.download = template;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Import Repair Shops</h2>
        <p className="text-muted-foreground">
          Upload a CSV file to bulk import your preferred repair shop contacts.
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-muted-foreground" />
          <div>
            <h3 className="font-medium">CSV Template</h3>
            <p className="text-sm text-muted-foreground">
              Download the template file to see the required columns.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Download template
        </Button>
      </Card>

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
            id="repair-shops-file-upload"
          />
          <label htmlFor="repair-shops-file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drag & drop or click to browse</p>
            <p className="text-sm text-muted-foreground">Supports: .csv • Max size: 5 MB</p>
          </label>
        </div>
      </div>
    </div>
  );
}
