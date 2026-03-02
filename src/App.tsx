import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import MasterSummaries from "./pages/mastersummaries/Index";
import MasterSummaryDetails from "./pages/mastersummaries/Details";
import MasterSummaryOverview from "./pages/mastersummaries/Overview";
import MasterSummaryVersion from "./pages/mastersummaries/Version";
import SpecialNeeds from "./pages/mastersummaries/SpecialNeeds";
import SpecialNeedsDetails from "./pages/mastersummaries/SpecialNeedsDetails";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          
          {/* Master Summaries Routes */}
          <Route path="mastersummaries" element={<MasterSummaries />} />
          <Route path="mastersummaries/details/:id" element={<MasterSummaryDetails />} />
          <Route path="mastersummaries/overview/:id" element={<MasterSummaryOverview />} />
          <Route path="mastersummaries/version/:id" element={<MasterSummaryVersion />} />
          <Route path="mastersummaries/special-needs/:id" element={<SpecialNeeds />} />
          <Route path="mastersummaries/special-needs/:id/:code/details" element={<SpecialNeedsDetails />} />
          
          {/* Other routes... */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;