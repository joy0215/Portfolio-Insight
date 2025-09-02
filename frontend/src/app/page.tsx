// frontend/src/app/page.tsx
import Layout from '@/components/layout/Layout'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <Layout>
      {/* Hero Section - 主要橫幅 */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8">
              <span className="block">Portfolio Insight</span>
              <span className="block text-blue-200 text-3xl sm:text-4xl lg:text-5xl mt-2">
                專業投資組合分析平台
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
              提供即時股票報價、專業技術分析圖表、智能風險管理，
              讓您的投資決策更精準、更有信心
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button 
                  variant="white"
                  size="lg" 
                  className="font-bold px-8 py-4 text-lg"
                >
                  🚀 立即開始使用
                </Button>
              </Link>
              <Link href="/test">
                <Button 
                  variant="outline"
                  size="lg" 
                  className="font-bold px-8 py-4 text-lg"
                >
                  🔧 系統功能測試
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 功能特色 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">強大功能，助您投資成功</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              我們為投資者打造的專業工具，讓複雜的市場分析變得簡單易懂
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">即時報價</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                WebSocket 技術實現毫秒級數據推送，讓您第一時間掌握市場變化，不錯過任何投資機會
              </p>
            </div>
            
            {/* Feature Card 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">技術分析</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                專業繪圖工具支援趨勢線、支撐阻力線、費波納契回調等，如同專業交易員般分析市場
              </p>
            </div>
            
            {/* Feature Card 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl">💼</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">投資組合</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                多組合管理系統，實時追蹤績效表現，智能計算資產配置比例，優化投資策略
              </p>
            </div>
            
            {/* Feature Card 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">風險分析</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Sharpe比率、VaR風險值、最大回撤等專業指標，全方位評估投資風險，保護您的資產
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - 數據展示 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">值得信賴的投資平台</h2>
            <p className="text-xl text-gray-600">數據說話，見證我們的專業與實力</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="text-5xl font-bold text-blue-600 mb-4">99.9%</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">系統穩定性</div>
              <div className="text-gray-600">7x24小時不間斷服務，確保您隨時掌握市場動態</div>
            </div>
            
            <div className="text-center p-8">
              <div className="text-5xl font-bold text-green-600 mb-4">&lt;100ms</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">數據延遲</div>
              <div className="text-gray-600">超低延遲的即時數據，讓您的交易決策領先市場</div>
            </div>
            
            <div className="text-center p-8">
              <div className="text-5xl font-bold text-purple-600 mb-4">50+</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">技術指標</div>
              <div className="text-gray-600">豐富的技術分析工具，滿足不同投資策略需求</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - 行動呼籲 */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            準備開始您的專業投資之旅？
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            加入 Portfolio Insight，體驗專業級的投資分析工具，
            讓數據驅動您的投資決策，邁向財富自由之路
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/dashboard">
              <Button 
                variant="white"
                size="lg" 
                className="font-bold px-10 py-4 text-lg"
              >
                🎯 立即開始分析
              </Button>
            </Link>
            <Link href="/test">
              <Button 
                variant="outline"
                size="lg" 
                className="font-bold px-10 py-4 text-lg"
              >
                📊 查看功能演示
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  )
}