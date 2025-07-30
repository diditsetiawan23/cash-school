import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import type { TransactionFilters, TransactionCreate, TransactionUpdate } from '../services/transactionService';
import toast from 'react-hot-toast';
// import { useTranslation } from 'react-i18next';

// Query keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  balance: () => [...transactionKeys.all, 'balance'] as const,
};

// Hooks
export const useTransactions = (filters: TransactionFilters = {}) => {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => transactionService.getTransactions(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTransaction = (id: number) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionService.getTransaction(id),
    enabled: !!id,
  });
};

export const useBalance = () => {
  return useQuery({
    queryKey: transactionKeys.balance(),
    queryFn: () => transactionService.getBalance(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  // const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: TransactionCreate) => transactionService.createTransaction(data),
    onSuccess: () => {
      // Invalidate and refetch transactions and balance
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.balance() });
      toast.success('Transaction added successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'An error occurred';
      toast.error(message);
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  // const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionUpdate }) =>
      transactionService.updateTransaction(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.balance() });
      toast.success('Transaction updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'An error occurred';
      toast.error(message);
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  // const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.balance() });
      toast.success('Transaction deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'An error occurred';
      toast.error(message);
    },
  });
};
