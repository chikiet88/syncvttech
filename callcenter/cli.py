#!/usr/bin/env python3
"""
Call Center Sync CLI
Command line interface để quản lý sync CDR
"""

import argparse
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from callcenter import (
    init_callcenter_database,
    sync_daily,
    sync_manual,
    sync_retry,
    sync_missing_check,
    run_scheduler,
    config,
    repo
)


def cmd_init(args):
    """Khởi tạo database"""
    print("🔧 Initializing Call Center database...")
    init_callcenter_database()
    print("✅ Done!")


def cmd_sync(args):
    """Chạy sync CDR"""
    if args.date:
        # Parse date
        try:
            sync_date = datetime.strptime(args.date, '%Y-%m-%d').date()
        except ValueError:
            print(f"❌ Invalid date format: {args.date}. Use YYYY-MM-DD")
            return
        
        date_from = sync_date
        date_to = sync_date
        
        if args.to_date:
            try:
                date_to = datetime.strptime(args.to_date, '%Y-%m-%d').date()
            except ValueError:
                print(f"❌ Invalid date format: {args.to_date}. Use YYYY-MM-DD")
                return
        
        print(f"🚀 Running manual sync: {date_from} -> {date_to}")
        result = sync_manual(date_from, date_to)
    else:
        print("🚀 Running daily sync (yesterday)")
        result = sync_daily()
    
    print(f"\n📊 Result: {result}")


def cmd_retry(args):
    """Chạy retry job"""
    print("🔄 Running retry job...")
    result = sync_retry()
    print(f"\n📊 Result: {result}")


def cmd_missing_check(args):
    """Chạy missing check"""
    days = args.days or 3
    print(f"🔍 Running missing check for {days} days...")
    result = sync_missing_check(days_back=days)
    print(f"\n📊 Result: {result}")


def cmd_status(args):
    """Hiển thị trạng thái"""
    print("\n" + "="*60)
    print("📊 CALL CENTER SYNC STATUS")
    print("="*60)
    
    # Config
    print("\n🔧 Configuration:")
    print(f"   PBX API URL: {config.pbx_api_url}")
    print(f"   PBX Domain: {config.pbx_domain}")
    print(f"   Sync Enabled: {config.sync_enabled}")
    print(f"   Daily Sync Time: {config.daily_sync_hour}:{config.daily_sync_minute:02d}")
    print(f"   Database: {config.db_path}")
    
    # Stats
    try:
        stats = repo.get_records_stats()
        print(f"\n📈 Records Statistics:")
        print(f"   Total Records: {stats['total']:,}")
        print(f"   Date Range: {stats['min_date']} -> {stats['max_date']}")
        print(f"   By Direction: {stats['by_direction']}")
        print(f"   By Disposition: {stats['by_disposition']}")
    except Exception as e:
        print(f"\n⚠️ Cannot get stats: {e}")
    
    # Last sync
    try:
        last_sync = repo.get_last_sync_log()
        if last_sync:
            print(f"\n🕐 Last Sync:")
            print(f"   ID: {last_sync['id']}")
            print(f"   Type: {last_sync['sync_type']}")
            print(f"   Status: {last_sync['status']}")
            print(f"   Date Range: {last_sync['date_from']} -> {last_sync['date_to']}")
            print(f"   Records: {last_sync['success_count']}/{last_sync['total_records']}")
            print(f"   Time: {last_sync['start_time']}")
    except Exception as e:
        print(f"\n⚠️ Cannot get last sync: {e}")
    
    print("\n" + "="*60)


def cmd_logs(args):
    """Hiển thị sync logs"""
    limit = args.limit or 10
    logs = repo.get_sync_logs(limit=limit)
    
    print(f"\n📋 Recent Sync Logs (last {limit}):")
    print("-"*100)
    print(f"{'ID':>4} | {'Type':<10} | {'Status':<10} | {'Date Range':<25} | {'Records':<15} | {'Time':<20}")
    print("-"*100)
    
    for log in logs:
        records_str = f"{log['success_count']}/{log['total_records']}"
        date_range = f"{log['date_from']} -> {log['date_to']}"
        print(f"{log['id']:>4} | {log['sync_type']:<10} | {log['status']:<10} | {date_range:<25} | {records_str:<15} | {log['start_time'][:19]}")
    
    print("-"*100)


def cmd_scheduler(args):
    """Chạy scheduler"""
    print("🚀 Starting scheduler...")
    run_scheduler()


def main():
    parser = argparse.ArgumentParser(
        description='Call Center Sync CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s init                    # Initialize database
  %(prog)s sync                    # Sync yesterday's data
  %(prog)s sync --date 2024-12-20  # Sync specific date
  %(prog)s sync --date 2024-12-20 --to-date 2024-12-23  # Sync date range
  %(prog)s retry                   # Retry failed syncs
  %(prog)s missing-check           # Check for missing records
  %(prog)s missing-check --days 7  # Check last 7 days
  %(prog)s status                  # Show status
  %(prog)s logs                    # Show sync logs
  %(prog)s scheduler               # Run scheduler daemon
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # init
    init_parser = subparsers.add_parser('init', help='Initialize database')
    init_parser.set_defaults(func=cmd_init)
    
    # sync
    sync_parser = subparsers.add_parser('sync', help='Sync CDR records')
    sync_parser.add_argument('--date', '-d', help='Date to sync (YYYY-MM-DD)')
    sync_parser.add_argument('--to-date', '-t', help='End date for range sync (YYYY-MM-DD)')
    sync_parser.set_defaults(func=cmd_sync)
    
    # retry
    retry_parser = subparsers.add_parser('retry', help='Retry failed syncs')
    retry_parser.set_defaults(func=cmd_retry)
    
    # missing-check
    missing_parser = subparsers.add_parser('missing-check', help='Check for missing records')
    missing_parser.add_argument('--days', '-d', type=int, help='Days to check back (default: 3)')
    missing_parser.set_defaults(func=cmd_missing_check)
    
    # status
    status_parser = subparsers.add_parser('status', help='Show sync status')
    status_parser.set_defaults(func=cmd_status)
    
    # logs
    logs_parser = subparsers.add_parser('logs', help='Show sync logs')
    logs_parser.add_argument('--limit', '-l', type=int, help='Number of logs to show (default: 10)')
    logs_parser.set_defaults(func=cmd_logs)
    
    # scheduler
    scheduler_parser = subparsers.add_parser('scheduler', help='Run scheduler daemon')
    scheduler_parser.set_defaults(func=cmd_scheduler)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        return
    
    args.func(args)


if __name__ == '__main__':
    main()
