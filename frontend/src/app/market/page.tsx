// frontend/src/app/market/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface StockData {
  symbol: string
  name: string
  current_price: number
  change: number
  change_percent: number
  volume: number
  exchange?: string
  sector?: string
  data_source?: string
  last_updated?: string
}

interface MarketData {
  stocks?: StockData[]
  market_status?: string
  last_updated?: string
  data_source?: string
  total_stocks?: number
}

export default function MarketPage() {
  const [mounted, setMounted] = useState(false)
  const [marketData, setMarketData] = useState<MarketData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'symbol' | 'change_percent' | 'volume'>('change_percent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [debugInfo, setDebugInfo] = useState<any>({})

  const regions = [
    { value: 'ALL', label: '全市場', flag: '🌍' },
    { value: 'US', label: '美股', flag: '🇺🇸' },
    { value: 'TW', label: '台股', flag: '🇹🇼' },
    { value: 'HK', label: '港股', flag: '🇭🇰' },
  ]

  // 修復 hydration 問題
  useEffect(() => {
    setMounted(true)
    updateCurrentTime()
    
    // 每秒更新時間
    const timer = setInterval(updateCurrentTime, 1000)
    
    // 初始化時立即加載數據
    setTimeout(() => {
      fetchMarketData()
    }, 100)
    
    return () => {
      clearInterval(timer)
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  // 自動刷新功能
  useEffect(() => {
    if (autoRefresh && mounted) {
      const interval = setInterval(() => {
        fetchMarketData(true) // 靜默刷新
      }, 30000) // 30秒刷新一次
      
      setRefreshInterval(interval)
      
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh, mounted])

  const updateCurrentTime = () => {
    const now = new Date()
    setCurrentTime(now.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }))
  }

  const fetchMarketData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true)
        setError(null)
        setDebugInfo({})
      }
      
      console.log('🔄 開始獲取市場數據...')
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // 更新調試信息
      setDebugInfo(prev => ({
        ...prev,
        apiUrl,
        timestamp: new Date().toISOString(),
        attempt: (prev.attempt || 0) + 1
      }))
      
      // 首先測試後端連接
      console.log('📡 測試後端連接...')
      
      let healthResponse
      try {
        healthResponse = await fetch(`${apiUrl}/api/portfolios/health/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-cache',
        })
      } catch (fetchError) {
        console.error('❌ 網絡連接失敗:', fetchError)
        throw new Error(`無法連接到後端服務 (${apiUrl}): ${fetchError instanceof Error ? fetchError.message : '網絡錯誤'}`)
      }
      
      if (!healthResponse.ok) {
        throw new Error(`後端健康檢查失敗 (HTTP ${healthResponse.status})`)
      }
      
      const healthData = await healthResponse.json()
      console.log('✅ 後端連接正常:', healthData)
      
      setDebugInfo(prev => ({
        ...prev,
        healthCheck: 'success',
        backendStatus: healthData
      }))
      
      // 獲取市場總覽
      console.log('📊 獲取市場數據...')
      
      let marketResponse
      try {
        marketResponse = await fetch(`${apiUrl}/api/portfolios/market-overview/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-cache',
        })
      } catch (fetchError) {
        console.error('❌ 市場數據請求失敗:', fetchError)
        throw new Error(`市場數據請求失敗: ${fetchError instanceof Error ? fetchError.message : '網絡錯誤'}`)
      }
      
      if (!marketResponse.ok) {
        const errorText = await marketResponse.text()
        console.error('❌ 市場數據 API 錯誤:', errorText)
        throw new Error(`市場數據 API 錯誤 (HTTP ${marketResponse.status}): ${errorText}`)
      }
      
      const data = await marketResponse.json()
      console.log('📊 市場數據:', data)
      
      setDebugInfo(prev => ({
        ...prev,
        marketDataFetch: 'success',
        dataReceived: {
          hasStocks: !!data.stocks,
          stockCount: data.stocks?.length || 0,
          dataSource: data.data_source
        }
      }))
      
      // 如果沒有股票數據，使用模擬數據
      if (!data.stocks || data.stocks.length === 0) {
        console.log('⚠️ 後端沒有返回股票數據，使用模擬數據')
        const mockData = {
          stocks: generateMockStocks(),
          market_status: 'Mock Data',
          data_source: '增強型模擬數據 (後端無數據)',
          total_stocks: 12
        }
        
        processMarketData(mockData, silent)
        return
      }
      
      // 處理真實數據
      processMarketData(data, silent)
      
    } catch (err) {
      console.error('❌ 獲取市場數據失敗:', err)
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      
      setDebugInfo(prev => ({
        ...prev,
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : 'Unknown'
      }))
      
      if (!silent) {
        setError(errorMessage)
        
        // 設置模擬數據作為降級
        console.log('🔄 使用模擬數據作為降級方案')
        const mockData = {
          stocks: generateMockStocks(),
          market_status: 'Mock Data',
          data_source: '增強型模擬數據 (API 連接失敗)',
          total_stocks: 12
        }
        
        processMarketData(mockData, silent)
      }
      
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const processMarketData = (data: any, silent: boolean) => {
    // 過濾地區數據
    let filteredStocks = data.stocks || []
    if (selectedRegion !== 'ALL') {
      filteredStocks = filteredStocks.filter((stock: StockData) => {
        switch (selectedRegion) {
          case 'US':
            return !stock.symbol.includes('.TW') && !stock.symbol.includes('.HK')
          case 'TW':
            return stock.symbol.includes('.TW')
          case 'HK':
            return stock.symbol.includes('.HK')
          default:
            return true
        }
      })
    }
    
    // 排序數據
    filteredStocks.sort((a: StockData, b: StockData) => {
      let aValue, bValue
      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol
          bValue = b.symbol
          break
        case 'change_percent':
          aValue = a.change_percent
          bValue = b.change_percent
          break
        case 'volume':
          aValue = a.volume
          bValue = b.volume
          break
        default:
          aValue = a.change_percent
          bValue = b.change_percent
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    setMarketData({
      ...data,
      stocks: filteredStocks,
      total_stocks: filteredStocks.length
    })
    
    if (!silent) {
      setLastUpdated(new Date().toLocaleString('zh-TW'))
    }
  }

  // 生成模擬股票數據
  const generateMockStocks = (): StockData[] => {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', base: 227.50, sector: 'Technology', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', base: 427.90, sector: 'Technology', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', base: 175.80, sector: 'Technology', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', base: 248.50, sector: 'Automotive', exchange: 'NASDAQ' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', base: 125.30, sector: 'Semiconductor', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', base: 203.50, sector: 'E-commerce', exchange: 'NASDAQ' },
      { symbol: '2330.TW', name: '台灣積體電路', base: 598.00, sector: 'Semiconductor', exchange: 'TWSE' },
      { symbol: '2454.TW', name: '聯發科技', base: 1285.00, sector: 'Semiconductor', exchange: 'TWSE' },
      { symbol: '2317.TW', name: '鴻海精密', base: 108.50, sector: 'Electronics', exchange: 'TWSE' },
      { symbol: '0700.HK', name: '騰訊控股', base: 415.20, sector: 'Technology', exchange: 'HKSE' },
      { symbol: '0941.HK', name: '中國移動', base: 58.30, sector: 'Telecom', exchange: 'HKSE' },
      { symbol: '1398.HK', name: '工商銀行', base: 4.85, sector: 'Financial', exchange: 'HKSE' },
    ]

    return mockStocks.map(stock => {
      const changePercent = (Math.random() - 0.5) * 6 // ±3%
      const currentPrice = stock.base * (1 + changePercent / 100)
      const change = currentPrice - stock.base

      return {
        symbol: stock.symbol,
        name: stock.name,
        current_price: Number(currentPrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        change_percent: Number(changePercent.toFixed(2)),
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        sector: stock.sector,
        exchange: stock.exchange,
        data_source: '增強型模擬數據'
      }
    })
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const getMarketStatus = () => {
    if (!mounted) return { status: 'unknown', text: '載入中...', color: 'text-gray-600' }
    
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    // 簡化的市場時間判斷
    const isWeekday = day >= 1 && day <= 5
    const isMarketHours = hour >= 21 || hour <= 4 // UTC 時間
    
    if (isWeekday && isMarketHours) {
      return { status: 'open', text: '開市', color: 'text-green-600' }
    } else {
      return { status: 'closed', text: '休市', color: 'text-red-600' }
    }
  }

  const marketStatus = getMarketStatus()

  const getMarketSummary = () => {
    if (!marketData.stocks || marketData.stocks.length === 0) {
      return { gainers: 0, losers: 0, unchanged: 0 }
    }
    
    return marketData.stocks.reduce((acc, stock) => {
      if (stock.change_percent > 0.5) acc.gainers++
      else if (stock.change_percent < -0.5) acc.losers++
      else acc.unchanged++
      return acc
    }, { gainers: 0, losers: 0, unchanged: 0 })
  }

  const summary = getMarketSummary()

  // 如果還沒有 mount，顯示 loading
  if (!mounted) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在初始化市場數據系統...</p>
            <p className="text-xs text-gray-500 mt-2">Portfolio Insight v2.0</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto mb-6"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-gray-600 text-xl font-medium mb-2">載入市場總覽數據中...</p>
              <p className="text-sm text-gray-500 mb-4">
                正在從多個數據源獲取全球股市即時數據
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 max-w-md mx-auto">
                <div className="bg-gray-100 p-3 rounded">
                  <div className="font-medium">API 端點</div>
                  <div className="truncate">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</div>
                </div>
                <div className="bg-gray-100 p-3 rounded">
                  <div className="font-medium">載入時間</div>
                  <div>{currentTime}</div>
                </div>
              </div>
              
              {/* 調試信息 */}
              {Object.keys(debugInfo).length > 0 && (
                <div className="mt-6 max-w-lg mx-auto">
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                      🔍 顯示調試信息
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-800 text-green-400 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
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
                  📈 全球股市總覽
                </h1>
                <p className="text-gray-600">
                  即時股票數據 • 全球市場監控 • 多地區股市分析
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    數據來源: {marketData.data_source || 'Loading...'}
                  </span>
                  <span>|</span>
                  <span>用戶: <span className="font-semibold text-blue-600">JoyWuFN</span></span>
                  <span>|</span>
                  <span className={`font-medium ${marketStatus.color}`}>
                    市場狀態: {marketStatus.text}
                  </span>
                  <span>|</span>
                  <span>當前時間: {currentTime}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => fetchMarketData()}
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
                <Button href="/charts" variant="secondary">
                  📊 K線圖表
                </Button>
              </div>
            </div>
            
            {/* 系統狀態信息 */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${error ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    後端API: {error ? '降級模式' : '正常運行'}
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    當前地區: <span className="font-bold">
                      {regions.find(r => r.value === selectedRegion)?.flag} {regions.find(r => r.value === selectedRegion)?.label}
                    </span>
                  </span>
                  <span className="bg-green-100 px-2 py-1 rounded">
                    股票數量: <span className="font-bold">{marketData.total_stocks || 0}</span>
                  </span>
                  <span className="bg-purple-100 px-2 py-1 rounded">
                    排序: <span className="font-bold">
                      {sortBy === 'change_percent' ? '漲跌幅' : sortBy === 'volume' ? '成交量' : '代碼'}
                    </span>
                  </span>
                </div>
                {lastUpdated && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📅</span>
                    <span>最後更新: {lastUpdated}</span>
                    {autoRefresh && (
                      <span className="ml-2 text-green-600">(自動刷新中)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-3 mt-1" size={20} />
                  <div className="flex-1">
                    <h3 className="text-yellow-800 font-medium mb-2">⚠️ API 連接問題</h3>
                    <p className="text-yellow-700 text-sm mb-3">{error}</p>
                    <p className="text-yellow-600 text-xs mb-4">正在顯示增強型模擬數據，功能可能受限</p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => fetchMarketData()}
                        size="sm"
                        variant="secondary"
                        disabled={loading}
                      >
                        🔄 重新嘗試
                      </Button>
                      <Button 
                        onClick={() => setError(null)}
                        size="sm"
                        variant="secondary"
                      >
                        ✕ 關閉提示
                      </Button>
                    </div>
                    
                    {/* 調試信息 */}
                    {Object.keys(debugInfo).length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-yellow-700 hover:text-yellow-800">
                          🔍 調試信息
                        </summary>
                        <pre className="mt-2 text-xs bg-yellow-100 p-3 rounded overflow-auto max-h-40 text-yellow-800">
                          {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Summary */}
          <div className="mb-6">
            <Card title="📊 市場摘要">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">
                    {marketData.total_stocks || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">追蹤股票</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.gainers}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">上漲股票</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.losers}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">下跌股票</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                  <div className="text-2xl font-bold text-gray-600">
                    {summary.unchanged}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">持平股票</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Controls */}
          <div className="mb-6">
            <Card title="🎛️ 篩選與排序控制">
              <div className="flex flex-wrap gap-4 items-center">
                {/* 地區篩選 */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700 self-center mr-2">地區:</span>
                  {regions.map((region) => (
                    <button
                      key={region.value}
                      onClick={() => setSelectedRegion(region.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedRegion === region.value 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {region.flag} {region.label}
                    </button>
                  ))}
                </div>

                <div className="border-l border-gray-300 h-8"></div>

                {/* 排序控制 */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700 self-center mr-2">排序:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="change_percent">漲跌幅</option>
                    <option value="volume">成交量</option>
                    <option value="symbol">股票代碼</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    {sortOrder === 'desc' ? '⬇️ 降序' : '⬆️ 升序'}
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Stock Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {marketData.stocks?.map((stock) => (
              <div
                key={stock.symbol}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border hover:border-blue-300 cursor-pointer"
                onClick={() => window.open(`/charts?symbol=${stock.symbol}`, '_blank')}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {stock.symbol}
                    </h3>
                    <p className="text-sm text-gray-600 truncate mb-2">{stock.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {stock.exchange && (
                        <span className="bg-gray-100 px-2 py-1 rounded">{stock.exchange}</span>
                      )}
                      {stock.sector && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{stock.sector}</span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center ${getChangeColor(stock.change)}`}>
                    {getChangeIcon(stock.change)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-900">
                      ${stock.current_price.toFixed(2)}
                    </span>
                    <div className={`text-right ${getChangeColor(stock.change)}`}>
                      <div className="font-semibold text-sm">
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                      </div>
                      <div className="text-xs">
                        ({stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>成交量</span>
                    <span>{(stock.volume / 1000000).toFixed(1)}M</span>
                  </div>

                  {stock.data_source && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      數據來源: {stock.data_source}
                    </div>
                  )}
                </div>

                {/* 點擊提示 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-blue-600 text-center">
                    🔍 點擊查看 K 線圖表
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 無數據提示 */}
          {(!marketData.stocks || marketData.stocks.length === 0) && !loading && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暫無市場數據</h3>
              <p className="text-sm text-gray-500 mb-6">
                所選地區沒有可用的股票數據，請嘗試其他地區或檢查網絡連接
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => fetchMarketData()}>
                  🔄 重新載入
                </Button>
                <Button onClick={() => setSelectedRegion('ALL')} variant="secondary">
                  🌍 查看全部市場
                </Button>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="border-t pt-4">
              <p>
                📈 Portfolio Insight - 全球股市總覽系統 | 
                用戶: <span className="font-semibold text-blue-600">JoyWuFN</span> | 
                數據來源: Alpha Vantage API + Enhanced Mock Data | 
                系統時間: {currentTime}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                免責聲明: 本系統提供的股票數據和分析僅供參考，不構成投資建議。投資有風險，請謹慎決策。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}