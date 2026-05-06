import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load this section</h2>
          <p className="text-muted-foreground max-w-md">
            There was an error loading this part of the application. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;