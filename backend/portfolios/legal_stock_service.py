# backend/portfolios/legal_stock_service.py

import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
import time

logger = logging.getLogger(__name__)

class LegalStockService:
    """合法的股票數據服務 - 使用官方免費API"""
    
    # 配置API
    ALPHA_VANTAGE_API_KEY = "CTH2VQ23IP8BBK0B"  
    ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
    
    # 請求限制控制
    _last_request_time = 0
    _min_request_interval = 1.2  # Alpha Vantage建議每分鐘最多5次請求
    
    @classmethod
    def _rate_limit(cls):
        """API請求速率限制"""
        current_time = time.time()
        time_since_last = current_time - cls._last_request_time
        
        if time_since_last < cls._min_request_interval:
            sleep_time = cls._min_request_interval - time_since_last
            logger.info(f"API速率限制，等待 {sleep_time:.1f} 秒")
            time.sleep(sleep_time)
        
        cls._last_request_time = time.time()
    
    @classmethod
    def get_real_stock_data(cls, symbol: str) -> Optional[Dict[str, Any]]:
        """
        使用Alpha Vantage API獲取真實股票數據
        """
        try:
            if not cls.ALPHA_VANTAGE_API_KEY or cls.ALPHA_VANTAGE_API_KEY == "YOUR_API_KEY_HERE":
                logger.error("請設置有效的Alpha Vantage API Key")
                return None
            
            cls._rate_limit()
            
            logger.info(f"正在從Alpha Vantage獲取 {symbol} 的真實數據")
            
            # API請求參數
            params = {
                'function': 'GLOBAL_QUOTE',
                'symbol': symbol,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            
            response = requests.get(cls.ALPHA_VANTAGE_BASE_URL, params=params, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"API請求失敗，狀態碼: {response.status_code}")
                return None
            
            data = response.json()
            
            # 檢查API響應
            if 'Global Quote' not in data:
                if 'Error Message' in data:
                    logger.error(f"API錯誤: {data['Error Message']}")
                elif 'Note' in data:
                    logger.warning(f"API限制: {data['Note']}")
                else:
                    logger.error(f"未知API響應: {data}")
                return None
            
            quote = data['Global Quote']
            
            # 解析數據
            symbol_key = '01. symbol'
            price_key = '05. price'
            change_key = '09. change'
            change_percent_key = '10. change percent'
            volume_key = '06. volume'
            
            if symbol_key not in quote:
                logger.error(f"API響應格式錯誤: {quote}")
                return None
            
            # 清理百分比符號
            change_percent_str = quote.get(change_percent_key, '0%')
            change_percent = float(change_percent_str.replace('%', ''))
            
            stock_data = {
                'symbol': quote[symbol_key].upper(),
                'name': f"{quote[symbol_key]} Corporation",  # Alpha Vantage免費版不提供公司名
                'current_price': round(float(quote[price_key]), 2),
                'change': round(float(quote[change_key]), 2),
                'change_percent': round(change_percent, 2),
                'volume': int(quote[volume_key]),
                'exchange': 'Unknown',  # 免費版不提供
                'sector': 'Unknown',    # 免費版不提供
                'last_updated': datetime.now().isoformat(),
                'data_source': 'Alpha Vantage (官方API)',
                'api_status': 'success'
            }
            
            logger.info(f"成功獲取 {symbol} 數據: ${stock_data['current_price']} ({stock_data['change_percent']:+.2f}%)")
            return stock_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"網絡請求錯誤: {str(e)}")
            return None
        except (ValueError, KeyError) as e:
            logger.error(f"數據解析錯誤: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"獲取 {symbol} 真實數據時發生未知錯誤: {str(e)}")
            return None
    
    @classmethod
    def get_company_info(cls, symbol: str) -> Optional[Dict[str, Any]]:
        """
        獲取公司基本信息
        """
        try:
            if not cls.ALPHA_VANTAGE_API_KEY or cls.ALPHA_VANTAGE_API_KEY == "YOUR_API_KEY_HERE":
                return None
            
            cls._rate_limit()
            
            params = {
                'function': 'OVERVIEW',
                'symbol': symbol,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            
            response = requests.get(cls.ALPHA_VANTAGE_BASE_URL, params=params, timeout=10)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            if 'Symbol' not in data:
                return None
            
            return {
                'symbol': data.get('Symbol', symbol).upper(),
                'name': data.get('Name', f'{symbol} Corporation'),
                'description': data.get('Description', ''),
                'exchange': data.get('Exchange', 'Unknown'),
                'sector': data.get('Sector', 'Unknown'),
                'industry': data.get('Industry', 'Unknown'),
                'market_cap': data.get('MarketCapitalization', 0),
                'pe_ratio': data.get('PERatio', None),
                'dividend_yield': data.get('DividendYield', None),
                'data_source': 'Alpha Vantage Company Overview'
            }
            
        except Exception as e:
            logger.error(f"獲取公司信息失敗: {str(e)}")
            return None
    
    @classmethod
    def get_historical_data(cls, symbol: str, period: str = '1y') -> List[Dict[str, Any]]:
        """
        獲取歷史數據 (Alpha Vantage免費版限制較多)
        """
        try:
            if not cls.ALPHA_VANTAGE_API_KEY or cls.ALPHA_VANTAGE_API_KEY == "YOUR_API_KEY_HERE":
                return []
            
            cls._rate_limit()
            
            # Alpha Vantage的時間序列功能
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': symbol,
                'apikey': cls.ALPHA_VANTAGE_API_KEY,
                'outputsize': 'compact'  # 最近100個交易日
            }
            
            response = requests.get(cls.ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            if 'Time Series (Daily)' not in data:
                logger.warning(f"無法獲取 {symbol} 歷史數據")
                return []
            
            time_series = data['Time Series (Daily)']
            chart_data = []
            
            for date_str, values in sorted(time_series.items()):
                try:
                    chart_data.append({
                        'date': date_str,
                        'time': date_str,
                        'open': round(float(values['1. open']), 2),
                        'high': round(float(values['2. high']), 2),
                        'low': round(float(values['3. low']), 2),
                        'close': round(float(values['4. close']), 2),
                        'volume': int(values['5. volume'])
                    })
                except (ValueError, KeyError):
                    continue
            
            logger.info(f"獲取 {symbol} 歷史數據 {len(chart_data)} 個數據點")
            return chart_data[-50:]  # 返回最近50個交易日
            
        except Exception as e:
            logger.error(f"獲取歷史數據失敗: {str(e)}")
            return []
    
    @classmethod
    def search_stocks(cls, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        股票搜索功能
        """
        try:
            if not cls.ALPHA_VANTAGE_API_KEY or cls.ALPHA_VANTAGE_API_KEY == "YOUR_API_KEY_HERE":
                return []
            
            cls._rate_limit()
            
            params = {
                'function': 'SYMBOL_SEARCH',
                'keywords': query,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            
            response = requests.get(cls.ALPHA_VANTAGE_BASE_URL, params=params, timeout=10)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            if 'bestMatches' not in data:
                return []
            
            results = []
            for match in data['bestMatches'][:limit]:
                try:
                    symbol = match['1. symbol']
                    
                    # 獲取實時價格
                    stock_data = cls.get_real_stock_data(symbol)
                    if stock_data:
                        stock_data.update({
                            'name': match['2. name'],
                            'match_score': float(match['9. matchScore'])
                        })
                        results.append(stock_data)
                        
                except Exception as e:
                    logger.warning(f"處理搜索結果失敗: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"搜索股票失敗: {str(e)}")
            return []
    
    @classmethod
    def validate_symbol(cls, symbol: str) -> bool:
        """驗證股票代碼"""
        if not symbol or not isinstance(symbol, str):
            return False
        
        symbol = symbol.strip().upper()
        
        if len(symbol) < 1 or len(symbol) > 10:
            return False
        
        import re
        return bool(re.match(r'^[A-Z0-9]+(\.[A-Z]{1,3})?$', symbol))