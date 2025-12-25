#!/usr/bin/env python3
"""
Call Center Sync Module
"""

from .config import config, CallCenterConfig
from .init_callcenter_db import init_callcenter_database, get_connection, DB_PATH
from .repository import CallCenterRepository, repo

# Optional imports - may fail if dependencies not installed
try:
    from .api_client import PBXApiClient, api_client, fetch_cdr_sync
except ImportError:
    PBXApiClient = None
    api_client = None
    fetch_cdr_sync = None

try:
    from .sync_jobs import (
        CallCenterSyncJob,
        CallCenterRetryJob,
        CallCenterMissingCheckJob,
        run_daily_sync,
        run_manual_sync,
        run_retry_sync,
        run_missing_check,
        sync_daily,
        sync_manual,
        sync_retry,
        sync_missing_check
    )
except ImportError:
    CallCenterSyncJob = None
    run_daily_sync = None
    run_manual_sync = None

try:
    from .scheduler import create_scheduler, run_scheduler
except ImportError:
    create_scheduler = None
    run_scheduler = None

__all__ = [
    # Config
    'config',
    'CallCenterConfig',
    
    # Database
    'init_callcenter_database',
    'get_connection',
    'DB_PATH',
    
    # Repository
    'CallCenterRepository',
    'repo',
    
    # API Client
    'PBXApiClient',
    'api_client',
    'fetch_cdr_sync',
    
    # Jobs
    'CallCenterSyncJob',
    'CallCenterRetryJob', 
    'CallCenterMissingCheckJob',
    
    # Async functions
    'run_daily_sync',
    'run_manual_sync',
    'run_retry_sync',
    'run_missing_check',
    
    # Sync functions (for cron)
    'sync_daily',
    'sync_manual',
    'sync_retry',
    'sync_missing_check',
    
    # Scheduler
    'create_scheduler',
    'run_scheduler',
]
