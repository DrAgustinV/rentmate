import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
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
import KiltSetup from "./pages/KiltSetup";
import Admin from "./pages/Admin";
import TemplatesManager from "./pages/TemplatesManager";
import Invitations from "./pages/Invitations";
import About from "./pages/About";
import Help from "./pages/Help";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Properties from "./pages/Properties";
import Rentals from "./pages/Rentals";
import Configuration from "./pages/Configuration";
import Profile from "./pages/Profile";
import Identity from "./pages/Identity";
import Account from "./pages/Account";
import Pricing from "./pages/Pricing";
import RepairShops from "./pages/RepairShops";
import Import from "./pages/Import";
import ImportRepairShops from "./pages/ImportRepairShops";
import { queryClient } from "./lib/queryClient";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <AnalyticsProvider>
          <Routes>
           <Route path="/" element={<Index />} />
           <Route path="/pricing" element={<Pricing />} />
           <Route path="/auth" element={<Auth />} />
           <Route path="/reset-password" element={<ResetPassword />} />
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/properties" element={<Properties />} />
           <Route path="/import" element={<Import />} />
           <Route path="/repair-shops" element={<RepairShops />} />
           <Route path="/repair-shops/import" element={<ImportRepairShops />} />
           <Route path="/rentals" element={<Rentals />} />
           <Route path="/renting" element={<Navigate to="/rentals" replace />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile" element={<Navigate to="/account" replace />} />
          <Route path="/identity" element={<Navigate to="/account" replace />} />
          <Route path="/invitations" element={<Navigate to="/rentals" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/kilt-setup" element={<KiltSetup />} />
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
  </QueryClientProvider>
);

export default App;
