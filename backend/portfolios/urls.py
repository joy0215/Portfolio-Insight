# backend/portfolios/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ============================================================================
    # 基礎測試 API
    # ============================================================================
    
    path('test/', views.test_api, name='test_api'),
    path('generate-fake-data/', views.generate_fake_data, name='generate_fake_data'),
    
    # ============================================================================
    # 系統狀態 API
    # ============================================================================
    
    path('health/', views.health_check, name='health_check'),
    path('status/', views.system_status, name='system_status'),
    
    # ============================================================================
    # 股票數據 API
    # ============================================================================
    
    # 實時股票數據
    path('real-data/<str:symbol>/', views.real_stock_data, name='real_stock_data'),
    path('real-data/chart/<str:symbol>/', views.stock_chart_data, name='stock_chart_data'),
    path('search/', views.search_stocks, name='search_stocks'),
    path('real-search/', views.real_stock_search, name='real_stock_search'),
    path('sync-real-data/', views.sync_real_data, name='sync_real_data'),
    
    # ============================================================================
    # 市場總覽 API
    # ============================================================================
    
    path('market-overview/', views.market_overview, name='market_overview'),
    path('market-indices/', views.market_indices, name='market_indices'),
    path('trending-stocks/', views.trending_stocks, name='trending_stocks'),
    path('live-market-data/', views.live_market_data, name='live_market_data'),
    path('real-market-data/', views.real_market_data, name='real_market_data'),
    
    # ============================================================================
    # 自選股管理 API
    # ============================================================================
    
    path('watchlist/groups/', views.watchlist_groups, name='watchlist_groups'),
    path('watchlist/stocks/', views.watchlist_stocks, name='watchlist_stocks'),
    path('watchlist/stocks/<int:stock_id>/', views.watchlist_stock_detail, name='watchlist_stock_detail'),
    path('watchlist/summary/', views.watchlist_summary, name='watchlist_summary'),
    
    # ============================================================================
    # 舊版自選股 API (向後兼容)
    # ============================================================================
    
    path('watchlist/', views.watchlist_view, name='watchlist_view'),
    path('add-stock-by-symbol/', views.add_stock_by_symbol, name='add_stock_by_symbol'),
    path('remove-from-watchlist/<int:stock_id>/', views.remove_from_watchlist, name='remove_from_watchlist'),
    
    # ============================================================================
    # 投資組合管理 API
    # ============================================================================
    
    path('portfolios/', views.PortfolioListCreateView.as_view(), name='portfolio_list_create'),
    path('portfolios/<int:pk>/', views.PortfolioDetailView.as_view(), name='portfolio_detail'),
    path('portfolio-holdings/', views.portfolio_holdings, name='portfolio_holdings'),
    path('portfolio-holdings/<int:holding_id>/', views.portfolio_holding_detail, name='portfolio_holding_detail'),
    path('portfolio-analysis/', views.portfolio_analysis, name='portfolio_analysis'),
    path('portfolio-performance/', views.portfolio_performance, name='portfolio_performance'),
    
    # ============================================================================
    # 分析和推薦 API
    # ============================================================================
    
    path('market-sentiment/', views.market_sentiment, name='market_sentiment'),
    path('stock-recommendation/', views.stock_recommendation, name='stock_recommendation'),
    
    # ============================================================================
    # 舊版兼容性 API
    # ============================================================================
    
    path('real/<str:symbol>/', views.get_real_data, name='get_real_data_old'),
    path('chart/<str:symbol>/', views.get_chart_data, name='get_chart_data_old'),
    
    # ============================================================================
    # 預留功能 API
    # ============================================================================
    
    path('price-alerts/', views.price_alerts, name='price_alerts'),

    # ============================================================================
    # 台股專用 API
    # ============================================================================
    
    path('taiwan/market-overview/', views.taiwan_market_overview, name='taiwan_market_overview'),
    path('taiwan/indices/', views.taiwan_indices, name='taiwan_indices'),
    path('taiwan/limit-stocks/', views.taiwan_limit_stocks, name='taiwan_limit_stocks'),
    path('taiwan/market-stats/', views.taiwan_market_stats, name='taiwan_market_stats'),
    
]