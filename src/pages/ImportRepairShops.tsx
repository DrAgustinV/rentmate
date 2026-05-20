import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/card';
import { UploadRepairShopsStep } from '@/components/import/UploadRepairShopsStep';
import { PreviewStep } from '@/components/import/PreviewStep';
import { ProcessingRepairShopsStep } from '@/components/import/ProcessingRepairShopsStep';
import { ResultsRepairShopsStep } from '@/components/import/ResultsRepairShopsStep';
import { parseCSV, ParsedRow } from '@/lib/import/csvParser';
import { showToast } from '@/lib/toast';
import { repairShopBaseSchema } from '@/lib/validations/repair-shop.schema';
import { useRepairShopImport, RepairShopImportRecord } from '@/hooks/useRepairShopImport';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type Step = 'upload' | 'preview' | 'processing' | 'results';

type RepairShopParsedRow = ParsedRow & {
  company_name: string;
  contact_person?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  postal_code?: string;
  specializations?: string;
  license_number?: string;
  notes?: string;
};

export default function ImportRepairShops() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<RepairShopParsedRow[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);

  const importMutation = useRepairShopImport();
  const navigate = useNavigate();

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const rawRows = parseCSV(text);

      const rows: RepairShopParsedRow[] = rawRows.map((row) => ({
        ...(row as ParsedRow),
        company_name: String((row as any).company_name || '').trim(),
        contact_person: (row as any).contact_person || '',
        email: (row as any).email || '',
        phone: String((row as any).phone || '').trim(),
        address: (row as any).address || '',
        city: (row as any).city || '',
        postal_code: (row as any).postal_code || '',
        specializations: (row as any).specializations || '',
        license_number: (row as any).license_number || '',
        notes: (row as any).notes || '',
        _errors: [],
        _warnings: [],
      }));

      rows.forEach((row) => {
        const specializationsArray = row.specializations
          ? String(row.specializations)
              .split(';')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const result = repairShopBaseSchema.safeParse({
          company_name: row.company_name,
          contact_person: row.contact_person || '',
          email: row.email || '',
          phone: row.phone,
          address: row.address || '',
          city: row.city || '',
          postal_code: row.postal_code || '',
          specializations: specializationsArray,
          license_number: row.license_number || '',
          notes: row.notes || '',
        });

        if (!result.success) {
          result.error.issues.forEach((issue) => {
            row._errors.push(issue.message);
          });
        }
      });

      setParsedRows(rows);
      setStep('preview');
    } catch (error: any) {
      showToast.error('Failed to parse file', error.message);
    }
  };

  const handleContinue = async (validRows: ParsedRow[]) => {
    setStep('processing');

    try {
      const records: RepairShopImportRecord[] = (validRows as RepairShopParsedRow[]).map(
        (row) => {
          const specializationsArray = row.specializations
            ? String(row.specializations)
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          return {
            company_name: row.company_name,
            contact_person: row.contact_person || null,
            email: row.email || null,
            phone: row.phone,
            address: row.address || null,
            city: row.city || null,
            postal_code: row.postal_code || null,
            specializations: specializationsArray,
            license_number: row.license_number || null,
            notes: row.notes || null,
          };
        }
      );

      const result = await importMutation.mutateAsync({
        data: records,
        fileName: file?.name,
        fileSize: file?.size,
      });

      setImportSummary(result.summary);
      setStep('results');
    } catch (error: any) {
      showToast.error('Import failed', error.message);
      setStep('preview');
    }
  };

  const handleStartNew = () => {
    setStep('upload');
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Breadcrumb className="mb-1">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/configuration?tab=repair-shops">Repair shops</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Bulk import</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/configuration?tab=repair-shops")}
            >
              Cancel
            </Button>
          </div>

          {step === 'upload' && <UploadRepairShopsStep onFileSelect={handleFileSelect} />}

          {step === 'preview' && (
            <PreviewStep
              rows={parsedRows as ParsedRow[]}
              onBack={() => setStep('upload')}
              onContinue={handleContinue}
            />
          )}

          {step === 'processing' && (
            <ProcessingRepairShopsStep totalRecords={parsedRows.length} />
          )}

          {step === 'results' && importSummary && (
            <ResultsRepairShopsStep summary={importSummary} onStartNew={handleStartNew} />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
