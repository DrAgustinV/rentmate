import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PropertyDetails from "./pages/PropertyDetails";
import PropertyTenants from "./pages/PropertyTenants";
import PropertyTickets from "./pages/PropertyTickets";
import PropertyMaintenance from "./pages/PropertyMaintenance";
import MaintenanceCalendar from "./pages/MaintenanceCalendar";
import ScheduledTasks from "./pages/ScheduledTasks";
import TicketDetail from "./pages/TicketDetail";
import Tickets from "./pages/Tickets";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import TemplatesManager from "./pages/TemplatesManager";
import Invitations from "./pages/Invitations";
import About from "./pages/About";
import Help from "./pages/Help";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import { queryClient } from "./lib/queryClient";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BrandProvider } from "@/components/BrandProvider";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserPreferencesProvider>
      <LanguageProvider>
        <BrandProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <AnalyticsProvider>
                <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/properties/:propertyId/details" element={<PropertyDetails />} />
          <Route path="/properties/:propertyId/tenants" element={<PropertyTenants />} />
          <Route path="/properties/:propertyId/tickets" element={<PropertyTickets />} />
          <Route path="/properties/:propertyId/maintenance" element={<PropertyMaintenance />} />
          <Route path="/properties/:propertyId/tickets/:ticketId" element={<TicketDetail />} />
          <Route path="/maintenance-calendar/:propertyId" element={<MaintenanceCalendar />} />
          <Route path="/tickets" element={<Navigate to="/dashboard" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
                </Routes>
              </AnalyticsProvider>
            </BrowserRouter>
          </TooltipProvider>
    </BrandProvider>
    </LanguageProvider>
    </UserPreferencesProvider>
  </QueryClientProvider>
);

export default App;
