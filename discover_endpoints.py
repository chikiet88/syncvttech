#!/usr/bin/env python3
"""
VTTech TMTaza - API Endpoint Discovery Tool
Phát hiện tất cả API endpoints và Page Handlers

Công nghệ webapp:
- ASP.NET Core Razor Pages
- API endpoints: /api/Controller/Action
- Page handlers: /Page/Path/?handler=HandlerName
"""

import requests
import json
import base64
import zlib
import re
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin

BASE_URL = "https://tmtaza.vttechsolution.com"

# ============== KNOWN DATA ==============

# Known from existing code analysis
KNOWN_ENDPOINTS = {
    # API Endpoints (confirmed working)
    "api": [
        {"path": "/api/Author/Login", "method": "POST", "auth": False, "status": "✅ WORKING",
         "body": {"username": "string", "password": "string", "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""},
         "returns": "JWT token, user info (ID, UserName, FullName)"},
        {"path": "/api/Home/SessionData", "method": "POST", "auth": True, "status": "✅ WORKING",
         "body": {},
         "returns": "Master data: branches, services, employees, users, cities, wards, etc."},
    ],
    
    # Razor Page Handlers (confirmed working)
    "handlers": [
        {"page": "/Customer/ListCustomer/", "handler": "Initialize", "method": "POST", "auth": True, "status": "✅ WORKING",
         "body": {},
         "returns": "Branch list, Membership levels"},
        {"page": "/Customer/ListCustomer/", "handler": "LoadDataTotal", "method": "POST", "auth": True, "status": "✅ WORKING",
         "body": {"dateFrom": "datetime", "dateTo": "datetime", "branchID": "int"},
         "returns": "Revenue summary per branch (Paid, PaidNew, PaidNumCust, Raise, Profile, App, AppChecked)"},
        {"page": "/Customer/ListCustomer/", "handler": "LoadData", "method": "POST", "auth": True, "status": "✅ WORKING",
         "body": {"dateFrom": "datetime", "dateTo": "datetime", "branchID": "int", "start": "int", "length": "int"},
         "returns": "Customer list with pagination"},
        {"page": "/Master/Master_Top/", "handler": "NotiItemCount", "method": "POST", "auth": True, "status": "✅ WORKING",
         "body": {},
         "returns": "Notification counts"},
    ]
}

# Potential API controllers (from common patterns)
API_CONTROLLERS = [
    # Authentication & Users
    "Author", "Auth", "Account", "User", "Login", "Session",
    # Core entities
    "Home", "Dashboard", "Menu", "Setting", "Config", "System",
    # Customers
    "Customer", "Client", "Member", "Patient", "Cust",
    # Appointments & Booking
    "Appointment", "Booking", "Schedule", "Calendar", "App",
    # Services & Products
    "Service", "Product", "Item", "Category", "ServiceGroup",
    # Staff
    "Employee", "Staff", "Doctor", "Technician", "User", "Emp",
    # Locations
    "Branch", "Store", "Location", "Clinic", "Department",
    # Financial
    "Revenue", "Payment", "Invoice", "Bill", "Order", "Sale", "Receipt",
    "Cashier", "Finance", "Money", "Debt",
    # Reports
    "Report", "Dashboard", "Statistic", "Chart", "Analysis", "Summary",
    # Inventory
    "Inventory", "Stock", "Warehouse", "Product", "Medicine", "Material",
    # HR & Commission
    "Commission", "Salary", "Payroll", "HR", "Timesheet", "Attendance",
    # Treatment & Medical
    "Treatment", "Procedure", "Record", "History", "Medical", "Treat",
    # Media
    "Image", "Photo", "File", "Upload", "Media", "Document",
    # Communication
    "Notification", "Message", "SMS", "Email", "Noti",
    # Marketing
    "Promotion", "Discount", "Voucher", "Coupon", "Campaign", "Marketing",
    # Reviews
    "Comment", "Feedback", "Review", "Rating", "Survey",
    # Membership
    "Membership", "Card", "Point", "Reward", "Loyalty",
    # Master data
    "Master", "Common", "Lookup", "Reference", "General"
]

# Common API actions
API_ACTIONS = [
    # CRUD
    "Get", "GetById", "GetDetail", "GetList", "GetAll", "List", "All",
    "Create", "Add", "Insert", "Save",
    "Update", "Edit", "Modify", "Change",
    "Delete", "Remove", "Destroy",
    # Data loading
    "Load", "LoadData", "LoadList", "LoadAll", "Init", "Initialize",
    "SessionData", "Data", "Info", "Detail", "View",
    # Search & Filter
    "Search", "Filter", "Find", "Query", "Lookup", "AutoComplete",
    # Statistics
    "Summary", "Overview", "Statistics", "Dashboard", "Report",
    "GetTotal", "GetCount", "GetSum", "GetReport",
    # Status
    "Status", "State", "Check", "Validate", "Verify",
    # Export/Import
    "Export", "Import", "Download", "Upload", "Print",
    # Specific operations
    "Approve", "Reject", "Cancel", "Confirm", "Complete",
    "CheckIn", "CheckOut", "Start", "End"
]

# Potential Razor Pages (from ASP.NET patterns)
RAZOR_PAGES = [
    # Customer module
    "/Customer/ListCustomer/",
    "/Customer/CustomerDetail/",
    "/Customer/CustomerEdit/",
    "/Customer/CustomerCreate/",
    "/Customer/CustomerSearch/",
    "/Customer/CustomerHistory/",
    
    # Appointment module
    "/Appointment/AppointmentInDay/",
    "/Appointment/AppointmentList/",
    "/Appointment/AppointmentCreate/",
    "/Appointment/AppointmentEdit/",
    "/Appointment/Calendar/",
    "/Appointment/Schedule/",
    
    # Booking module
    "/Booking/BookingList/",
    "/Booking/BookingDetail/",
    "/Booking/BookingCreate/",
    
    # Treatment module
    "/Treatment/TreatmentList/",
    "/Treatment/TreatmentDetail/",
    "/Treatment/TreatmentCreate/",
    "/Treatment/TreatmentHistory/",
    
    # Service module
    "/Service/ServiceList/",
    "/Service/ServiceDetail/",
    "/Service/ServiceGroup/",
    
    # Employee module
    "/Employee/EmployeeList/",
    "/Employee/EmployeeDetail/",
    "/Employee/Timesheet/",
    "/Employee/Commission/",
    
    # Revenue/Finance module
    "/Revenue/RevenueList/",
    "/Revenue/RevenueDetail/",
    "/Revenue/RevenueReport/",
    "/Revenue/Daily/",
    "/Cashier/",
    "/Finance/",
    "/Payment/",
    
    # Report module
    "/Report/",
    "/Report/Daily/",
    "/Report/Monthly/",
    "/Report/Revenue/",
    "/Report/Customer/",
    "/Report/Employee/",
    "/Report/Service/",
    
    # Inventory module
    "/Inventory/",
    "/Warehouse/",
    "/Stock/",
    "/Product/",
    
    # Master data module
    "/Master/Master_Top/",
    "/Master/Branch/",
    "/Master/Service/",
    "/Master/Employee/",
    "/Master/Setting/",
    
    # Other modules
    "/Dashboard/",
    "/Home/",
    "/Notification/",
    "/Setting/",
    "/Profile/",
    "/Account/",
]

# Common Page Handlers
PAGE_HANDLERS = [
    # Data loading
    "Initialize", "Init", "LoadData", "LoadList", "LoadAll",
    "LoadDataTotal", "LoadDataDetail", "LoadDataGrid",
    # CRUD operations
    "Create", "Save", "Update", "Delete", "Remove",
    # Data retrieval
    "GetData", "GetDetail", "GetList", "GetById", "GetAll",
    "Search", "Filter", "Query", "AutoComplete",
    # Status operations
    "CheckIn", "CheckOut", "Approve", "Reject", "Cancel", "Confirm",
    # Export/Print
    "Export", "ExportExcel", "ExportPdf", "Print",
    # Notifications
    "NotiItemCount", "GetNotifications", "MarkRead",
    # Other
    "Refresh", "Reload", "Submit", "Process"
]


class VTTechEndpointDiscovery:
    def __init__(self, username="ittest123", password="ittest123"):
        self.session = requests.Session()
        self.username = username
        self.password = password
        self.token = None
        self.xsrf_token = None
        self.discovered_endpoints = []
        self.discovered_handlers = []
        
    def decompress(self, data):
        """Giải nén response base64+gzip"""
        try:
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return decompressed.decode('utf-8')
        except:
            return data
    
    def login(self):
        """Đăng nhập và lấy JWT token"""
        print("🔐 Đang đăng nhập...")
        try:
            resp = self.session.post(
                f"{BASE_URL}/api/Author/Login",
                json={
                    "username": self.username,
                    "password": self.password,
                    "passwordcrypt": "",
                    "from": "",
                    "sso": "",
                    "ssotoken": ""
                },
                timeout=30
            )
            data = resp.json()
            self.token = data.get("Session")
            self.session.cookies.set("WebToken", self.token)
            print(f"✅ Đăng nhập thành công: {data.get('FullName')}")
            print(f"   Role: {data.get('Role')}")
            print(f"   Branch: {data.get('BranchName')}")
            return True
        except Exception as e:
            print(f"❌ Đăng nhập thất bại: {e}")
            return False
    
    def init_page(self, page_url):
        """Khởi tạo trang và lấy XSRF token"""
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}", timeout=15)
            if resp.status_code == 200:
                # Tìm XSRF token
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_token = match.group(1)
                    return True
                # Alternative pattern
                match = re.search(r'value="([^"]+)" name="__RequestVerificationToken"', resp.text)
                if match:
                    self.xsrf_token = match.group(1)
                    return True
        except:
            pass
        return False
    
    def test_api_endpoint(self, controller, action):
        """Test một API endpoint"""
        url = f"{BASE_URL}/api/{controller}/{action}"
        try:
            resp = self.session.post(
                url,
                json={},
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            return {
                "path": f"/api/{controller}/{action}",
                "status_code": resp.status_code,
                "size": len(resp.content),
                "content_type": resp.headers.get("Content-Type", ""),
                "working": resp.status_code == 200 and len(resp.content) > 0
            }
        except Exception as e:
            return {
                "path": f"/api/{controller}/{action}",
                "status_code": 0,
                "error": str(e),
                "working": False
            }
    
    def test_page_handler(self, page, handler):
        """Test một page handler"""
        try:
            self.init_page(page)
            url = f"{BASE_URL}{page}?handler={handler}"
            resp = self.session.post(
                url,
                data={},
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'XSRF-TOKEN': self.xsrf_token or ''
                },
                timeout=10
            )
            return {
                "page": page,
                "handler": handler,
                "status_code": resp.status_code,
                "size": len(resp.content),
                "content_type": resp.headers.get("Content-Type", ""),
                "working": resp.status_code == 200 and len(resp.content) > 0
            }
        except Exception as e:
            return {
                "page": page,
                "handler": handler,
                "status_code": 0,
                "error": str(e),
                "working": False
            }
    
    def test_page_exists(self, page):
        """Kiểm tra page có tồn tại không"""
        try:
            resp = self.session.get(f"{BASE_URL}{page}", timeout=10)
            return {
                "page": page,
                "status_code": resp.status_code,
                "exists": resp.status_code == 200,
                "title": re.search(r'<title>([^<]+)</title>', resp.text, re.I).group(1) if resp.status_code == 200 else None
            }
        except Exception as e:
            return {
                "page": page,
                "status_code": 0,
                "exists": False,
                "error": str(e)
            }
    
    def scan_api_endpoints(self, max_workers=10):
        """Scan tất cả API endpoints"""
        print("\n" + "=" * 60)
        print("🔍 SCANNING API ENDPOINTS")
        print("=" * 60)
        
        found = []
        total = len(API_CONTROLLERS) * len(API_ACTIONS)
        tested = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}
            for controller in API_CONTROLLERS:
                for action in API_ACTIONS:
                    future = executor.submit(self.test_api_endpoint, controller, action)
                    futures[future] = (controller, action)
            
            for future in as_completed(futures):
                tested += 1
                result = future.result()
                if result["working"]:
                    found.append(result)
                    print(f"✅ {result['path']} - {result['status_code']} ({result['size']} bytes)")
                
                if tested % 100 == 0:
                    print(f"   Progress: {tested}/{total} ({len(found)} found)")
        
        self.discovered_endpoints = found
        print(f"\n📊 Found {len(found)} working API endpoints")
        return found
    
    def scan_pages(self):
        """Scan các Razor pages có tồn tại"""
        print("\n" + "=" * 60)
        print("🔍 SCANNING RAZOR PAGES")
        print("=" * 60)
        
        existing_pages = []
        
        for page in RAZOR_PAGES:
            result = self.test_page_exists(page)
            if result["exists"]:
                existing_pages.append(result)
                print(f"✅ {page} - {result.get('title', 'No title')}")
            else:
                print(f"❌ {page} - {result['status_code']}")
        
        print(f"\n📊 Found {len(existing_pages)} existing pages")
        return existing_pages
    
    def scan_page_handlers(self, pages, max_workers=5):
        """Scan handlers cho các pages đã tìm thấy"""
        print("\n" + "=" * 60)
        print("🔍 SCANNING PAGE HANDLERS")
        print("=" * 60)
        
        found = []
        
        for page_info in pages:
            page = page_info["page"]
            print(f"\n📄 Testing handlers for {page}...")
            
            for handler in PAGE_HANDLERS:
                result = self.test_page_handler(page, handler)
                if result["working"]:
                    found.append(result)
                    print(f"   ✅ ?handler={handler} ({result['size']} bytes)")
        
        self.discovered_handlers = found
        print(f"\n📊 Found {len(found)} working handlers")
        return found
    
    def generate_report(self):
        """Tạo báo cáo chi tiết"""
        report = {
            "scan_date": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "known_endpoints": KNOWN_ENDPOINTS,
            "discovered_api_endpoints": self.discovered_endpoints,
            "discovered_handlers": self.discovered_handlers,
            "summary": {
                "total_api_endpoints": len(self.discovered_endpoints),
                "total_handlers": len(self.discovered_handlers)
            }
        }
        
        # Save to file
        with open("discovered_endpoints_full.json", "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print("\n💾 Report saved to discovered_endpoints_full.json")
        return report

    def print_comprehensive_report(self):
        """In báo cáo đầy đủ"""
        print("\n")
        print("=" * 80)
        print("📋 COMPREHENSIVE VTTECH TMTAZA API REPORT")
        print("=" * 80)
        
        print("\n" + "-" * 80)
        print("🌐 BASE CONFIGURATION")
        print("-" * 80)
        print(f"""
Base URL: {BASE_URL}
Authentication: JWT Bearer Token
Response Format: JSON (often Base64 + GZip compressed)
Framework: ASP.NET Core Razor Pages
""")
        
        print("-" * 80)
        print("🔐 AUTHENTICATION")
        print("-" * 80)
        print("""
Endpoint: POST /api/Author/Login
Headers:
  Content-Type: application/json

Request Body:
{
  "username": "ittest123",
  "password": "ittest123",
  "passwordcrypt": "",
  "from": "",
  "sso": "",
  "ssotoken": ""
}

Response:
{
  "Session": "JWT_TOKEN",
  "ID": 324,
  "UserName": "ittest123",
  "FullName": "it test",
  "Role": "Admin",
  "BranchID": 1,
  "BranchName": "...",
  ...
}

Usage: Add header "Authorization: Bearer {Session}" for authenticated requests
Cookie: Set "WebToken" cookie with the JWT token
""")
        
        print("-" * 80)
        print("✅ CONFIRMED WORKING ENDPOINTS")
        print("-" * 80)
        
        print("\n📡 API ENDPOINTS:")
        for ep in KNOWN_ENDPOINTS["api"]:
            print(f"""
{ep['status']} {ep['method']} {ep['path']}
  Auth Required: {ep['auth']}
  Body: {json.dumps(ep['body'], indent=4)}
  Returns: {ep['returns']}
""")
        
        print("\n📄 RAZOR PAGE HANDLERS:")
        for h in KNOWN_ENDPOINTS["handlers"]:
            print(f"""
{h['status']} {h['method']} {h['page']}?handler={h['handler']}
  Auth Required: {h['auth']}
  Body: {json.dumps(h['body'], indent=4)}
  Returns: {h['returns']}
""")
        
        print("-" * 80)
        print("🔍 NEWLY DISCOVERED ENDPOINTS")
        print("-" * 80)
        
        if self.discovered_endpoints:
            print("\n📡 API ENDPOINTS:")
            for ep in self.discovered_endpoints:
                print(f"  ✅ POST {ep['path']} ({ep['size']} bytes)")
        
        if self.discovered_handlers:
            print("\n📄 PAGE HANDLERS:")
            for h in self.discovered_handlers:
                print(f"  ✅ POST {h['page']}?handler={h['handler']} ({h['size']} bytes)")
        
        print("\n" + "-" * 80)
        print("📚 CENTRAL API (vttechsolution.com) - Requires IsPro=1")
        print("-" * 80)
        print("""
These endpoints are documented but require Pro subscription:

Authentication:
  POST /api/Client/Autho - Get API token
  POST /api/client/login - Alternative login

Customer APIs:
  POST /api/Customer/GetList    - Customer list
  POST /api/Customer/GetTreat   - Treatment history
  POST /api/Customer/GetTab     - Sales data (services, cards, medicines)

Appointment APIs:
  POST /api/Appointment/GetList - Appointment list

Revenue APIs:
  POST /api/Revenue/GetList         - Revenue receipts
  POST /api/Revenue/GetListByBranch - Revenue by branch

Branch APIs:
  POST /api/Branch/GetList - Branch list

Employee APIs:
  POST /api/Employee/GetList - Employee list

Service APIs:
  POST /api/Service/GetList - Service list

Warehouse APIs:
  POST /api/WareHouse/GetReceiptList - Warehouse receipts
  POST /api/WareHouse/GetExportTSList - Treatment exports

Common Parameters:
{
  "DateFrom": "2025-01-01 00:00:00",
  "DateTo": "2025-01-31 23:59:59",
  "BranchID": 0,  // 0 = all branches
  "DataType": "all",  // "new" or "all"
  "PagingNumber": 1
}

Rate Limit: 20 requests/minute/endpoint
Date Range: Max 31 days per query
""")
        
        print("=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)
        print(f"""
Confirmed Working:
  - API Endpoints: {len(KNOWN_ENDPOINTS['api'])}
  - Page Handlers: {len(KNOWN_ENDPOINTS['handlers'])}

Newly Discovered:
  - API Endpoints: {len(self.discovered_endpoints)}
  - Page Handlers: {len(self.discovered_handlers)}

Data Available via SessionData:
  - branches (17 records)
  - services (1,728 records)
  - service_groups (86 records)
  - employees (1,618 records)
  - users (1,067 records)
  - cities (34 records)
  - districts (34 records)
  - countries (242 records)
  - wards (3,321 records)
  - customer_sources (34 records)
""")


def main():
    print("=" * 60)
    print("🚀 VTTech TMTaza API Endpoint Discovery")
    print("=" * 60)
    
    discovery = VTTechEndpointDiscovery()
    
    if not discovery.login():
        print("❌ Không thể đăng nhập!")
        return
    
    # Scan API endpoints
    api_endpoints = discovery.scan_api_endpoints(max_workers=15)
    
    # Scan existing pages
    existing_pages = discovery.scan_pages()
    
    # Scan handlers for existing pages
    handlers = discovery.scan_page_handlers(existing_pages, max_workers=5)
    
    # Generate report
    discovery.generate_report()
    
    # Print comprehensive report
    discovery.print_comprehensive_report()


if __name__ == "__main__":
    main()
