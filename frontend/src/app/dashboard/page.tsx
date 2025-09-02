// frontend/src/app/dashboard/page.tsx
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function DashboardPage() {
  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">投資儀表板</h1>
            <p className="text-gray-600">歡迎回來，JoyWu！以下是您的投資組合概況</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">總投資價值</p>
                  <p className="text-2xl font-bold text-gray-900">$125,430</p>
                  <p className="text-sm text-green-600">+2.5% 今日</p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">總收益</p>
                  <p className="text-2xl font-bold text-green-600">+$12,340</p>
                  <p className="text-sm text-green-600">+10.9% 累積</p>
                </div>
                <div className="text-3xl">📈</div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">持有股票</p>
                  <p className="text-2xl font-bold text-gray-900">15</p>
                  <p className="text-sm text-gray-600">8 個產業</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">風險等級</p>
                  <p className="text-2xl font-bold text-yellow-600">中等</p>
                  <p className="text-sm text-gray-600">Sharpe: 1.2</p>
                </div>
                <div className="text-3xl">⚠️</div>
              </div>
            </Card>
          </div>
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio Chart */}
            <div className="lg:col-span-2">
              <Card title="投資組合表現">
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">📈 圖表組件 (待實現)</p>
                </div>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <div>
              <Card title="快速操作">
                <div className="space-y-4">
                  <Button className="w-full">
                    📊 查看即時報價
                  </Button>
                  <Button variant="secondary" className="w-full">
                    💼 管理投資組合
                  </Button>
                  <Button variant="secondary" className="w-full">
                    📈 技術分析工具
                  </Button>
                  <Button variant="secondary" className="w-full">
                    🔍 風險分析報告
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="mt-8">
            <Card title="最近活動">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📈</div>
                    <div>
                      <p className="font-medium">AAPL 股價上漲</p>
                      <p className="text-sm text-gray-600">2024-09-01 15:30</p>
                    </div>
                  </div>
                  <span className="text-green-600 font-medium">+2.5%</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">💼</div>
                    <div>
                      <p className="font-medium">新增 TSLA 到投資組合</p>
                      <p className="text-sm text-gray-600">2024-09-01 14:20</p>
                    </div>
                  </div>
                  <span className="text-blue-600 font-medium">買入</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🔔</div>
                    <div>
                      <p className="font-medium">風險警告：科技股波動</p>
                      <p className="text-sm text-gray-600">2024-09-01 13:45</p>
                    </div>
                  </div>
                  <span className="text-yellow-600 font-medium">警告</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}