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
  role: 'admin' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserCreate {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: 'admin' | 'viewer';
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  password?: string;
  role?: 'admin' | 'viewer';
  is_active?: boolean;
}

export interface UserFilters {
  role?: 'admin' | 'viewer' | '';
  is_active?: boolean | '';
  search?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// API functions
export const userService = {
  // Get all users
  getUsers: async (filters: UserFilters = {}): Promise<User[]> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/users?${params.toString()}`);
    return response.data;
  },

  // Get user by ID
  getUser: async (id: number): Promise<User> => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  // Create user
  createUser: async (data: UserCreate): Promise<User> => {
    const response = await api.post('/api/users', data);
    return response.data;
  },

  // Update user
  updateUser: async (id: number, data: UserUpdate): Promise<User> => {
    const response = await api.put(`/api/users/${id}`, data);
    return response.data;
  },

  // Delete user
  deleteUser: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },

  // Change password
  changePassword: async (data: PasswordChangeRequest): Promise<{ message: string }> => {
    const response = await api.put('/api/auth/change-password', data);
    return response.data;
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Update current user profile
  updateProfile: async (data: Partial<UserUpdate>): Promise<User> => {
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  },
};
