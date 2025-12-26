#!/usr/bin/env python3
"""
Sync Customer by Branch - VTTech TMTaza

Quy trình:
1. Lấy Tất Cả Branch từ /Setting/BranchList/?handler=LoadData
2. Lấy List Khách Hàng từ /Customer/ListCustomer/?handler=LoadData cho mỗi branch
3. Lưu trực tiếp vào database

Author: Auto-generated
Date: 2025-12-25
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
from urllib.parse import quote

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

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"sync_customer_branch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class VTTechCustomerSync:
    """
    Sync khách hàng từ VTTech theo quy trình:
    1. Lấy danh sách Branch
    2. Với mỗi Branch, lấy danh sách khách hàng
    3. Lưu vào database
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.branches = []
        self.stats = {
            'total_branches': 0,
            'total_customers': 0,
            'db_saved': 0,
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
    
    def call_handler(self, page_url: str, handler: str, data: Dict = None, retry: int = 3) -> Any:
        """Gọi handler với XSRF token"""
        for attempt in range(retry):
            try:
                if not self.init_page(page_url):
                    continue
                    
                resp = self.session.post(
                    f"{BASE_URL}{page_url}?handler={handler}",
                    data=data or {},
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
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_handler {page_url}?handler={handler}: {e}")
                self.stats['errors'] += 1
        return None
    
    def get_conn(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    
    def ensure_customers_table(self):
        """Đảm bảo bảng customers tồn tại"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Bảng customers chính
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
                sync_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Thêm cột sync_date nếu chưa có (cho database cũ)
        try:
            cursor.execute("ALTER TABLE customers ADD COLUMN sync_date DATE")
        except:
            pass  # Cột đã tồn tại
        
        # Tạo index cho sync_date
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_sync_date ON customers(sync_date)")
        
        # Bảng branches
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS branches (
                id INTEGER PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                address TEXT,
                phone TEXT,
                email TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng để track sync history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_date DATE,
                sync_type TEXT,
                branch_id INTEGER,
                branch_name TEXT,
                records_count INTEGER DEFAULT 0,
                status TEXT,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng để track data changes (audit log)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS data_change_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                change_type TEXT NOT NULL,
                field_name TEXT,
                old_value TEXT,
                new_value TEXT,
                sync_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tạo indexes cho change logs
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_logs_table ON data_change_logs(table_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_logs_record ON data_change_logs(record_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_logs_date ON data_change_logs(sync_date)")
        
        # Tạo indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code)")
        
        conn.commit()
        conn.close()
        logger.info("✅ Database tables ensured")
    
    def call_api(self, endpoint: str, data: Dict = None, retry: int = 3) -> Any:
        """Gọi API trực tiếp với JSON body"""
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
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_api {endpoint}: {e}")
                self.stats['errors'] += 1
        return None
    
    def get_all_branches(self) -> List[Dict]:
        """
        Bước 1: Lấy tất cả Branch
        Sử dụng /api/Home/SessionData để lấy branches (Table key)
        """
        logger.info("\n" + "=" * 60)
        logger.info("📍 BƯỚC 1: LẤY TẤT CẢ BRANCH")
        logger.info("=" * 60)
        
        # Sử dụng SessionData API để lấy branches
        result = self.call_api("/api/Home/SessionData", {})
        
        if result and "Table" in result:
            branches = result["Table"]
            self.branches = branches
            self.stats['total_branches'] = len(branches)
            
            # Lưu branches vào DB
            self.save_branches_to_db(branches)
            
            logger.info(f"✅ Tìm thấy {len(branches)} branches:")
            for branch in branches:
                logger.info(f"   - ID: {branch.get('ID')}, Name: {branch.get('Name')}")
            
            return branches
        else:
            logger.error("❌ Không lấy được danh sách branch từ SessionData")
            return []
    
    def save_branches_to_db(self, branches: List[Dict]) -> int:
        """Lưu branches vào database - Sử dụng transaction để đảm bảo toàn vẹn"""
        conn = self.get_conn()
        count = 0
        try:
            conn.execute("BEGIN TRANSACTION")
            
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
            logger.info(f"  💾 Saved {count} branches to DB")
        except Exception as e:
            conn.rollback()
            logger.error(f"  ❌ Error saving branches: {e}")
        finally:
            conn.close()
        return count
    
    def get_customers_by_branch(self, branch_id: int, date_from: str, date_to: str, 
                                 limit: int = 500) -> List[Dict]:
        """
        Bước 2: Lấy List Khách Hàng theo Branch
        Endpoint: /Customer/ListCustomer/?handler=LoadData
        
        Parameters:
            branch_id: ID của branch
            date_from: Ngày bắt đầu (format: YYYY-MM-DD HH:MM:SS)
            date_to: Ngày kết thúc (format: YYYY-MM-DD HH:MM:SS)
            limit: Số lượng records mỗi lần request
        """
        all_customers = []
        begin_id = 0
        page = 1
        
        while True:
            # Format data theo yêu cầu
            # dateFrom=2025-12-25+00%3A00%3A00&dateTo=2025-12-25+00%3A00%3A00&branchID=26&type=5&BeginID=0&Limit=500
            form_data = {
                'dateFrom': date_from,
                'dateTo': date_to,
                'branchID': branch_id,
                'type': 5,
                'BeginID': begin_id,
                'Limit': limit
            }
            
            logger.info(f"   📄 Trang {page}: BeginID={begin_id}, Limit={limit}")
            
            result = self.call_handler("/Customer/ListCustomer/", "LoadData", form_data)
            
            if result and isinstance(result, list) and len(result) > 0:
                all_customers.extend(result)
                logger.info(f"      ➜ Nhận được {len(result)} khách hàng")
                
                # Nếu số lượng trả về < limit, đã hết data
                if len(result) < limit:
                    break
                
                # Lấy CustID cuối cùng làm BeginID cho page tiếp
                last_customer = result[-1]
                begin_id = last_customer.get('CustID', last_customer.get('ID', 0))
                page += 1
                
                # Delay giữa các request để tránh rate limit
                time.sleep(0.5)
            else:
                break
        
        return all_customers
    
    def save_customers_to_db(self, customers: List[Dict], branch_id: int = None, sync_date: str = None) -> int:
        """Lưu customers vào database - Kiểm tra thay đổi và lưu logs
        
        Args:
            customers: Danh sách customers từ API
            branch_id: ID của branch
            sync_date: Ngày sync data (format: YYYY-MM-DD), dùng để tracking
        """
        conn = self.get_conn()
        count = 0
        new_count = 0
        updated_count = 0
        
        # Nếu không có sync_date, dùng ngày hiện tại
        if not sync_date:
            sync_date = datetime.now().strftime('%Y-%m-%d')
        
        # Các fields cần track thay đổi
        tracked_fields = ['name', 'phone', 'email', 'address', 'total_spent', 'total_debt', 'point', 'branch_id']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for data in customers:
                # Map fields từ API response sang database schema
                customer_id = data.get('CustID', data.get('ID'))
                
                # Chuẩn bị dữ liệu mới
                new_data = {
                    'code': data.get('Code', data.get('CustCode', '')),
                    'name': data.get('Name', data.get('CustName', data.get('CustomerName', ''))),
                    'phone': data.get('Phone', data.get('Mobile', data.get('CustPhone', ''))),
                    'email': data.get('Email', ''),
                    'gender': data.get('Gender', data.get('Sex', 0)),
                    'birthday': data.get('Birthday', data.get('BirthDay')),
                    'address': data.get('Address', ''),
                    'city_id': data.get('CityID'),
                    'district_id': data.get('DistrictID'),
                    'ward_id': data.get('WardID'),
                    'branch_id': branch_id or data.get('BranchID'),
                    'source_id': data.get('SourceID', data.get('CustomerSourceID')),
                    'membership_id': data.get('MembershipID'),
                    'total_spent': data.get('TotalSpent', data.get('TotalPaid', data.get('Paid', 0))),
                    'total_debt': data.get('TotalDebt', data.get('Debt', 0)),
                    'point': data.get('Point', 0),
                }
                
                # Kiểm tra xem customer đã tồn tại chưa
                cursor = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # So sánh và log thay đổi
                    for field in tracked_fields:
                        old_val = existing[field]
                        new_val = new_data.get(field)
                        
                        # Convert để so sánh
                        old_str = str(old_val) if old_val is not None else ''
                        new_str = str(new_val) if new_val is not None else ''
                        
                        if old_str != new_str:
                            conn.execute("""
                                INSERT INTO data_change_logs 
                                (table_name, record_id, change_type, field_name, old_value, new_value, sync_date)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, ('customers', customer_id, 'UPDATE', field, old_str, new_str, sync_date))
                    
                    updated_count += 1
                else:
                    # Customer mới - log INSERT
                    conn.execute("""
                        INSERT INTO data_change_logs 
                        (table_name, record_id, change_type, field_name, old_value, new_value, sync_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, ('customers', customer_id, 'INSERT', None, None, new_data.get('name'), sync_date))
                    new_count += 1
                
                # Insert/Update customer
                conn.execute("""
                    INSERT OR REPLACE INTO customers 
                    (id, code, name, phone, email, gender, birthday, address, 
                     city_id, district_id, ward_id, branch_id, source_id, 
                     membership_id, total_spent, total_debt, point, is_active, sync_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    new_data['code'],
                    new_data['name'],
                    new_data['phone'],
                    new_data['email'],
                    new_data['gender'],
                    new_data['birthday'],
                    new_data['address'],
                    new_data['city_id'],
                    new_data['district_id'],
                    new_data['ward_id'],
                    new_data['branch_id'],
                    new_data['source_id'],
                    new_data['membership_id'],
                    new_data['total_spent'],
                    new_data['total_debt'],
                    new_data['point'],
                    1,
                    sync_date,
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
            
            if new_count > 0 or updated_count > 0:
                logger.info(f"   📝 Thay đổi: {new_count} mới, {updated_count} cập nhật")
                
        except Exception as e:
            conn.rollback()
            logger.error(f"  ❌ Error saving customers: {e}")
            self.stats['errors'] += 1
        finally:
            conn.close()
        return count
    
    def log_sync(self, sync_date: str, sync_type: str, branch_id: int, 
                 branch_name: str, records_count: int, status: str, error_message: str = None):
        """Ghi log sync"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT INTO sync_logs (sync_date, sync_type, branch_id, branch_name, records_count, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (sync_date, sync_type, branch_id, branch_name, records_count, status, error_message))
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging sync: {e}")
        finally:
            conn.close()
    
    def sync_all_customers(self, date_from: str, date_to: str):
        """
        Sync toàn bộ khách hàng từ tất cả branches
        
        Quy trình:
        1. Lấy tất cả Branch
        2. Với mỗi Branch, lấy danh sách khách hàng
        3. Lưu vào database
        """
        self.stats['start_time'] = datetime.now()
        
        logger.info("\n" + "=" * 70)
        logger.info("🚀 BẮT ĐẦU SYNC KHÁCH HÀNG THEO BRANCH")
        logger.info("=" * 70)
        logger.info(f"📅 Khoảng thời gian: {date_from} → {date_to}")
        
        # Đảm bảo database tables tồn tại
        self.ensure_customers_table()
        
        # Đăng nhập
        if not self.login():
            logger.error("❌ Không thể đăng nhập. Dừng sync.")
            return
        
        # Bước 1: Lấy tất cả Branch
        branches = self.get_all_branches()
        if not branches:
            logger.error("❌ Không có branch nào. Dừng sync.")
            return
        
        # Bước 2: Với mỗi Branch, lấy danh sách khách hàng
        logger.info("\n" + "=" * 60)
        logger.info("👥 BƯỚC 2: LẤY KHÁCH HÀNG THEO TỪNG BRANCH")
        logger.info("=" * 60)
        
        total_customers_saved = 0
        
        # Lấy sync_date từ date_from (format: YYYY-MM-DD HH:MM:SS -> YYYY-MM-DD)
        sync_date_str = date_from.split()[0] if ' ' in date_from else date_from
        
        for i, branch in enumerate(branches, 1):
            branch_id = branch.get('ID')
            branch_name = branch.get('Name', f'Branch {branch_id}')
            
            logger.info(f"\n📍 [{i}/{len(branches)}] Branch: {branch_name} (ID: {branch_id})")
            
            try:
                # Lấy khách hàng của branch
                customers = self.get_customers_by_branch(branch_id, date_from, date_to)
                
                if customers:
                    logger.info(f"   ✅ Tìm thấy {len(customers)} khách hàng")
                    
                    # Lưu vào database với sync_date
                    saved = self.save_customers_to_db(customers, branch_id, sync_date=sync_date_str)
                    total_customers_saved += saved
                    logger.info(f"   💾 Đã lưu {saved} khách hàng vào DB (sync_date: {sync_date_str})")
                    
                    # Log sync
                    self.log_sync(sync_date_str, 'customer_list', branch_id, branch_name, 
                                  len(customers), 'success')
                else:
                    logger.info(f"   ℹ️ Không có khách hàng trong khoảng thời gian này")
                    self.log_sync(sync_date_str, 'customer_list', branch_id, branch_name, 
                                  0, 'no_data')
                
                self.stats['total_customers'] += len(customers) if customers else 0
                
            except Exception as e:
                logger.error(f"   ❌ Lỗi khi lấy khách hàng branch {branch_id}: {e}")
                self.log_sync(sync_date_str, 'customer_list', branch_id, branch_name, 
                              0, 'error', str(e))
                self.stats['errors'] += 1
            
            # Delay giữa các branch
            time.sleep(1)
        
        self.stats['db_saved'] = total_customers_saved
        
        # In báo cáo
        self.print_summary()
    
    def print_summary(self):
        """In tổng kết sync"""
        duration = datetime.now() - self.stats['start_time']
        
        logger.info("\n" + "=" * 70)
        logger.info("📊 TỔNG KẾT SYNC")
        logger.info("=" * 70)
        logger.info(f"   🏢 Tổng số Branch: {self.stats['total_branches']}")
        logger.info(f"   👥 Tổng số Khách hàng: {self.stats['total_customers']}")
        logger.info(f"   💾 Đã lưu vào DB: {self.stats['db_saved']}")
        logger.info(f"   ❌ Lỗi: {self.stats['errors']}")
        logger.info(f"   ⏱️ Thời gian: {duration}")
        logger.info("=" * 70)
        
        # Hiển thị số records trong DB
        self.show_db_stats()
    
    def show_db_stats(self):
        """Hiển thị thống kê từ database"""
        conn = self.get_conn()
        try:
            # Đếm customers
            cursor = conn.execute("SELECT COUNT(*) as count FROM customers")
            customers_count = cursor.fetchone()['count']
            
            # Đếm branches
            cursor = conn.execute("SELECT COUNT(*) as count FROM branches")
            branches_count = cursor.fetchone()['count']
            
            # Customers theo branch
            cursor = conn.execute("""
                SELECT b.name, COUNT(c.id) as customer_count
                FROM branches b
                LEFT JOIN customers c ON b.id = c.branch_id
                GROUP BY b.id, b.name
                ORDER BY customer_count DESC
            """)
            branch_stats = cursor.fetchall()
            
            logger.info("\n📈 THỐNG KÊ DATABASE:")
            logger.info(f"   - Tổng branches: {branches_count}")
            logger.info(f"   - Tổng customers: {customers_count}")
            
            if branch_stats:
                logger.info("\n   Khách hàng theo Branch:")
                for row in branch_stats:
                    logger.info(f"     • {row['name']}: {row['customer_count']} khách")
            
        except Exception as e:
            logger.error(f"Error getting DB stats: {e}")
        finally:
            conn.close()


def main():
    parser = argparse.ArgumentParser(description='Sync Customer by Branch từ VTTech')
    parser.add_argument('--date', type=str, help='Ngày sync (YYYY-MM-DD), mặc định hôm nay')
    parser.add_argument('--date-from', type=str, help='Ngày bắt đầu (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str, help='Ngày kết thúc (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    # Xác định khoảng ngày
    if args.date_from and args.date_to:
        date_from = f"{args.date_from} 00:00:00"
        date_to = f"{args.date_to} 23:59:59"
    elif args.date:
        date_from = f"{args.date} 00:00:00"
        date_to = f"{args.date} 23:59:59"
    else:
        # Mặc định: hôm nay
        today = datetime.now().strftime('%Y-%m-%d')
        date_from = f"{today} 00:00:00"
        date_to = f"{today} 23:59:59"
    
    # Tạo syncer và chạy
    syncer = VTTechCustomerSync()
    syncer.sync_all_customers(date_from, date_to)


if __name__ == "__main__":
    main()
