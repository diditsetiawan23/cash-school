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
export interface Transaction {
  id: number;
  amount: number;
  description: string;
  transaction_type: 'credit' | 'debit';
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  created_by_user: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface TransactionCreate {
  amount: number;
  description: string;
  transaction_type: 'credit' | 'debit';
}

export interface TransactionUpdate {
  amount?: number;
  description?: string;
  transaction_type?: 'credit' | 'debit';
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface BalanceResponse {
  balance: number;
  total_credits: number;
  total_debits: number;
}

export interface TransactionFilters {
  page?: number;
  per_page?: number;
  transaction_type?: 'credit' | 'debit' | '';
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// API functions
export const transactionService = {
  // Get all transactions with filters
  getTransactions: async (filters: TransactionFilters = {}): Promise<TransactionListResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/transactions?${params.toString()}`);
    return response.data;
  },

  // Get transaction by ID
  getTransaction: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/api/transactions/${id}`);
    return response.data;
  },

  // Create transaction
  createTransaction: async (data: TransactionCreate): Promise<Transaction> => {
    const response = await api.post('/api/transactions', data);
    return response.data;
  },

  // Update transaction
  updateTransaction: async (id: number, data: TransactionUpdate): Promise<Transaction> => {
    const response = await api.put(`/api/transactions/${id}`, data);
    return response.data;
  },

  // Delete transaction
  deleteTransaction: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/transactions/${id}`);
    return response.data;
  },

  // Get balance
  getBalance: async (): Promise<BalanceResponse> => {
    const response = await api.get('/api/transactions/balance');
    return response.data;
  },
};
