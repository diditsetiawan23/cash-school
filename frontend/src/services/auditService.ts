import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Configure axios with interceptors for auth
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user: User;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  table_name: string;
  record_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AuditLogFilters {
  page?: number;
  per_page?: number;
  action_type?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | '';
  table_name?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// API functions
export const auditService = {
  // Get all audit logs with filters
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogListResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/audit-logs?${params.toString()}`);
    return response.data;
  },

  // Get audit log by ID
  // Get audit log by ID
  getAuditLog: async (id: number): Promise<AuditLog> => {
    const response = await api.get(`/api/audit-logs/${id}`);
    return response.data;
  },
};
