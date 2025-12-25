#!/usr/bin/env python3
"""
Call Center Database Schema
Khởi tạo SQLite database cho Call Center Records
"""

import sqlite3
from pathlib import Path
from datetime import datetime

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "callcenter.db"


def get_connection():
    """Lấy connection đến database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_callcenter_database():
    """Khởi tạo database schema cho Call Center"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Bảng Call Center Records - lưu trữ CDR
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            
            -- Thông tin cuộc gọi
            caller_id TEXT,
            caller_name TEXT,
            destination TEXT,
            direction TEXT,
            
            -- Thời gian
            duration INTEGER DEFAULT 0,
            billsec INTEGER DEFAULT 0,
            start_time DATETIME,
            answer_time DATETIME,
            end_time DATETIME,
            
            -- Trạng thái
            disposition TEXT,
            
            -- File ghi âm
            recording_path TEXT,
            
            -- Metadata
            raw_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng Sync Logs - theo dõi quá trình sync
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            
            -- Loại sync
            sync_type TEXT NOT NULL,
            
            -- Trạng thái
            status TEXT NOT NULL DEFAULT 'running',
            
            -- Thời gian
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            date_from DATE NOT NULL,
            date_to DATE NOT NULL,
            
            -- Thống kê
            total_records INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            
            -- Retry
            retry_count INTEGER DEFAULT 0,
            
            -- Error
            error_message TEXT,
            failed_items TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Indexes cho performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_uuid ON callcenter_records(uuid)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_start_time ON callcenter_records(start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_caller_id ON callcenter_records(caller_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_destination ON callcenter_records(destination)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_direction ON callcenter_records(direction)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_disposition ON callcenter_records(disposition)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON callcenter_sync_logs(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON callcenter_sync_logs(sync_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON callcenter_sync_logs(date_from, date_to)")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database initialized at: {DB_PATH}")
    return True


def reset_database():
    """Reset database - XÓA TẤT CẢ DATA"""
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"🗑️ Database deleted: {DB_PATH}")
    init_callcenter_database()


if __name__ == "__main__":
    init_callcenter_database()
