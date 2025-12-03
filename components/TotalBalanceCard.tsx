import React from 'react';
import Card from './Card';

interface TotalBalanceCardProps {
  title: string;
  amount: number;
  color?: string;
  isNetWorth?: boolean;
  isProfitLossCard?: boolean;
  changeRate?: number;
}

const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, ...options }).format(value);
};

const formatPercent = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('ja-JP', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, ...options }).format(value);
}

const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({ title, amount, color, isNetWorth = false, isProfitLossCard = false, changeRate }) => {
  const profitColor = amount >= 0 ? 'text-green-500' : 'text-red-500';
  const displayColor = isProfitLossCard ? profitColor : color;

  return (
    <Card className="flex flex-col justify-between">
      <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <div className={`flex items-baseline gap-2 ${isNetWorth ? 'mt-2' : ''}`}>
        <p className={`text-2xl sm:text-3xl font-bold ${displayColor}`}>
          {formatCurrency(amount, { signDisplay: isProfitLossCard ? 'always' : 'auto' })}
        </p>
        {isProfitLossCard && changeRate != null && (
          <p className={`text-base sm:text-lg font-semibold ${profitColor}`}>
            ({formatPercent(changeRate, { signDisplay: 'always' })})
          </p>
        )}
      </div>
    </Card>
  );
};

export default TotalBalanceCard;