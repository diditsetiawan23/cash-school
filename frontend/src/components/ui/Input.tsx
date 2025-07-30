import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time';
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  name?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const {
      type = 'text',
      placeholder,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      disabled = false,
      readOnly = false,
      required = false,
      autoComplete,
      autoFocus = false,
      className,
      size = 'md',
      variant = 'default',
      leftIcon,
      rightIcon,
      label,
      error,
      hint,
      id,
      name,
      min,
      max,
      step,
      pattern,
      maxLength,
      minLength,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'data-testid': dataTestId,
    } = props;

    const baseClasses = 'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const inputClasses = clsx(
      baseClasses,
      variantClasses[error ? 'error' : variant],
      sizeClasses[size],
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      className
    );

    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [ariaDescribedBy, errorId, hintId].filter(Boolean).join(' ');

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">
                {leftIcon}
              </span>
            </div>
          )}
          
          <motion.input
            ref={ref}
            type={type}
            id={inputId}
            name={name}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            maxLength={maxLength}
            minLength={minLength}
            className={inputClasses}
            aria-label={ariaLabel}
            aria-describedby={describedBy || undefined}
            data-testid={dataTestId}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400">
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        
        {error && (
          <motion.p
            id={errorId}
            className="mt-2 text-sm text-red-600"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
        
        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
