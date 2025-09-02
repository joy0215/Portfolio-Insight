// frontend/src/app/portfolio/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Stock {
  id: number
  symbol: string
  name: string
  exchange: string
  sector: string
}

interface Holding {
  id: number
  stock: Stock
  quantity: number
  average_cost: number
  current_price: number
  market_value: number
  cost_basis: number
  gain_loss: number
  gain_loss_percent: number
  purchase_date: string
  weight: number
}

interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_percent: number
  holdings_count: number
}

interface Portfolio {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // 新增持股表單
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    quantity: '',
    average_cost: '',
    purchase_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/portfolio/holdings/`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data.portfolio)
        setSummary(data.summary)
        setHoldings(data.holdings)
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const addHolding = async () => {
    if (!newHolding.symbol || !newHolding.quantity || !newHolding.average_cost) {
      alert('請填寫所有必要欄位')
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/portfolio/holdings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newHolding)
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setNewHolding({
          symbol: '',
          quantity: '',
          average_cost: '',
          purchase_date: new Date().toISOString().split('T')[0]
        })
        setShowAddForm(false)
        fetchPortfolio() // 重新獲取數據
      } else {
        const error = await response.json()
        alert(error.error || '添加失敗')
      }
    } catch (err) {
      console.error('Error adding holding:', err)
      alert('添加失敗，請檢查網絡連接')
    } finally {
      setUpdating(false)
    }
  }

  const deleteHolding = async (holdingId: number, symbol: string) => {
    if (!confirm(`確定要從投資組合中移除 ${symbol} 嗎？`)) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/portfolio/holdings/${holdingId}/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        fetchPortfolio() // 重新獲取數據
      } else {
        const error = await response.json()
        alert(error.error || '移除失敗')
      }
    } catch (err) {
      console.error('Error deleting holding:', err)
      alert('移除失敗，請檢查網絡連接')
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`

  if (loading) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入投資組合中...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">💼 我的投資組合</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>用戶: <span className="font-semibold">JoyWu</span></span>
                  <span>|</span>
                  <span>持股數量: {summary?.holdings_count || 0}</span>
                  <span>|</span>
                  <span>最後更新: {new Date().toLocaleTimeString('zh-TW')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? "secondary" : "primary"}
                >
                  {showAddForm ? '🔙 取消' : '➕ 新增持股'}
                </Button>
                <Button onClick={fetchPortfolio} variant="secondary">
                  🔄 刷新
                </Button>
              </div>
            </div>
          </div>

          {/* Portfolio Summary */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card title="💰 總市值">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(summary.total_value)}
                </div>
              </Card>
              <Card title="💵 總成本">
                <div className="text-3xl font-bold text-gray-600">
                  {formatCurrency(summary.total_cost)}
                </div>
              </Card>
              <Card title="📈 總損益">
                <div className={`text-3xl font-bold ${summary.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.total_gain_loss)}
                </div>
              </Card>
              <Card title="📊 報酬率">
                <div className={`text-3xl font-bold ${summary.total_gain_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(summary.total_gain_loss_percent)}
                </div>
              </Card>
            </div>
          )}

          {/* Add Holding Form */}
          {showAddForm && (
            <div className="mb-6">
              <Card title="➕ 新增持股">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        股票代碼 *
                      </label>
                      <Input
                        placeholder="例如: AAPL"
                        value={newHolding.symbol}
                        onChange={(e) => setNewHolding({...newHolding, symbol: e.target.value.toUpperCase()})}
                        disabled={updating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        持股數量 *
                      </label>
                      <Input
                        type="number"
                        placeholder="100"
                        step="0.01"
                        value={newHolding.quantity}
                        onChange={(e) => setNewHolding({...newHolding, quantity: e.target.value})}
                        disabled={updating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        平均成本 *
                      </label>
                      <Input
                        type="number"
                        placeholder="150.00"
                        step="0.01"
                        value={newHolding.average_cost}
                        onChange={(e) => setNewHolding({...newHolding, average_cost: e.target.value})}
                        disabled={updating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        購買日期
                      </label>
                      <Input
                        type="date"
                        value={newHolding.purchase_date}
                        onChange={(e) => setNewHolding({...newHolding, purchase_date: e.target.value})}
                        disabled={updating}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={addHolding}
                      disabled={updating || !newHolding.symbol || !newHolding.quantity || !newHolding.average_cost}
                    >
                      {updating ? '🔄 添加中...' : '✅ 確認添加'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowAddForm(false)
                        setNewHolding({
                          symbol: '',
                          quantity: '',
                          average_cost: '',
                          purchase_date: new Date().toISOString().split('T')[0]
                        })
                      }}
                      variant="secondary"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Holdings Table */}
          <Card title={`📋 持股明細 (${holdings.length} 支股票)`}>
            {holdings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">股票</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">數量</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">平均成本</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">現價</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">市值</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">損益</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700">權重</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding, index) => (
                      <tr 
                        key={holding.id} 
                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <span className="font-bold text-blue-600 text-lg">{holding.stock.symbol}</span>
                            <div className="text-sm text-gray-600">{holding.stock.name}</div>
                            <div className="text-xs text-gray-500">{holding.stock.exchange} | {holding.stock.sector}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium">{holding.quantity}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium">{formatCurrency(holding.average_cost)}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-bold">{formatCurrency(holding.current_price)}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-bold text-lg">{formatCurrency(holding.market_value)}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className={holding.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-bold">{formatCurrency(holding.gain_loss)}</div>
                            <div className="text-sm">{formatPercent(holding.gain_loss_percent)}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium">{holding.weight}%</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => window.open(`/charts?symbol=${holding.stock.symbol}`, '_blank')}
                            >
                              📈
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => deleteHolding(holding.id, holding.stock.symbol)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💼</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  投資組合尚未有任何持股
                </h3>
                <p className="text-gray-600 mb-4">
                  點擊右上角的「新增持股」按鈕開始建立您的投資組合
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  ➕ 新增第一支股票
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}