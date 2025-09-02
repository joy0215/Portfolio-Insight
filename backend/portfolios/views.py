# backend/portfolios/views.py - 完整優化版本

import random
import time
from datetime import datetime, timedelta
from django.http import JsonResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any
from django.conf import settings

# 導入模型
from .models import (
    Stock, Portfolio, Holding, StockPrice, 
    Watchlist, WatchlistStock, WatchlistGroup, PriceAlert
)
from .serializers import StockSerializer, PortfolioSerializer
from django.db.models import Q

# 導入股票數據服務
from .stock_data_service import StockDataService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# 合法股票數據服務
# ============================================================================

class LegalStockService:
    """合法的股票數據服務 - 使用Alpha Vantage官方API"""
    
    # 請求限制控制
    _last_request_time = 0
    _min_request_interval = 12  # Alpha Vantage免費版建議每分鐘最多5次請求
    
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
        """使用Alpha Vantage API獲取真實股票數據"""
        try:
            api_key = getattr(settings, 'ALPHA_VANTAGE_API_KEY', None)
            if not api_key or api_key == 'YOUR_API_KEY_HERE':
                logger.warning("Alpha Vantage API Key未設置，使用模擬數據")
                return cls._get_enhanced_mock_data(symbol)
            
            cls._rate_limit()
            
            logger.info(f"正在從Alpha Vantage獲取 {symbol} 的真實數據")
            
            # Alpha Vantage API請求
            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'GLOBAL_QUOTE',
                'symbol': symbol,
                'apikey': api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"API請求失敗，狀態碼: {response.status_code}")
                return cls._get_enhanced_mock_data(symbol)
            
            data = response.json()
            
            # 檢查API響應
            if 'Global Quote' not in data:
                if 'Error Message' in data:
                    logger.error(f"API錯誤: {data['Error Message']}")
                elif 'Note' in data:
                    logger.warning(f"API限制: {data['Note']}")
                else:
                    logger.warning(f"未知API響應，使用模擬數據: {data}")
                return cls._get_enhanced_mock_data(symbol)
            
            quote = data['Global Quote']
            
            # 解析數據
            symbol_key = '01. symbol'
            price_key = '05. price'
            change_key = '09. change'
            change_percent_key = '10. change percent'
            volume_key = '06. volume'
            
            if symbol_key not in quote:
                logger.error(f"API響應格式錯誤，使用模擬數據")
                return cls._get_enhanced_mock_data(symbol)
            
            # 清理百分比符號
            change_percent_str = quote.get(change_percent_key, '0%')
            change_percent = float(change_percent_str.replace('%', ''))
            
            # 獲取公司名稱（需要額外API調用）
            company_name = cls._get_company_name(symbol, api_key)
            
            stock_data = {
                'symbol': quote[symbol_key].upper(),
                'name': company_name or f"{quote[symbol_key]} Corporation",
                'current_price': round(float(quote[price_key]), 2),
                'change': round(float(quote[change_key]), 2),
                'change_percent': round(change_percent, 2),
                'volume': int(quote[volume_key]) if quote[volume_key].isdigit() else 0,
                'exchange': 'NASDAQ',  # 免費版不提供，使用默認值
                'sector': 'Unknown',    # 免費版不提供
                'last_updated': datetime.now().isoformat(),
                'data_source': 'Alpha Vantage (官方API)',
                'api_status': 'success'
            }
            
            logger.info(f"✅ 成功獲取 {symbol} 真實數據: ${stock_data['current_price']} ({stock_data['change_percent']:+.2f}%)")
            return stock_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"網絡請求錯誤，使用模擬數據: {str(e)}")
            return cls._get_enhanced_mock_data(symbol)
        except (ValueError, KeyError) as e:
            logger.error(f"數據解析錯誤，使用模擬數據: {str(e)}")
            return cls._get_enhanced_mock_data(symbol)
        except Exception as e:
            logger.error(f"獲取 {symbol} 真實數據時發生未知錯誤，使用模擬數據: {str(e)}")
            return cls._get_enhanced_mock_data(symbol)
    
    @classmethod
    def _get_company_name(cls, symbol: str, api_key: str) -> Optional[str]:
        """獲取公司名稱（簡化版）"""
        # 預定義的公司名稱映射
        company_names = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'NVDA': 'NVIDIA Corporation',
            'META': 'Meta Platforms Inc.',
            'NFLX': 'Netflix Inc.',
            '2330.TW': '台灣積體電路製造股份有限公司',
            '2454.TW': '聯發科技股份有限公司',
            '2317.TW': '鴻海精密工業股份有限公司',
            '0700.HK': '騰訊控股有限公司',
        }
        
        return company_names.get(symbol.upper())
    
    @classmethod
    def _get_enhanced_mock_data(cls, symbol: str) -> Dict[str, Any]:
        """生成增強的模擬數據（基於真實價格範圍）"""
        
        # 基於真實股票的合理價格範圍
        realistic_prices = {
            'AAPL': {'base': 227.50, 'range': (200, 250)},
            'MSFT': {'base': 427.90, 'range': (400, 450)},
            'GOOGL': {'base': 175.80, 'range': (160, 190)},
            'AMZN': {'base': 203.50, 'range': (180, 220)},
            'TSLA': {'base': 248.50, 'range': (220, 280)},
            'NVDA': {'base': 125.30, 'range': (110, 140)},
            'META': {'base': 620.80, 'range': (580, 660)},
            'NFLX': {'base': 852.30, 'range': (800, 900)},
            '2330.TW': {'base': 598.00, 'range': (580, 620)},
            '2454.TW': {'base': 1285.00, 'range': (1200, 1350)},
            '2317.TW': {'base': 108.50, 'range': (100, 120)},
            '0700.HK': {'base': 415.20, 'range': (400, 440)},
        }
        
        company_names = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'NVDA': 'NVIDIA Corporation',
            'META': 'Meta Platforms Inc.',
            'NFLX': 'Netflix Inc.',
            '2330.TW': '台灣積體電路製造股份有限公司',
            '2454.TW': '聯發科技股份有限公司',
            '2317.TW': '鴻海精密工業股份有限公司',
            '0700.HK': '騰訊控股有限公司',
        }
        
        sectors = {
            'AAPL': 'Technology',
            'MSFT': 'Technology',
            'GOOGL': 'Technology',
            'AMZN': 'Consumer Discretionary',
            'TSLA': 'Consumer Discretionary',
            'NVDA': 'Technology',
            'META': 'Communication Services',
            'NFLX': 'Communication Services',
            '2330.TW': 'Semiconductor',
            '2454.TW': 'Semiconductor',
            '2317.TW': 'Electronics',
            '0700.HK': 'Technology',
        }
        
        symbol = symbol.upper()
        price_info = realistic_prices.get(symbol, {'base': random.uniform(50, 500), 'range': (40, 600)})
        
        # 生成接近真實的價格變動
        base_price = price_info['base']
        price_volatility = random.uniform(-0.03, 0.03)  # ±3%
        current_price = base_price * (1 + price_volatility)
        
        # 確保價格在合理範圍內
        min_price, max_price = price_info['range']
        current_price = max(min_price, min(max_price, current_price))
        
        change = current_price - base_price
        change_percent = (change / base_price) * 100
        
        return {
            'symbol': symbol,
            'name': company_names.get(symbol, f'{symbol} Corporation'),
            'current_price': round(current_price, 2),
            'change': round(change, 2),
            'change_percent': round(change_percent, 2),
            'volume': random.randint(5000000, 100000000),
            'exchange': 'NASDAQ' if not symbol.endswith(('.TW', '.HK')) else ('TWSE' if symbol.endswith('.TW') else 'HKSE'),
            'sector': sectors.get(symbol, 'Technology'),
            'last_updated': datetime.now().isoformat(),
            'data_source': '增強型模擬數據 (基於真實價格範圍)',
            'api_status': 'mock_enhanced'
        }
    
    @classmethod
    def validate_symbol(cls, symbol: str) -> bool:
        """驗證股票代碼格式"""
        if not symbol or not isinstance(symbol, str):
            return False
        
        symbol = symbol.strip().upper()
        
        if len(symbol) < 1 or len(symbol) > 10:
            return False
        
        import re
        return bool(re.match(r'^[A-Z0-9]+(\.[A-Z]{1,3})?$', symbol))

