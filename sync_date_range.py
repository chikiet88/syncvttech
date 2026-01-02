#!/usr/bin/env python3
"""
VTTech Sync Date Range - Migrated to PostgreSQL/Prisma
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
from typing import Any, Dict, List

# Import database module
from database.db_repository import db as vttech_db

# ============== CONFIGURATION ==============
BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

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
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
        self.token = None
        self.xsrf_token = None
        self.db = vttech_db
        
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
                logger.info(f"✅ Login success")
                resp = self.session.get(f'{BASE_URL}/Customer/ListCustomer')
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
        except: return None
    
    def call_api(self, endpoint: str, data: dict = None) -> Any:
        try:
            resp = self.session.post(
                f'{BASE_URL}{endpoint}', json=data or {},
                headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            )
            if resp.status_code == 200: return self.decompress(resp.text)
            return None
        except: return None
    
    def sync_master_data(self):
        logger.info("\n📦 SYNCING MASTER DATA...")
        data = self.call_api('/api/Home/SessionData', {})
        if not data: return 0
        self.db.connect()
        counts = {
            'branches': self.db.upsert_branches(data.get('Table', [])),
            'services': self.db.upsert_services(data.get('Table2', [])),
            'service_groups': self.db.upsert_service_groups(data.get('Table3', [])),
            'employees': self.db.upsert_employees(data.get('Table4', [])),
            'sources': self.db.upsert_customer_sources(data.get('Table5', []))
        }
        total = sum(counts.values())
        logger.info(f"  ✅ Master data: {total} records")
        return total
    
    def sync_revenue_range(self, date_from: str, date_to: str):
        logger.info(f"\n💰 SYNCING REVENUE ({date_from} to {date_to})...")
        start = datetime.strptime(date_from, '%Y-%m-%d')
        end = datetime.strptime(date_to, '%Y-%m-%d')
        branches = self.db.get_branches()
        
        current = start
        while current <= end:
            d = current.strftime('%Y-%m-%d')
            for b in branches:
                res = self.call_handler('/Customer/ListCustomer/', 'LoadDataTotal', {
                    'dateFrom': f'{d} 00:00:00', 'dateTo': f'{d} 23:59:59', 'branchID': b['id']
                })
                if res and isinstance(res, list) and len(res) > 0:
                    self.db.upsert_daily_revenue(d, b['id'], {
                        'BranchName': b['name'], 'Paid': res[0].get('Paid', 0), 'CustomerCount': res[0].get('CustomerCount', 0)
                    })
            current += timedelta(days=1)
    
    def run(self, date_from: str, date_to: str):
        if not self.login(): return
        self.db.connect()
        self.sync_master_data()
        self.sync_revenue_range(date_from, date_to)
        logger.info("\n✅ SYNC COMPLETE")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--from', dest='date_from', type=str)
    parser.add_argument('--to', dest='date_to', type=str)
    parser.add_argument('--days', type=int)
    args = parser.parse_args()
    
    today = datetime.now().strftime('%Y-%m-%d')
    if args.days:
        date_from = (datetime.now() - timedelta(days=args.days-1)).strftime('%Y-%m-%d')
        date_to = today
    else:
        date_from = args.date_from or today
        date_to = args.date_to or today
    
    DateRangeSync().run(date_from, date_to)
