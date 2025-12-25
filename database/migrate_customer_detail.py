#!/usr/bin/env python3
"""
Migration: Thêm các bảng customer detail
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "vttech.db"

def migrate():
    """Thêm các bảng customer detail"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Bảng khách hàng chính
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT,
            phone TEXT,
            email TEXT,
            gender INTEGER,
            birthday DATE,
            branch_id INTEGER,
            source_id INTEGER,
            membership_id INTEGER,
            address TEXT,
            city_id INTEGER,
            district_id INTEGER,
            ward_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branches(id),
            FOREIGN KEY (source_id) REFERENCES customer_sources(id)
        )
    """)
    
    # Bảng dịch vụ của khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            service_id INTEGER,
            service_name TEXT,
            quantity INTEGER DEFAULT 1,
            price REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            total REAL DEFAULT 0,
            created_at DATETIME,
            status TEXT,
            UNIQUE(customer_id, service_id, created_at),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    """)
    
    # Bảng điều trị của khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            treatment_id INTEGER,
            service_name TEXT,
            employee_name TEXT,
            treatment_date DATETIME,
            status TEXT,
            note TEXT,
            UNIQUE(customer_id, treatment_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    # Bảng thanh toán của khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            payment_id INTEGER,
            amount REAL DEFAULT 0,
            payment_date DATETIME,
            payment_method TEXT,
            note TEXT,
            UNIQUE(customer_id, payment_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    # Bảng lịch hẹn của khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            appointment_id INTEGER,
            appointment_date DATETIME,
            service_name TEXT,
            branch_id INTEGER,
            status TEXT,
            note TEXT,
            UNIQUE(customer_id, appointment_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
    """)
    
    # Bảng lịch sử chăm sóc khách hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            history_id INTEGER,
            action_type TEXT,
            action_date DATETIME,
            employee_name TEXT,
            note TEXT,
            UNIQUE(customer_id, history_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_services_customer ON customer_services(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_treatments_customer ON customer_treatments(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_appointments_customer ON customer_appointments(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_history_customer ON customer_history(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)")
    
    conn.commit()
    conn.close()
    
    print("✅ Migration completed: Added customer detail tables")
    print("   - customers")
    print("   - customer_services")
    print("   - customer_treatments")
    print("   - customer_payments")
    print("   - customer_appointments")
    print("   - customer_history")

if __name__ == "__main__":
    migrate()
