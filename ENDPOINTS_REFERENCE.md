# VTTech API Endpoints Reference

> **Cập nhật:** 25/12/2025  
> **Project:** VTTech Data Sync  
> **Base URL:** `https://tmtaza.vttechsolution.com`

---

## 📋 Mục lục

1. [Authentication](#1-authentication)
2. [Master Data](#2-master-data)
3. [Revenue](#3-revenue)
4. [Customer List](#4-customer-list)
5. [Customer Detail](#5-customer-detail)
6. [Database Schema](#6-database-schema)
7. [Sync Flow](#7-sync-flow)

---

## 1. Authentication

### 1.1 Login API

| Thuộc tính | Giá trị |
|------------|---------|
| **Endpoint** | `POST /api/Author/Login` |
| **Content-Type** | `application/json` |

**Request Body:**
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
  "Session": "JWT_TOKEN_HERE",
  "ID": 324,
  "FullName": "it test",
  "RESULT": "SUCCESS"
}
```

**Sử dụng:**
- Lưu `Session` token vào cookie `WebToken`
- Dùng `Session` cho `Authorization: Bearer {token}` khi gọi API

---

### 1.2 Get XSRF Token

| Thuộc tính | Giá trị |
|------------|---------|
| **Endpoint** | `GET /Customer/MainCustomer?CustomerID={id}` |
| **Mục đích** | Lấy XSRF token từ HTML hidden field |

**Extract XSRF:**
```python
import re
match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', response.text)
xsrf_token = match.group(1) if match else None
```

**Sử dụng XSRF:**
- Header: `xsrf-token: {token}`
- Header: `RequestVerificationToken: {token}`
- Form data: `__RequestVerificationToken: {token}`

---

## 2. Master Data

### 2.1 SessionData API (Main Master Data)

| Thuộc tính | Giá trị |
|------------|---------|
| **Endpoint** | `POST /api/Home/SessionData` |
| **Content-Type** | `application/json` |
| **Auth** | `Authorization: Bearer {token}` |

**Response Format:** Base64 + Gzip compressed JSON

**Response Tables:**

| Key | Dữ liệu | Số lượng | Lưu vào DB |
|-----|---------|----------|------------|
| `Table` | Branches (Chi nhánh) | 17 | `branches` |
| `Table2` | Services (Dịch vụ) | 1728 | `services` |
| `Table3` | Service Groups (Nhóm DV) | 86 | `service_groups` |
| `Table4` | Employees (Nhân viên) | 1620 | `employees` |
| `Table5` | Customer Sources (Nguồn KH) | ~1000 | `customer_sources` |
| `Table9` | Wards (Phường/Xã) | 3321 | `wards` |
| `Table10` | Cities (Thành phố) | 68 | `cities` |

**Sample Branch Data:**
```json
{
  "ID": 1,
  "Name": "Taza Skin Clinic Thủ Đức",
  "ShortName": "TAZA Thủ Đức",
  "Code": "CN001"
}
```

---

### 2.2 Employee Groups

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Employee/EmployeeList/` |
| **Handler** | `LoadataEmployeeGroup` |
| **Response** | `list` |
| **Lưu vào** | `employee_groups` |

**Sample Response:**
```json
[
  {"ID": 1, "Name": "Bác sĩ"},
  {"ID": 2, "Name": "Điều dưỡng"},
  {"ID": 3, "Name": "Kỹ thuật viên"}
]
```

---

### 2.3 Service Types

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Service/ServiceList/` |
| **Handler** | `LoadataServiceType` |
| **Response** | `list` (109 items) |
| **Lưu vào** | `service_types` |

---

### 2.4 Appointment Combos

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Appointment/AppointmentByDay/` |
| **Handler** | `LoadCombo` |
| **Response** | `dict` |

**Response Keys:**

| Key | Mô tả | Số lượng |
|-----|-------|----------|
| `Type` | Loại lịch hẹn | 2 |
| `Employee` | Nhân viên | 1620 |
| `Branch` | Chi nhánh | 17 |
| `Status` | Trạng thái | 7 |
| `Doctor` | Bác sĩ | 101 |
| `Membership` | Hạng thành viên | 6 |
| `SchedulerType` | Loại lịch | 15 |
| `CustomerGroup` | Nhóm KH | 87 |
| `ReasonCancel` | Lý do hủy | 5 |
| `Tele` | Tele sale | 173 |
| `Tag` | Tags | 2 |
| `ServiceAll` | Tất cả dịch vụ | 1728 |

---

## 3. Revenue

### 3.1 Load Revenue Total

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/ListCustomer/` |
| **Handler** | `LoadDataTotal` |
| **Response** | `list` |
| **Lưu vào** | `daily_revenue` |

**Request Params:**
```
dateFrom: "2025-12-25 00:00:00"
dateTo: "2025-12-25 23:59:59"
branchID: 1  (hoặc -1 cho tất cả)
```

**Response:**
```json
[{
  "Paid": 26800000,
  "PaidNew": 5000000,
  "PaidNumCust": 15,
  "PaidNumCust_New": 3,
  "Raise": 1000000,
  "RaiseNew": 500000,
  "Profile": 20,
  "AppChecked": 18,
  "App": 25
}]
```

| Field | Mô tả |
|-------|-------|
| `Paid` | Tổng doanh thu |
| `PaidNew` | Doanh thu khách mới |
| `PaidNumCust` | Số khách đã thanh toán |
| `PaidNumCust_New` | Số khách mới đã thanh toán |
| `Raise` | Doanh thu nâng cấp |
| `Profile` | Số hồ sơ |
| `AppChecked` | Số đã check-in |
| `App` | Số lịch hẹn |

---

## 4. Customer List

### 4.1 Từ Appointments

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Appointment/AppointmentByDay/` |
| **Handler** | `LoadData` |
| **Quyền** | ⚠️ Cần quyền xem lịch hẹn |

**Request Params:**
```
date: "2025-12-25"
branchID: -1
statusID: -1
type: 0
```

**Response:** `list` các appointment với `CustomerID`, `CustomerName`, `CustomerPhone`

---

### 4.2 Từ Customer List

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/ListCustomer/` |
| **Handler** | `LoadData` |
| **Quyền** | ⚠️ Cần quyền xem danh sách KH |

**Request Params:**
```
dateFrom: "2025-12-25 00:00:00"
dateTo: "2025-12-25 23:59:59"
branchID: -1
start: 0
length: 100
```

**Response:** `list` với pagination

---

## 5. Customer Detail

> ⚠️ **QUAN TRỌNG:** Phải `GET /Customer/MainCustomer?CustomerID={id}` trước khi gọi các handler để set context customer.

### 5.1 Dịch vụ của Customer

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/Service/TabList/TabList_Service/` |
| **Handler** | `LoadataTab` |
| **Response** | `dict` |
| **Lưu vào** | `customer_services` |

**Response:**
```json
{
  "Table": [
    {
      "ServiceID": 123,
      "ServiceName": "Điều trị mụn",
      "Quantity": 5,
      "Price": 500000,
      "Discount": 50000,
      "Total": 2450000,
      "CreatedDate": "2025-12-01",
      "Status": "Đang điều trị"
    }
  ],
  "Table1": []
}
```

> ⚠️ **KHÔNG DÙNG** `LoadServiceTab` - endpoint này trả về **MASTER DATA** (1047 services toàn hệ thống), không phải dịch vụ của customer!

---

### 5.2 Điều trị của Customer

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/Treatment/TreatmentList/TreatmentList_Service/` |
| **Handler** | `LoadataTreatment` |
| **Response** | `dict` |
| **Lưu vào** | `customer_treatments` |

**Response:**
```json
{
  "DataTotal": [{"Total": 10}],
  "Table": [
    {
      "ID": 456,
      "ServiceName": "Điều trị mụn - Lần 3",
      "EmployeeName": "BS. Nguyễn Văn A",
      "TreatmentDate": "2025-12-20",
      "Status": "Hoàn thành",
      "Note": "Tình trạng da cải thiện"
    }
  ],
  "Table1": []
}
```

---

### 5.3 Thanh toán của Customer

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/Payment/PaymentList/PaymentList_Service/` |
| **Handler** | `LoadataPayment` |
| **Response** | `dict` |
| **Lưu vào** | `customer_payments` |

**Response:**
```json
{
  "Table": [
    {
      "ID": 789,
      "Amount": 500000,
      "PaymentDate": "2025-12-15",
      "PaymentMethod": "Tiền mặt",
      "Note": ""
    }
  ],
  "Table1": [],
  "Table2": []
}
```

---

### 5.4 Lịch hẹn của Customer

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/ScheduleList_Schedule/` |
| **Handler** | `Loadata` |
| **Response** | `list` hoặc `dict` |
| **Lưu vào** | `customer_appointments` |

---

### 5.5 Lịch sử chăm sóc

| Thuộc tính | Giá trị |
|------------|---------|
| **Page** | `/Customer/History/HistoryList_Care/` |
| **Handler** | `LoadataHistory` |
| **Response** | `list` hoặc `dict` |
| **Lưu vào** | `customer_history` |

---

### 5.6 Các endpoints phụ

| Page | Handler | Mô tả |
|------|---------|-------|
| `/Customer/Service/TabList/TabList_Service/` | `LoadInitialize` | Initialize service tab |
| `/Customer/Service/TabList/TabList_Service/` | `LoadInfo_Treatment_Plant` | Kế hoạch điều trị |
| `/Customer/Treatment/TreatmentList/TreatmentList_Service/` | `LoadComboMain` | Combo data cho treatment |
| `/Customer/CustomerImage/` | `LoadImageByFolder` | Hình ảnh theo folder |
| `/Customer/CustomerImage/` | `LoadTemplateForm` | Template form |
| `/Customer/Installment/InstallmentList/` | `LoadDetail` | Chi tiết trả góp |
| `/Customer/ComplaintList/` | `Loadata` | Khiếu nại của customer |

---

## 6. Database Schema

### Master Tables

```sql
-- Branches (Chi nhánh)
CREATE TABLE branches (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1
);

-- Services (Dịch vụ)
CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    group_id INTEGER,
    price REAL DEFAULT 0,
    duration INTEGER DEFAULT 0
);

-- Employees (Nhân viên)
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    branch_id INTEGER,
    phone TEXT,
    email TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

### Fact Tables

```sql
-- Daily Revenue
CREATE TABLE daily_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    branch_id INTEGER NOT NULL,
    branch_name TEXT,
    paid REAL DEFAULT 0,
    num_customers INTEGER DEFAULT 0,
    UNIQUE(date, branch_id)
);

-- Customers
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    branch_id INTEGER,
    source_id INTEGER,
    created_at DATETIME
);
```

### Customer Detail Tables

```sql
-- Customer Services
CREATE TABLE customer_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    service_id INTEGER,
    service_name TEXT,
    quantity INTEGER DEFAULT 1,
    price REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Customer Treatments
CREATE TABLE customer_treatments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    treatment_id INTEGER,
    service_name TEXT,
    employee_name TEXT,
    treatment_date DATETIME,
    status TEXT,
    note TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Customer Payments
CREATE TABLE customer_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    payment_id INTEGER,
    amount REAL DEFAULT 0,
    payment_date DATETIME,
    payment_method TEXT,
    note TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Customer Appointments
CREATE TABLE customer_appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    appointment_id INTEGER,
    appointment_date DATETIME,
    service_name TEXT,
    branch_id INTEGER,
    status TEXT,
    note TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Customer History
CREATE TABLE customer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    history_id INTEGER,
    action_type TEXT,
    action_date DATETIME,
    employee_name TEXT,
    note TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

---

## 7. Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VTTech Sync Flow                         │
└─────────────────────────────────────────────────────────────┘

1. AUTHENTICATION
   │
   ├── POST /api/Author/Login
   │   └── Lưu JWT token → cookie WebToken
   │
   └── GET /Customer/MainCustomer?CustomerID=1
       └── Extract XSRF token từ HTML

2. SYNC MASTER DATA
   │
   ├── POST /api/Home/SessionData
   │   ├── Table → branches
   │   ├── Table2 → services
   │   ├── Table3 → service_groups
   │   ├── Table4 → employees
   │   ├── Table5 → customer_sources
   │   ├── Table9 → wards
   │   └── Table10 → cities
   │
   ├── /Employee/EmployeeList/?handler=LoadataEmployeeGroup
   │   └── → employee_groups
   │
   ├── /Service/ServiceList/?handler=LoadataServiceType
   │   └── → service_types
   │
   └── /Appointment/AppointmentByDay/?handler=LoadCombo
       └── Membership → memberships

3. SYNC REVENUE
   │
   └── /Customer/ListCustomer/?handler=LoadDataTotal
       └── Per branch, per day → daily_revenue

4. SYNC CUSTOMERS (Cần quyền)
   │
   ├── Option A: /Appointment/AppointmentByDay/?handler=LoadData
   │   └── Extract CustomerIDs từ appointments
   │
   └── Option B: /Customer/ListCustomer/?handler=LoadData
       └── Paginated customer list

5. SYNC CUSTOMER DETAIL (Per CustomerID)
   │
   ├── GET /Customer/MainCustomer?CustomerID={id}
   │   └── Set context
   │
   ├── LoadataTab → customer_services
   ├── LoadataTreatment → customer_treatments
   ├── LoadataPayment → customer_payments
   ├── Loadata (Schedule) → customer_appointments
   └── LoadataHistory → customer_history
```

---

## 8. Response Decompression

Tất cả response từ VTTech API đều được compress bằng **Base64 + Gzip**.

```python
import base64
import zlib
import json

def decompress(data: str):
    """Giải nén response từ VTTech API"""
    try:
        data = data.strip('"')
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        try:
            return json.loads(data)
        except:
            return data
```

---

## 9. Usage Examples

### Sync tất cả dữ liệu
```bash
python3 unified_sync.py
```

### Sync chỉ master data
```bash
python3 unified_sync.py --master
```

### Sync revenue cho ngày cụ thể
```bash
python3 unified_sync.py --revenue --date 2025-12-25
```

### Sync customer detail cho IDs cụ thể
```bash
python3 unified_sync.py --customer-ids 100,200,300
```

---

## 10. Known Issues & Notes

### ⚠️ Endpoint Confusion

| ❌ WRONG | ✅ CORRECT | Lý do |
|----------|-----------|-------|
| `LoadServiceTab` | `LoadataTab` | `LoadServiceTab` trả về MASTER DATA (1047 services), không phải dịch vụ của customer |

### ⚠️ Permission Issues

User `ittest123` không có quyền:
- Xem danh sách appointments
- Xem danh sách customers

→ Cần truyền `--customer-ids` cụ thể để sync customer detail.

### ⚠️ Context Required

Trước khi gọi bất kỳ customer detail endpoint nào, **BẮT BUỘC** phải:
```python
session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}')
```

Điều này set context cho session biết đang làm việc với customer nào.

---

*Document generated: 25/12/2025*
