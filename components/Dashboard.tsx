
import React, { useState } from 'react';
import { Asset, AssetHistoryByCategoryPoint } from '../types';
import TotalBalanceCard from './TotalBalanceCard';
import AssetTrendChart from './AssetTrendChart';
import AssetBreakdownChart from './AssetBreakdownChart';
import AssetList from './AssetList';

interface DashboardProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalProfitOrLoss: number;
  totalProfitOrLossRate: number;
  assetHistory: AssetHistoryByCategoryPoint[];
  assetBreakdown: { name: string; value: number }[];
  assets: Asset[];
}

const Dashboard: React.FC<DashboardProps> = ({
  totalAssets,
  totalLiabilities,
  netWorth,
  totalProfitOrLoss,
  totalProfitOrLossRate,
  assetHistory,
  assetBreakdown,
  assets,
}) => {
  const [grouping, setGrouping] = useState<'individual' | 'name' | 'owner'>('name');
  const [selectedAssetForGraph, setSelectedAssetForGraph] = useState<{name: string, timestamp: number} | null>(null);

  const handleAssetSelect = (name: string) => {
    setSelectedAssetForGraph({ name, timestamp: Date.now() });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <TotalBalanceCard title="総資産" amount={totalAssets} color="text-gray-700 dark:text-gray-300" />
        <TotalBalanceCard 
          title="総評価損益 (率)" 
          amount={totalProfitOrLoss} 
          changeRate={totalProfitOrLossRate} 
          isProfitLossCard={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <AssetTrendChart data={assetHistory} selectedAsset={selectedAssetForGraph} />
        </div>
        <AssetBreakdownChart data={assetBreakdown} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">資産一覧</h2>
            {/* Desktop Buttons */}
            <div className="hidden sm:flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button onClick={() => setGrouping('individual')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${grouping === 'individual' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>個別</button>
              <button onClick={() => setGrouping('name')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${grouping === 'name' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>銘柄別</button>
              <button onClick={() => setGrouping('owner')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${grouping === 'owner' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>所有者別</button>
            </div>
             {/* Mobile Dropdown */}
            <div className="sm:hidden">
              <label htmlFor="grouping-select" className="sr-only">表示形式</label>
              <select
                id="grouping-select"
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as 'individual' | 'name' | 'owner')}
                className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="individual">個別</option>
                <option value="name">銘柄別</option>
                <option value="owner">所有者別</option>
              </select>
            </div>
          </div>
        </div>
        <AssetList assets={assets} grouping={grouping} onAssetSelect={handleAssetSelect} />
      </div>
    </div>
  );
};

export default Dashboard;