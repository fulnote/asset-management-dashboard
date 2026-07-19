import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { SimulationParam, LifeEvent, YearSimulationResult } from '../types';

interface LifePlanSimulatorProps {
  initialAssetsFromDashboard: number;
  fetchedParams?: any;
  fetchedEvents?: any[];
}

const getValueByKeys = (item: any, possibleKeys: string[], defaultVal: any): any => {
  if (!item) return defaultVal;
  
  // 1. Exact match
  for (const k of possibleKeys) {
    if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
      return item[k];
    }
  }
  
  // 2. Fuzzy match (ignore spaces, lowercase, half/full width)
  const itemKeys = Object.keys(item);
  const normalize = (s: string) => s.toString().trim().toLowerCase().replace(/[\s\t\r\n]/g, '');
  
  const normalizedPossibleKeys = possibleKeys.map(normalize);
  
  for (const itemKey of itemKeys) {
    const normItemKey = normalize(itemKey);
    const idx = normalizedPossibleKeys.indexOf(normItemKey);
    if (idx !== -1) {
      if (item[itemKey] !== undefined && item[itemKey] !== null && item[itemKey] !== '') {
        return item[itemKey];
      }
    }
  }
  
  return defaultVal;
};

const parseAmountWithUnit = (val: any, defaultVal: number = 0): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  
  let str = val.toString().trim().replace(/,/g, '');
  if (str === '') return defaultVal;

  // Remove currency symbols
  str = str.replace(/[¥￥円]/g, '');

  let amount = 0;
  let hasUnit = false;
  
  // Handle "億" (hundred million)
  if (str.includes('億')) {
    hasUnit = true;
    const parts = str.split('億');
    const okuVal = parseFloat(parts[0].replace(/[^0-9.-]/g, ''));
    if (!isNaN(okuVal)) {
      amount += okuVal * 100000000;
    }
    str = parts[1] || '';
  }
  
  // Handle "万" (ten thousand)
  if (str.includes('万')) {
    hasUnit = true;
    const parts = str.split('万');
    const manVal = parseFloat(parts[0].replace(/[^0-9.-]/g, ''));
    if (!isNaN(manVal)) {
      amount += manVal * 10000;
    }
    str = parts[1] || '';
  }
  
  // Parse remaining numeric value
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  if (cleanStr !== '') {
    const remaining = parseFloat(cleanStr);
    if (!isNaN(remaining)) {
      if (hasUnit) {
        amount += remaining;
      } else {
        // If there are no units and the number is small (e.g., under 30,000), 
        // it is highly likely written in "万円" units (e.g., "300" for 3M JPY).
        // Standard large amounts like "3000000" are kept as raw Yen.
        if (remaining > 0 && remaining < 30000) {
          amount = remaining * 10000;
        } else {
          amount = remaining;
        }
      }
    }
  } else if (!hasUnit) {
    return defaultVal;
  }
  
  return amount;
};

