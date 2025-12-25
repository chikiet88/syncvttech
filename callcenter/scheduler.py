#!/usr/bin/env python3
"""
Call Center Scheduler
Lập lịch chạy các job đồng bộ CDR
"""

import logging
import signal
import sys
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from .config import config
from .sync_jobs import sync_daily, sync_retry, sync_missing_check

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('callcenter.scheduler')


def create_scheduler() -> BlockingScheduler:
    """Tạo và cấu hình scheduler"""
    
    scheduler = BlockingScheduler(
        timezone=config.timezone,
        job_defaults={
            'coalesce': True,
            'max_instances': 1,
            'misfire_grace_time': 300  # 5 minutes
        }
    )
    
    if not config.sync_enabled:
        logger.warning("⚠️ Call Center sync is disabled")
        return scheduler
    
    # Job 1: Daily Sync - chạy lúc 2:00 AM
    scheduler.add_job(
        sync_daily,
        trigger=CronTrigger(
            hour=config.daily_sync_hour,
            minute=config.daily_sync_minute,
            timezone=config.timezone
        ),
        id='callcenter_daily_sync',
        name='Call Center Daily Sync',
        replace_existing=True
    )
    logger.info(f"📅 Added daily sync job: {config.daily_sync_hour}:{config.daily_sync_minute:02d}")
    
    # Job 2: Retry Job - chạy mỗi 15 phút
    scheduler.add_job(
        sync_retry,
        trigger=IntervalTrigger(
            minutes=config.retry_interval_minutes,
            timezone=config.timezone
        ),
        id='callcenter_retry_sync',
        name='Call Center Retry Sync',
        replace_existing=True
    )
    logger.info(f"🔄 Added retry job: every {config.retry_interval_minutes} minutes")
    
    # Job 3: Missing Check - chạy lúc 3:00 AM
    scheduler.add_job(
        lambda: sync_missing_check(days_back=3),
        trigger=CronTrigger(
            hour=config.missing_check_hour,
            minute=0,
            timezone=config.timezone
        ),
        id='callcenter_missing_check',
        name='Call Center Missing Check',
        replace_existing=True
    )
    logger.info(f"🔍 Added missing check job: {config.missing_check_hour}:00")
    
    return scheduler


def run_scheduler():
    """Chạy scheduler"""
    logger.info("🚀 Starting Call Center Scheduler...")
    
    scheduler = create_scheduler()
    
    # Graceful shutdown
    def shutdown(signum, frame):
        logger.info("⏹️ Shutting down scheduler...")
        scheduler.shutdown(wait=False)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    try:
        logger.info("✅ Scheduler started. Press Ctrl+C to stop.")
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("⏹️ Scheduler stopped")


if __name__ == '__main__':
    run_scheduler()
