// frontend/src/components/charts/SimpleCandlestickChart.tsx
'use client'

import { useRef, useEffect, useState } from 'react'

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface DrawingLine {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  width: number
  label?: string
}

interface ViewRange {
  startIndex: number
  endIndex: number
}

interface SimpleCandlestickChartProps {
  symbol: string
  data: ChartData[]
  height?: number
}

const SimpleCandlestickChart: React.FC<SimpleCandlestickChartProps> = ({ 
  symbol, 
  data = [],
  height = 600 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [drawingMode, setDrawingMode] = useState(false)
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null)
  const [lineColor, setLineColor] = useState('#FF0000')
  const [lineWidth, setLineWidth] = useState(2)
  const [showVolume, setShowVolume] = useState(true)
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  
  // 新增：圖表顯示範圍控制
  const [viewRange, setViewRange] = useState<ViewRange>({ startIndex: 0, endIndex: 0 })
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 顯示全部，2 = 顯示一半，等等
  const [panOffset, setPanOffset] = useState(0) // 平移偏移量

  const safeData = Array.isArray(data) ? data : []
  const hasData = safeData.length > 0

  // 初始化視圖範圍
  useEffect(() => {
    if (hasData) {
      const dataLength = safeData.length
      const visibleCount = Math.max(20, Math.floor(dataLength / zoomLevel))
      const startIdx = Math.max(0, Math.min(dataLength - visibleCount, panOffset))
      const endIdx = Math.min(dataLength, startIdx + visibleCount)
      
      setViewRange({ 
        startIndex: startIdx, 
        endIndex: endIdx 
      })
    }
  }, [hasData, safeData.length, zoomLevel, panOffset])

  // 監聽容器大小變化
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({
          width: Math.max(600, rect.width || 800),
          height: height
        })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [height])

  // 主圖表渲染
  useEffect(() => {
    if (!canvasRef.current || !hasData) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      // 設置 canvas 大小
      canvas.width = canvasSize.width
      canvas.height = canvasSize.height
      canvas.style.width = '100%'
      canvas.style.height = `${height}px`

      const width = canvas.width
      const padding = 80 // 增加右側邊距避免價格標籤遮擋
      const volumeHeight = showVolume ? 100 : 0
      const chartHeight = canvas.height - volumeHeight - 40

      // 清空並設置背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, canvas.height)

      // 獲取當前視圖範圍的數據
      const visibleData = safeData.slice(viewRange.startIndex, viewRange.endIndex)
      
      if (visibleData.length === 0) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('沒有可顯示的數據', width / 2, canvas.height / 2)
        return
      }

      // 驗證數據
      const validData = visibleData.filter(item => {
        return item && 
          typeof item.open === 'number' && !isNaN(item.open) &&
          typeof item.high === 'number' && !isNaN(item.high) &&
          typeof item.low === 'number' && !isNaN(item.low) &&
          typeof item.close === 'number' && !isNaN(item.close) &&
          item.high >= item.low &&
          item.high >= Math.max(item.open, item.close) &&
          item.low <= Math.min(item.open, item.close)
      })

      if (validData.length === 0) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('沒有有效的圖表數據', width / 2, canvas.height / 2)
        return
      }

      // 計算價格範圍
      const allPrices = validData.flatMap(d => [d.open, d.high, d.low, d.close])
      const minPrice = Math.min(...allPrices)
      const maxPrice = Math.max(...allPrices)
      const priceRange = maxPrice - minPrice
      const priceBuffer = priceRange * 0.02 // 2% 緩衝
      const adjustedMinPrice = minPrice - priceBuffer
      const adjustedMaxPrice = maxPrice + priceBuffer
      const adjustedPriceRange = adjustedMaxPrice - adjustedMinPrice

      // 繪製背景網格
      drawGrid(ctx, width, chartHeight, padding, adjustedMinPrice, adjustedMaxPrice)

      // 繪製價格標籤（改善位置）
      drawPriceLabels(ctx, width, padding, chartHeight, adjustedMinPrice, adjustedMaxPrice)

      // 繪製主圖表
      if (chartType === 'candlestick') {
        drawCandlesticks(ctx, validData, width, padding, chartHeight, adjustedMinPrice, adjustedPriceRange)
      } else {
        drawLineChart(ctx, validData, width, padding, chartHeight, adjustedMinPrice, adjustedPriceRange)
      }

      // 繪製成交量
      if (showVolume) {
        drawVolume(ctx, validData, width, padding, canvas.height, volumeHeight)
      }

      // 繪製邊框
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 2
      ctx.strokeRect(padding, padding, width - 2 * padding, chartHeight - 2 * padding)

      // 繪製標題和範圍信息
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(
        `${symbol} - ${chartType === 'candlestick' ? 'K線圖' : '線圖'} (${viewRange.startIndex + 1}-${viewRange.endIndex}/${safeData.length})`, 
        padding, 35
      )

      // 繪製時間軸
      drawTimeAxis(ctx, validData, width, padding, canvas.height)

      // 繪製最新價格線（改善位置避免遮擋）
      if (validData.length > 0) {
        drawLatestPriceLine(ctx, validData[validData.length - 1], width, padding, chartHeight, adjustedMinPrice, adjustedPriceRange)
      }

    } catch (error) {
      console.error('渲染圖表時發生錯誤:', error)
      
      ctx.fillStyle = '#ef4444'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('圖表渲染錯誤', canvas.width / 2, canvas.height / 2)
    }

  }, [safeData, hasData, canvasSize, symbol, showVolume, chartType, viewRange])

  // 繪製網格
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, chartHeight: number, padding: number, minPrice: number, maxPrice: number) => {
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1

    // 水平網格線
    for (let i = 0; i <= 8; i++) {
      const y = padding + (chartHeight - 2 * padding) * i / 8
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // 垂直網格線
    for (let i = 0; i <= 10; i++) {
      const x = padding + (width - 2 * padding) * i / 10
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, chartHeight - padding)
      ctx.stroke()
    }
  }

  // 改善的價格標籤繪製（避免遮擋）
  const drawPriceLabels = (ctx: CanvasRenderingContext2D, width: number, padding: number, chartHeight: number, minPrice: number, maxPrice: number) => {
    ctx.fillStyle = '#6b7280'
    ctx.font = '11px Arial'
    ctx.textAlign = 'left' // 改為左對齊，放在左側
    ctx.textBaseline = 'middle'

    for (let i = 0; i <= 8; i++) {
      const y = padding + (chartHeight - 2 * padding) * i / 8
      const price = maxPrice - (maxPrice - minPrice) * i / 8
      
      // 左側價格標籤
      ctx.fillText(`$${price.toFixed(2)}`, 5, y)
    }
  }

  // 繪製 K 線
  const drawCandlesticks = (
    ctx: CanvasRenderingContext2D,
    data: ChartData[],
    width: number,
    padding: number,
    chartHeight: number,
    minPrice: number,
    priceRange: number
  ) => {
    const candleWidth = Math.max(1, Math.min(20, (width - 2 * padding) / data.length * 0.7))
    
    data.forEach((candle, index) => {
      const x = padding + (width - 2 * padding) * (index + 0.5) / data.length
      
      const openY = chartHeight - padding - (chartHeight - 2 * padding) * (candle.open - minPrice) / priceRange
      const closeY = chartHeight - padding - (chartHeight - 2 * padding) * (candle.close - minPrice) / priceRange
      const highY = chartHeight - padding - (chartHeight - 2 * padding) * (candle.high - minPrice) / priceRange
      const lowY = chartHeight - padding - (chartHeight - 2 * padding) * (candle.low - minPrice) / priceRange
      
      const isGreen = candle.close >= candle.open
      const bodyColor = isGreen ? '#10b981' : '#ef4444'
      const wickColor = isGreen ? '#065f46' : '#7f1d1d'
      
      // 繪製影線
      ctx.strokeStyle = wickColor
      ctx.lineWidth = Math.max(1, candleWidth / 8)
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()
      
      // 繪製實體
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(1, Math.abs(closeY - openY))
      
      ctx.fillStyle = bodyColor
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
      
      // 實體邊框
      ctx.strokeStyle = wickColor
      ctx.lineWidth = 0.5
      ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
    })
  }

  // 繪製線圖
  const drawLineChart = (
    ctx: CanvasRenderingContext2D,
    data: ChartData[],
    width: number,
    padding: number,
    chartHeight: number,
    minPrice: number,
    priceRange: number
  ) => {
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index + 0.5) / data.length
      const y = chartHeight - padding - (chartHeight - 2 * padding) * (point.close - minPrice) / priceRange

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // 繪製數據點
    ctx.fillStyle = '#3b82f6'
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index + 0.5) / data.length
      const y = chartHeight - padding - (chartHeight - 2 * padding) * (point.close - minPrice) / priceRange

      ctx.beginPath()
      ctx.arc(x, y, 2, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  // 繪製成交量
  const drawVolume = (
    ctx: CanvasRenderingContext2D,
    data: ChartData[],
    width: number,
    padding: number,
    canvasHeight: number,
    volumeHeight: number
  ) => {
    const volumeTop = canvasHeight - volumeHeight
    const maxVolume = Math.max(...data.map(d => d.volume))
    const barWidth = Math.max(1, (width - 2 * padding) / data.length * 0.7)
    
    // 成交量背景
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(padding, volumeTop, width - 2 * padding, volumeHeight)
    
    // 成交量標籤
    ctx.fillStyle = '#6b7280'
    ctx.font = '11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('成交量', 5, volumeTop + 15)
    
    data.forEach((candle, index) => {
      const x = padding + (width - 2 * padding) * (index + 0.5) / data.length
      const barHeight = (volumeHeight - 30) * candle.volume / maxVolume
      const y = canvasHeight - barHeight - 10
      
      const isGreen = candle.close >= candle.open
      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
      ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)
    })
  }

  // 繪製時間軸
  const drawTimeAxis = (ctx: CanvasRenderingContext2D, data: ChartData[], width: number, padding: number, canvasHeight: number) => {
    ctx.fillStyle = '#6b7280'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    
    const labelCount = Math.min(6, data.length)
    for (let i = 0; i < labelCount; i++) {
      const dataIndex = Math.floor(i * (data.length - 1) / (labelCount - 1))
      const x = padding + (width - 2 * padding) * (dataIndex + 0.5) / data.length
      
      const date = new Date(data[dataIndex].time)
      const timeLabel = date.toLocaleDateString('zh-TW', { 
        month: 'short', 
        day: 'numeric' 
      })
      
      ctx.fillText(timeLabel, x, canvasHeight - 5)
    }
  }

  // 改善的最新價格線（避免遮擋）
  const drawLatestPriceLine = (
    ctx: CanvasRenderingContext2D,
    latestCandle: ChartData,
    width: number,
    padding: number,
    chartHeight: number,
    minPrice: number,
    priceRange: number
  ) => {
    const y = chartHeight - padding - (chartHeight - 2 * padding) * (latestCandle.close - minPrice) / priceRange
    
    ctx.strokeStyle = latestCandle.close >= latestCandle.open ? '#10b981' : '#ef4444'
    ctx.lineWidth = 1
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding - 75, y) // 避開右側價格標籤區域
    ctx.stroke()
    ctx.setLineDash([])
    
    // 價格標籤放在右側但不遮擋圖表
    const labelX = width - 70
    const labelWidth = 65
    const labelHeight = 20
    
    ctx.fillStyle = latestCandle.close >= latestCandle.open ? '#10b981' : '#ef4444'
    ctx.fillRect(labelX, y - labelHeight/2, labelWidth, labelHeight)
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`$${latestCandle.close.toFixed(2)}`, labelX + labelWidth/2, y + 3)
  }

  // 畫線覆蓋層
  useEffect(() => {
    if (!overlayCanvasRef.current) return

    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    canvas.style.width = '100%'
    canvas.style.height = `${height}px`

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 繪製畫線
    drawingLines.forEach(line => {
      ctx.strokeStyle = line.color
      ctx.lineWidth = line.width
      ctx.lineCap = 'round'
      
      ctx.beginPath()
      ctx.moveTo(line.startX, line.startY)
      ctx.lineTo(line.endX, line.endY)
      ctx.stroke()
      
      // 端點
      ctx.fillStyle = line.color
      ctx.beginPath()
      ctx.arc(line.startX, line.startY, line.width + 1, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(line.endX, line.endY, line.width + 1, 0, 2 * Math.PI)
      ctx.fill()
    })

  }, [drawingLines, canvasSize, height])

  // 畫線事件處理
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return

    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    if (!isDrawing) {
      setStartPoint({x, y})
      setIsDrawing(true)
    } else {
      if (startPoint) {
        const newLine: DrawingLine = {
          id: `line_${Date.now()}`,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: x,
          endY: y,
          color: lineColor,
          width: lineWidth,
          label: `線條 ${drawingLines.length + 1}`
        }
        setDrawingLines(prev => [...prev, newLine])
        setStartPoint(null)
        setIsDrawing(false)
        setDrawingMode(false)
      }
    }
  }

  // 縮放和平移控制函數
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(10, prev * 1.5))
  }

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(0.1, prev / 1.5))
  }

  const panLeft = () => {
    setPanOffset(prev => Math.max(0, prev - 10))
  }

  const panRight = () => {
    const maxOffset = Math.max(0, safeData.length - Math.floor(safeData.length / zoomLevel))
    setPanOffset(prev => Math.min(maxOffset, prev + 10))
  }

  const resetView = () => {
    setZoomLevel(1)
    setPanOffset(0)
  }

  const clearAllLines = () => {
    setDrawingLines([])
    setStartPoint(null)
    setIsDrawing(false)
    setDrawingMode(false)
  }

  const latest = hasData ? safeData[safeData.length - 1] : null
  const previous = hasData && safeData.length > 1 ? safeData[safeData.length - 2] : null
  const priceChange = latest && previous ? latest.close - previous.close : 0
  const priceChangePercent = latest && previous ? (priceChange / previous.close) * 100 : 0

  return (
    <div className="w-full space-y-4">
      {/* 工具欄 */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-bold text-gray-800">{symbol}</h3>
            {latest && (
              <div className="flex items-center space-x-3 text-sm">
                <span className="bg-blue-100 px-3 py-1 rounded-lg font-bold text-lg">
                  ${latest.close.toFixed(2)}
                </span>
                <span className={`px-3 py-1 rounded-lg font-bold ${
                  priceChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
                <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  顯示 {viewRange.endIndex - viewRange.startIndex}/{safeData.length} 條
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                chartType === 'candlestick' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              📊 K線圖
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              📈 線圖
            </button>
          </div>
        </div>
        
        {/* 縮放和平移控制 */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">圖表控制:</span>
            <button onClick={zoomIn} className="px-3 py-1 bg-green-500 text-white rounded text-sm">
              🔍+ 放大
            </button>
            <button onClick={zoomOut} className="px-3 py-1 bg-green-500 text-white rounded text-sm">
              🔍- 縮小
            </button>
            <button onClick={panLeft} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              ← 左移
            </button>
            <button onClick={panRight} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              右移 →
            </button>
            <button onClick={resetView} className="px-3 py-1 bg-gray-500 text-white rounded text-sm">
              🔄 重置視圖
            </button>
            <span className="text-xs text-gray-600">
              縮放: {zoomLevel.toFixed(1)}x
            </span>
          </div>
        </div>
        
        {/* 畫線和顯示選項 */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDrawingMode(!drawingMode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                drawingMode ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              📏 {drawingMode ? '結束畫線' : '開始畫線'}
            </button>
            
            {drawingMode && (
              <>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="w-10 h-10 rounded border"
                />
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">{lineWidth}px</span>
              </>
            )}
            
            <button
              onClick={clearAllLines}
              className="px-3 py-2 rounded-lg text-sm bg-red-500 text-white font-medium"
              disabled={drawingLines.length === 0}
            >
              🗑️ 清除 ({drawingLines.length})
            </button>
          </div>
          
          <label className="flex items-center text-sm font-medium">
            <input
              type="checkbox"
              checked={showVolume}
              onChange={(e) => setShowVolume(e.target.checked)}
              className="mr-2"
            />
            顯示成交量
          </label>
        </div>
        
        {drawingMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {isDrawing 
              ? '🎯 請點擊圖表上的終點位置完成線條繪製'
              : '🎯 請點擊圖表上的起點位置開始繪製線條'
            }
          </div>
        )}
      </div>

      {/* 圖表容器 */}
      <div 
        ref={containerRef}
        className="relative border-2 border-gray-200 rounded-lg bg-white overflow-hidden shadow-lg"
      >
        {hasData ? (
          <>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 block"
            />
            <canvas
              ref={overlayCanvasRef}
              className={`absolute inset-0 block ${drawingMode ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handleCanvasClick}
            />
            
            <div style={{ height: `${height}px` }} className="w-full"></div>
          </>
        ) : (
          <div className="flex items-center justify-center bg-gray-50" style={{ height: `${height}px` }}>
            <div className="text-center text-gray-500">
              <div className="text-8xl mb-4">📊</div>
              <p className="text-xl font-medium">等待 K 線圖數據載入...</p>
            </div>
          </div>
        )}
      </div>

      {/* 統計信息 */}
      {hasData && latest && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">📊 詳細統計資訊</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">開盤價</div>
              <div className="text-lg font-bold text-blue-600">${latest.open.toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">最高價</div>
              <div className="text-lg font-bold text-green-600">
                ${Math.max(...safeData.slice(viewRange.startIndex, viewRange.endIndex).map(d => d.high)).toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">最低價</div>
              <div className="text-lg font-bold text-red-600">
                ${Math.min(...safeData.slice(viewRange.startIndex, viewRange.endIndex).map(d => d.low)).toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">收盤價</div>
              <div className="text-lg font-bold text-gray-800">${latest.close.toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">成交量</div>
              <div className="text-lg font-bold text-purple-600">
                {(latest.volume / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-sm text-gray-600 mb-1">畫線數量</div>
              <div className="text-lg font-bold text-indigo-600">{drawingLines.length} 條</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleCandlestickChart