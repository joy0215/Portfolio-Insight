// frontend/src/app/charts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import SimpleCandlestickChart from '@/components/charts/SimpleCandlestickChart'

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockInfo {
  symbol: string
  name: string
  exchange: string
  sector: string
  current_price: number
  change: number
  change_percent: number
  market_cap?: number
  pe_ratio?: number
  dividend_yield?: number
}

export default function ChartsPage() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  
  // 確保使用有效的股票代碼
  const getInitialSymbol = () => {
    const urlSymbol = searchParams.get('symbol')
    if (urlSymbol && /^[A-Z0-9]+(\.[A-Z]{2})?$/.test(urlSymbol.toUpperCase())) {
      return urlSymbol.toUpperCase()
    }
    return 'AAPL'
  }
  
  const [symbol, setSymbol] = useState('')
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [period, setPeriod] = useState('1y')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchSymbol, setSearchSymbol] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const periods = [
    { value: '1d', label: '1天' },
    { value: '5d', label: '5天' },
    { value: '1mo', label: '1個月' },
    { value: '3mo', label: '3個月' },
    { value: '6mo', label: '6個月' },
    { value: '1y', label: '1年' },
    { value: '2y', label: '2年' },
    { value: '5y', label: '5年' },
  ]

  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Google', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla', sector: 'Automotive' },
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductor' },
    { symbol: 'AMZN', name: 'Amazon', sector: 'E-commerce' },
    { symbol: 'META', name: 'Meta', sector: 'Technology' },
    { symbol: 'NFLX', name: 'Netflix', sector: 'Media' },
    { symbol: '2330.TW', name: '台積電', sector: 'Semiconductor' },
    { symbol: '2454.TW', name: '聯發科', sector: 'Semiconductor' },
    { symbol: '2317.TW', name: '鴻海', sector: 'Electronics' },
    { symbol: '0700.HK', name: '騰訊', sector: 'Technology' },
    { symbol: '0941.HK', name: '中國移動', sector: 'Telecom' },
    { symbol: '1398.HK', name: '工商銀行', sector: 'Financial' },
  ]

  // 修復 hydration 問題
  useEffect(() => {
    setMounted(true)
    setSymbol(getInitialSymbol())
    updateCurrentTime()
    
    // 每秒更新時間
    const timer = setInterval(updateCurrentTime, 1000)
    
    return () => {
      clearInterval(timer)
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  useEffect(() => {
    if (mounted && symbol) {
      fetchChartData(symbol, period)
    }
  }, [symbol, period, mounted])

  // 自動刷新功能
  useEffect(() => {
    if (autoRefresh && symbol) {
      const interval = setInterval(() => {
        fetchChartData(symbol, period, true) // 靜默刷新
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
  }, [autoRefresh, symbol, period])

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

  const fetchChartData = async (stockSymbol: string, timePeriod: string, silent: boolean = false) => {
    if (!stockSymbol || stockSymbol.trim() === '') {
      setError('請輸入有效的股票代碼')
      return
    }

    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      
      console.log(`Fetching chart data for ${stockSymbol} with period ${timePeriod}`)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/api/portfolios/real-data/chart/${encodeURIComponent(stockSymbol)}/?period=${timePeriod}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-cache'
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received chart data:', {
          symbol: data.symbol,
          stockInfo: !!data.stock_info,
          dataPoints: data.chart_data?.length || 0,
          period: data.period
        })
        
        if (data.stock_info) {
          setStockInfo(data.stock_info)
        }
        
        if (Array.isArray(data.chart_data) && data.chart_data.length > 0) {
          // 確保數據格式正確
          const validatedData = data.chart_data.map((item: any) => ({
            time: item.time,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume) || 0
          })).filter((item: any) => 
            !isNaN(item.open) && !isNaN(item.high) && 
            !isNaN(item.low) && !isNaN(item.close)
          )
          
          setChartData(validatedData)
          setLastUpdated(new Date().toLocaleString('zh-TW'))
          
          if (!silent) {
            console.log(`Successfully loaded ${validatedData.length} data points for ${stockSymbol}`)
          }
        } else {
          console.warn('No valid chart data received for', stockSymbol)
          setChartData([])
          if (!silent) {
            setError(`沒有找到 ${stockSymbol} 的圖表數據。

可能原因：
• 股票代碼不正確或不存在
• 該股票沒有足夠的歷史數據
• Yahoo Finance 無法找到此股票
• 市場休市或數據暫時不可用

請檢查股票代碼格式：
• 美股: AAPL, MSFT, GOOGL
• 台股: 2330.TW, 2454.TW (需要 .TW 後綴)
• 港股: 0700.HK, 0941.HK (需要 .HK 後綴)

建議：
1. 確認股票代碼正確
2. 嘗試其他熱門股票
3. 檢查網絡連接`)
          }
        }
      } else {
        const errorText = await response.text()
        let errorData: any = {}
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        
        const errorMessage = errorData.error || `無法獲取 ${stockSymbol} 的數據 (HTTP ${response.status})`
        
        if (!silent) {
          setError(`API 請求失敗: ${errorMessage}

狀態碼: ${response.status}
股票代碼: ${stockSymbol}
時間週期: ${timePeriod}
API 端點: ${apiUrl}

請檢查：
1. 後端服務是否正常運行
2. 股票代碼格式是否正確
3. 網絡連接是否穩定`)
          setChartData([])
          setStockInfo(null)
        }
        
        console.error('API Error:', { status: response.status, error: errorMessage, symbol: stockSymbol })
      }
    } catch (err) {
      console.error('Network Error:', err)
      
      if (!silent) {
        setError(`網絡連接失敗

錯誤詳情: ${err instanceof Error ? err.message : '未知錯誤'}

請檢查：
1. 後端服務是否運行在 ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
2. 網絡連接是否正常
3. 防火牆設置是否正確
4. CORS 設置是否正確

支援的股票代碼格式：
• 美股: AAPL, MSFT, GOOGL, TSLA, NVDA
• 台股: 2330.TW, 2454.TW, 2317.TW (需要 .TW 後綴)
• 港股: 0700.HK, 0941.HK, 1398.HK (需要 .HK 後綴)

故障排除：
1. 檢查後端控制台是否有錯誤
2. 確認 yfinance 套件已正確安裝
3. 嘗試直接訪問 API 端點`)
        setChartData([])
        setStockInfo(null)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const validateStockSymbol = (symbol: string): boolean => {
    const trimmed = symbol.trim().toUpperCase()
    return /^[A-Z0-9]{1,10}(\.(TW|HK|TO|L))?$/.test(trimmed)
  }

  const handleSymbolSearch = () => {
    const trimmedSymbol = searchSymbol.trim().toUpperCase()
    if (trimmedSymbol) {
      if (validateStockSymbol(trimmedSymbol)) {
        setSymbol(trimmedSymbol)
        setError(null)
        setSearchSymbol('')
      } else {
        setError(`無效的股票代碼格式: "${trimmedSymbol}"

請使用正確格式：
• 美股: AAPL, MSFT, GOOGL (1-10個字母數字)
• 台股: 2330.TW, 2454.TW (股票代碼 + .TW)
• 港股: 0700.HK, 0941.HK (股票代碼 + .HK)
• 加拿大: SHOP.TO (股票代碼 + .TO)
• 英國: ULVR.L (股票代碼 + .L)`)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSymbolSearch()
    }
  }

  const handleQuickSelect = (stockSymbol: string) => {
    setSymbol(stockSymbol)
    setError(null)
    setSearchSymbol('')
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return `$${num.toLocaleString()}`
  }

  const getMarketStatus = () => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    // 簡化的市場時間判斷 (美股時間)
    const isWeekday = day >= 1 && day <= 5
    const isMarketHours = hour >= 21 || hour <= 4 // UTC 時間
    
    if (isWeekday && isMarketHours) {
      return { status: 'open', text: '開市', color: 'text-green-600' }
    } else {
      return { status: 'closed', text: '休市', color: 'text-red-600' }
    }
  }

  const marketStatus = getMarketStatus()

  // 如果還沒有 mount，顯示 loading
  if (!mounted) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在初始化圖表系統...</p>
            <p className="text-xs text-gray-500 mt-2">Portfolio Insight v1.0</p>
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
                  📊 專業股票 K 線圖表系統
                </h1>
                <p className="text-gray-600">
                  實時股票數據 • 專業 K 線圖表 • 技術分析畫線工具
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    數據來源: Yahoo Finance (即時)
                  </span>
                  <span>|</span>
                  <span>用戶: <span className="font-semibold text-blue-600">JoyWu</span></span>
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
                  onClick={() => fetchChartData(symbol, period)}
                  variant="secondary"
                  disabled={loading}
                  className="flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      載入中
                    </>
                  ) : (
                    <>🔄 手動刷新</>
                  )}
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
                    <>⏯️ 啟用自動刷新</>
                  )}
                </Button>
                <Button href="/market" variant="secondary">
                  📈 市場總覽
                </Button>
              </div>
            </div>
            
            {/* 系統狀態信息 */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    後端API: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    當前股票: <span className="font-bold">{symbol || '未選擇'}</span>
                  </span>
                  <span className="bg-green-100 px-2 py-1 rounded">
                    數據點: <span className="font-bold">{chartData.length}</span>
                  </span>
                  <span className="bg-purple-100 px-2 py-1 rounded">
                    週期: <span className="font-bold">{periods.find(p => p.value === period)?.label}</span>
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start">
                  <div className="text-red-600 mr-3 text-xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-red-800 font-medium mb-2">數據獲取失敗</h3>
                    <pre className="text-red-700 text-sm whitespace-pre-wrap leading-relaxed">{error}</pre>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button 
                        onClick={() => fetchChartData(symbol, period)}
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
                        ✕ 關閉錯誤
                      </Button>
                      <Button 
                        onClick={() => handleQuickSelect('AAPL')}
                        size="sm"
                      >
                        📊 載入示例 (AAPL)
                      </Button>
                      <Button 
                        onClick={() => handleQuickSelect('2330.TW')}
                        size="sm"
                      >
                        📊 載入台積電
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Controls */}
          <div className="mb-6">
            <Card title="🔍 股票搜尋與時間控制">
              <div className="space-y-6">
                {/* 股票搜尋 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📈 股票代碼搜尋
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="如: AAPL (美股), 2330.TW (台股), 0700.HK (港股)"
                        value={searchSymbol}
                        onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        className="text-lg font-mono"
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        ✅ 支援格式: AAPL, MSFT (美股) | 2330.TW, 2454.TW (台股) | 0700.HK, 0941.HK (港股)
                      </div>
                    </div>
                    <Button 
                      onClick={handleSymbolSearch} 
                      disabled={loading || !searchSymbol.trim()}
                      className="px-6"
                    >
                      {loading ? '🔄' : '🔍'} 搜尋
                    </Button>
                  </div>
                </div>

                {/* 熱門股票快速選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ⭐ 熱門股票快速選擇
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {popularStocks.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleQuickSelect(stock.symbol)}
                        className={`p-3 rounded-lg text-sm transition-all duration-200 ${
                          symbol === stock.symbol 
                            ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md'
                        }`}
                        disabled={loading}
                      >
                        <div className="font-bold">{stock.symbol}</div>
                        <div className="text-xs opacity-75 mt-1">{stock.name}</div>
                        <div className="text-xs opacity-60 mt-1">{stock.sector}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 時間週期選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ⏰ 時間週期選擇
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {periods.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          period === p.value 
                            ? 'bg-green-600 text-white shadow-lg transform scale-105' 
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-green-50 hover:border-green-300 hover:shadow-md'
                        }`}
                        disabled={loading}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Stock Info */}
          {stockInfo && (
            <div className="mb-6">
              <Card title={`📈 ${stockInfo.symbol} - ${stockInfo.name}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(stockInfo.current_price)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">當前價格</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                    <div className={`text-lg font-bold ${stockInfo.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stockInfo.change)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">漲跌額</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                    <div className={`text-lg font-bold ${stockInfo.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(stockInfo.change_percent)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">漲跌幅</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border">
                    <div className="text-lg font-bold text-purple-600">
                      {stockInfo.exchange}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">交易所</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border">
                    <div className="text-lg font-bold text-indigo-600">
                      {stockInfo.sector}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">板塊</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border">
                    <div className="text-lg font-bold text-green-600">
                      {stockInfo.market_cap ? formatLargeNumber(stockInfo.market_cap) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">市值</div>
                  </div>
                </div>
                
                {/* 額外信息 */}
                {(stockInfo.pe_ratio || stockInfo.dividend_yield) && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                      {stockInfo.pe_ratio && (
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="font-bold text-yellow-700">P/E 比率</div>
                          <div className="text-lg font-semibold text-yellow-800 mt-1">
                            {stockInfo.pe_ratio.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stockInfo.dividend_yield && (
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="font-bold text-orange-700">股息收益率</div>
                          <div className="text-lg font-semibold text-orange-800 mt-1">
                            {(stockInfo.dividend_yield * 100).toFixed(2)}%
                          </div>
                        </div>
                      )}
                      <div className="text-center p-3 bg-pink-50 rounded-lg">
                        <div className="font-bold text-pink-700">數據週期</div>
                        <div className="text-lg font-semibold text-pink-800 mt-1">
                          {periods.find(p => p.value === period)?.label}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-teal-50 rounded-lg">
                        <div className="font-bold text-teal-700">數據點數</div>
                        <div className="text-lg font-semibold text-teal-800 mt-1">
                          {chartData.length}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Chart */}
          <Card title="📊 專業 K 線圖表 & 技術分析">
            {loading ? (
              <div className="flex flex-col items-center justify-center" style={{ height: '600px' }}>
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto mb-6"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xl font-medium mb-2">載入 K 線圖表數據中...</p>
                  <p className="text-sm text-gray-500 mb-4">
                    正在從 Yahoo Finance 獲取 <span className="font-bold text-blue-600">{symbol}</span> 
                    (<span className="font-bold">{periods.find(p => p.value === period)?.label}</span>) 的即時數據
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 max-w-md mx-auto">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium">API 端點</div>
                      <div className="truncate">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium">載入時間</div>
                      <div>{currentTime}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : chartData && chartData.length > 0 ? (
              <div className="space-y-4">
                <SimpleCandlestickChart 
                  symbol={symbol}
                  data={chartData}
                  height={600}
                />
                
                {/* 圖表下方的詳細統計摘要 */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">📊 數據統計摘要</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">數據範圍</div>
                      <div className="text-xs text-gray-700 leading-tight">
                        <div>{chartData[0]?.time}</div>
                        <div className="text-gray-400">至</div>
                        <div>{chartData[chartData.length - 1]?.time}</div>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">交易日數</div>
                      <div className="text-xl font-bold text-blue-600">
                        {chartData.length}
                      </div>
                      <div className="text-xs text-gray-500">個交易日</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">價格區間</div>
                      <div className="text-sm font-semibold text-green-600">
                        最高: ${Math.max(...chartData.map(d => d.high)).toFixed(2)}
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        最低: ${Math.min(...chartData.map(d => d.low)).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-600 mb-1">總成交量</div>
                      <div className="text-lg font-bold text-purple-600">
                        {(chartData.reduce((sum, d) => sum + d.volume, 0) / 1e6).toFixed(1)}M
                      </div>
                      <div className="text-xs text-gray-500">股</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-8xl mb-6">📈</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">
                  {error ? '無法載入圖表數據' : '歡迎使用專業 K 線圖表系統'}
                </h3>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                  {error 
                    ? '請檢查股票代碼或網絡連接，然後重試。我們支援全球主要股票市場的即時數據。' 
                    : '選擇股票代碼開始使用專業 K 線圖表，支援技術分析畫線工具、多種時間週期，以及全球主要股票市場的即時數據。'
                  }
                </p>
                <div className="flex justify-center gap-4">
                  {error ? (
                    <>
                      <Button 
                        onClick={() => fetchChartData(symbol, period)}
                        className="px-8 py-3"
                      >
                        🔄 重新載入數據
                      </Button>
                      <Button 
                        onClick={() => handleQuickSelect('AAPL')}
                        variant="secondary"
                        className="px-8 py-3"
                      >
                        📊 載入 Apple 示例
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={() => handleQuickSelect('AAPL')}
                        className="px-8 py-3"
                      >
                        📊 載入 Apple (AAPL)
                      </Button>
                      <Button 
                        onClick={() => handleQuickSelect('2330.TW')}
                        variant="secondary"
                        className="px-8 py-3"
                      >
                        📊 載入台積電 (2330.TW)
                      </Button>
                      <Button 
                        href="/market"
                        variant="secondary"
                        className="px-8 py-3"
                      >
                        📈 瀏覽市場總覽
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="mt-6">
            <Card title="🚀 快速操作與導航">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => fetchChartData(symbol, period)}
                  variant="secondary"
                  className="w-full h-16 flex flex-col items-center justify-center"
                  disabled={loading}
                >
                  <div className="text-lg mb-1">🔄</div>
                  <div className="text-sm">刷新數據</div>
                </Button>
                <Button 
                  href="/market"
                  variant="secondary"
                  className="w-full h-16 flex flex-col items-center justify-center"
                >
                  <div className="text-lg mb-1">📈</div>
                  <div className="text-sm">市場總覽</div>
                </Button>
                <Button 
                  onClick={() => {
                    if (stockInfo) {
                      // 這裡可以整合自選股功能
                      const message = `加入自選股: ${stockInfo.symbol} (${stockInfo.name})\n當前價格: ${formatCurrency(stockInfo.current_price)}\n漲跌: ${formatPercent(stockInfo.change_percent)}`
                      alert(message)
                    } else {
                      alert('請先選擇一支股票')
                    }
                  }}
                  variant="secondary"
                  className="w-full h-16 flex flex-col items-center justify-center"
                >
                  <div className="text-lg mb-1">⭐</div>
                  <div className="text-sm">加入自選股</div>
                </Button>
                <Button 
                  href="/analysis"
                  variant="secondary"
                  className="w-full h-16 flex flex-col items-center justify-center"
                >
                  <div className="text-lg mb-1">🔍</div>
                  <div className="text-sm">投資分析</div>
                </Button>
              </div>
            </Card>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="border-t pt-6">
              <p className="mb-2">
                📊 Portfolio Insight - 專業股票分析平台 | 
                用戶: <span className="font-semibold text-blue-600">JoyWu</span> | 
                數據來源: Yahoo Finance (即時) | 
                更新時間: {currentTime}
              </p>
              <p className="text-xs leading-relaxed max-w-4xl mx-auto">
                <strong>免責聲明:</strong> 本平台提供的股票數據、技術分析圖表和相關信息僅供參考和教育用途，
                不構成任何形式的投資建議或推薦。股票投資涉及風險，過往表現不預示未來結果。
                投資前請諮詢專業財務顧問，並根據自身風險承受能力謹慎決策。
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Portfolio Insight v1.0 | 技術支援: React 18 + Next.js 15 + TypeScript | 
                圖表引擎: Canvas 2D + 自研畫線工具
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}