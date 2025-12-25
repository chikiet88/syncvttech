# VTTech Data Sync Summary - 24/12/2025

## 📊 Tổng quan dữ liệu đã sync

### Master Data (8,217 records)
| Loại | Records | File |
|------|---------|------|
| Chi nhánh | 17 | branches_20251224.json |
| Răng (Dental) | 32 | teeth_data_20251224.json |
| Dịch vụ | 1,728 | services_20251224.json |
| Nhóm dịch vụ | 86 | service_groups_20251224.json |
| Nhân viên | 1,620 | employees_20251224.json |
| Users | 1,069 | users_20251224.json |
| Tỉnh/Thành phố | 34 | cities_20251224.json |
| Quận/Huyện | 34 | districts_20251224.json |
| Quốc gia | 242 | countries_20251224.json |
| Phường/Xã | 3,321 | wards_20251224.json |
| Nguồn KH | 34 | customer_sources_20251224.json |

### Extended Data
| Loại | Records | File |
|------|---------|------|
| Branches Full | 17 | branches_full_20251224.json |
| Memberships | 6 | memberships_20251224.json |
| Service Types | 109 | service_types_20251224.json |
| Employee Groups | 37 | employee_groups_20251224.json |
| Employees Full | 1,619 | employees_full_20251224.json |

### Revenue Data (Năm 2025)
| Chi nhánh | Doanh thu (VND) |
|-----------|-----------------|
| Taza Skin Clinic Thủ Đức | 5,356,457,000 |
| Taza Skin Clinic Quận 10 | 12,576,448,000 |
| Taza Skin Clinic Gò Vấp | 8,938,860,552 |
| Taza Skin Clinic Nha Trang | 11,643,209,897 |
| TAZA Skin Clinic Đà Nẵng | 20,252,144,998 |
| Văn Phòng | 570,000 |
| Timona Thủ Đức | 6,234,209,349 |
| Timona Gò Vấp | 7,099,041,500 |
| Timona Nha Trang | 3,324,754,000 |
| Timona Đà Nẵng | 3,281,276,000 |
| Building Timona CMT8 | 16,812,113,696 |
| Timona Bình Tân | 727,975,000 |
| Taza Skin Clinic Bình Tân | 969,050,000 |
| Chi nhánh Hderma | 1,093,621,425 |
| Timona Tân Phú | 89,569,500 |
| Taza Skin Clinic Tân Phú | 167,720,000 |
| **TỔNG** | **98,567,020,917** |

## 📁 Cấu trúc thư mục

```
data_export/                     # ~3.4MB
├── master/                      # 1.6MB - Master data
│   ├── *.json                   # Dữ liệu JSON
│   └── *.csv                    # Dữ liệu CSV
├── employees/                   # 1.7MB - Nhân viên chi tiết
├── services/                    # 44KB - Dịch vụ chi tiết
└── revenue/                     # 16KB - Doanh thu

data_sync/                       # ~2.8MB
├── master/                      # Master data
├── employees/                   # Nhân viên
├── services/                    # Dịch vụ
├── revenue/                     # Doanh thu
├── customers/                   # Khách hàng (cần quyền)
├── appointments/                # Lịch hẹn (cần quyền)
├── treatments/                  # Điều trị (cần quyền)
└── inventory/                   # Kho hàng (cần quyền)
```

## 🔧 Scripts sử dụng

```bash
# Export toàn bộ dữ liệu
python3 export_all_data.py

# Export với khoảng ngày tùy chỉnh
python3 export_all_data.py --date-from 2025-01-01 --date-to 2025-12-24

# Chỉ export master data
python3 export_all_data.py --master

# Chỉ export revenue
python3 export_all_data.py --revenue --date 2025-12-23

# Full sync với discover endpoints
python3 full_sync_crawler.py --discover

# Sync hàng ngày
python3 full_sync_crawler.py --daily

# Deep scan APIs
python3 deep_scan_api.py
```

## ⚠️ Lưu ý

1. **Quyền hạn**: User `ittest123` không có quyền truy cập:
   - Danh sách khách hàng chi tiết
   - Lịch hẹn
   - Điều trị
   - Kho hàng
   
2. **Để lấy đầy đủ dữ liệu**: Cần user có quyền admin hoặc quyền xem báo cáo

3. **Rate limiting**: VTTech có giới hạn ~20 requests/phút

4. **Date range**: Tối đa 31 ngày cho mỗi query

## 📞 Endpoints hoạt động

### API Endpoints
- ✅ `/api/Author/Login` - Đăng nhập
- ✅ `/api/Home/SessionData` - Master data

### Razor Page Handlers
- ✅ `/Customer/ListCustomer/?handler=Initialize` - Branches, Memberships
- ✅ `/Customer/ListCustomer/?handler=LoadDataTotal` - Revenue summary
- ✅ `/Service/ServiceList/?handler=LoadInit` - Service init
- ✅ `/Service/ServiceList/?handler=LoadataServiceType` - Service types
- ✅ `/Employee/EmployeeList/?handler=LoadataEmployeeGroup` - Employee groups
- ✅ `/Employee/EmployeeList/?handler=LoadataEmployee` - Employees full

---
*Generated: 24/12/2025*