# ============================================================================
# 基礎 API 測試
# ============================================================================

@api_view(['GET'])
def test_api(request):
    """API 測試端點"""
    return Response({
        'message': 'Portfolio Insight API is working!',
        'timestamp': datetime.now().isoformat(),
        'user': 'JoyWu',
        'version': '2.0.0',
        'api_key_configured': bool(getattr(settings, 'ALPHA_VANTAGE_API_KEY', None))
    })

# ============================================================================
# 假數據生成 (開發測試用)
# ============================================================================

@api_view(['POST'])
def generate_fake_data(request):
    """生成假數據用於測試"""
    try:
        # 清空現有數據
        StockPrice.objects.all().delete()
        Stock.objects.all().delete()
        
        print("Creating test stocks...")  # 調試信息
        
        # 創建測試股票數據
        stocks_data = [
            {'symbol': 'AAPL', 'name': 'Apple Inc.', 'exchange': 'NASDAQ', 'sector': 'Technology'},
            {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'exchange': 'NASDAQ', 'sector': 'Automotive'},
            {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'exchange': 'NASDAQ', 'sector': 'Technology'},
            {'symbol': 'MSFT', 'name': 'Microsoft Corp.', 'exchange': 'NASDAQ', 'sector': 'Technology'},
            {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'exchange': 'NASDAQ', 'sector': 'E-commerce'},
            {'symbol': 'NVDA', 'name': 'NVIDIA Corporation', 'exchange': 'NASDAQ', 'sector': 'Technology'},
            {'symbol': '2330.TW', 'name': '台積電', 'exchange': 'TWSE', 'sector': 'Semiconductor'},
            {'symbol': '2317.TW', 'name': '鴻海', 'exchange': 'TWSE', 'sector': 'Electronics'},
            {'symbol': '2454.TW', 'name': '聯發科', 'exchange': 'TWSE', 'sector': 'Semiconductor'},
            {'symbol': '1101.TW', 'name': '台泥', 'exchange': 'TWSE', 'sector': 'Materials'},
        ]
        
        created_stocks = []
        for stock_data in stocks_data:
            stock = Stock.objects.create(**stock_data)
            created_stocks.append(stock)
            
            # 為每支股票創建價格數據
            base_price = random.uniform(50, 500)
            change = random.uniform(-10, 10)
            change_percent = (change / base_price) * 100
            
            StockPrice.objects.create(
                stock=stock,
                price=base_price,
                change=change,
                change_percent=change_percent,
                volume=random.randint(1000000, 50000000),
                timestamp=datetime.now()
            )
            
        print(f"Created {len(created_stocks)} stocks")  # 調試信息
        
        return Response({
            'message': f'成功生成 {len(stocks_data)} 支股票的假數據',
            'stocks_created': len(created_stocks),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error in generate_fake_data: {e}")  # 調試信息
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 自選股管理 API - 使用合法真實數據
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # 暫時允許所有用戶
def watchlist_stocks(request):
    """自選股管理 - 使用合法真實數據"""
    try:
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
    except Exception as e:
        return Response({'error': '用戶系統錯誤'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if request.method == 'GET':
        try:
            logger.info(f"獲取用戶 {user.username} 的自選股 (使用合法API)")
            
            # 獲取所有自選股
            watchlists = Watchlist.objects.filter(user=user).select_related('group')
            
            stocks_data = []
            for watchlist in watchlists:
                try:
                    # 使用合法的API獲取數據
                    stock_info = LegalStockService.get_real_stock_data(watchlist.symbol)
                    
                    if stock_info:
                        stock_info.update({
                            'watchlist_id': watchlist.id,
                            'group_name': watchlist.group.name if watchlist.group else '默認分組',
                            'group_color': watchlist.group.color if watchlist.group else '#6B7280',
                            'notes': watchlist.notes,
                            'target_price': float(watchlist.target_price) if watchlist.target_price else None,
                            'stop_loss_price': float(watchlist.stop_loss_price) if watchlist.stop_loss_price else None,
                            'added_at': watchlist.added_at.isoformat(),
                            'alert_enabled': watchlist.alert_enabled
                        })
                        stocks_data.append(stock_info)
                        
                        # API速率限制友好
                        if stock_info.get('data_source', '').startswith('Alpha Vantage'):
                            time.sleep(0.5)  # Alpha Vantage API間隔
                        
                except Exception as e:
                    logger.warning(f"獲取自選股 {watchlist.symbol} 數據失敗: {str(e)}")
                    continue
            
            # 按分組整理
            grouped_stocks = {}
            for stock in stocks_data:
                group_name = stock['group_name']
                if group_name not in grouped_stocks:
                    grouped_stocks[group_name] = {
                        'name': group_name,
                        'color': stock['group_color'],
                        'stocks': []
                    }
                grouped_stocks[group_name]['stocks'].append(stock)
            
            data_sources = list(set(stock.get('data_source', 'Unknown') for stock in stocks_data))
            
            logger.info(f"成功獲取 {len(stocks_data)} 支自選股 (合法API)")
            return Response({
                'stocks': stocks_data,
                'grouped_stocks': list(grouped_stocks.values()),
                'total_stocks': len(stocks_data),
                'data_sources': data_sources,
                'legal_notice': '所有數據來源均為合法授權的官方API或增強型模擬數據'
            })
            
        except Exception as e:
            logger.error(f"獲取自選股失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            data = request.data
            symbol = data.get('symbol', '').upper().strip()
            
            if not symbol:
                return Response({'error': '股票代碼不能為空'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not LegalStockService.validate_symbol(symbol):
                return Response({'error': f'無效的股票代碼格式: {symbol}'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 檢查股票是否已存在
            if Watchlist.objects.filter(user=user, symbol=symbol).exists():
                return Response({'error': f'{symbol} 已在自選股中'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 驗證股票代碼並獲取數據
            stock_info = LegalStockService.get_real_stock_data(symbol)
            if not stock_info:
                return Response({
                    'error': f'無法獲取 {symbol} 的股票數據，請檢查代碼是否正確'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 獲取分組
            group = None
            if data.get('group_id'):
                try:
                    group = WatchlistGroup.objects.get(id=data.get('group_id'), user=user)
                except WatchlistGroup.DoesNotExist:
                    pass
            
            # 創建自選股
            watchlist = Watchlist.objects.create(
                user=user,
                symbol=symbol,
                group=group,
                notes=data.get('notes', ''),
                target_price=data.get('target_price'),
                stop_loss_price=data.get('stop_loss_price'),
                alert_enabled=data.get('alert_enabled', False)
            )
            
            logger.info(f"成功添加 {symbol} 到自選股")
            return Response({
                'id': watchlist.id,
                'symbol': symbol,
                'stock_info': stock_info,
                'message': f'成功添加 {symbol} 到自選股'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"添加自選股失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def watchlist_summary(request):
    """自選股總覽 - 使用合法數據"""
    try:
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
    except Exception as e:
        return Response({'error': '用戶系統錯誤'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        logger.info(f"獲取用戶 {user.username} 的自選股總覽 (合法數據)")
        
        watchlists = Watchlist.objects.filter(user=user)
        total_stocks = watchlists.count()
        
        if total_stocks == 0:
            return Response({
                'total_stocks': 0,
                'total_value': 0,
                'total_change': 0,
                'total_change_percent': 0,
                'gainers': 0,
                'losers': 0,
                'unchanged': 0,
                'top_gainer': None,
                'top_loser': None,
                'last_updated': timezone.now().isoformat(),
                'data_source': 'No data'
            })
        
        stocks_data = []
        total_value = 0
        total_change = 0
        gainers = 0
        losers = 0
        unchanged = 0
        
        for watchlist in watchlists:
            try:
                stock_info = LegalStockService.get_real_stock_data(watchlist.symbol)
                if stock_info:
                    stocks_data.append(stock_info)
                    total_value += stock_info['current_price']
                    total_change += stock_info['change']
                    
                    if stock_info['change'] > 0:
                        gainers += 1
                    elif stock_info['change'] < 0:
                        losers += 1
                    else:
                        unchanged += 1
                    
                    # API速率限制
                    if stock_info.get('data_source', '').startswith('Alpha Vantage'):
                        time.sleep(0.3)
                        
            except Exception as e:
                logger.warning(f"獲取自選股 {watchlist.symbol} 數據失敗: {str(e)}")
                continue
        
        # 計算總漲跌幅
        total_change_percent = (total_change / (total_value - total_change)) * 100 if (total_value - total_change) != 0 else 0
        
        # 找出最大漲幅和跌幅
        top_gainer = max(stocks_data, key=lambda x: x['change_percent']) if stocks_data else None
        top_loser = min(stocks_data, key=lambda x: x['change_percent']) if stocks_data else None
        
        data_sources = list(set(stock.get('data_source', 'Unknown') for stock in stocks_data))
        
        summary_data = {
            'total_stocks': total_stocks,
            'total_value': round(total_value, 2),
            'total_change': round(total_change, 2),
            'total_change_percent': round(total_change_percent, 2),
            'gainers': gainers,
            'losers': losers,
            'unchanged': unchanged,
            'top_gainer': top_gainer,
            'top_loser': top_loser,
            'data_sources': data_sources,
            'last_updated': timezone.now().isoformat()
        }
        
        logger.info(f"成功獲取自選股總覽，總計 {total_stocks} 支股票")
        return Response(summary_data)
        
    except Exception as e:
        logger.error(f"獲取自選股總覽失敗: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 其他API (繼續使用原有的實現)
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def watchlist_groups(request):
    """自選股分組管理"""
    try:
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
    except Exception as e:
        logger.error(f"用戶創建失敗: {str(e)}")
        return Response({'error': '用戶系統錯誤'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if request.method == 'GET':
        try:
            logger.info(f"獲取用戶 {user.username} 的自選股分組")
            
            groups = WatchlistGroup.objects.filter(user=user).prefetch_related('stocks')
            groups_data = []
            
            for group in groups:
                stocks_data = []
                for stock in group.stocks.all():
                    try:
                        stock_info = LegalStockService.get_real_stock_data(stock.symbol)
                        if stock_info:
                            stock_info.update({
                                'id': stock.id,
                                'notes': stock.notes,
                                'target_price': float(stock.target_price) if stock.target_price else None,
                                'stop_loss_price': float(stock.stop_loss_price) if stock.stop_loss_price else None,
                                'added_at': stock.added_at.isoformat(),
                                'alert_enabled': stock.alert_enabled
                            })
                            stocks_data.append(stock_info)
                    except Exception as e:
                        logger.warning(f"獲取股票 {stock.symbol} 數據失敗: {str(e)}")
                        continue
                
                groups_data.append({
                    'id': group.id,
                    'name': group.name,
                    'description': group.description,
                    'color': group.color,
                    'created_at': group.created_at.isoformat(),
                    'stocks_count': group.stocks.count(),
                    'stocks': stocks_data
                })
            
            logger.info(f"成功獲取 {len(groups_data)} 個自選股分組")
            return Response({
                'groups': groups_data,
                'total_groups': len(groups_data),
                'total_stocks': sum(group['stocks_count'] for group in groups_data)
            })
            
        except Exception as e:
            logger.error(f"獲取自選股分組失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            data = request.data
            name = data.get('name', '').strip()
            
            if not name:
                return Response({'error': '分組名稱不能為空'}, status=status.HTTP_400_BAD_REQUEST)
            
            if WatchlistGroup.objects.filter(user=user, name=name).exists():
                return Response({'error': f'分組 "{name}" 已存在'}, status=status.HTTP_400_BAD_REQUEST)
            
            group = WatchlistGroup.objects.create(
                user=user,
                name=name,
                description=data.get('description', ''),
                color=data.get('color', '#3B82F6')
            )
            
            logger.info(f"成功創建分組 {name}")
            return Response({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'color': group.color,
                'created_at': group.created_at.isoformat(),
                'message': f'成功創建分組 "{group.name}"'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"創建自選股分組失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def watchlist_stock_detail(request, stock_id):
    """自選股詳細操作"""
    try:
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
    except Exception as e:
        return Response({'error': '用戶系統錯誤'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        watchlist = Watchlist.objects.get(id=stock_id, user=user)
    except Watchlist.DoesNotExist:
        return Response({'error': '自選股不存在'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'PUT':
        try:
            data = request.data
            
            # 更新字段
            if 'notes' in data:
                watchlist.notes = data['notes']
            if 'target_price' in data:
                watchlist.target_price = data['target_price']
            if 'stop_loss_price' in data:
                watchlist.stop_loss_price = data['stop_loss_price']
            if 'alert_enabled' in data:
                watchlist.alert_enabled = data['alert_enabled']
            if 'group_id' in data:
                if data['group_id']:
                    try:
                        group = WatchlistGroup.objects.get(id=data['group_id'], user=user)
                        watchlist.group = group
                    except WatchlistGroup.DoesNotExist:
                        return Response({'error': '分組不存在'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    watchlist.group = None
            
            watchlist.save()
            
            logger.info(f"成功更新自選股 {watchlist.symbol}")
            return Response({
                'message': f'成功更新 {watchlist.symbol} 的設置'
            })
            
        except Exception as e:
            logger.error(f"更新自選股失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        try:
            symbol = watchlist.symbol
            watchlist.delete()
            
            logger.info(f"成功刪除自選股 {symbol}")
            return Response({
                'message': f'成功移除 {symbol} 從自選股'
            })
            
        except Exception as e:
            logger.error(f"刪除自選股失敗: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ============================================================================
# 真實股票數據 API
# ============================================================================

@api_view(['GET'])
def real_stock_data(request, symbol):
    """獲取真實股票數據"""
    try:
        data = LegalStockService.get_real_stock_data(symbol)
        if data:
            return Response(data)
        else:
            return Response({
                'error': f'無法獲取 {symbol} 的數據'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 系統健康檢查和狀態 API
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """系統健康檢查"""
    try:
        # 檢查數據庫連接
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # 檢查Alpha Vantage API配置
        api_key = getattr(settings, 'ALPHA_VANTAGE_API_KEY', None)
        api_configured = bool(api_key and api_key != 'YOUR_API_KEY_HERE')
        
        # 測試股票數據服務
        test_stock = LegalStockService.get_real_stock_data('AAPL')
        
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'database': 'connected',
            'api_key_configured': api_configured,
            'stock_service': 'working' if test_stock else 'limited',
            'data_source': test_stock.get('data_source', 'Unknown') if test_stock else 'No data',
            'version': '2.0.0',
            'user': 'JoyWu'
        })
        
    except Exception as e:
        logger.error(f"健康檢查失敗: {str(e)}")
        return Response({
            'status': 'error',
            'timestamp': timezone.now().isoformat(),
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """系統狀態信息"""
    try:
        from django.conf import settings
        
        # 統計信息
        total_watchlists = Watchlist.objects.count()
        total_groups = WatchlistGroup.objects.count()
        total_users = User.objects.count()
        
        return Response({
            'system': {
                'name': 'Portfolio Insight',
                'version': '2.0.0',
                'environment': getattr(settings, 'ENVIRONMENT', 'development'),
                'debug': settings.DEBUG,
                'timezone': str(settings.TIME_ZONE),
            },
            'api_configuration': {
                'alpha_vantage_configured': bool(getattr(settings, 'ALPHA_VANTAGE_API_KEY', None)),
                'data_source': 'Alpha Vantage + Enhanced Mock Data'
            },
            'statistics': {
                'total_users': total_users,
                'total_watchlists': total_watchlists,
                'total_groups': total_groups,
            },
            'features': {
                'market_overview': True,
                'stock_charts': True,
                'watchlist': True,
                'real_time_data': True,
                'portfolio': True,
                'price_alerts': False,  # 開發中
                'news': False,  # 開發中
                'analysis': False,  # 開發中
            },
            'timestamp': timezone.now().isoformat(),
            'uptime': 'Running'
        })
        
    except Exception as e:
        logger.error(f"獲取系統狀態失敗: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 其他必要的API端點 (保持向後兼容)
# ============================================================================

@api_view(['GET'])
def search_stocks(request):
    """搜尋股票"""
    query = request.GET.get('q', '')
    if not query:
        return Response([])
    
    try:
        # 簡化的搜索，基於預定義列表
        popular_stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', '2330.TW', '2454.TW', '0700.HK']
        
        matching_stocks = [s for s in popular_stocks if query.upper() in s.upper()][:5]
        
        results = []
        for symbol in matching_stocks:
            try:
                stock_data = LegalStockService.get_real_stock_data(symbol)
                if stock_data:
                    results.append(stock_data)
            except Exception as e:
                logger.warning(f"搜索股票 {symbol} 失敗: {str(e)}")
                continue
        
        return Response({
            'query': query,
            'results': results,
            'count': len(results),
            'data_source': 'legal_api'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def market_overview_v2(request):
    """市場總覽"""
    try:
        # 獲取主要指數和熱門股票
        popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', '2330.TW']
        
        stocks_data = []
        for symbol in popular_symbols:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    stocks_data.append(data)
                    time.sleep(0.3)  # API 限制
            except Exception as e:
                logger.warning(f"獲取市場數據 {symbol} 失敗: {str(e)}")
                continue
        
        return Response({
            'stocks': stocks_data,
            'market_status': 'Open',
            'last_updated': datetime.now().isoformat(),
            'total_stocks': len(stocks_data),
            'data_source': 'legal_api'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 市場數據 API
# ============================================================================

@api_view(['GET'])
def market_indices(request):
    """獲取主要市場指數"""
    try:
        # 主要市場指數
        indices = ['SPY', 'QQQ', 'DIA', '^TWII', '^HSI']
        indices_data = []
        
        for symbol in indices:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    indices_data.append(data)
                    time.sleep(0.3)  # API 限制
            except Exception as e:
                logger.warning(f"獲取指數 {symbol} 失敗: {str(e)}")
                continue
        
        return Response({
            'indices': indices_data,
            'last_updated': datetime.now().isoformat()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def trending_stocks(request):
    """獲取熱門股票"""
    try:
        region = request.GET.get('region', 'US')
        limit = int(request.GET.get('limit', 10))
        
        if region == 'TW':
            symbols = ['2330.TW', '2454.TW', '2317.TW', '2881.TW', '3008.TW']
        elif region == 'HK':
            symbols = ['0700.HK', '0941.HK', '1398.HK', '0939.HK']
        else:  # US
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
        
        trending_data = []
        for symbol in symbols[:limit]:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    trending_data.append(data)
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        return Response({
            'region': region,
            'stocks': trending_data,
            'count': len(trending_data),
            'last_updated': datetime.now().isoformat()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def live_market_data(request):
    """即時市場數據"""
    try:
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', '2330.TW']
        market_data = []
        
        for symbol in symbols:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    market_data.append(data)
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        return Response({
            'type': 'live_data',
            'updates': market_data,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# backend/portfolios/views.py

@api_view(['GET'])
def stock_chart_data(request, symbol):
    """獲取股票圖表數據 - 恢復 Yahoo Finance 版本"""
    try:
        period = request.GET.get('period', '1y')
        
        logger.info(f"使用 Yahoo Finance 獲取 {symbol} 的圖表數據，週期: {period}")
        
        # 直接使用原有的 StockDataService
        stock_info = StockDataService.get_real_stock_data(symbol)
        chart_data = StockDataService.get_historical_data(symbol, period)
        
        if not chart_data:
            logger.warning(f"Yahoo Finance 沒有返回 {symbol} 的歷史數據")
            return Response({
                'error': f'Yahoo Finance 無法獲取 {symbol} 的歷史數據',
                'suggestion': '請檢查股票代碼是否正確'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'symbol': symbol.upper(),
            'stock_info': stock_info,
            'chart_data': chart_data,
            'period': period,
            'data_points': len(chart_data),
            'last_updated': datetime.now().isoformat(),
            'data_source': 'Yahoo Finance (yfinance)'
        })
        
    except Exception as e:
        logger.error(f"Yahoo Finance 獲取 {symbol} 數據失敗: {str(e)}")
        return Response({
            'error': f'Yahoo Finance 錯誤: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def market_overview(request):
    """市場總覽 - 恢復 Yahoo Finance 版本"""
    try:
        logger.info("使用 Yahoo Finance 獲取市場總覽")
        
        # 使用原有的熱門股票
        popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', '2330.TW', '2454.TW', '0700.HK']
        
        stocks_data = []
        for symbol in popular_symbols:
            try:
                data = StockDataService.get_real_stock_data(symbol)
                if data:
                    stocks_data.append(data)
            except Exception as e:
                logger.warning(f"獲取 {symbol} 失敗: {str(e)}")
                continue
        
        return Response({
            'stocks': stocks_data,
            'market_status': 'Open',
            'last_updated': datetime.now().isoformat(),
            'total_stocks': len(stocks_data),
            'data_source': 'Yahoo Finance (yfinance)'
        })
        
    except Exception as e:
        logger.error(f"市場總覽獲取失敗: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def real_stock_search(request):
    """真實股票搜尋"""
    try:
        query = request.GET.get('q', '')
        if not query:
            return Response([])
        
        limit = int(request.GET.get('limit', 10))
        
        # 基於預定義列表的搜索
        all_symbols = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
            '2330.TW', '2317.TW', '2454.TW', '2881.TW', '3008.TW',
            '0700.HK', '0941.HK', '1398.HK', '0939.HK'
        ]
        
        query_upper = query.upper()
        matching_symbols = [s for s in all_symbols if query_upper in s][:limit]
        
        results = []
        for symbol in matching_symbols:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    results.append(data)
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        return Response({
            'query': query,
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def sync_real_data(request):
    """同步真實數據到資料庫"""
    try:
        symbols = request.data.get('symbols', [])
        if not symbols:
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', '2330.TW', '2454.TW']
        
        updated_count = 0
        errors = []
        
        for symbol in symbols:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    # 更新或創建股票記錄
                    stock, created = Stock.objects.update_or_create(
                        symbol=data['symbol'],
                        defaults={
                            'name': data['name'],
                            'exchange': data['exchange'],
                            'sector': data['sector'],
                        }
                    )
                    
                    # 更新價格記錄
                    StockPrice.objects.update_or_create(
                        stock=stock,
                        timestamp__date=datetime.now().date(),
                        defaults={
                            'price': Decimal(str(data['current_price'])),
                            'change': Decimal(str(data['change'])),
                            'change_percent': Decimal(str(data['change_percent'])),
                            'volume': data['volume'],
                            'timestamp': datetime.now()
                        }
                    )
                    
                    updated_count += 1
                    time.sleep(0.2)  # API 限制
                else:
                    errors.append(f"無法獲取 {symbol} 的數據")
                    
            except Exception as e:
                errors.append(f"{symbol}: {str(e)}")
        
        return Response({
            'message': f'成功同步 {updated_count} 支股票的數據',
            'updated_count': updated_count,
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 舊版自選股 API (向後兼容)
# ============================================================================

@api_view(['GET', 'POST'])
def watchlist_view(request):
    """獲取或創建自選股列表 - 舊版兼容"""
    try:
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
        
        if request.method == 'GET':
            # 使用新版的 Watchlist 模型
            watchlists = Watchlist.objects.filter(user=user)
            
            stocks_data = []
            for watchlist in watchlists:
                try:
                    stock_info = LegalStockService.get_real_stock_data(watchlist.symbol)
                    if stock_info:
                        stock_info.update({
                            'id': watchlist.id,
                            'added_at': watchlist.added_at.isoformat(),
                            'notes': watchlist.notes or ''
                        })
                        stocks_data.append(stock_info)
                        time.sleep(0.2)
                except Exception as e:
                    continue
            
            return Response({
                'watchlist_id': 1,  # 虛擬ID，向後兼容
                'name': '我的自選股',
                'stocks': stocks_data,
                'total_stocks': len(stocks_data),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            })
            
        elif request.method == 'POST':
            symbol = request.data.get('symbol', '').upper()
            notes = request.data.get('notes', '')
            
            if not symbol:
                return Response({'error': '需要提供股票代碼'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 檢查是否已存在
            if Watchlist.objects.filter(user=user, symbol=symbol).exists():
                return Response({'error': '股票已在自選股中'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 驗證股票代碼
            stock_info = LegalStockService.get_real_stock_data(symbol)
            if not stock_info:
                return Response({'error': f'無法獲取 {symbol} 的數據'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 創建自選股
            watchlist = Watchlist.objects.create(
                user=user,
                symbol=symbol,
                notes=notes
            )
            
            return Response({
                'message': f'成功添加 {symbol} 到自選股',
                'stock': {
                    'id': watchlist.id,
                    'symbol': symbol,
                    'name': stock_info['name']
                }
            })
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_stock_by_symbol(request):
    """通過股票代碼直接添加到自選股 - 舊版兼容"""
    try:
        symbol = request.data.get('symbol', '').upper()
        notes = request.data.get('notes', '')
        
        if not symbol:
            return Response({'error': '需要提供股票代碼'}, status=status.HTTP_400_BAD_REQUEST)
        
        user, created = User.objects.get_or_create(
            username='JoyWu',
            defaults={
                'email': 'JoyWu@example.com',
                'first_name': 'Joy',
                'last_name': 'Wu'
            }
        )
        
        # 檢查是否已存在
        if Watchlist.objects.filter(user=user, symbol=symbol).exists():
            return Response({'error': '股票已在自選股中'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 驗證並獲取股票數據
        stock_info = LegalStockService.get_real_stock_data(symbol)
        if not stock_info:
            return Response({'error': f'無法獲取 {symbol} 的數據'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 創建自選股
        watchlist = Watchlist.objects.create(
            user=user,
            symbol=symbol,
            notes=notes
        )
        
        return Response({
            'message': f'成功添加 {symbol} 到自選股',
            'stock': {
                'id': watchlist.id,
                'symbol': symbol,
                'name': stock_info['name'],
                'exchange': stock_info['exchange'],
                'sector': stock_info['sector']
            }
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def remove_from_watchlist(request, stock_id):
    """從自選股中移除股票 - 舊版兼容"""
    try:
        user, created = User.objects.get_or_create(username='JoyWu')
        
        try:
            watchlist = Watchlist.objects.get(id=stock_id, user=user)
            symbol = watchlist.symbol
            watchlist.delete()
            
            return Response({'message': f'成功從自選股中移除 {symbol}'})
            
        except Watchlist.DoesNotExist:
            return Response({'error': '股票不在自選股中'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 投資組合 API
# ============================================================================

class PortfolioListCreateView(generics.ListCreateAPIView):
    """投資組合列表和創建"""
    queryset = Portfolio.objects.all()
    serializer_class = PortfolioSerializer
    permission_classes = [AllowAny]

class PortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """投資組合詳情"""
    queryset = Portfolio.objects.all()
    serializer_class = PortfolioSerializer
    permission_classes = [AllowAny]

@api_view(['GET', 'POST'])
def portfolio_holdings(request):
    """管理投資組合持股"""
    try:
        user, created = User.objects.get_or_create(username='JoyWu')
        
        portfolio = Portfolio.objects.filter(user=user, name='我的投資組合').first()
        if not portfolio:
            portfolio = Portfolio.objects.create(user=user, name='我的投資組合')
        
        if request.method == 'GET':
            holdings = Holding.objects.filter(portfolio=portfolio).select_related('stock')
            
            holdings_data = []
            total_value = 0
            total_cost = 0
            
            for holding in holdings:
                try:
                    # 使用合法API獲取當前價格
                    stock_data = LegalStockService.get_real_stock_data(holding.stock.symbol)
                    if stock_data:
                        current_price = stock_data['current_price']
                    else:
                        current_price = float(holding.average_cost)  # 降級到成本價
                    
                    market_value = float(holding.quantity) * current_price
                    cost_basis = float(holding.quantity) * float(holding.average_cost)
                    gain_loss = market_value - cost_basis
                    gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
                    
                    total_value += market_value
                    total_cost += cost_basis
                    
                    holdings_data.append({
                        'id': holding.id,
                        'stock': {
                            'id': holding.stock.id,
                            'symbol': holding.stock.symbol,
                            'name': holding.stock.name,
                            'exchange': holding.stock.exchange,
                            'sector': holding.stock.sector
                        },
                        'quantity': float(holding.quantity),
                        'average_cost': float(holding.average_cost),
                        'current_price': current_price,
                        'market_value': round(market_value, 2),
                        'cost_basis': round(cost_basis, 2),
                        'gain_loss': round(gain_loss, 2),
                        'gain_loss_percent': round(gain_loss_percent, 2),
                        'purchase_date': holding.purchase_date.isoformat(),
                        'weight': 0
                    })
                    
                    time.sleep(0.2)  # API 限制
                except Exception as e:
                    logger.warning(f"獲取持股 {holding.stock.symbol} 數據失敗: {str(e)}")
                    continue
            
            # 計算權重
            if total_value > 0:
                for holding in holdings_data:
                    holding['weight'] = round((holding['market_value'] / total_value * 100), 2)
            
            portfolio_summary = {
                'total_value': round(total_value, 2),
                'total_cost': round(total_cost, 2),
                'total_gain_loss': round(total_value - total_cost, 2),
                'total_gain_loss_percent': round(((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
                'holdings_count': len(holdings_data)
            }
            
            return Response({
                'portfolio': {
                    'id': portfolio.id,
                    'name': portfolio.name,
                    'created_at': portfolio.created_at.isoformat(),
                    'updated_at': portfolio.updated_at.isoformat()
                },
                'summary': portfolio_summary,
                'holdings': holdings_data
            })
            
        elif request.method == 'POST':
            symbol = request.data.get('symbol', '').upper()
            quantity = request.data.get('quantity')
            average_cost = request.data.get('average_cost')
            purchase_date = request.data.get('purchase_date')
            
            if not all([symbol, quantity, average_cost]):
                return Response({'error': '需要提供股票代碼、數量和平均成本'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                quantity = float(quantity)
                average_cost = float(average_cost)
            except ValueError:
                return Response({'error': '數量和平均成本必須是數字'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 查找或創建股票
            stock, created = Stock.objects.get_or_create(
                symbol=symbol,
                defaults={
                    'name': f'{symbol} Corporation',
                    'exchange': 'UNKNOWN',
                    'sector': 'Unknown'
                }
            )
            
            # 檢查是否已經持有該股票
            existing_holding = Holding.objects.filter(portfolio=portfolio, stock=stock).first()
            
            if existing_holding:
                # 更新現有持股
                old_value = float(existing_holding.quantity) * float(existing_holding.average_cost)
                new_value = quantity * average_cost
                total_quantity = float(existing_holding.quantity) + quantity
                new_average_cost = (old_value + new_value) / total_quantity
                
                existing_holding.quantity = total_quantity
                existing_holding.average_cost = new_average_cost
                existing_holding.save()
                
                return Response({
                    'message': f'成功更新 {stock.symbol} 持股',
                    'holding': {
                        'id': existing_holding.id,
                        'symbol': stock.symbol,
                        'quantity': float(existing_holding.quantity),
                        'average_cost': float(existing_holding.average_cost)
                    }
                })
            else:
                # 創建新持股
                purchase_datetime = timezone.now()
                if purchase_date:
                    try:
                        purchase_datetime = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
                    except:
                        pass
                
                holding = Holding.objects.create(
                    portfolio=portfolio,
                    stock=stock,
                    quantity=quantity,
                    average_cost=average_cost,
                    purchase_date=purchase_datetime
                )
                
                return Response({
                    'message': f'成功添加 {stock.symbol} 到投資組合',
                    'holding': {
                        'id': holding.id,
                        'symbol': stock.symbol,
                        'quantity': float(holding.quantity),
                        'average_cost': float(holding.average_cost)
                    }
                })
                
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT', 'DELETE'])
def portfolio_holding_detail(request, holding_id):
    """更新或刪除特定持股"""
    try:
        user, created = User.objects.get_or_create(username='JoyWu')
        
        try:
            holding = Holding.objects.get(id=holding_id, portfolio__user=user)
        except Holding.DoesNotExist:
            return Response({'error': '持股不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            quantity = request.data.get('quantity')
            average_cost = request.data.get('average_cost')
            
            if quantity is not None:
                try:
                    holding.quantity = float(quantity)
                except ValueError:
                    return Response({'error': '數量必須是數字'}, status=status.HTTP_400_BAD_REQUEST)
            
            if average_cost is not None:
                try:
                    holding.average_cost = float(average_cost)
                except ValueError:
                    return Response({'error': '平均成本必須是數字'}, status=status.HTTP_400_BAD_REQUEST)
            
            holding.save()
            
            return Response({
                'message': f'成功更新 {holding.stock.symbol} 持股',
                'holding': {
                    'id': holding.id,
                    'symbol': holding.stock.symbol,
                    'quantity': float(holding.quantity),
                    'average_cost': float(holding.average_cost)
                }
            })
            
        elif request.method == 'DELETE':
            stock_symbol = holding.stock.symbol
            holding.delete()
            
            return Response({'message': f'成功從投資組合中移除 {stock_symbol}'})
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def portfolio_analysis(request):
    """投資組合分析"""
    try:
        user, created = User.objects.get_or_create(username='JoyWu')
        
        portfolio = Portfolio.objects.filter(user=user, name='我的投資組合').first()
        if not portfolio:
            portfolio = Portfolio.objects.create(user=user, name='我的投資組合')
        
        holdings = Holding.objects.filter(portfolio=portfolio).select_related('stock')
        
        # 按板塊分組
        sector_analysis = {}
        exchange_analysis = {}
        total_value = 0
        
        for holding in holdings:
            try:
                stock_data = LegalStockService.get_real_stock_data(holding.stock.symbol)
                if stock_data:
                    current_price = stock_data['current_price']
                else:
                    current_price = float(holding.average_cost)
                
                market_value = float(holding.quantity) * current_price
                total_value += market_value
                
                # 板塊分析
                sector = holding.stock.sector or 'Unknown'
                if sector not in sector_analysis:
                    sector_analysis[sector] = {'value': 0, 'count': 0}
                sector_analysis[sector]['value'] += market_value
                sector_analysis[sector]['count'] += 1
                
                # 交易所分析
                exchange = holding.stock.exchange or 'Unknown'
                if exchange not in exchange_analysis:
                    exchange_analysis[exchange] = {'value': 0, 'count': 0}
                exchange_analysis[exchange]['value'] += market_value
                exchange_analysis[exchange]['count'] += 1
                
                time.sleep(0.2)
            except Exception as e:
                continue
        
        # 計算百分比
        for sector in sector_analysis:
            sector_analysis[sector]['percentage'] = round(
                (sector_analysis[sector]['value'] / total_value * 100) if total_value > 0 else 0, 2
            )
        
        for exchange in exchange_analysis:
            exchange_analysis[exchange]['percentage'] = round(
                (exchange_analysis[exchange]['value'] / total_value * 100) if total_value > 0 else 0, 2
            )
        
        return Response({
            'total_value': round(total_value, 2),
            'holdings_count': holdings.count(),
            'sector_analysis': sector_analysis,
            'exchange_analysis': exchange_analysis,
            'diversification_score': min(len(sector_analysis) * 10, 100)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def portfolio_performance(request):
    """投資組合績效分析"""
    try:
        user, created = User.objects.get_or_create(username='JoyWu')
        portfolio = Portfolio.objects.filter(user=user, name='我的投資組合').first()
        
        if not portfolio:
            return Response({'error': '投資組合不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        holdings = Holding.objects.filter(portfolio=portfolio).select_related('stock')
        
        total_value = 0
        total_cost = 0
        best_performer = None
        worst_performer = None
        best_gain_percent = float('-inf')
        worst_gain_percent = float('inf')
        monthly_investments = {}
        
        for holding in holdings:
            try:
                stock_data = LegalStockService.get_real_stock_data(holding.stock.symbol)
                if stock_data:
                    current_price = stock_data['current_price']
                else:
                    current_price = float(holding.average_cost)
                
                market_value = float(holding.quantity) * current_price
                cost_basis = float(holding.quantity) * float(holding.average_cost)
                gain_loss_percent = ((market_value - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0
                
                total_value += market_value
                total_cost += cost_basis
                
                # 最佳和最差表現者
                if gain_loss_percent > best_gain_percent:
                    best_gain_percent = gain_loss_percent
                    best_performer = {
                        'symbol': holding.stock.symbol,
                        'name': holding.stock.name,
                        'gain_percent': gain_loss_percent,
                        'market_value': market_value
                    }
                
                if gain_loss_percent < worst_gain_percent:
                    worst_gain_percent = gain_loss_percent
                    worst_performer = {
                        'symbol': holding.stock.symbol,
                        'name': holding.stock.name,
                        'gain_percent': gain_loss_percent,
                        'market_value': market_value
                    }
                
                # 按月份統計投資
                month_key = holding.purchase_date.strftime('%Y-%m')
                if month_key not in monthly_investments:
                    monthly_investments[month_key] = 0
                monthly_investments[month_key] += cost_basis
                
                time.sleep(0.2)
            except Exception as e:
                continue
        
        # 風險評估
        risk_score = 0
        if holdings.count() < 5:
            risk_score += 30
        
        sectors = set(holding.stock.sector for holding in holdings if holding.stock.sector)
        if len(sectors) < 3:
            risk_score += 20
        
        # Sharpe 比率簡化計算
        total_return_percent = ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0
        sharpe_ratio = max(0, (total_return_percent - 2) / 10)
        
        return Response({
            'performance_summary': {
                'total_value': round(total_value, 2),
                'total_cost': round(total_cost, 2),
                'total_return': round(total_value - total_cost, 2),
                'total_return_percent': round(total_return_percent, 2),
                'sharpe_ratio': round(sharpe_ratio, 2)
            },
            'best_performer': best_performer,
            'worst_performer': worst_performer,
            'risk_assessment': {
                'risk_score': min(risk_score, 100),
                'risk_level': 'Low' if risk_score < 20 else 'Medium' if risk_score < 50 else 'High',
                'diversification_score': len(sectors)
            },
            'monthly_investments': monthly_investments,
            'portfolio_age_days': (datetime.now().date() - portfolio.created_at.date()).days
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 分析和推薦 API
# ============================================================================

@api_view(['GET'])
def market_sentiment(request):
    """市場情緒分析"""
    try:
        # 使用預定義的股票列表進行分析
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
        
        total_stocks = len(symbols)
        up_count = 0
        down_count = 0
        neutral_count = 0
        sector_performance = {}
        
        for symbol in symbols:
            try:
                stock_data = LegalStockService.get_real_stock_data(symbol)
                if stock_data:
                    change_percent = stock_data['change_percent']
                    
                    if change_percent > 1:
                        up_count += 1
                    elif change_percent < -1:
                        down_count += 1
                    else:
                        neutral_count += 1
                    
                    # 板塊表現
                    sector = stock_data.get('sector', 'Unknown')
                    if sector not in sector_performance:
                        sector_performance[sector] = {'count': 0, 'avg_change': 0}
                    sector_performance[sector]['count'] += 1
                    sector_performance[sector]['avg_change'] += change_percent
                    
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        # 計算板塊平均表現
        for sector in sector_performance:
            if sector_performance[sector]['count'] > 0:
                sector_performance[sector]['avg_change'] /= sector_performance[sector]['count']
                sector_performance[sector]['avg_change'] = round(sector_performance[sector]['avg_change'], 2)
        
        # 市場情緒判斷
        up_ratio = up_count / total_stocks if total_stocks > 0 else 0
        down_ratio = down_count / total_stocks if total_stocks > 0 else 0
        
        if up_ratio > 0.6:
            sentiment = 'Bullish'
            sentiment_score = 80 + (up_ratio - 0.6) * 50
        elif down_ratio > 0.6:
            sentiment = 'Bearish'
            sentiment_score = 20 - (down_ratio - 0.6) * 50
        else:
            sentiment = 'Neutral'
            sentiment_score = 50
        
        return Response({
            'sentiment': sentiment,
            'sentiment_score': round(sentiment_score, 1),
            'market_stats': {
                'total_stocks': total_stocks,
                'stocks_up': up_count,
                'stocks_down': down_count,
                'stocks_neutral': neutral_count,
                'up_ratio': round(up_ratio * 100, 1),
                'down_ratio': round(down_ratio * 100, 1)
            },
            'sector_performance': sector_performance,
            'analysis_time': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def stock_recommendation(request):
    """股票推薦"""
    try:
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', '2330.TW', '2454.TW']
        recommendations = []
        
        for symbol in symbols:
            try:
                stock_data = LegalStockService.get_real_stock_data(symbol)
                if stock_data:
                    price = stock_data['current_price']
                    change_percent = stock_data['change_percent']
                    
                    # 簡單推薦邏輯
                    score = 50
                    reasons = []
                    
                    # 價格趨勢
                    if -2 <= change_percent <= 2:
                        score += 10
                        reasons.append("價格穩定")
                    elif change_percent > 5:
                        score -= 5
                        reasons.append("漲幅過大")
                    elif change_percent < -5:
                        score += 15
                        reasons.append("下跌後機會")
                    
                    # 板塊加權
                    sector = stock_data.get('sector', '')
                    if sector in ['Technology', 'Semiconductor']:
                        score += 10
                        reasons.append("熱門板塊")
                    
                    # 價格範圍
                    if 50 <= price <= 500:
                        score += 5
                        reasons.append("合理價位")
                    
                    if score >= 65:
                        recommendations.append({
                            'stock': {
                                'symbol': symbol,
                                'name': stock_data['name'],
                                'sector': sector,
                                'exchange': stock_data['exchange']
                            },
                            'current_price': price,
                            'change_percent': change_percent,
                            'recommendation_score': score,
                            'reasons': reasons,
                            'recommendation': 'Strong Buy' if score >= 80 else 'Buy' if score >= 70 else 'Watch'
                        })
                    
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        # 按分數排序
        recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        return Response({
            'recommendations': recommendations[:10],
            'total_analyzed': len(symbols),
            'generated_at': datetime.now().isoformat(),
            'disclaimer': '此推薦僅供參考，投資有風險，請謹慎決策'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# 舊版本兼容性 API
# ============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_real_data(request, symbol):
    """舊版本兼容性 - 重定向到新的股票數據 API"""
    try:
        stock_data = LegalStockService.get_real_stock_data(symbol)
        
        if stock_data:
            return JsonResponse(stock_data)
        else:
            return JsonResponse({
                'error': f'無法獲取股票 {symbol} 的數據'
            }, status=404)
            
    except Exception as e:
        logger.error(f"獲取股票 {symbol} 數據時發生錯誤: {str(e)}")
        return JsonResponse({
            'error': f'服務器錯誤: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_chart_data(request, symbol):
    """舊版本兼容性 - 重定向到新的圖表數據 API"""
    try:
        period = request.GET.get('period', '1y')
        
        # 獲取股票基本信息
        stock_info = LegalStockService.get_real_stock_data(symbol)
        
        # 生成模擬歷史數據
        chart_data = []
        base_price = stock_info['current_price'] if stock_info else 200.0
        
        for i in range(30):
            date = datetime.now() - timedelta(days=29-i)
            volatility = random.uniform(-0.02, 0.02)
            price = base_price * (1 + volatility)
            
            chart_data.append({
                'time': date.strftime('%Y-%m-%d'),
                'open': round(price * 0.99, 2),
                'high': round(price * 1.02, 2),
                'low': round(price * 0.98, 2),
                'close': round(price, 2),
                'volume': random.randint(10000000, 50000000)
            })
            base_price = price
        
        response_data = {
            'symbol': symbol.upper(),
            'period': period,
            'stock_info': stock_info,
            'chart_data': chart_data,
            'data_points': len(chart_data),
            'last_updated': datetime.now().isoformat()
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"獲取股票 {symbol} 圖表數據時發生錯誤: {str(e)}")
        return JsonResponse({
            'error': f'服務器錯誤: {str(e)}'
        }, status=500)

# ============================================================================
# 預留功能 API
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def portfolio_list(request):
    """獲取投資組合列表 - 預留功能"""
    return Response({
        'message': '投資組合列表功能正在開發中',
        'status': 'coming_soon'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def portfolio_detail(request, portfolio_id):
    """獲取投資組合詳情 - 預留功能"""
    return Response({
        'message': '投資組合詳情功能正在開發中',
        'status': 'coming_soon'
    })

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def price_alerts(request):
    """價格提醒管理 - 預留功能"""
    return Response({
        'message': '價格提醒功能正在開發中',
        'status': 'coming_soon'
    })

# 在 views.py 末尾添加這些函數：

@api_view(['GET'])
def real_market_data(request):
    """獲取真實市場數據"""
    try:
        popular_stocks = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', '2330.TW', '2454.TW', '0700.HK']
        stocks_data = []
        
        for symbol in popular_stocks:
            try:
                data = LegalStockService.get_real_stock_data(symbol)
                if data:
                    stocks_data.append(data)
                    time.sleep(0.2)
            except Exception as e:
                continue
        
        return Response({
            'stocks': stocks_data,
            'last_updated': datetime.now().isoformat(),
            'data_source': 'Alpha Vantage + Enhanced Mock'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 在 backend/portfolios/views.py 中添加這些函數

from .taiwan_stock_service import TaiwanStockService
import random

@api_view(['GET'])
@permission_classes([AllowAny])
def taiwan_market_overview(request):
    """台股市場總覽 - 包含大盤、櫃買指數和漲跌停股票"""
    try:
        logger.info(f"用戶 {request.user or 'JoyWuFN'} 獲取台股市場總覽")
        
        market_summary = TaiwanStockService.get_taiwan_market_summary()
        
        return Response({
            'success': True,
            'data': market_summary,
            'user': 'JoyWuFN',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取台股市場總覽失敗: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def taiwan_indices(request):
    """台股大盤和櫃買指數"""
    try:
        indices = TaiwanStockService.get_taiwan_indices()
        
        # 分類指數
        main_indices = [idx for idx in indices if idx['type'] == 'main']
        otc_indices = [idx for idx in indices if idx['type'] == 'otc']
        
        return Response({
            'success': True,
            'data': {
                'main_indices': main_indices,
                'otc_indices': otc_indices,
                'all_indices': indices,
                'market_status': TaiwanStockService._get_market_status(),
                'market_date': datetime.now().strftime('%Y-%m-%d')
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取台股指數失敗: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def taiwan_limit_stocks(request):
    """台股漲停跌停股票"""
    try:
        limit_data = TaiwanStockService.get_limit_stocks()
        
        return Response({
            'success': True,
            'data': {
                'limit_up_stocks': limit_data.get('limit_up', []),
                'limit_down_stocks': limit_data.get('limit_down', []),
                'limit_up_count': len(limit_data.get('limit_up', [])),
                'limit_down_count': len(limit_data.get('limit_down', [])),
                'market_date': limit_data.get('market_date'),
                'data_source': limit_data.get('data_source')
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取漲跌停股票失敗: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def taiwan_market_stats(request):
    """台股市場統計"""
    try:
        # 獲取基本數據
        market_summary = TaiwanStockService.get_taiwan_market_summary()
        
        # 計算統計數據
        stats = {
            'market_date': datetime.now().strftime('%Y-%m-%d (%A)'),
            'market_status': market_summary.get('market_status', '未知'),
            'trading_session': TaiwanStockService._get_trading_session(),
            
            # 指數統計
            'indices_summary': {
                'main_index': market_summary.get('indices', {}).get('main'),
                'otc_index': market_summary.get('indices', {}).get('otc'),
            },
            
            # 漲跌停統計
            'limit_summary': {
                'total_limit_up': market_summary.get('limit_stocks', {}).get('limit_up_count', 0),
                'total_limit_down': market_summary.get('limit_stocks', {}).get('limit_down_count', 0),
                'limit_ratio': f"{market_summary.get('limit_stocks', {}).get('limit_up_count', 0)}↑ / {market_summary.get('limit_stocks', {}).get('limit_down_count', 0)}↓"
            },
            
            # 市場情緒
            'market_sentiment': TaiwanStockService._calculate_market_sentiment(market_summary),
            
            'last_updated': datetime.now().isoformat()
        }
        
        return Response({
            'success': True,
            'data': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"獲取台股市場統計失敗: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)