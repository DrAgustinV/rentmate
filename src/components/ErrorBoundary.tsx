import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Here you could also send to error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKeys changes
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys !== this.props.resetKeys
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    this.resetError();
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.resetError();
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but an unexpected error occurred. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-red-50 rounded-md text-sm text-red-800 max-h-32 overflow-y-auto">
                  <p className="font-medium">Error: {this.state.error.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                If this keeps happening, please{' '}
                <a 
                  href="mailto:support@rentmate.me?subject=Error Report" 
                  className="underline hover:text-primary"
                >
                  contact support
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===================
// Hook for simpler usage
// ===================

import { useState, useCallback } from 'react';

interface UseErrorBoundaryOptions {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function useErrorBoundary(options: UseErrorBoundaryOptions = {}) {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const throwError = useCallback((error: Error) => {
    setError(error);
    options.onError?.(error, { componentStack: '' });
  }, [options]);

  if (error) {
    throw error;
  }

  return { resetError, throwError };
}

// ===================
// Async Error Boundary Wrapper
// ===================

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
}

export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AsyncErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-muted-foreground">
          Something went wrong loading this content.
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;