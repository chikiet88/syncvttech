# VTTech TMTaza Data Crawler - Hướng dẫn sử dụng

> **Cập nhật**: 24/12/2025 - Đã thêm full sync crawler với nhiều endpoints mới

## 🚀 Quick Start

```bash
# Export toàn bộ dữ liệu (master + revenue)
python3 export_all_data.py

# Sync dữ liệu theo khoảng ngày
python3 full_sync_crawler.py --date-from 2025-11-01 --date-to 2025-12-24

# Chỉ master data
python3 full_sync_crawler.py --master-only
```

---

## 📊 Tổng quan

Hệ thống VTTech có **2 phương thức truy cập API**:

### 1. Central API (vttechsolution.com) - ❌ Chưa kích hoạt
- URL: `https://vttechsolution.com/api/`
- Yêu cầu: **IsPro=1** (đăng ký gói Pro)
- Status: Không hoạt động vì chưa có gói Pro

### 2. Webapp API (subdomain) - ✅ Hoạt động
- URL: `https://tmtaza.vttechsolution.com/api/`
- Xác thực: JWT Token qua `/api/Author/Login`
- Status: **Hoạt động đầy đủ**

---

## 📦 Dữ liệu có thể crawl

### Master Data (từ `/api/Home/SessionData`)

| Bảng | Mô tả | Số records |
|------|-------|------------|
| Table (branches) | Chi nhánh | 17 |
| Table1 (teeth_data) | Dữ liệu răng | 32 |
| Table2 (services) | Dịch vụ | 1,728 |
| Table3 (service_groups) | Nhóm dịch vụ | 86 |
| Table4 (employees) | Nhân viên | 1,620 |
| Table5 (users) | User accounts | 1,069 |
| Table6 (cities) | Tỉnh/Thành phố | 34 |
| Table7 (districts) | Quận/Huyện | 34 |
| Table8 (countries) | Quốc gia | 242 |
| Table9 (wards) | Phường/Xã | 3,321 |
| Table10 (customer_sources) | Nguồn khách hàng | 34 |
| **Tổng** | | **~8,217** |

### Dynamic Data (từ Razor Page Handlers)

| Page | Handler | Mô tả |
|------|---------|-------|
| `/Customer/ListCustomer/` | `Initialize` | Branches, Memberships |
| `/Customer/ListCustomer/` | `LoadDataTotal` | Doanh thu theo ngày/chi nhánh |
| `/Customer/ListCustomer/` | `LoadData` | Danh sách khách hàng |
| `/Service/ServiceList/` | `LoadInit` | Service init data |
| `/Service/ServiceList/` | `LoadataServiceType` | Loại dịch vụ (109 loại) |
| `/Employee/EmployeeList/` | `LoadataEmployeeGroup` | Nhóm nhân viên (37 nhóm) |
| `/Employee/EmployeeList/` | `LoadataEmployee` | Danh sách nhân viên đầy đủ |

### Revenue Data Structure
```json
{
  "Paid": 5356457000,         // Doanh thu đã thu
  "PaidNew": 2500000000,      // Doanh thu khách mới
  "PaidNumCust": 1200,        // Số khách đã thanh toán
  "PaidNumCust_New": 800,     // Số khách mới đã thanh toán
  "Raise": 6000000000,        // Doanh số (chốt)
  "RaiseNew": 3000000000,     // Doanh số khách mới
  "Profile": 500,             // Số hồ sơ mới
  "AppChecked": 2000,         // Lịch hẹn đã check-in
  "App": 2100,                // Tổng lịch hẹn
  "BranchID": 1,
  "BranchName": "Taza Skin Clinic Thủ Đức"
}
```

---

## 🛠️ Scripts có sẵn

| Script | Mô tả |
|--------|-------|
| `sync_to_db.py` | **⭐ Sync dữ liệu và LƯU TRỰC TIẾP vào SQLite** |
| `export_all_data.py` | Export toàn bộ dữ liệu ra CSV/JSON |
| `full_sync_crawler.py` | Sync đầy đủ với nhiều options (JSON) |
| `deep_scan_api.py` | Scan tất cả endpoints có thể |
| `crawl_vttech.py` | Crawl basic master data |
| `cron_crawler.py` | Crawl hàng ngày (cron job) |
| `run.py` | Menu runner tổng hợp |

