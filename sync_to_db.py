#!/usr/bin/env python3
"""
VTTech Full Data Sync với Database Integration
Lấy toàn bộ dữ liệu từ hệ thống VTTech TMTaza và LƯU TRỰC TIẾP vào SQLite

Author: Auto-generated  
Date: 2025-12-25

Features:
- Lấy tất cả master data (branches, services, employees, users, etc.)
- Lấy dữ liệu khách hàng với đầy đủ trường
- Lấy lịch hẹn (appointments)
- Lấy doanh thu (revenue)
- Lưu trực tiếp vào vttech.db

Usage:
    python3 sync_to_db.py                    # Sync tất cả và lưu vào DB
    python3 sync_to_db.py --master-only      # Chỉ master data  
    python3 sync_to_db.py --daily            # Dữ liệu hôm qua
    python3 sync_to_db.py --date 2025-12-25  # Ngày cụ thể
    python3 sync_to_db.py --date-from 2025-12-01 --date-to 2025-12-25  # Khoảng ngày
"""

import requests
import json
import base64
import zlib
import re
import os
import sys
import argparse
import logging
import time
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

# Thư mục
BASE_DIR = Path(__file__).parent
SYNC_DIR = BASE_DIR / "data_sync"
LOG_DIR = BASE_DIR / "logs"
DB_PATH = BASE_DIR / "database" / "vttech.db"

# Tạo thư mục
SYNC_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)
for subdir in ["master", "customers", "appointments", "revenue", "treatments", "inventory", "services", "employees", "warehouse"]:
    (SYNC_DIR / subdir).mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"sync_db_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============== DATABASE HELPER ==============
