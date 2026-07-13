import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON (with increased limit to avoid PayloadTooLargeError)
  app.use(express.json({ limit: '10mb' }));

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Comment generation endpoint
  app.post("/api/gemini/comment", async (req, res) => {
    const headerApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const { assets, historyByCategory, geminiApiKey } = req.body;
    
    const rawApiKey = (geminiApiKey as string | undefined) || headerApiKey;
    const apiKey = (rawApiKey && rawApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "AIコメントを表示するには、設定画面でご自身の「Gemini APIキー」を入力するか、AI Studioの「Settings > Secrets」パネルで「GEMINI_API_KEY」を設定してください。"
      });
    }

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        error: "INVALID_DATA",
        message: "資産データがありません。スプレッドシートからデータを取得してください。"
      });
    }

    try {
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
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "あなたは非常に優秀で親しみやすいファイナンシャル・プラナー（CFP）および投資アドバイザーです。客観的かつ論理的な数値データ分析に基づき、実用的で安心感のある財務診断コメントを日本語で提供します。",
          temperature: 0.7,
        }
      });

      const comment = response.text;
      return res.json({ comment });
    } catch (error: any) {
      console.error("Error communicating with Gemini API:", error);
      return res.status(500).json({
        error: "GEMINI_API_ERROR",
        message: `AIコメントの生成中にエラーが発生しました: ${error.message || error}`
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
