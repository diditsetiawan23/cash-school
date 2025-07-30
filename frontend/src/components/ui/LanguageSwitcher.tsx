import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { LanguageIcon } from '@heroicons/react/24/outline';
import Select from './Select';

export interface LanguageSwitcherProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  size = 'md',
  showIcon = true,
}) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'id', label: 'Bahasa Indonesia' },
  ];

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    console.log('Language changing to:', language);
    console.log('Current i18n language:', i18n.language);
    i18n.changeLanguage(language);
    localStorage.setItem('preferred-language', language);
    console.log('Language changed to:', i18n.language);
  };

  return (
    <motion.div
      className={`flex items-center space-x-2 ${className || ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {showIcon && (
        <LanguageIcon className="h-5 w-5 text-gray-600" />
      )}
      <Select
        options={languages}
        value={i18n.language}
        onChange={handleLanguageChange}
        size={size}
        className="min-w-[140px]"
        aria-label={t('common.language')}
      />
    </motion.div>
  );
};

export default LanguageSwitcher;