const mapFetchedParams = (fetched: any, initialAssets: number): Partial<SimulationParam> => {
  if (!fetched) return {};
  
  const getVal = (keys: string[], defaultVal: number): number => {
    const raw = getValueByKeys(fetched, keys, undefined);
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = parseFloat(raw.toString().replace(/[,%円]/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return defaultVal;
  };

  const getAmountVal = (keys: string[], defaultVal: number): number => {
    const raw = getValueByKeys(fetched, keys, undefined);
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = parseAmountWithUnit(raw, -1);
      if (parsed !== -1) return parsed;
    }
    return defaultVal;
  };

  return {
    currentAge: getVal(['現在年齢', 'currentAge', 'current_age', '年齢'], 35),
    retireAge: getVal(['退職年齢', 'retireAge', 'retire_age', '退職予定年齢', '退職', '引退年齢', '退職時期'], 65),
    lifeExpectancy: getVal(['想定寿命', 'lifeExpectancy', 'life_expectancy', '寿命', '目標寿命'], 90),
    annualIncome: getAmountVal(['年間収入(手取り)', '年間収入', 'annualIncome', 'annual_income', '収入', '手取り収入', '手取り'], 6000000),
    annualLivingCost: getAmountVal(['年間生活費(現役)', '現役生活費', 'annualLivingCost', 'annual_living_cost', '生活費', '現役の生活費'], 3600000),
    retireLivingCost: getAmountVal(['年間生活費(老後)', '老後生活費', 'retireLivingCost', 'retire_living_cost', 'リタイア後生活費', '老後の生活費'], 2400000),
    annualPension: getAmountVal(['年金受給額(年間)', '受給年金', 'annualPension', 'annual_pension', '年金', '受給年金額', '受給開始年金'], 1800000),
    pensionStartAge: getVal(['年金受給開始年齢', '受給開始年齢', 'pensionStartAge', 'pension_start_age', '年金開始', '年金開始年齢'], 65),
    initialAssets: initialAssets || 5000000,
    investmentYield: getVal(['期待運用利回り(%)', '利回り', 'investmentYield', 'investment_yield', '運用利回り', '期待利回り', '年利'], 3.0),
    inflationRate: getVal(['想定インフレ率(%)', 'インフレ率', 'inflationRate', 'inflation_rate', 'インフレ'], 1.0),
  };
};

const mapFetchedEvents = (fetchedArray: any[]): LifeEvent[] => {
  if (!Array.isArray(fetchedArray) || fetchedArray.length === 0) return [];
  return fetchedArray.map((item, idx) => {
    const rawAge = getValueByKeys(item, ['年齢', 'age', '発生年齢', '発生時期', '時期'], 40);
    const age = parseInt(rawAge.toString().replace(/[^0-9.-]/g, ''));
    
    const name = getValueByKeys(item, ['イベント名', 'name', 'イベント', '収支内容', '内容', '項目'], `イベント ${idx + 1}`);
    
    const rawCost = getValueByKeys(item, ['金額', 'cost', '収支金額', '費用', '支出', '収入金額', '予算'], '');
    const cost = parseAmountWithUnit(rawCost, 0);
    
    const rawType = getValueByKeys(item, ['区分', 'type', '収支タイプ', 'カテゴリ', '分類'], 'expense');
    const type = (rawType.toString().includes('収') || rawType.toString() === 'income' || rawType.toString() === '収入') ? 'income' : 'expense' as const;

    return {
      id: `sheet-${idx}`,
      name,
      age: isNaN(age) ? 40 : age,
      cost: cost,
      type: type as 'expense' | 'income',
    };
  }).sort((a, b) => a.age - b.age);
};

export const LifePlanSimulator: React.FC<LifePlanSimulatorProps> = ({ 
  initialAssetsFromDashboard,
  fetchedParams,
  fetchedEvents
}) => {
  // 1. Simulation Parameters State
  const [param, setParam] = useState<SimulationParam>({
    currentAge: 35,
    retireAge: 65,
    lifeExpectancy: 90,
    annualIncome: 6000000,
    annualLivingCost: 3600000,
    retireLivingCost: 2400000,
    annualPension: 1800000,
    pensionStartAge: 65,
    initialAssets: initialAssetsFromDashboard || 5000000,
    investmentYield: 3.0,
    inflationRate: 1.0,
    events: [
      { id: '1', name: '住宅購入（頭金など）', age: 40, cost: 5000000, type: 'expense' },
      { id: '2', name: '子供の教育費（高校・大学等）', age: 45, cost: 3000000, type: 'expense' },
      { id: '3', name: '車の買い替え', age: 55, cost: 2500000, type: 'expense' },
      { id: '4', name: '退職金（臨時収入）', age: 65, cost: 10000000, type: 'income' },
      { id: '5', name: '夫婦で世界旅行', age: 70, cost: 2000000, type: 'expense' },
    ],
  });

  // 2. Local State for UI Inputs (Temporary, synced to main param)
  const [editingParam, setEditingParam] = useState<SimulationParam>({ ...param });
  const [isSyncingDashboard, setIsSyncingDashboard] = useState(false);
  const [isUsingSpreadsheetData, setIsUsingSpreadsheetData] = useState(false);

  // Sync with fetched Spreadsheet data if available
  useEffect(() => {
    if (fetchedParams || (fetchedEvents && fetchedEvents.length > 0)) {
      const mappedP = mapFetchedParams(fetchedParams, initialAssetsFromDashboard);
      const mappedE = mapFetchedEvents(fetchedEvents || []);
      
      const newParamObj: SimulationParam = {
        currentAge: mappedP.currentAge ?? param.currentAge,
        retireAge: mappedP.retireAge ?? param.retireAge,
        lifeExpectancy: mappedP.lifeExpectancy ?? param.lifeExpectancy,
        annualIncome: mappedP.annualIncome ?? param.annualIncome,
        annualLivingCost: mappedP.annualLivingCost ?? param.annualLivingCost,
        retireLivingCost: mappedP.retireLivingCost ?? param.retireLivingCost,
        annualPension: mappedP.annualPension ?? param.annualPension,
        pensionStartAge: mappedP.pensionStartAge ?? param.pensionStartAge,
        initialAssets: initialAssetsFromDashboard || (mappedP.initialAssets ?? param.initialAssets),
        investmentYield: mappedP.investmentYield ?? param.investmentYield,
        inflationRate: mappedP.inflationRate ?? param.inflationRate,
        events: mappedE.length > 0 ? mappedE : param.events,
      };

      setParam(newParamObj);
      setEditingParam(newParamObj);
      setIsUsingSpreadsheetData(true);
    }
  }, [fetchedParams, fetchedEvents, initialAssetsFromDashboard]);

  const [showSpreadsheetGuide, setShowSpreadsheetGuide] = useState(true);

  // 3. State for adding/editing events
  const [newEvent, setNewEvent] = useState<{ name: string; age: number; cost: number; type: 'expense' | 'income' }>({
    name: '',
    age: 40,
    cost: 1000000,
    type: 'expense',
  });
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // 4. AI Advisor State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  // Sync state helper when basic params change
  const handleParamChange = (key: keyof SimulationParam, value: any) => {
    const updated = { ...editingParam, [key]: value };
    setEditingParam(updated);
    setParam(updated);
  };

  const syncWithDashboard = () => {
    setIsSyncingDashboard(true);
    const updated = { ...editingParam, initialAssets: initialAssetsFromDashboard };
    setEditingParam(updated);
    setParam(updated);
    setTimeout(() => setIsSyncingDashboard(false), 800);
  };

  // Event Handlers
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name.trim()) return;

    const eventToAdd: LifeEvent = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEvent.name,
      age: Math.max(param.currentAge, Math.min(param.lifeExpectancy, newEvent.age)),
      cost: Math.abs(newEvent.cost),
      type: newEvent.type,
    };

    const updatedEvents = [...param.events, eventToAdd].sort((a, b) => a.age - b.age);
    const updated = { ...editingParam, events: updatedEvents };
    setEditingParam(updated);
    setParam(updated);

    // Reset event form
    setNewEvent({
      name: '',
      age: Math.max(param.currentAge, 40),
      cost: 1000000,
      type: 'expense',
    });
    setIsAddingEvent(false);
  };

  const handleDeleteEvent = (id: string) => {
    const updatedEvents = param.events.filter(e => e.id !== id);
    const updated = { ...editingParam, events: updatedEvents };
    setEditingParam(updated);
    setParam(updated);
  };

  // 5. Calculation Engine
  const simulationResults = useMemo<YearSimulationResult[]>(() => {
    const results: YearSimulationResult[] = [];
    const {
      currentAge,
      retireAge,
      lifeExpectancy,
      annualIncome,
      annualLivingCost,
      retireLivingCost,
      annualPension,
      pensionStartAge,
      initialAssets,
      investmentYield,
      inflationRate,
      events,
    } = param;

    const yearsToSimulate = lifeExpectancy - currentAge;
    if (yearsToSimulate <= 0) return [];

    let currentAssetsReal = initialAssets; // インフレ調整後（実質）
    let currentAssetsNominal = initialAssets; // 名目額
    let currentAssetsNoInvestment = initialAssets; // 運用なし

    const yieldRate = investmentYield / 100;
    const infRate = inflationRate / 100;

    for (let i = 0; i <= yearsToSimulate; i++) {
      const age = currentAge + i;
      const year = new Date().getFullYear() + i;

      // 最初の年（0年目）は初期状態
      if (i === 0) {
        results.push({
          year,
          age,
          income: 0,
          pension: 0,
          livingCost: 0,
          eventCost: 0,
          investmentGain: 0,
          endAssets: Math.round(initialAssets),
          endAssetsNominal: Math.round(initialAssets),
          endAssetsNoInvestment: Math.round(initialAssets),
        });
        continue;
      }

      // 1. その年の定常収支の決定
      const isRetired = age >= retireAge;
      const baseIncome = isRetired ? 0 : annualIncome;
      const baseLivingCost = isRetired ? retireLivingCost : annualLivingCost;
      const pensionIncome = (age >= pensionStartAge) ? annualPension : 0;

      // 2. ライフイベントの収支反映
      const yearEvents = events.filter(e => e.age === age);
      let eventExpense = 0;
      let eventIncome = 0;
      yearEvents.forEach(e => {
        if (e.type === 'expense') {
          eventExpense += e.cost;
        } else {
          eventIncome += e.cost;
        }
      });
      const netEventFlow = eventIncome - eventExpense;

      // --- シナリオ A: 資産運用あり・インフレ調整あり（実質） ---
      // 年始の資産
      const startAssetsReal = currentAssetsReal;
      // 運用益（年始資産に対して）
      const investmentGainReal = startAssetsReal > 0 ? startAssetsReal * yieldRate : 0;
      // イベントや生活費・定常収入の合算（名目価値）
      const nominalNetFlow = baseIncome + pensionIncome - baseLivingCost + netEventFlow;
      // 1年間の名目純増（収支＋運用益）
      const nominalYearlyPlus = nominalNetFlow + (startAssetsReal > 0 ? startAssetsReal * yieldRate : 0);
      
      // インフレ調整（翌年の物価上昇による購買力減少）
      // 資産価値 ＝ (前年資産 ＋ 名目上の純増) / (1 ＋ インフレ率)
      // これにより、将来の物価上昇に伴う現金の目減りを厳密にシミュレーションします。
      const endAssetsRealCalc = (startAssetsReal + nominalNetFlow + investmentGainReal) / (1 + infRate);
      currentAssetsReal = Math.max(0, endAssetsRealCalc); // 0円未満にはマイナス計上も可能だが枯渇表現として0をクリップするか、そのままマイナス（借入）とするか
      // リアルでは0以下になったら破産（0でストップ）にする
      currentAssetsReal = endAssetsRealCalc; // マイナスのまま表示する（借金・枯渇の可視化）

      // --- シナリオ B: 資産運用あり・インフレ調整なし（名目・額面） ---
      const startAssetsNominal = currentAssetsNominal;
      const investmentGainNominal = startAssetsNominal > 0 ? startAssetsNominal * yieldRate : 0;
      currentAssetsNominal = startAssetsNominal + investmentGainNominal + nominalNetFlow;

      // --- シナリオ C: 資産運用なし・インフレ調整なし（現預金貯蓄のみ） ---
      const startAssetsNoInv = currentAssetsNoInvestment;
      currentAssetsNoInvestment = startAssetsNoInv + nominalNetFlow;

      results.push({
        year,
        age,
        income: baseIncome,
        pension: pensionIncome,
        livingCost: baseLivingCost,
        eventCost: eventExpense - eventIncome, // 純支出
        investmentGain: Math.round(investmentGainReal),
        endAssets: Math.round(currentAssetsReal),
        endAssetsNominal: Math.round(currentAssetsNominal),
        endAssetsNoInvestment: Math.round(currentAssetsNoInvestment),
      });
    }

    return results;
  }, [param]);

  // 6. Statistics / Milestones
  const stats = useMemo(() => {
    let shortageAge: number | null = null;
    let maxAssets = 0;
    let maxAssetsAge = param.currentAge;

    for (const r of simulationResults) {
      if (r.age === param.currentAge) continue;
      if (r.endAssets < 0 && shortageAge === null) {
        shortageAge = r.age;
      }
      if (r.endAssets > maxAssets) {
        maxAssets = r.endAssets;
        maxAssetsAge = r.age;
      }
    }

    const finalAssets = simulationResults[simulationResults.length - 1]?.endAssets || 0;
    const hasShortage = shortageAge !== null;

    return {
      hasShortage,
      shortageAge,
      maxAssets,
      maxAssetsAge,
      finalAssets,
    };
  }, [simulationResults, param.currentAge]);

  // 7. Request AI Advice from server-side endpoint
  const handleGetAiAdvice = async () => {
    setIsGeneratingAdvice(true);
    setAdviceError(null);
    setAiAdvice(null);

    try {
      const response = await fetch('/api/gemini/lifeplan-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          param,
          hasShortage: stats.hasShortage,
          shortageAge: stats.shortageAge,
          finalAssets: stats.finalAssets,
        }),
      });

      if (!response.ok) {
        throw new Error(`サーバーエラー (HTTPステータス: ${response.status})`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setAiAdvice(data.comment);
    } catch (err: any) {
      console.error(err);
      setAdviceError(err.message || 'AI診断の取得中にエラーが発生しました。');
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  // Helper formats
  const formatYen = (num: number) => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    let result = '';
    if (absNum >= 100000000) {
      const oku = Math.floor(absNum / 100000000);
      const man = Math.round((absNum % 100000000) / 10000);
      result = `${oku}億${man > 0 ? man + '万' : ''}円`;
    } else if (absNum >= 10000) {
      result = `${Math.round(absNum / 10000)}万円`;
    } else {
      result = `${absNum}円`;
    }
    return isNegative ? `-${result}` : result;
  };

  const chartData = useMemo(() => {
    return simulationResults.map(r => ({
      age: `${r.age}歳`,
      '実質資産 (インフレ調整後)': Math.round(r.endAssets / 10000),
      '名目資産 (額面価格)': Math.round(r.endAssetsNominal / 10000),
      '運用なし': Math.round(r.endAssetsNoInvestment / 10000),
    }));
  }, [simulationResults]);

  const cashFlowData = useMemo(() => {
    // 5年おきのキャッシュフローデータをサンプリング
    const sampled: any[] = [];
    for (let i = 0; i < simulationResults.length; i += 5) {
      const r = simulationResults[i];
      if (!r) continue;
      const isRetired = r.age >= param.retireAge;
      const totalIncome = r.income + r.pension;
      const totalExpense = r.livingCost + (r.eventCost > 0 ? r.eventCost : 0);
      
      sampled.push({
        age: `${r.age}歳`,
        '年間収入': Math.round(totalIncome / 10000),
        '年間支出': Math.round(totalExpense / 10000),
      });
    }
    // 最終年齢も必ず追加
    const last = simulationResults[simulationResults.length - 1];
    if (last && (last.age - param.currentAge) % 5 !== 0) {
      sampled.push({
        age: `${last.age}歳`,
        '年間収入': Math.round((last.income + last.pension) / 10000),
        '年間支出': Math.round((last.livingCost + (last.eventCost > 0 ? last.eventCost : 0)) / 10000),
      });
    }
    return sampled;
  }, [simulationResults, param.retireAge]);

  return (
    <div className="space-y-8">
      {/* 1. Header Card with Summary Status */}
      <div id="lifeplan-summary" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">📊</span>
                AIライフプランシミュレーター
              </h2>
              {isUsingSpreadsheetData ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  スプレッドシート連携中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                  ローカルシミュレーション
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              現在の資産残高やライフイベント、利回りを反映した詳細な将来設計。インフレ調整を含め複利効果をシミュレートします。
            </p>
            {isUsingSpreadsheetData && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                ※ スプレッドシートの「ライフプラン設定」および「ライフイベント」シートから自動読込しました。
              </p>
            )}
          </div>
          <button
            onClick={syncWithDashboard}
            disabled={isSyncingDashboard}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-gray-600 cursor-pointer disabled:opacity-50"
          >
            🔄 {isSyncingDashboard ? '同期中...' : 'ダッシュボードの最新資産額を連携'}
          </button>
        </div>

        {/* 📋 スプレッドシート連携診断 & ガイド */}
        <div className="mt-6 border border-blue-100 dark:border-blue-900/40 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 overflow-hidden">
          <button 
            onClick={() => setShowSpreadsheetGuide(!showSpreadsheetGuide)}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>📋</span>
              <span>スプレッドシート連携診断 ＆ 家族構成・教育費設定ガイド</span>
              {!isUsingSpreadsheetData && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 animate-pulse">
                  ⚠️ 要確認
                </span>
              )}
            </div>
            <span className="text-xs text-blue-500">{showSpreadsheetGuide ? '▲ 閉じる' : '▼ 詳しく見る・診断する'}</span>
          </button>

          {showSpreadsheetGuide && (
            <div className="p-4 border-t border-blue-100/50 dark:border-blue-900/30 text-xs text-gray-600 dark:text-gray-300 space-y-4">
              
              {/* 1. 診断ステータス */}
              <div className="bg-white dark:bg-gray-900/60 p-3.5 rounded-lg border border-gray-200/50 dark:border-gray-800">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2.5">
                  🔍 リアルタイムデータ受信ステータス
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-base">{fetchedParams ? '✅' : '⚠️'}</span>
                    <div>
                      <p className="font-bold text-gray-700 dark:text-gray-300">「ライフプラン設定」シートの読込</p>
                      <p className="text-gray-500 mt-0.5">
                        {fetchedParams 
                          ? `成功 (年齢: ${fetchedParams['現在年齢'] || '35'}歳, 収入: ${parseFloat(fetchedParams['年間収入(手取り)'] || 0).toLocaleString()}円 など)` 
                          : '未検出またはデータが空です。シート名が「ライフプラン設定」になっているか、GASを最新に更新してください。'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-base">{(fetchedEvents && fetchedEvents.length > 0) ? '✅' : 'ℹ️'}</span>
                    <div>
                      <p className="font-bold text-gray-700 dark:text-gray-300">「ライフイベント」シートの読込</p>
                      <p className="text-gray-500 mt-0.5">
                        {(fetchedEvents && fetchedEvents.length > 0) 
                          ? `成功 (計 ${fetchedEvents.length} 件の教育費やイベントを検出)` 
                          : '検出されませんでした。シート名「ライフイベント」が存在しない場合、アプリ内蔵のデフォルトのサンプルイベントが使用されます。'}
                      </p>
                    </div>
                  </div>
                </div>

                {!isUsingSpreadsheetData && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                    <p className="font-bold">💡 反映されない時のチェックリスト（最も多い原因）</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1 leading-relaxed text-amber-700 dark:text-amber-400">
                      <li>
                        <strong>Google Apps Script（GAS）が古いまま：</strong>
                        GASの「Code.gs」を最新コードに上書きした後、<strong>「デプロイ」ボタン ＞ 「新しいデプロイ」から「ウェブアプリ」として再度デプロイし、新しいURLをアプリの「設定（歯車）」に貼り直す</strong>必要があります（上書きしただけでは古いバージョンのAPIが動作したままになります）。
                      </li>
                      <li>
                        <strong>シート名が不一致：</strong>
                        スプレッドシートに<strong>「ライフプラン設定」</strong>および<strong>「ライフイベント」</strong>というシート名が正確に作成されているかご確認ください。
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* 2. テンプレートと家族構成・教育費の設定方法 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ライフプラン設定の必須キー */}
                <div className="bg-white dark:bg-gray-900/60 p-3 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1">
                    <span>⚙️</span>
                    <span>1.「ライフプラン設定」シートの推奨フォーマット</span>
                  </h5>
                  <p className="text-gray-500 mb-2">
                    スプレッドシートに「<strong>ライフプラン設定</strong>」という名前のシートを作成し、<strong>A列に「項目名」、B列に「値」</strong>を以下のように入力してください（コピペ推奨）。
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-gray-200 dark:border-gray-800">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">項目名（A列）</th>
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">値（B列の例）</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">現在年齢</td><td className="p-1 border border-gray-200 dark:border-gray-800">35</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">退職年齢</td><td className="p-1 border border-gray-200 dark:border-gray-800">65</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">想定寿命</td><td className="p-1 border border-gray-200 dark:border-gray-800">90</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">年間収入(手取り)</td><td className="p-1 border border-gray-200 dark:border-gray-800">6500000</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">年間生活費(現役)</td><td className="p-1 border border-gray-200 dark:border-gray-800">4000000</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">年間生活費(老後)</td><td className="p-1 border border-gray-200 dark:border-gray-800">2600000</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">年金受給額(年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">1800000</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">年金受給開始年齢</td><td className="p-1 border border-gray-200 dark:border-gray-800">65</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">期待運用利回り(%)</td><td className="p-1 border border-gray-200 dark:border-gray-800">4.0</td></tr>
                        <tr><td className="p-1 border border-gray-200 dark:border-gray-800">想定インフレ率(%)</td><td className="p-1 border border-gray-200 dark:border-gray-800">1.0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 教育費・家族構成の設定例 */}
                <div className="bg-white dark:bg-gray-900/60 p-3 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1">
                    <span>🎓</span>
                    <span>2.「ライフイベント」シート（教育費・家族構成の設定例）</span>
                  </h5>
                  <p className="text-gray-500 mb-2">
                    「<strong>ライフイベント</strong>」というシートに、<strong>「イベント名」「年齢」「金額」「区分」</strong>というヘッダーを持つ4列のテーブルを作成します。子供2人の教育プランを精度高くシミュレートする推奨設定例です。
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-gray-200 dark:border-gray-800">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">イベント名（A列）</th>
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">年齢（B列）</th>
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">金額（C列）</th>
                          <th className="p-1.5 border border-gray-200 dark:border-gray-800">区分（D列）</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[10.5px] text-gray-600 dark:text-gray-400">
                        {/* 長男 */}
                        <tr className="bg-blue-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長男：私立幼稚園 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">38</td><td className="p-1 border border-gray-200 dark:border-gray-800">550000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-blue-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長男：公立小学校 (6年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">41</td><td className="p-1 border border-gray-200 dark:border-gray-800">350000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-blue-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長男：公立中学校 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">47</td><td className="p-1 border border-gray-200 dark:border-gray-800">500000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-blue-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長男：私立高校 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">50</td><td className="p-1 border border-gray-200 dark:border-gray-800">1000000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-blue-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長男：私立大学 (4年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">53</td><td className="p-1 border border-gray-200 dark:border-gray-800">1500000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        {/* 長女 */}
                        <tr className="bg-purple-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長女：私立幼稚園 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">40</td><td className="p-1 border border-gray-200 dark:border-gray-800">550000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-purple-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長女：公立小学校 (6年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">43</td><td className="p-1 border border-gray-200 dark:border-gray-800">350000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-purple-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長女：私立中学校 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">49</td><td className="p-1 border border-gray-200 dark:border-gray-800">1000000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-purple-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長女：私立高校 (3年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">52</td><td className="p-1 border border-gray-200 dark:border-gray-800">1000000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                        <tr className="bg-purple-50/20"><td className="p-1 border border-gray-200 dark:border-gray-800">長女：私立大学理系 (4年間)</td><td className="p-1 border border-gray-200 dark:border-gray-800">55</td><td className="p-1 border border-gray-200 dark:border-gray-800">1800000</td><td className="p-1 border border-gray-200 dark:border-gray-800">支出</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-[11px] leading-relaxed">
                    <span className="font-bold text-blue-600 dark:text-blue-400">💡 複数年の設定コツ：</span><br />
                    イベント年齢は「<strong>開始年齢（親の年齢）</strong>」を指定すると最もシンプルです。複数年に渡る授業料を設定する場合、上記のように「幼稚園」「小学校」等でまとめて毎年支出にするか、あるいは1年ごとのイベント行に分けても正常に合算してシミュレーションされます。
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Financial Health Milestones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">シミュレーション診断結果</span>
            <span className={`text-lg font-bold mt-2 block ${stats.hasShortage ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
              {stats.hasShortage ? `⚠️ ${stats.shortageAge}歳時点で資産枯渇リスク` : '✅ 資産寿命は生涯安泰'}
            </span>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {stats.hasShortage 
                ? `想定寿命の${param.lifeExpectancy}歳を待たずして資産が底をつく可能性があります。`
                : `${param.lifeExpectancy}歳の想定寿命時点でも十分な手元資金が残る見込みです。`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">{param.lifeExpectancy}歳時点の資産残高</span>
            <span className={`text-2xl font-bold font-mono tracking-tight mt-1.5 block ${stats.finalAssets >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-500'}`}>
              {formatYen(stats.finalAssets)}
            </span>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              ※ インフレ率 {param.inflationRate}% 調整後の実質的な購買価値に換算
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">資産ピーク年齢 & 額</span>
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-2 block">
              {stats.maxAssetsAge}歳時点で最大
            </span>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 font-bold block mt-0.5">
              {formatYen(stats.maxAssets)} (実質価値)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Parameters Form & Life Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Parameters Inputs */}
        <div id="lifeplan-inputs" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 space-y-5 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
            ⚙️ シミュレーション設定
          </h3>

          <div className="space-y-4">
            {/* Age Settings */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">現在年齢</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={editingParam.currentAge}
                  onChange={e => handleParamChange('currentAge', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">リタイア</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={editingParam.retireAge}
                  onChange={e => handleParamChange('retireAge', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">想定寿命</label>
                <input
                  type="number"
                  min="60"
                  max="110"
                  value={editingParam.lifeExpectancy}
                  onChange={e => handleParamChange('lifeExpectancy', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Income & Living Cost */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">現在資産 (シミュレーション初期値)</label>
              <input
                type="number"
                step="100000"
                value={editingParam.initialAssets}
                onChange={e => handleParamChange('initialAssets', Number(e.target.value))}
                className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">現役時 年間収入 (世帯手取り)</label>
              <input
                type="number"
                step="100000"
                value={editingParam.annualIncome}
                onChange={e => handleParamChange('annualIncome', Number(e.target.value))}
                className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">現役生活費(年間)</label>
                <input
                  type="number"
                  step="100000"
                  value={editingParam.annualLivingCost}
                  onChange={e => handleParamChange('annualLivingCost', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">老後生活費(年間)</label>
                <input
                  type="number"
                  step="100000"
                  value={editingParam.retireLivingCost}
                  onChange={e => handleParamChange('retireLivingCost', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Pension */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">受給年金(年間)</label>
                <input
                  type="number"
                  step="100000"
                  value={editingParam.annualPension}
                  onChange={e => handleParamChange('annualPension', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">受給開始年齢</label>
                <input
                  type="number"
                  min="60"
                  max="75"
                  value={editingParam.pensionStartAge}
                  onChange={e => handleParamChange('pensionStartAge', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Yield and Inflation rates */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">運用利回り (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  value={editingParam.investmentYield}
                  onChange={e => handleParamChange('investmentYield', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">想定インフレ率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-5"
                  max="10"
                  value={editingParam.inflationRate}
                  onChange={e => handleParamChange('inflationRate', Number(e.target.value))}
                  className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Life Events Section */}
        <div id="lifeplan-events" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              📅 ライフイベント & 臨時収支
            </h3>
            <button
              onClick={() => setIsAddingEvent(!isAddingEvent)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isAddingEvent ? 'キャンセル' : '＋ イベントを追加'}
            </button>
          </div>

          {/* Add New Event Form */}
          {isAddingEvent && (
            <form onSubmit={handleAddEvent} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">新しいイベントを追加</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">イベント名 / 収支内容</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 住宅リフォーム、留学資金"
                    value={newEvent.name}
                    onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full text-sm p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">発生年齢 (歳)</label>
                  <input
                    type="number"
                    min={param.currentAge}
                    max={param.lifeExpectancy}
                    value={newEvent.age}
                    onChange={e => setNewEvent({ ...newEvent, age: Number(e.target.value) })}
                    className="w-full text-sm p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">区分</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as 'expense' | 'income' })}
                    className="w-full text-sm p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">支出 (費用)</option>
                    <option value="income">収入 (臨時等)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">金額 (円)</label>
                  <input
                    type="number"
                    step="100000"
                    placeholder="例: 3000000"
                    value={newEvent.cost}
                    onChange={e => setNewEvent({ ...newEvent, cost: Number(e.target.value) })}
                    className="w-full text-sm p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    保存して追加
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Events Timeline / Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[310px] overflow-y-auto pr-1">
            {param.events.length === 0 ? (
              <div className="text-center py-12 col-span-2 text-gray-400 dark:text-gray-500 text-sm">
                登録されているライフイベントはありません。
              </div>
            ) : (
              param.events.map(event => (
                <div
                  key={event.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {event.age}歳
                    </span>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{event.name}</h4>
                    <span className={`text-xs font-mono font-bold block ${event.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {event.type === 'expense' ? '− ' : '＋ '}
                      {formatYen(event.cost)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assets Evolution Line Chart */}
        <div id="lifeplan-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                📈 資産残高の将来推移予測
              </h3>
              <p className="text-xs text-gray-500">複利効果（運用益）とインフレ調整による購買力の変化</p>
            </div>
            <span className="text-xs font-mono text-gray-400">単位: 万円</span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
                <XAxis dataKey="age" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#1f2937',
                  }}
                  formatter={(value: any) => [`${value}万円`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  name="実質資産 (利回り3%+インフレ1%調整)"
                  dataKey="実質資産 (インフレ調整後)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReal)"
                />
                <Area
                  type="monotone"
                  name="名目資産 (額面・利回り3%のみ)"
                  dataKey="名目資産 (額面価格)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorNominal)"
                />
                <Area
                  type="monotone"
                  name="運用なし (預金貯蓄のみ)"
                  dataKey="運用なし"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regular Income vs Expense Column Chart */}
        <div id="lifeplan-cashflow-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 lg:col-span-1 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              📊 収支キャッシュフロー (5年毎)
            </h3>
            <p className="text-xs text-gray-500">年齢ステージ別の基本生活費とイベントを含む年間収支</p>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
                <XAxis dataKey="age" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#1f2937',
                  }}
                  formatter={(value: any) => [`${value}万円`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name="年間収入" dataKey="年間収入" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="年間支出" dataKey="年間支出" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. AI Plan Advisor */}
      <div id="lifeplan-ai" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 rounded-xl shadow-lg p-6 border border-blue-100 dark:border-gray-700 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                AI ライフプラン・財務診断アドバイザー
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Geminiが設定された条件とシミュレーション推移を分析し、パーソナライズされたプロのアドバイスをレポート化。
              </p>
            </div>
          </div>
          <button
            onClick={handleGetAiAdvice}
            disabled={isGeneratingAdvice}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGeneratingAdvice ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI診断を生成中...
              </>
            ) : (
              '✨ AIライフプラン診断を実行'
            )}
          </button>
        </div>

        {/* AI Advice Output Container */}
        {(aiAdvice || isGeneratingAdvice || adviceError) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-inner animate-fade-in">
            {isGeneratingAdvice && (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
              </div>
            )}

            {adviceError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                <span>⚠️ {adviceError}</span>
              </div>
            )}

            {aiAdvice && !isGeneratingAdvice && (
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 markdown-body">
                <ReactMarkdown>{aiAdvice}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Annual Simulation Data Table */}
      <div id="lifeplan-table-container" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-700">
          📋 年次シミュレーション詳細データ一覧
        </h3>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 z-10 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">年度</th>
                <th className="p-3">年齢</th>
                <th className="p-3">定常収入 (世帯)</th>
                <th className="p-3">受給年金</th>
                <th className="p-3">基本生活費</th>
                <th className="p-3">イベント収支</th>
                <th className="p-3">想定運用益</th>
                <th className="p-3 text-right">実質資産残高 (現在価値)</th>
                <th className="p-3 text-right">名目資産残高 (額面)</th>
                <th className="p-3 text-right">運用なしの場合</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
              {simulationResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-3 font-mono">{row.year}年</td>
                  <td className="p-3 font-semibold">{row.age}歳</td>
                  <td className="p-3 font-mono">{row.income > 0 ? formatYen(row.income) : '-'}</td>
                  <td className="p-3 font-mono">{row.pension > 0 ? formatYen(row.pension) : '-'}</td>
                  <td className="p-3 font-mono">{row.livingCost > 0 ? formatYen(row.livingCost) : '-'}</td>
                  <td className={`p-3 font-mono font-semibold ${row.eventCost > 0 ? 'text-red-500' : row.eventCost < 0 ? 'text-emerald-500' : ''}`}>
                    {row.eventCost > 0 ? `−${formatYen(row.eventCost)}` : row.eventCost < 0 ? `＋${formatYen(Math.abs(row.eventCost))}` : '-'}
                  </td>
                  <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                    {row.investmentGain > 0 ? `+${formatYen(row.investmentGain)}` : '-'}
                  </td>
                  <td className={`p-3 font-mono text-right font-bold ${row.endAssets < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                    {formatYen(row.endAssets)}
                  </td>
                  <td className="p-3 font-mono text-right text-gray-500 dark:text-gray-400">
                    {formatYen(row.endAssetsNominal)}
                  </td>
                  <td className="p-3 font-mono text-right text-gray-400 dark:text-gray-500">
                    {formatYen(row.endAssetsNoInvestment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
