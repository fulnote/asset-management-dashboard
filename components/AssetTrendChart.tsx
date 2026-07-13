import React, { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
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
    const absValue = Math.abs(value);
    if (absValue >= 100000000) {
        const oku = value / 100000000;
        return `${oku.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}億円`;
    }
    if (absValue >= 10000) {
        const man = value / 10000;
        return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}万円`;
    }
    return `${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}円`;
};

const formatChangeCurrency = (value: number) => {
    const formatted = formatCurrency(value);
    if (value > 0) {
        return `+${formatted}`;
    }
    return formatted;
};

const formatTooltipDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.replace(/-/g, '/').split(/[ T]/)[0];
  const parts = cleanStr.split('/');
  if (parts.length >= 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}/${month}/${day}`; // 2026/05/31
  }
  return dateStr;
};

const CategoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const assetPayload = payload.filter((p: any) => p.dataKey !== '純資産' && p.dataKey !== '純資産変動' && p.dataKey !== AssetType.Liability);
    
    // Sum only the displayed components for the "Total" in tooltip to match visual stack
    const totalDisplayed = assetPayload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);
    
    // Retrieve original raw data values from payload[0].payload
    const rawDataPoint = payload[0]?.payload;
    const netWorthValue = rawDataPoint ? Number(rawDataPoint['純資産']) : 0;
    const changeValue = rawDataPoint ? Number(rawDataPoint['純資産変動']) : 0;

    return (
      <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{formatTooltipDate(label)}</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {assetPayload.slice().reverse().map((entry: any) => (
             <div key={entry.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-100 ml-2 font-mono tabular-nums">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(entry.value)}円</span>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-bold mb-1">
                <span className="text-gray-800 dark:text-gray-200">現物資産合計:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono tabular-nums">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(totalDisplayed)}円</span>
            </div>
            {rawDataPoint && (
                <div className="flex flex-col border-t border-dashed border-gray-200 dark:border-gray-600 pt-1.5 mt-1.5 gap-1">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-800 dark:text-gray-200">
                        <span>純資産:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono tabular-nums">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(netWorthValue)}円</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-orange-600 dark:text-orange-400">
                        <span>純資産変動 (右軸):</span>
                        <span className="font-mono tabular-nums">
                            {changeValue > 0 ? '+' : ''}{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(changeValue)}円
                        </span>
                    </div>
                </div>
            )}
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
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{formatTooltipDate(label)}</p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {sortedPayload.map((entry: any) => (
               <div key={entry.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-gray-600 dark:text-gray-300 max-w-[150px] truncate" title={entry.name}>{entry.name}:</span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 ml-2 font-mono tabular-nums">{new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(entry.value)}円</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

const parseSafeDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  
  // 1. Try parsing directly
  let d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;
  
  // 2. Handle space separated dates -> T separated ISO dates (e.g. "2026-05-31 20:15:06" -> "2026-05-31T20:15:06")
  if (cleanStr.includes(' ')) {
    const isoStr = cleanStr.replace(' ', 'T');
    d = new Date(isoStr);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 3. Keep pure YYYY-MM-DD on Local timezone (hyphens replacement to slashes helps cross-browser consistency)
  if (cleanStr.includes('-') && !cleanStr.includes('T')) {
    const slashStr = cleanStr.replace(/-/g, '/');
    d = new Date(slashStr);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Manual parsing fallback
  const match = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
};

const parseSafeNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  if (typeof val === 'string') {
    const cleaned = val.replace(/[,¥円\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
};

interface AssetTrendChartProps {
  data: AssetHistoryByCategoryPoint[];
  selectedAsset?: { name: string, timestamp: number } | null;
}

const AssetTrendChart: React.FC<AssetTrendChartProps> = ({ data, selectedAsset }) => {
  type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
  const [viewMode, setViewMode] = useState<'category' | 'individual'>('category');
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
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
            const safeVal = parseSafeNumber(entry[key]);
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

        const marginStocksValue = parseSafeNumber(entry[AssetType.MarginStocks]);
        const leveragedFxValue = parseSafeNumber(entry[AssetType.LeveragedFX]);
        const liabilityValue = parseSafeNumber(entry[AssetType.Liability]);
        
        newEntry[AssetType.Liability] = liabilityValue;
        newEntry['純資産'] = totalPositiveAssets + marginStocksValue + leveragedFxValue + liabilityValue;

        return newEntry;
    });

    return { processedData: processed, categoryKeys: detectedCategoryKeys, individualKeys: detectedIndividualKeys };
  }, [data, isDataValid]);

  // Filter processedData based on selected time range
  const filteredData = useMemo(() => {
    if (timeRange === 'ALL') return processedData;
    if (processedData.length === 0) return processedData;

    try {
      const latestDateStr = processedData[processedData.length - 1].date as string;
      if (!latestDateStr) return processedData;

      const refDate = parseSafeDate(latestDateStr);
      if (!refDate) {
        console.warn('Could not parse latest date reference:', latestDateStr);
        return processedData;
      }

      const limitDate = new Date(refDate.getTime());

      if (timeRange === '1M') {
        limitDate.setMonth(refDate.getMonth() - 1);
      } else if (timeRange === '3M') {
        limitDate.setMonth(refDate.getMonth() - 3);
      } else if (timeRange === '6M') {
        limitDate.setMonth(refDate.getMonth() - 6);
      } else if (timeRange === '1Y') {
        limitDate.setFullYear(refDate.getFullYear() - 1);
      } else if (timeRange === 'YTD') {
        const currentYear = refDate.getFullYear();
        const ytdLimitTime = new Date(currentYear, 0, 1).getTime();
        return processedData.filter(d => {
          const dDate = parseSafeDate(d.date as string);
          return dDate !== null && dDate.getTime() >= ytdLimitTime;
        });
      }

      const limitTime = limitDate.getTime();
      return processedData.filter(d => {
        const dDate = parseSafeDate(d.date as string);
        return dDate !== null && dDate.getTime() >= limitTime;
      });
    } catch (e) {
      console.error('Error filtering trend data:', e);
      return processedData;
    }
  }, [processedData, timeRange]);

  // Compute fluctuation (variation) relative to the start of the selected period
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const firstNetWorth = filteredData[0]['純資産'] as number ?? 0;
    return filteredData.map(d => ({
      ...d,
      純資産変動: (d['純資産'] as number ?? 0) - firstNetWorth,
    }));
  }, [filteredData]);

  const formatXAxisDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.replace(/-/g, '/').split(/[ T]/)[0];
    const parts = cleanStr.split('/');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      const isFirstDate = filteredData[0]?.date === dateStr;
      let isYearChange = false;
      const index = filteredData.findIndex(d => d.date === dateStr);
      if (index > 0) {
        const prevDateStr = filteredData[index - 1]?.date as string;
        if (prevDateStr) {
          const prevYear = prevDateStr.replace(/-/g, '/').split('/')[0];
          isYearChange = prevYear !== year;
        }
      }
      
      const formattedYear = year.slice(-2);
      if (isFirstDate || isYearChange || month === 1) {
        return `${month}/${day} '${formattedYear}`;
      }
      return `${month}/${day}`;
    }
    return dateStr;
  };

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
            const sortedKeys = individualKeys.sort((a, b) => parseSafeNumber(latestData[b]) - parseSafeNumber(latestData[a]));
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
          <p className="text-gray-500 dark:text-gray-400">{isOldFormat ? "カテゴリー別の履歴データ形式に更新してください。" : "履歴データがありません。"}</p>
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
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">資産推移</h3>
        
        <div className="flex flex-wrap items-center gap-2">
            {/* Time Range Filter Group */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
                {(['1M', '3M', '6M', '1Y', 'YTD', 'ALL'] as TimeRange[]).map((range) => {
                    const labelMap: Record<TimeRange, string> = {
                        '1M': '1ヶ月',
                        '3M': '3ヶ月',
                        '6M': '6ヶ月',
                        '1Y': '1年',
                        'YTD': '年初来',
                        'ALL': '全期間'
                    };
                    return (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-2 py-1 text-xs font-semibold rounded transition-all ${timeRange === range ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                        >
                            {labelMap[range]}
                        </button>
                    );
                })}
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1 shrink-0">
                <button 
                    onClick={() => setViewMode('category')} 
                    className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${viewMode === 'category' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                    カテゴリー別
                </button>
                <button 
                    onClick={() => setViewMode('individual')} 
                    className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${viewMode === 'individual' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                    銘柄別
                </button>
            </div>
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
                     履歴データに個別銘柄の情報が含まれていません。スプレッドシートの履歴シートに銘柄ごとの列を追加すると、ここにグラフが表示されます。
                 </div>
             )}
          </div>
      )}

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            {viewMode === 'category' ? (
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                    <XAxis dataKey="date" tickFormatter={formatXAxisDate} stroke="rgb(156 163 175)" fontSize={12} tick={{ dy: 5 }} />
                    <YAxis yAxisId="left" tickFormatter={formatCurrency} stroke="rgb(156 163 175)" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={formatChangeCurrency} stroke="rgb(156 163 175)" fontSize={12} />
                    <Tooltip content={<CategoryTooltip />} />
                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                    
                    {activeCategoryKeys.map((key) => (
                        <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            yAxisId="left"
                            stackId="positiveAssets"
                            stroke={CATEGORY_COLORS[key] || '#8884d8'}
                            fill={CATEGORY_COLORS[key] || '#8884d8'}
                            name={key}
                        />
                    ))}
                    <Line
                        type="monotone"
                        dataKey="純資産変動"
                        yAxisId="right"
                        stroke="#FF5722"
                        strokeWidth={3}
                        dot={{ r: 1 }}
                        activeDot={{ r: 4 }}
                        name="純資産変動 (右軸)"
                    />
                </ComposedChart>
            ) : (
                 <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                    <XAxis dataKey="date" tickFormatter={formatXAxisDate} stroke="rgb(156 163 175)" fontSize={12} tick={{ dy: 5 }} />
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
