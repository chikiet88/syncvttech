#!/usr/bin/env python3
"""
VTTech Unified Sync Script
Sync toàn bộ dữ liệu từ VTTech API vào database SQLite

Usage:
    python3 unified_sync.py                 # Sync tất cả
    python3 unified_sync.py --master        # Chỉ sync master data
    python3 unified_sync.py --revenue       # Chỉ sync revenue
    python3 unified_sync.py --customers     # Chỉ sync customers
    python3 unified_sync.py --date 2025-12-25  # Sync cho ngày cụ thể
"""

import requests
import json
import base64
import zlib
import re
import sqlite3
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# ============== CONFIGURATION ==============
BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / 'database' / 'vttech.db'
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f'unified_sync_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class VTTechUnifiedSync:
    """
    Unified sync class để sync tất cả dữ liệu từ VTTech
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        })
        self.token = None
        self.xsrf_token = None
        self.db_conn = None
        self.stats = {
            'master': 0,
            'revenue': 0,
            'customers': 0,
            'customer_detail': 0,
            'appointments': 0,
            'errors': 0
        }
    
    def decompress(self, data: str) -> Any:
        """Giải nén response base64+gzip"""
        try:
            data = data.strip('"')
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
            resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
                'username': USERNAME,
                'password': PASSWORD,
                'passwordcrypt': '',
                'from': '',
                'sso': '',
                'ssotoken': ''
            })
            data = resp.json()
            
            if data.get('Session'):
                self.token = data['Session']
                self.session.cookies.set('WebToken', self.token)
                logger.info(f"✅ Login: {data.get('FullName')} (ID: {data.get('ID')})")
                
                # Get XSRF token
                resp = self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID=1')
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_token = match.group(1)
                    logger.info("✅ Got XSRF token")
                
                return True
            else:
                logger.error(f"❌ Login failed: {data.get('RESULT')}")
                return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
    
    def call_handler(self, page: str, handler: str, data: dict = None) -> Any:
        """Gọi page handler"""
        try:
            form_data = {'__RequestVerificationToken': self.xsrf_token or ''}
            if data:
                form_data.update(data)
            
            resp = self.session.post(
                f'{BASE_URL}{page}?handler={handler}',
                data=form_data,
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'xsrf-token': self.xsrf_token or '',
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            )
            
            if resp.status_code == 200 and not resp.text.startswith('<!DOCTYPE'):
                return self.decompress(resp.text)
            return None
        except Exception as e:
            logger.error(f"❌ Handler error {page}?handler={handler}: {e}")
            self.stats['errors'] += 1
            return None

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
    
    def call_api(self, endpoint: str, data: dict = None) -> Any:
        """Gọi API endpoint"""
        try:
            resp = self.session.post(
                f'{BASE_URL}{endpoint}',
                json=data or {},
                headers={
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if resp.status_code == 200:
                return self.decompress(resp.text)
            return None
        except Exception as e:
            logger.error(f"❌ API error {endpoint}: {e}")
            self.stats['errors'] += 1
            return None
    
    def connect_db(self):
        """Kết nối database"""
        self.db_conn = sqlite3.connect(DB_PATH)
        self.db_conn.row_factory = sqlite3.Row
        logger.info(f"📦 Connected to {DB_PATH}")
        self.ensure_tables()

    def ensure_tables(self):
        """Đảm bảo các bảng cần thiết tồn tại"""
        cursor = self.db_conn.cursor()
        
        # 1. Bảng customers (nếu chưa có)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY,
                name TEXT,
                phone TEXT,
                email TEXT,
                branch_id INTEGER,
                source_id INTEGER,
                code TEXT,
                created_at DATETIME,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 2. Bảng customer_payments
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                payment_id INTEGER,
                amount REAL DEFAULT 0,
                payment_date DATETIME,
                payment_method TEXT,
                note TEXT,
                signature_data TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, payment_id)
            )
        ''')
        
        # 3. Bảng customer_installments [NEW]
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_installments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                installment_id INTEGER,
                total_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                remain_amount REAL DEFAULT 0,
                created_at DATETIME,
                note TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, installment_id)
            )
        ''')
        
        # 4. Bảng customer_complaints [NEW]
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                complaint_id INTEGER,
                content TEXT,
                status_name TEXT,
                created_at DATETIME,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, complaint_id)
            )
        ''', )
        
        # 5. Bảng customer_treatment_plans [NEW]
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_treatment_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                plan_id INTEGER,
                service_name TEXT,
                doctor_name TEXT,
                created_at DATETIME,
                note TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE(customer_id, plan_id)
            )
        ''')

        # 6. Bảng marketing_ticket_extensions [NEW]
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_ticket_extensions (
                id INTEGER PRIMARY KEY,
                name TEXT,
                code TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 7. Bảng marketing_ticket_groups [NEW]
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_ticket_groups (
                id INTEGER PRIMARY KEY,
                name TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.db_conn.commit()
    
    def close_db(self):
        """Đóng database"""
        if self.db_conn:
            self.db_conn.close()
    
    # ========== SYNC MASTER DATA ==========
    
    def sync_master_data(self):
        """Sync master data từ SessionData API"""
        logger.info("\n" + "="*60)
        logger.info("📦 SYNCING MASTER DATA")
        logger.info("="*60)
        
        data = self.call_api('/api/Home/SessionData', {})
        if not data:
            logger.error("❌ Cannot get SessionData")
            return
        
        cursor = self.db_conn.cursor()
        
        # Table mapping (API field -> DB column)
        tables = {
            'Table': ('branches', {'ID': 'id', 'Name': 'name', 'ShortName': 'code'}),
            'Table2': ('services', {'ID': 'id', 'Name': 'name', 'Code': 'code', 'CatID': 'group_id', 'Price': 'price', 'TimeToTreatment': 'duration'}),
            'Table3': ('service_groups', {'ID': 'id', 'Name': 'name'}),
            'Table4': ('employees', {'ID': 'id', 'Name': 'name', 'Code': 'code', 'Phone': 'phone', 'Email': 'email', 'BranchID': 'branch_id'}),
            'Table5': ('customer_sources', {'ID': 'id', 'Name': 'name'}),
            'Table10': ('cities', {'ID': 'id', 'Name': 'name'}),
            'Table9': ('wards', {'ID': 'id', 'Name': 'name', 'CityID': 'district_id'}),
        }
        
        for table_key, (table_name, field_mapping) in tables.items():
            if table_key in data and isinstance(data[table_key], list):
                records = data[table_key]
                count = 0
                
                for record in records:
                    try:
                        # Map API fields to DB columns
                        db_fields = []
                        values = []
                        for api_field, db_field in field_mapping.items():
                            if api_field in record:
                                db_fields.append(db_field)
                                values.append(record.get(api_field))
                        
                        if db_fields:
                            placeholders = ', '.join(['?' for _ in db_fields])
                            field_names = ', '.join(db_fields)
                            
                            cursor.execute(f'''
                                INSERT OR REPLACE INTO {table_name} ({field_names})
                                VALUES ({placeholders})
                            ''', values)
                            count += 1
                    except Exception as e:
                        pass
                
                self.db_conn.commit()
                self.stats['master'] += count
                logger.info(f"  ✅ {table_name}: {count} records")
        
        # Sync additional data from handlers
        
        # Employee groups
        emp_groups = self.call_handler('/Employee/EmployeeList/', 'LoadataEmployeeGroup')
        if emp_groups and isinstance(emp_groups, list):
            for g in emp_groups:
                cursor.execute('''
                    INSERT OR REPLACE INTO employee_groups (id, name)
                    VALUES (?, ?)
                ''', (g.get('ID'), g.get('Name')))
            self.db_conn.commit()
            logger.info(f"  ✅ employee_groups: {len(emp_groups)} records")
            self.stats['master'] += len(emp_groups)
        
        # Service types
        svc_types = self.call_handler('/Service/ServiceList/', 'LoadataServiceType')
        if svc_types and isinstance(svc_types, list):
            for t in svc_types:
                cursor.execute('''
                    INSERT OR REPLACE INTO service_types (id, name)
                    VALUES (?, ?)
                ''', (t.get('ID'), t.get('Name')))
            self.db_conn.commit()
            logger.info(f"  ✅ service_types: {len(svc_types)} records")
            self.stats['master'] += len(svc_types)
        
        # Appointment combos (includes many master data)
        combos = self.call_handler('/Appointment/AppointmentByDay/', 'LoadCombo')
        if combos and isinstance(combos, dict):
            # Memberships
            if 'Membership' in combos:
                for m in combos['Membership']:
                    cursor.execute('''
                        INSERT OR REPLACE INTO memberships (id, name)
                        VALUES (?, ?)
                    ''', (m.get('ID'), m.get('Name')))
                self.db_conn.commit()
                logger.info(f"  ✅ memberships: {len(combos['Membership'])} records")

        # Marketing Ticket Extensions [NEW]
        tickets = self.call_handler('/Marketing/TicketExtensionList/', 'LoadData')
        if tickets and isinstance(tickets, list):
            for t in tickets:
                cursor.execute('''
                    INSERT OR REPLACE INTO marketing_ticket_extensions (id, name, code)
                    VALUES (?, ?, ?)
                ''', (t.get('ID'), t.get('Name'), t.get('Code')))
            self.db_conn.commit()
            logger.info(f"  ✅ marketing_ticket_extensions: {len(tickets)} records")
            self.stats['master'] += len(tickets)

        # Marketing Ticket Groups [NEW]
        ticket_groups = self.call_handler('/Marketing/TicketGroupList/', 'LoadData')
        if ticket_groups and isinstance(ticket_groups, list):
            for g in ticket_groups:
                cursor.execute('''
                    INSERT OR REPLACE INTO marketing_ticket_groups (id, name)
                    VALUES (?, ?)
                ''', (g.get('ID'), g.get('Name')))
            self.db_conn.commit()
            logger.info(f"  ✅ marketing_ticket_groups: {len(ticket_groups)} records")
            self.stats['master'] += len(ticket_groups)
    
    # ========== SYNC REVENUE ==========
    
    def sync_revenue(self, date_from: str, date_to: str):
        """Sync revenue data"""
        logger.info("\n" + "="*60)
        logger.info(f"💰 SYNCING REVENUE ({date_from} to {date_to})")
        logger.info("="*60)
        
        cursor = self.db_conn.cursor()
        
        # Get branches first
        cursor.execute('SELECT ID, Name FROM branches')
        branches = cursor.fetchall()
        
        if not branches:
            # Fetch from API
            data = self.call_api('/api/Home/SessionData', {})
            if data and 'Table' in data:
                branches = [(b['ID'], b['Name']) for b in data['Table']]
        
        total_revenue = 0
        
        for branch_id, branch_name in branches:
            result = self.call_handler(
                '/Customer/ListCustomer/',
                'LoadDataTotal',
                {
                    'dateFrom': f'{date_from} 00:00:00',
                    'dateTo': f'{date_to} 23:59:59',
                    'branchID': branch_id
                }
            )
            
            if result and isinstance(result, list) and len(result) > 0:
                item = result[0]
                paid = item.get('Paid', 0) or 0
                total_revenue += paid
                
                # Insert revenue record
                cursor.execute('''
                    INSERT OR REPLACE INTO daily_revenue 
                    (date, branch_id, branch_name, paid, num_customers)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    date_from,
                    branch_id,
                    branch_name,
                    paid,
                    item.get('CustomerCount', 0)
                ))
                self.stats['revenue'] += 1
                
                if paid > 0:
                    logger.info(f"  ✅ {branch_name}: {paid:,.0f} VND")
        
        self.db_conn.commit()
        logger.info(f"  💰 Tổng doanh thu ngày {date_from}: {total_revenue:,.0f} VND")
    
    # ========== SYNC CUSTOMERS ==========
    
    def sync_customers(self, date_from: str, date_to: str, max_pages: int = 100, with_detail: bool = True, customer_ids: List[int] = None):
        """
        Sync customer list với chi tiết.
        
        Có 3 cách lấy customers:
        1. Nếu truyền customer_ids -> sync trực tiếp các ID đó
        2. Nếu có quyền appointment -> lấy từ appointments
        3. Nếu có quyền customer list -> lấy từ Customer/ListCustomer
        
        Lưu ý: User ittest123 không có quyền xem appointments và customer list,
        cần truyền customer_ids cụ thể.
        """
        logger.info("\n" + "="*60)
        logger.info(f"👥 SYNCING CUSTOMERS ({date_from} to {date_to})")
        logger.info("="*60)
        
        cursor = self.db_conn.cursor()
        total = 0
        synced_customer_ids = set()
        
        # Cách 1: Nếu có customer_ids được chỉ định
        if customer_ids:
            logger.info(f"  📋 Using provided customer IDs: {len(customer_ids)} customers")
            for cid in customer_ids:
                synced_customer_ids.add(cid)
        else:
            # Cách 2: Thử lấy từ appointments
            from datetime import datetime as dt, timedelta
            start_date = dt.strptime(date_from, '%Y-%m-%d')
            end_date = dt.strptime(date_to, '%Y-%m-%d')
            
            current_date = start_date
            appointments_found = False
            
            # Use branch IDs to ensure discovery if -1 is restricted
            cursor.execute('SELECT id FROM branches')
            branch_ids = [row[0] for row in cursor.fetchall()]
            if not branch_ids: branch_ids = [-1]
            
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                
                for bid in ([-1] + branch_ids):
                    appointments = self.call_handler(
                        '/Appointment/AppointmentByDay/',
                        'LoadData',
                        {'date': date_str, 'branchID': bid, 'statusID': -1, 'type': 0}
                    )
                    
                    if appointments and isinstance(appointments, list) and len(appointments) > 0:
                        appointments_found = True
                        for apt in appointments:
                            customer_id = apt.get('CustomerID')
                            if customer_id and customer_id not in synced_customer_ids:
                                cursor.execute('''
                                    INSERT OR REPLACE INTO customers 
                                    (id, name, phone, branch_id, created_at)
                                    VALUES (?, ?, ?, ?, ?)
                                ''', (
                                    customer_id,
                                    apt.get('CustomerName'),
                                    apt.get('CustomerPhone') or apt.get('Phone'),
                                    apt.get('BranchID'),
                                    apt.get('CreatedDate') or date_str
                                ))
                                total += 1
                                synced_customer_ids.add(customer_id)
                
                current_date += timedelta(days=1)
            
            if not appointments_found:
                # Cách 3: Thử lấy từ Customer/ListCustomer
                logger.info("  ⚠️ No appointments found, trying Customer List API...")
                page_size = 100
                
                for bid in ([-1] + branch_ids):
                    start = 0
                    while start < max_pages * page_size:
                        result = self.call_handler(
                            '/Customer/ListCustomer/',
                            'LoadData',
                            {
                                'dateFrom': f'{date_from} 00:00:00',
                                'dateTo': f'{date_to} 23:59:59',
                                'branchID': bid,
                                'start': start,
                                'length': page_size
                            }
                        )
                        
                        if not result or not isinstance(result, list) or len(result) == 0:
                            break
                        
                        for c in result:
                            customer_id = c.get('ID')
                            if customer_id and customer_id not in synced_customer_ids:
                                cursor.execute('''
                                    INSERT OR REPLACE INTO customers 
                                    (id, name, phone, email, branch_id, source_id, created_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?)
                                ''', (
                                    customer_id, c.get('Name'), c.get('Phone'), c.get('Email'),
                                    c.get('BranchID'), c.get('SourceID'), c.get('CreatedDate')
                                ))
                                total += 1
                                synced_customer_ids.add(customer_id)
                        
                        if len(result) < page_size:
                            break
                        start += page_size
        
        self.db_conn.commit()
        self.stats['customers'] = total
        
        if not synced_customer_ids:
            logger.warning("  ⚠️ No customers found. User may not have permission to access customer data.")
            logger.warning("  💡 Tip: Use --customer-ids 1,2,3 to sync specific customers")
            return
        
        logger.info(f"  ✅ Total customers synced: {total}")
        
        # Sync chi tiết cho từng customer
        if with_detail and synced_customer_ids:
            logger.info(f"\n  📋 Syncing details for {len(synced_customer_ids)} customers...")
            detail_count = 0
            customer_list = list(synced_customer_ids)
            for i, cid in enumerate(customer_list, 1):
                try:
                    detail_records = self.sync_customer_detail_for_id(cid)
                    detail_count += detail_records
                    if i % 10 == 0 or i == len(customer_list):
                        logger.info(f"    Progress: {i}/{len(customer_list)} customers, {detail_count} detail records")
                except Exception as e:
                    logger.warning(f"    ⚠️ Customer {cid}: {e}")
            
            self.stats['customer_detail'] += detail_count
            logger.info(f"  ✅ Total customer details synced: {detail_count}")
    
    # ========== SYNC CUSTOMER DETAIL ==========
    
    def sync_customer_detail_for_id(self, customer_id: int) -> int:
        """
        Sync chi tiết cho 1 customer cụ thể, lưu vào database.
        
        Cấu trúc API:
        - LoadataTab: Dịch vụ của customer (Table, Table1)
        - LoadataTreatment: Lịch sử điều trị (Table, Table1, DataTotal)
        - LoadataPayment: Thanh toán (Table, Table1, Table2)
        - Loadata (Schedule): Lịch hẹn của customer
        - LoadataHistory: Lịch sử chăm sóc
        """
        # Initialize session với CustomerID - BẮT BUỘC
        self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}')
        
        cursor = self.db_conn.cursor()
        total_records = 0
        
        # ====== 1. SYNC DỊCH VỤ CỦA KHÁCH HÀNG ======
        # LoadataTab trả về dịch vụ khách đã mua (KHÔNG PHẢI LoadServiceTab)
        services_data = self.call_handler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', data={'CustomerID': customer_id})
        if services_data and isinstance(services_data, dict):
            # Table: Dịch vụ đã mua
            table = services_data.get('Table', [])
            if table and isinstance(table, list):
                for svc in table:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_services 
                            (customer_id, service_id, service_name, quantity, price, discount, total, created_at, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            svc.get('ServiceID') or svc.get('ID'),
                            svc.get('ServiceName') or svc.get('Name'),
                            svc.get('Quantity') or svc.get('Qty', 1),
                            svc.get('Price') or svc.get('UnitPrice', 0),
                            svc.get('Discount', 0),
                            svc.get('Total') or svc.get('Amount', 0),
                            svc.get('CreatedDate') or svc.get('Date'),
                            svc.get('Status') or svc.get('StatusName', '')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass
        
        # ====== 2. SYNC ĐIỀU TRỊ CỦA KHÁCH HÀNG ======
        treatments_data = self.call_handler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadDetail', data={'CustomerID': customer_id})
        if treatments_data and isinstance(treatments_data, dict):
            # Table: Lịch sử điều trị chi tiết
            table = treatments_data.get('Table', [])
            if table and isinstance(table, list):
                for treat in table:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_treatments 
                            (customer_id, treatment_id, service_name, employee_name, treatment_date, status, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            treat.get('ID') or treat.get('TreatmentID') or treat.get('TabID'),
                            treat.get('ServiceName') or treat.get('Name') or treat.get('SerCode', ''),
                            treat.get('EmployeeName') or treat.get('Doctor') or str(treat.get('Created_By', '')),
                            treat.get('TreatmentDate') or treat.get('Date') or treat.get('CreatedDate') or treat.get('Created'),
                            treat.get('Status') or treat.get('StatusName', ''),
                            treat.get('Note') or treat.get('Remark', '')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass
        
        # ====== 3. SYNC THANH TOÁN CỦA KHÁCH HÀNG ======
        payments_data = self.call_handler('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment', data={'CustomerID': customer_id})
        if payments_data and isinstance(payments_data, dict):
            # Table: Chi tiết thanh toán
            table = payments_data.get('Table', [])
            if table and isinstance(table, list):
                for pay in table:
                    try:
                        payment_id = pay.get('ID') or pay.get('PaymentID')
                        signature = self.get_payment_signature(payment_id) if payment_id else ""
                        
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_payments 
                            (customer_id, payment_id, amount, payment_date, payment_method, note, signature_data)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            payment_id,
                            pay.get('Amount') or pay.get('Paid') or pay.get('Total', 0),
                            pay.get('PaymentDate') or pay.get('Date') or pay.get('CreatedDate'),
                            pay.get('PaymentMethod') or pay.get('Method', ''),
                            pay.get('Note') or pay.get('Remark', ''),
                            signature
                        ))
                        total_records += 1
                    except Exception as e:
                        pass
        
        # ====== 4. SYNC LỊCH HẸN CỦA KHÁCH HÀNG ======
        schedules_data = self.call_handler('/Customer/MainCustomer/', 'LoadCustomerScheduleNext', data={'CustomerID': customer_id})
        if schedules_data:
            # Có thể là list hoặc dict
            schedules = schedules_data if isinstance(schedules_data, list) else schedules_data.get('Table', [])
            if schedules and isinstance(schedules, list):
                for sch in schedules:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_appointments 
                            (customer_id, appointment_id, appointment_date, service_name, branch_id, status, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            sch.get('ID') or sch.get('AppointmentID'),
                            sch.get('AppointmentDate') or sch.get('Date') or sch.get('ScheduleDate') or sch.get('DateFrom'),
                            sch.get('ServiceName') or sch.get('Service') or sch.get('ScheCode', ''),
                            sch.get('BranchID') or sch.get('Branch', ''),
                            sch.get('Status') or sch.get('StatusName', ''),
                            sch.get('Note') or sch.get('Remark', '')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass
        
        # ====== 5. SYNC LỊCH SỬ CHĂM SÓC ======
        history_data = self.call_handler('/Customer/History/HistoryList_Care/', 'LoadataHistory', data={'CustomerID': customer_id})
        if history_data:
            # Có thể là list hoặc dict
            history = history_data if isinstance(history_data, list) else history_data.get('Table', [])
            if history and isinstance(history, list):
                for h in history:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_history 
                            (customer_id, history_id, action_type, action_date, employee_name, note)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            h.get('ID') or h.get('HistoryID'),
                            h.get('ActionType') or h.get('Type') or h.get('Action', ''),
                            h.get('ActionDate') or h.get('Date') or h.get('CreatedDate'),
                            h.get('EmployeeName') or h.get('Employee', ''),
                            h.get('Note') or h.get('Content') or h.get('Remark', '')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass
        
        # ====== 6. SYNC KẾ HOẠCH ĐIỀU TRỊ [NEW] ======
        plans_data = self.call_handler('/Customer/Service/TabList/TabList_Service/', 'LoadInfo_Treatment_Plant', data={'CustomerID': customer_id})
        if plans_data and isinstance(plans_data, dict):
            table = plans_data.get('Table', [])
            if table and isinstance(table, list):
                for plan in table:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_treatment_plans 
                            (customer_id, plan_id, service_name, doctor_name, created_at, note)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            plan.get('ID'),
                            plan.get('ServiceName'),
                            plan.get('DoctorName'),
                            plan.get('CreatedByDate'),
                            plan.get('Note')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass

        # ====== 7. SYNC TRẢ GÓP [NEW] ======
        installments_data = self.call_handler('/Customer/Installment/InstallmentList/', 'LoadDetail', data={'CustomerID': customer_id})
        if installments_data and isinstance(installments_data, dict):
            table = installments_data.get('Table', [])
            if table and isinstance(table, list):
                for ins in table:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_installments 
                            (customer_id, installment_id, total_amount, paid_amount, remain_amount, created_at, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            ins.get('ID'),
                            ins.get('TotalAmount'),
                            ins.get('PaidAmount'),
                            ins.get('RemainAmount'),
                            ins.get('CreatedDate'),
                            ins.get('Note')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass

        # ====== 8. SYNC KHIẾU NẠI [NEW] ======
        complaints_data = self.call_handler('/Customer/ComplaintList/', 'Loadata', data={'CustomerID': customer_id})
        if complaints_data:
            table = complaints_data if isinstance(complaints_data, list) else complaints_data.get('Table', [])
            if table and isinstance(table, list):
                for comp in table:
                    try:
                        cursor.execute('''
                            INSERT OR REPLACE INTO customer_complaints 
                            (customer_id, complaint_id, content, status_name, created_at)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (
                            customer_id,
                            comp.get('ID'),
                            comp.get('Content'),
                            comp.get('StatusName'),
                            comp.get('CreatedDate')
                        ))
                        total_records += 1
                    except Exception as e:
                        pass

        self.db_conn.commit()
        return total_records
    
    def sync_customer_detail(self, customer_id: int = 1):
        """Sync customer detail endpoints - lấy dữ liệu của 1 khách hàng cụ thể"""
        logger.info("\n" + "="*60)
        logger.info(f"📋 SYNCING CUSTOMER DETAIL DATA (CustomerID={customer_id})")
        logger.info("="*60)
        
        # Initialize session với CustomerID - BẮT BUỘC phải GET trang customer trước
        self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}')
        
        from pathlib import Path
        output_dir = BASE_DIR / 'data_sync' / 'customer_detail'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        today = datetime.now().strftime('%Y%m%d')
        
        # ENDPOINTS CHO CUSTOMER DETAIL:
        # - LoadataTab: Dịch vụ của customer (Table key) - ĐÂY LÀ ĐÚNG
        # - LoadServiceTab: Master data tất cả services (Service, ServiceType keys) - KHÔNG DÙNG
        # - LoadataTreatment: Điều trị của customer
        # - LoadataPayment: Thanh toán của customer
        # - LoadataHistory: Lịch sử của customer
        # - Loadata: Lịch hẹn của customer
        
        endpoints = {
            # Tab Dịch vụ - CUSTOMER DATA
            'service_initialize': ('/Customer/Service/TabList/TabList_Service/', 'LoadInitialize'),
            'customer_services': ('/Customer/Service/TabList/TabList_Service/', 'LoadataTab'),  # Dịch vụ của customer
            'treatment_plant': ('/Customer/Service/TabList/TabList_Service/', 'LoadInfo_Treatment_Plant'),
            
            # Tab Điều trị - CUSTOMER DATA
            'treatment_combo': ('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadComboMain'),
            'customer_treatments': ('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment'),  # Điều trị của customer
            
            # Thanh toán - CUSTOMER DATA
            'customer_payments': ('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment'),
            
            # Hình ảnh
            'image_folder': ('/Customer/CustomerImage/', 'LoadImageByFolder'),
            'image_template': ('/Customer/CustomerImage/', 'LoadTemplateForm'),
            
            # Trả góp
            'installment': ('/Customer/Installment/InstallmentList/', 'LoadDetail'),
            
            # Lịch sử - CUSTOMER DATA
            'customer_history': ('/Customer/History/HistoryList_Care/', 'LoadataHistory'),
            
            # Lịch hẹn - CUSTOMER DATA
            'appointment_combo': ('/Appointment/AppointmentByDay/', 'LoadCombo'),
            'customer_schedule': ('/Customer/ScheduleList_Schedule/', 'Loadata'),
            
            # Complaint
            'complaint': ('/Customer/ComplaintList/', 'Loadata'),
            
            # MASTER DATA (không dùng cho customer detail)
            # 'service_list_MASTER': ('/Customer/Service/TabList/TabList_Service/', 'LoadServiceTab'),  # 1047 services
        }
        
        results = {}
        total_records = 0
        
        for name, (page, handler) in endpoints.items():
            data = self.call_handler(page, handler)
            
            if data is not None:
                results[name] = data
                
                # Count records
                if isinstance(data, list):
                    count = len(data)
                elif isinstance(data, dict):
                    count = sum(len(v) if isinstance(v, list) else 1 for v in data.values())
                else:
                    count = 1
                
                total_records += count
                logger.info(f"  ✅ {name}: {count} records")
                
                # Save individual file
                filepath = output_dir / f'{name}_{today}.json'
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                logger.warning(f"  ❌ {name}: Failed")
        
        # Save combined file
        combined_file = output_dir / f'all_customer_detail_{today}.json'
        with open(combined_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        self.stats['customer_detail'] = total_records
        logger.info(f"  💾 Saved to {output_dir}")
        logger.info(f"  📊 Total: {total_records} records from {len(results)}/{len(endpoints)} endpoints")
        
        return results
    
    # ========== MAIN SYNC ==========
    
    def run_full_sync(self, date: str = None, sync_master: bool = True, 
                      sync_revenue: bool = True, sync_customers: bool = True,
                      sync_customer_detail: bool = True, customer_ids: List[int] = None):
        """Chạy full sync"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        logger.info("\n" + "╔" + "═"*60 + "╗")
        logger.info("║" + " VTTECH UNIFIED SYNC ".center(60) + "║")
        logger.info("║" + f" Date: {date} ".center(60) + "║")
        logger.info("╚" + "═"*60 + "╝")
        
        # Login
        if not self.login():
            return False
        
        # Connect DB
        self.connect_db()
        
        try:
            if sync_master:
                self.sync_master_data()
            
            if sync_revenue:
                self.sync_revenue(date, date)
            
            if sync_customers:
                self.sync_customers(date, date, customer_ids=customer_ids)
            
            if sync_customer_detail:
                self.sync_customer_detail()
            
            # Log summary
            logger.info("\n" + "="*60)
            logger.info("📊 SYNC SUMMARY")
            logger.info("="*60)
            logger.info(f"  Master records: {self.stats['master']}")
            logger.info(f"  Revenue records: {self.stats['revenue']}")
            logger.info(f"  Customer records: {self.stats['customers']}")
            logger.info(f"  Customer detail records: {self.stats['customer_detail']}")
            logger.info(f"  Errors: {self.stats['errors']}")
            
            # Log to crawl_logs table
            cursor = self.db_conn.cursor()
            cursor.execute('''
                INSERT INTO crawl_logs (crawl_date, crawl_type, status, records_count)
                VALUES (?, ?, ?, ?)
            ''', (
                date,
                'unified_sync',
                'SUCCESS' if self.stats['errors'] == 0 else 'PARTIAL',
                self.stats['master'] + self.stats['revenue'] + self.stats['customers'] + self.stats['customer_detail']
            ))
            self.db_conn.commit()
            
            return True
            
        finally:
            self.close_db()


