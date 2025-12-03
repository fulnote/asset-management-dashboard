import React from 'react';
import { WalletIcon, CogIcon, RefreshIcon } from './IconComponents';

interface HeaderProps {
  onResetUrl: () => void;
  onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ onResetUrl, onRefresh }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <WalletIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="ml-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              資産管理ダッシュボード
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-label="更新"
            >
              <RefreshIcon className="h-6 w-6" />
            </button>
            <button
              onClick={onResetUrl}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-label="設定"
            >
              <CogIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;