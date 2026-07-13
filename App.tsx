
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Asset, AssetType, AssetHistoryByCategoryPoint } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import UrlSetup from './components/UrlSetup';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [historyByCategory, setHistoryByCategory] = useState<AssetHistoryByCategoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string | null>(() => {
    return localStorage.getItem('googleScriptUrl');
  });

  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('spreadsheetUrl');
  });

  useEffect(() => {
    if (googleScriptUrl) {
      localStorage.setItem('googleScriptUrl', googleScriptUrl);
    } else {
      localStorage.removeItem('googleScriptUrl');
    }
  }, [googleScriptUrl]);

  useEffect(() => {
    if (spreadsheetUrl) {
      localStorage.setItem('spreadsheetUrl', spreadsheetUrl);
    } else {
      localStorage.removeItem('spreadsheetUrl');
    }
  }, [spreadsheetUrl]);

  const fetchData = useCallback(async () => {
    if (!googleScriptUrl) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(googleScriptUrl);
      if (!response.ok) {
        throw new Error(`データの取得に失敗しました (HTTPステータス: ${response.status})`);
      }
      const data = await response.json();
      
      if (data && Array.isArray(data.assets) && (Array.isArray(data.history) || Array.isArray(data.historyByCategory))) {
        const processedAssets = data.assets
          .filter((asset: any) => asset && asset.name) // Filter out empty rows
          .map((asset: any, index: number) => {
            const shares = parseFloat(asset.shares);
            const avgPurchasePrice = parseFloat(asset.avgPurchasePrice);
            const currentPrice = parseFloat(asset.currentPrice);
            let value = parseFloat(asset.value); // Keep the original value as a fallback

            const hasCalculationData = !isNaN(shares) && !isNaN(currentPrice);

            if (hasCalculationData) {
                if (asset.type === AssetType.MarginStocks || asset.type === AssetType.LeveragedFX) {
                    if (!isNaN(avgPurchasePrice)) {
                        value = (currentPrice - avgPurchasePrice) * shares;
                    }
                } else if ([AssetType.Stocks, AssetType.InvestmentTrust, AssetType.Crypto, AssetType.SpotFX].includes(asset.type)) {
                    value = currentPrice * shares;
                }
            }

            const baseAsset = {
                ...asset,
                id: `${asset.name}-${index}`, // Create a stable ID
                value: isNaN(value) ? 0 : value,
                shares: isNaN(shares) ? undefined : shares,
                avgPurchasePrice: isNaN(avgPurchasePrice) ? undefined : avgPurchasePrice,
                currentPrice: isNaN(currentPrice) ? undefined : currentPrice,
            };
            
            const investableAssetTypes = [AssetType.Stocks, AssetType.MarginStocks, AssetType.LeveragedFX, AssetType.SpotFX, AssetType.InvestmentTrust, AssetType.Crypto];
            if (investableAssetTypes.includes(baseAsset.type) && baseAsset.shares != null && baseAsset.avgPurchasePrice != null) {
                const purchaseAmount = baseAsset.shares * baseAsset.avgPurchasePrice;
                
                let profitOrLoss;
                if ([AssetType.Stocks, AssetType.SpotFX, AssetType.InvestmentTrust, AssetType.Crypto].includes(baseAsset.type)) {
                    profitOrLoss = baseAsset.value - purchaseAmount;
                } else { // MarginStocks or LeveragedFX
                    profitOrLoss = baseAsset.value;
                }
                
                const profitOrLossRate = purchaseAmount !== 0 ? profitOrLoss / purchaseAmount : 0;
                
                return { 
                    ...baseAsset, 
                    purchaseAmount: isNaN(purchaseAmount) ? undefined : purchaseAmount, 
                    profitOrLoss: isNaN(profitOrLoss) ? undefined : profitOrLoss, 
                    profitOrLossRate: isNaN(profitOrLossRate) ? undefined : profitOrLossRate 
                };
            }

            return baseAsset;
          });
        
        setAssets(processedAssets as Asset[]);
        // Support both old and new history sheet for backward compatibility during transition
        setHistoryByCategory(data.historyByCategory || data.history || []);
      } else {
        throw new Error('スプレッドシートから取得したデータの形式が正しくありません。');
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(`エラーが発生しました: ${e.message}。URLが正しいか、スプレッドシートが正しく共有設定されているか確認してください。`);
      } else {
        setError('不明なエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [googleScriptUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettingsSubmit = (scriptUrl: string, sheetUrl: string) => {
    setGoogleScriptUrl(scriptUrl);
    setSpreadsheetUrl(sheetUrl);
    setIsConfiguring(false);
  };

  const handleEnterConfigMode = () => {
    setIsConfiguring(true);
  };
  
  const handleCancelConfig = () => {
    setIsConfiguring(false);
  }

  const handleRefresh = () => {
    fetchData();
  };

  const totalAssets = useMemo(() => assets.filter(a => a.type !== AssetType.Liability).reduce((sum, a) => sum + a.value, 0), [assets]);
  const totalLiabilities = useMemo(() => assets.filter(a => a.type === AssetType.Liability).reduce((sum, a) => sum + a.value, 0), [assets]);
  const netWorth = totalAssets + totalLiabilities;
  
  const totalProfitOrLoss = useMemo(() => {
      return assets.reduce((sum, asset) => sum + (asset.profitOrLoss ?? 0), 0);
  }, [assets]);

  const totalInvestmentAmount = useMemo(() => {
    return assets
      .filter(a => a.purchaseAmount != null && 
        [
          AssetType.Stocks, 
          AssetType.MarginStocks, 
          AssetType.SpotFX, 
          AssetType.LeveragedFX,
          AssetType.InvestmentTrust,
          AssetType.Crypto
        ].includes(a.type)
      )
      .reduce((sum, a) => sum + a.purchaseAmount!, 0);
  }, [assets]);
  
  const totalProfitOrLossRate = useMemo(() => {
    // 投資元本が0または無効な数値の場合は、損益率も0として扱う
    if (isNaN(totalInvestmentAmount) || totalInvestmentAmount === 0) {
      return 0;
    }
    return totalProfitOrLoss / totalInvestmentAmount;
  }, [totalInvestmentAmount, totalProfitOrLoss]);
  
  const assetBreakdown = useMemo(() => {
    const breakdownMap = new Map<string, number>();

    assets
      .filter(asset => asset.type !== AssetType.Liability)
      .forEach(asset => {
        const valueForBreakdown = asset.value;
        
        // Only include positive values in the pie chart to avoid rendering issues.
        if (valueForBreakdown > 0) {
          const currentTotal = breakdownMap.get(asset.type) ?? 0;
          breakdownMap.set(asset.type, currentTotal + valueForBreakdown);
        }
      });
      
    return Array.from(breakdownMap.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);
  
  if (!googleScriptUrl || isConfiguring) {
    return (
        <UrlSetup 
            onSettingsSubmit={handleSettingsSubmit} 
            initialScriptUrl={googleScriptUrl || ''}
            initialSheetUrl={spreadsheetUrl || ''}
            onCancel={googleScriptUrl ? handleCancelConfig : undefined}
        />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 animate-pulse">データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl">
          <h2 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-4">データ取得エラー</h2>
          <p className="text-gray-700 dark:text-gray-300 break-words">{error}</p>
          <button
            onClick={handleEnterConfigMode}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            設定を確認する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Header 
        onResetUrl={handleEnterConfigMode} 
        onRefresh={handleRefresh} 
        spreadsheetUrl={spreadsheetUrl}
      />
      <main className="p-2 sm:p-6 lg:p-8">
        <Dashboard
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          netWorth={netWorth}
          totalProfitOrLoss={totalProfitOrLoss}
          totalProfitOrLossRate={totalProfitOrLossRate}
          assetHistory={historyByCategory}
          assetBreakdown={assetBreakdown}
          assets={assets}
        />
      </main>
    </div>
  );
};

export default App;
