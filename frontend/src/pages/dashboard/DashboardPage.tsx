import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CreditCardIcon, 
  BanknotesIcon, 
  ArrowTrendingUpIcon,
  ClockIcon,
  MinusIcon,
  EyeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TrendChart from '../../components/ui/TrendChart';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';
import { transactionService } from '../../services/transactionService';
import { userService } from '../../services/userService';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'danger' | 'gray';
  trend?: { value: number; isPositive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-600 border-blue-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    danger: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend.isPositive ? '↗' : '↘'}</span>
              <span className="ml-1">{trend.value}% from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Real data from API
  const [stats, setStats] = useState({
    balance: 0,
    totalCredits: 0,
    totalDebits: 0,
    transactionCount: 0,
    userCount: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{
    date: string;
    totalCash: number;
    credit: number;
    debit: number;
  }[]>([]);

  // Load dashboard data
  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadDashboardData();
    }
  }, [user, startDate, endDate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load balance
      const balanceResponse = await transactionService.getBalance();
      
      // Load recent transactions with date filtering
      const transactionsResponse = await transactionService.getTransactions({
        per_page: 10,
        sort_by: 'created_at',
        sort_direction: 'desc',
        start_date: startDate,
        end_date: endDate,
      });
      
      // Load user count (approximate) - only for admin users
      let userCount = 0;
      try {
        if (user && user.role === 'admin') {
          const usersResponse = await userService.getUsers({});
          userCount = usersResponse.length;
        }
      } catch (error) {
        console.warn('Could not load user count (non-admin user):', error);
        // Non-admin users can't access user list, that's fine
      }
      
      setStats({
        balance: balanceResponse.balance,
        totalCredits: balanceResponse.total_credits,
        totalDebits: balanceResponse.total_debits,
        transactionCount: transactionsResponse.total,
        userCount: userCount,
      });

      // Transform transactions for display
      const transformedTransactions = transactionsResponse.items.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.transaction_type === 'credit' ? t.amount : -t.amount,
        type: t.transaction_type,
        date: t.created_at.split('T')[0],
        created_at: t.created_at,
      }));

      setRecentTransactions(transformedTransactions);

      // Generate chart data
      generateChartData(transformedTransactions);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error(t('messages.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartData = (transactions: any[]) => {
    // Create date range array
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dateArray.push(new Date(date).toISOString().split('T')[0]);
    }

    // Group transactions by date and calculate running totals
    let runningBalance = 0;
    const chartPoints = dateArray.map(date => {
      const dayTransactions = transactions.filter(t => t.date === date);
      
      const dayCredit = dayTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const dayDebit = dayTransactions
        .filter(t => t.type === 'debit')  
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      runningBalance += dayCredit - dayDebit;

      return {
        date,
        totalCash: runningBalance,
        credit: dayCredit,
        debit: dayDebit,
      };
    });

    // Sample every few days if date range is large to avoid cluttered chart
    const sampleRate = Math.max(1, Math.floor(chartPoints.length / 15));
    const sampledData = chartPoints.filter((_, index) => index % sampleRate === 0);
    
    setChartData(sampledData);
  };

  const transactionOptions = [
    { value: 'credit', label: t('transactions.credit') + ' (' + t('transactions.income') + ')' },
    { value: 'debit', label: t('transactions.debit') + ' (' + t('transactions.expense') + ')' },
  ];

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description) {
      toast.error(t('validation.required'));
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error(t('validation.positiveNumber'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      await transactionService.createTransaction({
        description: formData.description,
        amount: parseFloat(formData.amount),
        transaction_type: transactionType,
      });
      
      toast.success(`${transactionType === 'credit' ? t('transactions.credit') : t('transactions.debit')} ${t('transactions.transactionAdded')}`);
      setIsAddModalOpen(false);
      setFormData({ amount: '', description: '' });
      
      // Refresh dashboard data
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('messages.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Date Range Filter */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('dashboard.currentBalance')}
            value={formatCurrency(stats.balance)}
            icon={BanknotesIcon}
            color="primary"
          />
          <StatCard
            title={t('dashboard.totalIncome')}
            value={formatCurrency(stats.totalCredits)}
            icon={ArrowTrendingUpIcon}
            color="success"
          />
          <StatCard
            title={t('dashboard.totalExpense')}
            value={formatCurrency(stats.totalDebits)}
            icon={CreditCardIcon}
            color="danger"
          />
          <StatCard
            title={t('users.totalUsers')}
            value={stats.userCount.toString()}
            icon={UsersIcon}
            color="gray"
          />
        </div>
      )}

      {/* Trend Chart */}
      <TrendChart data={chartData} />

      {/* Latest Transactions - Full Width */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            {t('dashboard.recentTransactions')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<EyeIcon className="h-4 w-4" />}
            onClick={() => navigate('/transactions')}
          >
            {t('dashboard.viewAllTransactions')}
          </Button>
        </div>
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found for the selected date range.</p>
            </div>
          ) : (
            recentTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'credit' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                    ) : (
                      <MinusIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                </div>
                <div className={`font-semibold ${
                  transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`${t('common.add')} ${transactionType === 'credit' ? t('transactions.credit') : t('transactions.debit')}`}
        size="md"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <Select
            label={t('transactions.transactionType')}
            options={transactionOptions}
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as 'credit' | 'debit')}
          />
          <Input
            label={t('transactions.amount') + ' (Rp)'}
            type="number"
            placeholder={t('transactions.amount')}
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            leftIcon={<span className="text-gray-500">Rp</span>}
            required
          />
          <Input
            label={t('transactions.description')}
            type="text"
            placeholder={t('transactions.description')}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            required
          />
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setIsAddModalOpen(false)}
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
              {isSubmitting ? t('common.loading') : t('transactions.addTransaction')}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default DashboardPage;