### 💾 Sync trực tiếp vào Database (khuyên dùng)

```bash
# Sync ngày hôm nay
python3 sync_to_db.py --daily

# Sync ngày cụ thể 
python3 sync_to_db.py --date 2025-12-25

# Sync khoảng ngày
python3 sync_to_db.py --date-from 2025-12-01 --date-to 2025-12-25

# Chỉ master data
python3 sync_to_db.py --master-only
```

Database: `database/vttech.db` (SQLite)

---

## 📁 Cấu trúc thư mục Output

```
data_export/           # Dữ liệu export (CSV + JSON)
├── master/            # Master data
│   ├── branches_20251224.json/csv
│   ├── services_20251224.json/csv
│   ├── employees_20251224.json/csv
│   └── ...
├── services/          # Dữ liệu dịch vụ chi tiết
├── employees/         # Dữ liệu nhân viên chi tiết
└── revenue/           # Doanh thu

data_sync/             # Dữ liệu sync (full_sync_crawler)
├── master/
├── customers/
├── appointments/
├── revenue/
├── treatments/
└── inventory/

data_daily/            # Dữ liệu cron hàng ngày
├── master/
└── revenue/
```

---

## 📈 Thống kê Dữ liệu (25/12/2025)

### Database (`vttech.db`)
- **Chi nhánh**: 17 (Taza Skin Clinic, Timona, Hderma)
- **Nhân viên**: 1,620+
- **Dịch vụ**: 1,728
- **Users**: 1,069
- **Doanh thu tháng 12/2025**: ~5.3 tỷ VND (25 ngày)

### Báo cáo chi tiết
Xem file [DATA_INTEGRITY_REPORT.md](DATA_INTEGRITY_REPORT.md)

---

## Thông tin đăng nhập

### Webapp (đang sử dụng)
```
URL: https://tmtaza.vttechsolution.com/
User: ittest123
Pass: ittest123
Role: Admin (quyền admin)
```

### Central API (chưa kích hoạt)
```
URL: https://vttechsolution.com/api/
Username: TMTaza  
Password: 62EFEB954B5F4D5
```

---

## API Format

### Login Request
```json
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

### Login Response
```json
{
  "Session": "eyJhbGciOiJodHRwOi8vd3d3...",
  "UserName": "ittest123",
  "FullName": "it test",
  "ID": 324,
  ...
}
```

### Authenticated Request
```json
POST /api/Home/SessionData
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
{}
```

### Response Encoding
- Response có thể được nén: **Base64 + GZip**
- Giải nén bằng:
```python
import base64, zlib
decoded = base64.b64decode(data)
decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
```

---

## Hạn chế

1. **Dữ liệu Customer/Booking/Revenue**: Không có endpoint API trực tiếp từ webapp. Cần:
   - Đăng ký gói Pro (IsPro=1) để dùng Central API
   - Hoặc sử dụng Selenium/Playwright để crawl qua giao diện web

2. **Rate Limit**: 20 requests/phút/endpoint (theo tài liệu)

3. **Date Range**: Tối đa 31 ngày/lần query

---

## Tóm tắt

✅ **Có thể lấy**:
- Chi nhánh (17)
- Dịch vụ (1,728)
- Nhân viên (1,618)
- Users (1,067)
- Địa giới hành chính (3,389)
- Nhóm dịch vụ (86)
- Nguồn khách (34)
- **Doanh thu theo chi nhánh** (qua LoadDataTotal)
- **Danh sách khách hàng mới** (qua LoadData)
- **Membership levels** (qua Initialize)

⚠️ **Cần XSRF token** (đã hỗ trợ trong `test_customer_api.py`):
- Danh sách khách hàng chi tiết
- Báo cáo doanh thu theo ngày

❌ **Chưa tìm được endpoint**:
- Lịch hẹn/Booking
- Báo cáo chi tiết
