import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import React, { Suspense } from 'react';
import { Clock } from 'lucide-react';

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Login = React.lazy(() => import('./pages/auth/Login'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const DashboardLayout = React.lazy(() => import('./components/layout/DashboardLayout'));

// Dashboard root
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const Profile = React.lazy(() => import('./pages/dashboard/Profile'));

// Master Summaries
const MasterSummaries = React.lazy(() => import('./pages/dashboard/MasterSummaries'));

// Supervisors
const Supervisors = React.lazy(() => import('./pages/dashboard/Supervisors'));

// Budgets
const Budgets = React.lazy(() => import('./pages/dashboard/Budgets'));

// Stationeries
const Stationeries = React.lazy(() => import('./pages/dashboard/Stationeries'));

// Teachers / Miscellaneous
const Teachers = React.lazy(() => import('./pages/dashboard/Teachers'));

// Security module
const SecurityOverview = React.lazy(() => import('./pages/dashboard/security/SecurityOverview'));
const Users = React.lazy(() => import('./pages/dashboard/security/Users'));
const Roles = React.lazy(() => import('./pages/dashboard/security/Roles'));
const Permissions = React.lazy(() => import('./pages/dashboard/security/Permissions'));
const AuditLogs = React.lazy(() => import('./pages/dashboard/security/AuditLogs'));
const Sessions = React.lazy(() => import('./pages/dashboard/security/Sessions'));

// Settings module
const Regions = React.lazy(() => import('./pages/dashboard/settings/Regions'));
const Districts = React.lazy(() => import('./pages/dashboard/settings/Districts'));
const Examinations = React.lazy(() => import('./pages/dashboard/settings/Examinations'));
const Subjects = React.lazy(() => import('./pages/dashboard/settings/Subjects'));
const RegionalDistances = React.lazy(() => import('./pages/dashboard/settings/RegionalDistances'));
const TransportGuidelines = React.lazy(() => import('./pages/dashboard/settings/TransportGuidelines'));

// Institutions module
const InstitutionsOverview = React.lazy(() => import('./pages/dashboard/institutions/InstitutionsOverview'));
const PrimarySchools = React.lazy(() => import('./pages/dashboard/institutions/PrimarySchools'));
const SecondarySchools = React.lazy(() => import('./pages/dashboard/institutions/SecondarySchools'));
const TeachersColleges = React.lazy(() => import('./pages/dashboard/institutions/TeachersColleges'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

import nectaLogo from './images/NECTA.png';

const LoadingSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-slate-50 transition-all duration-500 ease-in-out">
    <div className="flex flex-col items-center space-y-6">
      <div className="w-20 h-20 animate-pulse">
        <img src={nectaLogo} alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
      </div>
      <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center" richColors closeButton duration={3000} />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard Overview */}
                <Route index element={<Dashboard />} />

                {/* Core modules */}
                <Route path="master-summaries" element={<MasterSummaries />} />
                <Route path="supervisors" element={<Supervisors />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="stationeries" element={<Stationeries />} />

                {/* Miscellaneous */}
                <Route path="teachers" element={<Teachers />} />
                <Route path="miscellaneous/jobs" element={<Teachers />} />

                {/* Security module */}
                <Route path="security" element={<SecurityOverview />} />
                <Route path="security/users" element={<Users />} />
                <Route path="security/roles" element={<Roles />} />
                <Route path="security/permissions" element={<Permissions />} />
                <Route path="security/audit-logs" element={<AuditLogs />} />
                <Route path="security/sessions" element={<Sessions />} />

                {/* Institutions module */}
                <Route path="institutions" element={<InstitutionsOverview />} />
                <Route path="institutions/primary" element={<PrimarySchools />} />
                <Route path="institutions/secondary" element={<SecondarySchools />} />
                <Route path="institutions/colleges" element={<TeachersColleges />} />

                {/* Settings module */}
                <Route path="settings" element={<Navigate to="settings/regions" replace />} />
                <Route path="settings/regions" element={<Regions />} />
                <Route path="settings/districts" element={<Districts />} />
                <Route path="settings/examinations" element={<Examinations />} />
                <Route path="settings/subjects" element={<Subjects />} />
                <Route path="settings/regional-distances" element={<RegionalDistances />} />
                <Route path="settings/transport-guidelines" element={<TransportGuidelines />} />

                {/* Placeholder routes */}
                <Route path="timetables" element={
                  <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                    <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-semibold text-gray-500">Timetables</p>
                    <p className="text-sm text-gray-400 mt-1">Module coming soon</p>
                  </div>
                } />
                <Route path="reports" element={
                  <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                    <p className="text-lg font-semibold text-gray-500">Reports</p>
                    <p className="text-sm text-gray-400 mt-1">Module coming soon</p>
                  </div>
                } />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:userId" element={<Profile />} />

                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <p className="text-6xl font-bold text-gray-100">404</p>
                    <p className="font-medium mt-2">Page not found</p>
                  </div>
                } />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
