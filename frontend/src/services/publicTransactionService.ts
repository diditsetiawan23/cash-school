import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Configure axios without auth interceptors for public access
const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

// Types (matching backend schemas)
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

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TransactionFilters {
  page?: number;
  per_page?: number;
  transaction_type?: 'credit' | 'debit' | '';
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface BalanceResponse {
  balance: number;
  total_credits: number;
  total_debits: number;
}

// Public API functions
export const publicTransactionService = {
  // Get transactions without authentication
  getTransactions: async (filters: TransactionFilters = {}): Promise<TransactionListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const response = await publicApi.get(`/api/public/transactions?${params}`);
    return response.data;
  },

  // Get balance without authentication
  getBalance: async (): Promise<BalanceResponse> => {
    const response = await publicApi.get('/api/public/balance');
    return response.data;
  },
};
