import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AssetType } from '../types';
import Card from './Card';

interface AssetBreakdownChartProps {
  data: { name: string; value: number }[];
}

const COLORS: {[key: string]: string} = {
  [AssetType.Cash]: '#0088FE',
  [AssetType.Stocks]: '#00C49F',
  [AssetType.MarginStocks]: '#2ECC71',
  [AssetType.SpotFX]: '#3498DB',
  [AssetType.LeveragedFX]: '#A040A0',
  [AssetType.InvestmentTrust]: '#FFBB28',
  [AssetType.Crypto]: '#F7931A',
  [AssetType.Bonds]: '#FF8042',
  [AssetType.RealEstate]: '#AF19FF',
  [AssetType.DC]: '#4CAF50',
  [AssetType.Other]: '#8884d8',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
};

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value;
    const name = data.name;
    const percent = total > 0 ? (value / total) * 100 : 0;

    return (
      <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: payload[0].fill }}></span>
          {name}
        </p>
        <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(value)}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">合計の {percent.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const AssetBreakdownChart: React.FC<AssetBreakdownChartProps> = ({ data }) => {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card>
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">資産カテゴリ別内訳</h3>
      <div style={{ width: '100%', height: isMobile ? 280 : 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={isMobile ? 80 : 100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (total === 0) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (percent * 100) > 5 ? (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS[AssetType.Other]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
            {!isMobile && <Legend wrapperStyle={{fontSize: '12px'}} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AssetBreakdownChart;