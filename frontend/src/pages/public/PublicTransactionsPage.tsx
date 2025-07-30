import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  BanknotesIcon,
  EyeIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { publicTransactionService } from '../../services/publicTransactionService';
import type { Transaction as ServiceTransaction } from '../../services/publicTransactionService';

const PublicTransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [transactions, setTransactions] = useState<ServiceTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 20; // Show 20 transactions per page
  
  // Calculate totals
  const totalCredit = transactions.reduce((sum, t) => t.transaction_type === 'credit' ? sum + t.amount : sum, 0);
  const totalDebit = transactions.reduce((sum, t) => t.transaction_type === 'debit' ? sum + t.amount : sum, 0);
  const balance = totalCredit - totalDebit;

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, typeFilter, startDate, endDate, currentPage]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: searchTerm,
        transaction_type: typeFilter === 'all' ? '' as const : typeFilter as 'credit' | 'debit',
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: currentPage,
        per_page: perPage,
      };
      
      const response = await publicTransactionService.getTransactions(filters);
      setTransactions(response.items);
      setTotalPages(response.pages);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const typeOptions = [
    { value: 'all', label: t('transactions.allTypes') },
    { value: 'credit', label: t('transactions.credit') },
    { value: 'debit', label: t('transactions.debit') },
  ];

  const columns = [
    {
      key: 'created_at',
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
      key: 'transaction_type',
      label: t('transactions.transactionType'),
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          value === 'credit' 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-100 text-rose-800 border border-rose-200'
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
      render: (value: number, row: ServiceTransaction) => (
        <span className={`font-semibold text-lg ${
          row.transaction_type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {row.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(value)}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3">
                    <BanknotesIcon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <EyeIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                </div>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Aplikasi Kas Kelas
              </h1>
              <p className="text-gray-600 text-xl mb-2">Transparansi Keuangan Kelas</p>
              <p className="text-gray-500 text-lg mb-8">Pantau semua transaksi keuangan secara real-time</p>
              
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                      <p className="text-2xl font-bold text-emerald-600">+{formatCurrency(totalCredit)}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                      <p className="text-2xl font-bold text-rose-600">-{formatCurrency(totalDebit)}</p>
                    </div>
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                      <MinusIcon className="h-6 w-6 text-rose-600" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Saat Ini</p>
                      <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <CurrencyDollarIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          {/* Filters */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex-1">
                <Input
                  placeholder={t('transactions.searchTransactions')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                  className="bg-white/80"
                />
              </div>
              <div className="w-full lg:w-48">
                <Select
                  options={typeOptions}
                  value={typeFilter}
                  onChange={handleTypeFilterChange}
                  className="bg-white/80"
                />
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="relative z-50"
          >
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
            />
          </motion.div>

          {/* Transactions Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden shadow-lg"
          >
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-gray-600 text-lg">Memuat data transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <ChartBarIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg">Belum ada transaksi</p>
                <p className="text-gray-500 text-sm mt-2">Data transaksi akan muncul di sini</p>
              </div>
            ) : (
              <Table
                columns={columns}
                data={transactions}
                onSort={handleSort}
                sortBy={sortBy}
                sortDirection={sortDirection}
                emptyMessage="Tidak ada transaksi ditemukan"
              />
            )}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Menampilkan {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalItems)} dari {totalItems} transaksi
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sebelumnya
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center py-6"
          >
            <p className="text-gray-500 text-sm">
              Halaman ini menampilkan semua transaksi keuangan kelas secara transparan
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Data diperbarui secara real-time
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicTransactionsPage;
