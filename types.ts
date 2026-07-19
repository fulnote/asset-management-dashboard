
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

export interface LifeEvent {
  id: string;
  name: string;
  age: number;
  cost: number;
  type: 'expense' | 'income';
}

export interface SimulationParam {
  currentAge: number;
  retireAge: number;
  lifeExpectancy: number;
  annualIncome: number;
  annualLivingCost: number;
  retireLivingCost: number;
  annualHousingCost: number; // 年間家賃・住居費(現役)
  retireHousingCost: number; // 年間家賃・住居費(老後)
  annualPension: number;
  pensionStartAge: number;
  initialAssets: number;
  investmentYield: number;
  inflationRate: number;
  events: LifeEvent[];
}

export interface YearSimulationResult {
  year: number;
  age: number;
  income: number;
  pension: number;
  livingCost: number;
  housingCost: number; // 年間家賃・住居費
  eventCost: number;
  investmentGain: number;
  endAssets: number;
  endAssetsNominal: number;
  endAssetsNoInvestment: number;
}
