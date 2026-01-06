# NestJS VTTech Sync Engine - Endpoint Documentation

This document lists all VTTech API endpoints utilized by the NestJS synchronization services, including their schedules, payloads, and response structures.

---

## 🕒 Cron Schedules

| Service | Task | Frequency | Strategy |
| :--- | :--- | :--- | :--- |
| `SyncService` | `handleDailySync` | Daily | **Phân tách theo ngày:** Xử lý doanh thu -> Discovery -> Details cho từng ngày một để tránh quá tải API. |
| `PbxSyncService` | `handleDailyPbxSync` | Daily | Đồng bộ log cuộc gọi và file ghi âm ngày hôm trước. |

---

## ⚡ Chiến lược Giảm tải (Optimized Strategy)

Để tránh bị VTTech chặn hoặc quá tải khi đồng bộ khoảng thời gian dài:
1.  **Xử lý Cuốn chiếu (Daily Chunking)**: Hệ thống không lấy tất cả ID khách hàng của 30 ngày rồi mới đồng bộ. Thay vào đó, nó hoàn tất **toàn bộ dữ liệu** của Ngày 1 (bao gồm cả chi tiết sâu) trước khi sang Ngày 2.
2.  **Độ trễ Micro (Micro-delays)**: Giữa mỗi khách hàng khi đồng bộ chi tiết (Full Sync), hệ thống nghỉ **100ms**.
3.  **Tránh trùng lặp (Session Deduplication)**: Trong một phiên đồng bộ, nếu một khách hàng xuất hiện ở nhiều ngày khác nhau, hệ thống chỉ chạy Full Sync **01 lần duy nhất** để tiết kiệm tài nguyên.

---

## 🔐 1. Authentication & Base Setup

### 1.1 Login
- **Method:** `POST`
- **Endpoint:** `/api/Author/Login`
- **Payload:**
```json
{
  "username": "VTTECH_USERNAME",
  "password": "VTTECH_PASSWORD",
  "passwordcrypt": "",
  "from": "",
  "sso": "",
  "ssotoken": ""
}
```
- **Response Structure:**
```json
{
  "Session": "JWT_TOKEN_HERE",
  "ID": 324,
  "UserName": "...",
  "BranchID": 1
}
```

### 1.2 Get XSRF Token
- **Method:** `GET`
- **Endpoint:** `/Customer/ListCustomer/`
- **Description:** Parses the HTML to find `<input name="__RequestVerificationToken" value="...">`. This token is required for all subsequent `callHandler` (POST) requests.

---

## 📦 2. Master Data (Catalog Sync)

### 2.1 Global Session Data
- **Method:** `POST`
- **Endpoint:** `/api/Home/SessionData`
- **Payload:** `{}`
- **Response Structure (Multiple Tables):**
  - `Table`: Branches (Chi nhánh)
  - `Table2`: Services (Dịch vụ)
  - `Table3`: Service Groups (Nhóm dịch vụ)
  - `Table4`: Employees (Nhân viên)
  - `Table5`: Users (Người dùng hệ thống)
  - `Table6`: Cities (Tỉnh/Thành)
  - `Table7`: Districts (Quận/Huyện)
  - `Table9`: Wards (Phường/Xã)
  - `Table10`: Customer Sources (Nguồn khách hàng)

### 2.2 Membership Tiers
- **Method:** `POST` (Handler)
- **Endpoint:** `/Customer/ListCustomer/?handler=Initialize`
- **Payload:**
```js
{
  "__RequestVerificationToken": "XSRF_TOKEN"
}
```
- **Response Structure:**
```json
{
  "Membership": [{"ID": 1, "Name": "Silver", ...}],
  "Branch": [...]
}
```

---

## 📊 3. Daily Activity Sync

### 3.1 Revenue Summary (LoadDataTotal)
- **Method:** `POST` (Handler)
- **Endpoint:** `/Customer/ListCustomer/?handler=LoadDataTotal`
- **Payload:**
```js
{
  "dateFrom": "YYYY-MM-DD 00:00:00",
  "dateTo": "YYYY-MM-DD 23:59:59",
  "branchID": "0" // or specific ID
}
```
- **Response Structure:**
```json
[{
  "Paid": 15000000,
  "CustomerCount": 10,
  "BranchName": "..."
}]
```

### 3.2 Customer Discovery (LoadData)
- **Method:** `POST` (Handler)
- **Endpoint:** `/Customer/ListCustomer/?handler=LoadData`
- **Payload:**
```js
{
  "dateFrom": "...",
  "dateTo": "...",
  "branchID": 0,
  "type": 1, // 1: New Registration, 2: Transaction/Activity, 3: History Update
  "start": 0,
  "length": 100
}
```
- **Response Structure (Object with numeric keys or Table):**
```json
{
  "0": { "ID": 123, "FullName": "...", "Phone": "..." },
  "1": { "ID": 124, ... }
}
```

