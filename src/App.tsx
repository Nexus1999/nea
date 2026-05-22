"use client";

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './pages/DashboardLayout';
import SecurityOverview from './pages/security/SecurityOverview';
import Users from './pages/security/Users';
import UserProfile from './pages/security/UserProfile';
import Roles from './pages/security/Roles';
import Permissions from './pages/security/Permissions';
import Sessions from './pages/security/Sessions';
import AuditLogs from './pages/security/AuditLogs';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/security" replace />} />
        
        {/* Security Module Routes */}
        <Route path="security" element={<SecurityOverview />} />
        <Route path="security/users" element={<Users />} />
        <Route path="security/users/:id" element={<UserProfile />} />
        <Route path="security/roles" element={<Roles />} />
        <Route path="security/permissions" element={<Permissions />} />
        <Route path="security/sessions" element={<Sessions />} />
        <Route path="security/audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}

export default App;