// Central API service layer — all fetch calls go through here
import { api } from '../lib/axios';

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Regions ───────────────────────────────────────────────────────────────────
export const regionsService = {
  list: (params?: { page?: number; limit?: number; search?: string }) => api.get('/regions', { params }),
  all: () => api.get('/regions/all'),
  create: (data: { regionCode: number; regionName: string; town?: string }) => api.post('/regions', data),
  update: (id: number, data: { regionCode: number; regionName: string; town?: string }) => api.put(`/regions/${id}`, data),
  delete: (id: number) => api.delete(`/regions/${id}`),
};

// ── Districts ─────────────────────────────────────────────────────────────────
export const districtsService = {
  list: (params?: { page?: number; limit?: number; search?: string; regionId?: number }) => api.get('/districts', { params }),
  all: (regionId?: number) => api.get('/districts/all', { params: { regionId } }),
  create: (data: any) => api.post('/districts', data),
  update: (id: number, data: any) => api.put(`/districts/${id}`, data),
  delete: (id: number) => api.delete(`/districts/${id}`),
};

// ── Examinations ──────────────────────────────────────────────────────────────
export const examinationsService = {
  list: () => api.get('/examinations'),
  create: (data: any) => api.post('/examinations', data),
  update: (id: number, data: any) => api.put(`/examinations/${id}`, data),
  delete: (id: number) => api.delete(`/examinations/${id}`),
  getSubjects: (code: string) => api.get(`/examinations/${code}/subjects`),
  createSubject: (code: string, data: any) => api.post(`/examinations/${code}/subjects`, data),
  deleteSubject: (id: number) => api.delete(`/examinations/subjects/${id}`),
};

// ── Security ──────────────────────────────────────────────────────────────────
export const securityService = {
  getUsers: (params?: { page?: number; limit?: number }) => api.get('/security/users', { params }),
  getUser: (id: string) => api.get(`/security/users/${id}`),
  createUser: (data: any) => api.post('/security/users', data),
  updateUser: (id: string, data: any) => api.put(`/security/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) => api.put(`/security/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id: string) => api.delete(`/security/users/${id}`),
  getRoles: () => api.get('/security/roles'),
  createRole: (data: any) => api.post('/security/roles', data),
  updateRole: (id: string, data: any) => api.put(`/security/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/security/roles/${id}`),
  updateRolePermissions: (roleId: string, permissionIds: string[]) => api.put(`/security/roles/${roleId}/permissions`, { permissionIds }),
  getPermissions: () => api.get('/security/permissions'),
  createPermission: (data: any) => api.post('/security/permissions', data),
  updatePermission: (id: string, data: any) => api.put(`/security/permissions/${id}`, data),
  deletePermission: (id: string) => api.delete(`/security/permissions/${id}`),
  getSessions: (params?: { userId?: string }) => api.get('/security/sessions', { params }),
  deleteSession: (id: string) => api.delete(`/security/sessions/${id}`),
  getRolePermissions: () => api.get('/security/role-permissions'),
};

// ── Master Summaries ──────────────────────────────────────────────────────────
export const masterSummariesService = {
  list: (params?: { page?: number; limit?: number; code?: string; year?: number }) => api.get('/master-summaries', { params }),
  get: (id: number, params?: { page?: number; limit?: number }) => api.get(`/master-summaries/${id}`, { params }),
  create: (data: any) => api.post('/master-summaries', data),
  delete: (id: number) => api.delete(`/master-summaries/${id}`),
  bulkImportDetails: (id: number, rows: any[]) => api.post(`/master-summaries/${id}/details/bulk`, { rows }),
};

// ── Supervisors ───────────────────────────────────────────────────────────────
export const supervisorsService = {
  list: (params?: { page?: number; limit?: number; search?: string; regionId?: number }) => api.get('/supervisors', { params }),
  create: (data: any) => api.post('/supervisors', data),
  update: (id: number, data: any) => api.put(`/supervisors/${id}`, data),
  delete: (id: number) => api.delete(`/supervisors/${id}`),
  bulkImport: (rows: any[]) => api.post('/supervisors/bulk', { rows }),
};

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teachersService = {
  list: (params?: { page?: number; limit?: number; search?: string; regionId?: number }) => api.get('/teachers', { params }),
  create: (data: any) => api.post('/teachers', data),
  update: (id: number, data: any) => api.put(`/teachers/${id}`, data),
  delete: (id: number) => api.delete(`/teachers/${id}`),
  bulkImport: (rows: any[]) => api.post('/teachers/bulk', { rows }),
  getJobs: () => api.get('/teachers/jobs'),
  createJob: (data: any) => api.post('/teachers/jobs', data),
  assignTeachers: (jobId: string, teacherIds: number[]) => api.put(`/teachers/jobs/${jobId}/assign`, { teacherIds }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsService = {
  list: () => api.get('/budgets'),
  get: (id: string) => api.get(`/budgets/${id}`),
  create: (data: any) => api.post('/budgets', data),
  updateParticipants: (id: string, participants: any[]) => api.put(`/budgets/${id}/participants`, { participants }),
  updateDemands: (id: string, demands: any[]) => api.put(`/budgets/${id}/demands`, { demands }),
  createRoute: (id: string, data: any) => api.post(`/budgets/${id}/routes`, data),
  getRoute: (routeId: string) => api.get(`/budgets/routes/${routeId}`),
  updateRates: (id: string, data: any) => api.put(`/budgets/${id}/rates`, data),
};

// ── Stationeries ──────────────────────────────────────────────────────────────
export const stationeriesService = {
  list: () => api.get('/stationeries'),
  get: (id: number) => api.get(`/stationeries/${id}`),
  create: (data: any) => api.post('/stationeries', data),
  updateConfig: (id: number, data: any) => api.put(`/stationeries/${id}/config`, data),
  updateStatus: (id: number, status: string) => api.put(`/stationeries/${id}/status`, { status }),
};
