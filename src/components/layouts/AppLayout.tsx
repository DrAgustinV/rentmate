import { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Breadcrumbs } from "@/components/Breadcrumbs";


interface AppLayoutProps {
  children: ReactNode;
  showBreadcrumbs?: boolean;
}

export function AppLayout({ children, showBreadcrumbs = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppHeader />
      {showBreadcrumbs && <Breadcrumbs />}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

export default AppLayout;
