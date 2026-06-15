import api from './axios';

// ─── Records ─────────────────────────────────────────────────────────────────
export const recordsApi = {
  getAll: (params) => api.get('/records', { params }),
  getById: (id) => api.get(`/records/${id}`),
  create: (data) => api.post('/records', data),
  update: (id, data) => api.put(`/records/${id}`, data),
  changeStatus: (id, status) => api.patch(`/records/${id}/status`, { status }),
  delete: (id) => api.delete(`/records/${id}`)
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
  getPatients: () => api.get('/users/patients'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  changeStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
  changePassword: (id, newPassword) => api.patch(`/users/${id}/password`, { newPassword })
};

// ─── Audit ───────────────────────────────────────────────────────────────────
export const auditApi = {
  getAll: (params) => api.get('/audit', { params }),
  getStats: () => api.get('/audit/stats')
};
