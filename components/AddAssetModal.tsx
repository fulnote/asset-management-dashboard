
import React, { useState, useEffect } from 'react';
import { Asset, AssetType } from '../types';

type AssetForSave = Omit<Asset, 'id' | 'purchaseAmount' | 'profitOrLoss' | 'profitOrLossRate'> & { id?: string };

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: AssetForSave) => void;
  assetToEdit: Asset | null;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSave, assetToEdit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>(AssetType.Cash);
  const [value, setValue] = useState('');
  const [account, setAccount] = useState('');
  const [owner, setOwner] = useState('');
  const [tickerSymbol, setTickerSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [avgPurchasePrice, setAvgPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isValueCalculated, setIsValueCalculated] = useState(false);


  useEffect(() => {
    if (assetToEdit) {
      setName(assetToEdit.name);
      setType(assetToEdit.type);
      setValue(String(Math.abs(assetToEdit.value)));
      setAccount(assetToEdit.account || '');
      setOwner(assetToEdit.owner || '');
      setTickerSymbol(assetToEdit.tickerSymbol || '');
      setShares(assetToEdit.shares?.toString() || '');
      setAvgPurchasePrice(assetToEdit.avgPurchasePrice?.toString() || '');
      setCurrentPrice(assetToEdit.currentPrice?.toString() || '');
    } else {
      setName('');
      setType(AssetType.Cash);
      setValue('');
      setAccount('');
      setOwner('');
      setTickerSymbol('');
      setShares('');
      setAvgPurchasePrice('');
      setCurrentPrice('');
    }
  }, [assetToEdit, isOpen]);

  useEffect(() => {
    const s = parseFloat(shares);
    const ap = parseFloat(avgPurchasePrice);
    const cp = parseFloat(currentPrice);

    if (!isNaN(s) && !isNaN(cp)) {
        let newValue: number | null = null;
        if (type === AssetType.MarginStocks || type === AssetType.LeveragedFX) {
            if (!isNaN(ap)) {
                newValue = (cp - ap) * s;
            }
        } else if ([AssetType.Stocks, AssetType.InvestmentTrust, AssetType.Crypto, AssetType.SpotFX].includes(type)) {
            newValue = cp * s;
        }

        if (newValue !== null) {
            setValue(String(Math.abs(newValue)));
            setIsValueCalculated(true);
        } else {
            setIsValueCalculated(false);
        }
    } else {
        setIsValueCalculated(false);
    }
}, [shares, avgPurchasePrice, currentPrice, type]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(value);
    if (!name || isNaN(numericValue)) return;
    
    const finalValue = type === AssetType.Liability ? -numericValue : numericValue;
    const isStockOrFxType = [AssetType.Stocks, AssetType.MarginStocks, AssetType.LeveragedFX, AssetType.SpotFX].includes(type);

    const assetData: AssetForSave = {
      ...(assetToEdit || {}),
      name,
      type,
      value: finalValue,
      account,
      owner,
      tickerSymbol: isStockOrFxType ? tickerSymbol : undefined,
      shares: isStockOrFxType && shares ? parseFloat(shares) : undefined,
      avgPurchasePrice: isStockOrFxType && avgPurchasePrice ? parseFloat(avgPurchasePrice) : undefined,
      currentPrice: isStockOrFxType && currentPrice ? parseFloat(currentPrice) : undefined,
    };
    
    if (assetToEdit) {
      assetData.id = assetToEdit.id;
    }

    onSave(assetData);
  };

  if (!isOpen) return null;
  
  const isStockType = type === AssetType.Stocks || type === AssetType.MarginStocks;
  const isLeveragedFxType = type === AssetType.LeveragedFX;
  const isSpotFxType = type === AssetType.SpotFX;
  const showStockFxFields = isStockType || isLeveragedFxType || isSpotFxType;

  const detailsTitle = isLeveragedFxType ? 'FX(レバレッジ)情報' : isSpotFxType ? 'FX(現物)情報' : '株式情報';
  const tickerLabel = isLeveragedFxType || isSpotFxType ? '通貨ペア' : 'ティッカーシンボル';
  const tickerPlaceholder = isLeveragedFxType || isSpotFxType ? '例: USD/JPY' : '';
  const sharesLabel = isLeveragedFxType ? '保有量 (Lot)' : isSpotFxType ? '保有量' : '保有株数';
  const avgPriceLabel = isLeveragedFxType || isSpotFxType ? '平均取得レート' : '平均取得単価';
  const currentPriceLabel = isLeveragedFxType || isSpotFxType ? '現在レート' : '現在の株価';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 my-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          {assetToEdit ? '資産を編集' : '資産を追加'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">資産名</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
               <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssetType)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300">所有者</label>
                <input
                  type="text"
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="夫, 妻, 共通など"
                />
              </div>
              <div>
                <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">口座</label>
                <input
                  type="text"
                  id="account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                   placeholder="A銀行, B証券など"
                />
              </div>
          </div>

          <div className="mb-4">
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">評価額</label>
            <input
              type="number"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-600"
              placeholder={isValueCalculated ? "情報から自動計算されます" : "例: 1000000"}
              required
              disabled={isValueCalculated}
              step="any"
            />
          </div>
          
          {showStockFxFields && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{detailsTitle}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="tickerSymbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tickerLabel}</label>
                    <input
                      type="text"
                      id="tickerSymbol"
                      value={tickerSymbol}
                      onChange={(e) => setTickerSymbol(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={tickerPlaceholder}
                    />
                  </div>
                 <div>
                    <label htmlFor="shares" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{sharesLabel}</label>
                    <input
                      type="number"
                      id="shares"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      step="any"
                    />
                  </div>
                  <div>
                    <label htmlFor="avgPurchasePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{avgPriceLabel}</label>
                    <input
                      type="number"
                      id="avgPurchasePrice"
                      value={avgPurchasePrice}
                      onChange={(e) => setAvgPurchasePrice(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      step="any"
                    />
                  </div>
                   <div>
                    <label htmlFor="currentPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{currentPriceLabel}</label>
                    <input
                      type="number"
                      id="currentPrice"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="スプレッドシートからも反映"
                      step="any"
                    />
                  </div>
              </div>
            </div>
          )}


          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;