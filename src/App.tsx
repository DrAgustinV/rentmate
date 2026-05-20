import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/CookieConsent";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { RoleProvider, RoleResolver } from "@/contexts/RoleContext";

// Lazy-loaded pages for code splitting and error isolation
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyTenants = lazy(() => import("./pages/PropertyTenants"));
const PropertyTickets = lazy(() => import("./pages/PropertyTickets"));
const PropertyMaintenance = lazy(() => import("./pages/PropertyMaintenance"));
const MaintenanceCalendar = lazy(() => import("./pages/MaintenanceCalendar"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const Tickets = lazy(() => import("./pages/Tickets"));
const KiltSetup = lazy(() => import("./pages/KiltSetup"));
const Admin = lazy(() => import("./pages/Admin"));
const TemplatesManager = lazy(() => import("./pages/TemplatesManager"));
const Invitations = lazy(() => import("./pages/Invitations"));
const About = lazy(() => import("./pages/About"));
const Help = lazy(() => import("./pages/Help"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Rentals = lazy(() => import("./pages/Rentals"));
const Configuration = lazy(() => import("./pages/Configuration"));
const Account = lazy(() => import("./pages/Account"));
const Pricing = lazy(() => import("./pages/Pricing"));
const RepairShops = lazy(() => import("./pages/RepairShops"));
const Import = lazy(() => import("./pages/Import"));
const ImportRepairShops = lazy(() => import("./pages/ImportRepairShops"));
const PropertyOverview = lazy(() => import("./pages/PropertyOverview"));

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Helper to wrap page with error boundary + lazy loading
function withErrorBoundary(page: React.LazyExoticComponent<React.ComponentType<any>>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {page}
      </Suspense>
    </ErrorBoundary>
  );
}

// Helper for inline components (redirects)
function withErrorBoundaryInline(element: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
}

// Redirect component for legacy route
function PropertyDetailsRedirect() {
  const { propertyId } = useParams();
  return <Navigate to={`/properties/${propertyId}/tenants`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <AnalyticsProvider>
            <EmailVerificationGate>
              <RoleProvider>
                <RoleResolver>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Index /></Suspense></ErrorBoundary>} />
              <Route path="/pricing" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Pricing /></Suspense></ErrorBoundary>} />
              <Route path="/about" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><About /></Suspense></ErrorBoundary>} />
              <Route path="/privacy" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Privacy /></Suspense></ErrorBoundary>} />
              <Route path="/terms" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Terms /></Suspense></ErrorBoundary>} />
              <Route path="/help" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Help /></Suspense></ErrorBoundary>} />

              {/* Auth routes */}
              <Route path="/auth" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Auth /></Suspense></ErrorBoundary>} />
              <Route path="/reset-password" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ResetPassword /></Suspense></ErrorBoundary>} />
              <Route path="/verify-email" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense></ErrorBoundary>} />

              {/* Dashboard & main app */}
              <Route path="/dashboard" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ErrorBoundary>} />
              <Route path="/properties" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Properties /></Suspense></ErrorBoundary>} />
              <Route path="/import" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Import /></Suspense></ErrorBoundary>} />
              <Route path="/repair-shops" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><RepairShops /></Suspense></ErrorBoundary>} />
              <Route path="/repair-shops/import" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><ImportRepairShops /></Suspense></ErrorBoundary>} />
              <Route path="/rentals" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Rentals /></Suspense></ErrorBoundary>} />
              <Route path="/renting" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Navigate to="/rentals" replace /></Suspense></ErrorBoundary>} />
              <Route path="/tickets" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Navigate to="/dashboard" replace /></Suspense></ErrorBoundary>} />

              {/* Property hub routes */}
              <Route path="/properties/:propertyId/tenants" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PropertyTenants /></Suspense></ErrorBoundary>} />
              <Route path="/properties/:propertyId/details" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PropertyDetailsRedirect /></Suspense></ErrorBoundary>} />
              <Route path="/properties/:propertyId/tickets" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PropertyTickets /></Suspense></ErrorBoundary>} />
              <Route path="/properties/:propertyId/maintenance" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PropertyMaintenance /></Suspense></ErrorBoundary>} />
              <Route path="/properties/:propertyId/tickets/:ticketId" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><TicketDetail /></Suspense></ErrorBoundary>} />
              <Route path="/properties/:propertyId/overview" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><PropertyOverview /></Suspense></ErrorBoundary>} />
              <Route path="/maintenance-calendar/:propertyId" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><MaintenanceCalendar /></Suspense></ErrorBoundary>} />

              {/* Settings & account */}
              <Route path="/configuration" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Configuration /></Suspense></ErrorBoundary>} />
              <Route path="/account" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Account /></Suspense></ErrorBoundary>} />
              <Route path="/profile" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Navigate to="/account" replace /></Suspense></ErrorBoundary>} />
              <Route path="/identity" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Navigate to="/account" replace /></Suspense></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Navigate to="/account" replace /></Suspense></ErrorBoundary>} />
              <Route path="/invitations" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Invitations /></Suspense></ErrorBoundary>} />

              {/* Advanced features */}
              <Route path="/kilt-setup" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><KiltSetup /></Suspense></ErrorBoundary>} />
              <Route path="/admin" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><Admin /></Suspense></ErrorBoundary>} />
              <Route path="/templates" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><TemplatesManager /></Suspense></ErrorBoundary>} />

              {/* Catch-all */}
              <Route path="*" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><NotFound /></Suspense></ErrorBoundary>} />
            </Routes>
                </RoleResolver>
              </RoleProvider>
          </EmailVerificationGate>
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
