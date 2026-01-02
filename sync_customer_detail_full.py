#!/usr/bin/env python3
"""
Sync Customer Detail - VTTech TMTaza

Quy trình:
1. Lấy danh sách CustomerID từ database (đã sync ở bước trước)
2. Với mỗi CustomerID, GET /Customer/MainCustomer?CustomerID={id} để set context
3. Lấy chi tiết: services, treatments, payments, appointments, history
4. Lưu trực tiếp vào database

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
(SYNC_DIR / "customer_detail").mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"sync_customer_detail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class CustomerDetailSync:
    """
    Sync chi tiết khách hàng từ VTTech
    
    Quy trình cho mỗi customer:
    1. GET /Customer/MainCustomer?CustomerID={id} - Set context
    2. Lấy services: /Customer/Service/TabList/TabList_Service/?handler=LoadataTab
    3. Lấy treatments: /Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadataTreatment
    4. Lấy payments: /Customer/Payment/PaymentList/PaymentList_Service/?handler=LoadataPayment
    5. Lấy appointments: /Customer/ScheduleList_Schedule/?handler=Loadata
    6. Lấy history: /Customer/History/HistoryList_Care/?handler=LoadataHistory
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.current_customer_id = None
        self.stats = {
            'total_customers': 0,
            'processed': 0,
            'services_saved': 0,
            'treatments_saved': 0,
            'payments_saved': 0,
            'appointments_saved': 0,
            'history_saved': 0,
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
    
    def init_xsrf_token(self) -> str:
        """Lấy XSRF token từ ListCustomer page (cần gọi 1 lần sau login)"""
        try:
            resp = self.session.get(f"{BASE_URL}/Customer/ListCustomer", timeout=30)
            if resp.status_code == 200:
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    return match.group(1)
        except Exception as e:
            logger.error(f"❌ Lỗi lấy XSRF token: {e}")
        return ''
    
    def set_customer_context(self, customer_id: int) -> bool:
        """
        Set context cho customer bằng cách GET trang MainCustomer
        Đây là bước BẮT BUỘC trước khi gọi các handler lấy chi tiết
        """
        try:
            # Nếu chưa có XSRF token, lấy từ ListCustomer
            if not hasattr(self, '_base_xsrf') or not self._base_xsrf:
                self._base_xsrf = self.init_xsrf_token()
            
            # Access MainCustomer để set session context
            resp = self.session.get(
                f"{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}",
                timeout=30
            )
            if resp.status_code == 200:
                # Thử lấy XSRF từ MainCustomer page
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_tokens[customer_id] = match.group(1)
                else:
                    # Fallback: dùng XSRF từ ListCustomer
                    self.xsrf_tokens[customer_id] = self._base_xsrf
                
                self.current_customer_id = customer_id
                return True
        except Exception as e:
            logger.error(f"❌ Lỗi set_customer_context cho ID {customer_id}: {e}")
        return False
    
    def call_handler(self, page_url: str, handler: str, data: Dict = None, retry: int = 3) -> Any:
        """Gọi handler với XSRF token và CustomerID"""
        for attempt in range(retry):
            try:
                xsrf = self.xsrf_tokens.get(self.current_customer_id, '')
                
                # Tạo form data với CustomerID - BẮT BUỘC để server biết customer nào
                form_data = {
                    '__RequestVerificationToken': xsrf,
                    'CustomerID': self.current_customer_id,
                    '__CUSTOMERID': self.current_customer_id
                }
                # Merge với data truyền vào
                if data:
                    form_data.update(data)
                
                resp = self.session.post(
                    f"{BASE_URL}{page_url}?handler={handler}",
                    data=form_data,
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'XSRF-TOKEN': xsrf,
                        'xsrf-token': xsrf,
                        'Accept': '*/*',
                        'Origin': BASE_URL,
                        'Referer': f'{BASE_URL}/Customer/MainCustomer?CustomerID={self.current_customer_id}'
                    },
                    timeout=60
                )
                
                if resp.status_code == 200 and resp.content:
                    # Kiểm tra không phải HTML error page
                    if not resp.text.startswith('<!DOCTYPE'):
                        return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(0.5)
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
    
    def ensure_tables(self):
        """Đảm bảo các bảng customer detail tồn tại"""
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Bảng customer_services - Dịch vụ của khách
        # Sử dụng UNIQUE constraint để hỗ trợ INSERT OR REPLACE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                service_id INTEGER,
                service_name TEXT,
                service_code TEXT,
                quantity INTEGER DEFAULT 1,
                used_quantity INTEGER DEFAULT 0,
                price REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                total REAL DEFAULT 0,
                paid REAL DEFAULT 0,
                debt REAL DEFAULT 0,
                status TEXT,
                created_date DATETIME,
                branch_id INTEGER,
                branch_name TEXT,
                note TEXT,
                raw_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, service_id, created_date)
            )
        """)
        
        # Bảng customer_treatments - Điều trị của khách
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_treatments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                treatment_id INTEGER,
                service_id INTEGER,
                service_name TEXT,
                employee_id INTEGER,
                employee_name TEXT,
                treatment_date DATETIME,
                branch_id INTEGER,
                branch_name TEXT,
                status TEXT,
                note TEXT,
                raw_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, treatment_id)
            )
        """)
        
        # Bảng customer_payments - Thanh toán của khách
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                payment_id INTEGER,
                amount REAL DEFAULT 0,
                payment_date DATETIME,
                payment_method TEXT,
                payment_type TEXT,
                branch_id INTEGER,
                branch_name TEXT,
                service_name TEXT,
                note TEXT,
                signature_data TEXT,
                raw_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, payment_id)
            )
        """)
        
        # Bảng customer_appointments - Lịch hẹn của khách
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                appointment_id INTEGER,
                appointment_date DATETIME,
                service_id INTEGER,
                service_name TEXT,
                employee_id INTEGER,
                employee_name TEXT,
                branch_id INTEGER,
                branch_name TEXT,
                status INTEGER,
                status_name TEXT,
                note TEXT,
                raw_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, appointment_id)
            )
        """)
        
        # Bảng customer_history - Lịch sử chăm sóc
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                history_id INTEGER,
                action_type TEXT,
                action_date DATETIME,
                employee_id INTEGER,
                employee_name TEXT,
                content TEXT,
                result TEXT,
                note TEXT,
                raw_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, history_id)
            )
        """)
        
        # Bảng customer_detail_sync_logs - Tracking sync
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_detail_sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                sync_date DATE,
                services_count INTEGER DEFAULT 0,
                treatments_count INTEGER DEFAULT 0,
                payments_count INTEGER DEFAULT 0,
                appointments_count INTEGER DEFAULT 0,
                history_count INTEGER DEFAULT 0,
                status TEXT,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """)
        
        # Bảng để track data changes (audit log) cho customer details
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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cs_customer ON customer_services(customer_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ct_customer ON customer_treatments(customer_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cp_customer ON customer_payments(customer_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ca_customer ON customer_appointments(customer_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ch_customer ON customer_history(customer_id)")
        
        conn.commit()
        conn.close()
        logger.info("✅ Database tables for customer detail ensured")
    
    def get_customer_ids_to_sync(self, sync_date: str = None, date_from: str = None, date_to: str = None) -> List[int]:
        """Lấy danh sách CustomerID cần sync từ database
        
        Logic: Lấy customers dựa vào cột sync_date (ngày dữ liệu được sync)
        
        Args:
            sync_date: Sync customers từ ngày cụ thể (YYYY-MM-DD)
            date_from: Ngày bắt đầu khoảng thời gian (YYYY-MM-DD)
            date_to: Ngày kết thúc khoảng thời gian (YYYY-MM-DD)
        """
        conn = self.get_conn()
        
        if date_from and date_to:
            # Lấy customers theo khoảng sync_date
            cursor = conn.execute("""
                SELECT DISTINCT c.id, c.name, c.branch_id
                FROM customers c
                WHERE c.sync_date BETWEEN ? AND ?
                ORDER BY c.id
            """, (date_from, date_to))
        elif sync_date:
            # Lấy customers theo sync_date cụ thể
            cursor = conn.execute("""
                SELECT DISTINCT c.id, c.name, c.branch_id
                FROM customers c
                WHERE c.sync_date = ?
                ORDER BY c.id
            """, (sync_date,))
        else:
            # Lấy tất cả customers
            cursor = conn.execute("""
                SELECT id, name, branch_id FROM customers ORDER BY id
            """)
        
        customers = cursor.fetchall()
        conn.close()
        
        return [(row['id'], row['name'], row['branch_id']) for row in customers]
    
    def get_customer_services(self, customer_id: int) -> List[Dict]:
        """Lấy dịch vụ của customer"""
        result = self.call_handler(
            "/Customer/Service/TabList/TabList_Service/",
            "LoadataTab"
        )
        
        services = []
        if result:
            if isinstance(result, dict):
                # Thường data nằm trong Table key
                if "Table" in result and isinstance(result["Table"], list):
                    services = result["Table"]
                elif "list" in result:
                    services = result["list"]
            elif isinstance(result, list):
                services = result
        
        return services
    
    def get_customer_treatments(self, customer_id: int) -> List[Dict]:
        """Lấy điều trị của customer"""
        result = self.call_handler(
            "/Customer/Treatment/TreatmentList/TreatmentList_Service/",
            "LoadDetail"
        )
        
        treatments = []
        if result:
            if isinstance(result, dict):
                if "Table" in result and isinstance(result["Table"], list):
                    treatments = result["Table"]
            elif isinstance(result, list):
                treatments = result
        
        return treatments
    
    def get_customer_payments(self, customer_id: int) -> List[Dict]:
        """Lấy thanh toán của customer"""
        result = self.call_handler(
            "/Customer/Payment/PaymentList/PaymentList_Service/",
            "LoadataPayment"
        )
        
        payments = []
        if result:
            if isinstance(result, dict):
                if "Table" in result and isinstance(result["Table"], list):
                    payments = result["Table"]
            elif isinstance(result, list):
                payments = result
        
        return payments

    def get_payment_signature(self, payment_id: int) -> str:
        """Lấy chữ ký theo mã bill"""
        result = self.call_handler(
            "/Customer/Payment/PaymentList/PaymentList_Service/",
            "GetSign_Payment",
            data={"id": payment_id, "type": "payment"}
        )
        
        if result:
            # Result có thể là list [ {'SignData': '...'} ] hoặc dict
            if isinstance(result, list) and len(result) > 0:
                item = result[0]
                if isinstance(item, dict) and 'SignData' in item:
                    return str(item['SignData'])
            elif isinstance(result, dict) and "Data" in result:
                return str(result["Data"])
            elif isinstance(result, str):
                return result
        return ""
    
    def get_customer_appointments(self, customer_id: int) -> List[Dict]:
        """Lấy lịch hẹn của customer"""
        result = self.call_handler(
            "/Customer/MainCustomer/",
            "LoadCustomerScheduleNext"
        )
        
        appointments = []
        if result:
            if isinstance(result, dict):
                if "Table" in result and isinstance(result["Table"], list):
                    appointments = result["Table"]
            elif isinstance(result, list):
                appointments = result
        
        return appointments
    
    def get_customer_history(self, customer_id: int) -> List[Dict]:
        """Lấy lịch sử chăm sóc của customer"""
        result = self.call_handler(
            "/Customer/History/HistoryList_Care/",
            "LoadataHistory"
        )
        
        history = []
        if result:
            if isinstance(result, dict):
                if "Table" in result and isinstance(result["Table"], list):
                    history = result["Table"]
            elif isinstance(result, list):
                history = result
        
        return history
    
    def log_data_change(self, conn, table_name: str, record_id: int, change_type: str, 
                        field_name: str = None, old_value: str = None, new_value: str = None):
        """Ghi log thay đổi dữ liệu"""
        today = datetime.now().strftime('%Y-%m-%d')
        try:
            conn.execute("""
                INSERT INTO data_change_logs 
                (table_name, record_id, change_type, field_name, old_value, new_value, sync_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (table_name, record_id, change_type, field_name, 
                  str(old_value) if old_value is not None else None,
                  str(new_value) if new_value is not None else None, 
                  today))
        except Exception as e:
            logger.debug(f"Error logging change: {e}")
    
    def compare_and_log_changes(self, conn, table_name: str, record_id: int, 
                                 old_data: dict, new_data: dict, tracked_fields: list):
        """So sánh và log các thay đổi"""
        changes = []
        for field in tracked_fields:
            old_val = old_data.get(field) if old_data else None
            new_val = new_data.get(field)
            
            old_str = str(old_val) if old_val is not None else ''
            new_str = str(new_val) if new_val is not None else ''
            
            if old_str != new_str:
                self.log_data_change(conn, table_name, record_id, 'UPDATE', field, old_str, new_str)
                changes.append(field)
        
        return changes

    def save_customer_services(self, customer_id: int, services: List[Dict]) -> int:
        """Lưu services vào database - Kiểm tra thay đổi và log"""
        if not services:
            return 0
        
        conn = self.get_conn()
        count = 0
        new_count = 0
        updated_count = 0
        
        # Fields cần track
        tracked_fields = ['quantity', 'used_quantity', 'total', 'paid', 'debt', 'status']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for svc in services:
                service_id = svc.get('ServiceID', svc.get('ID'))
                created_date = svc.get('CreatedDate', svc.get('CreateDate'))
                
                # Kiểm tra record cũ
                cursor = conn.execute("""
                    SELECT * FROM customer_services 
                    WHERE customer_id = ? AND service_id = ? AND created_date = ?
                """, (customer_id, service_id, created_date))
                existing = cursor.fetchone()
                
                new_data = {
                    'quantity': svc.get('Quantity', svc.get('Qty', 1)),
                    'used_quantity': svc.get('UsedQuantity', svc.get('Used', 0)),
                    'total': svc.get('Total', svc.get('Amount', 0)),
                    'paid': svc.get('Paid', 0),
                    'debt': svc.get('Debt', 0),
                    'status': svc.get('Status', svc.get('StatusName', '')),
                }
                
                if existing:
                    old_data = dict(existing)
                    self.compare_and_log_changes(conn, 'customer_services', existing['id'], old_data, new_data, tracked_fields)
                    updated_count += 1
                else:
                    self.log_data_change(conn, 'customer_services', service_id, 'INSERT', 
                                        'service_name', None, svc.get('ServiceName', svc.get('Name', '')))
                    new_count += 1
                
                conn.execute("""
                    INSERT OR REPLACE INTO customer_services 
                    (customer_id, service_id, service_name, service_code, quantity, used_quantity,
                     price, discount, total, paid, debt, status, created_date, 
                     branch_id, branch_name, note, raw_data, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    service_id,
                    svc.get('ServiceName', svc.get('Name', '')),
                    svc.get('ServiceCode', svc.get('Code', '')),
                    new_data['quantity'],
                    new_data['used_quantity'],
                    svc.get('Price', 0),
                    svc.get('Discount', 0),
                    new_data['total'],
                    new_data['paid'],
                    new_data['debt'],
                    new_data['status'],
                    created_date,
                    svc.get('BranchID'),
                    svc.get('BranchName', ''),
                    svc.get('Note', ''),
                    json.dumps(svc, ensure_ascii=False),
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving services for customer {customer_id}: {e}")
        finally:
            conn.close()
        
        return count
    
    def save_customer_treatments(self, customer_id: int, treatments: List[Dict]) -> int:
        """Lưu treatments vào database - Kiểm tra thay đổi và log"""
        if not treatments:
            return 0
        
        conn = self.get_conn()
        count = 0
        tracked_fields = ['status', 'employee_id', 'treatment_date']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for t in treatments:
                treatment_id = t.get('ID', t.get('TreatmentID', t.get('TabID')))
                
                # Kiểm tra record cũ
                cursor = conn.execute("""
                    SELECT * FROM customer_treatments 
                    WHERE customer_id = ? AND treatment_id = ?
                """, (customer_id, treatment_id))
                existing = cursor.fetchone()
                
                new_data = {
                    'status': t.get('Status', t.get('StatusName', '')),
                    'employee_id': t.get('EmployeeID', t.get('DoctorID', t.get('Created_By'))),
                    'treatment_date': t.get('TreatmentDate', t.get('Date', t.get('Created'))),
                }
                
                if existing:
                    old_data = dict(existing)
                    self.compare_and_log_changes(conn, 'customer_treatments', existing['id'], old_data, new_data, tracked_fields)
                else:
                    self.log_data_change(conn, 'customer_treatments', treatment_id, 'INSERT',
                                        'service_name', None, t.get('ServiceName', ''))
                
                conn.execute("""
                    INSERT OR REPLACE INTO customer_treatments 
                    (customer_id, treatment_id, service_id, service_name, employee_id, employee_name,
                     treatment_date, branch_id, branch_name, status, note, raw_data, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    treatment_id,
                    t.get('ServiceID'),
                    t.get('ServiceName', ''),
                    new_data['employee_id'],
                    t.get('EmployeeName', t.get('DoctorName', '')),
                    new_data['treatment_date'],
                    t.get('BranchID'),
                    t.get('BranchName', ''),
                    new_data['status'],
                    t.get('Note', ''),
                    json.dumps(t, ensure_ascii=False),
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving treatments for customer {customer_id}: {e}")
        finally:
            conn.close()
        return count
    
    def save_customer_payments(self, customer_id: int, payments: List[Dict]) -> int:
        """Lưu payments vào database - Kiểm tra thay đổi và log"""
        if not payments:
            return 0
        
        conn = self.get_conn()
        count = 0
        tracked_fields = ['amount', 'payment_method', 'payment_type']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for p in payments:
                payment_id = p.get('ID', p.get('PaymentID'))
                
                # Kiểm tra record cũ
                cursor = conn.execute("""
                    SELECT * FROM customer_payments 
                    WHERE customer_id = ? AND payment_id = ?
                """, (customer_id, payment_id))
                existing = cursor.fetchone()
                
                new_data = {
                    'amount': p.get('Amount', p.get('Money', 0)),
                    'payment_method': p.get('PaymentMethod', p.get('Method', '')),
                    'payment_type': p.get('PaymentType', p.get('Type', '')),
                }
                
                if existing:
                    old_data = dict(existing)
                    self.compare_and_log_changes(conn, 'customer_payments', existing['id'], old_data, new_data, tracked_fields)
                else:
                    self.log_data_change(conn, 'customer_payments', payment_id, 'INSERT',
                                        'amount', None, str(new_data['amount']))
                
                # Lấy chữ ký từ API
                signature = self.get_payment_signature(payment_id) if payment_id else ""
                
                conn.execute("""
                    INSERT OR REPLACE INTO customer_payments 
                    (customer_id, payment_id, amount, payment_date, payment_method, payment_type,
                     branch_id, branch_name, service_name, note, signature_data, raw_data, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    payment_id,
                    new_data['amount'],
                    p.get('PaymentDate', p.get('Date')),
                    new_data['payment_method'],
                    new_data['payment_type'],
                    p.get('BranchID'),
                    p.get('BranchName', ''),
                    p.get('ServiceName', ''),
                    p.get('Note', ''),
                    signature,
                    json.dumps(p, ensure_ascii=False),
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving payments for customer {customer_id}: {e}")
        finally:
            conn.close()
        return count
    
    def save_customer_appointments(self, customer_id: int, appointments: List[Dict]) -> int:
        """Lưu appointments vào database - Kiểm tra thay đổi và log"""
        if not appointments:
            return 0
        
        conn = self.get_conn()
        count = 0
        tracked_fields = ['appointment_date', 'status', 'employee_id']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for a in appointments:
                appointment_id = a.get('ID', a.get('AppointmentID'))
                
                # Kiểm tra record cũ
                cursor = conn.execute("""
                    SELECT * FROM customer_appointments 
                    WHERE customer_id = ? AND appointment_id = ?
                """, (customer_id, appointment_id))
                existing = cursor.fetchone()
                
                new_data = {
                    'appointment_date': a.get('AppointmentDate', a.get('Date', a.get('DateApp', a.get('DateFrom')))),
                    'status': a.get('Status'),
                    'employee_id': a.get('EmployeeID', a.get('DoctorID')),
                }
                
                if existing:
                    old_data = dict(existing)
                    self.compare_and_log_changes(conn, 'customer_appointments', existing['id'], old_data, new_data, tracked_fields)
                else:
                    self.log_data_change(conn, 'customer_appointments', appointment_id, 'INSERT',
                                        'service_name', None, a.get('ServiceName', ''))
                
                conn.execute("""
                    INSERT OR REPLACE INTO customer_appointments 
                    (customer_id, appointment_id, appointment_date, service_id, service_name,
                     employee_id, employee_name, branch_id, branch_name, status, status_name,
                     note, raw_data, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    appointment_id,
                    new_data['appointment_date'],
                    a.get('ServiceID'),
                    a.get('ServiceName', ''),
                    a.get('EmployeeID', a.get('DoctorID')),
                    a.get('EmployeeName', a.get('DoctorName', '')),
                    a.get('BranchID'),
                    a.get('BranchName', ''),
                    a.get('Status'),
                    a.get('StatusName', ''),
                    a.get('Note', ''),
                    json.dumps(a, ensure_ascii=False),
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving appointments for customer {customer_id}: {e}")
        finally:
            conn.close()
        return count
    
    def save_customer_history(self, customer_id: int, history: List[Dict]) -> int:
        """Lưu history vào database - Kiểm tra thay đổi và log"""
        if not history:
            return 0
        
        conn = self.get_conn()
        count = 0
        tracked_fields = ['content', 'result']
        
        try:
            conn.execute("BEGIN TRANSACTION")
            
            for h in history:
                history_id = h.get('ID', h.get('HistoryID'))
                
                # Kiểm tra record cũ
                cursor = conn.execute("""
                    SELECT * FROM customer_history 
                    WHERE customer_id = ? AND history_id = ?
                """, (customer_id, history_id))
                existing = cursor.fetchone()
                
                new_data = {
                    'content': h.get('Content', h.get('Description', '')),
                    'result': h.get('Result', ''),
                }
                
                if existing:
                    old_data = dict(existing)
                    self.compare_and_log_changes(conn, 'customer_history', existing['id'], old_data, new_data, tracked_fields)
                else:
                    self.log_data_change(conn, 'customer_history', history_id, 'INSERT',
                                        'action_type', None, h.get('ActionType', h.get('Type', '')))
                
                conn.execute("""
                    INSERT OR REPLACE INTO customer_history 
                    (customer_id, history_id, action_type, action_date, employee_id, employee_name,
                     content, result, note, raw_data, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    customer_id,
                    history_id,
                    h.get('ActionType', h.get('Type', '')),
                    h.get('ActionDate', h.get('Date')),
                    h.get('EmployeeID'),
                    h.get('EmployeeName', h.get('UserName', '')),
                    new_data['content'],
                    new_data['result'],
                    h.get('Note', ''),
                    json.dumps(h, ensure_ascii=False),
                    datetime.now().isoformat()
                ))
                count += 1
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving history for customer {customer_id}: {e}")
        finally:
            conn.close()
        return count
    
    def log_sync(self, customer_id: int, sync_date: str, 
                 services_count: int, treatments_count: int, 
                 payments_count: int, appointments_count: int, 
                 history_count: int, status: str, error_message: str = None):
        """Ghi log sync"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT INTO customer_detail_sync_logs 
                (customer_id, sync_date, services_count, treatments_count, 
                 payments_count, appointments_count, history_count, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (customer_id, sync_date, services_count, treatments_count,
                  payments_count, appointments_count, history_count, status, error_message))
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging sync: {e}")
        finally:
            conn.close()
    
    def sync_customer_detail(self, customer_id: int, customer_name: str = '') -> Dict:
        """Sync chi tiết của một customer"""
        result = {
            'customer_id': customer_id,
            'services': 0,
            'treatments': 0,
            'payments': 0,
            'appointments': 0,
            'history': 0,
            'status': 'success'
        }
        
        # Bước 1: Set context
        if not self.set_customer_context(customer_id):
            result['status'] = 'error'
            result['error'] = 'Failed to set customer context'
            return result
        
        # Bước 2: Lấy services
        services = self.get_customer_services(customer_id)
        if services:
            result['services'] = self.save_customer_services(customer_id, services)
            self.stats['services_saved'] += result['services']
        
        # Bước 3: Lấy treatments
        treatments = self.get_customer_treatments(customer_id)
        if treatments:
            result['treatments'] = self.save_customer_treatments(customer_id, treatments)
            self.stats['treatments_saved'] += result['treatments']
        
        # Bước 4: Lấy payments
        payments = self.get_customer_payments(customer_id)
        if payments:
            result['payments'] = self.save_customer_payments(customer_id, payments)
            self.stats['payments_saved'] += result['payments']
        
        # Bước 5: Lấy appointments
        appointments = self.get_customer_appointments(customer_id)
        if appointments:
            result['appointments'] = self.save_customer_appointments(customer_id, appointments)
            self.stats['appointments_saved'] += result['appointments']
        
        # Bước 6: Lấy history
        history = self.get_customer_history(customer_id)
        if history:
            result['history'] = self.save_customer_history(customer_id, history)
            self.stats['history_saved'] += result['history']
        
        return result
    
    def sync_all_customer_details(self, sync_date: str = None, date_from: str = None, date_to: str = None, limit: int = None):
        """
        Sync chi tiết của tất cả customers
        
        Args:
            sync_date: Chỉ sync customers được cập nhật trong ngày này
            date_from: Ngày bắt đầu khoảng thời gian
            date_to: Ngày kết thúc khoảng thời gian
            limit: Giới hạn số lượng customers để sync (cho test)
        """
        self.stats['start_time'] = datetime.now()
        
        logger.info("\n" + "=" * 70)
        logger.info("🚀 BẮT ĐẦU SYNC CUSTOMER DETAIL")
        logger.info("=" * 70)
        
        if date_from and date_to:
            logger.info(f"📅 Khoảng thời gian: {date_from} → {date_to}")
        elif sync_date:
            logger.info(f"📅 Ngày: {sync_date}")
        
        # Đảm bảo tables tồn tại
        self.ensure_tables()
        
        # Đăng nhập
        if not self.login():
            logger.error("❌ Không thể đăng nhập. Dừng sync.")
            return
        
        # Lấy danh sách customers cần sync
        customers = self.get_customer_ids_to_sync(sync_date, date_from, date_to)
        
        if limit:
            customers = customers[:limit]
        
        self.stats['total_customers'] = len(customers)
        
        logger.info(f"📋 Tìm thấy {len(customers)} customers cần sync")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        for i, (customer_id, customer_name, branch_id) in enumerate(customers, 1):
            logger.info(f"\n👤 [{i}/{len(customers)}] Customer ID: {customer_id} - {customer_name}")
            
            try:
                result = self.sync_customer_detail(customer_id, customer_name)
                
                logger.info(f"   ✅ Services: {result['services']}, Treatments: {result['treatments']}, "
                           f"Payments: {result['payments']}, Appointments: {result['appointments']}, "
                           f"History: {result['history']}")
                
                # Log sync
                self.log_sync(
                    customer_id, today,
                    result['services'], result['treatments'],
                    result['payments'], result['appointments'],
                    result['history'], result['status']
                )
                
                self.stats['processed'] += 1
                
            except Exception as e:
                logger.error(f"   ❌ Lỗi: {e}")
                self.log_sync(customer_id, today, 0, 0, 0, 0, 0, 'error', str(e))
                self.stats['errors'] += 1
            
            # Delay giữa các customers
            time.sleep(0.3)
        
        # In tổng kết
        self.print_summary()
    
    def print_summary(self):
        """In tổng kết sync"""
        duration = datetime.now() - self.stats['start_time']
        
        logger.info("\n" + "=" * 70)
        logger.info("📊 TỔNG KẾT SYNC CUSTOMER DETAIL")
        logger.info("=" * 70)
        logger.info(f"   👥 Tổng customers: {self.stats['total_customers']}")
        logger.info(f"   ✅ Đã xử lý: {self.stats['processed']}")
        logger.info(f"   ❌ Lỗi: {self.stats['errors']}")
        logger.info(f"   📦 Services: {self.stats['services_saved']}")
        logger.info(f"   💊 Treatments: {self.stats['treatments_saved']}")
        logger.info(f"   💰 Payments: {self.stats['payments_saved']}")
        logger.info(f"   📅 Appointments: {self.stats['appointments_saved']}")
        logger.info(f"   📜 History: {self.stats['history_saved']}")
        logger.info(f"   ⏱️ Thời gian: {duration}")
        logger.info("=" * 70)
        
        # Hiển thị thống kê từ DB
        self.show_db_stats()
    
    def show_db_stats(self):
        """Hiển thị thống kê từ database"""
        conn = self.get_conn()
        try:
            tables = [
                ('customer_services', 'Services'),
                ('customer_treatments', 'Treatments'),
                ('customer_payments', 'Payments'),
                ('customer_appointments', 'Appointments'),
                ('customer_history', 'History')
            ]
            
            logger.info("\n📈 THỐNG KÊ DATABASE:")
            for table, label in tables:
                try:
                    cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
                    count = cursor.fetchone()['count']
                    logger.info(f"   - {label}: {count} records")
                except:
                    pass
            
        except Exception as e:
            logger.error(f"Error getting DB stats: {e}")
        finally:
            conn.close()


def main():
    parser = argparse.ArgumentParser(description='Sync Customer Detail từ VTTech')
    parser.add_argument('--date', type=str, help='Chỉ sync customers updated trong ngày này (YYYY-MM-DD)')
    parser.add_argument('--date-from', type=str, help='Ngày bắt đầu khoảng thời gian (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str, help='Ngày kết thúc khoảng thời gian (YYYY-MM-DD)')
    parser.add_argument('--limit', type=int, help='Giới hạn số customers để sync (cho test)')
    parser.add_argument('--customer-id', type=int, help='Sync chi tiết của một customer cụ thể')
    
    args = parser.parse_args()
    
    syncer = CustomerDetailSync()
    
    if args.customer_id:
        # Sync một customer cụ thể
        syncer.ensure_tables()
        if syncer.login():
            result = syncer.sync_customer_detail(args.customer_id)
            logger.info(f"Result: {result}")
    else:
        # Sync tất cả customers
        if args.date_from and args.date_to:
            # Sync theo khoảng thời gian
            syncer.sync_all_customer_details(
                date_from=args.date_from, 
                date_to=args.date_to, 
                limit=args.limit
            )
        else:
            # Nếu có --date, sử dụng date đó, nếu không dùng ngày hôm nay
            sync_date = args.date or datetime.now().strftime('%Y-%m-%d')
            syncer.sync_all_customer_details(sync_date=sync_date, limit=args.limit)


if __name__ == "__main__":
    main()
