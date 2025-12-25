#!/usr/bin/env python3
"""
VTTech TMTaza - Deep Endpoint Analysis
Test các handler với parameters để xem data thực tế
"""

import requests
import json
import base64
import zlib
import re
from datetime import datetime, timedelta

BASE_URL = "https://tmtaza.vttechsolution.com"

class VTTechDeepAnalysis:
    def __init__(self, username="ittest123", password="ittest123"):
        self.session = requests.Session()
        self.username = username
        self.password = password
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
        """Đăng nhập"""
        print("🔐 Đăng nhập...")
        resp = self.session.post(
            f"{BASE_URL}/api/Author/Login",
            json={
                "username": self.username,
                "password": self.password,
                "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
            }
        )
        data = resp.json()
        self.token = data.get("Session")
        self.session.cookies.set("WebToken", self.token)
        print(f"✅ Logged in as: {data.get('FullName')}")
        return data
    
    def init_page(self, page_url):
        """Lấy XSRF token"""
        resp = self.session.get(f"{BASE_URL}{page_url}", timeout=30)
        if resp.status_code == 200:
            match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
            if match:
                self.xsrf_token = match.group(1)
                return resp.text
        return None
    
    def call_handler(self, page_url, handler, data=None):
        """Gọi page handler"""
        resp = self.session.post(
            f"{BASE_URL}{page_url}?handler={handler}",
            data=data or {},
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'XSRF-TOKEN': self.xsrf_token or ''
            },
            timeout=60
        )
        if resp.status_code == 200 and resp.content:
            return self.decompress(resp.text)
        return None
    
    def analyze_page_js(self, page_html):
        """Phân tích JavaScript trong page để tìm handlers và parameters"""
        handlers = {}
        
        # Tìm các ajax calls
        ajax_patterns = [
            r'handler=(\w+)',
            r'\?handler=(\w+)',
            r"handler:\s*['\"](\w+)['\"]",
            r"Handler\s*=\s*['\"](\w+)['\"]"
        ]
        
        for pattern in ajax_patterns:
            matches = re.findall(pattern, page_html)
            for match in matches:
                handlers[match] = True
        
        # Tìm các data parameters
        data_patterns = [
            r"data:\s*\{([^}]+)\}",
            r"formData\.append\(['\"](\w+)['\"]"
        ]
        
        return list(handlers.keys())


