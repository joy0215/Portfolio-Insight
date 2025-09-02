# backend/portfolio_insight/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/portfolios/', include('portfolios.urls')),
    
    # 新增的市場 API 路由
    path('api/market/', include([
        path('overview/', include('portfolios.urls')),
        path('indices/', include('portfolios.urls')),
        path('trending/', include('portfolios.urls')),
    ])),
    
    # 新增的自選股 API 路由
    path('api/watchlist/', include([
        path('groups/', include('portfolios.urls')),
        path('stocks/', include('portfolios.urls')),
        path('summary/', include('portfolios.urls')),
    ])),
    
    # 系統 API
    path('api/', include([
        path('health/', include('portfolios.urls')),
        path('status/', include('portfolios.urls')),
    ])),
]