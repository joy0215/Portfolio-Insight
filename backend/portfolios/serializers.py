# backend/portfolios/serializers.py
from rest_framework import serializers
from .models import Stock, Portfolio, Holding, StockPrice, Watchlist

class StockSerializer(serializers.ModelSerializer):
    current_price = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()
    change_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'exchange', 'sector', 'market_cap', 
                 'current_price', 'change', 'change_percent']
    
    def get_current_price(self, obj):
        latest_price = StockPrice.objects.filter(stock=obj).first()
        return float(latest_price.price) if latest_price else None
    
    def get_change(self, obj):
        latest_price = StockPrice.objects.filter(stock=obj).first()
        return float(latest_price.change) if latest_price else None
    
    def get_change_percent(self, obj):
        latest_price = StockPrice.objects.filter(stock=obj).first()
        return float(latest_price.change_percent) if latest_price else None

class HoldingSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    market_value = serializers.SerializerMethodField()
    
    class Meta:
        model = Holding
        fields = ['id', 'stock', 'quantity', 'average_price', 'market_value']
    
    def get_market_value(self, obj):
        latest_price = StockPrice.objects.filter(stock=obj.stock).first()
        if latest_price:
            return float(obj.quantity) * float(latest_price.price)
        return 0

class PortfolioSerializer(serializers.ModelSerializer):
    holdings = HoldingSerializer(many=True, read_only=True)
    total_value = serializers.SerializerMethodField()
    total_gain_loss = serializers.SerializerMethodField()
    
    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'description', 'holdings', 'total_value', 
                 'total_gain_loss', 'created_at', 'updated_at']
    
    def get_total_value(self, obj):
        total = 0
        for holding in obj.holdings.all():
            latest_price = StockPrice.objects.filter(stock=holding.stock).first()
            if latest_price:
                total += float(holding.quantity) * float(latest_price.price)
        return total
    
    def get_total_gain_loss(self, obj):
        total_cost = sum(float(holding.quantity) * float(holding.average_price) 
                        for holding in obj.holdings.all())
        total_value = self.get_total_value(obj)
        return total_value - total_cost

class WatchlistSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    
    class Meta:
        model = Watchlist
        fields = ['id', 'stock', 'created_at']