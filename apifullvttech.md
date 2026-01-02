# API ENDPOINTS - VTTECH TMTAZA

## 🔄 MASTER DATA SYNC

### 1. Marketing - Ticket Extensions
**Endpoint:** `/Marketing/TicketExtensionList/?handler=LoadData`
- **URL:** https://tmtaza.vttechsolution.com/Marketing/TicketExtensionList/?handler=LoadData
- **Method:** POST
- **Purpose:** Lấy danh sách các extension ticket marketing
- **Database Table:** `marketing_ticket_extensions`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 2. Marketing - Ticket Groups  
**Endpoint:** `/Marketing/TicketGroupList/?handler=LoadData`
- **URL:** https://tmtaza.vttechsolution.com/Marketing/TicketGroupList/?handler=LoadData
- **Method:** POST
- **Purpose:** Lấy danh sách nhóm ticket marketing
- **Database Table:** `marketing_ticket_groups`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

---

## 👥 CUSTOMER DETAIL SYNC

> **⚠️ LƯU Ý QUAN TRỌNG:** Tất cả các endpoint Customer Detail **BẮT BUỘC** phải:
> 1. GET trang `/Customer/MainCustomer?CustomerID={id}` trước để khởi tạo session
> 2. Truyền `CustomerID` trong FormData của mỗi request handler

### 1. Tab Dịch Vụ (Services)

#### 1.1 Initialize Service Tab
- **URL:** https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Service/?handler=LoadInitialize
- **Purpose:** Khởi tạo tab dịch vụ, lấy combo data

#### 1.2 Customer Services (CUSTOMER DATA) ✅
- **URL:** https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Service/?handler=LoadataTab
- **Purpose:** Lấy danh sách dịch vụ khách hàng đã mua
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_services`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

#### 1.3 Service Master List (MASTER DATA)
- **URL:** https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Service/?handler=LoadServiceTab
- **Purpose:** Lấy toàn bộ danh sách dịch vụ hệ thống (KHÔNG dùng cho customer detail)

#### 1.4 Treatment Plans ✅ [NEW]
- **URL:** https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Service/?handler=LoadInfo_Treatment_Plant
- **Purpose:** Lấy kế hoạch điều trị của khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_treatment_plans`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 2. Tab Điều Trị (Treatments)

#### 2.1 Treatment Combo
- **URL:** https://tmtaza.vttechsolution.com/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadComboMain
- **Purpose:** Lấy combo data cho tab điều trị

#### 2.2 Customer Treatments ✅
- **URL:** https://tmtaza.vttechsolution.com/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadataTreatment
- **Purpose:** Lấy lịch sử điều trị của khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_treatments`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 3. Thanh Toán (Payments) ✅

#### 3.1 Customer Payments
- **URL:** https://tmtaza.vttechsolution.com/Customer/Payment/PaymentList/PaymentList_Service/?handler=LoadataPayment
- **Purpose:** Lấy danh sách thanh toán của khách hàng
- **FormData:** `CustomerID={id}&CurrentID=0&CurrentType=`
- **Database Table:** `customer_payments`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

#### 3.2 Payment Signature ✅
- **URL:** https://tmtaza.vttechsolution.com/Customer/Payment/PaymentList/PaymentList_Service/?handler=GetSign_Payment
- **Purpose:** Lấy chữ ký điện tử theo mã bill
- **FormData:** `id={payment_id}&type=payment`
- **Database Field:** `customer_payments.signature_data`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 4. Hình Ảnh (Images)

#### 4.1 Image Folders
- **URL:** https://tmtaza.vttechsolution.com/Customer/CustomerImage/?handler=LoadImageByFolder
- **Purpose:** Lấy hình ảnh khách hàng theo folder
- **FormData:** `CustomerID={id}`

#### 4.2 Image Templates
- **URL:** https://tmtaza.vttechsolution.com/Customer/CustomerImage/?handler=LoadTemplateForm
- **Purpose:** Lấy template form hình ảnh

### 5. Trả Góp (Installments) ✅ [NEW]

- **URL:** https://tmtaza.vttechsolution.com/Customer/Installment/InstallmentList/?handler=LoadDetail
- **Purpose:** Lấy chi tiết trả góp của khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_installments`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 6. Lịch Sử Chăm Sóc (Care History) ✅

- **URL:** https://tmtaza.vttechsolution.com/Customer/History/HistoryList_Care/?handler=LoadataHistory
- **Purpose:** Lấy lịch sử chăm sóc khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_history`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 7. Lịch Hẹn (Appointments) ✅

#### 7.1 Appointment Combo
- **URL:** https://tmtaza.vttechsolution.com/Appointment/AppointmentByDay/?handler=LoadCombo
- **Purpose:** Lấy combo data cho lịch hẹn

#### 7.2 Customer Schedules
- **URL:** https://tmtaza.vttechsolution.com/Customer/ScheduleList_Schedule/?handler=Loadata
- **Purpose:** Lấy lịch hẹn của khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_appointments`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

