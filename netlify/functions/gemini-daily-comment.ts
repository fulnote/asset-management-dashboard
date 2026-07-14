import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

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

const CATEGORY_KEYS = [
  '現金・預金',
  '株式(現物)',
  '株式(信用)',
  'FX(現物)',
  'FX(レバレッジ)',
  '投資信託',
  '暗号資産',
  '債券',
  '不動産',
  'DC年金',
  'その他資産',
  '負債'
];

const calculateNetWorth = (h: any): number => {
  if (!h) return 0;
  
  let total = 0;
  let hasCategoryData = false;

  for (const key of CATEGORY_KEYS) {
    if (h[key] !== undefined && h[key] !== null) {
      total += parseSafeNumber(h[key]);
      hasCategoryData = true;
    }
  }

  // If category keys were present, return their sum
  if (hasCategoryData) {
    return total;
  }

  // Fallback if no category keys are present but '純資産' is provided
  if (h['純資産'] !== undefined && h['純資産'] !== null) {
    const val = parseSafeNumber(h['純資産']);
    if (val !== 0) return val;
  }

  return 0;
};

export const handler: Handler = async (event, context) => {
  // CORS & Security Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { assets, historyByCategory } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: "GEMINI_API_KEY_MISSING",
          message: "AIデイリーコメントを表示するには、Netlifyの設定で「GEMINI_API_KEY」を設定してください。"
        })
      };
    }

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "INVALID_DATA",
          message: "資産データがありません。スプレッドシートからデータを取得してください。"
        })
      };
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // 1. Calculate Day-over-Day (前日比) net worth changes from the history
    let dodMessage = "前日の履歴データが存在しないため、前日比を算出できませんでした。";
    let dodChange = 0;
    let dodChangePercent = 0;
    let hasDod = false;

     if (Array.isArray(historyByCategory) && historyByCategory.length >= 1) {
       const latestPoint = historyByCategory[historyByCategory.length - 1];
       const latestNetWorth = calculateNetWorth(latestPoint);
       
       const prevPoint = historyByCategory.length >= 2 ? historyByCategory[historyByCategory.length - 2] : null;
       const prevNetWorth = prevPoint ? calculateNetWorth(prevPoint) : latestNetWorth;
 
       dodChange = latestNetWorth - prevNetWorth;
       dodChangePercent = prevNetWorth !== 0 ? (dodChange / prevNetWorth) * 100 : 0;
       hasDod = true;
 
       const formatNum = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));
       dodMessage = `最新の純資産は ${formatNum(latestNetWorth)}円 (日付: ${latestPoint?.date || '不明'})、その1期前（前日・前回データ）の純資産は ${formatNum(prevNetWorth)}円 (日付: ${prevPoint?.date || '不明'}) です。
 これによる前日比（前回比）の純資産変動額は ${dodChange >= 0 ? '+' : ''}${formatNum(dodChange)}円、変動率は ${dodChange >= 0 ? '+' : ''}${dodChangePercent.toFixed(2)}% です。`;
     }

    // Prepare asset types breakdown to let Gemini understand user's asset structure
    const assetTypes = assets.map((a: any) => `${a.name} (${a.type}): 評価額 ${new Intl.NumberFormat('ja-JP').format(a.value)}円`).join('\n');

    const prompt = `ユーザーの資産アセット情報、および前日比（前回比）の資産変動データをもとに、現在の変動要因を市場動向（株式市場、為替、暗号資産などの一般的な値動き）と結びつけ、客観的かつ安心感のある簡潔なAIコメントを日本語で作成してください。

### ユーザーの現在のアセット一覧:
${assetTypes}

### 前日比（前回比）変動データ:
${dodMessage}

### 指示:
1. 前日比（前回比）の純資産変動（${dodChange >= 0 ? '+' : ''}${new Intl.NumberFormat('ja-JP').format(Math.round(dodChange))}円、${dodChange >= 0 ? '+' : ''}${dodChangePercent.toFixed(2)}%）について言及してください。
2. ユーザーが保有しているアセット構成（例：株式が多い、現金が多い、暗号資産がある等）に基づき、最近の一般的なグローバル・国内市場のトレンド（株価の騰落、為替の円安・円高、金利動向、ビットコインなどの暗号資産市場の状況など、可能性のある市場イベント）を交えて、今回の資産増減の背景要因をわかりやすく推察・解説してください。
3. 日常の確認に適した、簡潔かつ明確で前向きなトーンにまとめ、見出しや重要な部分を太字（**）にしたMarkdown形式で記述してください（全体で200〜300文字程度の読みやすいボリューム）。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "あなたは親しみやすく優秀なAI財務アシスタントです。ユーザーの日々の資産変動について、最新の一般的な市場動向と絡めながら、分かりやすく安心感を与えるショートコメントを日本語で提供します。",
        temperature: 0.7,
      }
    });

    const comment = response.text;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ comment })
    };
  } catch (error: any) {
    console.error("Error communicating with Gemini API:", error);
    const errorStr = error.message || String(error);
    let friendlyMessage = `AIデイリーコメントの生成中にエラーが発生しました: ${errorStr}`;
    
    if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("Limit")) {
      friendlyMessage = "AI（Gemini）の無料利用枠の制限（1分間あたりのリクエスト数または1日の上限）に達しました。恐れ入りますが、しばらく（数分〜数時間）時間をおいてから再度お試しください。";
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "GEMINI_API_ERROR",
        message: friendlyMessage
      })
    };
  }
};
