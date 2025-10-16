import { ReactNode } from "react";
import { BRAND_NAME, BRAND_LOGO } from "@/config/brand.config";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={BRAND_LOGO.src} alt={BRAND_LOGO.alt} className="h-16 w-16" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            {BRAND_NAME}
          </h1>
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