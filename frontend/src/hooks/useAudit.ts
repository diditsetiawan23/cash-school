import { useQuery, useMutation } from '@tanstack/react-query';
import { auditService } from '../services/auditService';
import type { AuditLogFilters } from '../services/auditService';
import toast from 'react-hot-toast';

// Query keys
export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditKeys.lists(), filters] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: number) => [...auditKeys.details(), id] as const,
};

// Hooks
export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => auditService.getAuditLogs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAuditLog = (id: number) => {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => auditService.getAuditLog(id),
    enabled: !!id,
  });
};

export const useExportAuditLogs = () => {
  return useMutation({
    mutationFn: (filters: AuditLogFilters) => auditService.exportAuditLogs(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Audit logs exported successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to export audit logs';
      toast.error(message);
    },
  });
};
