import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface TrendChartProps {
  data: {
    date: string;
    totalCash: number;
    credit: number;
    debit: number;
  }[];
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, height = 300 }) => {
  const { t } = useTranslation();
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t('dashboard.noDataAvailable')}</p>
      </div>
    );
  }

  // Calculate the min and max values for proper scaling
  const allValues = data.flatMap(d => [d.totalCash, d.credit, d.debit]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  
  // Add some padding to the range
  const paddedMin = minValue - (range * 0.1);
  const paddedMax = maxValue + (range * 0.1);
  const paddedRange = paddedMax - paddedMin;

  const chartWidth = 800;
  const chartHeight = height - 80; // Leave space for labels
  const stepX = chartWidth / (data.length - 1);

  // Function to convert value to Y coordinate
  const getY = (value: number) => {
    return chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
  };

  // Generate path strings for each line
  const generatePath = (values: number[]) => {
    return values
      .map((value, index) => {
        const x = index * stepX;
        const y = getY(value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const totalCashPath = generatePath(data.map(d => d.totalCash));
  const creditPath = generatePath(data.map(d => d.credit));
  const debitPath = generatePath(data.map(d => d.debit));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cashFlowTrend')}</h3>
        
        {/* Legend */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">{t('dashboard.totalCash')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-600">{t('dashboard.credit')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-gray-600">{t('dashboard.debit')}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative overflow-x-auto">
        <svg
          width={Math.max(chartWidth, 600)}
          height={height}
          className="text-gray-400"
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width={stepX}
              height={chartHeight / 5}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${stepX} 0 L 0 0 0 ${chartHeight / 5}`}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />

          {/* Lines */}
          <motion.path
            d={totalCashPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <motion.path
            d={creditPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.path
            d={debitPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
          />

          {/* Data points */}
          {data.map((item, index) => {
            const x = index * stepX;
            return (
              <g key={index}>
                <motion.circle
                  cx={x}
                  cy={getY(item.totalCash)}
                  r="4"
                  fill="#3b82f6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
                />
                <motion.circle
                  cx={x}
                  cy={getY(item.credit)}
                  r="4"
                  fill="#10b981"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.7 + index * 0.1 }}
                />
                <motion.circle
                  cx={x}
                  cy={getY(item.debit)}
                  r="4"
                  fill="#ef4444"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.9 + index * 0.1 }}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((item, index) => (
            <text
              key={index}
              x={index * stepX}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {new Date(item.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </text>
          ))}
        </svg>
      </div>
    </motion.div>
  );
};

export default TrendChart;
