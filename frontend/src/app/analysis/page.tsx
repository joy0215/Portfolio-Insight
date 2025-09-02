// frontend/src/app/analysis/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface PerformanceSummary {
  total_value: number
  total_cost: number
  total_return: number
  total_return_percent: number
  sharpe_ratio: number
}

interface Performer {
  symbol: string
  name: string
  gain_percent: number
  market_value: number
}

interface RiskAssessment {
  risk_score: number
  risk_level: string
  diversification_score: number
}

interface MarketSentiment {
  sentiment: string
  sentiment_score: number
  market_stats: {
    total_stocks: number
    stocks_up: number
    stocks_down: number
    stocks_neutral: number
    up_ratio: number
    down_ratio: number
  }
  sector_performance: { [key: string]: { count: number; avg_change: number } }
}

interface Recommendation {
  stock: {
    id: number
    symbol: string
    name: string
    sector: string
    exchange: string
  }
  current_price: number
  change_percent: number
  recommendation_score: number
  reasons: string[]
  recommendation: string
}

export default function AnalysisPage() {
  const [performance, setPerformance] = useState<{
    performance_summary: PerformanceSummary
    best_performer: Performer | null
    worst_performer: Performer | null
    risk_assessment: RiskAssessment
    monthly_investments: { [key: string]: number }
    portfolio_age_days: number
  } | null>(null)
  
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('performance')

  useEffect(() => {
    fetchAnalysisData()
  }, [])

  const fetchAnalysisData = async () => {
    try {
      const [performanceRes, sentimentRes, recommendationsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/portfolio/performance/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/market/sentiment/`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolios/stocks/recommendations/`)
      ])

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json()
        setPerformance(performanceData)
      }

      if (sentimentRes.ok) {
        const sentimentData = await sentimentRes.json()
        setSentiment(sentimentData)
      }

      if (recommendationsRes.ok) {
        const recommendationsData = await recommendationsRes.json()
        setRecommendations(recommendationsData.recommendations || [])
      }
    } catch (err) {
      console.error('Error fetching analysis data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-50'
      case 'Medium': return 'text-yellow-600 bg-yellow-50'
      case 'High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return 'text-green-600 bg-green-50'
      case 'Bearish': return 'text-red-600 bg-red-50'
      case 'Neutral': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Strong Buy': return 'text-green-700 bg-green-100'
      case 'Buy': return 'text-green-600 bg-green-50'
      case 'Watch': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入分析數據中...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 投資分析</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>用戶: <span className="font-semibold">JoyWu</span></span>
              <span>|</span>
              <span>分析時間: {new Date().toLocaleString('zh-TW')}</span>
              <span>|</span>
              <span>投資組合年齡: {performance?.portfolio_age_days || 0} 天</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'performance', name: '📈 績效分析', icon: '📈' },
                  { id: 'sentiment', name: '🌡️ 市場情緒', icon: '🌡️' },
                  { id: 'recommendations', name: '💡 股票推薦', icon: '💡' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Performance Tab */}
          {activeTab === 'performance' && performance && (
            <div className="space-y-6">
              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="💰 總市值">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(performance.performance_summary.total_value)}
                  </div>
                </Card>
                <Card title="💵 總成本">
                  <div className="text-3xl font-bold text-gray-600">
                    {formatCurrency(performance.performance_summary.total_cost)}
                  </div>
                </Card>
                <Card title="📈 總報酬">
                  <div className={`text-3xl font-bold ${performance.performance_summary.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(performance.performance_summary.total_return)}
                  </div>
                  <div className={`text-sm ${performance.performance_summary.total_return_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(performance.performance_summary.total_return_percent)}
                  </div>
                </Card>
                <Card title="⚡ Sharpe 比率">
                  <div className="text-3xl font-bold text-purple-600">
                    {performance.performance_summary.sharpe_ratio.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {performance.performance_summary.sharpe_ratio > 1 ? '優秀' : 
                     performance.performance_summary.sharpe_ratio > 0.5 ? '良好' : '待改善'}
                  </div>
                </Card>
              </div>

              {/* Best & Worst Performers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {performance.best_performer && (
                  <Card title="🏆 最佳表現">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-blue-600">
                          {performance.best_performer.symbol}
                        </div>
                        <div className="text-sm text-gray-600">
                          {performance.best_performer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          市值: {formatCurrency(performance.best_performer.market_value)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPercent(performance.best_performer.gain_percent)}
                        </div>
                        <div className="text-sm text-green-600">📈 獲利</div>
                      </div>
                    </div>
                  </Card>
                )}

                {performance.worst_performer && (
                  <Card title="⚠️ 最差表現">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-blue-600">
                          {performance.worst_performer.symbol}
                        </div>
                        <div className="text-sm text-gray-600">
                          {performance.worst_performer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          市值: {formatCurrency(performance.worst_performer.market_value)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {formatPercent(performance.worst_performer.gain_percent)}
                        </div>
                        <div className="text-sm text-red-600">📉 虧損</div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Risk Assessment */}
              <Card title="⚠️ 風險評估">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800 mb-2">
                      {performance.risk_assessment.risk_score}/100
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(performance.risk_assessment.risk_level)}`}>
                      {performance.risk_assessment.risk_level} Risk
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {performance.risk_assessment.diversification_score}
                    </div>
                    <div className="text-sm text-gray-600">板塊多元化</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {performance.portfolio_age_days}
                    </div>
                    <div className="text-sm text-gray-600">投資組合天數</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Market Sentiment Tab */}
          {activeTab === 'sentiment' && sentiment && (
            <div className="space-y-6">
              {/* Sentiment Overview */}
              <Card title="🌡️ 市場情緒概覽">
                <div className="text-center mb-6">
                  <div className={`inline-block px-6 py-3 rounded-lg text-2xl font-bold ${getSentimentColor(sentiment.sentiment)}`}>
                    {sentiment.sentiment} ({sentiment.sentiment_score.toFixed(1)}/100)
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{sentiment.market_stats.stocks_up}</div>
                    <div className="text-sm text-gray-600">上漲股票</div>
                    <div className="text-xs text-green-600">{sentiment.market_stats.up_ratio}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{sentiment.market_stats.stocks_down}</div>
                    <div className="text-sm text-gray-600">下跌股票</div>
                    <div className="text-xs text-red-600">{sentiment.market_stats.down_ratio}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{sentiment.market_stats.stocks_neutral}</div>
                    <div className="text-sm text-gray-600">持平股票</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{sentiment.market_stats.total_stocks}</div>
                    <div className="text-sm text-gray-600">總股票數</div>
                  </div>
                </div>
              </Card>

              {/* Sector Performance */}
              <Card title="🏭 板塊表現">
                <div className="space-y-3">
                  {Object.entries(sentiment.sector_performance).map(([sector, data]) => (
                    <div key={sector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{sector}</span>
                        <span className="text-sm text-gray-600 ml-2">({data.count} 支股票)</span>
                      </div>
                      <div className={`font-bold ${data.avg_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(data.avg_change)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <Card title="💡 AI 股票推薦">
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>免責聲明:</strong> 此推薦僅供參考，基於技術分析和基本面指標。投資有風險，請謹慎決策並做好風險管理。
                  </p>
                </div>
                
                {recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                      <div key={rec.stock.id} className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl font-bold text-blue-600">#{index + 1}</span>
                              <div>
                                <div className="font-bold text-lg">{rec.stock.symbol}</div>
                                <div className="text-sm text-gray-600">{rec.stock.name}</div>
                                <div className="text-xs text-gray-500">{rec.stock.exchange} | {rec.stock.sector}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rec.reasons.map((reason, idx) => (
                                <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(rec.current_price)}</div>
                            <div className={`text-sm ${rec.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(rec.change_percent)}
                            </div>
                            <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(rec.recommendation)}`}>
                              {rec.recommendation}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              評分: {rec.recommendation_score}/100
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => window.open(`/charts?symbol=${rec.stock.symbol}`, '_blank')}
                          >
                            📈 查看圖表
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              // 這裡可以添加加入自選股的功能
                              alert(`將 ${rec.stock.symbol} 加入自選股功能開發中...`)
                            }}
                          >
                            ⭐ 加入自選股
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🤖</div>
                    <p className="text-gray-600">暫無推薦股票，請稍後再試</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Refresh Button */}
          <div className="text-center mt-8">
            <Button onClick={fetchAnalysisData} variant="secondary">
              🔄 重新分析
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}