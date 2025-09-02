# 📊 Portfolio Insight 投資組合洞察系統

> 專業的股票投資管理與市場分析平台  
> 整合全球股市數據、台股監控、技術分析、投資組合管理於一體

![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![Django](https://img.shields.io/badge/Django-4.2-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## 🎯 系統概述

Portfolio Insight 是一個現代化的投資組合管理系統，提供：

- 🌍 全球股市即時監控
- 🇹🇼 台股大盤與漲跌停專業分析
- 📈 專業級 K 線圖表與技術分析
- ⭐ 智能自選股管理
- 💼 投資組合績效追蹤
- 🔍 市場情緒與投資建議

**作者**: ChiaHsien Wu
**開發時間**: 2025年  
**更新日期**: 2025-09-02

---

## ✅ 已完成功能

### 🎨 前端系統

- Next.js 14 + TypeScript + Tailwind CSS
- 響應式設計，適配桌面與手機
- 智能導航（單一下拉選單）
- 組件化設計，方便擴充
- 自動刷新、手動刷新功能

### 🔧 後端 API

- Django REST Framework
- 完整路由配置與健康檢查 API
- 錯誤處理完善
- 輸入驗證與數據清理
- CORS 支援

### 📈 技術分析

- TradingView 整合
- 多時間週期切換
- 技術指標支援（MA, MACD, RSI, BB等）
- 股票搜尋功能
- 即時價格顯示
- 完整的圖表頁面 (`/charts`)

### ⭐ 自選股系統

- 新增/刪除自選股
- 分組功能與顏色標記
- 批量操作
- 即時價格刷新
- 智能搜尋

### 💼 投資組合

- 持股管理與記錄
- 平均成本自動計算
- 績效分析（收益率、風險）
- 分散度分析（行業、地區）
- 交易歷史追蹤

### 🌍 市場監控

- 全球股市（美股、港股、台股）
- 主要指數與熱門股票
- 多個數據源連接
- 市場情緒分析
- 股票推薦

---

## 🚧 開發中功能

- 台股專業監控（漲跌停）連接官方 API
- 台股價格規則（跳動單位）正確處理
- 交易時段判斷（自動顯示開市/休市）
- 進階技術分析工具
- 策略回測、風險量化
- 智能提醒（價格警報、新聞推播、技術信號）
- AI 投資建議與多語言支援

---

## 🏗️ 技術架構

### 前端技術棧

```
Next.js 14
├── TypeScript 5.0
├── Tailwind CSS 3.4
├── React 18
├── TradingView Charting
├── Lucide React
└── ESLint + Prettier
```

### 後端技術棧

```
Django 4.2
├── Django REST Framework
├── SQLite / PostgreSQL
├── yfinance
├── pandas
├── requests
└── CORS Headers
```

### 數據來源

- Yahoo Finance
- 台灣證券交易所
- TradingView
- Alpha Vantage

---

## 🚀 快速開始

### 環境要求

- Node.js 18+
- Python 3.9+
- Git

### 1. 克隆專案

```bash
git clone https://github.com/joy0215/Portfolio-Insight.git
cd portfolio-insight
```

### 2. 後端設置

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 3. 前端設置

```bash
cd frontend
npm install
npm run dev
```

### 4. 訪問應用

- 前端: http://localhost:3000
- 後端 API: http://localhost:8000

---

## 📚 API 文檔

### 基礎 API

```
GET  /api/portfolios/health/           # 系統健康檢查
GET  /api/portfolios/status/           # 系統狀態
GET  /api/portfolios/test/             # API 測試
```

### 市場數據 API

```
GET  /api/portfolios/market-overview/         # 市場總覽
GET  /api/portfolios/real-data/{symbol}/      # 股票數據
GET  /api/portfolios/search/?q={query}        # 股票搜尋
```

### 台股專用 API

```
GET  /api/portfolios/taiwan/market-overview/  # 台股總覽
GET  /api/portfolios/taiwan/indices/          # 台股指數
GET  /api/portfolios/taiwan/limit-stocks/     # 漲跌停股票
```

### 自選股 API

```
GET    /api/portfolios/watchlist/stocks/       # 獲取自選股
POST   /api/portfolios/watchlist/stocks/       # 新增自選股
PUT    /api/portfolios/watchlist/stocks/{id}/  # 更新自選股
DELETE /api/portfolios/watchlist/stocks/{id}/  # 刪除自選股
```

### 投資組合 API

```
GET  /api/portfolios/portfolio-holdings/      # 投資組合持股
POST /api/portfolios/portfolio-holdings/      # 新增持股
GET  /api/portfolios/portfolio-analysis/      # 投資組合分析
GET  /api/portfolios/portfolio-performance/   # 績效分析
```

---

## 🎨 頁面結構

```
Portfolio Insight
├── 🏠 首頁 (/)
│   └── 系統總覽與快速導航
├── 🌍 市場中心
│   ├── 📊 全球市場 (/market)
│   ├── 🇹🇼 台股監控 (/taiwan-market)
│   └── 📈 K線圖表 (/charts)
└── 💼 投資管理
    ├── ⭐ 自選股 (/watchlist)
    ├── 💼 投資組合 (/portfolio)
    └── 🔍 投資分析 (/analysis)
```

---

## 🔧 配置說明

### 環境變量

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# backend/.env
DEBUG=True
SECRET_KEY=your-secret-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

---

## 📱 截圖展示

> 詳見 `docs/screenshots` 或 README 圖片區

- 🖥️ 現代化儀表板設計
- 📊 專業級圖表工具
- 📱 完美響應式設計

---

## 🤝 貢獻指南

### 開發流程

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 開啟 Pull Request

### 代碼規範

- 使用 TypeScript 進行類型檢查
- 遵循 ESLint 代碼規範
- 編寫有意義的提交信息
- 添加適當的註釋和文檔

---

## 📄 許可證

本專案採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情

---

## 👨‍💻 作者信息

**JoyWuFN**  
🌐 GitHub: [@JoyWuFN](https://github.com/joy0215)  
📧 Email: 11056017@gmail.com
💼 專業: 全端開發工程師

---

## 🙏 致謝

- Next.js – 強大的 React 框架
- Django – 優雅的 Python Web 框架
- TradingView – 專業圖表工具
- Yahoo Finance – 可靠的股票數據源
- Tailwind CSS – 實用 CSS 框架

---

## 📊 系統狀態

![GitHub last commit](https://img.shields.io/github/last-commit/JoyWu/portfolio-insight)
![GitHub issues](https://img.shields.io/github/issues/JoyWu/portfolio-insight)
![GitHub stars](https://img.shields.io/github/stars/JoyWu/portfolio-insight)
![GitHub forks](https://img.shields.io/github/forks/JoyWu/portfolio-insight)

---

## 🔮 未來規劃

### 短期目標 (1-3個月)
- 🇹🇼 完善台股即時數據連接
- 🔔 實現價格警報功能
- 📊 增加更多技術指標
- 📱 優化移動端體驗

### 中期目標 (3-6個月)
- 🤖 AI 投資建議系統
- 📈 策略回測功能
- 🌐 多語言支持
- ☁️ 雲端部署

### 長期目標 (6個月以上)
- 📊 機器學習價格預測
- 🔗 區塊鏈資產支持
- 👥 社群投資功能
- 📈 專業級風險管理

---

*Made with ❤️ by JoyWu | © 2025 Portfolio Insight*