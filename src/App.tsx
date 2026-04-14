"use client";

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import BudgetsPage from './pages/budgets/BudgetsPage';
import ActionPlanPage from './pages/budgets/transportation/ActionPlanPage';
import TemplatePage from './pages/budgets/transportation/TemplatePage';
// ... other imports

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/budgets" replace />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="budgets/transportation/action-plan/:id" element={<ActionPlanPage />} />
        <Route path="budgets/transportation/template/:id" element={<TemplatePage />} />
        {/* ... other routes */}
      </Route>
      <Route path="*" element={<Navigate to="/dashboard/budgets" replace />} />
    </Routes>
  );
}

export default App;