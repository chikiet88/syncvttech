#!/usr/bin/env python3
"""
VTTech Database Schema
Khởi tạo SQLite database với schema tối ưu cho phân tích
"""

import sqlite3
from pathlib import Path
from datetime import datetime

# Database path
DB_PATH = Path(__file__).parent / "vttech.db"

def get_connection():
    """Lấy connection đến database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Trả về dict-like rows
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_database():
    """Khởi tạo database schema"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # ============== MASTER TABLES ==============
    
    # Bảng chi nhánh
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT,
            city_id INTEGER,
            district_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng dịch vụ
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT NOT NULL,
            group_id INTEGER,
            price REAL DEFAULT 0,
            duration INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng nhóm dịch vụ
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_groups (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng nhân viên
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT NOT NULL,
            branch_id INTEGER,
            position TEXT,
            phone TEXT,
            email TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
    """)
    
    # Bảng users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            branch_id INTEGER,
            role TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
    """)
    
    # Bảng nguồn khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_sources (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bảng thành phố
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cities (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT
        )
    """)
    
    # Bảng quận/huyện
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS districts (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            city_id INTEGER,
            FOREIGN KEY (city_id) REFERENCES cities(id)
        )
    """)
    
    # Bảng phường/xã
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS wards (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            district_id INTEGER,
            FOREIGN KEY (district_id) REFERENCES districts(id)
        )
    """)
    
    # ============== FACT TABLES ==============
    
    # Bảng doanh thu hàng ngày (FACT TABLE chính)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_revenue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            branch_id INTEGER NOT NULL,
            branch_name TEXT,
            
            -- Doanh thu
            paid REAL DEFAULT 0,              -- Tổng doanh thu
            paid_new REAL DEFAULT 0,          -- Doanh thu khách mới
            raise_amount REAL DEFAULT 0,      -- Doanh thu nâng cấp
            
            -- Số lượng
            num_customers INTEGER DEFAULT 0,   -- Số khách đã thanh toán
            num_appointments INTEGER DEFAULT 0,-- Số lịch hẹn
            num_checked_in INTEGER DEFAULT 0,  -- Số đã check-in
            
            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(date, branch_id),
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
    """)
    
    # Bảng khách hàng mới hàng ngày
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            customer_id INTEGER,
            branch_id INTEGER,
            
            -- Thông tin khách
            customer_name TEXT,
            phone TEXT,
            email TEXT,
            gender INTEGER,
            birthday DATE,
            
            -- Nguồn và phân loại
            source_id INTEGER,
            membership_id INTEGER,
            
            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(date, customer_id),
            FOREIGN KEY (branch_id) REFERENCES branches(id),
            FOREIGN KEY (source_id) REFERENCES customer_sources(id)
        )
    """)
    
    # Bảng log crawl
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crawl_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crawl_date DATE NOT NULL,
            crawl_type TEXT NOT NULL,  -- 'revenue', 'customers', 'master'
            status TEXT NOT NULL,       -- 'success', 'failed', 'partial'
            records_count INTEGER DEFAULT 0,
            error_message TEXT,
            duration_seconds REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ============== INDEXES ==============
    
    # Index cho query nhanh
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_revenue_date ON daily_revenue(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_revenue_branch ON daily_revenue(branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_revenue_date_branch ON daily_revenue(date, branch_id)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_customers_date ON daily_customers(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_customers_branch ON daily_customers(branch_id)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_services_group ON services(group_id)")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_crawl_logs_date ON crawl_logs(crawl_date)")
    
    # ============== VIEWS ==============
    
    # View tổng hợp doanh thu theo ngày
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_daily_summary AS
        SELECT 
            date,
            COUNT(DISTINCT branch_id) as branch_count,
            SUM(paid) as total_paid,
            SUM(paid_new) as total_paid_new,
            SUM(raise_amount) as total_raise,
            SUM(num_customers) as total_customers,
            SUM(num_appointments) as total_appointments,
            SUM(num_checked_in) as total_checked_in
        FROM daily_revenue
        GROUP BY date
        ORDER BY date DESC
    """)
    
    # View tổng hợp doanh thu theo tháng
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_monthly_summary AS
        SELECT 
            strftime('%Y-%m', date) as month,
            COUNT(DISTINCT date) as days_count,
            COUNT(DISTINCT branch_id) as branch_count,
            SUM(paid) as total_paid,
            SUM(paid_new) as total_paid_new,
            SUM(num_customers) as total_customers,
            AVG(paid) as avg_daily_revenue
        FROM daily_revenue
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month DESC
    """)
    
    # View top chi nhánh
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_branch_performance AS
        SELECT 
            branch_id,
            branch_name,
            COUNT(DISTINCT date) as days_active,
            SUM(paid) as total_paid,
            AVG(paid) as avg_daily_paid,
            SUM(num_customers) as total_customers
        FROM daily_revenue
        GROUP BY branch_id, branch_name
        ORDER BY total_paid DESC
    """)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database created: {DB_PATH}")
    return DB_PATH


def get_table_info():
    """Lấy thông tin các bảng"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    info = {}
    for table in tables:
        table_name = table['name']
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        count = cursor.fetchone()['count']
        info[table_name] = count
    
    conn.close()
    return info


if __name__ == "__main__":
    print("🚀 Initializing VTTech Database...")
    init_database()
    
    print("\n📊 Table Info:")
    info = get_table_info()
    for table, count in info.items():
        print(f"  - {table}: {count} records")
