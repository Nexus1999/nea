import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import Login from "./pages/Login";
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
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
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

               {/* Supervisors Routes */}
              <Route path="supervisors" element={<SupervisionsPage />} />
              <Route path="supervisors/supervisors-management" element={<SupervisorsManagementPage />} />

              
              {/* Miscellaneous Routes */}
              <Route path="miscellaneous/jobs" element={<Teachers />} />
              <Route path="miscellaneous/jobs/assignments/:id" element={<JobAssignments />} />
              <Route path="miscellaneous/jobs/assign/:id" element={<AssignTeachers />} />
              <Route path="miscellaneous/jobs/teachers-management" element={<PrimaryTeachersManagementPage />} />
              
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