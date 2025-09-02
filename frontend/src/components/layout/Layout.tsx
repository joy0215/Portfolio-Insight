// frontend/src/components/layout/Layout.tsx
'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null) // 修改：只追蹤一個活動下拉選單

  // 解決 hydration 問題
  useEffect(() => {
    setMounted(true)
    updateTime()
    
    // 每秒更新時間
    const timer = setInterval(updateTime, 1000)
    
    return () => clearInterval(timer)
  }, [])

  const updateTime = () => {
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

  // 獲取市場狀態
  const getMarketStatus = () => {
    if (!mounted) return { status: 'loading', text: '載入中...', color: 'text-gray-500' }
    
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    const isWeekday = day >= 1 && day <= 5
    const isTaiwanMarketHours = isWeekday && ((hour >= 9 && hour < 13) || (hour === 13 && now.getMinutes() <= 30))
    const isUSMarketHours = isWeekday && (hour >= 21 || hour <= 4)
    
    if (isTaiwanMarketHours) {
      return { status: 'tw-open', text: '台股開市', color: 'text-green-600' }
    } else if (isUSMarketHours) {
      return { status: 'us-open', text: '美股開市', color: 'text-blue-600' }
    } else {
      return { status: 'closed', text: '休市', color: 'text-red-600' }
    }
  }

  const navigation = [
    { 
      name: '首頁', 
      href: '/', 
      icon: '🏠',
      description: '系統總覽'
    },
    { 
      name: '市場中心', 
      href: '#', 
      icon: '🌍',
      description: '全球市場監控',
      hasDropdown: true,
      dropdownKey: 'market', // 新增：下拉選單識別
      dropdownItems: [
        { name: '全球市場', href: '/market', icon: '🌍', description: '全球股市總覽' },
        { name: '台股監控', href: '/taiwan-market', icon: '🇹🇼', description: '台股大盤、漲跌停' },
        { name: 'K線圖表', href: '/charts', icon: '📈', description: '專業技術分析' },
      ]
    },
    { 
      name: '投資管理', 
      href: '#', 
      icon: '💼',
      description: '投資組合管理',
      hasDropdown: true,
      dropdownKey: 'investment', // 新增：下拉選單識別
      dropdownItems: [
        { name: '自選股', href: '/watchlist', icon: '⭐', description: '個人股票清單' },
        { name: '投資組合', href: '/portfolio', icon: '💼', description: '持股管理' },
        { name: '投資分析', href: '/analysis', icon: '🔍', description: '績效分析' },
      ]
    },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    if (href === '#') return false
    return pathname.startsWith(href)
  }

  const isDropdownActive = (dropdownItems: any[]) => {
    return dropdownItems.some(item => isActive(item.href))
  }

  // 修改：處理下拉選單開關
  const toggleDropdown = (dropdownKey: string) => {
    if (activeDropdown === dropdownKey) {
      setActiveDropdown(null) // 如果已經打開，則關閉
    } else {
      setActiveDropdown(dropdownKey) // 否則打開這個，關閉其他
    }
  }

  const marketStatus = getMarketStatus()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="text-2xl">📊</div>
                <div>
                  <span className="text-xl font-bold text-gray-900">Portfolio Insight</span>
                  <div className="text-xs text-gray-500">投資組合洞察系統</div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <div key={item.name} className="relative">
                  {item.hasDropdown ? (
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown(item.dropdownKey!)} // 修改：使用新的切換函數
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isDropdownActive(item.dropdownItems || [])
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                        <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${
                          activeDropdown === item.dropdownKey ? 'rotate-180' : ''
                        }`} />
                      </button>

                      {/* Dropdown Menu - 修改：只顯示當前活動的下拉選單 */}
                      {activeDropdown === item.dropdownKey && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                          <div className="py-2">
                            {item.dropdownItems?.map((dropdownItem) => (
                              <Link
                                key={dropdownItem.name}
                                href={dropdownItem.href}
                                className={`block px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
                                  isActive(dropdownItem.href) ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-500' : 'text-gray-700'
                                }`}
                                onClick={() => setActiveDropdown(null)} // 點擊後關閉下拉選單
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{dropdownItem.icon}</span>
                                  <div>
                                    <div className="font-medium">{dropdownItem.name}</div>
                                    <div className="text-xs text-gray-500">{dropdownItem.description}</div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      title={item.description}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* User Info & Market Status */}
            <div className="flex items-center space-x-4">
              {/* Market Status */}
              <div className="hidden sm:flex items-center space-x-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  marketStatus.status === 'tw-open' ? 'bg-green-500 animate-pulse' :
                  marketStatus.status === 'us-open' ? 'bg-blue-500 animate-pulse' :
                  'bg-red-500'
                }`}></span>
                <span className={`font-medium ${marketStatus.color}`}>
                  {marketStatus.text}
                </span>
              </div>

              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">JoyWuFN</div>
                  <div className="text-xs text-gray-500">活躍投資者</div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">J</span>
                </div>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="sr-only">打開選單</span>
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - 保持原有邏輯 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 pt-2 pb-3 space-y-1">
              {/* User Info Mobile */}
              <div className="flex items-center space-x-3 px-3 py-3 bg-gray-50 rounded-lg mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">J</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">JoyWuFN</div>
                  <div className="text-xs text-gray-500">活躍投資者</div>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    marketStatus.status === 'tw-open' ? 'bg-green-100 text-green-800' :
                    marketStatus.status === 'us-open' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      marketStatus.status === 'tw-open' ? 'bg-green-500' :
                      marketStatus.status === 'us-open' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`}></span>
                    {marketStatus.text}
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.hasDropdown ? (
                    <div>
                      <div className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg mb-2">
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </div>
                      <div className="ml-4 space-y-1">
                        {item.dropdownItems?.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.name}
                            href={dropdownItem.href}
                            className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              isActive(dropdownItem.href)
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center space-x-3">
                              <span>{dropdownItem.icon}</span>
                              <div>
                                <div className="font-medium">{dropdownItem.name}</div>
                                <div className="text-xs opacity-75">{dropdownItem.description}</div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close dropdown when clicking outside - 修改：關閉所有下拉選單 */}
        {activeDropdown && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setActiveDropdown(null)}
          ></div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Enhanced Footer - 保持原有設計 */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">📊</span>
                <span className="font-bold text-gray-900">Portfolio Insight</span>
              </div>
              <p className="text-sm text-gray-600">
                專業的投資組合管理和股市分析系統
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">快速連結</h3>
              <div className="space-y-2">
                <Link href="/market" className="block text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  🌍 全球市場
                </Link>
                <Link href="/taiwan-market" className="block text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  🇹🇼 台股監控
                </Link>
                <Link href="/charts" className="block text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  📈 K線圖表
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">系統狀態</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>系統運行正常</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${marketStatus.color === 'text-green-600' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>{marketStatus.text}</span>
                </div>
                {mounted && (
                  <div>更新時間: {currentTime}</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t mt-6 pt-6 text-center">
            <p className="text-sm text-gray-600">
              &copy; 2025 Portfolio Insight. Made with ❤️ by JoyWuFN
            </p>
            <p className="text-xs text-gray-500 mt-1">
              免責聲明: 本系統提供的投資信息僅供參考，投資有風險，請謹慎決策。
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}