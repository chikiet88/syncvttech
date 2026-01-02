#!/usr/bin/env python3
"""
VTTech Daily Cron Crawler - Migrated to PostgreSQL/Prisma
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

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"crawler_{datetime.now().strftime('%Y%m')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VTTechCronCrawler:
    def __init__(self):
        self.session = requests.Session()
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
            resp = self.session.post(f"{BASE_URL}/api/Author/Login", json={
                "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
            })
            data = resp.json()
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                logger.info(f"✅ Login success")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
            
    def call_handler(self, page: str, handler: str, data: dict = None) -> Any:
        try:
            resp = self.session.post(
                f"{BASE_URL}{page}?handler={handler}",
                data=data or {},
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            if resp.status_code == 200: return self.decompress(resp.text)
        except: pass
        return None

    def sync_day(self, date_str: str):
        logger.info(f"🚀 Syncing date: {date_str}")
        start_time = time.time()
        
        # 1. Master Data
        # We can call SessionData if needed, but cron usually just does revenue
        
        # 2. Revenue
        branches = self.db.get_branches()
        revenue_count = 0
        for b in branches:
            res = self.call_handler('/Customer/ListCustomer/', 'LoadDataTotal', {
                'dateFrom': f'{date_str} 00:00:00', 'dateTo': f'{date_str} 23:59:59', 'branchID': b['id']
            })
            if res and isinstance(res, list) and len(res) > 0:
                self.db.upsert_daily_revenue(date_str, b['id'], {
                    'BranchName': b['name'], 'Paid': res[0].get('Paid', 0), 'CustomerCount': res[0].get('CustomerCount', 0)
                })
                revenue_count += 1
        
        # 3. Log
        duration = time.time() - start_time
        self.db.log_crawl(date_str, 'cron_crawler', 'success', revenue_count, None, duration)
        logger.info(f"✅ Done in {duration:.2f}s")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str)
    parser.add_argument('--full', action='store_true')
    args = parser.parse_args()
    
    target_date = args.date or (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    crawler = VTTechCronCrawler()
    if crawler.login():
        crawler.db.connect()
        crawler.sync_day(target_date)
