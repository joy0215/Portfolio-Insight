// frontend/src/components/charts/SimpleChart.tsx
'use client'

import { useEffect, useRef } from 'react'

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SimpleChartProps {
  symbol: string
  data: ChartData[]
  height?: number
}

const SimpleChart: React.FC<SimpleChartProps> = ({ 
  symbol, 
  data = [],
  height = 500 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const safeData = Array.isArray(data) ? data : []
  const hasData = safeData.length > 0

  useEffect(() => {
    if (!canvasRef.current || !hasData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 設置 canvas 大小
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (safeData.length === 0) return

    // 計算價格範圍
    const prices = safeData.map(d => d.close)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    const width = canvas.offsetWidth
    const padding = 40

    // 繪製背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 繪製網格線
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    
    // 垂直網格線
    for (let i = 0; i <= 10; i++) {
      const x = padding + (width - 2 * padding) * i / 10
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // 水平網格線
    for (let i = 0; i <= 10; i++) {
      const y = padding + (height - 2 * padding) * i / 10
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // 繪製價格線
    ctx.strokeStyle = '#2196F3'
    ctx.lineWidth = 2
    ctx.beginPath()

    safeData.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (safeData.length - 1)
      const y = height - padding - (height - 2 * padding) * (point.close - minPrice) / priceRange

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // 繪製數據點
    ctx.fillStyle = '#2196F3'
    safeData.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (safeData.length - 1)
      const y = height - padding - (height - 2 * padding) * (point.close - minPrice) / priceRange

      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    // 繪製價格標籤
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (maxPrice - minPrice) * i / 5
      const y = height - padding - (height - 2 * padding) * i / 5
      ctx.fillText(`$${price.toFixed(2)}`, padding - 5, y + 4)
    }

    // 繪製標題
    ctx.fillStyle = '#333'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`${symbol} 價格走勢`, padding, 25)

  }, [safeData, hasData, height, symbol])

  const latest = hasData ? safeData[safeData.length - 1] : null

  return (
    <div className="w-full">
      {/* 圖表信息 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{symbol} 簡單線圖</h3>
          <div className="text-sm text-gray-600">
            數據點: {safeData.length} | 最新價格: ${latest?.close.toFixed(2) || 'N/A'}
          </div>
        </div>
      </div>

      {/* Canvas 圖表 */}
      <div className="border rounded-lg bg-white overflow-hidden">
        {hasData ? (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: `${height}px` }}
            className="block"
          />
        ) : (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>等待圖表數據載入...</p>
            </div>
          </div>
        )}
      </div>

      {/* 統計信息 */}
      {hasData && latest && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">開盤:</span>
              <span className="ml-2 font-medium">${latest.open.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">最高:</span>
              <span className="ml-2 font-medium">${Math.max(...safeData.map(d => d.high)).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">最低:</span>
              <span className="ml-2 font-medium">${Math.min(...safeData.map(d => d.low)).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">收盤:</span>
              <span className="ml-2 font-medium">${latest.close.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleChart