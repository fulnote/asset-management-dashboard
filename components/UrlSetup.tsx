import React, { useState } from 'react';
import { WalletIcon } from './IconComponents';

interface UrlSetupProps {
  onUrlSubmit: (url: string) => void;
}

const UrlSetup: React.FC<UrlSetupProps> = ({ onUrlSubmit }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUrlSubmit(url.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <WalletIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <h1 className="ml-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
                資産管理ダッシュボード
                </h1>
            </div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Google Apps Script連携設定</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Googleスプレッドシートのデータを表示するには、ウェブアプリのURLを設定してください。
          </p>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">URLの取得方法:</h3>
            <ol className="mt-2 list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>連携したいGoogleスプレッドシートを開きます。</li>
                <li>メニューから「拡張機能」→「Apps Script」を選択します。</li>
                <li>エディタ画面右上の「デプロイ」→「新しいデプロイ」をクリックします。</li>
                <li>種類の選択で歯車アイコンをクリックし、「ウェブアプリ」を選択します。</li>
                <li>説明を入力（任意）、アクセスできるユーザーを<strong className="font-bold text-red-500 dark:text-red-400">「全員」</strong>に設定します。</li>
                <li>「デプロイ」ボタンをクリックし、表示された「ウェブアプリのURL」をコピーします。</li>
            </ol>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="gas-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ウェブアプリのURL
            </label>
            <div className="mt-1">
              <input
                id="gas-url"
                name="url"
                type="url"
                required
                className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                placeholder="https://script.google.com/macros/s/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-label="ウェブアプリのURL"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              保存してダッシュボードを表示
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UrlSetup;
