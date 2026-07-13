import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

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
          message: "AIコメントを表示するには、Netlifyの「Environment Variables」設定画面で「GEMINI_API_KEY」を設定してください。"
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

    // Prepare assets summary for the prompt
    const formattedAssets = assets.map((a: any) => {
      const valueStr = new Intl.NumberFormat('ja-JP').format(a.value);
      const plStr = a.profitOrLoss !== undefined 
        ? `, 損益: ${new Intl.NumberFormat('ja-JP').format(a.profitOrLoss)}円 (${(a.profitOrLossRate * 100).toFixed(2)}%)`
        : '';
      return `- ${a.name} (種類: ${a.type}, 評価額: ${valueStr}円${plStr})`;
    }).join('\n');

    // Prepare recent history summary (last 5 entries if available)
    const historySlice = Array.isArray(historyByCategory) ? historyByCategory.slice(-5) : [];
    const formattedHistory = historySlice.map((h: any) => {
      const dateStr = h.date || '';
      const netWorth = h['純資産'] !== undefined 
        ? `${new Intl.NumberFormat('ja-JP').format(h['純資産'])}円` 
        : '不明';
      return `- 日付: ${dateStr}, 純資産: ${netWorth}`;
    }).join('\n');

    const prompt = `以下のユーザーの現在のアセットポートフォリオと最近の純資産推移データに基づいて、客観的かつプロフェッショナルな財務状況の分析とアドバイス（日本語）を生成してください。

### 現在の資産内訳:
${formattedAssets}

### 最近の資産推移 (最新5件):
${formattedHistory}

### 指示:
1. 現在の資産ポートフォリオのバランス（現金の比率、株式や暗号資産などのリスク資産の比率、負債の状況など）について評価してください。
2. 資産の最近の増減傾向や、個別銘柄・カテゴリー別の損益（好調なアセットや、改善が必要なアセット）についてコメントしてください。
3. 今後の運用アドバイス（ポートフォリオのバランス調整、リスク管理の観点など）を、簡潔な2〜3の具体的なアクションプランを含めて提案してください。
4. 全体として読みやすく、説得力があり、専門的で前向きなトーンにしてください。
5. 出力は標準的なMarkdown形式で記述してください（見出し、リスト、太字などを効果的に使用）。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "あなたは非常に優秀で親しみやすいファイナンシャル・プラナー（CFP）および投資アドバイザーです。客観的かつ論理的な数値データ分析に基づき、実用的で安心感のある財務診断コメントを日本語で提供します。",
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "GEMINI_API_ERROR",
        message: `AIコメントの生成中にエラーが発生しました: ${error.message || error}`
      })
    };
  }
};
