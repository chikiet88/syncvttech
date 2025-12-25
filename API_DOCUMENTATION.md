# VTTech TMTaza - Complete API & Endpoint Documentation

> **Generated:** December 24, 2025  
> **Base URL:** https://tmtaza.vttechsolution.com  
> **Framework:** ASP.NET Core Razor Pages

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Razor Page Handlers](#razor-page-handlers)
4. [Data Structures](#data-structures)
5. [Central API (Requires Pro)](#central-api-requires-pro)
6. [Technical Notes](#technical-notes)

---

## 🔐 Authentication

### Login Endpoint

```
POST /api/Author/Login
Content-Type: application/json
```

**Request:**
```json
{
  "username": "ittest123",
  "password": "ittest123",
  "passwordcrypt": "",
  "from": "",
  "sso": "",
  "ssotoken": ""
}
```

**Response:**
```json
{
  "Session": "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9...",
  "ID": 324,
  "UserName": "ittest123",
  "FullName": "it test",
  "Role": "Admin",
  "BranchID": 1,
  "BranchName": "Taza Skin Clinic Thủ Đức",
  "Permission": {...}
}
```

### Using the Token

**For API requests:**
```
Authorization: Bearer {Session}
```

**For Page Handler requests:**
```
Cookie: WebToken={Session}
```

---

## 📡 API Endpoints

### 1. Home/SessionData - Master Data

```
POST /api/Home/SessionData
Authorization: Bearer {token}
Content-Type: application/json

Request: {}
```

**Response contains these tables:**

| Table | Name | Records | Fields |
|-------|------|---------|--------|
| Table | branches | 17 | ID, Name, ShortName, Address, Phone, Email, IsMain |
| Table1 | teeth_data | 32 | Dental tooth configuration |
| Table2 | services | 1,728 | ID, Name, Code, Price, GroupID, Type, State, Color |
| Table3 | service_groups | 86 | ID, Name, Color, ParentID |
| Table4 | employees | 1,618 | ID, Name, Avatar, GroupID, BranchID, State, Roles |
| Table5 | users | 1,067 | ID, Name, Avatar, RoleID, EmployeeID, EmployeeName |
| Table6 | cities | 34 | ID, Name (Provinces/Cities) |
| Table7 | districts | 34 | ID, Name, CityID |
| Table8 | countries | 242 | ID, Name, Icon |
| Table9 | wards | 3,321 | ID, Name, DistrictID |
| Table10 | customer_sources | 34 | ID, Name, SPID (Marketing channels) |

---

## 📄 Razor Page Handlers

### How to Call Page Handlers

1. **Get page to obtain XSRF token:**
   ```
   GET /Page/Path/
   ```
   Extract: `<input name="__RequestVerificationToken" value="TOKEN_HERE">`

2. **Call handler:**
   ```
   POST /Page/Path/?handler=HandlerName
   Content-Type: application/x-www-form-urlencoded
   X-Requested-With: XMLHttpRequest
   XSRF-TOKEN: {token from step 1}
   Cookie: WebToken={JWT}; .AspNetCore.Antiforgery.yCr0Ige0lxA={antiforgery cookie}
   ```

---

### Customer Module `/Customer/ListCustomer/`

| Handler | Parameters | Returns |
|---------|------------|---------|
| **Initialize** | - | Branch list, Membership levels |
| **LoadDataTotal** | dateFrom, dateTo, branchID | Revenue summary by branch |
| **LoadData** | dateFrom, dateTo, branchID, start, length | Customer list with pagination |

#### Handler: Initialize

```
POST /Customer/ListCustomer/?handler=Initialize
```

**Response:**
```json
{
  "Branch": [
    {"ID": 1, "Name": "Taza Skin Clinic Thủ Đức"},
    {"ID": 2, "Name": "Taza Skin Clinic Quận 1"},
    ...
  ],
  "Membership": [
    {"ID": 1, "Name": "Silver"},
    {"ID": 2, "Name": "Gold"},
    {"ID": 3, "Name": "Platinum"}
  ]
}
```

#### Handler: LoadDataTotal

```
POST /Customer/ListCustomer/?handler=LoadDataTotal

Form Data:
  dateFrom=2025-12-01 00:00:00
  dateTo=2025-12-24 23:59:59
  branchID=0
```

**Response:**
```json
[{
  "Paid": 395011000.0,
  "PaidNew": 0.0,
  "PaidNumCust": 123,
  "PaidNumCust_New": 5,
  "Raise": 500000000.0,
  "RaiseNew": 10000000.0,
  "RaiseNumCust": 150,
  "RaiseNumCust_New": 10,
  "Profile": 45,
  "AppChecked": 89,
  "App": 120,
  "BranchID": 1,
  "BranchName": "Taza Skin Clinic Thủ Đức"
}]
```

| Field | Description |
|-------|-------------|
| Paid | Revenue collected (đã thu) |
| PaidNew | Revenue from new customers |
| PaidNumCust | Number of paying customers |
| Raise | Total sales (doanh số) |
| Profile | Number of new profiles |
| App | Total appointments |
| AppChecked | Checked-in appointments |

#### Handler: LoadData

```
POST /Customer/ListCustomer/?handler=LoadData

Form Data:
  dateFrom=2025-12-01 00:00:00
  dateTo=2025-12-24 23:59:59
  branchID=0
  start=0
  length=100
```

**Response:** Array of customer objects

---

### Appointment Module `/Appointment/AppointmentInDay/`

**Handlers found in page JavaScript:**
- Initialize
- LoadData
- LoadList
- LoadAll
- Create
- Save
- Update
- Delete
- CheckIn
- CheckOut
- Cancel
- Confirm

| Handler | Parameters | Returns |
|---------|------------|---------|
| **Initialize** | - | Init data (branches, doctors, statuses) |
| **LoadData** | dateFrom, dateTo, branchID | Appointments list |

---

### Service Module `/Service/ServiceList/`

**Handlers found in page JavaScript:**
- LoadInit
- LoadataService
- LoadataServiceType
- DisableItem

| Handler | Parameters | Returns |
|---------|------------|---------|
| **LoadInit** | - | Service groups, categories |
| **LoadataService** | groupID, search | Service list |
| **LoadataServiceType** | - | Service types |

---

### Employee Module `/Employee/EmployeeList/`

**Handlers found in page JavaScript:**
- LoadataEmployeeGroup
- LoadataEmployee
- EmpChangeState
- EmpLoadRole
- ExcuteRole

| Handler | Parameters | Returns |
|---------|------------|---------|
| **LoadataEmployeeGroup** | - | Employee groups/departments |
| **LoadataEmployee** | groupID, branchID | Employee list |
| **EmpLoadRole** | employeeID | Employee roles |

---

### Master/Notification Module `/Master/Master_Top/`

| Handler | Parameters | Returns |
|---------|------------|---------|
| **NotiItemCount** | - | Notification counts |

---

## 📊 Available Pages (Confirmed Existing)

| Page | Status | Primary Handlers |
|------|--------|------------------|
| /Customer/ListCustomer/ | ✅ Working | Initialize, LoadData, LoadDataTotal |
| /Appointment/AppointmentInDay/ | ✅ Working | Initialize, LoadData |
| /Service/ServiceList/ | ✅ Working | LoadInit, LoadataService |
| /Employee/EmployeeList/ | ✅ Working | LoadataEmployee, LoadataEmployeeGroup |

---

## 🌐 Central API (Requires Pro Subscription)

> ⚠️ These endpoints require `IsPro=1` subscription at vttechsolution.com

**Base URL:** https://vttechsolution.com  
**API Docs:** https://vttechsolution.com/api/docs

### Authentication

```
POST /api/Client/Autho
Content-Type: application/json

{
  "username": "TMTaza",
  "password": "62EFEB954B5F4D5",
  "passwordcrypt": ""
}
```

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /api/Customer/GetList | Customer list |
| POST /api/Customer/GetTreat | Treatment history |
| POST /api/Customer/GetTab | Sales data (services, cards, medicines) |
| POST /api/Appointment/GetList | Appointment list |
| POST /api/Revenue/GetList | Revenue receipts |
| POST /api/Revenue/GetListByBranch | Revenue by branch |
| POST /api/Branch/GetList | Branch list |
| POST /api/Employee/GetList | Employee list |
| POST /api/Service/GetList | Service list |
| POST /api/WareHouse/GetReceiptList | Warehouse receipts |
| POST /api/WareHouse/GetExportTSList | Treatment exports |

### Common Parameters

```json
{
  "DateFrom": "2025-01-01 00:00:00",
  "DateTo": "2025-01-31 23:59:59",
  "BranchID": 0,
  "DataType": "all",
  "PagingNumber": 1
}
```

### Response Format

```json
{
  "TotalPages": 1,
  "TotalDatas": 100,
  "PagingNumber": 1,
  "RowInPage": 100,
  "Data": [...]
}
```

---

## ⚙️ Technical Notes

### Response Compression

Many responses are Base64 + GZip compressed. Decompress with:

```python
import base64
import zlib

def decompress(data):
    decoded = base64.b64decode(data)
    decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
    return decompressed.decode('utf-8')
```

### Required Headers for Page Handlers

```http
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest
XSRF-TOKEN: {token from page}
Origin: https://tmtaza.vttechsolution.com
Referer: https://tmtaza.vttechsolution.com/Page/Path/
```

### Required Cookies

```
WebToken={JWT from login}
.AspNetCore.Antiforgery.yCr0Ige0lxA={antiforgery cookie}
.AspNetCore.Session={session cookie}
```

### Rate Limiting

- Central API: 20 requests/minute/endpoint
- Webapp: No documented limit (use reasonably)

### Date Format

```
YYYY-MM-DD HH:mm:ss
Example: 2025-12-24 00:00:00
```

Maximum query range: 31 days

---

## 📁 Data Summary

| Data Type | Source | Records |
|-----------|--------|---------|
| Branches | SessionData | 17 |
| Services | SessionData | 1,728 |
| Service Groups | SessionData | 86 |
| Employees | SessionData | 1,618 |
| Users | SessionData | 1,067 |
| Cities | SessionData | 34 |
| Districts | SessionData | 34 |
| Countries | SessionData | 242 |
| Wards | SessionData | 3,321 |
| Customer Sources | SessionData | 34 |
| **Total** | | **~8,200** |

---

## 🔧 Example Python Client

```python
import requests
import base64
import zlib
import re
import json

BASE_URL = "https://tmtaza.vttechsolution.com"

class VTTechClient:
    def __init__(self, username, password):
        self.session = requests.Session()
        self.token = None
        self.xsrf_token = None
        self._login(username, password)
    
    def _decompress(self, data):
        try:
            decoded = base64.b64decode(data)
            return json.loads(zlib.decompress(decoded, 16 + zlib.MAX_WBITS))
        except:
            return json.loads(data) if data else None
    
    def _login(self, username, password):
        resp = self.session.post(f"{BASE_URL}/api/Author/Login", json={
            "username": username, "password": password,
            "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
        })
        data = resp.json()
        self.token = data.get("Session")
        self.session.cookies.set("WebToken", self.token)
    
    def _init_page(self, page):
        resp = self.session.get(f"{BASE_URL}{page}")
        match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
        if match:
            self.xsrf_token = match.group(1)
    
    def call_handler(self, page, handler, data=None):
        self._init_page(page)
        resp = self.session.post(
            f"{BASE_URL}{page}?handler={handler}",
            data=data or {},
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'XSRF-TOKEN': self.xsrf_token
            }
        )
        return self._decompress(resp.text)
    
    def get_session_data(self):
        resp = self.session.post(
            f"{BASE_URL}/api/Home/SessionData",
            json={},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return self._decompress(resp.text)

# Usage
client = VTTechClient("ittest123", "ittest123")
branches = client.get_session_data()["Table"]
revenue = client.call_handler("/Customer/ListCustomer/", "LoadDataTotal", {
    "dateFrom": "2025-12-01 00:00:00",
    "dateTo": "2025-12-24 23:59:59",
    "branchID": 0
})
```

---

*Documentation generated by API Discovery Tool - December 24, 2025*
