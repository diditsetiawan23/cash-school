import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  UserIcon,
  KeyIcon,
  GlobeAltIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatDate } from '../../utils/date';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'Asia/Jakarta',
  });

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'id', label: 'Bahasa Indonesia' },
  ];

  const timezoneOptions = [
    { value: 'Asia/Jakarta', label: 'Asia/Jakarta (UTC+7)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
    { value: 'UTC', label: 'UTC (UTC+0)' },
    { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  ];

  // Initialize preferences with current i18n language and localStorage
  useEffect(() => {
    console.log('ProfilePage useEffect - initializing language');
    const savedLanguage = localStorage.getItem('i18nextLng');
    const currentLanguage = i18n.language;
    console.log('Saved language from localStorage:', savedLanguage);
    console.log('Current i18n language:', currentLanguage);
    
    const languageToUse = savedLanguage || currentLanguage || 'en';
    console.log('Language to use:', languageToUse);
    
    setPreferences(prev => ({
      ...prev,
      language: languageToUse
    }));
    
    // Ensure i18n is also set to the saved language
    if (languageToUse !== currentLanguage) {
      console.log('Setting i18n language to:', languageToUse);
      i18n.changeLanguage(languageToUse);
    }
  }, [i18n]);

  const validateProfileForm = () => {
    if (!profileData.username || !profileData.email || !profileData.full_name) {
      toast.error(t('profile.fillAllFields'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast.error(t('profile.validEmailRequired'));
      return false;
    }

    return true;
  };

  const validatePasswordForm = () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error(t('profile.fillPasswordFields'));
      return false;
    }

    if (passwordData.new_password.length < 6) {
      toast.error(t('profile.passwordMinLength'));
      return false;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('profile.passwordsNotMatch'));
      return false;
    }

    return true;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;

    setIsSubmitting(true);

    try {
      // Call the real API to update profile
      const updatedUser = await userService.updateProfile({
        username: profileData.username,
        email: profileData.email,
        full_name: profileData.full_name,
      });

      // Update the user context or refresh user data
      // For now, we'll show success and refresh user data by reloading
      toast.success(t('profile.profileUpdated'));
      setIsEditing(false);
      
      // Refresh the page to get updated user data from the backend
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.detail || t('profile.failedUpdateProfile');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);

    try {
      // Call the real API to change password
      await userService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      toast.success(t('profile.passwordChanged'));
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setIsChangingPassword(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.detail || t('profile.failedChangePassword');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handlePreferencesSubmit called');
    console.log('Current preferences:', preferences);
    
    setIsSubmitting(true);

    try {
      // Update i18n language
      console.log('Changing language to:', preferences.language);
      await i18n.changeLanguage(preferences.language);
      console.log('Language changed successfully');
      console.log('Current i18n language after change:', i18n.language);
      
      // Manually save to localStorage to ensure persistence
      localStorage.setItem('i18nextLng', preferences.language);
      console.log('Saved to localStorage:', localStorage.getItem('i18nextLng'));
      
      // Simulate API call for other preferences
      console.log('Simulating API call...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Preferences saved successfully');
      toast.success(t('profile.preferencesUpdated'));
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('profile.failedUpdatePreferences'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEditing = () => {
    setProfileData({
      username: user?.username || '',
      email: user?.email || '',
      full_name: user?.full_name || '',
    });
    setIsEditing(false);
  };

  const cancelPasswordChange = () => {
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setIsChangingPassword(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')} {t('common.settings')}</h1>
        <p className="text-gray-600 mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <UserIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">{t('profile.profileInformation')}</h2>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  {t('profile.editProfile')}
                </Button>
              )}
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input
                label={t('profile.username')}
                value={profileData.username}
                onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                disabled={!isEditing}
                required
              />
              <Input
                label={t('profile.fullName')}
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                disabled={!isEditing}
                required
              />
              <Input
                label={t('profile.email')}
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
                required
              />

              {isEditing && (
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {t('profile.saveChanges')}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <KeyIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">{t('profile.changePassword')}</h2>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                >
                  {t('profile.changePassword')}
                </Button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  label={t('profile.currentPassword')}
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  required
                />
                <Input
                  label={t('profile.newPassword')}
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  required
                />
                <Input
                  label={t('profile.confirmNewPassword')}
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  required
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">{t('profile.passwordRequirements')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t('profile.passwordLength')}</li>
                        <li>{t('profile.passwordComplexity')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelPasswordChange}
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {t('profile.changePassword')}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-gray-600">
                {t('profile.keepAccountSecure')}{' '}
                <span className="font-medium">{formatDate(user?.updated_at || new Date().toISOString())}</span>
              </p>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <GlobeAltIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('profile.preferences')}</h2>
            </div>

            <form onSubmit={handlePreferencesSubmit} className="space-y-4">
              <Select
                label={t('profile.language')}
                options={languageOptions}
                value={preferences.language}
                onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
              />

              <Select
                label={t('profile.timezone')}
                options={timezoneOptions}
                value={preferences.timezone}
                onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {t('profile.savePreferences')}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.accountSummary')}</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('profile.role')}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.role === 'admin' ? t('profile.administrator') : t('profile.viewer')}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('profile.status')}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  {t('profile.active')}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('profile.memberSince')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(user?.created_at || new Date().toISOString())}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('profile.lastUpdated')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(user?.updated_at || new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.accountActions')}</h3>
            <Button
              variant="outline"
              fullWidth
              onClick={logout}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              {t('profile.signOut')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
