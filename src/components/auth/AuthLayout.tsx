import { ReactNode } from "react";
import { useBrand } from "@/contexts/BrandContext";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { brandName, logoUrl, logoAlt } = useBrand();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logoUrl} alt={logoAlt} className="h-12 w-12" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {brandName}
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        <div className="bg-card border border-border rounded-lg shadow-card p-6">
          {children}
        </div>
      </div>
    </div>
  );
}