def main():
    print("=" * 70)
    print("🔍 VTTech TMTaza - Deep Endpoint Analysis")
    print("=" * 70)
    
    analyzer = VTTechDeepAnalysis()
    login_data = analyzer.login()
    
    # Today and date ranges
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)
    
    date_from = month_start.strftime("%Y-%m-%d 00:00:00")
    date_to = today.strftime("%Y-%m-%d 23:59:59")
    
    print(f"\n📅 Date range: {date_from} -> {date_to}")
    
    # ============ TEST PAGES AND HANDLERS ============
    
    pages_to_test = [
        {
            "page": "/Customer/ListCustomer/",
            "handlers": [
                {"name": "Initialize", "data": {}},
                {"name": "LoadDataTotal", "data": {"dateFrom": date_from, "dateTo": date_to, "branchID": 0}},
                {"name": "LoadData", "data": {"dateFrom": date_from, "dateTo": date_to, "branchID": 0, "start": 0, "length": 10}},
            ]
        },
        {
            "page": "/Appointment/AppointmentInDay/",
            "handlers": [
                {"name": "Initialize", "data": {}},
                {"name": "LoadData", "data": {"dateFrom": date_from, "dateTo": date_to}},
            ]
        },
        {
            "page": "/Service/ServiceList/",
            "handlers": [
                {"name": "Initialize", "data": {}},
                {"name": "LoadData", "data": {}},
            ]
        },
        {
            "page": "/Employee/EmployeeList/",
            "handlers": [
                {"name": "Initialize", "data": {}},
                {"name": "LoadData", "data": {}},
            ]
        },
    ]
    
    results = {}
    
    for page_info in pages_to_test:
        page = page_info["page"]
        print(f"\n{'='*70}")
        print(f"📄 PAGE: {page}")
        print("=" * 70)
        
        # Init page to get XSRF token and analyze JS
        page_html = analyzer.init_page(page)
        if not page_html:
            print(f"   ❌ Cannot access page")
            continue
        
        # Find handlers from JS
        js_handlers = analyzer.analyze_page_js(page_html)
        if js_handlers:
            print(f"   📝 Found handlers in JS: {js_handlers}")
        
        results[page] = {}
        
        for handler_info in page_info["handlers"]:
            handler = handler_info["name"]
            data = handler_info["data"]
            
            print(f"\n   🔹 Handler: {handler}")
            print(f"      Request: {data}")
            
            result = analyzer.call_handler(page, handler, data)
            
            if result:
                result_type = type(result).__name__
                if isinstance(result, dict):
                    keys = list(result.keys())[:10]
                    print(f"      ✅ Response type: dict, keys: {keys}")
                    results[page][handler] = {
                        "type": "dict",
                        "keys": list(result.keys()),
                        "sample": {k: str(v)[:100] if v else None for k, v in list(result.items())[:5]}
                    }
                elif isinstance(result, list):
                    print(f"      ✅ Response type: list, count: {len(result)}")
                    if result:
                        sample = result[0] if isinstance(result[0], dict) else str(result[0])[:100]
                        print(f"         Sample item: {sample}")
                        results[page][handler] = {
                            "type": "list",
                            "count": len(result),
                            "sample": result[0] if len(result) > 0 else None
                        }
                else:
                    print(f"      ✅ Response type: {result_type}, length: {len(str(result))}")
                    results[page][handler] = {"type": result_type, "preview": str(result)[:200]}
            else:
                print(f"      ❌ No data returned")
    
    # ============ SUMMARY ============
    
    print("\n")
    print("=" * 70)
    print("📊 COMPREHENSIVE API DOCUMENTATION")
    print("=" * 70)
    
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                     VTTECH TMTAZA API ENDPOINTS                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Base URL: https://tmtaza.vttechsolution.com                                  ║
║ Auth: JWT Bearer Token                                                       ║
║ Response: JSON (often Base64+GZip compressed)                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🔐 AUTHENTICATION
═══════════════════════════════════════════════════════════════════════════════

POST /api/Author/Login
  Content-Type: application/json
  
  Request:
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
    "Session": "eyJhbGci...",     // JWT Token
    "ID": 324,                    // User ID
    "UserName": "ittest123",
    "FullName": "it test",
    "Role": "Admin",
    "BranchID": 1,
    "BranchName": "...",
    "Permission": {...}
  }

═══════════════════════════════════════════════════════════════════════════════
📦 MASTER DATA API
═══════════════════════════════════════════════════════════════════════════════

POST /api/Home/SessionData
  Headers:
    Authorization: Bearer {JWT_TOKEN}
    Content-Type: application/json
  
  Request: {}
  
  Response (tables):
    Table:    branches (17 records)      - ID, Name, ShortName, Address
    Table1:   teeth_data (32 records)    - Dental tooth data
    Table2:   services (1,728 records)   - ID, Name, Code, Price, Type
    Table3:   service_groups (86 records)- ID, Name, Color
    Table4:   employees (1,618 records)  - ID, Name, Avatar, GroupID
    Table5:   users (1,067 records)      - ID, Name, RoleID
    Table6:   cities (34 records)        - Provinces
    Table7:   districts (34 records)     - Districts
    Table8:   countries (242 records)    - Countries
    Table9:   wards (3,321 records)      - Wards
    Table10:  customer_sources (34)      - Customer source channels

═══════════════════════════════════════════════════════════════════════════════
👥 CUSTOMER MODULE
═══════════════════════════════════════════════════════════════════════════════