def main():
    parser = argparse.ArgumentParser(description='VTTech Unified Sync')
    parser.add_argument('--date', type=str, help='Sync date (YYYY-MM-DD)')
    parser.add_argument('--master', action='store_true', help='Sync only master data')
    parser.add_argument('--revenue', action='store_true', help='Sync only revenue')
    parser.add_argument('--customers', action='store_true', help='Sync only customers')
    parser.add_argument('--customer-detail', action='store_true', help='Sync only customer detail')
    parser.add_argument('--customer-ids', type=str, help='Comma-separated customer IDs to sync (e.g., 1,2,3,100)')
    
    args = parser.parse_args()
    
    sync = VTTechUnifiedSync()
    
    # Parse customer IDs nếu có
    customer_ids = None
    if args.customer_ids:
        customer_ids = [int(x.strip()) for x in args.customer_ids.split(',') if x.strip().isdigit()]
        if customer_ids:
            # Nếu có customer_ids, mặc định sync customers
            if not args.customers and not args.master and not args.revenue:
                args.customers = True
    
    # Determine what to sync
    if args.master or args.revenue or args.customers or getattr(args, 'customer_detail', False):
        sync.run_full_sync(
            date=args.date,
            sync_master=args.master,
            sync_revenue=args.revenue,
            sync_customers=args.customers,
            sync_customer_detail=getattr(args, 'customer_detail', False),
            customer_ids=customer_ids
        )
    else:
        # Sync all
        sync.run_full_sync(date=args.date, customer_ids=customer_ids)


if __name__ == '__main__':
    main()
