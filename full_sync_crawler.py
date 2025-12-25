#!/usr/bin/env python3
"""
VTTech Full Data Sync Crawler
Lấy toàn bộ dữ liệu từ hệ thống VTTech TMTaza

Author: Auto-generated
Date: 2025-12-24

Features:
- Lấy tất cả master data (branches, services, employees, users, etc.)
- Lấy dữ liệu khách hàng với đầy đủ trường
- Lấy lịch hẹn (appointments)
- Lấy doanh thu (revenue)
- Lấy dữ liệu điều trị (treatments) 
- Lấy kho hàng (inventory)
- Hỗ trợ pagination cho dữ liệu lớn
- Lưu vào JSON và database

Usage:
    python3 full_sync_crawler.py                    # Sync tất cả
    python3 full_sync_crawler.py --master-only      # Chỉ master data  
    python3 full_sync_crawler.py --daily            # Dữ liệu hàng ngày
    python3 full_sync_crawler.py --date 2025-12-01  # Ngày cụ thể
    python3 full_sync_crawler.py --date-range 2025-12-01 2025-12-24  # Khoảng ngày
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
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, List, Any

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

# Thư mục output
BASE_DIR = Path(__file__).parent
SYNC_DIR = BASE_DIR / "data_sync"
LOG_DIR = BASE_DIR / "logs"

# Tạo thư mục
SYNC_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)
(SYNC_DIR / "master").mkdir(exist_ok=True)
(SYNC_DIR / "customers").mkdir(exist_ok=True)
(SYNC_DIR / "appointments").mkdir(exist_ok=True)
(SYNC_DIR / "revenue").mkdir(exist_ok=True)
(SYNC_DIR / "treatments").mkdir(exist_ok=True)
(SYNC_DIR / "inventory").mkdir(exist_ok=True)
(SYNC_DIR / "services").mkdir(exist_ok=True)
(SYNC_DIR / "employees").mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"full_sync_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============== CRAWLER CLASS ==============
class VTTechFullSyncCrawler:
    """
    Crawler toàn diện cho hệ thống VTTech TMTaza
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}  # Cache XSRF tokens cho từng page
        self.branches = []
        self.stats = {
            'total_records': 0,
            'endpoints_called': 0,
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
    
    def call_handler(self, page_url: str, handler: str, data: Dict, retry: int = 3) -> Any:
        """Gọi handler với XSRF token"""
        for attempt in range(retry):
            try:
                if not self.init_page(page_url):
                    continue
                    
                resp = self.session.post(
                    f"{BASE_URL}{page_url}?handler={handler}",
                    data=data,
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
                
                self.stats['endpoints_called'] += 1
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_handler {page_url}?handler={handler}: {e}")
                self.stats['errors'] += 1
        return None
    
    def call_api(self, endpoint: str, data: Dict = None, retry: int = 3) -> Any:
        """Gọi API trực tiếp"""
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
                
                self.stats['endpoints_called'] += 1
                
                if resp.status_code == 200 and resp.content:
                    return self.decompress(resp.text)
                    
            except Exception as e:
                if attempt < retry - 1:
                    time.sleep(1)
                    continue
                logger.error(f"❌ Lỗi call_api {endpoint}: {e}")
                self.stats['errors'] += 1
        return None
    
    def save_json(self, data: Any, filename: str, subdir: str = None) -> str:
        """Lưu dữ liệu ra file JSON"""
        if subdir:
            output_dir = SYNC_DIR / subdir
            output_dir.mkdir(exist_ok=True)
        else:
            output_dir = SYNC_DIR
        
        filepath = output_dir / f"{filename}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 Saved: {filepath}")
        return str(filepath)

    # ==========================================
    # MASTER DATA SYNC
    # ==========================================
    
    def sync_session_data(self) -> Dict:
        """Lấy tất cả dữ liệu từ SessionData API"""
        logger.info("\n📦 Đang sync Session Data (Master)...")
        
        result = self.call_api("/api/Home/SessionData", {})
        if not result:
            logger.error("Không lấy được SessionData")
            return {}
        
        # Mapping đầy đủ các bảng
        table_mapping = {
            "Table": {
                "name": "branches",
                "description": "Chi nhánh",
                "fields": ["ID", "Name", "ShortName", "IP"]
            },
            "Table1": {
                "name": "teeth_data",
                "description": "Dữ liệu răng (Dental)",
                "fields": ["ID", "Name", "Code", "Position"]
            },
            "Table2": {
                "name": "services",
                "description": "Dịch vụ",
                "fields": ["ID", "Name", "Code", "Color", "Type", "State", "Image", "Price", "GroupID"]
            },
            "Table3": {
                "name": "service_groups",
                "description": "Nhóm dịch vụ",
                "fields": ["ID", "Name", "Color", "ParentID"]
            },
            "Table4": {
                "name": "employees",
                "description": "Nhân viên",
                "fields": ["ID", "Name", "Avatar", "GroupID", "State", "IsDoctor", "IsAssistant", 
                          "IsCSKH", "IsCashier", "IsLabo", "IsTech", "IsMarketing", "IsConsult"]
            },
            "Table5": {
                "name": "users",
                "description": "User accounts",
                "fields": ["ID", "Name", "Avatar", "RoleID", "EmployeeName", "EmployeeID"]
            },
            "Table6": {
                "name": "cities",
                "description": "Tỉnh/Thành phố",
                "fields": ["ID", "Name", "Code"]
            },
            "Table7": {
                "name": "districts",
                "description": "Quận/Huyện",
                "fields": ["ID", "Name", "CityID"]
            },
            "Table8": {
                "name": "countries",
                "description": "Quốc gia",
                "fields": ["ID", "Name", "Icon", "Code"]
            },
            "Table9": {
                "name": "wards",
                "description": "Phường/Xã",
                "fields": ["ID", "Name", "DistrictID"]
            },
            "Table10": {
                "name": "customer_sources",
                "description": "Nguồn khách hàng",
                "fields": ["ID", "Name", "SPID", "ParentID"]
            }
        }
        
        today = datetime.now().strftime("%Y%m%d")
        saved_data = {}
        
        for table_key, info in table_mapping.items():
            if table_key in result:
                data = result[table_key]
                count = len(data)
                
                # Lưu file
                self.save_json(data, f"{info['name']}_{today}", "master")
                
                saved_data[info['name']] = {
                    "count": count,
                    "description": info['description'],
                    "fields": info['fields']
                }
                
                self.stats['total_records'] += count
                logger.info(f"  ✅ {info['name']}: {count} records - {info['description']}")
                
                # Cache branches cho sau
                if info['name'] == 'branches':
                    self.branches = data
        
        # Lưu summary
        self.save_json({
            "sync_date": today,
            "tables": saved_data,
            "total_records": sum(t['count'] for t in saved_data.values())
        }, f"master_summary_{today}", "master")
        
        return saved_data
    
    def sync_branches_full(self) -> Dict:
        """Lấy thông tin chi nhánh đầy đủ (bao gồm Membership, Status)"""
        logger.info("\n🏢 Đang sync chi nhánh với thông tin đầy đủ...")
        
        result = self.call_handler("/Customer/ListCustomer/", "Initialize", {})
        if result:
            today = datetime.now().strftime("%Y%m%d")
            
            branches = result.get('Branch', [])
            memberships = result.get('Membership', [])
            
            self.save_json(result, f"branches_full_{today}", "master")
            self.save_json(branches, f"branches_list_{today}", "master")
            self.save_json(memberships, f"memberships_{today}", "master")
            
            logger.info(f"  ✅ Branches: {len(branches)}")
            logger.info(f"  ✅ Memberships: {len(memberships)}")
            
            # Cache branches
            if branches:
                self.branches = branches
            
            return result
        return {}
    
    # ==========================================
    # CUSTOMER DATA SYNC
    # ==========================================
    
    def sync_customers(self, date_from: str, date_to: str, branch_id: int = 0, 
                       page_size: int = 500, max_pages: int = 100) -> List[Dict]:
        """Lấy danh sách khách hàng với pagination"""
        logger.info(f"\n👥 Đang sync khách hàng từ {date_from} đến {date_to}...")
        
        all_customers = []
        start = 0
        page = 1
        
        while page <= max_pages:
            customers = self.call_handler(
                "/Customer/ListCustomer/",
                "LoadData",
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': branch_id,
                    'start': start,
                    'length': page_size
                }
            )
            
            if not customers or not isinstance(customers, list) or len(customers) == 0:
                break
            
            all_customers.extend(customers)
            logger.info(f"  📄 Page {page}: {len(customers)} customers (Total: {len(all_customers)})")
            
            if len(customers) < page_size:
                break
            
            start += page_size
            page += 1
            time.sleep(0.5)  # Rate limiting
        
        if all_customers:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_customers, f"customers_{today}", "customers")
            self.stats['total_records'] += len(all_customers)
            logger.info(f"  ✅ Tổng khách hàng: {len(all_customers)}")
        
        return all_customers
    
    def sync_customer_totals(self, date_from: str, date_to: str) -> List[Dict]:
        """Lấy tổng hợp doanh thu theo chi nhánh"""
        logger.info(f"\n📊 Đang sync tổng hợp doanh thu từ {date_from} đến {date_to}...")
        
        if not self.branches:
            self.sync_branches_full()
        
        all_totals = []
        
        for branch in self.branches:
            result = self.call_handler(
                "/Customer/ListCustomer/",
                "LoadDataTotal",
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': branch['ID']
                }
            )
            
            if result and isinstance(result, list):
                for item in result:
                    item['BranchID'] = branch['ID']
                    item['BranchName'] = branch['Name']
                    item['DateFrom'] = date_from
                    item['DateTo'] = date_to
                all_totals.extend(result)
                
                paid = result[0].get('Paid', 0) if result else 0
                logger.info(f"  ✅ {branch['Name']}: {paid:,.0f} VND")
            
            time.sleep(0.3)
        
        if all_totals:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_totals, f"revenue_by_branch_{today}", "revenue")
            self.stats['total_records'] += len(all_totals)
            
            total_paid = sum(t.get('Paid', 0) for t in all_totals)
            logger.info(f"  💰 Tổng doanh thu: {total_paid:,.0f} VND")
        
        return all_totals
    
    # ==========================================
    # APPOINTMENT SYNC
    # ==========================================
    
    def sync_appointments(self, date_from: str, date_to: str) -> List[Dict]:
        """Lấy danh sách lịch hẹn"""
        logger.info(f"\n📅 Đang sync lịch hẹn từ {date_from} đến {date_to}...")
        
        # Thử nhiều handler có thể
        handlers_to_try = [
            ("/Appointment/AppointmentInDay/", "LoadData"),
            ("/Appointment/AppointmentInDay/", "Initialize"),
            ("/Appointment/ListAppointment/", "LoadData"),
            ("/Booking/BookingList/", "LoadData"),
        ]
        
        all_appointments = []
        
        for page_url, handler in handlers_to_try:
            result = self.call_handler(
                page_url,
                handler,
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': 0
                }
            )
            
            if result and isinstance(result, list) and len(result) > 0:
                all_appointments = result
                logger.info(f"  ✅ Tìm thấy {len(result)} lịch hẹn từ {page_url}")
                break
            elif result and isinstance(result, dict):
                # Có thể là object chứa data
                if 'Data' in result:
                    all_appointments = result['Data']
                    logger.info(f"  ✅ Tìm thấy {len(all_appointments)} lịch hẹn từ {page_url}")
                    break
        
        if all_appointments:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_appointments, f"appointments_{today}", "appointments")
            self.stats['total_records'] += len(all_appointments)
        else:
            logger.info("  ℹ️ Không tìm thấy dữ liệu lịch hẹn")
        
        return all_appointments
    
    # ==========================================
    # SERVICE DATA SYNC
    # ==========================================
    
    def sync_services_full(self) -> Dict:
        """Lấy danh sách dịch vụ với đầy đủ thông tin"""
        logger.info("\n💅 Đang sync dịch vụ với thông tin đầy đủ...")
        
        handlers_to_try = [
            ("/Service/ServiceList/", "LoadInit"),
            ("/Service/ServiceList/", "LoadataService"),
            ("/Service/ServiceList/", "Initialize"),
        ]
        
        all_data = {}
        
        for page_url, handler in handlers_to_try:
            result = self.call_handler(page_url, handler, {})
            
            if result:
                if isinstance(result, list):
                    all_data['services'] = result
                    logger.info(f"  ✅ Services từ {handler}: {len(result)} records")
                elif isinstance(result, dict):
                    all_data.update(result)
                    for key, value in result.items():
                        if isinstance(value, list):
                            logger.info(f"  ✅ {key}: {len(value)} records")
        
        # Thử lấy service types
        result = self.call_handler("/Service/ServiceList/", "LoadataServiceType", {})
        if result and isinstance(result, list):
            all_data['service_types'] = result
            logger.info(f"  ✅ Service types: {len(result)} records")
        
        if all_data:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_data, f"services_full_{today}", "services")
            
            total = sum(len(v) for v in all_data.values() if isinstance(v, list))
            self.stats['total_records'] += total
        
        return all_data
    
    # ==========================================
    # EMPLOYEE DATA SYNC
    # ==========================================
    
    def sync_employees_full(self) -> Dict:
        """Lấy danh sách nhân viên với đầy đủ thông tin"""
        logger.info("\n👨‍💼 Đang sync nhân viên với thông tin đầy đủ...")
        
        all_data = {}
        
        # Lấy employee groups
        result = self.call_handler("/Employee/EmployeeList/", "LoadataEmployeeGroup", {})
        if result and isinstance(result, list):
            all_data['employee_groups'] = result
            logger.info(f"  ✅ Employee groups: {len(result)} records")
        
        # Lấy employee list
        result = self.call_handler("/Employee/EmployeeList/", "LoadataEmployee", {})
        if result and isinstance(result, list):
            all_data['employees'] = result
            logger.info(f"  ✅ Employees: {len(result)} records")
        
        if all_data:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_data, f"employees_full_{today}", "employees")
            
            total = sum(len(v) for v in all_data.values() if isinstance(v, list))
            self.stats['total_records'] += total
        
        return all_data
    
    # ==========================================
    # INVENTORY/WAREHOUSE SYNC
    # ==========================================
    
    def sync_inventory(self, date_from: str, date_to: str) -> Dict:
        """Lấy dữ liệu kho hàng"""
        logger.info(f"\n📦 Đang sync kho hàng từ {date_from} đến {date_to}...")
        
        all_data = {}
        
        # Thử các endpoint có thể
        pages_to_try = [
            ("/Warehouse/WarehouseList/", ["LoadData", "Initialize", "LoadInit"]),
            ("/Inventory/InventoryList/", ["LoadData", "Initialize"]),
            ("/Stock/StockList/", ["LoadData", "Initialize"]),
            ("/Product/ProductList/", ["LoadData", "Initialize"]),
        ]
        
        for page_url, handlers in pages_to_try:
            for handler in handlers:
                result = self.call_handler(
                    page_url,
                    handler,
                    {
                        'dateFrom': f"{date_from} 00:00:00",
                        'dateTo': f"{date_to} 23:59:59"
                    }
                )
                
                if result:
                    key = f"{page_url.split('/')[1]}_{handler}"
                    all_data[key] = result
                    
                    if isinstance(result, list):
                        logger.info(f"  ✅ {page_url} {handler}: {len(result)} records")
                    elif isinstance(result, dict):
                        logger.info(f"  ✅ {page_url} {handler}: Found data")
        
        if all_data:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_data, f"inventory_{today}", "inventory")
        
        return all_data
    
    # ==========================================
    # TREATMENT DATA SYNC
    # ==========================================
    
    def sync_treatments(self, date_from: str, date_to: str) -> List[Dict]:
        """Lấy dữ liệu điều trị"""
        logger.info(f"\n💉 Đang sync điều trị từ {date_from} đến {date_to}...")
        
        all_data = {}
        
        # Thử các endpoint
        pages_to_try = [
            ("/Treatment/TreatmentList/", ["LoadData", "Initialize"]),
            ("/Customer/CustomerTreatment/", ["LoadData", "Initialize"]),
            ("/Procedure/ProcedureList/", ["LoadData", "Initialize"]),
        ]
        
        for page_url, handlers in pages_to_try:
            for handler in handlers:
                result = self.call_handler(
                    page_url,
                    handler,
                    {
                        'dateFrom': f"{date_from} 00:00:00",
                        'dateTo': f"{date_to} 23:59:59",
                        'branchID': 0
                    }
                )
                
                if result:
                    key = f"{page_url.split('/')[1]}_{handler}"
                    all_data[key] = result
                    
                    if isinstance(result, list):
                        logger.info(f"  ✅ {page_url} {handler}: {len(result)} records")
        
        if all_data:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(all_data, f"treatments_{today}", "treatments")
        
        return all_data
    
    # ==========================================
    # DISCOVER NEW ENDPOINTS
    # ==========================================
    
    def discover_endpoints(self) -> List[Dict]:
        """Khám phá các endpoint mới"""
        logger.info("\n🔍 Đang khám phá endpoints mới...")
        
        # Danh sách pages có thể có
        potential_pages = [
            "/Customer/ListCustomer/",
            "/Customer/CustomerDetail/",
            "/Customer/CustomerProfile/",
            "/Appointment/AppointmentInDay/",
            "/Appointment/AppointmentList/",
            "/Appointment/ListAppointment/",
            "/Booking/BookingList/",
            "/Booking/BookingCalendar/",
            "/Service/ServiceList/",
            "/Service/ServiceGroup/",
            "/Employee/EmployeeList/",
            "/Employee/EmployeeGroup/",
            "/Staff/StaffList/",
            "/Doctor/DoctorList/",
            "/Revenue/RevenueList/",
            "/Revenue/RevenueReport/",
            "/Payment/PaymentList/",
            "/Report/DailyReport/",
            "/Report/MonthlyReport/",
            "/Report/RevenueReport/",
            "/Dashboard/Index/",
            "/Dashboard/Main/",
            "/Warehouse/WarehouseList/",
            "/Inventory/InventoryList/",
            "/Stock/StockList/",
            "/Product/ProductList/",
            "/Treatment/TreatmentList/",
            "/Procedure/ProcedureList/",
            "/Commission/CommissionList/",
            "/Salary/SalaryList/",
            "/Promotion/PromotionList/",
            "/Voucher/VoucherList/",
            "/Setting/SettingList/",
            "/System/SystemConfig/",
        ]
        
        # Danh sách handlers phổ biến
        common_handlers = [
            "Initialize", "LoadInit", "Init",
            "LoadData", "LoadDataAll", "GetList",
            "LoadDataTotal", "GetTotal", "Summary",
            "Search", "Filter", "Query"
        ]
        
        discovered = []
        
        for page in potential_pages:
            for handler in common_handlers:
                result = self.call_handler(page, handler, {})
                
                if result is not None:
                    discovered.append({
                        "page": page,
                        "handler": handler,
                        "type": type(result).__name__,
                        "size": len(result) if isinstance(result, (list, dict)) else 0
                    })
                    logger.info(f"  ✅ Found: {page}?handler={handler}")
                
                time.sleep(0.2)  # Rate limiting
        
        if discovered:
            today = datetime.now().strftime("%Y%m%d")
            self.save_json(discovered, f"discovered_endpoints_{today}", "")
            logger.info(f"  📋 Tổng endpoints phát hiện: {len(discovered)}")
        
        return discovered
    
    # ==========================================
    # FULL SYNC
    # ==========================================
    
    def full_sync(self, date_from: str = None, date_to: str = None, 
                  master_only: bool = False, discover: bool = False) -> Dict:
        """Sync toàn bộ dữ liệu"""
        self.stats['start_time'] = datetime.now()
        
        logger.info("=" * 70)
        logger.info("🚀 VTTech Full Data Sync")
        logger.info(f"   Thời gian bắt đầu: {self.stats['start_time']}")
        logger.info("=" * 70)
        
        results = {}
        
        # 1. Đăng nhập
        if not self.login():
            return {"error": "Không thể đăng nhập"}
        
        # 2. Sync Master Data
        results['session_data'] = self.sync_session_data()
        results['branches_full'] = self.sync_branches_full()
        results['services_full'] = self.sync_services_full()
        results['employees_full'] = self.sync_employees_full()
        
        if master_only:
            self._print_summary(results)
            return results
        
        # 3. Setup dates
        if not date_from:
            # Mặc định 30 ngày gần nhất
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        logger.info(f"\n📅 Khoảng ngày sync: {date_from} đến {date_to}")
        
        # 4. Sync Daily Data
        results['customer_totals'] = self.sync_customer_totals(date_from, date_to)
        results['customers'] = self.sync_customers(date_from, date_to)
        results['appointments'] = self.sync_appointments(date_from, date_to)
        results['treatments'] = self.sync_treatments(date_from, date_to)
        results['inventory'] = self.sync_inventory(date_from, date_to)
        
        # 5. Discover new endpoints (optional)
        if discover:
            results['discovered'] = self.discover_endpoints()
        
        self._print_summary(results)
        return results
    
    def daily_sync(self, target_date: str = None) -> Dict:
        """Sync dữ liệu hàng ngày"""
        if not target_date:
            target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        return self.full_sync(date_from=target_date, date_to=target_date)
    
    def _print_summary(self, results: Dict):
        """In tổng kết"""
        duration = datetime.now() - self.stats['start_time']
        
        logger.info("\n" + "=" * 70)
        logger.info("📊 TỔNG KẾT SYNC")
        logger.info("=" * 70)
        
        for key, value in results.items():
            if isinstance(value, dict):
                count = sum(v.get('count', 0) if isinstance(v, dict) else len(v) 
                           for v in value.values() if isinstance(v, (dict, list)))
                logger.info(f"  📁 {key}: {count} records")
            elif isinstance(value, list):
                logger.info(f"  📁 {key}: {len(value)} records")
        
        logger.info(f"\n  📈 Tổng records: {self.stats['total_records']:,}")
        logger.info(f"  🔗 Endpoints called: {self.stats['endpoints_called']}")
        logger.info(f"  ❌ Errors: {self.stats['errors']}")
        logger.info(f"  ⏱️  Thời gian: {duration}")
        logger.info(f"  📂 Output: {SYNC_DIR}")
        
        logger.info("=" * 70)
        logger.info("✅ Hoàn tất sync!")
        logger.info("=" * 70)


# ============== MAIN ==============
def main():
    parser = argparse.ArgumentParser(description='VTTech Full Data Sync Crawler')
    parser.add_argument('--master-only', action='store_true', 
                       help='Chỉ sync master data (branches, services, employees)')
    parser.add_argument('--daily', action='store_true',
                       help='Sync dữ liệu hàng ngày (hôm qua)')
    parser.add_argument('--date', type=str,
                       help='Ngày cần sync (YYYY-MM-DD)')
    parser.add_argument('--date-from', type=str,
                       help='Ngày bắt đầu (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str,
                       help='Ngày kết thúc (YYYY-MM-DD)')
    parser.add_argument('--discover', action='store_true',
                       help='Khám phá endpoints mới')
    args = parser.parse_args()
    
    crawler = VTTechFullSyncCrawler()
    
    if args.daily:
        crawler.daily_sync(args.date)
    elif args.date:
        crawler.full_sync(date_from=args.date, date_to=args.date)
    else:
        crawler.full_sync(
            date_from=args.date_from,
            date_to=args.date_to,
            master_only=args.master_only,
            discover=args.discover
        )


if __name__ == "__main__":
    main()
