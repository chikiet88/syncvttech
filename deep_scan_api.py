#!/usr/bin/env python3
"""
VTTech Deep API Scanner
Scan sâu tất cả endpoints có thể có trong hệ thống VTTech

Author: Auto-generated  
Date: 2025-12-24
"""

import requests
import json
import base64
import zlib
import re
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "data_scan"
OUTPUT_DIR.mkdir(exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# ============== DANH SÁCH CONTROLLERS VÀ ACTIONS ==============

# Razor Pages phổ biến trong webapp VTTech
RAZOR_PAGES = [
    # Customer Management
    "/Customer/ListCustomer/",
    "/Customer/CustomerDetail/",
    "/Customer/CustomerProfile/",
    "/Customer/CustomerHistory/",
    "/Customer/CustomerSearch/",
    "/Customer/CustomerReport/",
    "/Customer/CustomerTreatment/",
    "/Customer/CustomerPayment/",
    "/Customer/CustomerAppointment/",
    "/Customer/MembershipCustomer/",
    
    # Appointment/Booking
    "/Appointment/AppointmentInDay/",
    "/Appointment/AppointmentList/",
    "/Appointment/AppointmentCalendar/",
    "/Appointment/ListAppointment/",
    "/Booking/BookingList/",
    "/Booking/BookingCalendar/",
    "/Booking/BookingReport/",
    "/Schedule/ScheduleList/",
    "/Schedule/ScheduleCalendar/",
    
    # Services
    "/Service/ServiceList/",
    "/Service/ServiceGroup/",
    "/Service/ServiceCategory/",
    "/Service/ServicePrice/",
    "/Service/ServiceType/",
    
    # Products
    "/Product/ProductList/",
    "/Product/ProductGroup/",
    "/Product/ProductCategory/",
    "/Product/ProductPrice/",
    
    # Employees/Staff
    "/Employee/EmployeeList/",
    "/Employee/EmployeeGroup/",
    "/Employee/EmployeeDetail/",
    "/Employee/EmployeeRole/",
    "/Staff/StaffList/",
    "/Doctor/DoctorList/",
    "/Doctor/DoctorSchedule/",
    "/User/UserList/",
    "/User/UserRole/",
    
    # Revenue/Payment
    "/Revenue/RevenueList/",
    "/Revenue/RevenueReport/",
    "/Revenue/DailyRevenue/",
    "/Payment/PaymentList/",
    "/Payment/PaymentMethod/",
    "/Receipt/ReceiptList/",
    "/Invoice/InvoiceList/",
    "/Bill/BillList/",
    "/Cashier/CashierReport/",
    
    # Reports
    "/Report/DailyReport/",
    "/Report/MonthlyReport/",
    "/Report/RevenueReport/",
    "/Report/CustomerReport/",
    "/Report/ServiceReport/",
    "/Report/EmployeeReport/",
    "/Report/AppointmentReport/",
    "/Report/TreatmentReport/",
    "/Report/SalesReport/",
    "/Report/StatisticsReport/",
    "/Statistic/StatisticReport/",
    
    # Dashboard
    "/Dashboard/Index/",
    "/Dashboard/Main/",
    "/Dashboard/Overview/",
    "/Dashboard/Statistics/",
    "/Home/Index/",
    "/Home/Dashboard/",
    
    # Warehouse/Inventory
    "/Warehouse/WarehouseList/",
    "/Warehouse/WarehouseReceipt/",
    "/Warehouse/WarehouseExport/",
    "/Inventory/InventoryList/",
    "/Inventory/InventoryReport/",
    "/Stock/StockList/",
    "/Stock/StockReport/",
    
    # Treatments
    "/Treatment/TreatmentList/",
    "/Treatment/TreatmentDetail/",
    "/Treatment/TreatmentHistory/",
    "/Procedure/ProcedureList/",
    "/Procedure/ProcedureDetail/",
    
    # Commission/Salary
    "/Commission/CommissionList/",
    "/Commission/CommissionReport/",
    "/Salary/SalaryList/",
    "/Salary/SalaryReport/",
    "/Payroll/PayrollList/",
    
    # Promotion/Voucher
    "/Promotion/PromotionList/",
    "/Voucher/VoucherList/",
    "/Coupon/CouponList/",
    "/Discount/DiscountList/",
    
    # Membership/Card
    "/Membership/MembershipList/",
    "/Membership/MembershipType/",
    "/Card/CardList/",
    "/Card/CardType/",
    
    # Settings
    "/Setting/SettingList/",
    "/Setting/SystemSetting/",
    "/Config/ConfigList/",
    "/System/SystemConfig/",
    "/Master/MasterData/",
    
    # Messages/Notifications
    "/Notification/NotificationList/",
    "/Message/MessageList/",
    "/SMS/SMSList/",
    "/Email/EmailList/",
    
    # Images/Files
    "/Image/ImageList/",
    "/File/FileList/",
    "/Upload/UploadList/",
    "/Media/MediaList/",
    
    # Other
    "/Branch/BranchList/",
    "/Branch/BranchDetail/",
    "/Room/RoomList/",
    "/Bed/BedList/",
    "/Queue/QueueList/",
    "/CheckIn/CheckInList/",
    "/Shift/ShiftList/",
    "/Debt/DebtList/",
    "/Debt/DebtReport/",
    "/CRM/CRMList/",
    "/Marketing/MarketingList/",
    "/Telesale/TelesaleList/",
    "/CallHistory/CallHistoryList/",
    "/Source/SourceList/",
]

# Handlers phổ biến
HANDLERS = [
    # Initialize
    "Initialize", "LoadInit", "Init", "InitData", "GetInit",
    # Load data
    "LoadData", "LoadDataAll", "LoadList", "LoadDetail", "LoadInfo",
    "GetList", "GetAll", "GetData", "GetDetail", "GetById", "Get",
    # Totals/Summary
    "LoadDataTotal", "GetTotal", "Summary", "GetSummary", "Overview",
    "Statistics", "GetStatistics", "Count", "GetCount",
    # Search/Filter
    "Search", "Filter", "Query", "Find",
    # Specific actions
    "LoadDataByDate", "LoadDataByBranch", "LoadDataByEmployee",
    "LoadDataByService", "LoadDataByCustomer", "LoadDataByStatus",
    "Export", "Print", "Download",
    # CRUD
    "Create", "Save", "Update", "Delete", "Remove",
    "Add", "Edit", "Change", "Cancel",
]

# API Endpoints
API_ENDPOINTS = [
    # Auth
    "/api/Author/Login",
    "/api/Author/Logout",
    "/api/Author/RefreshToken",
    "/api/Auth/Login",
    "/api/Auth/Logout",
    "/api/Account/Login",
    "/api/User/Login",
    
    # Home
    "/api/Home/Index",
    "/api/Home/SessionData",
    "/api/Home/InitData",
    "/api/Home/GetData",
    "/api/Home/Dashboard",
    
    # Customer
    "/api/Customer/GetList",
    "/api/Customer/GetDetail",
    "/api/Customer/GetById",
    "/api/Customer/Search",
    "/api/Customer/GetTreat",
    "/api/Customer/GetTab",
    "/api/Customer/GetHistory",
    "/api/Customer/GetAppointment",
    "/api/Customer/GetPayment",
    
    # Appointment
    "/api/Appointment/GetList",
    "/api/Appointment/GetById",
    "/api/Appointment/GetByDate",
    "/api/Appointment/GetByBranch",
    "/api/Booking/GetList",
    "/api/Schedule/GetList",
    
    # Service
    "/api/Service/GetList",
    "/api/Service/GetById",
    "/api/Service/GetGroups",
    "/api/Service/GetTypes",
    "/api/Product/GetList",
    
    # Employee
    "/api/Employee/GetList",
    "/api/Employee/GetById",
    "/api/Employee/GetGroups",
    "/api/Staff/GetList",
    "/api/Doctor/GetList",
    "/api/User/GetList",
    
    # Revenue
    "/api/Revenue/GetList",
    "/api/Revenue/GetByBranch",
    "/api/Revenue/GetByDate",
    "/api/Revenue/GetListByBranch",
    "/api/Payment/GetList",
    "/api/Receipt/GetList",
    "/api/Invoice/GetList",
    
    # Branch
    "/api/Branch/GetList",
    "/api/Branch/GetById",
    
    # Warehouse
    "/api/WareHouse/GetList",
    "/api/WareHouse/GetReceiptList",
    "/api/WareHouse/GetExportTSList",
    "/api/Inventory/GetList",
    "/api/Stock/GetList",
    
    # Treatment
    "/api/Treatment/GetList",
    "/api/Procedure/GetList",
    
    # Report
    "/api/Report/GetDaily",
    "/api/Report/GetMonthly",
    "/api/Report/GetRevenue",
    "/api/Report/GetCustomer",
    "/api/Statistic/GetData",
    
    # Commission
    "/api/Commission/GetList",
    "/api/Salary/GetList",
    
    # Settings
    "/api/Setting/GetList",
    "/api/Config/GetList",
    "/api/Master/GetData",
    
    # Notification
    "/api/Notification/GetList",
    "/api/Message/GetList",
    
    # Others
    "/api/Membership/GetList",
    "/api/Card/GetList",
    "/api/Promotion/GetList",
    "/api/Voucher/GetList",
    "/api/Source/GetList",
    "/api/Room/GetList",
    "/api/Shift/GetList",
    "/api/Debt/GetList",
    "/api/CRM/GetList",
]


class VTTechDeepScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.found_endpoints = []
        self.found_with_data = []
        
    def decompress(self, data):
        """Giải nén response"""
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
        """Đăng nhập"""
        logger.info("🔐 Đang đăng nhập...")
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
            
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                logger.info(f"✅ Đăng nhập thành công: {data.get('FullName')}")
                return True
        except Exception as e:
            logger.error(f"❌ Lỗi đăng nhập: {e}")
        return False
    
    def init_page(self, page_url):
        """Lấy XSRF token"""
        if page_url in self.xsrf_tokens:
            return True
            
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}", timeout=10)
            if resp.status_code == 200:
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_tokens[page_url] = match.group(1)
                    return True
        except:
            pass
        return False
    
    def test_handler(self, page_url, handler, params=None):
        """Test một handler"""
        try:
            if not self.init_page(page_url):
                return None
                
            resp = self.session.post(
                f"{BASE_URL}{page_url}?handler={handler}",
                data=params or {},
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'XSRF-TOKEN': self.xsrf_tokens.get(page_url, ''),
                },
                timeout=30
            )
            
            if resp.status_code == 200 and resp.content:
                result = self.decompress(resp.text)
                return {
                    'page': page_url,
                    'handler': handler,
                    'status': resp.status_code,
                    'size': len(resp.content),
                    'type': type(result).__name__,
                    'data_count': len(result) if isinstance(result, (list, dict)) else 0,
                    'sample': result[:2] if isinstance(result, list) and len(result) > 0 else result
                }
        except Exception as e:
            pass
        return None
    
    def test_api(self, endpoint, params=None):
        """Test một API endpoint"""
        try:
            resp = self.session.post(
                f"{BASE_URL}{endpoint}",
                json=params or {},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}"
                },
                timeout=30
            )
            
            if resp.status_code == 200 and resp.content:
                result = self.decompress(resp.text)
                return {
                    'endpoint': endpoint,
                    'status': resp.status_code,
                    'size': len(resp.content),
                    'type': type(result).__name__,
                    'data_count': len(result) if isinstance(result, (list, dict)) else 0,
                    'sample': result[:2] if isinstance(result, list) and len(result) > 0 else 
                              dict(list(result.items())[:5]) if isinstance(result, dict) else result
                }
        except Exception as e:
            pass
        return None
    
    def scan_razor_pages(self):
        """Scan tất cả Razor pages"""
        logger.info("\n📄 Đang scan Razor Pages...")
        
        today = datetime.now()
        date_from = (today - timedelta(days=30)).strftime("%Y-%m-%d 00:00:00")
        date_to = today.strftime("%Y-%m-%d 23:59:59")
        
        # Parameters cho các handler khác nhau
        test_params_list = [
            {},  # Empty
            {'start': 0, 'length': 100},  # Pagination
            {'dateFrom': date_from, 'dateTo': date_to},  # Date range
            {'dateFrom': date_from, 'dateTo': date_to, 'branchID': 0},  # With branch
            {'branchID': 0},  # Branch only
        ]
        
        total = len(RAZOR_PAGES) * len(HANDLERS)
        scanned = 0
        
        for page in RAZOR_PAGES:
            for handler in HANDLERS:
                scanned += 1
                
                # Thử với từng bộ params
                for params in test_params_list:
                    result = self.test_handler(page, handler, params)
                    
                    if result:
                        self.found_endpoints.append(result)
                        
                        # Nếu có data thực sự
                        if result['data_count'] > 0 and result['type'] in ['list', 'dict']:
                            self.found_with_data.append(result)
                            logger.info(f"  ✅ {page}?handler={handler} - {result['data_count']} items")
                        break
                
                # Rate limiting
                time.sleep(0.1)
            
            if scanned % 50 == 0:
                logger.info(f"  📊 Progress: {scanned}/{total}")
    
    def scan_api_endpoints(self):
        """Scan tất cả API endpoints"""
        logger.info("\n🔌 Đang scan API Endpoints...")
        
        today = datetime.now()
        date_from = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        date_to = today.strftime("%Y-%m-%d")
        
        test_params_list = [
            {},
            {'BranchID': 0},
            {'DateFrom': date_from, 'DateTo': date_to},
            {'DateFrom': date_from, 'DateTo': date_to, 'BranchID': 0},
            {'PagingNumber': 1},
        ]
        
        for endpoint in API_ENDPOINTS:
            for params in test_params_list:
                result = self.test_api(endpoint, params)
                
                if result:
                    self.found_endpoints.append(result)
                    
                    if result['data_count'] > 0:
                        self.found_with_data.append(result)
                        logger.info(f"  ✅ {endpoint} - {result['data_count']} items")
                    break
            
            time.sleep(0.2)
    
    def save_results(self):
        """Lưu kết quả"""
        today = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # All found
        with open(OUTPUT_DIR / f"all_endpoints_{today}.json", 'w', encoding='utf-8') as f:
            json.dump(self.found_endpoints, f, ensure_ascii=False, indent=2, default=str)
        
        # With data
        with open(OUTPUT_DIR / f"endpoints_with_data_{today}.json", 'w', encoding='utf-8') as f:
            json.dump(self.found_with_data, f, ensure_ascii=False, indent=2, default=str)
        
        # Summary
        summary = {
            "scan_time": today,
            "total_tested": len(RAZOR_PAGES) * len(HANDLERS) + len(API_ENDPOINTS),
            "total_found": len(self.found_endpoints),
            "with_data": len(self.found_with_data),
            "pages_found": list(set(e.get('page', e.get('endpoint', '')) for e in self.found_endpoints)),
            "handlers_working": list(set(e.get('handler', '') for e in self.found_endpoints if e.get('handler'))),
        }
        
        with open(OUTPUT_DIR / f"scan_summary_{today}.json", 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        logger.info(f"\n💾 Saved to: {OUTPUT_DIR}")
        return summary
    
    def run(self):
        """Chạy scanner"""
        logger.info("=" * 60)
        logger.info("🔍 VTTech Deep API Scanner")
        logger.info("=" * 60)
        
        if not self.login():
            return
        
        self.scan_razor_pages()
        self.scan_api_endpoints()
        
        summary = self.save_results()
        
        logger.info("\n" + "=" * 60)
        logger.info("📊 TỔNG KẾT")
        logger.info("=" * 60)
        logger.info(f"  Total tested: {summary['total_tested']}")
        logger.info(f"  Total found: {summary['total_found']}")
        logger.info(f"  With data: {summary['with_data']}")
        logger.info(f"  Pages: {len(summary['pages_found'])}")
        logger.info(f"  Handlers: {len(summary['handlers_working'])}")
        logger.info("=" * 60)


if __name__ == "__main__":
    scanner = VTTechDeepScanner()
    scanner.run()