### 8. Khiếu Nại (Complaints) ✅ [NEW]

- **URL:** https://tmtaza.vttechsolution.com/Customer/ComplaintList/?handler=Loadata
- **Purpose:** Lấy danh sách khiếu nại của khách hàng
- **FormData:** `CustomerID={id}`
- **Database Table:** `customer_complaints`
- **Status:** ✅ Đã tích hợp vào `unified_sync.py`

---

## 🔄 24. FULL SYNC FLOW: Branch → Customers → Details

### Tổng Quan
Flow đồng bộ toàn diện theo thứ tự: Master Data → Revenue → Customers → Customer Details

### Các Bước Thực Hiện

#### Bước 1: Sync Master Data
```bash
python3 unified_sync.py --master
```
**Bao gồm:**
- ✅ Branches (chi nhánh)
- ✅ Services (dịch vụ)
- ✅ Service Groups (nhóm dịch vụ)
- ✅ Employees (nhân viên)
- ✅ Employee Groups (nhóm nhân viên)
- ✅ Service Types (loại dịch vụ)
- ✅ Customer Sources (nguồn khách hàng)
- ✅ Cities, Wards (địa danh)
- ✅ Memberships (hạng thành viên)
- ✅ **Marketing Ticket Extensions** [NEW]
- ✅ **Marketing Ticket Groups** [NEW]

#### Bước 2: Sync Revenue (Doanh Thu)
```bash
python3 unified_sync.py --revenue --date-from 2025-12-01 --date-to 2025-12-31
```
**Lấy theo từng chi nhánh:**
- Tổng doanh thu
- Số lượng khách hàng

#### Bước 3: Sync Customers (Khách Hàng)
```bash
python3 unified_sync.py --customers --date-from 2025-12-01 --date-to 2025-12-31
```
**Cải tiến:** Lặp qua tất cả các chi nhánh để đảm bảo phát hiện đầy đủ khách hàng
- Thử lấy từ Appointments theo ngày
- Nếu không có, fallback sang Customer List API
- **Iteration:** Thử cả `branchID=-1` và từng branch riêng lẻ

#### Bước 4: Sync Customer Details
```bash
python3 unified_sync.py --customer-ids 30056,183090
```
**Đồng bộ đầy đủ cho từng khách hàng:**
1. ✅ Services (dịch vụ đã mua)
2. ✅ Treatments (lịch sử điều trị)
3. ✅ Payments (thanh toán + chữ ký)
4. ✅ Appointments (lịch hẹn)
5. ✅ History (lịch sử chăm sóc)
6. ✅ **Treatment Plans (kế hoạch điều trị)** [NEW]
7. ✅ **Installments (trả góp)** [NEW]
8. ✅ **Complaints (khiếu nại)** [NEW]

### Database Schema

#### New Tables Added
```sql
-- Marketing Ticket Extensions
CREATE TABLE marketing_ticket_extensions (
    id INTEGER PRIMARY KEY,
    name TEXT,
    code TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Ticket Groups
CREATE TABLE marketing_ticket_groups (
    id INTEGER PRIMARY KEY,
    name TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Treatment Plans
CREATE TABLE customer_treatment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    plan_id INTEGER,
    service_name TEXT,
    doctor_name TEXT,
    created_at DATETIME,
    note TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(customer_id, plan_id)
);

-- Customer Installments
CREATE TABLE customer_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    installment_id INTEGER,
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    remain_amount REAL DEFAULT 0,
    created_at DATETIME,
    note TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(customer_id, installment_id)
);

-- Customer Complaints
CREATE TABLE customer_complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    complaint_id INTEGER,
    content TEXT,
    status_name TEXT,
    created_at DATETIME,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(customer_id, complaint_id)
);
```

### Verification Commands

```bash
# Kiểm tra master data mới
sqlite3 database/vttech.db "SELECT count(*) FROM marketing_ticket_extensions;"
sqlite3 database/vttech.db "SELECT count(*) FROM marketing_ticket_groups;"

# Kiểm tra customer details mới
sqlite3 database/vttech.db "SELECT count(*) FROM customer_treatment_plans;"
sqlite3 database/vttech.db "SELECT count(*) FROM customer_installments;"
sqlite3 database/vttech.db "SELECT count(*) FROM customer_complaints;"

# Kiểm tra payment signatures
sqlite3 database/vttech.db "SELECT payment_id, substr(signature_data, 1, 50) FROM customer_payments WHERE signature_data IS NOT NULL;"
```

---

## 📝 Notes

- **Session Management:** Mỗi customer detail sync cần GET `/Customer/MainCustomer?CustomerID={id}` trước
- **CustomerID Required:** Tất cả handler phải có `CustomerID` trong FormData
- **Branch Iteration:** Sync customers lặp qua tất cả branches để đảm bảo không bỏ sót
- **Auto Schema:** `ensure_tables()` tự động tạo bảng khi chạy sync