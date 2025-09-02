# backend/portfolios/stock_data_service.py

import yfinance as yf
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np

# 設置日誌
logger = logging.getLogger(__name__)

class StockDataService:
    """股票數據服務類 - 提供股票數據獲取和處理功能"""
    
    # 股票代碼映射和區域配置
    SYMBOL_MAPPING = {
        # 美股熱門股票
        'US_POPULAR': [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 
            'BABA', 'CRM', 'ADBE', 'ORCL', 'INTC', 'AMD', 'UBER', 'SNAP',
            'PYPL', 'SQ', 'ZOOM', 'ROKU', 'TWLO', 'SHOP', 'SPOT', 'ZM'
        ],
        # 台股熱門股票
        'TW_POPULAR': [
            '2330.TW', '2454.TW', '2317.TW', '3008.TW', '2881.TW', '2882.TW',
            '2303.TW', '2412.TW', '2308.TW', '2002.TW', '1301.TW', '1303.TW',
            '6505.TW', '3711.TW', '2891.TW', '2892.TW'
        ],
        # 港股熱門股票
        'HK_POPULAR': [
            '0700.HK', '0941.HK', '1398.HK', '0939.HK', '1299.HK', '2318.HK',
            '0388.HK', '1113.HK', '3988.HK', '2628.HK', '1810.HK', '0005.HK'
        ]
    }
    
    # 市場指數配置
    MARKET_INDICES = {
        'US': {
            '^DJI': '道瓊工業指數',
            '^IXIC': '納斯達克綜合指數', 
            '^GSPC': '標普500指數',
            '^RUT': '羅素2000指數'
        },
        'TW': {
            '^TWII': '台股加權指數',
            '^TW50': '台灣50指數'
        },
        'HK': {
            '^HSI': '恆生指數',
            '^HSCE': '恆生中國企業指數'
        },
        'EU': {
            '^GDAXI': '德國DAX指數',
            '^FCHI': '法國CAC40指數',
            '^FTSE': '英國富時100指數'
        },
        'ASIA': {
            '^N225': '日經225指數',
            '^KS11': '韓國KOSPI指數',
            '000001.SS': '上證綜指'
        }
    }
    
    # 板塊ETF配置
    SECTOR_ETFS = {
        'Technology': 'XLK',
        'Healthcare': 'XLV', 
        'Financials': 'XLF',
        'Consumer Discretionary': 'XLY',
        'Communication Services': 'XLC',
        'Industrials': 'XLI',
        'Consumer Staples': 'XLP',
        'Energy': 'XLE',
        'Utilities': 'XLU',
        'Real Estate': 'XLRE',
        'Materials': 'XLB'
    }

    @staticmethod
    def get_real_stock_data(symbol: str) -> Optional[Dict[str, Any]]:
        """
        獲取股票的實時數據
        
        Args:
            symbol: 股票代碼
            
        Returns:
            包含股票基本信息的字典，如果失敗則返回 None
        """
        try:
            logger.info(f"正在獲取股票 {symbol} 的實時數據")
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period='2d')  # 獲取最近2天數據用於計算漲跌
            
            if hist.empty:
                logger.warning(f"無法獲取 {symbol} 的歷史數據")
                return None
            
            # 獲取最新價格
            latest_close = hist['Close'].iloc[-1]
            
            # 計算漲跌
            change = 0
            change_percent = 0
            if len(hist) >= 2:
                previous_close = hist['Close'].iloc[-2]
                change = latest_close - previous_close
                change_percent = (change / previous_close) * 100 if previous_close != 0 else 0
            
            # 獲取成交量
            volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist and not hist['Volume'].empty else 0
            
            stock_data = {
                'symbol': symbol.upper(),
                'name': info.get('longName', info.get('shortName', symbol)),
                'exchange': info.get('exchange', 'Unknown'),
                'sector': info.get('sector', 'Unknown'),
                'current_price': round(float(latest_close), 2),
                'change': round(float(change), 2),
                'change_percent': round(float(change_percent), 2),
                'volume': volume,
                'market_cap': info.get('marketCap', 0),
                'pe_ratio': info.get('trailingPE', None),
                'dividend_yield': info.get('dividendYield', None),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh', None),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow', None),
                'average_volume': info.get('averageVolume', 0),
                'last_updated': datetime.now().isoformat()
            }
            
            logger.info(f"成功獲取 {symbol} 的股票數據")
            return stock_data
            
        except Exception as e:
            logger.error(f"獲取股票 {symbol} 數據時發生錯誤: {str(e)}")
            return None

    @staticmethod
    def get_historical_data(symbol: str, period: str = '1y') -> List[Dict[str, Any]]:
        """
        獲取股票的歷史數據
        
        Args:
            symbol: 股票代碼
            period: 時間週期 ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
            
        Returns:
            包含歷史數據的列表
        """
        try:
            logger.info(f"正在獲取股票 {symbol} 的歷史數據，週期: {period}")
            
            ticker = yf.Ticker(symbol)
            
            # 根據週期設置間隔
            if period in ['1d', '5d']:
                interval = '5m'  # 5分鐘間隔
            elif period in ['1mo']:
                interval = '1h'  # 1小時間隔
            else:
                interval = '1d'  # 1天間隔
            
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                logger.warning(f"無法獲取 {symbol} 的歷史數據")
                return []
            
            # 轉換為API需要的格式
            chart_data = []
            for index, row in hist.iterrows():
                try:
                    # 處理時間戳
                    if hasattr(index, 'strftime'):
                        time_str = index.strftime('%Y-%m-%d')
                        if interval in ['5m', '1h']:
                            time_str = index.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        time_str = str(index)
                    
                    data_point = {
                        'time': time_str,
                        'open': round(float(row['Open']), 2),
                        'high': round(float(row['High']), 2),
                        'low': round(float(row['Low']), 2),
                        'close': round(float(row['Close']), 2),
                        'volume': int(row['Volume']) if not pd.isna(row['Volume']) else 0
                    }
                    
                    # 驗證數據有效性
                    if (data_point['high'] >= data_point['low'] and 
                        data_point['high'] >= max(data_point['open'], data_point['close']) and
                        data_point['low'] <= min(data_point['open'], data_point['close'])):
                        chart_data.append(data_point)
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"跳過無效數據點: {e}")
                    continue
            
            logger.info(f"成功獲取 {symbol} 的 {len(chart_data)} 條歷史數據")
            return chart_data
            
        except Exception as e:
            logger.error(f"獲取股票 {symbol} 歷史數據時發生錯誤: {str(e)}")
            return []

    @staticmethod
    def get_market_indices() -> Dict[str, List[Dict[str, Any]]]:
        """
        獲取主要市場指數數據
        
        Returns:
            按地區分組的市場指數數據
        """
        try:
            logger.info("正在獲取市場指數數據")
            
            results = {}
            
            for region, indices in StockDataService.MARKET_INDICES.items():
                region_data = []
                
                for symbol, name in indices.items():
                    try:
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        hist = ticker.history(period='2d')
                        
                        if len(hist) >= 2:
                            current_price = hist['Close'].iloc[-1]
                            previous_price = hist['Close'].iloc[-2]
                            change = current_price - previous_price
                            change_percent = (change / previous_price) * 100
                            volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist and not hist['Volume'].empty else 0
                            
                            index_data = {
                                'symbol': symbol,
                                'name': name,
                                'current_price': round(float(current_price), 2),
                                'change': round(float(change), 2),
                                'change_percent': round(float(change_percent), 2),
                                'volume': volume,
                                'market_cap': info.get('marketCap', 0),
                                'last_updated': datetime.now().isoformat()
                            }
                            
                            region_data.append(index_data)
                            logger.debug(f"成功獲取指數 {symbol} 數據")
                        
                    except Exception as e:
                        logger.warning(f"獲取指數 {symbol} 數據失敗: {str(e)}")
                        continue
                
                results[region] = region_data
                logger.info(f"成功獲取 {region} 地區 {len(region_data)} 個指數數據")
            
            return results
            
        except Exception as e:
            logger.error(f"獲取市場指數數據時發生錯誤: {str(e)}")
            return {}

    @staticmethod
    def get_trending_stocks(region: str = 'US', limit: int = 20) -> List[Dict[str, Any]]:
        """
        獲取熱門股票數據
        
        Args:
            region: 地區代碼 ('US', 'TW', 'HK')
            limit: 返回數量限制
            
        Returns:
            熱門股票數據列表
        """
        try:
            logger.info(f"正在獲取 {region} 地區的熱門股票數據，限制 {limit} 條")
            
            # 根據地區選擇股票列表
            if region == 'TW':
                symbols = StockDataService.SYMBOL_MAPPING['TW_POPULAR'][:limit]
            elif region == 'HK':
                symbols = StockDataService.SYMBOL_MAPPING['HK_POPULAR'][:limit]
            else:  # 默認美股
                symbols = StockDataService.SYMBOL_MAPPING['US_POPULAR'][:limit]
            
            results = []
            
            for symbol in symbols:
                try:
                    stock_data = StockDataService.get_real_stock_data(symbol)
                    if stock_data:
                        results.append(stock_data)
                except Exception as e:
                    logger.warning(f"獲取熱門股票 {symbol} 數據失敗: {str(e)}")
                    continue
            
            # 按漲跌幅排序
            results.sort(key=lambda x: x.get('change_percent', 0), reverse=True)
            
            logger.info(f"成功獲取 {len(results)} 條熱門股票數據")
            return results
            
        except Exception as e:
            logger.error(f"獲取熱門股票數據時發生錯誤: {str(e)}")
            return []

    @staticmethod
    def get_gainers_losers() -> Dict[str, Any]:
        """
        獲取漲跌幅排行榜
        
        Returns:
            包含漲幅和跌幅排行的字典
        """
        try:
            logger.info("正在獲取漲跌幅排行榜數據")
            
            # 使用美股熱門股票進行排行
            symbols = StockDataService.SYMBOL_MAPPING['US_POPULAR']
            all_stocks = []
            
            for symbol in symbols:
                try:
                    stock_data = StockDataService.get_real_stock_data(symbol)
                    if stock_data and 'change_percent' in stock_data:
                        all_stocks.append(stock_data)
                except Exception as e:
                    logger.warning(f"獲取股票 {symbol} 數據失敗: {str(e)}")
                    continue
            
            # 按漲跌幅排序
            all_stocks.sort(key=lambda x: x.get('change_percent', 0), reverse=True)
            
            result = {
                'gainers': all_stocks[:10],  # 前10名漲幅
                'losers': all_stocks[-10:],  # 前10名跌幅
                'last_updated': datetime.now().isoformat()
            }
            
            logger.info(f"成功獲取漲跌幅排行榜，漲幅 {len(result['gainers'])} 條，跌幅 {len(result['losers'])} 條")
            return result
            
        except Exception as e:
            logger.error(f"獲取漲跌幅排行榜時發生錯誤: {str(e)}")
            return {'gainers': [], 'losers': [], 'error': str(e)}

    @staticmethod
    def get_volume_leaders(limit: int = 15) -> List[Dict[str, Any]]:
        """
        獲取成交量排行榜
        
        Args:
            limit: 返回數量限制
            
        Returns:
            成交量排行數據列表
        """
        try:
            logger.info(f"正在獲取成交量排行榜，限制 {limit} 條")
            
            symbols = StockDataService.SYMBOL_MAPPING['US_POPULAR']
            volume_data = []
            
            for symbol in symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period='1d')
                    info = ticker.info
                    
                    if not hist.empty:
                        current_price = hist['Close'].iloc[-1]
                        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 0
                        
                        # 計算漲跌幅
                        change_percent = 0
                        if len(hist) >= 2:
                            previous_price = hist['Close'].iloc[-2]
                            change_percent = ((current_price - previous_price) / previous_price) * 100
                        
                        volume_data.append({
                            'symbol': symbol,
                            'name': info.get('longName', info.get('shortName', symbol)),
                            'volume': volume,
                            'current_price': round(float(current_price), 2),
                            'change_percent': round(float(change_percent), 2),
                            'avg_volume': info.get('averageVolume', 0),
                            'sector': info.get('sector', 'Unknown')
                        })
                        
                except Exception as e:
                    logger.warning(f"獲取股票 {symbol} 成交量數據失敗: {str(e)}")
                    continue
            
            # 按成交量排序
            volume_data.sort(key=lambda x: x['volume'], reverse=True)
            
            result = volume_data[:limit]
            logger.info(f"成功獲取 {len(result)} 條成交量排行數據")
            return result
            
        except Exception as e:
            logger.error(f"獲取成交量排行榜時發生錯誤: {str(e)}")
            return []

    @staticmethod
    def get_sector_performance() -> List[Dict[str, Any]]:
        """
        獲取板塊表現數據
        
        Returns:
            板塊表現數據列表
        """
        try:
            logger.info("正在獲取板塊表現數據")
            
            sector_data = []
            
            for sector_name, etf_symbol in StockDataService.SECTOR_ETFS.items():
                try:
                    ticker = yf.Ticker(etf_symbol)
                    hist = ticker.history(period='2d')
                    info = ticker.info
                    
                    if len(hist) >= 2:
                        current_price = hist['Close'].iloc[-1]
                        previous_price = hist['Close'].iloc[-2]
                        change = current_price - previous_price
                        change_percent = (change / previous_price) * 100
                        
                        sector_data.append({
                            'sector': sector_name,
                            'symbol': etf_symbol,
                            'change_percent': round(float(change_percent), 2),
                            'current_price': round(float(current_price), 2),
                            'change': round(float(change), 2),
                            'volume': int(hist['Volume'].iloc[-1]) if 'Volume' in hist else 0,
                            'market_cap': info.get('marketCap', 0)
                        })
                        
                        logger.debug(f"成功獲取板塊 {sector_name} 數據")
                        
                except Exception as e:
                    logger.warning(f"獲取板塊 {sector_name} 數據失敗: {str(e)}")
                    continue
            
            # 按表現排序
            sector_data.sort(key=lambda x: x['change_percent'], reverse=True)
            
            logger.info(f"成功獲取 {len(sector_data)} 個板塊表現數據")
            return sector_data
            
        except Exception as e:
            logger.error(f"獲取板塊表現數據時發生錯誤: {str(e)}")
            return []

    @staticmethod
    def get_market_status() -> Dict[str, Any]:
        """
        獲取市場狀態信息
        
        Returns:
            市場狀態信息字典
        """
        try:
            logger.info("正在獲取市場狀態信息")
            
            now = datetime.now()
            
            # 基本市場狀態信息
            market_status = {
                'is_open': False,
                'next_open': None,
                'next_close': None,
                'timezone': 'UTC',
                'current_time': now.isoformat(),
                'trading_day': True
            }
            
            # 簡化的市場時間判斷（可以根據需要擴展）
            weekday = now.weekday()  # 0=Monday, 6=Sunday
            hour = now.hour
            
            # 美股交易時間判斷 (UTC時間)
            # 美東標準時間 9:30-16:00 對應 UTC 14:30-21:00 (冬令時)
            # 美東夏令時間 9:30-16:00 對應 UTC 13:30-20:00 (夏令時)
            
            # 簡化判斷：週一到週五，UTC 13:30-21:00
            if weekday < 5:  # 週一到週五
                if 13 <= hour < 21:
                    market_status['is_open'] = True
                
                # 計算下次開市/休市時間
                if hour < 13:
                    market_status['next_open'] = now.replace(hour=13, minute=30, second=0, microsecond=0).isoformat()
                elif hour >= 21:
                    # 下一個交易日
                    next_day = now + timedelta(days=1)
                    if next_day.weekday() < 5:
                        market_status['next_open'] = next_day.replace(hour=13, minute=30, second=0, microsecond=0).isoformat()
                    else:
                        # 跳到下週一
                        days_until_monday = 7 - next_day.weekday()
                        next_monday = next_day + timedelta(days=days_until_monday)
                        market_status['next_open'] = next_monday.replace(hour=13, minute=30, second=0, microsecond=0).isoformat()
                
                if 13 <= hour < 21:
                    market_status['next_close'] = now.replace(hour=21, minute=0, second=0, microsecond=0).isoformat()
            else:
                # 週末
                market_status['trading_day'] = False
                # 計算下週一開市時間
                days_until_monday = 7 - weekday
                next_monday = now + timedelta(days=days_until_monday)
                market_status['next_open'] = next_monday.replace(hour=13, minute=30, second=0, microsecond=0).isoformat()
            
            # 添加市場信息
            market_status.update({
                'markets': {
                    'NYSE': market_status['is_open'],
                    'NASDAQ': market_status['is_open'],
                    'TSE': False,  # 台股，簡化處理
                    'HKSE': False,  # 港股，簡化處理
                },
                'last_updated': now.isoformat()
            })
            
            logger.info(f"市場狀態: {'開市' if market_status['is_open'] else '休市'}")
            return market_status
            
        except Exception as e:
            logger.error(f"獲取市場狀態時發生錯誤: {str(e)}")
            return {
                'is_open': False, 
                'error': str(e),
                'current_time': datetime.now().isoformat()
            }

    @staticmethod
    def validate_symbol(symbol: str) -> bool:
        """
        驗證股票代碼格式
        
        Args:
            symbol: 股票代碼
            
        Returns:
            True if valid, False otherwise
        """
        try:
            if not symbol or not isinstance(symbol, str):
                return False
            
            symbol = symbol.strip().upper()
            
            # 基本格式驗證
            if len(symbol) < 1 or len(symbol) > 15:
                return False
            
            # 檢查是否包含無效字符
            import re
            if not re.match(r'^[A-Z0-9]+(\.[A-Z]{2,4})?$', symbol):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"驗證股票代碼 {symbol} 時發生錯誤: {str(e)}")
            return False

    @staticmethod
    def get_company_info(symbol: str) -> Optional[Dict[str, Any]]:
        """
        獲取公司詳細信息
        
        Args:
            symbol: 股票代碼
            
        Returns:
            公司信息字典
        """
        try:
            logger.info(f"正在獲取公司 {symbol} 的詳細信息")
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            company_info = {
                'symbol': symbol.upper(),
                'name': info.get('longName', ''),
                'business_summary': info.get('longBusinessSummary', ''),
                'industry': info.get('industry', ''),
                'sector': info.get('sector', ''),
                'website': info.get('website', ''),
                'employees': info.get('fullTimeEmployees', 0),
                'market_cap': info.get('marketCap', 0),
                'enterprise_value': info.get('enterpriseValue', 0),
                'pe_ratio': info.get('trailingPE', None),
                'forward_pe': info.get('forwardPE', None),
                'peg_ratio': info.get('pegRatio', None),
                'price_to_book': info.get('priceToBook', None),
                'debt_to_equity': info.get('debtToEquity', None),
                'return_on_equity': info.get('returnOnEquity', None),
                'revenue_growth': info.get('revenueGrowth', None),
                'earnings_growth': info.get('earningsGrowth', None),
                'profit_margins': info.get('profitMargins', None),
                'dividend_yield': info.get('dividendYield', None),
                'payout_ratio': info.get('payoutRatio', None),
                'beta': info.get('beta', None),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh', None),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow', None),
                'last_updated': datetime.now().isoformat()
            }
            
            logger.info(f"成功獲取公司 {symbol} 的詳細信息")
            return company_info
            
        except Exception as e:
            logger.error(f"獲取公司 {symbol} 信息時發生錯誤: {str(e)}")
            return None

    @staticmethod
    def search_stocks(query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        搜索股票（簡化版本，基於預定義列表）
        
        Args:
            query: 搜索查詢
            limit: 返回結果限制
            
        Returns:
            搜索結果列表
        """
        try:
            logger.info(f"搜索股票: {query}，限制 {limit} 條結果")
            
            query = query.upper().strip()
            results = []
            
            # 在所有預定義的股票中搜索
            all_symbols = (
                StockDataService.SYMBOL_MAPPING['US_POPULAR'] +
                StockDataService.SYMBOL_MAPPING['TW_POPULAR'] +
                StockDataService.SYMBOL_MAPPING['HK_POPULAR']
            )
            
            # 精確匹配
            exact_matches = [s for s in all_symbols if s == query]
            # 前綴匹配
            prefix_matches = [s for s in all_symbols if s.startswith(query) and s not in exact_matches]
            # 包含匹配
            contains_matches = [s for s in all_symbols if query in s and s not in exact_matches + prefix_matches]
            
            # 合併結果，優先級：精確 > 前綴 > 包含
            candidate_symbols = (exact_matches + prefix_matches + contains_matches)[:limit]
            
            for symbol in candidate_symbols:
                try:
                    stock_data = StockDataService.get_real_stock_data(symbol)
                    if stock_data:
                        results.append(stock_data)
                        
                        if len(results) >= limit:
                            break
                            
                except Exception as e:
                    logger.warning(f"獲取搜索結果 {symbol} 數據失敗: {str(e)}")
                    continue
            
            logger.info(f"搜索 '{query}' 返回 {len(results)} 條結果")
            return results
            
        except Exception as e:
            logger.error(f"搜索股票時發生錯誤: {str(e)}")
            return []