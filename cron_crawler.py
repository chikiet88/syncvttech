#!/usr/bin/env python3
"""
VTTech Daily Cron Crawler
Chạy hàng ngày để lấy dữ liệu từ TMTaza

Usage:
    python3 cron_crawler.py              # Lấy dữ liệu hôm nay
    python3 cron_crawler.py --full       # Lấy tất cả (bao gồm master data)
    python3 cron_crawler.py --date 2025-12-01  # Lấy ngày cụ thể

Cron setup (chạy lúc 6h sáng hàng ngày):
    0 6 * * * cd /chikiet/toolhotro/apivttech && python3 cron_crawler.py >> logs/cron.log 2>&1
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
from datetime import datetime, timedelta
from pathlib import Path

# Import database module
sys.path.insert(0, str(Path(__file__).parent / 'database'))
try:
    from db_repository import db as vttech_db
    USE_DATABASE = True
except ImportError:
    USE_DATABASE = False
    vttech_db = None

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

# Thư mục output
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data_daily"
LOG_DIR = BASE_DIR / "logs"

# Tạo thư mục
DATA_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"crawler_{datetime.now().strftime('%Y%m')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============== CRAWLER CLASS ==============
class VTTechCronCrawler:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.xsrf_token = None
    
    def decompress(self, data):
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
    
    def login(self):
        """Đăng nhập và lấy token"""
        logger.info("Đăng nhập...")
        try:
            resp = self.session.post(
                f"{BASE_URL}/api/Author/Login",
                json={
                    "username": USERNAME,
                    "password": PASSWORD,
                    "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
                },
                timeout=30
            )
            data = resp.json()
            self.token = data.get("Session")
            self.session.cookies.set("WebToken", self.token)
            logger.info(f"✅ Đăng nhập thành công: {data.get('FullName')}")
            return True
        except Exception as e:
            logger.error(f"❌ Đăng nhập thất bại: {e}")
            return False
    
    def init_page(self, page_url):
        """Lấy XSRF token từ trang"""
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}", timeout=30)
            if resp.status_code == 200:
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_token = match.group(1)
                    return True
        except Exception as e:
            logger.error(f"Lỗi init_page: {e}")
        return False
    
    def call_handler(self, page_url, handler, data):
        """Gọi handler với XSRF token"""
        try:
            resp = self.session.post(
                f"{BASE_URL}{page_url}?handler={handler}",
                data=data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'XSRF-TOKEN': self.xsrf_token or ''
                },
                timeout=60
            )
            if resp.status_code == 200 and resp.content:
                return self.decompress(resp.text)
        except Exception as e:
            logger.error(f"Lỗi call_handler {handler}: {e}")
        return None
    
    def call_api(self, endpoint, data=None):
        """Gọi API trực tiếp (không cần XSRF)"""
        try:
            resp = self.session.post(
                f"{BASE_URL}{endpoint}",
                json=data or {},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}"
                },
                timeout=60
            )
            if resp.status_code == 200 and resp.content:
                return self.decompress(resp.text)
        except Exception as e:
            logger.error(f"Lỗi call_api {endpoint}: {e}")
        return None
    
    def save_json(self, data, filename, subdir=None):
        """Lưu dữ liệu ra file JSON"""
        if subdir:
            output_dir = DATA_DIR / subdir
            output_dir.mkdir(exist_ok=True)
        else:
            output_dir = DATA_DIR
        
        filepath = output_dir / f"{filename}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 Saved: {filepath}")
        return filepath

    # ============== DATA FETCHERS ==============
    
    def fetch_daily_revenue(self, date_str):
        """Lấy doanh thu theo ngày"""
        logger.info(f"📊 Lấy doanh thu ngày {date_str}...")
        
        if not self.init_page("/Customer/ListCustomer/"):
            return None
        
        # Lấy danh sách chi nhánh
        branches = self.call_handler("/Customer/ListCustomer/", "Initialize", {})
        if not branches or 'Branch' not in branches:
            logger.error("Không lấy được danh sách chi nhánh")
            return None
        
        # Lấy doanh thu từng chi nhánh
        date_from = f"{date_str} 00:00:00"
        date_to = f"{date_str} 23:59:59"
        
        all_revenue = []
        for branch in branches['Branch']:
            result = self.call_handler(
                "/Customer/ListCustomer/",
                "LoadDataTotal",
                {'dateFrom': date_from, 'dateTo': date_to, 'branchID': branch['ID']}
            )
            if result:
                for item in result:
                    item['BranchID'] = branch['ID']
                    item['BranchName'] = branch['Name']
                    item['Date'] = date_str
                all_revenue.extend(result)
        
        if all_revenue:
            self.save_json(all_revenue, f"revenue_{date_str.replace('-', '')}", "revenue")
            
            # Tính tổng
            total = sum(r.get('Paid', 0) for r in all_revenue)
            logger.info(f"✅ Tổng doanh thu {date_str}: {total:,.0f} VND")
        
        return all_revenue
    
    def fetch_new_customers(self, date_str):
        """Lấy khách hàng mới theo ngày"""
        logger.info(f"👥 Lấy khách hàng mới ngày {date_str}...")
        
        if not self.init_page("/Customer/ListCustomer/"):
            return None
        
        date_from = f"{date_str} 00:00:00"
        date_to = f"{date_str} 23:59:59"
        
        customers = self.call_handler(
            "/Customer/ListCustomer/",
            "LoadData",
            {'dateFrom': date_from, 'dateTo': date_to, 'branchID': 0, 'start': 0, 'length': 1000}
        )
        
        if customers and isinstance(customers, list) and len(customers) > 0:
            self.save_json(customers, f"customers_{date_str.replace('-', '')}", "customers")
            logger.info(f"✅ Khách hàng mới: {len(customers)}")
        else:
            logger.info(f"ℹ️ Không có khách hàng mới ngày {date_str}")
        
        return customers
    
    def fetch_master_data(self):
        """Lấy dữ liệu master (services, employees, users, etc.)"""
        logger.info("📋 Lấy master data...")
        
        result = self.call_api("/api/Home/SessionData", {})
        if not result:
            logger.error("Không lấy được SessionData")
            return None
        
        # Mapping tên bảng
        table_names = {
            "Table": "branches",
            "Table2": "services",
            "Table3": "service_groups",
            "Table4": "employees",
            "Table5": "users",
            "Table6": "cities",
            "Table9": "wards",
            "Table10": "customer_sources"
        }
        
        today = datetime.now().strftime("%Y%m%d")
        saved = {}
        
        for key, name in table_names.items():
            if key in result:
                data = result[key]
                self.save_json(data, f"{name}_{today}", "master")
                saved[name] = len(data)
                logger.info(f"  ✅ {name}: {len(data)} records")
        
        return saved
    
    def fetch_branches_membership(self):
        """Lấy thông tin chi nhánh và membership"""
        logger.info("🏢 Lấy branches & membership...")
        
        if not self.init_page("/Customer/ListCustomer/"):
            return None
        
        result = self.call_handler("/Customer/ListCustomer/", "Initialize", {})
        if result:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(result, f"branches_membership_{today}", "master")
            logger.info(f"  ✅ Branches: {len(result.get('Branch', []))}")
            logger.info(f"  ✅ Membership: {len(result.get('Membership', []))}")
        
        return result


# ============== MAIN ==============
def main():
    parser = argparse.ArgumentParser(description='VTTech Daily Cron Crawler')
    parser.add_argument('--date', type=str, help='Ngày cần lấy (YYYY-MM-DD), mặc định là hôm qua')
    parser.add_argument('--full', action='store_true', help='Lấy tất cả bao gồm master data')
    parser.add_argument('--master-only', action='store_true', help='Chỉ lấy master data')
    parser.add_argument('--no-db', action='store_true', help='Không ghi vào database (chỉ JSON)')
    args = parser.parse_args()
    
    # Check database availability
    use_db = USE_DATABASE and not args.no_db
    if use_db:
        logger.info("📦 Database mode: ENABLED")
    else:
        logger.info("📦 Database mode: DISABLED (JSON only)")
    
    # Xác định ngày
    if args.date:
        target_date = args.date
    else:
        # Mặc định lấy hôm qua (vì chạy sáng sớm)
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    logger.info("=" * 60)
    logger.info(f"🚀 VTTech Cron Crawler - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)
    
    crawler = VTTechCronCrawler()
    
    # Đăng nhập
    if not crawler.login():
        logger.error("Không thể đăng nhập!")
        sys.exit(1)
    
    results = {}
    
    # Lấy master data (nếu --full hoặc --master-only)
    if args.full or args.master_only:
        results['master'] = crawler.fetch_master_data()
        results['branches'] = crawler.fetch_branches_membership()
    
    # Lấy dữ liệu hàng ngày (nếu không phải --master-only)
    if not args.master_only:
        start_time = time.time()
        results['revenue'] = crawler.fetch_daily_revenue(target_date)
        
        # Ghi vào database nếu có
        if use_db and results.get('revenue'):
            try:
                count = vttech_db.insert_daily_revenue_batch(target_date, results['revenue'])
                vttech_db.log_crawl(target_date, 'revenue', 'success', count, None, time.time() - start_time)
                logger.info(f"  💾 Saved to database: {count} records")
            except Exception as e:
                vttech_db.log_crawl(target_date, 'revenue', 'failed', 0, str(e))
                logger.error(f"  ❌ Database error: {e}")
        
        results['customers'] = crawler.fetch_new_customers(target_date)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 SUMMARY")
    logger.info("=" * 60)
    
    if results.get('revenue'):
        total_revenue = sum(r.get('Paid', 0) for r in results['revenue'])
        logger.info(f"  💰 Doanh thu {target_date}: {total_revenue:,.0f} VND")
    
    if results.get('customers'):
        logger.info(f"  👥 Khách mới: {len(results['customers']) if isinstance(results['customers'], list) else 0}")
    
    if results.get('master'):
        logger.info(f"  📋 Master data: {sum(results['master'].values())} records")
    
    logger.info("=" * 60)
    logger.info("✅ Hoàn tất!")
    

if __name__ == "__main__":
    main()
