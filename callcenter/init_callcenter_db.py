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
    
    # Bảng Call Center Records - lưu trữ CDR từ PBX
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            
            -- Thông tin cuộc gọi
            direction TEXT,                    -- inbound/outbound
            caller_id_number TEXT,             -- Extension nội bộ (1029)
            outbound_caller_id_number TEXT,    -- SĐT đầu ra (842871206029)
            destination_number TEXT,           -- SĐT đích (0963000697)
            
            -- Thời gian (epoch)
            start_epoch INTEGER,
            end_epoch INTEGER,
            answer_epoch INTEGER,
            
            -- Duration
            duration INTEGER DEFAULT 0,        -- Tổng thời gian
            billsec INTEGER DEFAULT 0,         -- Thời gian tính phí (đã nghe)
            
            -- Trạng thái
            sip_hangup_disposition TEXT,       -- by_callee, by_caller
            call_status TEXT,                  -- CANCELED, ANSWERED, NO_ANSWER, BUSY
            
            -- File ghi âm
            record_path TEXT,
            
            -- Legacy fields (for backward compatibility)
            caller_id TEXT,
            caller_name TEXT,
            destination TEXT,
            start_time DATETIME,
            answer_time DATETIME,
            end_time DATETIME,
            disposition TEXT,
            recording_path TEXT,
            
            -- Metadata
            raw_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng Nhân viên Call Center từ VTTech
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vttech_id INTEGER UNIQUE,          -- ID từ VTTech
            
            -- Thông tin nhân viên
            name TEXT,
            code TEXT,
            email TEXT,
            phone TEXT,
            extension TEXT,                     -- Số Extension (1029, 1030,...)
            
            -- Phân loại
            group_id INTEGER,
            group_name TEXT,
            department TEXT,
            position TEXT,
            
            -- Trạng thái
            is_active INTEGER DEFAULT 1,
            
            -- Metadata
            raw_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng Ticket Groups từ VTTech
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_ticket_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vttech_id INTEGER UNIQUE,
            name TEXT,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            raw_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng Extensions từ TicketExtensionList
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callcenter_extensions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vttech_id INTEGER UNIQUE,          -- ID từ VTTech
            extension TEXT UNIQUE NOT NULL,     -- Số Extension (1000, 1001,...)
            password TEXT,                      -- Password của extension
            is_active INTEGER DEFAULT 1,
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
    
    # View thống kê theo Extension/Nhân viên
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_employee_call_stats AS
        SELECT 
            e.id as employee_id,
            e.name as employee_name,
            e.extension,
            e.group_name,
            COUNT(r.id) as total_calls,
            SUM(CASE WHEN r.direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls,
            SUM(CASE WHEN r.direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
            SUM(CASE WHEN r.call_status = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
            SUM(CASE WHEN r.call_status = 'CANCELED' THEN 1 ELSE 0 END) as canceled_calls,
            SUM(CASE WHEN r.call_status = 'NO_ANSWER' THEN 1 ELSE 0 END) as no_answer_calls,
            SUM(CASE WHEN r.call_status = 'BUSY' THEN 1 ELSE 0 END) as busy_calls,
            SUM(r.duration) as total_duration,
            SUM(r.billsec) as total_billsec,
            AVG(r.billsec) as avg_billsec
        FROM callcenter_employees e
        LEFT JOIN callcenter_records r ON e.extension = r.caller_id_number
        WHERE e.is_active = 1
        GROUP BY e.id, e.extension
    """)
    
    # Indexes cho performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_uuid ON callcenter_records(uuid)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_start_epoch ON callcenter_records(start_epoch)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_caller_id_number ON callcenter_records(caller_id_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_destination_number ON callcenter_records(destination_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_direction ON callcenter_records(direction)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_call_status ON callcenter_records(call_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_start_time ON callcenter_records(start_time)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_employees_extension ON callcenter_employees(extension)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_employees_vttech_id ON callcenter_employees(vttech_id)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_extensions_extension ON callcenter_extensions(extension)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_extensions_vttech_id ON callcenter_extensions(vttech_id)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON callcenter_sync_logs(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON callcenter_sync_logs(sync_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON callcenter_sync_logs(date_from, date_to)")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Call Center Database initialized at: {DB_PATH}")
    return True


def migrate_database():
    """Migration để thêm columns mới nếu cần"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Kiểm tra và thêm columns mới vào callcenter_records
    new_columns = [
        ('caller_id_number', 'TEXT'),
        ('outbound_caller_id_number', 'TEXT'),
        ('destination_number', 'TEXT'),
        ('start_epoch', 'INTEGER'),
        ('end_epoch', 'INTEGER'),
        ('answer_epoch', 'INTEGER'),
        ('sip_hangup_disposition', 'TEXT'),
        ('call_status', 'TEXT'),
        ('record_path', 'TEXT'),
    ]
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(callcenter_records)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE callcenter_records ADD COLUMN {col_name} {col_type}")
                print(f"  ✅ Added column: {col_name}")
            except Exception as e:
                print(f"  ⚠️ Column {col_name} error: {e}")
    
    conn.commit()
    conn.close()
    print("✅ Migration completed")


def reset_database():
    """Reset database - XÓA TẤT CẢ DATA"""
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"🗑️ Database deleted: {DB_PATH}")
    init_callcenter_database()


if __name__ == "__main__":
    init_callcenter_database()
    migrate_database()
