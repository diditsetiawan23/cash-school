import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/date';
import toast from 'react-hot-toast';
import { auditService } from '../../services/auditService';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuditLog {
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

const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isLoading, setIsLoading] = useState(false);

  // Real data from API
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Load audit logs from API
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAuditLogs();
    }, 300); // Debounce search for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, actionFilter, tableFilter, userFilter, dateRange]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const response = await auditService.getAuditLogs({
        search: searchTerm,
        action_type: actionFilter === 'all' ? '' : actionFilter as 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT',
        table_name: tableFilter === 'all' ? '' : tableFilter,
        // Note: userFilter would need to be handled by user_id if we had that mapping
        // or extended in the API to support username filtering
      });
      
      setAuditLogs(response.items);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error(t('audit.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const actionOptions = [
    { value: 'all', label: t('audit.allActions') },
    { value: 'CREATE', label: t('audit.create') },
    { value: 'UPDATE', label: t('audit.update') },
    { value: 'DELETE', label: t('audit.delete') },
    { value: 'LOGIN', label: t('audit.login') },
    { value: 'LOGOUT', label: t('audit.logout') },
  ];

  const tableOptions = [
    { value: 'all', label: t('audit.allTables') },
    { value: 'financial_records', label: t('audit.transactions') },
    { value: 'users', label: t('audit.users') },
  ];

  // Generate user options dynamically from audit logs
  const userOptions = useMemo(() => {
    const uniqueUsers = new Map();
    
    // Add "All Users" option first
    uniqueUsers.set('all', { value: 'all', label: t('audit.allUsers') });
    
    // Extract unique users from audit logs
    auditLogs.forEach(log => {
      if (log.user && !uniqueUsers.has(log.user.username)) {
        uniqueUsers.set(log.user.username, {
          value: log.user.username,
          label: `${log.user.full_name} (${log.user.username})`
        });
      }
    });
    
    return Array.from(uniqueUsers.values());
  }, [auditLogs, t]);

  const dateRangeOptions = [
    { value: 'all', label: t('audit.allTime') },
    { value: 'today', label: t('audit.today') },
    { value: 'week', label: t('audit.thisWeek') },
    { value: 'month', label: t('audit.thisMonth') },
  ];

  // Filtered and sorted audit logs
  const filteredLogs = useMemo(() => {
    let filtered = auditLogs.filter(log => {
      const matchesSearch = 
        (log.user?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.table_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.ip_address || '').includes(searchTerm);
      
      const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
      const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
      const matchesUser = userFilter === 'all' || (log.user?.username || '') === userFilter;
      
      // Date filtering
      let matchesDate = true;
      if (dateRange !== 'all') {
        const logDate = new Date(log.created_at);
        const now = new Date();
        
        switch (dateRange) {
          case 'today':
            matchesDate = logDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesAction && matchesTable && matchesUser && matchesDate;
    });

    // Sort logs
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof AuditLog];
      let bValue: any = b[sortBy as keyof AuditLog];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [auditLogs, searchTerm, actionFilter, tableFilter, userFilter, dateRange, sortBy, sortDirection]);

  // Transform logs for table display (flatten user.username to username)
  const tableData = useMemo(() => {
    return filteredLogs.map(log => ({
      ...log,
      username: log.user?.username || 'Unknown'
    }));
  }, [filteredLogs]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalLogs = auditLogs.length;
    const todayLogs = auditLogs.filter(log => {
      const logDate = new Date(log.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length;
    const loginCount = auditLogs.filter(log => log.action_type === 'LOGIN').length;
    const crudCount = auditLogs.filter(log => ['CREATE', 'UPDATE', 'DELETE'].includes(log.action_type)).length;
    
    return { totalLogs, todayLogs, loginCount, crudCount };
  }, [auditLogs]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  const openDetailModal = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <PlusIcon className="h-4 w-4" />;
      case 'UPDATE':
        return <PencilIcon className="h-4 w-4" />;
      case 'DELETE':
        return <TrashIcon className="h-4 w-4" />;
      case 'LOGIN':
        return <ArrowRightOnRectangleIcon className="h-4 w-4" />;
      case 'LOGOUT':
        return <ArrowRightOnRectangleIcon className="h-4 w-4 rotate-180" />;
      default:
        return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const csvData = filteredLogs.map(log => ({
      Timestamp: log.created_at,
      User: log.user?.username || 'Unknown',
      Action: log.action_type,
      Table: log.table_name,
      'Record ID': log.record_id || '',
      'IP Address': log.ip_address,
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(t('audit.exportSuccess'));
  };

  // Show access denied for non-admin users
  if (user?.role !== 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('audit.accessDenied')}</h2>
        <p className="text-gray-600">{t('audit.adminPrivilegesRequired')}</p>
      </motion.div>
    );
  }

  const columns = [
    {
      key: 'created_at',
      label: t('audit.timestamp'),
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm">{formatDate(value)}</span>
        </div>
      ),
    },
    {
      key: 'username',
      label: t('audit.user'),
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'action_type',
      label: t('audit.action'),
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(value)}`}>
          {getActionIcon(value)}
          <span className="ml-1">{value}</span>
        </span>
      ),
    },
    {
      key: 'table_name',
      label: t('audit.table'),
      sortable: true,
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <DocumentTextIcon className="h-3 w-3 mr-1" />
          {value}
        </span>
      ),
    },
    {
      key: 'record_id',
      label: t('audit.recordId'),
      sortable: true,
      render: (value: number | undefined) => value || '-',
    },
    {
      key: 'ip_address',
      label: t('audit.ipAddress'),
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono">{value}</span>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (_: any, row: AuditLog) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetailModal(row)}
          leftIcon={<EyeIcon className="h-4 w-4" />}
        >
          {t('audit.viewDetails')}
        </Button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
          <p className="text-gray-600 mt-1">{t('audit.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
          onClick={handleExport}
        >
          {t('audit.export')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-blue-600 text-sm font-medium">{t('audit.totalLogs')}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalLogs}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-green-600 text-sm font-medium">{t('audit.todaysActivity')}</p>
              <p className="text-2xl font-bold text-green-900">{stats.todayLogs}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowRightOnRectangleIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-purple-600 text-sm font-medium">{t('audit.loginEvents')}</p>
              <p className="text-2xl font-bold text-purple-900">{stats.loginCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <PencilIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-orange-600 text-sm font-medium">{t('audit.dataChangesCount')}</p>
              <p className="text-2xl font-bold text-orange-900">{stats.crudCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-1">
            <Input
              placeholder={t('audit.searchLogs')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <Select
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <Select
            options={tableOptions}
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
          <Select
            options={userOptions}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
          <Select
            options={dateRangeOptions}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table
          columns={columns}
          data={tableData}
          onSort={handleSort}
          sortBy={sortBy}
          sortDirection={sortDirection}
          emptyMessage={t('audit.noLogs')}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLog(null);
        }}
        title={t('audit.logDetails')}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.user')}</label>
                <p className="text-sm text-gray-900">{selectedLog.user?.username || t('audit.unknown')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.action')}</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(selectedLog.action_type)}`}>
                  {getActionIcon(selectedLog.action_type)}
                  <span className="ml-1">{selectedLog.action_type}</span>
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.table')}</label>
                <p className="text-sm text-gray-900">{selectedLog.table_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.recordId')}</label>
                <p className="text-sm text-gray-900">{selectedLog.record_id || t('audit.never')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.ipAddress')}</label>
                <p className="text-sm text-gray-900 font-mono">{selectedLog.ip_address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.timestamp')}</label>
                <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
              </div>
            </div>

            {/* User Agent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('audit.userAgent')}</label>
              <p className="text-sm text-gray-900 break-all">{selectedLog.user_agent}</p>
            </div>

            {/* Changes */}
            {(selectedLog.old_values || selectedLog.new_values) && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('audit.dataChanges')}</h3>
                
                {selectedLog.old_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('audit.oldValues')}</label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <pre className="text-sm text-red-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedLog.new_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('audit.newValues')}</label>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <pre className="text-sm text-green-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedLog(null);
                }}
              >
                {t('audit.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default AuditLogsPage;
