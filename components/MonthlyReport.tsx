
import React, { useMemo, useState } from 'react';
import { AssetHistoryByCategoryPoint, AssetType } from '../types';
import Card from './Card';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, ChevronDownIcon } from './IconComponents';

interface MonthlyReportProps {
  assetHistory: AssetHistoryByCategoryPoint[];
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ assetHistory }) => {
  const availableMonths = useMemo(() => {
    if (!assetHistory || assetHistory.length === 0) return [];
    
    const monthsMap = new Map<string, AssetHistoryByCategoryPoint>();
    
    // Group by month and take the last entry of each month
    assetHistory.forEach(entry => {
      const date = new Date(entry.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, entry);
    });
    
    return Array.from(monthsMap.entries())
      .map(([key, entry]) => ({ key, label: key.replace('-', '年') + '月', entry }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [assetHistory]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return availableMonths.length > 0 ? availableMonths[0].key : '';
  });

  const reportData = useMemo(() => {
    if (!assetHistory || assetHistory.length < 2 || !selectedMonthKey) return null;

    const selectedMonthData = availableMonths.find(m => m.key === selectedMonthKey);
    if (!selectedMonthData) return null;

    const latest = selectedMonthData.entry;
    
    // Find the last data point from the previous month relative to the selected month
    const latestDate = new Date(latest.date);
    const latestMonth = latestDate.getMonth();
    const latestYear = latestDate.getFullYear();

    let previousMonthEntry: AssetHistoryByCategoryPoint | null = null;
    
    // Look for the last entry of the month before the selected one
    for (let i = assetHistory.length - 1; i >= 0; i--) {
      const d = new Date(assetHistory[i].date);
      const isBefore = d.getFullYear() < latestYear || (d.getFullYear() === latestYear && d.getMonth() < latestMonth);
      if (isBefore) {
        previousMonthEntry = assetHistory[i];
        break;
      }
    }

    if (!previousMonthEntry) return null;

    const categories = Object.values(AssetType);
    const comparison = categories.map(category => {
      const currentVal = Number(latest[category]) || 0;
      const prevVal = Number(previousMonthEntry![category]) || 0;
      const diff = currentVal - prevVal;
      const percentChange = prevVal !== 0 ? (diff / Math.abs(prevVal)) * 100 : 0;

      return {
        category,
        currentVal,
        prevVal,
        diff,
        percentChange,
      };
    }).filter(item => item.currentVal !== 0 || item.prevVal !== 0);

    const calculateNetWorth = (entry: AssetHistoryByCategoryPoint) => {
        let totalPositive = 0;
        categories.forEach(cat => {
            if (cat !== AssetType.Liability && cat !== AssetType.MarginStocks && cat !== AssetType.LeveragedFX) {
                totalPositive += Number(entry[cat]) || 0;
            }
        });
        const margin = Number(entry[AssetType.MarginStocks]) || 0;
        const leveraged = Number(entry[AssetType.LeveragedFX]) || 0;
        const liability = Number(entry[AssetType.Liability]) || 0;
        return totalPositive + margin + leveraged + liability;
    };

    const currentNetWorth = calculateNetWorth(latest);
    const prevNetWorth = calculateNetWorth(previousMonthEntry);
    const netWorthDiff = currentNetWorth - prevNetWorth;
    const netWorthPercent = prevNetWorth !== 0 ? (netWorthDiff / Math.abs(prevNetWorth)) * 100 : 0;

    return {
      latestDate: latest.date,
      prevDate: previousMonthEntry.date,
      comparison,
      netWorth: {
        current: currentNetWorth,
        prev: prevNetWorth,
        diff: netWorthDiff,
        percent: netWorthPercent
      }
    };
  }, [assetHistory, selectedMonthKey, availableMonths]);

  if (!reportData) {
    return (
      <Card>
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">月次レポート</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">比較するための履歴データが不足しています（最低2ヶ月分のデータが必要です）。</p>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value) + '円';
  };

  const formatPercent = (value: number) => {
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">月次レポート</h3>
            <div className="relative">
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {availableMonths.map(month => (
                  <option key={month.key} value={month.key}>{month.label}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            比較対象: {reportData.prevDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">純資産 前月比</div>
          <div className={`text-lg font-bold flex items-center justify-end ${reportData.netWorth.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {reportData.netWorth.diff >= 0 ? <TrendingUpIcon className="w-5 h-5 mr-1" /> : <TrendingDownIcon className="w-5 h-5 mr-1" />}
            {formatPercent(reportData.netWorth.percent)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">カテゴリー</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">前月残高</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">今月残高</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">増減</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">騰落率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {reportData.comparison.map((item) => (
              <tr key={item.category} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{item.category}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 text-right">{formatCurrency(item.prevVal)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200 text-right">{formatCurrency(item.currentVal)}</td>
                <td className={`px-6 py-4 text-sm font-medium text-right ${item.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.diff > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 
                    item.diff < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {item.diff > 0 ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : item.diff < 0 ? <TrendingDownIcon className="w-3 h-3 mr-1" /> : <MinusIcon className="w-3 h-3 mr-1" />}
                    {formatPercent(item.percentChange)}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold">
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">純資産 合計</td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(reportData.netWorth.prev)}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(reportData.netWorth.current)}</td>
              <td className={`px-6 py-4 text-sm text-right ${reportData.netWorth.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {reportData.netWorth.diff > 0 ? '+' : ''}{formatCurrency(reportData.netWorth.diff)}
              </td>
              <td className="px-6 py-4 text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  reportData.netWorth.diff > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 
                  reportData.netWorth.diff < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {formatPercent(reportData.netWorth.percent)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default MonthlyReport;
