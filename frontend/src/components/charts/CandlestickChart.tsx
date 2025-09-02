// frontend/src/components/charts/CandlestickChart.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, UTCTimestamp } from 'lightweight-charts'

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
  startPoint: { time: string; price: number }
  endPoint: { time: string; price: number }
  color: string
  style: 'solid' | 'dashed' | 'dotted'
  width: number
  label?: string
}

interface CandlestickChartProps {
  symbol: string
  data: ChartData[]
  height?: number
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  symbol, 
  data = [],
  height = 600 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [drawingMode, setDrawingMode] = useState<'none' | 'line' | 'horizontal' | 'trend'>('none')
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLine, setCurrentLine] = useState<Partial<DrawingLine> | null>(null)
  const [selectedLineColor, setSelectedLineColor] = useState('#FF0000')
  const [selectedLineStyle, setSelectedLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [selectedLineWidth, setSelectedLineWidth] = useState(2)

  // 安全檢查數據
  const safeData = Array.isArray(data) ? data : []
  const hasData = safeData.length > 0

  useEffect(() => {
    if (!chartContainerRef.current || !hasData) return

    let mounted = true

    const initChart = async () => {
      try {
        // 動態導入 lightweight-charts
        const { createChart } = await import('lightweight-charts')
        
        if (!mounted || !chartContainerRef.current) return

        // 創建圖表
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: height,
          layout: {
            backgroundColor: '#ffffff',
            textColor: '#333333',
            fontSize: 12,
            fontFamily: 'Arial, sans-serif',
          },
          grid: {
            vertLines: {
              color: '#f0f0f0',
              style: 1,
              visible: true,
            },
            horzLines: {
              color: '#f0f0f0',
              style: 1,
              visible: true,
            },
          },
          crosshair: {
            mode: 1,
            vertLine: {
              color: '#758696',
              width: 1,
              style: 3,
              visible: true,
              labelVisible: true,
            },
            horzLine: {
              color: '#758696',
              width: 1,
              style: 3,
              visible: true,
              labelVisible: true,
            },
          },
          rightPriceScale: {
            borderColor: '#cccccc',
            textColor: '#333333',
            entireTextOnly: false,
          },
          timeScale: {
            borderColor: '#cccccc',
            textColor: '#333333',
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: true,
          handleScale: true,
        })

        chartRef.current = chart

        // 轉換數據格式
        const candlestickData: CandlestickData[] = safeData.map(item => ({
          time: item.time as UTCTimestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))

        const volumeData = safeData.map(item => ({
          time: item.time as UTCTimestamp,
          value: item.volume,
          color: item.close >= item.open ? 'rgba(0, 200, 81, 0.8)' : 'rgba(255, 68, 68, 0.8)',
        }))

        if (chartType === 'candlestick') {
          // K 線圖系列
          const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#00C851',
            downColor: '#ff4444',
            borderDownColor: '#ff4444',
            borderUpColor: '#00C851',
            wickDownColor: '#ff4444',
            wickUpColor: '#00C851',
            priceScaleId: 'right',
          })
          candlestickSeriesRef.current = candlestickSeries
          candlestickSeries.setData(candlestickData)
        } else {
          // 線圖系列
          const lineSeries = chart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            priceScaleId: 'right',
          })
          lineSeriesRef.current = lineSeries
          
          const lineData: LineData[] = safeData.map(item => ({
            time: item.time as UTCTimestamp,
            value: item.close,
          }))
          lineSeries.setData(lineData)
        }

        // 成交量系列
        const volumeSeries = chart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.7,
            bottom: 0,
          },
        })
        volumeSeriesRef.current = volumeSeries
        volumeSeries.setData(volumeData)

        // 自動縮放
        chart.timeScale().fitContent()

        // 添加畫線功能的事件監聽
        chart.subscribeClick((param) => {
          if (drawingMode === 'none') return
          
          const clickedPrice = param.point?.y ? chart.priceScale('right').coordinateToPrice(param.point.y) : null
          const clickedTime = param.time
          
          if (!clickedPrice || !clickedTime) return

          handleChartClick(clickedTime as string, clickedPrice as number)
        })

        // 處理視窗大小變化
        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            })
          }
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (chart) {
            chart.remove()
          }
        }

      } catch (error) {
        console.error('Error creating chart:', error)
      }
    }

    initChart()

    return () => {
      mounted = false
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [hasData, chartType, height])

  // 重新繪製所有線條
  useEffect(() => {
    if (!chartRef.current) return

    // 這裡需要實現繪製線條的邏輯
    // 由於 lightweight-charts 的限制，我們需要使用 line series 來模擬繪製線條
    drawingLines.forEach((line, index) => {
      const lineSeries = chartRef.current!.addLineSeries({
        color: line.color,
        lineWidth: line.width,
        lineStyle: line.style === 'dashed' ? 1 : line.style === 'dotted' ? 2 : 0,
        priceScaleId: 'right',
      })

      const lineData: LineData[] = [
        { time: line.startPoint.time as UTCTimestamp, value: line.startPoint.price },
        { time: line.endPoint.time as UTCTimestamp, value: line.endPoint.price }
      ]
      
      lineSeries.setData(lineData)
    })
  }, [drawingLines])

  const handleChartClick = (time: string, price: number) => {
    if (!isDrawing) {
      // 開始畫線
      setCurrentLine({
        id: `line_${Date.now()}`,
        startPoint: { time, price },
        color: selectedLineColor,
        style: selectedLineStyle,
        width: selectedLineWidth,
      })
      setIsDrawing(true)
    } else {
      // 完成畫線
      if (currentLine) {
        const completedLine: DrawingLine = {
          ...currentLine as DrawingLine,
          endPoint: { time, price }
        }
        setDrawingLines(prev => [...prev, completedLine])
        setCurrentLine(null)
        setIsDrawing(false)
        setDrawingMode('none')
      }
    }
  }

  const clearAllLines = () => {
    setDrawingLines([])
    setCurrentLine(null)
    setIsDrawing(false)
    setDrawingMode('none')
    
    // 重新初始化圖表以清除所有線條
    if (chartRef.current) {
      chartRef.current.remove()
      // 觸發重新渲染
      setTimeout(() => {
        // 這裡會觸發 useEffect 重新創建圖表
      }, 100)
    }
  }

  const cancelDrawing = () => {
    setCurrentLine(null)
    setIsDrawing(false)
    setDrawingMode('none')
  }

  // 計算統計數據
  const getStatistics = () => {
    if (!hasData) {
      return {
        latest: null,
        maxHigh: 0,
        minLow: 0,
        latestVolume: 0,
        priceChange: 0,
        priceChangePercent: 0
      }
    }

    const latest = safeData[safeData.length - 1]
    const previous = safeData[safeData.length - 2]
    const maxHigh = Math.max(...safeData.map(d => d.high))
    const minLow = Math.min(...safeData.map(d => d.low))
    const latestVolume = latest?.volume || 0
    const priceChange = previous ? latest.close - previous.close : 0
    const priceChangePercent = previous ? (priceChange / previous.close) * 100 : 0

    return { latest, maxHigh, minLow, latestVolume, priceChange, priceChangePercent }
  }

  const stats = getStatistics()

  return (
    <div className="w-full">
      {/* 圖表控制工具欄 */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 圖表類型 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">圖表類型:</span>
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1 rounded text-sm ${
                chartType === 'candlestick' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border'
              }`}
              disabled={!hasData}
            >
              📊 K線圖
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded text-sm ${
                chartType === 'line' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border'
              }`}
              disabled={!hasData}
            >
              📈 線圖
            </button>
          </div>

          {/* 畫線工具 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">畫線工具:</span>
            <button
              onClick={() => setDrawingMode(drawingMode === 'line' ? 'none' : 'line')}
              className={`px-3 py-1 rounded text-sm ${
                drawingMode === 'line' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-600 border'
              }`}
              disabled={!hasData}
            >
              📏 趨勢線
            </button>
            <button
              onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
              className={`px-3 py-1 rounded text-sm ${
                drawingMode === 'horizontal' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-600 border'
              }`}
              disabled={!hasData}
            >
              ➖ 水平線
            </button>
            {isDrawing && (
              <button
                onClick={cancelDrawing}
                className="px-3 py-1 rounded text-sm bg-yellow-500 text-white"
              >
                ❌ 取消畫線
              </button>
            )}
            <button
              onClick={clearAllLines}
              className="px-3 py-1 rounded text-sm bg-red-500 text-white"
              disabled={drawingLines.length === 0}
            >
              🗑️ 清除線條
            </button>
          </div>

          {/* 線條樣式 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">線條樣式:</span>
            <input
              type="color"
              value={selectedLineColor}
              onChange={(e) => setSelectedLineColor(e.target.value)}
              className="w-8 h-8 rounded border"
            />
            <select
              value={selectedLineStyle}
              onChange={(e) => setSelectedLineStyle(e.target.value as 'solid' | 'dashed' | 'dotted')}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="solid">實線</option>
              <option value="dashed">虛線</option>
              <option value="dotted">點線</option>
            </select>
            <input
              type="range"
              min="1"
              max="5"
              value={selectedLineWidth}
              onChange={(e) => setSelectedLineWidth(Number(e.target.value))}
              className="w-16"
            />
            <span className="text-xs text-gray-600">{selectedLineWidth}px</span>
          </div>
        </div>

        {/* 繪圖狀態提示 */}
        {drawingMode !== 'none' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {isDrawing 
              ? '🎯 請點擊圖表上的終點位置完成線條繪製'
              : '🎯 請點擊圖表上的起點位置開始繪製線條'
            }
          </div>
        )}

        {/* 已繪製線條列表 */}
        {drawingLines.length > 0 && (
          <div className="mt-2">
            <span className="text-sm font-medium text-gray-700">已繪製線條 ({drawingLines.length}):</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {drawingLines.map((line, index) => (
                <span
                  key={line.id}
                  className="inline-block px-2 py-1 bg-gray-200 text-xs rounded"
                  style={{ borderLeft: `3px solid ${line.color}` }}
                >
                  線條 {index + 1}
                  <button
                    onClick={() => setDrawingLines(prev => prev.filter(l => l.id !== line.id))}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 股票信息 */}
        <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-bold text-lg text-gray-800">{symbol}</span>
            <span className="ml-4">數據點: {safeData.length}</span>
            {stats.latest && (
              <>
                <span className="ml-4">最新: ${stats.latest.close.toFixed(2)}</span>
                <span className={`ml-2 ${stats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(2)} / {stats.priceChangePercent.toFixed(2)}%)
                </span>
              </>
            )}
          </div>
          <div>
            圖表類型: {chartType === 'candlestick' ? 'K線圖' : '線圖'} | 
            畫線模式: {drawingMode === 'none' ? '關閉' : drawingMode === 'line' ? '趨勢線' : '水平線'}
          </div>
        </div>
      </div>

      {/* 圖表容器 */}
      <div 
        ref={chartContainerRef} 
        className="w-full border rounded-lg bg-white cursor-crosshair"
        style={{ height: `${height}px` }}
      >
        {/* 如果沒有數據，顯示佔位符 */}
        {!hasData && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>等待 K 線圖數據載入...</p>
            </div>
          </div>
        )}
      </div>

      {/* 圖表說明 */}
      {hasData && stats.latest && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">開盤價:</span>
              <span className="ml-2 font-medium">${stats.latest.open.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">最高價:</span>
              <span className="ml-2 font-medium text-green-600">${stats.maxHigh.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">最低價:</span>
              <span className="ml-2 font-medium text-red-600">${stats.minLow.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">收盤價:</span>
              <span className="ml-2 font-medium">${stats.latest.close.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">成交量:</span>
              <span className="ml-2 font-medium">{stats.latestVolume.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">漲跌額:</span>
              <span className={`ml-2 font-medium ${stats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.priceChange.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">漲跌幅:</span>
              <span className={`ml-2 font-medium ${stats.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">已畫線條:</span>
              <span className="ml-2 font-medium">{drawingLines.length} 條</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandlestickChart