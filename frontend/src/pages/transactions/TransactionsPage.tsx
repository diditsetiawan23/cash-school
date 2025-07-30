import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import toast from 'react-hot-toast';
import { transactionService } from '../../services/transactionService';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  created_by: string;
  created_at: string;
}

const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'credit' as 'credit' | 'debit',
  });

  // Real data from API
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState({
    credits: 0,
    debits: 0,
    balance: 0,
  });

  // Add debounced search handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTransactions();
    }, 300); // Debounce search for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, typeFilter, startDate, endDate]);

  // Load transactions from API
  useEffect(() => {
    loadTransactions();
    loadBalance();
  }, [sortBy, sortDirection]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await transactionService.getTransactions({
        search: searchTerm,
        transaction_type: typeFilter === 'all' ? '' : typeFilter as 'credit' | 'debit',
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_by: sortBy,
        sort_direction: sortDirection,
        per_page: 100, // Load all for now
      });
      
      // Transform API data to component format
      const transformedTransactions = response.items.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.transaction_type,
        date: t.created_at.split('T')[0],
        created_by: t.created_by_user?.username || 'Unknown',
        created_at: t.created_at,
      }));
      
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await transactionService.getBalance();
      setBalance({
        credits: response.total_credits,
        debits: response.total_debits,
        balance: response.balance,
      });
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const typeOptions = [
    { value: 'all', label: t('common.all') + ' ' + t('transactions.transactionType') },
    { value: 'credit', label: t('transactions.credit') + ' (' + t('transactions.income') + ')' },
    { value: 'debit', label: t('transactions.debit') + ' (' + t('transactions.expense') + ')' },
  ];

  const transactionTypeOptions = [
    { value: 'credit', label: t('transactions.credit') + ' (' + t('transactions.income') + ')' },
    { value: 'debit', label: t('transactions.debit') + ' (' + t('transactions.expense') + ')' },
  ];

  // Transactions are filtered on the server side now
  const filteredTransactions = transactions;

  // Calculate totals from balance API
  const totals = balance;

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
    // API call will be triggered by useEffect
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const resetForm = () => {
    setFormData({ description: '', amount: '', type: 'credit' });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditModalOpen && selectedTransaction) {
        // Update existing transaction
        await transactionService.updateTransaction(selectedTransaction.id, {
          description: formData.description,
          amount: parseFloat(formData.amount),
          transaction_type: formData.type,
        });
        toast.success('Transaction updated successfully');
        setIsEditModalOpen(false);
      } else {
        // Create new transaction
        await transactionService.createTransaction({
          description: formData.description,
          amount: parseFloat(formData.amount),
          transaction_type: formData.type,
        });
        toast.success('Transaction added successfully');
        setIsAddModalOpen(false);
      }

      resetForm();
      loadTransactions();
      loadBalance();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    setIsSubmitting(true);

    try {
      await transactionService.deleteTransaction(selectedTransaction.id);
      toast.success('Transaction deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
      loadTransactions();
      loadBalance();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      // Get current balance to calculate proper starting balance
      const currentBalance = balance.balance;
      
      // Sort transactions by date for proper balance calculation
      const sortedTransactions = [...filteredTransactions].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Calculate starting balance by working backwards from current balance
      let startingBalance = currentBalance;
      sortedTransactions.slice().reverse().forEach(transaction => {
        if (transaction.type === 'credit') {
          startingBalance -= parseFloat(transaction.amount.toString());
        } else {
          startingBalance += parseFloat(transaction.amount.toString());
        }
      });

      // Get translated strings
      const dateLabel = t('transactions.date');
      const descriptionLabel = t('transactions.description');
      const debitLabel = t('transactions.debit');
      const creditLabel = t('transactions.credit');
      const balanceLabel = t('transactions.balance');
      const createdByLabel = t('transactions.createdBy');
      const openingBalanceText = t('transactions.openingBalance') || 'Opening Balance';
      const closingBalanceText = t('transactions.closingBalance') || 'Closing Balance';

      // Now calculate running balance forward from starting balance
      let runningBalance = startingBalance;
      const excelData = sortedTransactions.map(transaction => {
        const debitAmount = transaction.type === 'debit' ? parseFloat(transaction.amount.toString()) : '';
        const creditAmount = transaction.type === 'credit' ? parseFloat(transaction.amount.toString()) : '';
        
        // Update running balance (credits add, debits subtract) - ensure numeric calculation
        if (transaction.type === 'credit') {
          runningBalance = parseFloat(runningBalance.toString()) + parseFloat(transaction.amount.toString());
        } else {
          runningBalance = parseFloat(runningBalance.toString()) - parseFloat(transaction.amount.toString());
        }

        return {
          [dateLabel]: transaction.date,
          [descriptionLabel]: transaction.description,
          [debitLabel]: debitAmount,
          [creditLabel]: creditAmount,
          [balanceLabel]: parseFloat(runningBalance.toString()),
          [createdByLabel]: transaction.created_by,
        };
      });

      // Add opening balance row at the beginning
      const openingBalanceRow = {
        [dateLabel]: '',
        [descriptionLabel]: openingBalanceText,
        [debitLabel]: '',
        [creditLabel]: '',
        [balanceLabel]: parseFloat(startingBalance.toString()),
        [createdByLabel]: '',
      };

      // Add closing balance row at the end
      const closingBalanceRow = {
        [dateLabel]: '',
        [descriptionLabel]: closingBalanceText,
        [debitLabel]: '',
        [creditLabel]: '',
        [balanceLabel]: parseFloat(currentBalance.toString()),
        [createdByLabel]: '',
      };

      const finalExcelData = [openingBalanceRow, ...excelData, closingBalanceRow];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(finalExcelData);

      // Set column widths for bank statement style
      const columnWidths = [
        { wch: 12 }, // Date
        { wch: 30 }, // Description
        { wch: 15 }, // Debit
        { wch: 15 }, // Credit
        { wch: 15 }, // Balance
        { wch: 20 }, // Created By
      ];
      worksheet['!cols'] = columnWidths;

      // Add some styling by setting number format for amount columns
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let row = 1; row <= range.e.r; row++) {
        // Format debit column (column C)
        const debitCell = XLSX.utils.encode_cell({ r: row, c: 2 });
        if (worksheet[debitCell] && worksheet[debitCell].v !== '') {
          worksheet[debitCell].z = '#,##0.00';
        }
        
        // Format credit column (column D)  
        const creditCell = XLSX.utils.encode_cell({ r: row, c: 3 });
        if (worksheet[creditCell] && worksheet[creditCell].v !== '') {
          worksheet[creditCell].z = '#,##0.00';
        }
        
        // Format balance column (column E)
        const balanceCell = XLSX.utils.encode_cell({ r: row, c: 4 });
        if (worksheet[balanceCell]) {
          worksheet[balanceCell].z = '#,##0.00';
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, t('transactions.bankStatement'));

      // Generate filename with current date
      const filename = `export_transaction_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);
      
      toast.success(t('transactions.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const columns = [
    {
      key: 'date',
      label: t('transactions.date'),
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'description',
      label: t('transactions.description'),
      sortable: true,
    },
    {
      key: 'type',
      label: t('transactions.transactionType'),
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'credit' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value === 'credit' ? (
            <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
          ) : (
            <MinusIcon className="h-3 w-3 mr-1" />
          )}
          {value === 'credit' ? t('transactions.credit') : t('transactions.debit')}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('transactions.amount'),
      sortable: true,
      align: 'right' as const,
      render: (value: number, row: Transaction) => (
        <span className={`font-semibold ${
          row.type === 'credit' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'created_by',
      label: t('transactions.createdBy'),
      sortable: true,
    },
    ...(user?.role === 'admin' ? [{
      key: 'actions',
      label: t('common.actions'),
      render: (_: any, row: Transaction) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            leftIcon={<PencilIcon className="h-4 w-4" />}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(row)}
            leftIcon={<TrashIcon className="h-4 w-4" />}
            className="text-red-600 hover:text-red-700"
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    }] : []),
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
          <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
          <p className="text-gray-600 mt-1">{t('transactions.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleExport}
          >
            {t('transactions.export')}
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="primary"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={openAddModal}
            >
              {t('transactions.addTransaction')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-green-600 text-sm font-medium">{t('dashboard.totalIncome')}</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.credits)}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <MinusIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-red-600 text-sm font-medium">{t('dashboard.totalExpense')}</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totals.debits)}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-blue-600 text-sm font-medium">{t('transactions.balance')}</p>
              <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <Input
              placeholder={t('transactions.searchTransactions')}
              value={searchTerm}
              onChange={handleSearchChange}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={handleTypeFilterChange}
            />
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading transactions...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredTransactions}
            onSort={handleSort}
            sortBy={sortBy}
            sortDirection={sortDirection}
            emptyMessage="No transactions found"
          />
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isEditModalOpen ? t('transactions.editTransaction') : t('transactions.addTransaction')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('transactions.transactionType')}
            options={transactionTypeOptions}
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'credit' | 'debit' }))}
            required
          />
          <Input
            label={t('transactions.amount') + ' (Rp)'}
            type="number"
            placeholder={t('transactions.amount')}
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            leftIcon={<span className="text-gray-500">Rp</span>}
            required
          />
          <Input
            label={t('transactions.description')}
            type="text"
            placeholder={t('transactions.description')}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            required
          />
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isEditModalOpen ? t('common.loading') : t('common.loading')) 
                : (isEditModalOpen ? t('common.save') : t('common.add'))
              }
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTransaction(null);
        }}
        title="Delete Transaction"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
          {selectedTransaction && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{selectedTransaction.description}</p>
              <p className="text-sm text-gray-600">
                {selectedTransaction.type === 'credit' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
              </p>
            </div>
          )}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedTransaction(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              onClick={handleDelete}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default TransactionsPage;
