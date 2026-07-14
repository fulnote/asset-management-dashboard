import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Asset, AssetHistoryByCategoryPoint } from '../types';
import Card from './Card';
import { RefreshIcon } from './IconComponents';

interface AiDailyCommentProps {
  assets: Asset[];
  historyByCategory: AssetHistoryByCategoryPoint[];
}

const FlameIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const AiDailyComment: React.FC<AiDailyCommentProps> = ({ assets, historyByCategory }) => {
  const [comment, setComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a fingerprint of the assets and the last two history items
  const lastTwoHistory = Array.isArray(historyByCategory) ? historyByCategory.slice(-2) : [];
  const fingerprint = JSON.stringify({
    assets: assets.map(a => ({ name: a.name, value: a.value })),
    history: lastTwoHistory.map(h => ({ date: h.date, netWorth: h['純資産'] }))
  });

  const fetchAiDailyComment = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem('cached_ai_daily_comment');
      const cachedFingerprint = localStorage.getItem('cached_ai_daily_comment_fingerprint');
      if (cached && cachedFingerprint === fingerprint) {
        setComment(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/daily-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assets, 
          historyByCategory,
        }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`エラー (${response.status}): ${text.substring(0, 100)}`);
      }

      if (data.error === 'GEMINI_API_KEY_MISSING') {
        setError("Renderの「Environment Variables」設定画面で GEMINI_API_KEY を設定してください。");
        setComment(null);
        return;
      } else if (response.ok && data.comment) {
        const commentText = data.comment;
        setComment(commentText);
        localStorage.setItem('cached_ai_daily_comment', commentText);
        localStorage.setItem('cached_ai_daily_comment_fingerprint', fingerprint);
      } else {
        throw new Error(data.message || 'AIデイリーコメントの取得に失敗しました。');
      }
    } catch (err: any) {
      console.error('Error fetching AI daily comment:', err);
      setError(err.message || 'AIとの通信に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0) {
      fetchAiDailyComment();
    }
  }, [fingerprint]);

  return (
    <Card id="ai-daily-comment-card" className="border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/10">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <FlameIcon />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">AIデイリー動向コメント</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">前日比の資産変動と最近の市場動向から分析</p>
          </div>
        </div>
        <button
          onClick={() => fetchAiDailyComment(true)}
          disabled={loading || assets.length === 0}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="AIコメントを更新"
          aria-label="AIコメントを更新"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
        </button>
      </div>

      <div className="mt-4">
        {loading && !comment ? (
          <div className="py-4 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">前日比データと直近の市場動向を照合中...</p>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex flex-col items-start gap-2">
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
            <button
              onClick={() => fetchAiDailyComment(true)}
              className="px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
            >
              再試行
            </button>
          </div>
        ) : comment ? (
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs text-left" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300" {...props} />,
                tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/10" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="px-3 py-2 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700" {...props} />,
                td: ({node, ...props}) => <td className="px-3 py-2 text-gray-600 dark:text-gray-400" {...props} />,
              }}
            >
              {comment}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            アセットデータを読み込むと、AIデイリーコメントが自動生成されます。
          </p>
        )}
      </div>
    </Card>
  );
};

export default AiDailyComment;