class DatabaseHelper:
    """Helper class để lưu dữ liệu vào SQLite"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._ensure_tables()
    
    def get_conn(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    
    def _ensure_tables(self):
        """Đảm bảo các bảng cần thiết tồn tại"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Tạo thêm các bảng mới nếu chưa có
        
        # Bảng appointments
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                customer_name TEXT,
                phone TEXT,
                branch_id INTEGER,
                branch_name TEXT,
                service_id INTEGER,
                service_name TEXT,
                employee_id INTEGER,
                employee_name TEXT,
                appointment_date DATETIME,
                status INTEGER DEFAULT 0,
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng customers 
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                gender INTEGER,
                birthday DATE,
                address TEXT,
                city_id INTEGER,
                district_id INTEGER,
                ward_id INTEGER,
                branch_id INTEGER,
                source_id INTEGER,
                membership_id INTEGER,
                total_spent REAL DEFAULT 0,
                total_debt REAL DEFAULT 0,
                point INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng treatments
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS treatments (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                customer_name TEXT,
                branch_id INTEGER,
                branch_name TEXT,
                service_id INTEGER,
                service_name TEXT,
                employee_id INTEGER,
                employee_name TEXT,
                treatment_date DATETIME,
                amount REAL DEFAULT 0,
                paid REAL DEFAULT 0,
                status INTEGER DEFAULT 0,
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            )
        """)
        
        # Bảng memberships
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memberships (
                id INTEGER PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                discount_percent REAL DEFAULT 0,
                min_spending REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng employee_groups
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employee_groups (
                id INTEGER PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng service_types
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_types (
                id INTEGER PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                parent_id INTEGER,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tạo indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_treatments_customer ON treatments(customer_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(treatment_date)")
        
        conn.commit()
        conn.close()
    
    def upsert_branches(self, branches: List[Dict]) -> int:
        """Insert or update branches"""
        conn = self.get_conn()
        count = 0
        try:
            for data in branches:
                conn.execute("""
                    INSERT OR REPLACE INTO branches (id, code, name, address, phone, email, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', data.get('ShortName', '')),
                    data.get('Name'),
                    data.get('Address', ''),
                    data.get('Phone', ''),
                    data.get('Email', ''),
                    1 if data.get('IsActive', True) else 0,
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} branches")
        except Exception as e:
            logger.error(f"  ❌ Error saving branches: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_services(self, services: List[Dict]) -> int:
        """Insert or update services"""
        conn = self.get_conn()
        count = 0
        try:
            for data in services:
                conn.execute("""
                    INSERT OR REPLACE INTO services (id, code, name, group_id, price, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    data.get('GroupID', data.get('Type')),
                    data.get('Price', 0),
                    1 if data.get('State', 1) == 1 else 0,
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} services")
        except Exception as e:
            logger.error(f"  ❌ Error saving services: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_service_groups(self, groups: List[Dict]) -> int:
        """Insert or update service groups"""
        conn = self.get_conn()
        count = 0
        try:
            for data in groups:
                conn.execute("""
                    INSERT OR REPLACE INTO service_groups (id, code, name, parent_id, is_active)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    data.get('ParentID'),
                    1
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} service groups")
        except Exception as e:
            logger.error(f"  ❌ Error saving service groups: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_employees(self, employees: List[Dict]) -> int:
        """Insert or update employees"""
        conn = self.get_conn()
        count = 0
        try:
            for data in employees:
                conn.execute("""
                    INSERT OR REPLACE INTO employees (id, code, name, branch_id, position, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    data.get('BranchID'),
                    data.get('Position', ''),
                    1 if data.get('State', 1) == 1 else 0,
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} employees")
        except Exception as e:
            logger.error(f"  ❌ Error saving employees: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_users(self, users: List[Dict]) -> int:
        """Insert or update users"""
        conn = self.get_conn()
        count = 0
        try:
            for data in users:
                conn.execute("""
                    INSERT OR REPLACE INTO users (id, username, full_name, email, phone, branch_id, role, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Username', data.get('Name', '')),
                    data.get('FullName', data.get('EmployeeName', data.get('Name', ''))),
                    data.get('Email', ''),
                    data.get('Phone', ''),
                    data.get('BranchID'),
                    data.get('RoleID', ''),
                    1
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} users")
        except Exception as e:
            logger.error(f"  ❌ Error saving users: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_customer_sources(self, sources: List[Dict]) -> int:
        """Insert or update customer sources"""
        conn = self.get_conn()
        count = 0
        try:
            for data in sources:
                conn.execute("""
                    INSERT OR REPLACE INTO customer_sources (id, code, name, parent_id, is_active)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    data.get('ParentID', data.get('SPID')),
                    1
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} customer sources")
        except Exception as e:
            logger.error(f"  ❌ Error saving customer sources: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_cities(self, cities: List[Dict]) -> int:
        """Insert or update cities"""
        conn = self.get_conn()
        count = 0
        try:
            for data in cities:
                conn.execute("""
                    INSERT OR REPLACE INTO cities (id, name, code)
                    VALUES (?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Name'),
                    data.get('Code', '')
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} cities")
        except Exception as e:
            logger.error(f"  ❌ Error saving cities: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_districts(self, districts: List[Dict]) -> int:
        """Insert or update districts"""
        conn = self.get_conn()
        count = 0
        try:
            for data in districts:
                conn.execute("""
                    INSERT OR REPLACE INTO districts (id, name, city_id)
                    VALUES (?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Name'),
                    data.get('CityID')
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} districts")
        except Exception as e:
            logger.error(f"  ❌ Error saving districts: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_wards(self, wards: List[Dict]) -> int:
        """Insert or update wards"""
        conn = self.get_conn()
        count = 0
        try:
            for data in wards:
                conn.execute("""
                    INSERT OR REPLACE INTO wards (id, name, district_id)
                    VALUES (?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Name'),
                    data.get('DistrictID')
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} wards")
        except Exception as e:
            logger.error(f"  ❌ Error saving wards: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_memberships(self, memberships: List[Dict]) -> int:
        """Insert or update memberships"""
        conn = self.get_conn()
        count = 0
        try:
            for data in memberships:
                conn.execute("""
                    INSERT OR REPLACE INTO memberships (id, code, name, discount_percent, min_spending, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    data.get('DiscountPercent', data.get('Discount', 0)),
                    data.get('MinSpending', 0),
                    1
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} memberships")
        except Exception as e:
            logger.error(f"  ❌ Error saving memberships: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_employee_groups(self, groups: List[Dict]) -> int:
        """Insert or update employee groups"""
        conn = self.get_conn()
        count = 0
        try:
            for data in groups:
                conn.execute("""
                    INSERT OR REPLACE INTO employee_groups (id, code, name, is_active)
                    VALUES (?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name'),
                    1
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} employee groups")
        except Exception as e:
            logger.error(f"  ❌ Error saving employee groups: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_daily_revenue(self, date: str, records: List[Dict]) -> int:
        """Insert or update daily revenue"""
        conn = self.get_conn()
        count = 0
        try:
            for data in records:
                conn.execute("""
                    INSERT OR REPLACE INTO daily_revenue 
                    (date, branch_id, branch_name, paid, paid_new, raise_amount, 
                     num_customers, num_appointments, num_checked_in, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    date,
                    data.get('BranchID'),
                    data.get('BranchName'),
                    data.get('Paid', 0),
                    data.get('PaidNew', 0),
                    data.get('Raise', 0),
                    data.get('PaidNumCust', 0),
                    data.get('App', 0),
                    data.get('AppChecked', 0),
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} revenue records for {date}")
        except Exception as e:
            logger.error(f"  ❌ Error saving revenue: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_customers(self, customers: List[Dict]) -> int:
        """Insert or update customers"""
        conn = self.get_conn()
        count = 0
        try:
            for data in customers:
                conn.execute("""
                    INSERT OR REPLACE INTO customers 
                    (id, code, name, phone, email, gender, birthday, address, 
                     city_id, district_id, ward_id, branch_id, source_id, 
                     membership_id, total_spent, total_debt, point, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('Code', ''),
                    data.get('Name', data.get('CustomerName', '')),
                    data.get('Phone', data.get('Mobile', '')),
                    data.get('Email', ''),
                    data.get('Gender', data.get('Sex', 0)),
                    data.get('Birthday', data.get('BirthDay')),
                    data.get('Address', ''),
                    data.get('CityID'),
                    data.get('DistrictID'),
                    data.get('WardID'),
                    data.get('BranchID'),
                    data.get('SourceID', data.get('CustomerSourceID')),
                    data.get('MembershipID'),
                    data.get('TotalSpent', data.get('TotalPaid', 0)),
                    data.get('TotalDebt', data.get('Debt', 0)),
                    data.get('Point', 0),
                    1,
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} customers")
        except Exception as e:
            logger.error(f"  ❌ Error saving customers: {e}")
        finally:
            conn.close()
        return count
    
    def upsert_appointments(self, appointments: List[Dict]) -> int:
        """Insert or update appointments"""
        conn = self.get_conn()
        count = 0
        try:
            for data in appointments:
                conn.execute("""
                    INSERT OR REPLACE INTO appointments 
                    (id, customer_id, customer_name, phone, branch_id, branch_name, 
                     service_id, service_name, employee_id, employee_name, 
                     appointment_date, status, note, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data.get('ID'),
                    data.get('CustomerID'),
                    data.get('CustomerName', data.get('Name', '')),
                    data.get('Phone', data.get('Mobile', '')),
                    data.get('BranchID'),
                    data.get('BranchName', ''),
                    data.get('ServiceID'),
                    data.get('ServiceName', ''),
                    data.get('EmployeeID', data.get('DoctorID')),
                    data.get('EmployeeName', data.get('DoctorName', '')),
                    data.get('AppointmentDate', data.get('DateApp', data.get('Date'))),
                    data.get('Status', 0),
                    data.get('Note', ''),
                    datetime.now().isoformat()
                ))
                count += 1
            conn.commit()
            logger.info(f"  💾 DB: Saved {count} appointments")
        except Exception as e:
            logger.error(f"  ❌ Error saving appointments: {e}")
        finally:
            conn.close()
        return count
    
    def log_crawl(self, crawl_date: str, crawl_type: str, status: str, 
                  records_count: int = 0, error_message: str = None, 
                  duration: float = None):
        """Log crawl history"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT INTO crawl_logs (crawl_date, crawl_type, status, records_count, error_message, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (crawl_date, crawl_type, status, records_count, error_message, duration))
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging crawl: {e}")
        finally:
            conn.close()
    
    def get_table_counts(self) -> Dict[str, int]:
        """Đếm số records trong các bảng"""
        conn = self.get_conn()
        counts = {}
        
        tables = ['branches', 'services', 'service_groups', 'employees', 'users', 
                  'customer_sources', 'cities', 'districts', 'wards', 'memberships',
                  'employee_groups', 'daily_revenue', 'customers', 'appointments']
        
        for table in tables:
            try:
                cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
                counts[table] = cursor.fetchone()['count']
            except:
                counts[table] = 0
        
        conn.close()
        return counts


# ============== CRAWLER CLASS ==============
class VTTechSyncToDB:
    """
    Crawler toàn diện cho VTTech TMTaza với tích hợp Database
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.branches = []
        self.db = DatabaseHelper(DB_PATH)
        self.stats = {
            'total_records': 0,
            'db_saved': 0,
            'endpoints_called': 0,
            'errors': 0,
            'start_time': None
        }
    
    def decompress(self, data: str) -> Any:
        """Giải nén response base64+gzip"""
        try:
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except:
            try:
                return json.loads(data)
            except:
                return data
    
    def login(self) -> bool:
        """Đăng nhập và lấy token"""
        logger.info("🔐 Đang đăng nhập...")
        try:
            resp = self.session.post(
                f"{BASE_URL}/api/Author/Login",
                json={
                    "username": USERNAME,
                    "password": PASSWORD,
                    "passwordcrypt": "",
                    "from": "",
                    "sso": "",
                    "ssotoken": ""
                },
                timeout=30
            )
            data = resp.json()
            
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                logger.info(f"✅ Đăng nhập thành công: {data.get('FullName')} (ID: {data.get('ID')})")
                return True
            else:
                logger.error(f"❌ Đăng nhập thất bại: {data.get('RESULT')}")
                return False
        except Exception as e:
            logger.error(f"❌ Lỗi đăng nhập: {e}")
            return False
    
    def init_page(self, page_url: str) -> bool:
        """Lấy XSRF token từ trang"""
        if page_url in self.xsrf_tokens:
            return True
            
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}", timeout=30)
            if resp.status_code == 200:
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_tokens[page_url] = match.group(1)
                    return True
        except Exception as e:
            logger.error(f"❌ Lỗi init_page {page_url}: {e}")
        return False
    
    def call_handler(self, page_url: str, handler: str, data: Dict, retry: int = 3) -> Any:
        """Gọi handler với XSRF token"""
        for attempt in range(retry):
            try:
                if not self.init_page(page_url):
                    continue
                    
                resp = self.session.post(
                    f"{BASE_URL}{page_url}?handler={handler}",
                    data=data,
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'XSRF-TOKEN': self.xsrf_tokens.get(page_url, ''),
                        'Accept': '*/*',
                        'Origin': BASE_URL,
                        'Referer': f'{BASE_URL}{page_url}'
                    },
                    timeout=120
                )
                
                self.stats['endpoints_called'] += 1
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_handler {page_url}?handler={handler}: {e}")
                self.stats['errors'] += 1
        return None
    
    def call_api(self, endpoint: str, data: Dict = None, retry: int = 3) -> Any:
        """Gọi API trực tiếp"""
        for attempt in range(retry):
            try:
                resp = self.session.post(
                    f"{BASE_URL}{endpoint}",
                    json=data or {},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.token}"
                    },
                    timeout=120
                )
                
                self.stats['endpoints_called'] += 1
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_api {endpoint}: {e}")
                self.stats['errors'] += 1
        return None
    
    def save_json(self, data: Any, filename: str, subdir: str = None) -> str:
        """Lưu dữ liệu ra file JSON (backup)"""
        if subdir:
            output_dir = SYNC_DIR / subdir
            output_dir.mkdir(exist_ok=True)
        else:
            output_dir = SYNC_DIR
        
        filepath = output_dir / f"{filename}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"  📄 JSON: {filepath.name}")
        return str(filepath)

    # ==========================================
    # MASTER DATA SYNC
    # ==========================================
    
    def sync_session_data(self) -> Dict:
        """Lấy tất cả dữ liệu từ SessionData API và lưu vào DB"""
        logger.info("\n" + "=" * 60)
        logger.info("📦 SYNC SESSION DATA (Master)")
        logger.info("=" * 60)
        
        result = self.call_api("/api/Home/SessionData", {})
        if not result:
            logger.error("Không lấy được SessionData")
            return {}
        
        today = datetime.now().strftime("%Y%m%d")
        saved_data = {}
        
        # Branches
        if "Table" in result:
            data = result["Table"]
            self.branches = data
            self.save_json(data, f"branches_{today}", "master")
            self.db.upsert_branches(data)
            saved_data['branches'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ branches: {len(data)} records")
        
        # Services
        if "Table2" in result:
            data = result["Table2"]
            self.save_json(data, f"services_{today}", "master")
            self.db.upsert_services(data)
            saved_data['services'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ services: {len(data)} records")
        
        # Service Groups
        if "Table3" in result:
            data = result["Table3"]
            self.save_json(data, f"service_groups_{today}", "master")
            self.db.upsert_service_groups(data)
            saved_data['service_groups'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ service_groups: {len(data)} records")
        
        # Employees
        if "Table4" in result:
            data = result["Table4"]
            self.save_json(data, f"employees_{today}", "master")
            self.db.upsert_employees(data)
            saved_data['employees'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ employees: {len(data)} records")
        
        # Users
        if "Table5" in result:
            data = result["Table5"]
            self.save_json(data, f"users_{today}", "master")
            self.db.upsert_users(data)
            saved_data['users'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ users: {len(data)} records")
        
        # Cities
        if "Table6" in result:
            data = result["Table6"]
            self.save_json(data, f"cities_{today}", "master")
            self.db.upsert_cities(data)
            saved_data['cities'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ cities: {len(data)} records")
        
        # Districts
        if "Table7" in result:
            data = result["Table7"]
            self.save_json(data, f"districts_{today}", "master")
            self.db.upsert_districts(data)
            saved_data['districts'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ districts: {len(data)} records")
        
        # Wards
        if "Table9" in result:
            data = result["Table9"]
            self.save_json(data, f"wards_{today}", "master")
            self.db.upsert_wards(data)
            saved_data['wards'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ wards: {len(data)} records")
        
        # Customer Sources
        if "Table10" in result:
            data = result["Table10"]
            self.save_json(data, f"customer_sources_{today}", "master")
            self.db.upsert_customer_sources(data)
            saved_data['customer_sources'] = len(data)
            self.stats['total_records'] += len(data)
            self.stats['db_saved'] += len(data)
            logger.info(f"  ✅ customer_sources: {len(data)} records")
        
        return saved_data
    
    def sync_branches_full(self) -> Dict:
        """Lấy thông tin chi nhánh và membership đầy đủ"""
        logger.info("\n🏢 Sync chi nhánh + Membership...")
        
        result = self.call_handler("/Customer/ListCustomer/", "Initialize", {})
        if result:
            today = datetime.now().strftime("%Y%m%d")
            
            branches = result.get('Branch', [])
            memberships = result.get('Membership', [])
            
            # Lưu JSON
            self.save_json(result, f"branches_full_{today}", "master")
            
            # Lưu DB - Memberships
            if memberships:
                self.db.upsert_memberships(memberships)
                self.stats['total_records'] += len(memberships)
                self.stats['db_saved'] += len(memberships)
                logger.info(f"  ✅ memberships: {len(memberships)} records")
            
            # Cache branches
            if branches:
                self.branches = branches
            
            return {'branches': len(branches), 'memberships': len(memberships)}
        return {}
    
    def sync_employees_full(self) -> Dict:
        """Lấy nhân viên + nhóm nhân viên đầy đủ"""
        logger.info("\n👨‍💼 Sync nhân viên + nhóm...")
        
        all_data = {}
        today = datetime.now().strftime("%Y%m%d")
        
        # Employee groups
        result = self.call_handler("/Employee/EmployeeList/", "LoadataEmployeeGroup", {})
        if result and isinstance(result, list):
            self.save_json(result, f"employee_groups_{today}", "employees")
            self.db.upsert_employee_groups(result)
            all_data['employee_groups'] = len(result)
            self.stats['total_records'] += len(result)
            self.stats['db_saved'] += len(result)
            logger.info(f"  ✅ employee_groups: {len(result)} records")
        
        return all_data

    # ==========================================
    # REVENUE SYNC
    # ==========================================
    
    def sync_revenue(self, date_from: str, date_to: str) -> List[Dict]:
        """Lấy doanh thu theo ngày và lưu vào DB"""
        logger.info(f"\n💰 Sync doanh thu từ {date_from} đến {date_to}...")
        
        if not self.branches:
            self.sync_branches_full()
        
        # Tính số ngày
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d")
        
        all_totals = []
        current = start
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            day_totals = []
            
            logger.info(f"\n  📅 {date_str}:")
            
            for branch in self.branches:
                result = self.call_handler(
                    "/Customer/ListCustomer/",
                    "LoadDataTotal",
                    {
                        'dateFrom': f"{date_str} 00:00:00",
                        'dateTo': f"{date_str} 23:59:59",
                        'branchID': branch['ID']
                    }
                )
                
                if result and isinstance(result, list) and len(result) > 0:
                    for item in result:
                        item['BranchID'] = branch['ID']
                        item['BranchName'] = branch['Name']
                    day_totals.extend(result)
                
                time.sleep(0.2)  # Rate limiting
            
            # Lưu vào DB
            if day_totals:
                self.db.upsert_daily_revenue(date_str, day_totals)
                all_totals.extend(day_totals)
                
                total_paid = sum(t.get('Paid', 0) for t in day_totals)
                self.stats['total_records'] += len(day_totals)
                self.stats['db_saved'] += len(day_totals)
                logger.info(f"    Tổng: {total_paid:,.0f} VND ({len(day_totals)} branches)")
            
            current += timedelta(days=1)
        
        # Lưu JSON backup
        if all_totals:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_totals, f"revenue_{date_from}_to_{date_to}_{today}", "revenue")
        
        return all_totals

    # ==========================================
    # CUSTOMER SYNC
    # ==========================================
    
    def sync_customers(self, date_from: str, date_to: str, 
                       page_size: int = 500, max_pages: int = 100) -> List[Dict]:
        """Lấy danh sách khách hàng với pagination và lưu DB"""
        logger.info(f"\n👥 Sync khách hàng từ {date_from} đến {date_to}...")
        
        all_customers = []
        start = 0
        page = 1
        
        while page <= max_pages:
            customers = self.call_handler(
                "/Customer/ListCustomer/",
                "LoadData",
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': 0,
                    'start': start,
                    'length': page_size
                }
            )
            
            if not customers or not isinstance(customers, list) or len(customers) == 0:
                break
            
            all_customers.extend(customers)
            logger.info(f"  📄 Page {page}: {len(customers)} customers (Total: {len(all_customers)})")
            
            if len(customers) < page_size:
                break
            
            start += page_size
            page += 1
            time.sleep(0.5)
        
        if all_customers:
            # Lưu DB
            self.db.upsert_customers(all_customers)
            self.stats['total_records'] += len(all_customers)
            self.stats['db_saved'] += len(all_customers)
            
            # Lưu JSON
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_customers, f"customers_{today}", "customers")
            
            logger.info(f"  ✅ Tổng khách hàng: {len(all_customers)}")
        
        return all_customers

    # ==========================================
    # APPOINTMENT SYNC
    # ==========================================
    
    def sync_appointments(self, date_from: str, date_to: str) -> List[Dict]:
        """Lấy danh sách lịch hẹn và lưu DB"""
        logger.info(f"\n📅 Sync lịch hẹn từ {date_from} đến {date_to}...")
        
        handlers_to_try = [
            ("/Appointment/AppointmentInDay/", "LoadData"),
            ("/Appointment/AppointmentInDay/", "Initialize"),
            ("/Appointment/ListAppointment/", "LoadData"),
            ("/Booking/BookingList/", "LoadData"),
        ]
        
        all_appointments = []
        
        for page_url, handler in handlers_to_try:
            result = self.call_handler(
                page_url,
                handler,
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': 0
                }
            )
            
            if result and isinstance(result, list) and len(result) > 0:
                all_appointments = result
                logger.info(f"  ✅ Tìm thấy {len(result)} lịch hẹn từ {page_url}")
                break
            elif result and isinstance(result, dict) and 'Data' in result:
                all_appointments = result['Data']
                logger.info(f"  ✅ Tìm thấy {len(all_appointments)} lịch hẹn từ {page_url}")
                break
        
        if all_appointments:
            # Lưu DB
            self.db.upsert_appointments(all_appointments)
            self.stats['total_records'] += len(all_appointments)
            self.stats['db_saved'] += len(all_appointments)
            
            # Lưu JSON
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_appointments, f"appointments_{today}", "appointments")
        else:
            logger.info("  ℹ️ Không tìm thấy dữ liệu lịch hẹn")
        
        return all_appointments

    # ==========================================
    # FULL SYNC
    # ==========================================
    
    def full_sync(self, date_from: str = None, date_to: str = None, 
                  master_only: bool = False) -> Dict:
        """Sync toàn bộ dữ liệu và lưu vào DB"""
        self.stats['start_time'] = datetime.now()
        
        logger.info("\n" + "=" * 70)
        logger.info("🚀 VTTECH SYNC TO DATABASE")
        logger.info(f"   Thời gian: {self.stats['start_time']}")
        logger.info(f"   Database: {DB_PATH}")
        logger.info("=" * 70)
        
        results = {}
        
        # 1. Đăng nhập
        if not self.login():
            return {"error": "Không thể đăng nhập"}
        
        # 2. Sync Master Data
        results['session_data'] = self.sync_session_data()
        results['branches_full'] = self.sync_branches_full()
        results['employees_full'] = self.sync_employees_full()
        
        if master_only:
            self._print_summary(results)
            return results
        
        # 3. Setup dates
        if not date_from:
            date_from = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        logger.info(f"\n📅 Khoảng ngày: {date_from} đến {date_to}")
        
        # 4. Sync Daily Data
        results['revenue'] = self.sync_revenue(date_from, date_to)
        results['customers'] = self.sync_customers(date_from, date_to)
        results['appointments'] = self.sync_appointments(date_from, date_to)
        
        # 5. Log crawl
        duration = (datetime.now() - self.stats['start_time']).total_seconds()
        self.db.log_crawl(
            datetime.now().strftime("%Y-%m-%d"),
            "full_sync",
            "success",
            self.stats['db_saved'],
            None,
            duration
        )
        
        self._print_summary(results)
        return results
    
    def daily_sync(self, target_date: str = None) -> Dict:
        """Sync dữ liệu cho 1 ngày cụ thể"""
        if not target_date:
            target_date = datetime.now().strftime("%Y-%m-%d")
        
        return self.full_sync(date_from=target_date, date_to=target_date)
    
    def _print_summary(self, results: Dict):
        """In tổng kết"""
        duration = datetime.now() - self.stats['start_time']
        
        logger.info("\n" + "=" * 70)
        logger.info("📊 TỔNG KẾT SYNC")
        logger.info("=" * 70)
        
        for key, value in results.items():
            if isinstance(value, dict):
                count = sum(v if isinstance(v, int) else len(v) for v in value.values())
                logger.info(f"  📁 {key}: {count} records")
            elif isinstance(value, list):
                logger.info(f"  📁 {key}: {len(value)} records")
        
        logger.info(f"\n  📈 Tổng records: {self.stats['total_records']:,}")
        logger.info(f"  💾 Saved to DB: {self.stats['db_saved']:,}")
        logger.info(f"  🔗 API calls: {self.stats['endpoints_called']}")
        logger.info(f"  ❌ Errors: {self.stats['errors']}")
        logger.info(f"  ⏱️  Thời gian: {duration}")
        
        # Hiển thị thống kê DB
        logger.info("\n📊 DATABASE COUNTS:")
        counts = self.db.get_table_counts()
        for table, count in counts.items():
            logger.info(f"  - {table}: {count:,}")
        
        logger.info("=" * 70)
        logger.info("✅ HOÀN TẤT!")
        logger.info("=" * 70)


# ============== MAIN ==============
def main():
    parser = argparse.ArgumentParser(description='VTTech Sync to Database')
    parser.add_argument('--master-only', action='store_true', 
                       help='Chỉ sync master data')
    parser.add_argument('--daily', action='store_true',
                       help='Sync dữ liệu hôm nay')
    parser.add_argument('--date', type=str,
                       help='Ngày cần sync (YYYY-MM-DD)')
    parser.add_argument('--date-from', type=str,
                       help='Ngày bắt đầu (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str,
                       help='Ngày kết thúc (YYYY-MM-DD)')
    args = parser.parse_args()
    
    crawler = VTTechSyncToDB()
    
    if args.daily:
        crawler.daily_sync(args.date or datetime.now().strftime("%Y-%m-%d"))
    elif args.date:
        crawler.full_sync(date_from=args.date, date_to=args.date)
    else:
        crawler.full_sync(
            date_from=args.date_from,
            date_to=args.date_to,
            master_only=args.master_only
        )


if __name__ == "__main__":
    main()
