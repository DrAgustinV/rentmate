import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProcessingRepairShopsStepProps {
  totalRecords: number;
}

export function ProcessingRepairShopsStep({ totalRecords }: ProcessingRepairShopsStepProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
        <h2 className="text-2xl font-bold mb-2">Processing Repair Shops...</h2>
        <p className="text-muted-foreground">
          Please wait while we import your repair shop contacts.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Records to process:</span>
            <span className="font-medium">{totalRecords}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated time:</span>
            <span className="font-medium">
              {Math.ceil((totalRecords * 1) / 60)} minute
              {Math.ceil((totalRecords * 1) / 60) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>✓ Validating repair shop data...</p>
          <p>✓ Creating repair shop records...</p>
          <p className="text-primary">⏳ Finalizing import...</p>
        </div>
      </Card>
    </div>
  );
}
