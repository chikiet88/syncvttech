#!/usr/bin/env python3
"""
VTTech Unified Sync Script
Migrated to PostgreSQL via Prisma
"""

import requests
import json
import base64
import zlib
import re
import argparse
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Import database module
from database.db_repository import db as vttech_db

# ============== CONFIGURATION ==============
BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
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
    """Unified sync class with Prisma/Postgres support"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        })
        self.token = None
        self.xsrf_token = None
        self.db = vttech_db
        self.stats = {
            'master': 0, 'revenue': 0, 'customers': 0, 'customer_detail': 0, 'errors': 0, 'start_time': time.time()
        }

    def decompress(self, data: str) -> Any:
        try:
            data = data.strip('"')
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except:
            try: return json.loads(data)
            except: return data

    def login(self) -> bool:
        logger.info("🔐 Đang đăng nhập...")
        try:
            resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
                'username': USERNAME, 'password': PASSWORD, 'passwordcrypt': '', 'from': '', 'sso': '', 'ssotoken': ''
            })
            data = resp.json()
            if data.get('Session'):
                self.token = data['Session']
                self.session.cookies.set('WebToken', self.token)
                logger.info(f"✅ Login success: {data.get('FullName')}")
                
                # Get XSRF token
                resp = self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID=1')
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match: self.xsrf_token = match.group(1)
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False

    def call_handler(self, page: str, handler: str, data: dict = None) -> Any:
        try:
            form_data = {'__RequestVerificationToken': self.xsrf_token or ''}
            if data: form_data.update(data)
            resp = self.session.post(
                f'{BASE_URL}{page}?handler={handler}',
                data=form_data,
                headers={'X-Requested-With': 'XMLHttpRequest', 'xsrf-token': self.xsrf_token or ''}
            )
            if resp.status_code == 200: return self.decompress(resp.text)
            return None
        except Exception as e:
            self.stats['errors'] += 1
            return None

    def call_api(self, endpoint: str, data: dict = None) -> Any:
        try:
            resp = self.session.post(
                f'{BASE_URL}{endpoint}', json=data or {},
                headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            )
            if resp.status_code == 200: return self.decompress(resp.text)
            return None
        except Exception as e:
            self.stats['errors'] += 1
            return None

    # ========== SYNC METHODS ==========

    def sync_master_data(self):
        logger.info("\n📦 SYNCING MASTER DATA")
        data = self.call_api('/api/Home/SessionData', {})
        if not data: return
        
        self.db.connect()
        counts = {
            'branches': self.db.upsert_branches(data.get('Table', [])),
            'services': self.db.upsert_services(data.get('Table2', [])),
            'service_groups': self.db.upsert_service_groups(data.get('Table3', [])),
            'employees': self.db.upsert_employees(data.get('Table4', [])),
            'users': self.db.upsert_users(data.get('Table5', [])),
            'sources': self.db.upsert_customer_sources(data.get('Table10', [])) 
        }
        for k, v in counts.items(): logger.info(f"  ✅ {k}: {v} records")
        self.stats['master'] = sum(counts.values())

    def sync_revenue(self, date_str: str):
        logger.info(f"\n💰 SYNCING REVENUE ({date_str})")
        branches = self.db.get_branches()
        for b in branches:
            res = self.call_handler('/Customer/ListCustomer/', 'LoadDataTotal', {
                'dateFrom': f'{date_str} 00:00:00', 'dateTo': f'{date_str} 23:59:59', 'branchID': b['id']
            })
            if res and isinstance(res, list) and len(res) > 0:
                self.db.upsert_daily_revenue(date_str, b['id'], {
                    'BranchName': b['name'], 'Paid': res[0].get('Paid', 0), 'CustomerCount': res[0].get('CustomerCount', 0)
                })
                self.stats['revenue'] += 1

    def sync_customers(self, date_str: str, max_pages: int = 10):
        logger.info(f"\n👥 SYNCING CUSTOMERS ({date_str})")
        page_size = 100
        for bid in [-1]: # Try all branches
            start = 0
            while start < max_pages * page_size:
                res = self.call_handler('/Customer/ListCustomer/', 'LoadData', {
                    'dateFrom': f'{date_str} 00:00:00', 'dateTo': f'{date_str} 23:59:59', 'branchID': bid,
                    'start': start, 'length': page_size
                })
                if not res or len(res) == 0: break
                count = self.db.upsert_customers(res)
                self.stats['customers'] += count
                if len(res) < page_size: break
                start += page_size

    def run_full_sync(self, date_str: str = None):
        if not date_str: date_str = datetime.now().strftime('%Y-%m-%d')
        if not self.login(): return
        
        self.db.connect()
        self.sync_master_data()
        self.sync_revenue(date_str)
        self.sync_customers(date_str)
        
        total = sum([self.stats['master'], self.stats['revenue'], self.stats['customers']])
        duration = time.time() - self.stats['start_time']
        self.db.log_crawl(date_str, 'unified_sync', 'success', total, None, duration)
        
        logger.info(f"\n✅ COMPLETED. Total {total} records in {duration:.2f}s")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str)
    args = parser.parse_args()
    VTTechUnifiedSync().run_full_sync(args.date)
