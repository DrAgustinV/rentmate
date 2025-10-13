import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Invitations from "./pages/Invitations";
import Settings from "./pages/Settings";
import PropertyTickets from "./pages/PropertyTickets";
import PropertyMaintenance from "./pages/PropertyMaintenance";
import TicketDetail from "./pages/TicketDetail";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import MaintenanceCalendar from "./pages/MaintenanceCalendar";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Help from "./pages/Help";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
