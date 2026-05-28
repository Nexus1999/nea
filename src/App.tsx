import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Timetables from "./pages/dashboard/Timetables";
import Teachers from "./pages/miscellaneous/Teachers";
import AssignTeachers from "./pages/miscellaneous/AssignTeachers";
import JobAssignments from "./pages/miscellaneous/JobAssignments";
import TeacherSubmissionPage from "./pages/TeacherSubmissionPage";
import DetailsPortal from "./pages/DetailsPortal";
import PrimaryTeachersManagementPage from "./pages/miscellaneous/TeachersManagement";
import SupervisionsPage from "./pages/supervisors/SupervisionsPage";
import SupervisorsManagementPage from "./pages/supervisors/SupervisorsManagementPage";
import SupervisorAssignmentsPage from "./pages/supervisors/SupervisorAssignmentsPage";
import SupervisorsListsPage from "./pages/supervisors/SupervisorsListsPage";
import SummaryAssignmentsPage from "./pages/supervisors/SummaryAssignmentsPage";
import MasterSummariesPage from "./pages/mastersummaries/MasterSummariesPage";
import MasterSummaryDetailsPage from "./pages/mastersummaries/MasterSummaryDetailsPage";
import VersionManagementPage from "./pages/mastersummaries/VersionManagementPage";
import SpecialNeedsPage from "./pages/mastersummaries/SpecialNeedsPage";
import SpecialNeedDetailsPage from "./pages/mastersummaries/SpecialNeedDetailsPage";
import MasterSummaryOverviewPage from "./pages/mastersummaries/MasterSummaryOverviewPage";
import Subjects from "./pages/settings/Subjects";
import Examinations from "./pages/settings/Examinations";
import Regions from "./pages/settings/Regions";
import Districts from "./pages/settings/Districts";
import RegionalDistances from "./pages/settings/RegionalDistances";
import TransportGuidelines from "./pages/settings/TransportGuidelines";

// Security Module Pages
import SecurityOverview from "./pages/security/SecurityOverview";
import Users from "./pages/security/Users";
import UserProfile from "./pages/security/UserProfile";
import Roles from "./pages/security/Roles";
import Permissions from "./pages/security/Permissions";
import AuditLogs from "./pages/security/AuditLogs";

// Budget Module Pages
import BudgetsPage from "./pages/budgets/BudgetsPage";
import ActionPlanPage from "./pages/budgets/ActionPlanPage";
import RoutePlannerPage from "./pages/budgets/transportation/RoutePlannerPage";
import AISuggesterPage from "./pages/budgets/transportation/AISuggesterPage";
import TemplatePage from "./pages/budgets/TemplatePage";
import BudgetOverviewPage from "./pages/budgets/BudgetOverviewPage";
import BudgetSettingsPage from "./pages/budgets/BudgetSettingsPage";
import ParticipantsPage from "./pages/budgets/ParticipantsPage";
import AssignmentPage from "./pages/budgets/AssignmentPage";

// Stationeries Module Pages
import StationeriesPage from "./pages/stationeries/stationeries";
import StationeryReportsPage from "./pages/stationeries/StationeryReportsPage";
import StationerySummaryPage from "./pages/stationeries/StationerySummaryPage";
import LabelsManagementPage from "./pages/stationeries/LabelsManagementPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/portal/:jobId" element={<TeacherSubmissionPage />} />
            
            {/* Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="timetables" element={<Timetables />} />
              
                 {/* Master Summaries Routes */}
              <Route path="mastersummaries" element={<MasterSummariesPage />} />
              <Route path="mastersummaries/details/:id" element={<MasterSummaryDetailsPage />} />
              <Route path="mastersummaries/overview/:id" element={<MasterSummaryOverviewPage />} />
              <Route path="mastersummaries/version/:id" element={<VersionManagementPage />} />
              <Route path="mastersummaries/special-needs/:id" element={<SpecialNeedsPage />} />
              <Route path="mastersummaries/special-needs/:id/:specialNeedType/details" element={<SpecialNeedDetailsPage />} />
              <Route path="mastersummaries/:masterSummaryId/labels" element={<LabelsManagementPage />} />


               {/* Supervisors Routes */}
              <Route path="supervisors" element={<SupervisionsPage />} />
              <Route path="supervisors/supervisors-management" element={<SupervisorsManagementPage />} />
              <Route path="supervisors/supervisors-assignments/:id" element={<SupervisorAssignmentsPage />} />
              <Route path="supervisors/supervisors-lists/:id" element={<SupervisorsListsPage />} />
              <Route path="supervisors/supervisors-summary/:id" element={<SummaryAssignmentsPage />} />
             
              {/* Miscellaneous Routes */}
              <Route path="miscellaneous/jobs" element={<Teachers />} />
              <Route path="miscellaneous/jobs/assignments/:id" element={<JobAssignments />} />
              <Route path="miscellaneous/jobs/assign/:id" element={<AssignTeachers />} />
              <Route path="miscellaneous/jobs/teachers-management" element={<PrimaryTeachersManagementPage />} />

              {/* Security Routes */}
              <Route path="security" element={<SecurityOverview />} />
              <Route path="security/users" element={<Users />} />
              <Route path="security/users/:id" element={<UserProfile />} />
              <Route path="security/roles" element={<Roles />} />
              <Route path="security/permissions" element={<Permissions />} />
              <Route path="security/audit-logs" element={<AuditLogs />} />

               {/* Settings Routes */}
              <Route path="settings/subjects" element={<Subjects />} />
              <Route path="settings/examinations" element={<Examinations />} />
              <Route path="settings/regions" element={<Regions />} />
              <Route path="settings/districts" element={<Districts />} />
              <Route path="settings/regional-distances" element={<RegionalDistances />} />
              <Route path="settings/transport-guidelines" element={<TransportGuidelines />} />

              {/* Budget Module Routes */}
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="budgets/settings/:id" element={<BudgetSettingsPage />} />
              <Route path="budgets/participants" element={<ParticipantsPage />} />
              <Route path="budgets/overview/:id" element={<BudgetOverviewPage />} />
              <Route path="budgets/action-plan/:id" element={<ActionPlanPage />} />
              <Route path="budgets/transportation/route-planner/:id" element={<RoutePlannerPage />} />
              <Route path="budgets/transportation/ai-suggester/:id" element={<AISuggesterPage />} />
              <Route path="budgets/template/:id" element={<TemplatePage />} />
              <Route path="budgets/assignments/:id" element={<AssignmentPage />} />


               {/* Stationery Module Routes */}
               <Route path="stationeries" element={<StationeriesPage />} />
              <Route path="stationeries/reports/:masterSummaryId" element={<StationeryReportsPage />} />
              <Route path="stationeries/summary/:stationeryId" element={<StationerySummaryPage />} />


              {/* Add more routes as needed */}
              <Route path="*" element={<div className="p-4">Page under construction</div>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;