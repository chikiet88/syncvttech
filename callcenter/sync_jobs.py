#!/usr/bin/env python3
"""
Call Center Sync Jobs
Các job để đồng bộ dữ liệu CDR từ PBX API
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional

from .config import config
from .repository import repo
from .api_client import api_client
from .init_callcenter_db import init_callcenter_database

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('callcenter.sync')


class CallCenterSyncJob:
    """Job đồng bộ CDR từ PBX API"""
    
    def __init__(self, sync_type: str = 'daily'):
        self.sync_type = sync_type
        self.config = config
        self.repo = repo
        self.api = api_client
    
    async def run(self, date_from: date = None, date_to: date = None) -> Dict:
        """
        Chạy sync job
        
        Args:
            date_from: Ngày bắt đầu (default: hôm qua)
            date_to: Ngày kết thúc (default: hôm qua)
            
        Returns:
            Dict với kết quả sync
        """
        # Ensure database exists
        init_callcenter_database()
        
        # Default: yesterday
        if date_from is None:
            yesterday = date.today() - timedelta(days=1)
            date_from = yesterday
            date_to = yesterday
        
        if date_to is None:
            date_to = date_from
        
        logger.info(f"🚀 Starting sync: {date_from} -> {date_to}, type={self.sync_type}")
        
        # Create sync log
        sync_log_id = self.repo.create_sync_log(self.sync_type, date_from, date_to)
        
        success_count = 0
        failed_count = 0
        failed_items = []
        total_records = 0
        
        # Batch callback to save records immediately
        def save_batch(records):
            nonlocal success_count, failed_count, total_records
            batch_result = self.repo.upsert_records_batch(records)
            success_count += batch_result['success']
            failed_count += batch_result['failed']
            total_records += len(records)
            
            # Update sync log progress
            self.repo.update_sync_log(
                sync_log_id,
                status='running',
                total_records=total_records,
                success_count=success_count,
                failed_count=failed_count
            )
        
        try:
            # Fetch records from PBX API with batch callback
            records = await self.api.fetch_all_cdr_records(
                date_from, date_to, 
                batch_callback=save_batch
            )
            
            logger.info(f"📥 Total processed: {total_records} records")
            
            if total_records == 0:
                logger.warning("⚠️ No records found")
                self.repo.update_sync_log(
                    sync_log_id, 
                    status='completed',
                    total_records=0,
                    success_count=0,
                    failed_count=0
                )
                return {
                    'status': 'completed',
                    'total': 0,
                    'success': 0,
                    'failed': 0
                }
            
            # Determine status
            if failed_count == 0:
                status = 'completed'
            elif success_count > 0:
                status = 'partial'
            else:
                status = 'failed'
            
            # Update sync log
            self.repo.update_sync_log(
                sync_log_id,
                status=status,
                total_records=total_records,
                success_count=success_count,
                failed_count=failed_count,
                failed_items=failed_items if failed_items else None
            )
            
            logger.info(f"✅ Sync completed: {success_count}/{total_records} success, {failed_count} failed")
            
            return {
                'status': status,
                'total': total_records,
                'success': success_count,
                'failed': failed_count,
                'sync_log_id': sync_log_id
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Sync failed: {error_msg}")
            
            # Mark sync as failed
            self.repo.update_sync_log(
                sync_log_id,
                status='failed',
                total_records=0,
                success_count=success_count,
                failed_count=failed_count,
                error_message=error_msg
            )
            
            return {
                'status': 'failed',
                'error': error_msg,
                'sync_log_id': sync_log_id
            }


class CallCenterRetryJob:
    """Job retry các sync đã thất bại"""
    
    def __init__(self):
        self.config = config
        self.repo = repo
    
    async def run(self) -> Dict:
        """Chạy retry job"""
        logger.info("🔄 Starting retry job")
        
        # Get failed sync logs
        failed_logs = self.repo.get_failed_sync_logs(
            max_retries=self.config.max_retries,
            limit=3
        )
        
        if not failed_logs:
            logger.info("✅ No failed syncs to retry")
            return {'status': 'completed', 'retried': 0}
        
        retried = 0
        
        for log in failed_logs:
            logger.info(f"🔄 Retrying sync log {log['id']}: {log['date_from']} -> {log['date_to']}")
            
            # Increment retry count
            self.repo.increment_retry_count(log['id'])
            
            # Re-run sync
            sync_job = CallCenterSyncJob(sync_type='retry')
            
            date_from = datetime.fromisoformat(log['date_from']).date()
            date_to = datetime.fromisoformat(log['date_to']).date()
            
            await sync_job.run(date_from=date_from, date_to=date_to)
            retried += 1
        
        logger.info(f"✅ Retry job completed: {retried} syncs retried")
        return {'status': 'completed', 'retried': retried}


class CallCenterMissingCheckJob:
    """Job kiểm tra và bổ sung records bị thiếu"""
    
    def __init__(self):
        self.config = config
        self.repo = repo
        self.api = api_client
    
    async def run(self, days_back: int = 3) -> Dict:
        """
        Kiểm tra và sync missing records
        
        Args:
            days_back: Số ngày kiểm tra lại
        """
        logger.info(f"🔍 Starting missing check for {days_back} days")
        
        total_missing = 0
        total_synced = 0
        
        for day_offset in range(days_back):
            check_date = date.today() - timedelta(days=day_offset + 1)
            
            logger.info(f"📅 Checking date: {check_date}")
            
            # Get UUIDs from PBX
            pbx_records = await self.api.fetch_all_cdr_records(check_date, check_date)
            pbx_uuids = {r['uuid'] for r in pbx_records}
            
            # Get UUIDs from database
            db_uuids = self.repo.get_uuids_by_date(check_date)
            
            # Find missing
            missing_uuids = pbx_uuids - db_uuids
            
            if missing_uuids:
                logger.warning(f"⚠️ Found {len(missing_uuids)} missing records for {check_date}")
                total_missing += len(missing_uuids)
                
                # Sync missing records
                missing_records = [r for r in pbx_records if r['uuid'] in missing_uuids]
                result = self.repo.upsert_records_batch(missing_records)
                total_synced += result['success']
                
                logger.info(f"✅ Synced {result['success']} missing records")
            else:
                logger.info(f"✅ No missing records for {check_date}")
        
        logger.info(f"✅ Missing check completed: {total_missing} missing, {total_synced} synced")
        return {
            'status': 'completed',
            'total_missing': total_missing,
            'total_synced': total_synced
        }


# Convenience functions
async def run_daily_sync() -> Dict:
    """Chạy daily sync (ngày hôm qua)"""
    job = CallCenterSyncJob(sync_type='daily')
    return await job.run()


async def run_manual_sync(date_from: date, date_to: date) -> Dict:
    """Chạy manual sync cho khoảng thời gian cụ thể"""
    job = CallCenterSyncJob(sync_type='manual')
    return await job.run(date_from, date_to)


async def run_retry_sync() -> Dict:
    """Chạy retry job"""
    job = CallCenterRetryJob()
    return await job.run()


async def run_missing_check(days_back: int = 3) -> Dict:
    """Chạy missing check"""
    job = CallCenterMissingCheckJob()
    return await job.run(days_back)


# Sync wrappers for cron usage
def sync_daily():
    """Sync wrapper cho daily sync"""
    return asyncio.run(run_daily_sync())


def sync_manual(date_from: date, date_to: date):
    """Sync wrapper cho manual sync"""
    return asyncio.run(run_manual_sync(date_from, date_to))


def sync_retry():
    """Sync wrapper cho retry"""
    return asyncio.run(run_retry_sync())


def sync_missing_check(days_back: int = 3):
    """Sync wrapper cho missing check"""
    return asyncio.run(run_missing_check(days_back))
