// frontend/src/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  // 健康檢查
  health: () => fetch(`${API_BASE_URL}/api/portfolios/health/`),
  
  // 市場總覽
  marketOverview: () => fetch(`${API_BASE_URL}/api/portfolios/market-overview/`),
  
  // 單個股票數據
  stockData: (symbol: string) => fetch(`${API_BASE_URL}/api/portfolios/real-data/${symbol}/`),
  
  // 自選股相關
  watchlistStocks: () => fetch(`${API_BASE_URL}/api/portfolios/watchlist/stocks/`),
  watchlistSummary: () => fetch(`${API_BASE_URL}/api/portfolios/watchlist/summary/`),
  
  // 搜索股票
  searchStocks: (query: string) => fetch(`${API_BASE_URL}/api/portfolios/search/?q=${encodeURIComponent(query)}`),
  
  // 添加股票到自選股
  addToWatchlist: (data: any) => fetch(`${API_BASE_URL}/api/portfolios/watchlist/stocks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
}

// 錯誤處理函數
export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = '未知錯誤'
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error || errorJson.message || '服務器錯誤'
    } catch {
      errorMessage = errorText || `HTTP ${response.status} 錯誤`
    }
    
    throw new Error(errorMessage)
  }
  
  return response.json()
}