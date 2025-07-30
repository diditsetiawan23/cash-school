import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
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
import { userService } from '../../services/userService';

interface User {
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

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'viewer' as 'admin' | 'viewer',
    password: '',
    is_active: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Real data from API
  const [users, setUsers] = useState<User[]>([]);

  // Load users from API
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 300); // Debounce search for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userService.getUsers({
        search: searchTerm,
        role: roleFilter === 'all' ? '' : roleFilter as 'admin' | 'viewer',
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      });
      
      setUsers(response);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t('users.loadUsersFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'all', label: t('users.allRoles') },
    { value: 'admin', label: t('users.administrator') },
    { value: 'viewer', label: t('users.viewer') },
  ];

  const statusOptions = [
    { value: 'all', label: t('users.allStatus') },
    { value: 'active', label: t('users.active') },
    { value: 'inactive', label: t('users.inactive') },
  ];

  const userRoleOptions = [
    { value: 'viewer', label: t('users.viewer') },
    { value: 'admin', label: t('users.administrator') },
  ];

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof User];
      let bValue: any = b[sortBy as keyof User];

      if (sortBy === 'created_at' || sortBy === 'updated_at' || sortBy === 'last_login') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const viewerUsers = users.filter(u => u.role === 'viewer').length;
    return { totalUsers, activeUsers, adminUsers, viewerUsers };
  }, [users]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  const resetForm = () => {
    setFormData({ 
      username: '', 
      email: '', 
      full_name: '', 
      role: 'viewer', 
      password: '',
      is_active: true 
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: '', // Don't pre-fill password for security
      is_active: user.is_active,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.full_name) {
      toast.error(t('users.fillRequiredFields'));
      return false;
    }

    if (isAddModalOpen && !formData.password) {
      toast.error(t('users.passwordRequired'));
      return false;
    }

    if (formData.password && formData.password.length < 8) {
      toast.error(t('users.passwordMinLength'));
      return false;
    }

    // Password complexity validation for new users
    if (isAddModalOpen && formData.password) {
      const password = formData.password;
      if (!/(?=.*[a-z])/.test(password)) {
        toast.error(t('users.passwordLowercase'));
        return false;
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        toast.error(t('users.passwordUppercase'));
        return false;
      }
      if (!/(?=.*\d)/.test(password)) {
        toast.error(t('users.passwordDigit'));
        return false;
      }
    }

    // Check for duplicate username/email (excluding current user in edit mode)
    const existingUser = users.find(u => 
      (u.username === formData.username || u.email === formData.email) &&
      u.id !== selectedUser?.id
    );
    
    if (existingUser) {
      toast.error(t('users.usernameEmailExists'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isEditModalOpen && selectedUser) {
        // Update existing user
        const updateData = {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        };

        const updatedUser = await userService.updateUser(selectedUser.id, updateData);
        
        setUsers(prev => prev.map(u => 
          u.id === selectedUser.id ? updatedUser : u
        ));
        toast.success(t('users.userUpdated'));
        setIsEditModalOpen(false);
      } else {
        // Add new user
        const createData = {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        };

        const newUser = await userService.createUser(createData);
        
        setUsers(prev => [newUser, ...prev]);
        toast.success(t('users.userAdded'));
        setIsAddModalOpen(false);
      }

      resetForm();
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Failed to save user:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = t('users.operationFailed');
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors array
          const validationErrors = error.response.data.detail.map((err: any) => 
            `${err.loc?.join(' → ') || 'Field'}: ${err.msg}`
          ).join(', ');
          errorMessage = `Validation errors: ${validationErrors}`;
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    // Prevent deleting current user
    if (selectedUser.id === user?.id) {
      toast.error(t('users.cannotDeleteSelf'));
      return;
    }

    setIsSubmitting(true);

    try {
      await userService.deleteUser(selectedUser.id);

      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      toast.success(t('users.userDeleted'));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('users.deleteUserFailed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (targetUser: User) => {
    // Prevent deactivating current user
    if (targetUser.id === user?.id && targetUser.is_active) {
      toast.error(t('users.cannotDeactivateSelf'));
      return;
    }

    try {
      const updateData = {
        is_active: !targetUser.is_active
      };

      const updatedUser = await userService.updateUser(targetUser.id, updateData);

      setUsers(prev => prev.map(u => 
        u.id === targetUser.id ? updatedUser : u
      ));
      
      toast.success(targetUser.is_active ? t('users.userDeactivated') : t('users.userActivated'));
    } catch (error: any) {
      console.error('Failed to update user status:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('users.updateStatusFailed');
      toast.error(errorMessage);
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('users.accessDenied')}</h2>
        <p className="text-gray-600">{t('users.adminPrivilegesRequired')}</p>
      </motion.div>
    );
  }

  const columns = [
    {
      key: 'username',
      label: t('users.username'),
      sortable: true,
      render: (value: string, row: User) => (
        <div className="flex items-center">
          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'full_name',
      label: t('users.fullName'),
      sortable: true,
    },
    {
      key: 'email',
      label: t('users.email'),
      sortable: true,
    },
    {
      key: 'role',
      label: t('users.role'),
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'admin' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {value === 'admin' ? (
            <ShieldCheckIcon className="h-3 w-3 mr-1" />
          ) : (
            <EyeIcon className="h-3 w-3 mr-1" />
          )}
          {value === 'admin' ? t('users.administrator') : t('users.viewer')}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: t('common.status'),
      sortable: true,
      render: (value: boolean, row: User) => (
        <button
          onClick={() => toggleUserStatus(row)}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
            value
              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {value ? (
            <CheckIcon className="h-3 w-3 mr-1" />
          ) : (
            <XMarkIcon className="h-3 w-3 mr-1" />
          )}
          {value ? t('users.active') : t('users.inactive')}
        </button>
      ),
    },
    {
      key: 'last_login',
      label: t('users.lastLogin'),
      sortable: true,
      render: (value: string | undefined) => value ? formatDate(value) : t('users.never'),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (_: any, row: User) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            leftIcon={<PencilIcon className="h-4 w-4" />}
          >
            {t('common.edit')}
          </Button>
          {row.id !== user?.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(row)}
              leftIcon={<TrashIcon className="h-4 w-4" />}
              className="text-red-600 hover:text-red-700"
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
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
          <h1 className="text-2xl font-bold text-gray-900">{t('users.userManagement')}</h1>
          <p className="text-gray-600 mt-1">{t('users.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={openAddModal}
        >
          {t('users.addUser')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-blue-600 text-sm font-medium">{t('users.totalUsers')}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-green-600 text-sm font-medium">{t('users.activeUsers')}</p>
              <p className="text-2xl font-bold text-green-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-purple-600 text-sm font-medium">{t('users.administrators')}</p>
              <p className="text-2xl font-bold text-purple-900">{stats.adminUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-yellow-600 text-sm font-medium">{t('users.viewers')}</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.viewerUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <Input
              placeholder={t('users.searchUsers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table
          columns={columns}
          data={filteredUsers}
          onSort={handleSort}
          sortBy={sortBy}
          sortDirection={sortDirection}
          emptyMessage={t('users.noUsers')}
        />
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isEditModalOpen ? t('users.editUser') : t('users.addUser')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('users.username')}
            type="text"
            placeholder={t('users.enterUsername')}
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            required
          />
          <Input
            label={t('users.fullName')}
            type="text"
            placeholder={t('users.enterFullName')}
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            required
          />
          <Input
            label={t('users.email')}
            type="email"
            placeholder={t('users.enterEmail')}
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
          <Select
            label={t('users.role')}
            options={userRoleOptions}
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'viewer' }))}
            required
          />
          <Input
            label={isEditModalOpen ? t('users.newPassword') : t('users.password')}
            type="password"
            placeholder={t('users.enterPassword')}
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required={isAddModalOpen}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              {t('users.activeUser')}
            </label>
          </div>
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
              {isSubmitting ? (isEditModalOpen ? t('users.updating') : t('users.creating')) : (isEditModalOpen ? t('users.update') : t('users.create'))} {t('users.title')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title={t('users.deleteUser')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('users.confirmDelete')}
          </p>
          {selectedUser && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-600">@{selectedUser.username}</p>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>
          )}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              onClick={handleDelete}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('users.deleting') : t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default UsersPage;
