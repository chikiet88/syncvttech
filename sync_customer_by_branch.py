#!/usr/bin/env python3
"""
Sync Customer by Branch - VTTech TMTaza (Migrated to Prisma/PostgreSQL)

Quy trình:
1. Lấy Tất Cả Branch từ API
2. Lấy List Khách Hàng cho mỗi branch
3. Lưu vào database sử dụng Prisma
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
from typing import Optional, Dict, List, Any

# Import database module
from database.db_repository import db as vttech_db

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"sync_customer_branch_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VTTechCustomerSync:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.db = vttech_db
        self.stats = {
            'total_branches': 0,
            'total_customers': 0,
            'db_saved': 0,
            'errors': 0,
            'start_time': None
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
            resp = self.session.post(f"{BASE_URL}/api/Author/Login", json={
                "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
            })
            data = resp.json()
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                logger.info(f"✅ Đăng nhập thành công")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Lỗi đăng nhập: {e}")
            return False
            
    def init_page(self, page_url: str) -> bool:
        if page_url in self.xsrf_tokens: return True
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}")
            match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
            if match:
                self.xsrf_tokens[page_url] = match.group(1)
                return True
        except: pass
        return False
    
    def call_handler(self, page_url: str, handler: str, data: Dict = None) -> Any:
        if not self.init_page(page_url): return None
        try:
            resp = self.session.post(
                f"{BASE_URL}{page_url}?handler={handler}",
                data=data or {},
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'XSRF-TOKEN': self.xsrf_tokens.get(page_url, '')
                }
            )
            if resp.status_code == 200: return self.decompress(resp.text)
        except: pass
        return None

    def get_all_branches(self) -> List[Dict]:
        logger.info("\n📍 BƯỚC 1: LẤY TẤT CẢ BRANCH")
        # Reuse SessionData logic
        resp = self.session.post(f"{BASE_URL}/api/Home/SessionData", json={})
        result = self.decompress(resp.text)
        if result and "Table" in result:
            branches = result["Table"]
            self.db.upsert_branches(branches)
            logger.info(f"✅ Tìm thấy {len(branches)} branches")
            return branches
        return []

    def get_customers_by_branch(self, branch_id: int, date_from: str, date_to: str) -> List[Dict]:
        all_customers = []
        begin_id = 0
        limit = 500
        while True:
            res = self.call_handler("/Customer/ListCustomer/", "LoadData", {
                'dateFrom': date_from, 'dateTo': date_to, 'branchID': branch_id,
                'type': 5, 'BeginID': begin_id, 'Limit': limit
            })
            if res and isinstance(res, list) and len(res) > 0:
                all_customers.extend(res)
                if len(res) < limit: break
                begin_id = res[-1].get('CustID', res[-1].get('ID', 0))
                time.sleep(0.5)
            else: break
        return all_customers

    def sync_all_customers(self, date_from: str, date_to: str):
        self.stats['start_time'] = datetime.now()
        logger.info(f"\n🚀 BẮT ĐẦU SYNC KHÁCH HÀNG (Branch Mode)")
        logger.info(f"📅 Khoảng thời gian: {date_from} → {date_to}")
        
        self.db.connect()
        if not self.login(): return
        
        branches = self.get_all_branches()
        for i, branch in enumerate(branches, 1):
            bid = branch.get('ID')
            name = branch.get('Name')
            logger.info(f"\n📍 [{i}/{len(branches)}] Branch: {name} (ID: {bid})")
            
            try:
                customers = self.get_customers_by_branch(bid, date_from, date_to)
                if customers:
                    count = self.db.upsert_customers(customers)
                    self.stats['total_customers'] += len(customers)
                    self.stats['db_saved'] += count
                    logger.info(f"   ✅ Saved {count} customers to DB")
                else:
                    logger.info(f"   ℹ️ Không có khách hàng")
            except Exception as e:
                logger.error(f"   ❌ Lỗi: {e}")
                self.stats['errors'] += 1
            time.sleep(1)
            
        logger.info("\n" + "=" * 50)
        logger.info(f"✅ Hoàn tất! Saved: {self.stats['db_saved']}, Errors: {self.stats['errors']}")
        logger.info("=" * 50)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str)
    parser.add_argument('--date-from', type=str)
    parser.add_argument('--date-to', type=str)
    args = parser.parse_args()
    
    if args.date_from and args.date_to:
        df, dt = f"{args.date_from} 00:00:00", f"{args.date_to} 23:59:59"
    else:
        d = args.date or datetime.now().strftime('%Y-%m-%d')
        df, dt = f"{d} 00:00:00", f"{d} 23:59:59"
        
    syncer = VTTechCustomerSync()
    syncer.sync_all_customers(df, dt)

if __name__ == "__main__":
    main()
