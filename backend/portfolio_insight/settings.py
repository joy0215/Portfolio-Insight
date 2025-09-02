# backend/portfolio_insight/settings.py
"""
Django settings for portfolio_insight project.
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-your-secret-key-here-change-this-in-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '192.168.1.100',  # 如果需要局域網訪問
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'corsheaders',
    
    # Local apps
    'portfolios',

    'channels',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'portfolio_insight.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'portfolio_insight.wsgi.application'

# 添加 ASGI 配置
ASGI_APPLICATION = 'portfolio_insight.asgi.application'

# 添加 Channels 配置
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Taipei'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # 開發階段設為 AllowAny
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.100:3000",  # 如果需要局域網訪問
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.100:3000",
]

# 日誌配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'portfolios': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# 創建必要的目錄
os.makedirs(BASE_DIR / 'media', exist_ok=True)
os.makedirs(BASE_DIR / 'static', exist_ok=True)
os.makedirs(BASE_DIR / 'staticfiles', exist_ok=True)
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
os.makedirs(BASE_DIR / 'templates', exist_ok=True)

# ============================================================================
# 股票API配置
# ============================================================================

# Alpha Vantage API配置 (免費版，每日500次請求)
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', 'CTH2VQ23IP8BBK0B')

# 股票API配置
STOCK_API_CONFIG = {
    'PROVIDER': 'alpha_vantage',  # 主要提供商
    'API_KEY': ALPHA_VANTAGE_API_KEY,
    'RATE_LIMIT': True,           # 啟用速率限制
    'CACHE_TIMEOUT': 300,         # 緩存5分鐘
    'MAX_REQUESTS_PER_MINUTE': 5, # Alpha Vantage 免費版限制
    'FALLBACK_TO_MOCK': True,     # 在API失敗時使用模擬數據
    'MOCK_DATA_REALISTIC': True,  # 使用基於真實價格的模擬數據
}

# 支持的股票市場
SUPPORTED_MARKETS = {
    'US': {
        'name': '美股',
        'exchanges': ['NASDAQ', 'NYSE', 'AMEX'],
        'currency': 'USD',
        'timezone': 'America/New_York',
        'trading_hours': {
            'open': '09:30',
            'close': '16:00',
            'days': [0, 1, 2, 3, 4]  # 週一到週五
        }
    },
    'TW': {
        'name': '台股',
        'exchanges': ['TWSE', 'TPEx'],
        'currency': 'TWD',
        'timezone': 'Asia/Taipei',
        'trading_hours': {
            'open': '09:00',
            'close': '13:30',
            'days': [0, 1, 2, 3, 4]
        }
    },
    'HK': {
        'name': '港股',
        'exchanges': ['HKSE'],
        'currency': 'HKD',
        'timezone': 'Asia/Hong_Kong',
        'trading_hours': {
            'open': '09:30',
            'close': '16:00',
            'days': [0, 1, 2, 3, 4]
        }
    }
}

# 緩存配置
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'portfolio-insight-cache',
        'TIMEOUT': 300,  # 5 分鐘
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    }
}

# 自定義設置
DEFAULT_CHARSET = 'utf-8'

# 安全設置 (生產環境時請修改)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# 郵件配置 (如果需要發送通知)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # 開發環境
EMAIL_HOST = 'localhost'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''

# 國際化設置
LANGUAGES = [
    ('zh-hant', '繁體中文'),
    ('zh-hans', '簡體中文'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# 會話配置
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 24小時
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG

# API版本配置
API_VERSION = 'v2.0'
API_TITLE = 'Portfolio Insight API'
API_DESCRIPTION = '投資組合洞察系統 API - 提供股票數據、自選股管理等功能'

# 功能開關
FEATURE_FLAGS = {
    'REAL_TIME_DATA': True,
    'PRICE_ALERTS': False,      # 開發中
    'NEWS_INTEGRATION': False,  # 開發中
    'SOCIAL_LOGIN': False,      # 開發中
    'ADVANCED_CHARTS': True,
    'PORTFOLIO_ANALYTICS': True,
    'MOCK_DATA_FALLBACK': True,
}

# 監控和性能
MONITORING = {
    'ENABLE_METRICS': DEBUG,
    'LOG_SLOW_QUERIES': True,
    'SLOW_QUERY_THRESHOLD': 0.5,  # 0.5秒
}

print(f"🚀 Portfolio Insight API {API_VERSION} 啟動中...")
print(f"📊 Alpha Vantage API: {'已配置' if ALPHA_VANTAGE_API_KEY != 'YOUR_API_KEY_HERE' else '未配置'}")
print(f"🔧 調試模式: {'開啟' if DEBUG else '關閉'}")
print(f"💾 數據庫: SQLite")
print(f"🌐 CORS: {'允許所有來源' if CORS_ALLOW_ALL_ORIGINS else '限制來源'}")