// frontend/src/components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">📊</span>
              <span className="text-xl font-bold text-gray-900">Portfolio Insight</span>
            </div>
            <p className="text-gray-600 max-w-md">
              專業的投資組合分析平台，提供即時股價、技術分析圖表、風險管理等功能，
              助您做出更明智的投資決策。
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              功能
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">即時報價</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">技術分析</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">投資組合管理</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">風險分析</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              支援
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">使用說明</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">API 文檔</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">聯絡我們</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">意見回饋</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © 2025 Portfolio Insight. Created by JoyWu. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">GitHub</span>
                💻
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Twitter</span>
                🐦
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}