### 3.3 Appointments (AppointmentInDay)
- **Method:** `POST` (Handler)
- **Endpoint:** `/Appointment/AppointmentInDay/?handler=LoadData`
- **Payload:**
```js
{
  "dateFrom": "...",
  "dateTo": "...",
  "branchID": 0
}
```
- **Response Structure:** Array-like object containing fields `ID`, `CustomerID`, `CustomerName`, `Phone`, `Status`.

---

## 👤 4. Customer Detailed Profile (Full Sync)

*Called for every ID found in discovery phase. These endpoints use the Razor Page Handler pattern.*

### 4.1 Payment Summary (LoadPaymentInfo)
- **Endpoint:** `/Customer/MainCustomer/?handler=LoadPaymentInfo`
- **Purpose:** Get total spending and debt summary.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:**
```json
[{
  "PAID": 15000000,
  "PRICE_DISCOUNTED": 20000000,
  "PHONE": "..."
}]
```

### 4.2 Services Purchased (LoadataTab)
- **Endpoint:** `/Customer/Service/TabList/TabList_Service/?handler=LoadataTab`
- **Purpose:** Sync purchased service cards/packages.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** 
```json
{ "Table": [{ "ID": 1, "ServiceName": "...", "Quantity": 1, "Price": 1000, "Total": 1000, "StatusName": "..." }] }
```

### 4.3 Payment History (LoadataPayment)
- **Endpoint:** `/Customer/Payment/PaymentList/PaymentList_Service/?handler=LoadataPayment`
- **Purpose:** Sync all successful payments/invoices.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:**
```json
{ "Table": [{ "ID": 1, "Amount": 5000, "Date": "...", "MethodName": "Tiền mặt", "Note": "..." }] }
```

### 4.4 Treatment Records (LoadataTreatment)
- **Endpoint:** `/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadataTreatment`
- **Purpose:** Sync history of visits and treatments.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `CustomerName`, `ServiceName`, `EmployeeName`, `Date`.

### 4.5 Care History (LoadataHistory)
- **Endpoint:** `/Customer/History/HistoryList_Care/?handler=LoadataHistory`
- **Purpose:** Counseling and follow-up history.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `TypeName`, `Date`, `EmployeeName`, `Content`.

### 4.6 Installments (LoadDetail)
- **Endpoint:** `/Customer/Installment/InstallmentList/?handler=LoadDetail`
- **Purpose:** Sync credit/installment payment status.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `TotalAmount`, `PaidAmount`, `RemainAmount`, `Date`.

### 4.7 Complaints (Loadata)
- **Endpoint:** `/Customer/ComplaintList/?handler=Loadata`
- **Purpose:** Sync customer feedback and complaints.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `Content`, `StatusName`, `Date`.

### 4.8 Future Treatment Plans (LoadataTab_Plan)
- **Endpoint:** `/Customer/Service/TabList/TabList_Service/?handler=LoadataTab_Plan`
- **Purpose:** Planned future services.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `ServiceName`, `DoctorName`, `Date`, `Note`.

### 4.9 Profile Change History (LoadataTab_History_Change)
- **Endpoint:** `/Customer/MainCustomer/?handler=LoadataTab_History_Change`
- **Purpose:** Audit logs for customer information changes.
- **Payload:** `{ "CustomerID": ID }`
- **Response Structure:** Array or `{ "Table": [...] }` containing `ID`, `Content`, `EmployeeName`, `Date`.

---

## 📞 5. PBX & Call Center

### 5.1 Extension List
- **Method:** `POST` (Handler)
- **Endpoint:** `/Marketing/TicketExtensionList/?handler=LoadData`
- **Payload:** `{}`
- **Response Structure:** Array of `ID`, `Extension`, `Password`.

### 5.2 Call Center Groups
- **Method:** `POST` (Handler)
- **Endpoint:** `/Marketing/TicketGroupList/?handler=LoadData`
- **Response Structure:** Object containing `Members` list for each group.

### 5.3 PBX CDR (External API)
- **Method:** `GET`
- **Endpoint:** `PBX_API_URL` (configured in .env)
- **Payload:**
```js
{
  "domain": "PBX_DOMAIN",
  "from": "...",
  "to": "...",
  "limit": 100,
  "offset": 0
}
```
- **Response Structure:**
```json
{
  "data": [{"uuid": "...", "direction": "inbound", "duration": 60, ...}],
  "total": 100
}
```

---
*Generated: 2026-01-06*
