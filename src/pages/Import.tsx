import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/card';
import { UploadStep } from '@/components/import/UploadStep';
import { PreviewStep } from '@/components/import/PreviewStep';
import { ProcessingStep } from '@/components/import/ProcessingStep';
import { ResultsStep } from '@/components/import/ResultsStep';
import { parseCSV, detectImportType, groupByProperty, ParsedRow } from '@/lib/import/csvParser';
import { validateImport } from '@/lib/import/validators';
import { useImportMutation } from '@/hooks/useImport';
import { useToast } from '@/hooks/use-toast';
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

export default function Import() {
  const [step, setStep] = useState<Step>('upload');
  const [importType, setImportType] = useState<'properties' | 'properties_and_tenants' | 'tenants_only'>('properties_and_tenants');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  
  const { toast } = useToast();
  const importMutation = useImportMutation();
  const navigate = useNavigate();

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    
    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      
      const detectedType = detectImportType(rows);
      setImportType(detectedType);
      
      validateImport(rows, detectedType);
      setParsedRows(rows);
      setStep('preview');
    } catch (error: any) {
      toast({
        title: 'Failed to parse file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleContinue = async (validRows: ParsedRow[]) => {
    setStep('processing');

    try {
      // Transform rows based on import type
      let transformedData: any[] = [];

      if (importType === 'properties_and_tenants') {
        // Group by property and include tenants
        const grouped = groupByProperty(validRows);
        
        grouped.forEach((rows, propertyTitle) => {
          const firstRow = rows[0];
          const propertyData: any = {
            title: firstRow.title || propertyTitle,
            country: firstRow.country,
          };

          if (firstRow.address) propertyData.address = firstRow.address;
          if (firstRow.city) propertyData.city = firstRow.city;
          if (firstRow.state_province) propertyData.state_province = firstRow.state_province;
          if (firstRow.postal_code) propertyData.postal_code = firstRow.postal_code;
          if (firstRow.description) propertyData.description = firstRow.description;

          propertyData.tenants = rows
            .filter(r => r.tenant_email)
            .map(r => ({
              email: r.tenant_email!,
              first_name: r.tenant_first_name!,
              last_name: r.tenant_last_name!,
              phone: r.tenant_phone,
              started_at: r.started_at!,
              ended_at: r.ended_at,
              rent_amount_cents: Math.round(parseFloat(r.rent_amount!) * 100),
              payment_day: parseInt(r.payment_day!, 10),
              currency: r.currency!,
            }));

          transformedData.push(propertyData);
        });
      } else if (importType === 'properties') {
        transformedData = validRows.map(row => ({
          title: row.title,
          country: row.country,
          address: row.address,
          city: row.city,
          state_province: row.state_province,
          postal_code: row.postal_code,
          description: row.description,
        }));
      } else if (importType === 'tenants_only') {
        // Group tenants by property
        const grouped = groupByProperty(validRows);
        
        grouped.forEach((rows, propertyTitle) => {
          transformedData.push({
            title: propertyTitle,
            property_title: propertyTitle,
            tenants: rows.map(r => ({
              email: r.tenant_email!,
              first_name: r.tenant_first_name!,
              last_name: r.tenant_last_name!,
              phone: r.tenant_phone,
              started_at: r.started_at!,
              ended_at: r.ended_at,
              rent_amount_cents: Math.round(parseFloat(r.rent_amount!) * 100),
              payment_day: parseInt(r.payment_day!, 10),
              currency: r.currency!,
            })),
          });
        });
      }

      const result = await importMutation.mutateAsync({
        payload: {
          importType,
          data: transformedData,
          options: {
            skipInvalid: true,
            sendInvitations: true,
            createAgreements: importType !== 'properties',
          },
        },
        fileName: file?.name || 'unknown.csv',
        fileSize: file?.size || 0,
      });

      setImportSummary(result.summary);
      setStep('results');
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
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
                      <Link to="/properties">Properties</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Bulk import</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Bulk import properties &amp; tenants
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Use our CSV templates to quickly add properties and tenants.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/properties')}>
              Cancel
            </Button>
          </div>

          {step === 'upload' && (
            <UploadStep
              onFileSelect={handleFileSelect}
              importType={importType}
              setImportType={setImportType}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              rows={parsedRows}
              onBack={() => setStep('upload')}
              onContinue={handleContinue}
            />
          )}

          {step === 'processing' && (
            <ProcessingStep totalRecords={parsedRows.length} onComplete={() => {}} />
          )}

          {step === 'results' && importSummary && (
            <ResultsStep summary={importSummary} onStartNew={handleStartNew} />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
