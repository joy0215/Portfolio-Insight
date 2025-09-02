# backend/portfolios/models.py - 確保模型定義正確

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Stock(models.Model):
    """股票基本信息"""
    symbol = models.CharField(max_length=20, unique=True, verbose_name='股票代碼')
    name = models.CharField(max_length=200, verbose_name='股票名稱')
    exchange = models.CharField(max_length=50, verbose_name='交易所')
    sector = models.CharField(max_length=100, blank=True, verbose_name='板塊')
    market_cap = models.BigIntegerField(null=True, blank=True, verbose_name='市值')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')

    class Meta:
        verbose_name = '股票'
        verbose_name_plural = '股票'
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} - {self.name}"

class StockPrice(models.Model):
    """股票價格記錄"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='prices')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='價格')
    change = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='漲跌額')
    change_percent = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='漲跌幅(%)')
    volume = models.BigIntegerField(verbose_name='成交量')
    timestamp = models.DateTimeField(verbose_name='時間戳')

    class Meta:
        verbose_name = '股票價格'
        verbose_name_plural = '股票價格'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.stock.symbol} - {self.price} ({self.timestamp})"

class Portfolio(models.Model):
    """投資組合"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolios')
    name = models.CharField(max_length=100, verbose_name='組合名稱')
    description = models.TextField(blank=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')

    class Meta:
        verbose_name = '投資組合'
        verbose_name_plural = '投資組合'
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.user.username} - {self.name}"

class Holding(models.Model):
    """持股記錄"""
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='holdings')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='數量')
    average_cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='平均成本')
    purchase_date = models.DateTimeField(verbose_name='購買日期')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')

    class Meta:
        verbose_name = '持股'
        verbose_name_plural = '持股'
        unique_together = ['portfolio', 'stock']

    def __str__(self):
        return f"{self.portfolio.name} - {self.stock.symbol} ({self.quantity})"

class WatchlistGroup(models.Model):
    """自選股分組"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist_groups')
    name = models.CharField(max_length=100, verbose_name='分組名稱')
    description = models.TextField(blank=True, verbose_name='分組描述')
    color = models.CharField(max_length=7, default='#3B82F6', verbose_name='分組顏色')  # Hex color
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')
    order = models.IntegerField(default=0, verbose_name='排序順序')

    class Meta:
        verbose_name = '自選股分組'
        verbose_name_plural = '自選股分組'
        ordering = ['order', 'created_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.user.username} - {self.name}"

class Watchlist(models.Model):
    """自選股 - 新版本"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlists')
    symbol = models.CharField(max_length=20, verbose_name='股票代碼')
    group = models.ForeignKey(WatchlistGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    added_at = models.DateTimeField(auto_now_add=True, verbose_name='添加時間')
    notes = models.TextField(blank=True, verbose_name='備註')
    target_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='目標價格')
    stop_loss_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='停損價格')
    alert_enabled = models.BooleanField(default=False, verbose_name='價格提醒啟用')
    order = models.IntegerField(default=0, verbose_name='排序順序')

    class Meta:
        verbose_name = '自選股'
        verbose_name_plural = '自選股'
        ordering = ['order', 'added_at']
        unique_together = ['user', 'symbol']

    def __str__(self):
        return f"{self.user.username} - {self.symbol}"

class WatchlistStock(models.Model):
    """舊版自選股關聯 - 向後兼容"""
    watchlist = models.ForeignKey('Watchlist', on_delete=models.CASCADE, related_name='watchlist_stocks')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True, verbose_name='添加時間')
    notes = models.TextField(blank=True, verbose_name='備註')

    class Meta:
        verbose_name = '自選股票關聯'
        verbose_name_plural = '自選股票關聯'
        unique_together = ['watchlist', 'stock']

    def __str__(self):
        return f"{self.watchlist} - {self.stock.symbol}"

class PriceAlert(models.Model):
    """價格提醒"""
    ALERT_TYPES = [
        ('above', '高於'),
        ('below', '低於'),
        ('change_percent', '漲跌幅'),
    ]
    
    ALERT_STATUS = [
        ('active', '啟用'),
        ('triggered', '已觸發'),
        ('disabled', '停用'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_alerts')
    symbol = models.CharField(max_length=20, verbose_name='股票代碼')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, verbose_name='提醒類型')
    target_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='目標值')
    status = models.CharField(max_length=20, choices=ALERT_STATUS, default='active', verbose_name='狀態')
    message = models.TextField(blank=True, verbose_name='提醒訊息')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    triggered_at = models.DateTimeField(null=True, blank=True, verbose_name='觸發時間')
    triggered_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='觸發價格')

    class Meta:
        verbose_name = '價格提醒'
        verbose_name_plural = '價格提醒'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.symbol} {self.get_alert_type_display()} {self.target_value}"