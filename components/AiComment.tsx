import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Asset, AssetHistoryByCategoryPoint } from '../types';
import Card from './Card';
import { RefreshIcon } from './IconComponents';

interface AiCommentProps {
  assets: Asset[];
  historyByCategory: AssetHistoryByCategoryPoint[];
}

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
  </svg>
);

const AiComment: React.FC<AiCommentProps> = ({ assets, historyByCategory }) => {
  const [comment, setComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple fingerprint of the assets to detect changes
  const assetsFingerprint = JSON.stringify(
    assets.map(a => ({ name: a.name, value: a.value, profitOrLoss: a.profitOrLoss }))
  );

  const fetchAiComment = async (force = false) => {
    if (!assets || assets.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Only send the latest 5 history entries as the prompt only needs those.
      const recentHistory = Array.isArray(historyByCategory) ? historyByCategory.slice(-5) : [];

      const response = await fetch('/.netlify/functions/gemini-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assets, 
          historyByCategory: recentHistory,
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
        setError("Netlifyの「Environment Variables」設定画面で GEMINI_API_KEY を設定してください。");
        setComment(null);
        return;
      } else if (response.ok && data.comment) {
        const commentText = data.comment;
        setComment(commentText);
        localStorage.setItem('cached_ai_comment', commentText);
        localStorage.setItem('cached_ai_comment_fingerprint', assetsFingerprint);
      } else {
        throw new Error(data.message || 'AIコメントの取得に失敗しました。');
      }
    } catch (err: any) {
      console.error('Error fetching AI comment:', err);
      setError(`サーバーとの通信に失敗しました。詳細: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check cache
    const cachedComment = localStorage.getItem('cached_ai_comment');
    const cachedFingerprint = localStorage.getItem('cached_ai_comment_fingerprint');

    if (cachedComment && cachedFingerprint === assetsFingerprint) {
      setComment(cachedComment);
    } else {
      // Auto-fetch on change if we have assets
      if (assets.length > 0) {
        fetchAiComment();
      }
    }
  }, [assetsFingerprint]);

  if (assets.length === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/20 dark:from-gray-800/80 dark:via-gray-800 dark:to-indigo-950/20 shadow-lg">
      {/* Top Background Sparkle Accents */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white">
            <SparklesIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100">AI資産アドバイス</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Geminiがあなたのポートフォリオを自動分析します</p>
          </div>
        </div>

        <button
          onClick={() => fetchAiComment(true)}
          disabled={loading}
          className={`p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${loading ? 'animate-spin cursor-not-allowed' : ''}`}
          title="アドバイスを更新"
          aria-label="アドバイスを更新"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {loading && !comment && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">ポートフォリオデータを分析中...</p>
        </div>
      )}

      {error && !comment && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex flex-col items-start gap-2">
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
          <button
            onClick={() => fetchAiComment(true)}
            className="px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
          >
            再試行する
          </button>
        </div>
      )}

      {comment && (
        <div className={`prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed ${loading ? 'opacity-50' : ''}`}>
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h4 className="font-bold text-base text-gray-900 dark:text-white mt-4 mb-2 first:mt-0" {...props} />,
              h2: ({node, ...props}) => <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-3 mb-1.5" {...props} />,
              h3: ({node, ...props}) => <h5 className="font-semibold text-xs text-gray-800 dark:text-gray-200 mt-2 mb-1" {...props} />,
              p: ({node, ...props}) => <p className="mb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2 text-xs" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 my-2 text-xs" {...props} />,
              li: ({node, ...props}) => <li className="text-gray-600 dark:text-gray-400" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2 text-gray-500 dark:text-gray-400" {...props} />,
            }}
          >
            {comment}
          </ReactMarkdown>
          
          {loading && (
            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiComment;
