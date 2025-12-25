#!/usr/bin/env python3
"""
Call Center Sync Configuration
Cấu hình cho việc đồng bộ dữ liệu CDR từ PBX API
"""

import os
from pathlib import Path
from dataclasses import dataclass

@dataclass
class CallCenterConfig:
    """Cấu hình Call Center Sync"""
    
    # PBX API Settings
    pbx_api_url: str = os.getenv('PBX_API_URL', 'https://pbx01.onepos.vn:8080/api/v2/cdrs')
    pbx_domain: str = os.getenv('PBX_DOMAIN', 'tazaspa102019')
    pbx_api_key: str = os.getenv('PBX_API_KEY', '')
    pbx_recording_base_url: str = os.getenv('PBX_RECORDING_BASE_URL', 'https://pbx01.onepos.vn:8080/recordings')
    
    # Database
    db_path: Path = Path(__file__).parent.parent / "database" / "callcenter.db"
    
    # Sync Settings
    sync_enabled: bool = os.getenv('CALLCENTER_SYNC_ENABLED', 'true').lower() == 'true'
    daily_sync_hour: int = int(os.getenv('CALLCENTER_DAILY_SYNC_HOUR', '2'))
    daily_sync_minute: int = int(os.getenv('CALLCENTER_DAILY_SYNC_MINUTE', '0'))
    missing_check_hour: int = int(os.getenv('CALLCENTER_MISSING_CHECK_HOUR', '3'))
    retry_interval_minutes: int = int(os.getenv('CALLCENTER_RETRY_INTERVAL_MINUTES', '15'))
    max_retries: int = int(os.getenv('CALLCENTER_MAX_RETRIES', '3'))
    batch_size: int = int(os.getenv('CALLCENTER_BATCH_SIZE', '500'))  # Tăng từ 200 lên 500
    default_days_back: int = int(os.getenv('CALLCENTER_DEFAULT_DAYS_BACK', '30'))
    
    # Timezone
    timezone: str = os.getenv('TIMEZONE', 'Asia/Ho_Chi_Minh')
    
    # Request timeout (seconds)
    request_timeout: int = int(os.getenv('PBX_REQUEST_TIMEOUT', '60'))


# Global config instance
config = CallCenterConfig()