Page: /Customer/ListCustomer/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: Initialize                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Customer/ListCustomer/?handler=Initialize                              │
│                                                                              │
│ Headers:                                                                     │
│   Content-Type: application/x-www-form-urlencoded                            │
│   X-Requested-With: XMLHttpRequest                                           │
│   XSRF-TOKEN: {from page}                                                    │
│                                                                              │
│ Request: (empty)                                                             │
│                                                                              │
│ Response:                                                                    │
│ {                                                                            │
│   "Branch": [{"ID": 1, "Name": "Taza Skin Clinic Thủ Đức"}, ...],           │
│   "Membership": [{"ID": 1, "Name": "Silver"}, ...]                          │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: LoadDataTotal                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Customer/ListCustomer/?handler=LoadDataTotal                           │
│                                                                              │
│ Request (form data):                                                         │
│   dateFrom: "2025-12-01 00:00:00"                                           │
│   dateTo: "2025-12-24 23:59:59"                                             │
│   branchID: 0  (0 = all branches)                                           │
│                                                                              │
│ Response:                                                                    │
│ [{                                                                           │
│   "Paid": 395011000.0,        // Revenue collected                          │
│   "PaidNew": 0.0,             // Revenue from new customers                 │
│   "PaidNumCust": 0,           // Number of paying customers                 │
│   "Raise": 0.0,               // Total sales                                │
│   "Profile": 0,               // Number of profiles                         │
│   "AppChecked": 0,            // Checked-in appointments                    │
│   "App": 0,                   // Total appointments                         │
│   "BranchID": 1,                                                            │
│   "BranchName": "Taza Skin Clinic Thủ Đức"                                  │
│ }]                                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: LoadData                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Customer/ListCustomer/?handler=LoadData                                │
│                                                                              │
│ Request (form data):                                                         │
│   dateFrom: "2025-12-01 00:00:00"                                           │
│   dateTo: "2025-12-24 23:59:59"                                             │
│   branchID: 0                                                               │
│   start: 0                                                                  │
│   length: 100                                                               │
│                                                                              │
│ Response: List of customers                                                  │
│ [{                                                                           │
│   "ID": 12345,                                                              │
│   "Code": "KH001",                                                          │
│   "Name": "Nguyen Van A",                                                   │
│   "Phone": "0901234567",                                                    │
│   "Email": "...",                                                           │
│   "BranchID": 1,                                                            │
│   "CreatedDate": "2025-12-01",                                              │
│   ...                                                                       │
│ }]                                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
📅 APPOINTMENT MODULE  
═══════════════════════════════════════════════════════════════════════════════

Page: /Appointment/AppointmentInDay/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: Initialize                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Appointment/AppointmentInDay/?handler=Initialize                       │
│                                                                              │
│ Response: Initialization data for appointment page                           │
│ - Branch list                                                               │
│ - Employee list (doctors, consultants)                                      │
│ - Status list                                                               │
│ - Service list                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: LoadData                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Appointment/AppointmentInDay/?handler=LoadData                         │
│                                                                              │
│ Request:                                                                     │
│   dateFrom: "2025-12-24 00:00:00"                                           │
│   dateTo: "2025-12-24 23:59:59"                                             │
│   branchID: 0                                                               │
│                                                                              │
│ Response: List of appointments                                               │
│ [{                                                                           │
│   "ID": 123,                                                                │
│   "Code": "APP001",                                                         │
│   "CustomerID": 456,                                                        │
│   "CustomerName": "...",                                                    │
│   "DateFrom": "2025-12-24 09:00",                                           │
│   "DateTo": "2025-12-24 10:00",                                             │
│   "Status": "Confirmed",                                                    │
│   "DoctorID": 789,                                                          │
│   "BranchID": 1,                                                            │
│   ...                                                                       │
│ }]                                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🎁 SERVICE MODULE
═══════════════════════════════════════════════════════════════════════════════

Page: /Service/ServiceList/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: Initialize                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Service/ServiceList/?handler=Initialize                                │
│                                                                              │
│ Response:                                                                    │
│ - Service groups                                                            │
│ - Service categories                                                        │
│ - Branch list                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
👔 EMPLOYEE MODULE
═══════════════════════════════════════════════════════════════════════════════

Page: /Employee/EmployeeList/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: Initialize                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Employee/EmployeeList/?handler=Initialize                              │
│                                                                              │
│ Response:                                                                    │
│ - Employee groups/departments                                               │
│ - Branch list                                                               │
│ - Roles                                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🔔 NOTIFICATION MODULE
═══════════════════════════════════════════════════════════════════════════════

Page: /Master/Master_Top/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Handler: NotiItemCount                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ POST /Master/Master_Top/?handler=NotiItemCount                               │
│                                                                              │
│ Response: Notification counts                                                │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
📋 POTENTIAL ADDITIONAL PAGES (Need further testing)
═══════════════════════════════════════════════════════════════════════════════

Based on typical VTTech patterns, these pages likely exist:

  /Treatment/                     - Treatment records
  /Revenue/                       - Revenue/Payment management  
  /Cashier/                       - Cashier/POS
  /Report/                        - Reports
  /Inventory/                     - Inventory management
  /Commission/                    - Commission tracking
  /Branch/                        - Branch management
  /Setting/                       - System settings

Common handlers for each page:
  - Initialize      : Initial data load
  - LoadData        : Main data with pagination
  - LoadDataTotal   : Summary/totals
  - Create/Save     : Create new record
  - Update          : Update record
  - Delete          : Delete record
  - Export/ExportExcel : Export data

═══════════════════════════════════════════════════════════════════════════════
🌐 CENTRAL API (vttechsolution.com) - Requires Pro
═══════════════════════════════════════════════════════════════════════════════

These require IsPro=1 subscription:

  POST /api/Client/Autho          - API Authentication
  POST /api/Customer/GetList      - Customer list
  POST /api/Customer/GetTreat     - Treatment history
  POST /api/Customer/GetTab       - Sales (services, cards, meds)
  POST /api/Appointment/GetList   - Appointments
  POST /api/Revenue/GetList       - Revenue receipts
  POST /api/Revenue/GetListByBranch - Revenue by branch
  POST /api/Branch/GetList        - Branches
  POST /api/Employee/GetList      - Employees
  POST /api/Service/GetList       - Services
  POST /api/WareHouse/GetReceiptList   - Warehouse receipts
  POST /api/WareHouse/GetExportTSList  - Treatment exports

Common Parameters:
  {
    "DateFrom": "2025-01-01 00:00:00",
    "DateTo": "2025-01-31 23:59:59",
    "BranchID": 0,
    "DataType": "all",
    "PagingNumber": 1
  }

═══════════════════════════════════════════════════════════════════════════════
⚠️ IMPORTANT NOTES
═══════════════════════════════════════════════════════════════════════════════

1. Response Compression:
   - Many responses are Base64 + GZip compressed
   - Decompress with: base64.b64decode() -> zlib.decompress(data, 16+zlib.MAX_WBITS)

2. XSRF Token:
   - Required for all page handlers
   - Get from hidden input: __RequestVerificationToken
   - Send in header: XSRF-TOKEN

3. Rate Limiting:
   - Central API: 20 requests/minute/endpoint
   - Webapp: No documented limit

4. Date Range:
   - Maximum 31 days per query
   - Format: "YYYY-MM-DD HH:mm:ss"

5. Authentication:
   - JWT Token from /api/Author/Login
   - Set as cookie "WebToken" for page requests
   - Set as "Authorization: Bearer {token}" for API requests
""")
    
    # Save results
    with open("endpoint_analysis_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    
    print("\n💾 Results saved to endpoint_analysis_results.json")


if __name__ == "__main__":
    main()
