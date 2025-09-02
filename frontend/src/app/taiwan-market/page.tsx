// frontend/src/app/taiwan-market/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, AlertCircle, RefreshCw } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface TaiwanStock {
  code: string
  name: string
  symbol: string
  current_price: number
  reference_price: number
  change: number
  change_percent: number
  volume: string
  turnover: string
  limit_time: string
  is_limit: boolean
  limit_type: 'up' | 'down'
}

interface TaiwanIndex {
  symbol: string
  name: string
  type: string
  current_price: number
  change: number
  change_percent: number
  volume: number
  market_status: string
}

interface MarketData {
  market_date: string
  market_status: string
  indices: {
    main: TaiwanIndex
    otc: TaiwanIndex
    all: TaiwanIndex[]
  }
  limit_stocks: {
    limit_up_count: number
    limit_down_count: number
    limit_up_stocks: TaiwanStock[]
    limit_down_stocks: TaiwanStock[]
  }
  last_updated: string
}

export default function TaiwanMarketPage() {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchMarketData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/portfolios/taiwan/market-overview/`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setMarketData(result.data)
        setLastUpdated(new Date().toLocaleString('zh-TW'))
      } else {
        throw new Error(result.error || '獲取數據失敗')
      }
      
    } catch (err) {
      console.error('獲取台股數據失敗:', err)
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMarketData()
      }, 30000) // 30秒刷新一次
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoRefresh])

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-600' // 台股紅漲綠跌
    if (change < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  if (loading && !marketData) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在載入台股數據...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  🇹🇼 台股市場監控
                </h1>
                <p className="text-gray-600">
                  大盤指數 • 櫃買指數 • 漲跌停股票 • 即時監控
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span>用戶: <span className="font-semibold text-red-600">JoyWuFN</span></span>
                  <span>|</span>
                  <span>市場日期: {marketData?.market_date}</span>
                  <span>|</span>
                  <span className={`font-medium ${marketData?.market_status === '開市' ? 'text-green-600' : 'text-red-600'}`}>
                    市場狀態: {marketData?.market_status}
                  </span>
                  {lastUpdated && (
                    <>
                      <span>|</span>
                      <span>更新時間: {lastUpdated}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchMarketData}
                  variant="secondary"
                  disabled={loading}
                  className="flex items-center"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  手動刷新
                </Button>
                <Button 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant={autoRefresh ? "primary" : "secondary"}
                  className="flex items-center"
                >
                  {autoRefresh ? (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      自動刷新
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      啟用自動刷新
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-3 mt-1" size={20} />
                  <div>
                    <h3 className="text-yellow-800 font-medium mb-2">⚠️ 數據獲取問題</h3>
                    <p className="text-yellow-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {marketData && (
            <>
              {/* 指數總覽 */}
              <div className="mb-8">
                <Card title="📊 台股指數總覽">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 加權指數 */}
                    {marketData.indices.main && (
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {marketData.indices.main.name}
                          </h3>
                          <div className={`flex items-center ${getChangeColor(marketData.indices.main.change)}`}>
                            {getChangeIcon(marketData.indices.main.change)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-gray-900">
                            {marketData.indices.main.current_price.toLocaleString()}
                          </div>
                          <div className={`text-lg font-semibold ${getChangeColor(marketData.indices.main.change)}`}>
                            {marketData.indices.main.change >= 0 ? '+' : ''}{marketData.indices.main.change.toFixed(2)} 
                            ({marketData.indices.main.change_percent >= 0 ? '+' : ''}{marketData.indices.main.change_percent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 櫃買指數 */}
                    {marketData.indices.otc && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {marketData.indices.otc.name}
                          </h3>
                          <div className={`flex items-center ${getChangeColor(marketData.indices.otc.change)}`}>
                            {getChangeIcon(marketData.indices.otc.change)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-gray-900">
                            {marketData.indices.otc.current_price.toLocaleString()}
                          </div>
                          <div className={`text-lg font-semibold ${getChangeColor(marketData.indices.otc.change)}`}>
                            {marketData.indices.otc.change >= 0 ? '+' : ''}{marketData.indices.otc.change.toFixed(2)} 
                            ({marketData.indices.otc.change_percent >= 0 ? '+' : ''}{marketData.indices.otc.change_percent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* 漲跌停統計 */}
              <div className="mb-8">
                <Card title="📈📉 漲跌停統計">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border">
                      <div className="text-3xl font-bold text-red-600">
                        {marketData.limit_stocks.limit_up_count}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">漲停家數</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border">
                      <div className="text-3xl font-bold text-green-600">
                        {marketData.limit_stocks.limit_down_count}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">跌停家數</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                      <div className="text-2xl font-bold text-gray-600">
                        {marketData.limit_stocks.limit_up_count + marketData.limit_stocks.limit_down_count}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">限價總數</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border">
                      <div className="text-lg font-bold text-purple-600">
                        {marketData.limit_stocks.limit_up_count > marketData.limit_stocks.limit_down_count ? '📈 偏多' : 
                         marketData.limit_stocks.limit_up_count < marketData.limit_stocks.limit_down_count ? '📉 偏空' : '➖ 中性'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">市場情緒</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* 漲停股票 */}
              {marketData.limit_stocks.limit_up_stocks.length > 0 && (
                <div className="mb-8">
                  <Card title="🔴 漲停股票">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {marketData.limit_stocks.limit_up_stocks.map((stock) => (
                        <div key={stock.code} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{stock.code}</h4>
                              <p className="text-sm text-gray-600">{stock.name}</p>
                            </div>
                            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                              漲停
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">現價:</span>
                              <span className="font-semibold text-red-600">${stock.current_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">漲幅:</span>
                              <span className="font-semibold text-red-600">+{stock.change_percent}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">成交量:</span>
                              <span className="text-sm">{stock.volume}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">觸限時間:</span>
                              <span className="text-sm">{stock.limit_time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* 跌停股票 */}
              {marketData.limit_stocks.limit_down_stocks.length > 0 && (
                <div className="mb-8">
                  <Card title="🟢 跌停股票">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {marketData.limit_stocks.limit_down_stocks.map((stock) => (
                        <div key={stock.code} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{stock.code}</h4>
                              <p className="text-sm text-gray-600">{stock.name}</p>
                            </div>
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                              跌停
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">現價:</span>
                              <span className="font-semibold text-green-600">${stock.current_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">跌幅:</span>
                              <span className="font-semibold text-green-600">{stock.change_percent}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">成交量:</span>
                              <span className="text-sm">{stock.volume}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">觸限時間:</span>
                              <span className="text-sm">{stock.limit_time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="border-t pt-4">
              <p>
                🇹🇼 Portfolio Insight - 台股市場監控系統 | 
                用戶: <span className="font-semibold text-red-600">JoyWuFN</span> | 
                數據來源: Yahoo Finance + 模擬數據
              </p>
              <p className="text-xs text-gray-400 mt-2">
                免責聲明: 本系統提供的台股數據僅供參考，投資有風險，請謹慎決策。台股採用 T+2 交割制度。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}