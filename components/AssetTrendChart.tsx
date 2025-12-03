
import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AssetHistoryByCategoryPoint, AssetType } from '../types';
import Card from './Card';
import { ChevronDownIcon } from './IconComponents';

const CATEGORY_COLORS: {[key: string]: string} = {
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
  [AssetType.Liability]: '#F44336',
};

const INDIVIDUAL_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1', 
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4',
  '#84CC16', '#0EA5E9', '#D946EF', '#64748B', '#F43F5E'
];

const getColorForIndex = (index: number) => INDIVIDUAL_COLORS[index % INDIVIDUAL_COLORS.length];

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 100000000) {
        return `${Math.round(value / 100000000)}億円`;
    }
    if (Math.abs(value) >= 10000) {
        return `${Math.round(value / 10000)}万円`;
    }
    return `${Math.round(value)}円`;
};

const CategoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const assetPayload = payload.filter((p: any) => p.dataKey !== '純資産' && p.dataKey !== AssetType.Liability);
    
    // Sum only the displayed components for the "Total" in tooltip to match visual stack
    const totalDisplayed = assetPayload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);

    return (
      <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {assetPayload.slice().reverse().map((entry: any) => (
             <div key={entry.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-100 ml-2">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(entry.value)}円</span>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-800 dark:text-gray-200">現物資産合計:</span>
                <span className="text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(totalDisplayed)}円</span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const IndividualTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Sort by value descending
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

      return (
        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {sortedPayload.map((entry: any) => (
               <div key={entry.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-gray-600 dark:text-gray-300 max-w-[150px] truncate" title={entry.name}>{entry.name}:</span>
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-100 ml-2">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(entry.value)}円</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

interface AssetTrendChartProps {
  data: AssetHistoryByCategoryPoint[];
  selectedAsset?: { name: string, timestamp: number } | null;
}

const AssetTrendChart: React.FC<AssetTrendChartProps> = ({ data, selectedAsset }) => {
  const [viewMode, setViewMode] = useState<'category' | 'individual'>('category');
  const [selectedIndividualKeys, setSelectedIndividualKeys] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const isDataValid = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null;

  const { processedData, categoryKeys, individualKeys } = useMemo(() => {
    if (!isDataValid) return { processedData: [], categoryKeys: [], individualKeys: [] };

    const allKeys = Array.from(new Set(data.flatMap(d => Object.keys(d))))
        .filter(k => k !== 'date' && k !== '純資産' && k !== AssetType.Liability);

    const detectedCategoryKeys = allKeys.filter(k => Object.values(AssetType).includes(k as AssetType));
    const detectedIndividualKeys = allKeys.filter(k => !Object.values(AssetType).includes(k as AssetType));

    const processed = data.map(entry => {
        const newEntry: { [key: string]: number | string } = { date: entry.date };
        let totalPositiveAssets = 0;

        // Process all numeric values
        allKeys.forEach(key => {
            const val = Number(entry[key]);
            const safeVal = isNaN(val) ? 0 : val;
            newEntry[key] = safeVal;
        });
        
        // Ensure category keys exist for stacking
        detectedCategoryKeys.forEach(key => {
            if (newEntry[key] === undefined) newEntry[key] = 0;
        });

        // Calculate totals for Stacked Chart logic
        detectedCategoryKeys.forEach(key => {
            if (key !== AssetType.MarginStocks && key !== AssetType.LeveragedFX) {
                totalPositiveAssets += (newEntry[key] as number);
            }
        });

        const marginStocksValue = Number(entry[AssetType.MarginStocks]) || 0;
        const leveragedFxValue = Number(entry[AssetType.LeveragedFX]) || 0;
        const liabilityValue = Number(entry[AssetType.Liability]) || 0;
        
        newEntry[AssetType.Liability] = liabilityValue;
        newEntry['純資産'] = totalPositiveAssets + marginStocksValue + leveragedFxValue + liabilityValue;

        return newEntry;
    });

    return { processedData: processed, categoryKeys: detectedCategoryKeys, individualKeys: detectedIndividualKeys };
  }, [data, isDataValid]);

  // Handle external selection (e.g. from AssetList)
  useEffect(() => {
    if (selectedAsset && individualKeys.includes(selectedAsset.name)) {
        setViewMode('individual');
        setSelectedIndividualKeys([selectedAsset.name]);
        const element = document.getElementById('asset-trend-chart');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [selectedAsset, individualKeys]);

  // Initialize selected keys with top 5 distinct items if not set
  useMemo(() => {
    if (individualKeys.length > 0 && selectedIndividualKeys.length === 0) {
        const latestData = processedData[processedData.length - 1];
        if (latestData) {
            const sortedKeys = individualKeys.sort((a, b) => (Number(latestData[b]) || 0) - (Number(latestData[a]) || 0));
            setSelectedIndividualKeys(sortedKeys.slice(0, 5));
        } else {
            setSelectedIndividualKeys(individualKeys.slice(0, 5));
        }
    }
  }, [individualKeys, processedData, selectedIndividualKeys.length]);

  if (!isDataValid) {
    const isOldFormat = Array.isArray(data) && data.length > 0 && 'value' in data[0];
    return (
      <Card>
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">資産推移</h3>
        <div style={{ width: '100%', height: 300 }} className="flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">{isOldFormat ? "カテゴリ別の履歴データ形式に更新してください。" : "履歴データがありません。"}</p>
        </div>
      </Card>
    );
  }

  const activeCategoryKeys = categoryKeys.filter(key => 
    processedData.some(d => (d[key] as number) !== 0)
  );

  const toggleIndividualKey = (key: string) => {
    setSelectedIndividualKeys(prev => 
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const selectSingleIndividualKey = (key: string) => {
    setSelectedIndividualKeys([key]);
    setIsSelectorOpen(false);
  };

  return (
    <Card className="scroll-mt-24" id="asset-trend-chart">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">資産推移</h3>
        
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1 shrink-0">
            <button 
                onClick={() => setViewMode('category')} 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'category' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
                カテゴリー別
            </button>
            <button 
                onClick={() => setViewMode('individual')} 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'individual' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
                銘柄別
            </button>
        </div>
      </div>

      {viewMode === 'individual' && (
          <div className="mb-4">
             {individualKeys.length > 0 ? (
                <div className="relative">
                    <button 
                        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                        className="flex items-center justify-between w-full sm:w-auto min-w-[200px] px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span>表示する銘柄を選択 ({selectedIndividualKeys.length})</span>
                        <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isSelectorOpen && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsSelectorOpen(false)}></div>
                        <div className="absolute top-full left-0 z-20 mt-1 w-full sm:w-96 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {individualKeys.map(key => (
                                <div key={key} className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded group">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIndividualKeys.includes(key)} 
                                        onChange={() => toggleIndividualKey(key)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        id={`checkbox-${key}`}
                                    />
                                    <div 
                                        className="flex-1 text-xs sm:text-sm text-gray-700 dark:text-gray-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                        title={`${key} のみを表示`}
                                        onClick={() => selectSingleIndividualKey(key)}
                                    >
                                        {key}
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                </div>
             ) : (
                 <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                     履歴データに個別の銘柄情報が含まれていません。スプレッドシートの履歴シートに銘柄ごとの列を追加すると、ここにグラフが表示されます。
                 </div>
             )}
          </div>
      )}

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            {viewMode === 'category' ? (
                <AreaChart data={processedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                    <XAxis dataKey="date" stroke="rgb(156 163 175)" fontSize={12} tick={{ dy: 5 }} />
                    <YAxis tickFormatter={formatCurrency} stroke="rgb(156 163 175)" fontSize={12} />
                    <Tooltip content={<CategoryTooltip />} />
                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                    
                    {activeCategoryKeys.map((key) => (
                        <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stackId="positiveAssets"
                            stroke={CATEGORY_COLORS[key] || '#8884d8'}
                            fill={CATEGORY_COLORS[key] || '#8884d8'}
                            name={key}
                        />
                    ))}
                </AreaChart>
            ) : (
                 <LineChart data={processedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                    <XAxis dataKey="date" stroke="rgb(156 163 175)" fontSize={12} tick={{ dy: 5 }} />
                    <YAxis tickFormatter={formatCurrency} stroke="rgb(156 163 175)" fontSize={12} />
                    <Tooltip content={<IndividualTooltip />} />
                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                    
                    {selectedIndividualKeys.map((key, index) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={getColorForIndex(individualKeys.indexOf(key))}
                            strokeWidth={2}
                            dot={false}
                            name={key}
                            connectNulls
                        />
                    ))}
                </LineChart>
            )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AssetTrendChart;
