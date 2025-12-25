#!/usr/bin/env python3
"""
VTTech Sync Date Range
Sync dữ liệu trong khoảng ngày và lưu vào database

Usage:
    python3 sync_date_range.py                          # Sync hôm nay
    python3 sync_date_range.py --from 2025-12-01        # Từ ngày đến hôm nay
    python3 sync_date_range.py --from 2025-12-01 --to 2025-12-25  # Khoảng ngày
    python3 sync_date_range.py --days 7                 # 7 ngày gần nhất
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
from typing import Any, Dict, List

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
        logging.FileHandler(LOG_DIR / f'sync_range_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DateRangeSync:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        })
        self.token = None
        self.xsrf_token = None
        self.db_conn = None
        
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
        """Đăng nhập"""
        logger.info("🔐 Đang đăng nhập...")
        try:
            resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
                'username': USERNAME,
                'password': PASSWORD,
                'passwordcrypt': '', 'from': '', 'sso': '', 'ssotoken': ''
            })
            data = resp.json()
            
            if data.get('Session'):
                self.token = data['Session']
                self.session.cookies.set('WebToken', self.token)
                logger.info(f"✅ Login: {data.get('FullName')} (ID: {data.get('ID')})")
                
                # Get XSRF token
                resp = self.session.get(f'{BASE_URL}/Customer/ListCustomer')
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_token = match.group(1)
                    logger.info("✅ Got XSRF token")
                
                return True
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
            logger.error(f"❌ Handler error: {e}")
            return None
    
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
        except:
            return None
    
    def connect_db(self):
        """Kết nối database"""
        self.db_conn = sqlite3.connect(DB_PATH)
        self.db_conn.row_factory = sqlite3.Row
        logger.info(f"📦 Connected to {DB_PATH}")
    
    def sync_master_data(self):
        """Sync master data"""
        logger.info("\n📦 SYNCING MASTER DATA...")
        
        data = self.call_api('/api/Home/SessionData', {})
        if not data:
            logger.error("❌ Cannot get SessionData")
            return 0
        
        cursor = self.db_conn.cursor()
        count = 0
        
        # Branches
        if 'Table' in data:
            for b in data['Table']:
                cursor.execute('INSERT OR REPLACE INTO branches (id, name, code) VALUES (?, ?, ?)',
                              (b.get('ID'), b.get('Name'), b.get('ShortName')))
                count += 1
        
        # Services
        if 'Table2' in data:
            for s in data['Table2']:
                cursor.execute('INSERT OR REPLACE INTO services (id, name, code, group_id, price) VALUES (?, ?, ?, ?, ?)',
                              (s.get('ID'), s.get('Name'), s.get('Code'), s.get('CatID'), s.get('Price')))
                count += 1
        
        # Service Groups
        if 'Table3' in data:
            for g in data['Table3']:
                cursor.execute('INSERT OR REPLACE INTO service_groups (id, name) VALUES (?, ?)',
                              (g.get('ID'), g.get('Name')))
                count += 1
        
        # Employees
        if 'Table4' in data:
            for e in data['Table4']:
                cursor.execute('INSERT OR REPLACE INTO employees (id, name, code, phone, email, branch_id) VALUES (?, ?, ?, ?, ?, ?)',
                              (e.get('ID'), e.get('Name'), e.get('Code'), e.get('Phone'), e.get('Email'), e.get('BranchID')))
                count += 1
        
        # Customer Sources
        if 'Table5' in data:
            for s in data['Table5']:
                cursor.execute('INSERT OR REPLACE INTO customer_sources (id, name) VALUES (?, ?)',
                              (s.get('ID'), s.get('Name')))
                count += 1
        
        self.db_conn.commit()
        logger.info(f"  ✅ Master data: {count} records")
        return count
    
    def sync_revenue_for_date(self, date: str):
        """Sync revenue cho 1 ngày"""
        cursor = self.db_conn.cursor()
        
        # Get branches
        cursor.execute('SELECT id, name FROM branches')
        branches = cursor.fetchall()
        
        total_revenue = 0
        
        for branch_id, branch_name in branches:
            result = self.call_handler(
                '/Customer/ListCustomer/',
                'LoadDataTotal',
                {
                    'dateFrom': f'{date} 00:00:00',
                    'dateTo': f'{date} 23:59:59',
                    'branchID': branch_id
                }
            )
            
            if result and isinstance(result, list) and len(result) > 0:
                item = result[0]
                paid = item.get('Paid', 0) or 0
                paid_new = item.get('PaidNew', 0) or 0
                num_cust = item.get('PaidNumCust', 0) or 0
                num_cust_new = item.get('PaidNumCust_New', 0) or 0
                
                cursor.execute('''
                    INSERT OR REPLACE INTO daily_revenue 
                    (date, branch_id, branch_name, paid, paid_new, num_customers)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (date, branch_id, branch_name, paid, paid_new, num_cust))
                
                total_revenue += paid
        
        self.db_conn.commit()
        return total_revenue
    
    def sync_revenue_range(self, date_from: str, date_to: str):
        """Sync revenue cho khoảng ngày"""
        logger.info(f"\n💰 SYNCING REVENUE ({date_from} to {date_to})...")
        
        start = datetime.strptime(date_from, '%Y-%m-%d')
        end = datetime.strptime(date_to, '%Y-%m-%d')
        
        total_days = (end - start).days + 1
        grand_total = 0
        
        current = start
        day_count = 0
        
        while current <= end:
            date_str = current.strftime('%Y-%m-%d')
            day_count += 1
            
            revenue = self.sync_revenue_for_date(date_str)
            grand_total += revenue
            
            if revenue > 0:
                logger.info(f"  📅 {date_str}: {revenue:,.0f} VND")
            
            # Progress
            if day_count % 5 == 0:
                logger.info(f"  ... Progress: {day_count}/{total_days} days")
            
            current += timedelta(days=1)
        
        logger.info(f"  ✅ Total: {grand_total:,.0f} VND over {total_days} days")
        return grand_total
    
    def sync_customers_from_list(self, date_from: str, date_to: str, max_records: int = 10000):
        """Lấy danh sách customers từ LoadData"""
        logger.info(f"\n👥 SYNCING CUSTOMERS ({date_from} to {date_to})...")
        
        cursor = self.db_conn.cursor()
        customer_ids = set()
        page_size = 100
        start = 0
        
        while start < max_records:
            result = self.call_handler(
                '/Customer/ListCustomer/',
                'LoadData',
                {
                    'dateFrom': f'{date_from} 00:00:00',
                    'dateTo': f'{date_to} 23:59:59',
                    'branchID': -1,
                    'start': start,
                    'length': page_size
                }
            )
            
            if not result or not isinstance(result, list) or len(result) == 0:
                break
            
            for c in result:
                cust_id = c.get('ID') or c.get('CustID')
                if cust_id:
                    cursor.execute('''
                        INSERT OR REPLACE INTO customers 
                        (id, code, name, phone, email, gender, branch_id, source_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        cust_id,
                        c.get('Code'),
                        c.get('Name'),
                        c.get('Phone'),
                        c.get('Email'),
                        c.get('Gender'),
                        c.get('BranchID'),
                        c.get('SourceID'),
                        c.get('CreatedDate')
                    ))
                    customer_ids.add(cust_id)
            
            if len(result) < page_size:
                break
            start += page_size
            
            if start % 500 == 0:
                logger.info(f"  ... Loaded {len(customer_ids)} customers")
        
        self.db_conn.commit()
        logger.info(f"  ✅ Customers: {len(customer_ids)} records")
        return list(customer_ids)
    
    def sync_customer_detail(self, customer_id: int) -> int:
        """Sync chi tiết 1 customer"""
        # Set context
        self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}')
        
        cursor = self.db_conn.cursor()
        count = 0
        
        # Services
        data = self.call_handler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab')
        if data and isinstance(data, dict):
            for svc in data.get('Table', []):
                cursor.execute('''
                    INSERT OR REPLACE INTO customer_services 
                    (customer_id, service_id, service_name, quantity, price, total, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer_id,
                    svc.get('ServiceID') or svc.get('ID'),
                    svc.get('ServiceName') or svc.get('Name'),
                    svc.get('Quantity') or svc.get('Qty', 1),
                    svc.get('Price') or svc.get('UnitPrice', 0),
                    svc.get('Total') or svc.get('Amount', 0),
                    svc.get('Status', '')
                ))
                count += 1
        
        # Treatments
        data = self.call_handler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment')
        if data and isinstance(data, dict):
            for t in data.get('Table', []):
                cursor.execute('''
                    INSERT OR REPLACE INTO customer_treatments 
                    (customer_id, treatment_id, service_name, employee_name, treatment_date, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    customer_id,
                    t.get('ID'),
                    t.get('ServiceName') or t.get('Name'),
                    t.get('EmployeeName'),
                    t.get('TreatmentDate') or t.get('Date'),
                    t.get('Status', '')
                ))
                count += 1
        
        # Payments
        data = self.call_handler('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment')
        if data and isinstance(data, dict):
            for p in data.get('Table', []):
                cursor.execute('''
                    INSERT OR REPLACE INTO customer_payments 
                    (customer_id, payment_id, amount, payment_date, payment_method)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    customer_id,
                    p.get('ID'),
                    p.get('Amount') or p.get('Paid', 0),
                    p.get('PaymentDate') or p.get('Date'),
                    p.get('PaymentMethod', '')
                ))
                count += 1
        
        self.db_conn.commit()
        return count
    
    def run(self, date_from: str, date_to: str, sync_details: bool = False):
        """Chạy sync"""
        logger.info("\n" + "═"*60)
        logger.info(f"  VTTECH DATE RANGE SYNC")
        logger.info(f"  From: {date_from} To: {date_to}")
        logger.info("═"*60)
        
        if not self.login():
            return False
        
        self.connect_db()
        
        try:
            # Sync master data
            master_count = self.sync_master_data()
            
            # Sync revenue
            revenue_total = self.sync_revenue_range(date_from, date_to)
            
            # Sync customers (nếu có quyền)
            customer_ids = self.sync_customers_from_list(date_from, date_to)
            
            # Sync customer details
            detail_count = 0
            if sync_details and customer_ids:
                logger.info(f"\n📋 SYNCING CUSTOMER DETAILS ({len(customer_ids)} customers)...")
                for i, cid in enumerate(customer_ids, 1):
                    count = self.sync_customer_detail(cid)
                    detail_count += count
                    if i % 10 == 0:
                        logger.info(f"  ... Progress: {i}/{len(customer_ids)} customers")
                logger.info(f"  ✅ Details: {detail_count} records")
            
            # Summary
            logger.info("\n" + "═"*60)
            logger.info("📊 SYNC SUMMARY")
            logger.info("═"*60)
            logger.info(f"  Master data: {master_count:,} records")
            logger.info(f"  Revenue total: {revenue_total:,.0f} VND")
            logger.info(f"  Customers: {len(customer_ids):,} records")
            logger.info(f"  Details: {detail_count:,} records")
            
            # Log to database
            cursor = self.db_conn.cursor()
            cursor.execute('''
                INSERT INTO crawl_logs (crawl_date, crawl_type, status, records_count)
                VALUES (?, ?, ?, ?)
            ''', (date_to, 'date_range_sync', 'SUCCESS', master_count + len(customer_ids) + detail_count))
            self.db_conn.commit()
            
            return True
            
        finally:
            if self.db_conn:
                self.db_conn.close()


def main():
    parser = argparse.ArgumentParser(description='VTTech Date Range Sync')
    parser.add_argument('--from', dest='date_from', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--to', dest='date_to', type=str, help='End date (YYYY-MM-DD)')
    parser.add_argument('--days', type=int, help='Number of days to sync (from today)')
    parser.add_argument('--details', action='store_true', help='Also sync customer details')
    
    args = parser.parse_args()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    if args.days:
        date_from = (datetime.now() - timedelta(days=args.days-1)).strftime('%Y-%m-%d')
        date_to = today
    elif args.date_from:
        date_from = args.date_from
        date_to = args.date_to or today
    else:
        date_from = today
        date_to = today
    
    sync = DateRangeSync()
    sync.run(date_from, date_to, sync_details=args.details)


if __name__ == '__main__':
    main()
