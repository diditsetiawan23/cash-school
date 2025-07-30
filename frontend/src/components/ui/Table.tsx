import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  'data-testid'?: string;
}

const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  sortBy,
  sortDirection,
  onSort,
  className,
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  'data-testid': dataTestId,
}: TableProps<T>) => {
  const tableClasses = clsx(
    'min-w-full divide-y divide-gray-200',
    bordered && 'border border-gray-200 rounded-lg overflow-hidden',
    className
  );

  const headerClasses = clsx(
    'bg-gray-50',
    compact ? 'px-3 py-2' : 'px-6 py-3',
    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
  );

  const cellClasses = (align: string = 'left') => clsx(
    compact ? 'px-3 py-2' : 'px-6 py-4',
    'whitespace-nowrap text-sm text-gray-900',
    {
      'text-left': align === 'left',
      'text-center': align === 'center',
      'text-right': align === 'right',
    }
  );

  const rowClasses = (index: number) => clsx(
    striped && index % 2 === 0 && 'bg-gray-50',
    hoverable && 'hover:bg-gray-100 transition-colors duration-150'
  );

  const handleSort = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null;

    if (sortBy === column.key) {
      return sortDirection === 'asc' ? (
        <ChevronUpIcon className="h-4 w-4 ml-1" />
      ) : (
        <ChevronDownIcon className="h-4 w-4 ml-1" />
      );
    }

    return <ChevronUpIcon className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-50" />;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 h-12 rounded mb-4"></div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-gray-100 h-16 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden" data-testid={dataTestId}>
      <div className="overflow-x-auto">
        <table className={tableClasses}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    headerClasses,
                    column.className,
                    column.sortable && 'cursor-pointer select-none group'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className={clsx(
                    'flex items-center',
                    {
                      'justify-start': column.align === 'left' || !column.align,
                      'justify-center': column.align === 'center',
                      'justify-end': column.align === 'right',
                    }
                  )}>
                    {column.label}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={clsx(cellClasses('center'), 'text-gray-500 italic')}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <motion.tr
                  key={index}
                  className={rowClasses(index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    const content = column.render 
                      ? column.render(value, row, index)
                      : value;

                    return (
                      <td
                        key={column.key}
                        className={clsx(
                          cellClasses(column.align),
                          column.className
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
