# backend/portfolios/consumers.py
import json
import asyncio
import random
from decimal import Decimal
from datetime import datetime, timedelta 
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Stock, StockPrice

class StockPriceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'stock_prices'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✅ WebSocket connected: {self.channel_name}")
        
        # 立即發送測試數據
        await self.send_test_data()
        
        # 開始定期更新
        asyncio.create_task(self.send_price_updates())

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"❌ WebSocket disconnected: {self.channel_name}")

    async def send_test_data(self):
        """發送測試數據"""
        test_stocks = [
            {'symbol': 'AAPL', 'name': 'Apple Inc.'},
            {'symbol': 'TSLA', 'name': 'Tesla Inc.'},
            {'symbol': 'GOOGL', 'name': 'Alphabet Inc.'},
            {'symbol': 'MSFT', 'name': 'Microsoft Corp.'},
            {'symbol': 'AMZN', 'name': 'Amazon.com Inc.'},
            {'symbol': 'NVDA', 'name': 'NVIDIA Corporation'},
            {'symbol': '2330.TW', 'name': '台積電'},
            {'symbol': '2317.TW', 'name': '鴻海'},
            {'symbol': '2454.TW', 'name': '聯發科'},
            {'symbol': '1101.TW', 'name': '台泥'},
        ]
        
        updates = []
        for stock in test_stocks:
            price = random.uniform(50, 500)
            change = random.uniform(-10, 10)
            change_percent = (change / price) * 100
            
            updates.append({
                'symbol': stock['symbol'],
                'name': stock['name'],
                'price': round(price, 2),
                'change': round(change, 2),
                'change_percent': round(change_percent, 2),
                'timestamp': datetime.now().isoformat(),
                'volume': random.randint(1000000, 50000000)
            })
        
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'updates': updates
        }))
        print(f"📊 Sent initial data: {len(updates)} stocks")

    async def send_price_updates(self):
        """定期發送價格更新"""
        test_stocks = [
            {'symbol': 'AAPL', 'name': 'Apple Inc.'},
            {'symbol': 'TSLA', 'name': 'Tesla Inc.'},
            {'symbol': 'GOOGL', 'name': 'Alphabet Inc.'},
            {'symbol': 'MSFT', 'name': 'Microsoft Corp.'},
            {'symbol': 'AMZN', 'name': 'Amazon.com Inc.'},
            {'symbol': 'NVDA', 'name': 'NVIDIA Corporation'},
            {'symbol': '2330.TW', 'name': '台積電'},
            {'symbol': '2317.TW', 'name': '鴻海'},
            {'symbol': '2454.TW', 'name': '聯發科'},
            {'symbol': '1101.TW', 'name': '台泥'},
        ]
        
        while True:
            try:
                await asyncio.sleep(3)  # 每3秒更新一次
                
                updates = []
                for stock in test_stocks:
                    # 基準價格（模擬的）
                    base_prices = {
                        'AAPL': 185, 'TSLA': 248, 'GOOGL': 138, 'MSFT': 330,
                        'AMZN': 145, 'NVDA': 125, '2330.TW': 580, '2317.TW': 110,
                        '2454.TW': 880, '1101.TW': 45
                    }
                    
                    base_price = base_prices.get(stock['symbol'], 100)
                    change_percent = random.uniform(-0.5, 0.5)  # ±0.5%
                    new_price = base_price * (1 + change_percent/100)
                    change = new_price - base_price
                    
                    updates.append({
                        'symbol': stock['symbol'],
                        'name': stock['name'],
                        'price': round(new_price, 2),
                        'change': round(change, 2),
                        'change_percent': round(change_percent, 2),
                        'timestamp': datetime.now().isoformat(),
                        'volume': random.randint(1000000, 50000000)
                    })
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'price_update',
                        'updates': updates
                    }
                )
                print(f"🔄 Sent price update: {len(updates)} stocks")
                
            except Exception as e:
                print(f"❌ Error in price updates: {e}")
                await asyncio.sleep(5)

    async def price_update(self, event):
        """處理價格更新事件"""
        updates = event['updates']
        await self.send(text_data=json.dumps({
            'type': 'price_update',
            'updates': updates
        }))

    @database_sync_to_async
    def get_all_stocks(self):
        try:
            return list(Stock.objects.values('id', 'symbol', 'name')[:20])
        except:
            return []