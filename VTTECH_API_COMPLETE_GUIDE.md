# VTTECH TMTaza API - Hướng Dẫn Đầy Đủ

**Ngày cập nhật:** 25/12/2024  
**Base URL:** `https://tmtaza.vttechsolution.com`  
**User Test:** ittest123 (ID: 324)

---

## 📋 MỤC LỤC

1. [Tổng Quan](#1-tổng-quan)
2. [Authentication](#2-authentication)
3. [Customer List Endpoints](#3-customer-list-endpoints)
4. [Customer Detail Endpoints](#4-customer-detail-endpoints)
5. [Treatment Endpoints](#5-treatment-endpoints)
6. [Master Data Endpoints](#6-master-data-endpoints)
7. [Response Format](#7-response-format)
8. [Scripts Đã Tạo](#8-scripts-đã-tạo)

---

## 1. TỔNG QUAN

### Kiến trúc API
- **Framework:** ASP.NET Core Razor Pages
- **Handler Pattern:** `?handler=HandlerName`
- **Authentication:** JWT Bearer Token (key: `Session`)
- **XSRF Protection:** `__RequestVerificationToken` required
- **Response Compression:** Base64 + GZip/Brotli

### Request Format
```
Method: POST
Content-Type: application/x-www-form-urlencoded
Headers:
  - Authorization: Bearer {JWT_TOKEN}
  - X-Requested-With: XMLHttpRequest
Body:
  - __RequestVerificationToken={XSRF_TOKEN}
  - CustomerID={ID}
  - [Other params...]
```

---

## 2. AUTHENTICATION

### Login Endpoint
```
POST /api/Author/Login
Content-Type: application/json

{
  "username": "ittest123",
  "password": "ittest123",
  "passwordcrypt": "",
  "from": "",
  "sso": "",
  "ssotoken": ""
}
```

### Response
```json
{
  "Session": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "UserID": 324,
  "UserName": "ittest123",
  ...
}
```

### Lấy XSRF Token
```python
# Lấy từ page HTML
resp = session.get(f'{BASE_URL}/Customer/ListCustomer/')
xsrf = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>\"]+)', resp.text).group(1)
```

---

## 3. CUSTOMER LIST ENDPOINTS

### 3.1 LoadIni - Master Data
```
POST /Customer/ListCustomer/?handler=LoadIni
```

**Response:**
```json
{
  "Employees": [334 items],
  "Branches": [10 items],
  "CustomerSources": [50 items],
  "Services": [200 items],
  ...
}
```

### 3.2 LoadData - Customer List
```
POST /Customer/ListCustomer/?handler=LoadData

Body:
  __RequestVerificationToken={xsrf}
  searchtype=1
  fromDate=2024-01-01
  toDate=2024-12-31
  branchID=0
  sourceID=0
  page=1
  pageSize=20
```

---

## 4. CUSTOMER DETAIL ENDPOINTS

### 4.1 MainCustomer Page

| Handler | Mô tả | Response |
|---------|-------|----------|
| `LoadIni` | Master data (Employees, Tele) | EmpFull: 334, Tele: 173 |
| `LoadPaymentInfo` | Thông tin thanh toán | Price, Paid, Phone |
| `LoadStatusExtra` | Trạng thái bổ sung | Table, Table1 |

### 4.2 LoadIni
```
POST /Customer/MainCustomer/?handler=LoadIni&CustomerID={id}

Body:
  __RequestVerificationToken={xsrf}
```

**Response:**
```json
{
  "EmpFull": [
    {"ID": 1, "Name": "Nguyễn Văn A", "BranchID": 1, ...},
    // 334 employees
  ],
  "Tele": [
    {"ID": 1, "Name": "Tele 1", ...},
    // 173 tele staff
  ]
}
```

### 4.3 LoadPaymentInfo
```
POST /Customer/MainCustomer/?handler=LoadPaymentInfo&CustomerID={id}
```

**Response:**
```json
[{
  "PRICE_DISCOUNTED": 47600000.0,
  "PAID": 0.0,
  "PRICE_TREAT": 45200000.0,
  "PAID_TREAT": 0.0,
  "DEPOST_LEFT": 0.0,
  "PHONE": "0977272967",
  "TOTALMANUAL": 0.0,
  "VIRTUAL_AMOUNT": 0.0
}]
```

---

## 5. TREATMENT ENDPOINTS

### 5.1 TreatmentList_Service

| Handler | Mô tả | Parameters |
|---------|-------|------------|
| `LoadComboMain` | Danh sách services, categories | CustomerID |
| `LoadDetail` | Chi tiết treatment | CustomerID, TabID |

### 5.2 LoadComboMain
```
POST /Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadComboMain&CustomerID={id}
```

**Response:**
```json
{
  "PatientRecord": [],
  "TreatmentPlan": [],
  "ServiceTab": [
    {"ID": 342205, "Name": "ULTHERAPY VÙNG BẮP TAY"},
    {"ID": 319483, "Name": "Kem massage H.Derma collagen 1000g"}
  ],
  "ServiceCatTab": [
    {"ID": 47, "Name": "ULTHER"}
  ]
}
```

### 5.3 LoadDetail
```
POST /Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadDetail&CustomerID={id}

Body:
  __RequestVerificationToken={xsrf}
  TabID={service_tab_id}
```

**Response:**
```json
{
  "Table": [{
    "TabID": 8721,
    "BS1": 0, "BS2": 0, "BS3": 0, "BS4": 0,
    "PT1": 0, "PT2": 0, "PT3": 0, "PT4": 0,
    "Tech1": 0, "Tech2": 0,
    "Created_By": 147,
    "Created": "2020-11-29T10:02:04.807",
    "PercentOfService": 100,
    "PercentComplete": 100,
    "Content": "",
    "ContentNext": "",
    "Note": "",
    "Symptoms": "",
    "treatDateNext": "1900-01-01T00:00:00",
    "TeethTreat": "",
    "Teeth": "",
    "TeethType": 0,
    "PriceRoot": 0.0,
    "PriceDiscounted": 1600000.0,
    "ManualAmount": 0.0,
    "ServiceID": 467,
    "SerCode": "DV00467",
    "TabCode": "",
    "IsFinish": 0,
    "MinPer": 100
  }],
  "Table1": []
}
```

---

## 6. MASTER DATA ENDPOINTS

### 6.1 Danh sách endpoints đã xác nhận

| Endpoint | Handler | Mô tả |
|----------|---------|-------|
| `/Customer/ListCustomer/` | `LoadIni` | Master data (Branches, Sources, Services...) |
| `/Customer/ListCustomer/` | `LoadData` | Customer list với filter |
| `/api/Master/GetBranches` | - | Danh sách chi nhánh |
| `/api/Master/GetServices` | - | Danh sách dịch vụ |
| `/api/Master/GetEmployees` | - | Danh sách nhân viên |

### 6.2 Data đã sync

| Data | Records | File |
|------|---------|------|
| Branches | 10 | `data_output/branches.json` |
| Services | 200+ | `data_output/services.json` |
| Employees | 334 | `data_output/employees.json` |
| Customer Sources | 50+ | `data_output/customer_sources.json` |
| Cities | 63 | `data_output/cities.json` |
| Wards | 11,000+ | `data_output/wards.json` |

---

## 7. RESPONSE FORMAT

### 7.1 Compression
Response được nén theo format:
1. **JSON** → **GZip** → **Base64** string

### 7.2 Decode Function
```python
import base64
import zlib
import json

def decompress_vttech(data):
    if isinstance(data, str):
        data = data.strip().strip('"')
    try:
        decoded = base64.b64decode(data)
        # Try different wbits
        for wbits in [-zlib.MAX_WBITS, zlib.MAX_WBITS, 16 + zlib.MAX_WBITS]:
            try:
                decompressed = zlib.decompress(decoded, wbits)
                text = decompressed.decode('utf-8')
                return json.loads(text)
            except:
                continue
    except:
        pass
    # Fallback: try direct JSON parse
    try:
        return json.loads(data)
    except:
        return data
```

### 7.3 Content-Encoding
- Server có thể trả về `Content-Encoding: br` (Brotli)
- Requests library tự động decode Brotli

---

## 8. SCRIPTS ĐÃ TẠO

### 8.1 Danh sách scripts

| Script | Mô tả |
|--------|-------|
| `sync_treatment_data.py` | Sync treatment data cho customer |
| `customer_detail_analysis.py` | Phân tích Customer Detail endpoints |
| `scan_customer_detail.py` | Scan tất cả handlers Customer Detail |
| `full_sync_crawler.py` | Sync toàn bộ master data |
| `export_all_data.py` | Export data ra JSON/CSV |

### 8.2 Sử dụng sync_treatment_data.py
```python
from sync_treatment_data import TreatmentSyncer

syncer = TreatmentSyncer()
syncer.login()
syncer.get_xsrf_token()

# Sync 1 customer
result = syncer.sync_customer_treatment('30056')

# Sync nhiều customers
results = syncer.sync_batch(['30056', '30057', '30058'])

# Save results
syncer.save_results(result, 'treatment_30056.json')
```

### 8.3 Output Files

```
data_sync/
├── treatments/
│   ├── treatment_30056_20251225.json
│   ├── customer_30056_full_20251225_024152.json
│   └── all_treatment_handlers_30056.json
├── customers/
├── master/
└── revenue/

data_output/
├── branches.json
├── services.json
├── employees.json
└── ...
```

---

## 9. CUSTOMER 30056 - MẪU DATA

### Thông tin thanh toán
| Field | Value |
|-------|-------|
| Phone | 0977272967 |
| Giá sau giảm | 47,600,000 VND |
| Đã thanh toán | 0 VND |
| Giá điều trị | 45,200,000 VND |
| Còn nợ | 47,600,000 VND |

### Treatment Services
| ID | Service | Created | Price | Progress |
|----|---------|---------|-------|----------|
| 342205 | ULTHERAPY VÙNG BẮP TAY | 2020-11-29 | 1,600,000 | 100% |
| 319483 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |
| 319482 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |
| 243216 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |

---

## 10. LƯU Ý QUAN TRỌNG

### ⚠️ Permissions
- User `ittest123` có quyền hạn chế
- Một số customer không xem được (thiếu quyền)
- CustomerID encrypted (`+v8JSz...`) không hoạt động với API

### ⚠️ CustomerID Format
- **Đúng:** Sử dụng ID số (`30056`)
- **Sai:** Sử dụng encrypted ID (`+v8JSzPlpGkU%2FyH0kvLvOg%3D%3D`)

### ⚠️ XSRF Token
- Lấy từ `/Customer/ListCustomer/` (luôn có)
- Một số page không có XSRF trong HTML
- Token có thời hạn, cần refresh định kỳ

### ⚠️ Rate Limiting
- Không có rate limit rõ ràng
- Nên delay 100-500ms giữa các requests

---

## 11. ENDPOINT SUMMARY

### Endpoints hoạt động ✅

| Category | Endpoint | Handler | Status |
|----------|----------|---------|--------|
| Auth | `/api/Author/Login` | - | ✅ |
| Customer | `/Customer/ListCustomer/` | `LoadIni` | ✅ |
| Customer | `/Customer/ListCustomer/` | `LoadData` | ✅ |
| Customer | `/Customer/MainCustomer/` | `LoadIni` | ✅ |
| Customer | `/Customer/MainCustomer/` | `LoadPaymentInfo` | ✅ |
| Customer | `/Customer/MainCustomer/` | `LoadStatusExtra` | ✅ |
| Treatment | `/Customer/Treatment/.../TreatmentList_Service/` | `LoadComboMain` | ✅ |
| Treatment | `/Customer/Treatment/.../TreatmentList_Service/` | `LoadDetail` | ✅ |

### Endpoints cần thêm quyền ⚠️

| Category | Endpoint | Lý do |
|----------|----------|-------|
| Customer Detail | Nhiều handlers | User thiếu quyền xem customer |
| Treatment | PatientRecord, TreatmentPlan | Data rỗng |

---

**Tác giả:** GitHub Copilot  
**Ngày tạo:** 25/12/2024
