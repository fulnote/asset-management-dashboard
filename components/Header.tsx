
import React from 'react';
import { WalletIcon, CogIcon, RefreshIcon, TableIcon } from './IconComponents';

interface HeaderProps {
  onResetUrl: () => void;
  onRefresh: () => void;
  spreadsheetUrl?: string | null;
  activeTab: 'dashboard' | 'lifeplan';
  setActiveTab: (tab: 'dashboard' | 'lifeplan') => void;
}

const Header: React.FC<HeaderProps> = ({ onResetUrl, onRefresh, spreadsheetUrl, activeTab, setActiveTab }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center">
            <WalletIcon className="h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <h1 className="ml-2 text-base font-bold text-gray-900 dark:text-gray-100 hidden md:block">
              資産管理ダッシュボード
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 sm:px-5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              📊 ポートフォリオ
            </button>
            <button
              onClick={() => setActiveTab('lifeplan')}
              className={`px-3 sm:px-5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'lifeplan'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ✨ AIライフプラン
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  title="スプレッドシートを開く"
                  aria-label="スプレッドシートを開く"
                >
                  <TableIcon className="h-5 w-5" />
                </a>
            )}
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              title="更新"
              aria-label="更新"
            >
              <RefreshIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onResetUrl}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              title="設定"
              aria-label="設定"
            >
              <CogIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
