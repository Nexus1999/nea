import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Users from "./pages/security/Users";
import Roles from "./pages/security/Roles";
import Permissions from "./pages/security/Permissions";
import AuditLogs from "./pages/security/AuditLogs";
import SecurityOverview from "./pages/security/SecurityOverview";
import Profile from "./pages/security/Profile";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/security" element={<SecurityOverview />} />
            <Route path="/security/users" element={<Users />} />
            <Route path="/security/roles" element={<Roles />} />
            <Route path="/security/permissions" element={<Permissions />} />
            <Route path="/security/audit" element={<AuditLogs />} />
            <Route path="/security/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;