// frontend/src/app/test/page.tsx
'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface ApiResponse {
  message: string
  status: string
  user: string
  time: string
}

export default function TestPage() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/test/`)
        setApiData(response.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || '連接失敗')
        console.error('API 連接錯誤:', err)
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔧 Portfolio Insight 連接測試
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                前端狀態
              </h2>
              <p className="text-blue-800">✅ Next.js 運行正常</p>
              <p className="text-blue-800">✅ React 組件載入成功</p>
              <p className="text-sm text-blue-600">
                API URL: {process.env.NEXT_PUBLIC_API_URL}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                後端連接狀態
              </h2>
              
              {loading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-green-800">測試連接中...</span>
                </div>
              )}
              
              {error && (
                <div className="text-red-600">
                  ❌ 連接失敗: {error}
                  <div className="text-sm mt-2 text-red-500">
                    請確認後端服務是否啟動 (python manage.py runserver)
                  </div>
                </div>
              )}
              
              {apiData && (
                <div className="space-y-2">
                  <p className="text-green-800">✅ {apiData.message}</p>
                  <p className="text-green-700">狀態: {apiData.status}</p>
                  <p className="text-green-700">用戶: {apiData.user}</p>
                  <p className="text-green-700">時間: {apiData.time}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">
                下一步
              </h2>
              <ul className="text-yellow-800 space-y-1">
                <li>• 申請 Alpha Vantage API Key</li>
                <li>• 實現用戶認證系統</li>
                <li>• 添加投資組合 CRUD 功能</li>
                <li>• 實現即時股票報價</li>
                <li>• 添加技術圖表繪圖功能</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 重新測試
            </button>
            <a
              href="http://localhost:8000/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔧 Django Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}