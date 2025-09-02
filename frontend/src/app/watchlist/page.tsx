// frontend/src/app/watchlist/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface StockData {
  symbol: string
  name: string
  current_price: number
  change: number
  change_percent: number
  volume: number
  market_cap?: number
  watchlist_id?: number
  group_name?: string
  group_color?: string
  notes?: string
  target_price?: number
  stop_loss_price?: number
  added_at?: string
  alert_enabled?: boolean
}

interface WatchlistGroup {
  id: number
  name: string
  color: string
  stocks: StockData[]
  stocks_count: number
}

interface WatchlistSummary {
  total_stocks: number
  total_value: number
  total_change: number
  total_change_percent: number
  gainers: number
  losers: number
  unchanged: number
  top_gainer: StockData | null
  top_loser: StockData | null
}

export default function WatchlistPage() {
  const [mounted, setMounted] = useState(false)
  const [stocks, setStocks] = useState<StockData[]>([])
  const [groups, setGroups] = useState<WatchlistGroup[]>([])
  const [summary, setSummary] = useState<WatchlistSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newStock, setNewStock] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    setMounted(true)
    updateCurrentTime()
    fetchWatchlistData()
    
    const timer = setInterval(updateCurrentTime, 1000)
    
    return () => clearInterval(timer)
  }, [])

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

  const fetchWatchlistData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // 這裡需要實現認證，暫時使用模擬數據
      // 在實際項目中，你需要添加認證 token
      console.log('獲取自選股數據...') 
      
      // 模擬數據 - 實際應該從 API 獲取
      const mockData = {
        stocks: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            current_price: 175.84,
            change: 2.45,
            change_percent: 1.41,
            volume: 48567234,
            market_cap: 2847382947234,
            watchlist_id: 1,
            group_name: '科技股',
            group_color: '#3B82F6',
            notes: '長期持有',
            target_price: 200.00,
            added_at: '2024-01-15T10:30:00Z',
            alert_enabled: true
          },
          {
            symbol: 'TSLA',
            name: 'Tesla, Inc.',
            current_price: 248.50,
            change: -5.23,
            change_percent: -2.06,
            volume: 32847592,
            market_cap: 1847382947234,
            watchlist_id: 2,
            group_name: '科技股',
            group_color: '#3B82F6',
            notes: '關注自動駕駛進展',
            target_price: 300.00,
            stop_loss_price: 200.00,
            added_at: '2024-01-20T14:15:00Z',
            alert_enabled: false
          },
          {
            symbol: '2330.TW',
            name: '台灣積體電路製造股份有限公司',
            current_price: 598.00,
            change: 12.00,
            change_percent: 2.05,
            volume: 18472634,
            market_cap: 15489234792837,
            watchlist_id: 3,
            group_name: '台股',
            group_color: '#10B981',
            notes: '半導體龍頭',
            target_price: 650.00,
            added_at: '2024-02-01T09:00:00Z',
            alert_enabled: true
          }
        ],
        summary: {
          total_stocks: 3,
          total_value: 1022.34,
          total_change: 9.22,
          total_change_percent: 0.91,
          gainers: 2,
          losers: 1,
          unchanged: 0,
          top_gainer: null,
          top_loser: null
        }
      }
      
      setStocks(mockData.stocks)
      setSummary(mockData.summary)
      
      // 按分組整理
      const groupedStocks: { [key: string]: WatchlistGroup } = {}
      mockData.stocks.forEach(stock => {
        const groupName = stock.group_name || '默認分組'
        if (!groupedStocks[groupName]) {
          groupedStocks[groupName] = {
            id: Date.now(),
            name: groupName,
            color: stock.group_color || '#6B7280',
            stocks: [],
            stocks_count: 0
          }
        }
        groupedStocks[groupName].stocks.push(stock)
        groupedStocks[groupName].stocks_count++
      })
      
      setGroups(Object.values(groupedStocks))
      
    } catch (err) {
      console.error('獲取自選股數據失敗:', err)
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`
    return volume.toLocaleString()
  }

  const getChangeColor = (change: number) => 
    change >= 0 ? 'text-green-600' : 'text-red-600'
  
  const getChangeBg = (change: number) => 
    change >= 0 ? 'bg-green-100' : 'bg-red-100'

  if (!mounted) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在初始化自選股系統...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600">載入自選股數據中...</p>
            <p className="text-sm text-gray-500 mt-2">正在獲取您的投資組合資訊</p>
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
                  ⭐ 我的自選股
                </h1>
                <p className="text-gray-600">
                  個人化股票追蹤、價格監控、投資組合管理
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    用戶: <span className="font-semibold text-blue-600 ml-1">JoyWu</span>
                  </span>
                  <span>|</span>
                  <span>總計: <span className="font-bold">{summary?.total_stocks || 0}</span> 支股票</span>
                  <span>|</span>
                  {mounted && <span>更新時間: {currentTime}</span>}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? "secondary" : "primary"}
                >
                  {showAddForm ? '✕ 取消' : '➕ 添加股票'}
                </Button>
                <Button 
                  onClick={fetchWatchlistData}
                  variant="secondary"
                  disabled={loading}
                >
                  🔄 刷新
                </Button>
                <Button 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  variant="secondary"
                >
                  {viewMode === 'grid' ? '📋 列表' : '📊 網格'}
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-red-600 mr-3 text-xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-red-800 font-medium mb-2">載入失敗</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                    <div className="mt-3">
                      <Button onClick={fetchWatchlistData} size="sm">
                        🔄 重新載入
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Stock Form */}
          {showAddForm && (
            <div className="mb-6">
              <Card title="➕ 添加新股票到自選股">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="輸入股票代碼，如: AAPL, 2330.TW, 0700.HK"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => {
                        if (newStock.trim()) {
                          console.log('添加股票:', newStock)
                          setNewStock('')
                          setShowAddForm(false)
                          // 這裡應該調用 API 添加股票
                        }
                      }}
                      disabled={!newStock.trim()}
                    >
                      ➕ 添加
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    💡 支援格式: AAPL (美股), 2330.TW (台股), 0700.HK (港股)
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="mb-8">
              <Card title="📊 投資組合總覽">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{summary.total_stocks}</div>
                    <div className="text-sm text-gray-600 mt-1">總股票數</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{summary.gainers}</div>
                    <div className="text-sm text-gray-600 mt-1">上漲</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">{summary.losers}</div>
                    <div className="text-sm text-gray-600 mt-1">下跌</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-600">{summary.unchanged}</div>
                    <div className="text-sm text-gray-600 mt-1">持平</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{formatCurrency(summary.total_value)}</div>
                    <div className="text-sm text-gray-600 mt-1">總價值</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className={`text-lg font-bold ${getChangeColor(summary.total_change)}`}>
                      {formatCurrency(summary.total_change)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">總變化</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className={`text-lg font-bold ${getChangeColor(summary.total_change_percent)}`}>
                      {formatPercent(summary.total_change_percent)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">總漲跌幅</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Stocks Display */}
          {stocks.length > 0 ? (
            <div className="space-y-6">
              {groups.map((group) => (
                <Card key={group.id} title={`${group.name} (${group.stocks_count})`}>
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "space-y-3"
                  }>
                    {group.stocks.map((stock) => (
                      <div 
                        key={stock.symbol} 
                        className={viewMode === 'grid'
                          ? "bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                          : "flex items-center justify-between p-4 bg-white rounded-lg border"
                        }
                      >
                        <div className={viewMode === 'grid' ? "space-y-3" : "flex items-center space-x-4"}>
                          <div className={viewMode === 'grid' ? "flex justify-between items-start" : ""}>
                            <div>
                              <h4 className="font-bold text-gray-800">{stock.symbol}</h4>
                              <p className="text-sm text-gray-600 truncate">{stock.name}</p>
                              {stock.notes && (
                                <p className="text-xs text-blue-600 mt-1">💭 {stock.notes}</p>
                              )}
                            </div>
                            <div className={viewMode === 'grid' ? "text-right" : "ml-auto text-right"}>
                              <div className="text-xl font-bold text-gray-800">
                                {formatCurrency(stock.current_price)}
                              </div>
                              <div className={`text-sm font-medium ${getChangeColor(stock.change_percent)}`}>
                                {formatPercent(stock.change_percent)}
                              </div>
                            </div>
                          </div>
                          
                          {viewMode === 'grid' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">成交量:</span>
                                <span>{formatVolume(stock.volume)}</span>
                              </div>
                              {stock.target_price && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">目標價:</span>
                                  <span className="text-green-600">{formatCurrency(stock.target_price)}</span>
                                </div>
                              )}
                              {stock.stop_loss_price && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">停損價:</span>
                                  <span className="text-red-600">{formatCurrency(stock.stop_loss_price)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className={viewMode === 'grid' ? "flex justify-between items-center" : "flex space-x-2"}>
                            <div className="flex space-x-2">
                              <Button href={`/charts?symbol=${stock.symbol}`} size="sm" variant="secondary">
                                📊
                              </Button>
                              <Button size="sm" variant="secondary">
                                ⚙️
                              </Button>
                              <Button size="sm" variant="secondary">
                                🗑️
                              </Button>
                            </div>
                            {stock.alert_enabled && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                🔔 提醒
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card title="🌟 開始建立您的自選股">
              <div className="text-center py-12">
                <div className="text-8xl mb-6">⭐</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">
                  您還沒有任何自選股
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  開始添加您感興趣的股票，建立個人化的投資追蹤組合
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  ➕ 添加第一支股票
                </Button>
              </div>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="border-t pt-4">
              <p>
                ⭐ Portfolio Insight - 自選股管理系統 | 
                用戶: <span className="font-semibold text-blue-600">JoyWu</span> | 
                {mounted ? `更新時間: ${currentTime}` : '系統載入中...'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                💡 提示: 點擊股票卡片可查看詳細資訊，設定目標價格和停損點
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}