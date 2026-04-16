import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useMyProfile } from "@/hooks/useHierarchy";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerDetail from "./pages/CustomerDetail";
import ChangePassword from "./pages/ChangePassword";
import Customers from "./pages/Customers";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Operations from "./pages/Operations";
import OperationsHub from "./pages/OperationsHub";
import Appointments from "./pages/Appointments";
import Commissions from "./pages/Commissions";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import ManagerDashboard from "./pages/ManagerDashboard";
import OfficersHub from "./pages/OfficersHub";
import SiteCamFeed from "./pages/SiteCamFeed";
import SiteCamCreatePhoto from "./pages/SiteCamCreatePhoto";
import BattleLedger from "./pages/BattleLedger";
import SettingsPage from "./pages/SettingsPage";
import CustomersOverview from "./pages/CustomersOverview";
import ActiveJobs from "./pages/ActiveJobs";
import AllJobs from "./pages/AllJobs";
import AcvFinancials from "./pages/AcvFinancials";
import MainFinancials from "./pages/MainFinancials";
import JobsOnly from "./pages/JobsOnly";
import LeadArsenal from "./pages/LeadArsenal";
import CallCommand from "./pages/CallCommand";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // Force password change
  if (profile?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  // Block inactive users
  if (profile && !profile.active) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ChangePasswordRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/change-password" element={<ChangePasswordRoute><ChangePassword /></ChangePasswordRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
            <Route path="/operations" element={<ProtectedRoute><OperationsHub /></ProtectedRoute>} />
            <Route path="/operations/:id" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
            <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
            <Route path="/officers-hub" element={<ProtectedRoute><OfficersHub /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/sitecam/capture" element={<ProtectedRoute><SiteCamCreatePhoto /></ProtectedRoute>} />
            <Route path="/sitecam" element={<ProtectedRoute><SiteCamFeed /></ProtectedRoute>} />
            <Route path="/battle-ledger" element={<ProtectedRoute><BattleLedger /></ProtectedRoute>} />
            <Route path="/dashboard/customers-overview" element={<ProtectedRoute><CustomersOverview /></ProtectedRoute>} />
            <Route path="/dashboard/active-jobs" element={<ProtectedRoute><ActiveJobs /></ProtectedRoute>} />
            <Route path="/dashboard/all-jobs" element={<ProtectedRoute><AllJobs /></ProtectedRoute>} />
            <Route path="/dashboard/acv-financials" element={<ProtectedRoute><AcvFinancials /></ProtectedRoute>} />
            <Route path="/financials/mains" element={<ProtectedRoute><MainFinancials /></ProtectedRoute>} />
            <Route path="/jobs-only" element={<ProtectedRoute><JobsOnly /></ProtectedRoute>} />
            <Route path="/lead-arsenal" element={<ProtectedRoute><LeadArsenal /></ProtectedRoute>} />
            <Route path="/call-command" element={<ProtectedRoute><CallCommand /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/users/:id" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
