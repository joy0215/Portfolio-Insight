// frontend/src/components/charts/TradingViewChart.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TradingViewChartProps {
  symbol: string
  data: ChartData[]
  height?: number
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  symbol, 
  data = [],
  height = 500 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('line')
  const [chart, setChart] = useState<any>(null)

  // 安全檢查數據
  const safeData = Array.isArray(data) ? data : []
  const hasData = safeData.length > 0

  useEffect(() => {
    let mounted = true

    const initChart = async () => {
      if (!chartContainerRef.current || !hasData) return

      try {
        // 動態導入 lightweight-charts
        const { createChart } = await import('lightweight-charts')
        
        if (!mounted) return

        // 創建圖表
        const newChart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: height,
          layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
          },
          crosshair: { mode: 1 },
          rightPriceScale: { borderColor: '#cccccc' },
          timeScale: {
            borderColor: '#cccccc',
            timeVisible: true,
            secondsVisible: false,
          },
        })

        setChart(newChart)

        // 添加數據系列
        if (chartType === 'candlestick') {
          const candlestickSeries = newChart.addCandlestickSeries({
            upColor: '#00C851',
            downColor: '#ff4444',
            borderDownColor: '#ff4444',
            borderUpColor: '#00C851',
            wickDownColor: '#ff4444',
            wickUpColor: '#00C851',
          })

          const chartData = safeData.map(item => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }))

          candlestickSeries.setData(chartData)
        } else {
          const lineSeries = newChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
          })

          const lineData = safeData.map(item => ({
            time: item.time,
            value: item.close,
          }))

          lineSeries.setData(lineData)
        }

        // 成交量系列
        const volumeSeries = newChart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
          scaleMargins: { 
            top: 0.8, bottom: 0 
          },
        })

        const volumeData = safeData.map(item => ({
          time: item.time,
          value: item.volume,
          color: item.close >= item.open ? '#00C851' : '#ff4444',
        }))

        volumeSeries.setData(volumeData)

        // 自動縮放
        newChart.timeScale().fitContent()

        // 處理視窗大小變化
        const handleResize = () => {
          if (chartContainerRef.current && newChart) {
            newChart.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            })
          }
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (newChart) {
            newChart.remove()
          }
        }

      } catch (error) {
        console.error('Error creating chart:', error)
      }
    }

    initChart()

    return () => {
      mounted = false
      if (chart) {
        chart.remove()
        setChart(null)
      }
    }
  }, [hasData, chartType, height])

  // 計算統計數據
  const getStatistics = () => {
    if (!hasData) {
      return {
        latest: null,
        maxHigh: 0,
        minLow: 0,
        latestVolume: 0
      }
    }

    const latest = safeData[safeData.length - 1]
    const maxHigh = Math.max(...safeData.map(d => d.high))
    const minLow = Math.min(...safeData.map(d => d.low))
    const latestVolume = latest?.volume || 0

    return { latest, maxHigh, minLow, latestVolume }
  }

  const stats = getStatistics()

  return (
    <div className="w-full">
      {/* 圖表控制工具欄 */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-bold text-gray-800">{symbol} 技術線圖</h3>
          <div className="flex space-x-2">
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
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>數據點: {safeData.length}</span>
          <span>|</span>
          <span>最新: ${stats.latest?.close.toFixed(2) || 'N/A'}</span>
        </div>
      </div>

      {/* 圖表容器 */}
      <div 
        ref={chartContainerRef} 
        className="w-full border rounded-lg bg-white"
        style={{ height: `${height}px` }}
      >
        {/* 如果沒有數據，顯示佔位符 */}
        {!hasData && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>等待圖表數據載入...</p>
            </div>
          </div>
        )}
      </div>

      {/* 圖表說明 */}
      {hasData && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">開盤價:</span>
              <span className="ml-2 font-medium">${stats.latest?.open.toFixed(2) || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">最高價:</span>
              <span className="ml-2 font-medium">${stats.maxHigh.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">最低價:</span>
              <span className="ml-2 font-medium">${stats.minLow.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">成交量:</span>
              <span className="ml-2 font-medium">{stats.latestVolume.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradingViewChart