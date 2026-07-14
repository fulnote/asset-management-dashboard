import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // API endpoints FIRST
  app.post("/api/gemini/comment", async (req, res) => {
    try {
      const { assets, historyByCategory } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        res.json({
          error: "GEMINI_API_KEY_MISSING",
          message: "AIコメントを表示するには、Renderの「Environment Variables」設定画面で「GEMINI_API_KEY」を設定してください。"
        });
        return;
      }

      if (!assets || !Array.isArray(assets) || assets.length === 0) {
        res.status(400).json({
          error: "INVALID_DATA",
          message: "資産データがありません。スプレッドシートからデータを取得してください。"
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Calculate exact totals for the assets
      let totalAssetValue = 0;
      let totalProfitOrLoss = 0;
      let hasProfitOrLossData = false;

      assets.forEach((a: any) => {
        totalAssetValue += Number(a.value || 0);
        if (a.profitOrLoss !== undefined && a.profitOrLoss !== null) {
          totalProfitOrLoss += Number(a.profitOrLoss);
          hasProfitOrLossData = true;
        }
      });

      const systemFormatNum = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));

      const systemCalculatedSummary = `### ポートフォリオ合計集計データ (システムによる正確な事前計算値):
- 資産評価額合計: ${systemFormatNum(totalAssetValue)}円
${hasProfitOrLossData ? `- 評価損益合計: ${totalProfitOrLoss >= 0 ? '+' : ''}${systemFormatNum(totalProfitOrLoss)}円` : ''}
`;

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
        const nw = calculateNetWorth(h);
        const netWorth = nw !== 0 
          ? `${new Intl.NumberFormat('ja-JP').format(nw)}円` 
          : '不明';
        return `- 日付: ${dateStr}, 純資産: ${netWorth}`;
      }).join('\n');

      // Calculate Year-to-Date (YTD) performance metrics
      let ytdMessage = "年初来の推移データが不足しています。";
      if (Array.isArray(historyByCategory) && historyByCategory.length > 0) {
        const latestPoint = historyByCategory[historyByCategory.length - 1];
        const latestNetWorth = calculateNetWorth(latestPoint);
        
        const latestDateStr = latestPoint?.date || '';
        const currentYear = latestDateStr ? latestDateStr.split('-')[0] : String(new Date().getFullYear());
        
        const yearPoints = historyByCategory.filter((h: any) => h.date && h.date.startsWith(currentYear));
        const startOfYearPoint = yearPoints.length > 0 ? yearPoints[0] : historyByCategory[0];
        const startOfYearNetWorth = calculateNetWorth(startOfYearPoint);
        
        const ytdChange = latestNetWorth - startOfYearNetWorth;
        const ytdChangePercent = startOfYearNetWorth !== 0 ? (ytdChange / startOfYearNetWorth) * 100 : 0;
        
        const formatNum = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));
        ytdMessage = `${currentYear}年年初の純資産は ${formatNum(startOfYearNetWorth)}円、最新の純資産は ${formatNum(latestNetWorth)}円です。
年初からの純資産変動額は ${ytdChange >= 0 ? '+' : ''}${formatNum(ytdChange)}円、変動率は ${ytdChange >= 0 ? '+' : ''}${ytdChangePercent.toFixed(2)}% となっています。 (年初の基準日: ${startOfYearPoint?.date || '不明'})`;
      }

      const prompt = `以下のユーザーの現在のアセットポートフォリオ、事前計算された合計値、最近の純資産推移データ、および年初来比データに基づいて、客観的かつプロフェッショナルな財務状況の分析とアドバイス（日本語）を生成してください。

### 現在の資産内訳:
${formattedAssets}

${systemCalculatedSummary}

### 最近の資産推移 (最新5件):
${formattedHistory}

### 年初来比データ:
${ytdMessage}

### 指示:
1. 現在の資産ポートフォリオのバランス（現金の比率、株式や暗号資産などのリスク資産の比率、負債の状況など）について評価してください。
2. 計算された年初来比データ（年初来の純資産変動と変動率）について必ず触れ、これまでの資産形成の進捗ペースやその評価・分析をコメントに含めてください。
3. 資産の最近の増減傾向や、個別銘柄・カテゴリー別の損益（好調なアセットや、改善が必要なアセット）についてコメントしてください。
4. 今後の運用アドバイス（ポートフォリオのバランス調整、リスク管理の観点など）を、簡潔な2〜3の具体的なアクションプランを含めて提案してください。
5. **重要（数値・計算の正確性）**: 
   - もし表（テーブル）や文章でポートフォリオの合計値や全体の損益額（損益合計）を出力する場合は、必ず上記の「ポートフォリオ合計集計データ (システムによる正確な事前計算値)」にある数値をそのまま使用するか、数学的に完全に一致する値を表示してください。
   - 個別の内訳数値を自身で大雑把に足し合わせて誤った合計値を算出（計算ミス、誤った丸め込み、ハルシネーション）することを厳禁とします。
6. 全体として読みやすく、説得力があり、専門的で前向きなトーンにしてください。
7. 出力は標準的なMarkdown形式で記述してください（見出し、リスト、太字などを効果的に使用）。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "あなたは非常に優秀で親しみやすいファイナンシャル・プランナー（CFP）および投資アドバイザーです。客観的かつ論理的な数値データ分析に基づき、実用的で安心感のある財務診断コメントを日本語で提供します。",
          temperature: 0.7,
        }
      });

      res.json({ comment: response.text });
    } catch (error: any) {
      console.error("Error communicating with Gemini API:", error);
      const errorStr = error.message || String(error);
      let friendlyMessage = `AIコメントの生成中にエラーが発生しました: ${errorStr}`;
      
      if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("Limit")) {
        friendlyMessage = "AI（Gemini）の無料利用枠の制限（1分間あたりのリクエスト数または1日の上限）に達しました。恐れ入りますが、しばらく（数分〜数時間）時間をおいてから再度お試しください。";
      }

      res.status(500).json({
        error: "GEMINI_API_ERROR",
        message: friendlyMessage
      });
    }
  });

  app.post("/api/gemini/daily-comment", async (req, res) => {
    try {
      const { assets, historyByCategory } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        res.json({
          error: "GEMINI_API_KEY_MISSING",
          message: "AIデイリーコメントを表示するには、Renderの環境設定で「GEMINI_API_KEY」を設定してください。"
        });
        return;
      }

      if (!assets || !Array.isArray(assets) || assets.length === 0) {
        res.status(400).json({
          error: "INVALID_DATA",
          message: "資産データがありません。スプレッドシートからデータを取得してください。"
        });
        return;
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

      if (Array.isArray(historyByCategory) && historyByCategory.length >= 1) {
        const latestPoint = historyByCategory[historyByCategory.length - 1];
        const latestNetWorth = calculateNetWorth(latestPoint);
        
        const prevPoint = historyByCategory.length >= 2 ? historyByCategory[historyByCategory.length - 2] : null;
        const prevNetWorth = prevPoint ? calculateNetWorth(prevPoint) : latestNetWorth;

        dodChange = latestNetWorth - prevNetWorth;
        dodChangePercent = prevNetWorth !== 0 ? (dodChange / prevNetWorth) * 100 : 0;

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

      res.json({ comment: response.text });
    } catch (error: any) {
      console.error("Error communicating with Gemini API:", error);
      const errorStr = error.message || String(error);
      let friendlyMessage = `AIデイリーコメントの生成中にエラーが発生しました: ${errorStr}`;
      
      if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("Limit")) {
        friendlyMessage = "AI（Gemini）の無料利用枠の制限（1分間あたりのリクエスト数または1日の上限）に達しました。恐れ入りますが、しばらく（数分〜数時間）時間をおいてから再度お試しください。";
      }

      res.status(500).json({
        error: "GEMINI_API_ERROR",
        message: friendlyMessage
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
