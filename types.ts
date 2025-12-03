
export enum AssetType {
  Cash = '現金・預金',
  Stocks = '株式(現物)',
  MarginStocks = '株式(信用)',
  SpotFX = 'FX(現物)',
  LeveragedFX = 'FX(レバレッジ)',
  InvestmentTrust = '投資信託',
  Crypto = '暗号資産',
  Bonds = '債券',
  RealEstate = '不動産',
  DC = 'DC年金',
  Other = 'その他資産',
  Liability = '負債',
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  account?: string;
  owner?: string;
  tickerSymbol?: string;
  currentPrice?: number;
  dayChange?: number;
  shares?: number;
  avgPurchasePrice?: number;
  purchaseAmount?: number;
  profitOrLoss?: number;
  profitOrLossRate?: number;
}

export interface AssetHistoryByCategoryPoint {
  date: string;
  [category: string]: string | number;
}