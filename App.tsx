
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Asset, AssetType, AssetHistoryByCategoryPoint } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import UrlSetup from './components/UrlSetup';
import { LifePlanSimulator } from './components/LifePlanSimulator';

const safeParseFloat = (val: any): number => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return val;
  
  let str = val.toString().trim();
  // ▲ や △ をマイナス記号に変換
  str = str.replace(/^[▲△]/, '-');
  // (1,234) などのカッコで囲まれた負数を -1234 に変換
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }
  
  // カンマ、通貨記号、円マークなどを取り除いて数値のみにする
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? NaN : parsed;
};

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [historyByCategory, setHistoryByCategory] = useState<AssetHistoryByCategoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lifeplan'>('dashboard');
  const [lifePlanParams, setLifePlanParams] = useState<any>(null);
  const [lifeEvents, setLifeEvents] = useState<any[]>([]);
  
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
          .map((rawAsset: any) => {
            if (!rawAsset) return null;
            const asset: any = {};
            Object.keys(rawAsset).forEach((key) => {
              const k = key.trim().toLowerCase();
              const val = rawAsset[key];
              if (k === 'name' || k === '資産名' || k === '名前' || k === '銘柄名' || k === '銘柄' || k === '品名') {
                asset.name = val;
              } else if (k === 'type' || k === '種類' || k === '資産タイプ' || k === 'タイプ' || k === 'アセットクラス' || k === 'カテゴリ') {
                asset.type = val;
              } else if (k === 'value' || k === '評価額' || k === '残高' || k === '金額' || k === '評価残高') {
                asset.value = val;
              } else if (k === 'shares' || k === '数量' || k === '保有数量' || k === '口数' || k === '株数') {
                asset.shares = val;
              } else if (k === 'avgpurchaseprice' || k === '平均取得価格' || k === '平均取得単価' || k === '取得単価' || k === '平均単価' || k === '取得価格') {
                asset.avgPurchasePrice = val;
              } else if (k === 'currentprice' || k === '現在価格' || k === '現在単価' || k === '現在値' || k === '時価') {
                asset.currentPrice = val;
              } else if (k === 'account' || k === '口座' || k === '口座区分' || k === '金融機関' || k === '口座名') {
                asset.account = val;
              } else if (k === 'owner' || k === '保有者' || k === '名義人' || k === '所有者') {
                asset.owner = val;
              } else if (k === 'tickersymbol' || k === 'ティッカー' || k === 'シンボル' || k === 'コード' || k === 'ティッカーシンボル') {
                asset.tickerSymbol = val;
              } else if (k === 'daychange' || k === '前日比' || k === '前日比額' || k === '前日差') {
                asset.dayChange = val;
              } else if (k === 'profitorloss' || k === '評価損益' || k === '損益' || k === '含み損益' || k === '評価損益額' || k === 'pl' || k === 'gain') {
                asset.profitOrLoss = val;
              } else if (k === 'profitorlossrate' || k === '評価損益率' || k === '損益率' || k === 'plrate') {
                asset.profitOrLossRate = val;
              } else {
                asset[key] = val;
              }
            });

            // Fallbacks in case keys were already mapped or slightly different
            if (rawAsset.name && !asset.name) asset.name = rawAsset.name;
            if (rawAsset.type && !asset.type) asset.type = rawAsset.type;
            if (rawAsset.value !== undefined && asset.value === undefined) asset.value = rawAsset.value;

            // 資産タイプの正規化 (日本語/英語の表記ブレを吸収)
            if (asset.type) {
              const t = asset.type.toString().trim();
              if (/^現金|^預金|^キャッシュ|^cash/i.test(t)) asset.type = AssetType.Cash;
              else if (/^株式\(現物\)|^株式|^現物株|^米国株|^日本株|^stocks|^stock/i.test(t)) asset.type = AssetType.Stocks;
              else if (/^株式\(信用\)|^信用取引|^信用株|^margin/i.test(t)) asset.type = AssetType.MarginStocks;
              else if (/^FX\(現物\)|^fx現物/i.test(t)) asset.type = AssetType.SpotFX;
              else if (/^FX\(レバレッジ\)|^fx|^レバfx|^forex/i.test(t)) asset.type = AssetType.LeveragedFX;
              else if (/^投資信託|^投信|^インデックス|^mutual|^fund/i.test(t)) asset.type = AssetType.InvestmentTrust;
              else if (/^暗号資産|^仮想通貨|^ビットコイン|^crypto/i.test(t)) asset.type = AssetType.Crypto;
              else if (/^債券|^国債|^社債|^bond/i.test(t)) asset.type = AssetType.Bonds;
              else if (/^不動産|^マンション|^realestate|^real/i.test(t)) asset.type = AssetType.RealEstate;
              else if (/^DC|^確定拠出年金|^ideco|^イデコ/i.test(t)) asset.type = AssetType.DC;
              else if (/^負債|^借入|^ローン|^liability|^debt/i.test(t)) asset.type = AssetType.Liability;
              else if (/^その他/i.test(t)) asset.type = AssetType.Other;
              else {
                const exactMatch = Object.values(AssetType).find(v => v === t);
                if (exactMatch) asset.type = exactMatch;
                else asset.type = AssetType.Other;
              }
            } else {
              asset.type = AssetType.Other;
            }

            return asset;
          })
          .filter((asset: any) => asset && asset.name) // Filter out empty rows
          .map((asset: any, index: number) => {
            const shares = safeParseFloat(asset.shares);
            const avgPurchasePrice = safeParseFloat(asset.avgPurchasePrice);
            const currentPrice = safeParseFloat(asset.currentPrice);
            const value = safeParseFloat(asset.value); // スプレッドシートの値をそのまま使用

            const baseAsset = {
                ...asset,
                id: `${asset.name}-${index}`, // Create a stable ID
                value: isNaN(value) ? 0 : value,
                shares: isNaN(shares) ? undefined : shares,
                avgPurchasePrice: isNaN(avgPurchasePrice) ? undefined : avgPurchasePrice,
                currentPrice: isNaN(currentPrice) ? undefined : currentPrice,
            };
            
            // 評価損益の処理。スプレッドシートから評価損益がすでに取得できている場合はその値をそのまま採用
            let profitOrLoss = safeParseFloat(asset.profitOrLoss);
            let profitOrLossRate = safeParseFloat(asset.profitOrLossRate);
            const purchaseAmount = (baseAsset.shares != null && baseAsset.avgPurchasePrice != null) 
              ? baseAsset.shares * baseAsset.avgPurchasePrice 
              : NaN;

            const investableAssetTypes = [AssetType.Stocks, AssetType.MarginStocks, AssetType.LeveragedFX, AssetType.SpotFX, AssetType.InvestmentTrust, AssetType.Crypto];
            
            // スプレッドシートに評価損益が定義されていない（NaN）場合のみ、React側でフォールバック計算
            if (isNaN(profitOrLoss) && investableAssetTypes.includes(baseAsset.type) && !isNaN(purchaseAmount)) {
                if ([AssetType.Stocks, AssetType.SpotFX, AssetType.InvestmentTrust, AssetType.Crypto].includes(baseAsset.type)) {
                    profitOrLoss = baseAsset.value - purchaseAmount;
                } else { // MarginStocks or LeveragedFX
                    profitOrLoss = baseAsset.value;
                }
                
                if (isNaN(profitOrLossRate)) {
                    profitOrLossRate = purchaseAmount !== 0 ? profitOrLoss / purchaseAmount : 0;
                }
            }

            return { 
                ...baseAsset, 
                purchaseAmount: isNaN(purchaseAmount) ? undefined : purchaseAmount, 
                profitOrLoss: isNaN(profitOrLoss) ? undefined : profitOrLoss, 
                profitOrLossRate: isNaN(profitOrLossRate) ? undefined : profitOrLossRate 
            };
          });
        
        setAssets(processedAssets as Asset[]);
        // Support both old and new history sheet for backward compatibility during transition
        setHistoryByCategory(data.historyByCategory || data.history || []);
        
        // Load life plan parameters and life events if available
        if (data.lifePlanParams) {
          setLifePlanParams(data.lifePlanParams);
        }
        if (Array.isArray(data.lifeEvents)) {
          setLifeEvents(data.lifeEvents);
        }
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

  const totalAssets = useMemo(() => {
    // 資産シートのD列(Value)をすべて単純に合計します（負債などのマイナス値も含めてそのまま合計）
    return assets.reduce((sum, a) => sum + (a.value ?? 0), 0);
  }, [assets]);

  const totalLiabilities = useMemo(() => {
    return assets
      .filter(a => a.type === AssetType.Liability)
      .reduce((sum, a) => sum + (a.value ?? 0), 0);
  }, [assets]);

  const netWorth = totalAssets;
  
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <main className="p-2 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {activeTab === 'dashboard' ? (
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
        ) : (
          <LifePlanSimulator 
            initialAssetsFromDashboard={netWorth} 
            fetchedParams={lifePlanParams}
            fetchedEvents={lifeEvents}
          />
        )}
      </main>
    </div>
  );
};

export default App;
