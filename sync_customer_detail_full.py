#!/usr/bin/env python3
"""
Sync Customer Detail Full - Migrated to PostgreSQL/Prisma
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
        logging.FileHandler(LOG_DIR / f"sync_customer_detail_full_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CustomerDetailSync:
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
            resp = self.session.post(f"{BASE_URL}/api/Author/Login", json={
                "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
            })
            data = resp.json()
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                logger.info(f"✅ Login success")
                resp = self.session.get(f"{BASE_URL}/Customer/ListCustomer")
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match: self.xsrf_token = match.group(1)
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
            
    def call_handler(self, page_url: str, handler: str, customer_id: int) -> Any:
        try:
            resp = self.session.post(
                f"{BASE_URL}{page_url}?handler={handler}",
                data={'__RequestVerificationToken': self.xsrf_token, 'CustomerID': customer_id},
                headers={'X-Requested-With': 'XMLHttpRequest', 'xsrf-token': self.xsrf_token}
            )
            if resp.status_code == 200: return self.decompress(resp.text)
        except: pass
        return None

    def sync_customer(self, customer_id: int):
        # Set context
        self.session.get(f"{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}")
        
        # 1. Services
        res = self.call_handler("/Customer/Service/TabList/TabList_Service/", "LoadataTab", customer_id)
        if res and "Table" in res:
            for s in res["Table"]:
                self.db.upsert_customer_service_tab(customer_id, s)
                
        # 2. Payments
        res = self.call_handler("/Customer/Payment/PaymentList/PaymentList_Service/", "LoadataPayment", customer_id)
        if res and "Table" in res:
            for p in res["Table"]:
                self.db.upsert_customer_payment(customer_id, p)
                
        # 3. History
        res = self.call_handler("/Customer/History/HistoryList_Care/", "LoadataHistory", customer_id)
        if res and isinstance(res, list):
            for h in res:
                self.db.upsert_customer_care_history(customer_id, h)

    def run(self, limit: int = 100):
        if not self.login(): return
        self.db.connect()
        prisma = self.db.prisma
        
        # Get customers from DB
        customers = prisma.customer.find_many(take=limit, order={'id': 'desc'})
        logger.info(f"📋 Syncing details for {len(customers)} customers...")
        
        for i, c in enumerate(customers, 1):
            try:
                self.sync_customer(c.id)
                if i % 10 == 0: logger.info(f"  Progress: {i}/{len(customers)}")
            except Exception as e:
                logger.error(f"  Error ID {c.id}: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=100)
    args = parser.parse_args()
    CustomerDetailSync().run(limit=args.limit)
