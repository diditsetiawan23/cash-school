import React from 'react';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import CustomDatePicker from './CustomDatePicker';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickSelect?: (days: number) => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickSelect,
  className = ''
}) => {
  const { t } = useTranslation();
  
  const quickSelectOptions = [
    { days: 7, label: t('dashboard.last7Days') },
    { days: 30, label: t('dashboard.last30Days') },
    { days: 90, label: t('dashboard.last90Days') },
  ];

  const handleQuickSelect = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    onEndDateChange(endDate.toISOString().split('T')[0]);
    onStartDateChange(startDate.toISOString().split('T')[0]);
    
    if (onQuickSelect) {
      onQuickSelect(days);
    }
  };

  // Validate that end date is not before start date
  const handleStartDateChange = (date: string) => {
    onStartDateChange(date);
    // If end date is before the new start date, clear it
    if (endDate && date && new Date(endDate) < new Date(date)) {
      onEndDateChange('');
    }
  };

  const handleEndDateChange = (date: string) => {
    // Only allow end date if it's not before start date
    if (!startDate || !date || new Date(date) >= new Date(startDate)) {
      onEndDateChange(date);
    }
  };

  // Get today's date for max attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl mr-3">
          <CalendarDaysIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.dateRangeFilter')}</h3>
          <p className="text-sm text-gray-500">Filter transaksi berdasarkan rentang tanggal</p>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Quick Select Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('dashboard.quickSelect')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {quickSelectOptions.map((option) => (
              <button
                key={option.days}
                onClick={() => handleQuickSelect(option.days)}
                className="group relative px-4 py-3 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all duration-300 hover:shadow-md transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="group-hover:text-indigo-700 transition-colors">{option.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pilih Rentang Tanggal Manual
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <CustomDatePicker
                label={t('dashboard.startDate')}
                value={startDate}
                maxDate={today}
                onChange={handleStartDateChange}
                placeholder="Pilih tanggal mulai"
                className="w-full"
              />
              {startDate && (
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  Tanggal mulai: {new Date(startDate).toLocaleDateString('id-ID')}
                </div>
              )}
            </div>
            
            <div className="relative">
              <CustomDatePicker
                label={t('dashboard.endDate')}
                value={endDate}
                minDate={startDate || undefined}
                maxDate={today}
                onChange={handleEndDateChange}
                placeholder="Pilih tanggal akhir"
                disabled={!startDate}
                className="w-full"
              />
              {endDate && (
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  Tanggal akhir: {new Date(endDate).toLocaleDateString('id-ID')}
                </div>
              )}
              {!startDate && (
                <div className="absolute -bottom-5 left-0 text-xs text-amber-600">
                  Pilih tanggal mulai terlebih dahulu
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Range Summary */}
        {startDate && endDate && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                Menampilkan transaksi dari {new Date(startDate).toLocaleDateString('id-ID')} sampai {new Date(endDate).toLocaleDateString('id-ID')}
              </span>
            </div>
            <div className="mt-2 text-xs text-indigo-600">
              {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} hari
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;
