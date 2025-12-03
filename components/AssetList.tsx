
import React, { useState, useMemo } from 'react';
import { Asset, AssetType } from '../types';
import Card from './Card';
import { ChevronDownIcon, ChartBarIcon } from './IconComponents';

type Grouping = 'individual' | 'name' | 'owner';

interface AssetListProps {
  assets: Asset[];
  grouping: Grouping;
  onAssetSelect?: (assetName: string) => void;
}

const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0, ...options }).format(value);
};

const formatPercent = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('ja-JP', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, ...options }).format(value);
}

const getAssetTypeColor = (type: AssetType) => {
  const colors: { [key in AssetType]: string } = {
    [AssetType.Cash]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    [AssetType.Stocks]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [AssetType.MarginStocks]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    [AssetType.SpotFX]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    [AssetType.LeveragedFX]: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
    [AssetType.InvestmentTrust]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [AssetType.Crypto]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    [AssetType.Bonds]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    [AssetType.RealEstate]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    [AssetType.DC]: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
    [AssetType.Other]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    [AssetType.Liability]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return colors[type];
};

const AssetRow: React.FC<{asset: Asset; onAssetSelect?: (name: string) => void}> = ({ asset, onAssetSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const isStock = asset.type === AssetType.Stocks;
    const isMarginStock = asset.type === AssetType.MarginStocks;
    const isLeveragedFx = asset.type === AssetType.LeveragedFX;
    const isSpotFx = asset.type === AssetType.SpotFX;
    const isStockOrFxType = isStock || isMarginStock || isLeveragedFx || isSpotFx;
    
    const sharesLabel = isLeveragedFx ? '保有量 (Lot)' : isSpotFx ? '保有量' : '保有数';
    const avgPriceLabel = isLeveragedFx || isSpotFx ? '平均取得レート' : '平均取得単価';
    const currentPriceLabel = isLeveragedFx || isSpotFx ? '現在レート' : '現在の株価';
    const purchaseAmountLabel = isLeveragedFx ? '建玉金額' : '取得価額';

    const hasDetails = asset.owner || asset.account || isStockOrFxType;

    const profitOrLossColor = asset.profitOrLoss != null ? (asset.profitOrLoss >= 0 ? 'text-green-500' : 'text-red-500') : '';

    return (
        <>
            <tr onClick={() => hasDetails && setIsExpanded(!isExpanded)} className={hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}>
                <td className="px-2 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                  <div className="flex items-start sm:items-center">
                    {hasDetails && <ChevronDownIcon className={`w-4 h-4 mr-2 mt-1 sm:mt-0 flex-shrink-0 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />}
                    <span className="break-words mr-2">{asset.name}</span>
                    {onAssetSelect && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAssetSelect(asset.name); }}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                            title="推移グラフを表示"
                        >
                            <ChartBarIcon className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAssetTypeColor(asset.type)}`}>
                    {asset.type}
                  </span>
                </td>
                <td className={`px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-semibold ${asset.type === AssetType.Liability ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(asset.value)}</td>
            </tr>
            {isExpanded && hasDetails && (
                 <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={3} className="px-2 py-3 sm:px-6 sm:py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs sm:text-sm">
                             <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">所有者</p>
                                <p className="text-gray-800 dark:text-gray-100">{asset.owner || 'ー'}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">口座</p>
                                <p className="text-gray-800 dark:text-gray-100">{asset.account || 'ー'}</p>
                            </div>
                           {asset.tickerSymbol && <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">ティッカー</p>
                                <p className="text-gray-800 dark:text-gray-100">{asset.tickerSymbol}</p>
                            </div>}
                           {isStockOrFxType && (
                            <>
                                {asset.purchaseAmount != null && (
                                    <div>
                                        <p className="font-semibold text-gray-600 dark:text-gray-300">{purchaseAmountLabel}</p>
                                        <p className="text-gray-800 dark:text-gray-100">{formatCurrency(asset.purchaseAmount)}</p>
                                    </div>
                                )}
                                {asset.profitOrLoss != null && (
                                    <div>
                                        <p className="font-semibold text-gray-600 dark:text-gray-300">評価損益 (率)</p>
                                        <p className={profitOrLossColor}>
                                            {formatCurrency(asset.profitOrLoss, {signDisplay: 'always'})}
                                            {asset.profitOrLossRate != null && ` (${formatPercent(asset.profitOrLossRate, {signDisplay: 'always'})})`}
                                        </p>
                                    </div>
                                )}
                                {asset.shares != null && (
                                     <div>
                                        <p className="font-semibold text-gray-600 dark:text-gray-300">{sharesLabel}</p>
                                        <p className="text-gray-800 dark:text-gray-100">{asset.shares}</p>
                                    </div>
                                )}
                                {asset.avgPurchasePrice != null && (
                                    <div>
                                        <p className="font-semibold text-gray-600 dark:text-gray-300">{avgPriceLabel}</p>
                                        <p className="text-gray-800 dark:text-gray-100">{formatCurrency(asset.avgPurchasePrice)}</p>
                                    </div>
                                )}
                                {asset.currentPrice != null && (
                                   <div>
                                       <p className="font-semibold text-gray-600 dark:text-gray-300">{currentPriceLabel}</p>
                                       <p className="text-gray-800 dark:text-gray-100">{formatCurrency(asset.currentPrice)}</p>
                                   </div>
                                )}
                            </>
                           )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}


const AssetList: React.FC<AssetListProps> = ({ assets, grouping, onAssetSelect }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const groupedAssets = useMemo(() => {
    if (grouping === 'individual') return null;
    
    // Explicitly typing the accumulator to avoid TS error
    const initialGroups: Record<string, Asset[]> = {};
    const groups = assets.reduce((acc, asset) => {
        const groupKey = grouping === 'name' ? asset.name : asset.owner;
        const groupValue = groupKey || '未分類';
        if (!acc[groupValue]) {
            acc[groupValue] = [];
        }
        acc[groupValue].push(asset);
        return acc;
    }, initialGroups);

    return Object.entries(groups).map(([groupName, assetsInGroup]) => {
        const groupAssets = assetsInGroup as Asset[];
        const totalValue = groupAssets.reduce((sum, a) => sum + a.value, 0);
        const totalProfitOrLoss = groupAssets.reduce((sum, a) => sum + (a.profitOrLoss ?? 0), 0);
        const totalPurchaseAmount = groupAssets.reduce((sum, a) => sum + (a.purchaseAmount ?? 0), 0);
        const totalProfitOrLossRate = totalPurchaseAmount !== 0 ? totalProfitOrLoss / totalPurchaseAmount : 0;
        
        return {
            groupName,
            assets: groupAssets,
            count: groupAssets.length,
            totalValue,
            totalProfitOrLoss,
            totalProfitOrLossRate
        };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [assets, grouping]);
  
  if (grouping === 'individual' || !groupedAssets) {
      return (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">資産名</th>
                  <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">カテゴリ</th>
                  <th scope="col" className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">評価額</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {assets.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} onAssetSelect={onAssetSelect} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="w-2/5 sm:w-auto px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {grouping === 'name' ? '銘柄名' : '所有者'}
              </th>
              <th scope="col" className="w-3/5 sm:w-auto px-2 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">評価額 / 損益</th>
              <th scope="col" className="relative px-2 sm:px-6 py-3">
                <span className="sr-only">Expand</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {groupedAssets.map((group) => {
              const isExpanded = !!expandedGroups[group.groupName];
              const profitOrLossColor = group.totalProfitOrLoss >= 0 ? 'text-green-500' : 'text-red-500';
              const canSelectGroup = grouping === 'name' && onAssetSelect;

              return (
                <React.Fragment key={group.groupName}>
                  <tr onClick={() => toggleGroup(group.groupName)} className="cursor-pointer bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80">
                    <td className="px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <span className="break-words mr-2">{group.groupName} ({group.count})</span>
                        {canSelectGroup && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onAssetSelect && onAssetSelect(group.groupName); }}
                                className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                title="推移グラフを表示"
                            >
                                <ChartBarIcon className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm text-right">
                      <div className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(group.totalValue)}</div>
                      <div className={`mt-1 text-xs ${profitOrLossColor}`}>
                          {formatCurrency(group.totalProfitOrLoss, { signDisplay: 'always' })}
                          <span className="ml-1">({formatPercent(group.totalProfitOrLossRate, { signDisplay: 'always' })})</span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-3 whitespace-nowrap text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      <ChevronDownIcon className={`w-5 h-5 transition-transform mx-auto ${isExpanded ? 'transform rotate-180' : ''}`} />
                    </td>
                  </tr>
                  {isExpanded && group.assets.map(asset => (
                    <AssetRow key={asset.id} asset={asset} onAssetSelect={onAssetSelect} />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default AssetList;
