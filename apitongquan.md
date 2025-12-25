# VTTech API Tổng Quan

> **Cập nhật:** 25/12/2025  
> **Base URL:** `https://tmtaza.vttechsolution.com`

---

## 📋 Mục lục

1. [Lịch hẹn trong ngày](#1-lịch-hẹn-trong-ngày)
2. [Lịch hẹn theo ngày](#2-lịch-hẹn-theo-ngày)
3. [Hủy Lịch hẹn](#3-hủy-lịch-hẹn)
4. [Kế toán](#4-kế-toán)
5. [List Khách hàng](#5-list-khách-hàng)
6. [Hướng dẫn Crawl dữ liệu](#6-hướng-dẫn-crawl-dữ-liệu)

---

## 1. Lịch hẹn trong ngày

| Endpoint | Mô tả |
|----------|-------|
| `/Desk/Appointment/AppointmentInDay_Desk_Branch/?handler=LoadCombo` | Lấy combo data (nhân viên, chi nhánh, trạng thái...) |
| `/Desk/Appointment/AppointmentInDay_Desk_Branch/?handler=LoadataAppointmentList` | Danh sách lịch hẹn trong ngày |

---

## 2. Lịch hẹn theo ngày

| Endpoint | Mô tả | Response |
|----------|-------|----------|
| `/Appointment/AppointmentByDay/?handler=LoadCombo` | Master data cho appointment | dict với nhiều keys |
| `/Appointment/AppointmentByDay/?handler=LoadTotal` | Tổng số lịch hẹn | - |
| `/Appointment/AppointmentByDay/?handler=LoadataAppointmentList` | Danh sách lịch hẹn | list |
| `/Appointment/AppointmentByDay/?handler=LoadData` | Danh sách lịch hẹn chi tiết | list với **CustomerID** |

**Params cho LoadData:**
```
date: "2025-12-25"
branchID: -1 (tất cả) hoặc ID cụ thể
statusID: -1 (tất cả)
type: 0
```

---

## 3. Hủy Lịch hẹn

| Endpoint | Mô tả |
|----------|-------|
| `/CustomerCare/CustomerCare_AppointmentCancel/?handler=LoadData` | Danh sách lịch hẹn đã hủy |

---

## 4. Kế toán

| Endpoint | Mô tả | Response |
|----------|-------|----------|
| `/Account/InvoicePayment/?handler=Loadata` | Hóa đơn thanh toán | dict: `{Master, Detail}` |

**Params:**
```
dateFrom: "2025-12-25 00:00:00"
dateTo: "2025-12-25 23:59:59"
branchID: -1
```

---

## 5. List Khách hàng

### 5.1 LoadData - Danh sách hồ sơ khách hàng

| Endpoint | Mô tả |
|----------|-------|
| `/Customer/ListCustomer/?handler=LoadData` | **⭐ Lấy danh sách hồ sơ khách hàng với CustID** |

**Request Params:**
```
dateFrom: "2025-12-25 00:00:00"
dateTo: "2025-12-25 23:59:59"
branchID: -1
start: 0
length: 100
```

**Response:** `list` các customer
```json
[
  {
    "ID": 12345,
    "CustID": 12345,
    "Name": "Nguyễn Văn A",
    "Phone": "0901234567",
    "BranchID": 1,
    "SourceID": 5,
    "CreatedDate": "2025-12-20"
  }
]
```

**Fields quan trọng:**
| Field | Mô tả |
|-------|-------|
| `ID` / `CustID` | **ID khách hàng - dùng cho CustomerID** |
| `Name` | Tên khách hàng |
| `Phone` | Số điện thoại |
| `BranchID` | Chi nhánh |
| `SourceID` | Nguồn khách |
| `CreatedDate` | Ngày tạo hồ sơ |

### 5.2 LoadDataTotal - Tổng hợp doanh thu

| Endpoint | Mô tả |
|----------|-------|
| `/Customer/ListCustomer/?handler=LoadDataTotal` | Tổng hợp doanh thu theo branch |

---

## 6. Hướng dẫn Crawl dữ liệu

### 🔄 **FLOW CRAWL CUSTOMER DATA**

```
┌─────────────────────────────────────────────────────────────┐
│                  FLOW LẤY DỮ LIỆU KHÁCH HÀNG                │
└─────────────────────────────────────────────────────────────┘

BƯỚC 1: Login
    POST /api/Author/Login
    └── Lưu Session token

BƯỚC 2: Lấy danh sách CustomerID
    ┌─────────────────────────────────────────┐
    │  CÁCH 1: Từ LoadData (Khuyến nghị)      │
    │  /Customer/ListCustomer/?handler=LoadData│
    │  → Trả về list với ID/CustID            │
    └─────────────────────────────────────────┘
                      │
                      │ Hoặc
                      ▼
    ┌─────────────────────────────────────────┐
    │  CÁCH 2: Từ Appointments                │
    │  /Appointment/AppointmentByDay/         │
    │  ?handler=LoadData                       │
    │  → Trả về list với CustomerID           │
    └─────────────────────────────────────────┘
                      │
                      │ Hoặc
                      ▼
    ┌─────────────────────────────────────────┐
    │  CÁCH 3: Từ Invoice                     │
    │  /Account/InvoicePayment/?handler=Loadata│
    │  → Master có CustomerID                 │
    └─────────────────────────────────────────┘

BƯỚC 3: Lấy chi tiết từng Customer
    ┌─────────────────────────────────────────┐
    │  3.1 Set context (BẮT BUỘC)             │
    │  GET /Customer/MainCustomer?CustomerID={id}
    │                                         │
    │  3.2 Gọi các endpoint chi tiết:         │
    │  • LoadataTab → Dịch vụ đã mua          │
    │  • LoadataTreatment → Điều trị          │
    │  • LoadataPayment → Thanh toán          │
    │  • Loadata (Schedule) → Lịch hẹn        │
    │  • LoadataHistory → Lịch sử             │
    └─────────────────────────────────────────┘
```

### 📝 **CODE EXAMPLE: Crawl Customer Data**

```python
import requests
import base64
import zlib
import json
import re

BASE_URL = 'https://tmtaza.vttechsolution.com'

def decompress(data):
    """Giải nén response Base64+Gzip"""
    try:
        data = data.strip('"')
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        return json.loads(data) if data else None

# ===== BƯỚC 1: LOGIN =====
session = requests.Session()
r = session.post(f'{BASE_URL}/api/Author/Login', json={
    'username': 'YOUR_USERNAME',
    'password': 'YOUR_PASSWORD',
    'passwordcrypt': '', 'from': '', 'sso': '', 'ssotoken': ''
})
data = r.json()
session.cookies.set('WebToken', data['Session'])

# ===== BƯỚC 2: LẤY DANH SÁCH CUSTOMER IDs =====
# Lấy XSRF token
r = session.get(f'{BASE_URL}/Customer/ListCustomer')
match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', r.text)
xsrf = match.group(1)

headers = {
    'X-Requested-With': 'XMLHttpRequest',
    'xsrf-token': xsrf,
    'Content-Type': 'application/x-www-form-urlencoded'
}

# Gọi LoadData để lấy danh sách customers
r = session.post(
    f'{BASE_URL}/Customer/ListCustomer/?handler=LoadData',
    headers=headers,
    data={
        '__RequestVerificationToken': xsrf,
        'dateFrom': '2025-12-01 00:00:00',
        'dateTo': '2025-12-25 23:59:59',
        'branchID': -1,
        'start': 0,
        'length': 100
    }
)
customers = decompress(r.text)

# Extract CustomerIDs
customer_ids = [c.get('ID') or c.get('CustID') for c in customers]
print(f"Found {len(customer_ids)} customers")

# ===== BƯỚC 3: LẤY CHI TIẾT TỪNG CUSTOMER =====
for cust_id in customer_ids:
    # 3.1 Set context - BẮT BUỘC
    r = session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={cust_id}')
    match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', r.text)
    xsrf = match.group(1)
    
    headers['xsrf-token'] = xsrf
    form_data = {'__RequestVerificationToken': xsrf}
    
    # 3.2 Lấy dịch vụ của customer
    r = session.post(
        f'{BASE_URL}/Customer/Service/TabList/TabList_Service/?handler=LoadataTab',
        headers=headers, data=form_data
    )
    services = decompress(r.text)
    # services = {'Table': [...], 'Table1': [...]}
    
    # 3.3 Lấy điều trị của customer
    r = session.post(
        f'{BASE_URL}/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadataTreatment',
        headers=headers, data=form_data
    )
    treatments = decompress(r.text)
    
    # 3.4 Lấy thanh toán
    r = session.post(
        f'{BASE_URL}/Customer/Payment/PaymentList/PaymentList_Service/?handler=LoadataPayment',
        headers=headers, data=form_data
    )
    payments = decompress(r.text)
    
    print(f"Customer {cust_id}: {len(services.get('Table', []))} services")
```

### ⚠️ **LƯU Ý QUAN TRỌNG**

1. **BẮT BUỘC set context trước khi lấy chi tiết:**
   ```
   GET /Customer/MainCustomer?CustomerID={id}
   ```
   Endpoint này thiết lập session biết đang làm việc với customer nào.

2. **Phân biệt endpoint dịch vụ:**
   | Endpoint | Trả về | Dùng cho |
   |----------|--------|----------|
   | `LoadataTab` | Dịch vụ **của customer** | ✅ Customer detail |
   | `LoadServiceTab` | **MASTER DATA** (1047 services) | ❌ Không dùng cho customer |

3. **Response format:**
   - Tất cả response đều được nén bằng **Base64 + Gzip**
   - Cần decompress trước khi parse JSON

4. **Pagination cho LoadData:**
   ```
   start: 0, 100, 200, ...
   length: 100 (số record mỗi page)
   ```

5. **Quyền truy cập:**
   - Một số endpoint yêu cầu quyền đặc biệt
   - Nếu không có quyền, response sẽ là HTML redirect hoặc empty list

---

## 7. Endpoint Reference nhanh

### Lấy CustomerID từ:

| Source | Endpoint | Field chứa CustomerID |
|--------|----------|----------------------|
| **Customer List** | `/Customer/ListCustomer/?handler=LoadData` | `ID`, `CustID` |
| **Appointments** | `/Appointment/AppointmentByDay/?handler=LoadData` | `CustomerID` |
| **Invoice** | `/Account/InvoicePayment/?handler=Loadata` | `Master[].CustomerID` |

### Customer Detail Endpoints:

| Dữ liệu | Endpoint | Handler |
|---------|----------|---------|
| Dịch vụ đã mua | `/Customer/Service/TabList/TabList_Service/` | `LoadataTab` |
| Điều trị | `/Customer/Treatment/TreatmentList/TreatmentList_Service/` | `LoadataTreatment` |
| Thanh toán | `/Customer/Payment/PaymentList/PaymentList_Service/` | `LoadataPayment` |
| Lịch hẹn | `/Customer/ScheduleList_Schedule/` | `Loadata` |
| Lịch sử | `/Customer/History/HistoryList_Care/` | `LoadataHistory` |
| Hình ảnh | `/Customer/CustomerImage/` | `LoadImageByFolder` |
| Trả góp | `/Customer/Installment/InstallmentList/` | `LoadDetail` |
| Khiếu nại | `/Customer/ComplaintList/` | `Loadata` |

---

*Xem chi tiết tại: [ENDPOINTS_REFERENCE.md](ENDPOINTS_REFERENCE.md)*