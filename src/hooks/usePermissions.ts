"use client";

import { useAuth } from "@/providers/AuthProvider";

export const usePermissions = () => {
  const { permissions, hasPermission, refreshPermissions } = useAuth();

  return {
    permissions,
    hasPermission,
    refreshPermissions,
    isAdmin: permissions.includes('ADMINISTRATOR')
  };
};