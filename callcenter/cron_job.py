#!/usr/bin/env python3
"""
Call Center Cron Job Script
Script chạy bởi cron để đồng bộ dữ liệu CDR
"""

import sys
import os
import logging
from datetime import date, datetime, timedelta
from pathlib import Path

# Add parent directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir.parent))

# Setup logging to file
log_dir = script_dir.parent / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"callcenter_sync_{datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('callcenter.cron')


def run_cron_job(job_type: str = 'daily'):
    """
    Chạy cron job theo loại
    
    Args:
        job_type: 'daily', 'retry', 'missing_check'
    """
    from callcenter import (
        init_callcenter_database,
        sync_daily,
        sync_retry,
        sync_missing_check
    )
    
    logger.info(f"{'='*60}")
    logger.info(f"🚀 Starting cron job: {job_type}")
    logger.info(f"Time: {datetime.now().isoformat()}")
    logger.info(f"{'='*60}")
    
    try:
        # Ensure database exists
        init_callcenter_database()
        
        if job_type == 'daily':
            result = sync_daily()
        elif job_type == 'retry':
            result = sync_retry()
        elif job_type == 'missing_check':
            result = sync_missing_check(days_back=3)
        else:
            logger.error(f"Unknown job type: {job_type}")
            return False
        
        logger.info(f"✅ Job completed: {result}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Job failed: {e}", exc_info=True)
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Call Center Cron Job')
    parser.add_argument(
        'job_type',
        choices=['daily', 'retry', 'missing_check'],
        default='daily',
        nargs='?',
        help='Job type to run (default: daily)'
    )
    
    args = parser.parse_args()
    
    success = run_cron_job(args.job_type)
    sys.exit(0 if success else 1)
