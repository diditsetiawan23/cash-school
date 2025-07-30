import React, { useState, useRef, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Pilih tanggal",
  minDate,
  maxDate,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;
  const minDateTime = minDate ? new Date(minDate) : null;
  const maxDateTime = maxDate ? new Date(maxDate) : null;

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    if (disabled) return;
    
    // Check if date is within allowed range
    if (minDateTime && isBefore(date, minDateTime)) return;
    if (maxDateTime && isAfter(date, maxDateTime)) return;
    
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the starting day of the week (0 = Sunday, 1 = Monday, etc.)
  const startDay = monthStart.getDay();
  
  // Add empty cells for days before the first day of the month
  const calendarDays = [
    ...Array(startDay).fill(null),
    ...monthDays
  ];

  const isDateDisabled = (date: Date) => {
    if (minDateTime && isBefore(date, minDateTime)) return true;
    if (maxDateTime && isAfter(date, maxDateTime)) return true;
    return false;
  };

  const formatDisplayValue = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Input Field */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          relative flex items-center w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-xl shadow-sm cursor-pointer
          transition-all duration-200 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}
        `}
      >
        <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={`block truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>
            {value ? formatDisplayValue(value) : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[10000] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
            </h3>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-10" />;
                }

                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isCurrentDay = isToday(date);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isDisabled = isDateDisabled(date);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`
                      h-10 w-10 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200
                      ${isSelected 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105' 
                        : isCurrentDay 
                          ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' 
                          : isCurrentMonth 
                            ? 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600' 
                            : 'text-gray-300'
                      }
                      ${isDisabled 
                        ? 'opacity-40 cursor-not-allowed' 
                        : 'hover:shadow-md hover:transform hover:scale-105'
                      }
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today Button */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => handleDateSelect(new Date())}
              className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
