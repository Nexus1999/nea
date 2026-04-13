"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Index from './pages/Index';
import MasterSummariesPage from './pages/mastersummaries/MasterSummariesPage';
import MasterSummaryOverviewPage from './pages/mastersummaries/MasterSummaryOverviewPage';
import MasterSummaryDetailsPage from './pages/mastersummaries/MasterSummaryDetailsPage';
import SpecialNeedsPage from './pages/mastersummaries/SpecialNeedsPage';
import SpecialNeedDetailsPage from './pages/mastersummaries/SpecialNeedDetailsPage';
import VersionManagementPage from './pages/mastersummaries/VersionManagementPage';
import BudgetsPage from './pages/budgets/BudgetsPage';
import ActionPlanPage from './pages/budgets/transportation/ActionPlanPage';
import ImplementationPage from './pages/budgets/transportation/ImplementationPage';
import TemplatePage from './pages/budgets/TemplatePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Index />} />
          
          {/* Master Summaries */}
          <Route path="mastersummaries" element={<MasterSummariesPage />} />
          <Route path="mastersummaries/overview/:id" element={<MasterSummaryOverviewPage />} />
          <Route path="mastersummaries/details/:id" element={<MasterSummaryDetailsPage />} />
          <Route path="mastersummaries/special-needs/:id" element={<SpecialNeedsPage />} />
          <Route path="mastersummaries/special-needs/:id/:specialNeedType/details" element={<SpecialNeedDetailsPage />} />
          <Route path="mastersummaries/version/:id" element={<VersionManagementPage />} />
          
          {/* Budgets */}
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="budgets/template/:id" element={<TemplatePage />} />
          
          {/* Transportation Specific */}
          <Route path="budgets/transportation/action-plan/:id" element={<ActionPlanPage />} />
          <Route path="budgets/transportation/implementation/:id" element={<ImplementationPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;