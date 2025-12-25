# YÊU CẦU API VTTECH - XUẤT DỮ LIỆU

> **Ngày tạo:** 23/12/2025  
> **Mục đích:** Lấy toàn bộ dữ liệu công ty đang triển khai trên VTTech để lưu trữ và phân tích riêng  
> **Trạng thái:** ✅ ĐÃ CÓ API DOCUMENTATION

---

## 🔐 THÔNG TIN XÁC THỰC

```
URL API Docs: https://vttechsolution.com/api/docs
Username: TMTaza
Password: 62EFEB954B5F4D5
Base URL: https://vttechsolution.com
```

---

## 📋 DANH SÁCH API VTTECH ĐÃ CÓ SẴN

### 1. XÁC THỰC (Authenticate)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 1.1 | POST | `/api/Client/Autho` | Authentication - Xác thực để lấy token |

### 2. THÔNG TIN CHUNG (General)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 2.1 | POST | `/api/Branch/GetList` | Danh sách chi nhánh |

### 3. NHÂN VIÊN (Employee)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 3.1 | POST | `/api/Employee/GetList` | Danh sách nhân viên |

### 4. DỊCH VỤ (Service)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 4.1 | POST | `/api/Service/GetList` | Danh sách dịch vụ |

### 5. KHO HÀNG (Warehouse)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 5.1 | POST | `/api/WareHouse/GetReceiptList` | Danh sách phiếu nhập kho |
| 5.2 | POST | `/api/WareHouse/GetExportTSList` | Danh sách phiếu xuất kho điều trị |

### 6. DOANH THU (Sale/Revenue)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 6.1 | POST | `/api/Revenue/GetList` | Danh sách phiếu thu khách hàng |
| 6.2 | POST | `/api/Revenue/GetListByBranch` | Danh sách thu chi theo chi nhánh |

### 7. KHÁCH HÀNG (Customer)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 7.1 | POST | `/api/Customer/GetList` | Danh sách khách hàng |
| 7.2 | POST | `/api/Customer/GetTreat` | Danh sách điều trị của khách hàng |
| 7.3 | POST | `/api/Customer/GetTab` | Danh sách bán hàng (dịch vụ, thẻ, thuốc) |

### 8. LỊCH HẸN (Appointment)

| STT | Method | Endpoint | Mô tả |
|-----|--------|----------|-------|
| 8.1 | POST | `/api/Appointment/GetList` | Danh sách lịch hẹn |

---

## 🔧 THÔNG TIN KỸ THUẬT

### Xác thực (Authentication)
- **Phương thức:** JWT (JSON Web Tokens)
- **Login endpoint:** `/api/client/login`
- **Body request:**
```json
{
    "username": "TMTaza",
    "password": "62EFEB954B5F4D5",
    "passwordcrypt": ""
}
```

### Rate Limit
- **Giới hạn:** 20 requests / 1 phút cho mỗi endpoint
- **Format response:** JSON

### Parameters chung
| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| DateFrom | string | ✅ | Ngày bắt đầu (yyyy-MM-dd HH:mm:ss) |
| DateTo | string | ✅ | Ngày kết thúc (yyyy-MM-dd HH:mm:ss) |
| BranchID | number | ❌ | ID chi nhánh (0 = tất cả) |
| DataType | string | ❌ | "new" hoặc "all" |
| PagingNumber | number | ❌ | Số trang (mặc định 1) |

> ⚠️ **Lưu ý:** Khoảng thời gian truy vấn không vượt quá **31 ngày**

---

## 📝 VÍ DỤ GỌI API

### 1. Xác thực
```bash
curl -X POST "https://vttechsolution.com/api/client/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"TMTaza","password":"62EFEB954B5F4D5","passwordcrypt":""}'
```

### 2. Lấy danh sách khách hàng
```bash
curl -X POST "https://vttechsolution.com/api/Customer/GetList" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "DateFrom": "2025-11-01",
    "DateTo": "2025-11-30",
    "BranchID": 0,
    "DataType": "all",
    "PagingNumber": 1
  }'
```

### 3. Lấy danh sách lịch hẹn
```bash
curl -X POST "https://vttechsolution.com/api/Appointment/GetList" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "DateFrom": "2025-12-01",
    "DateTo": "2025-12-31",
    "BranchID": 0,
    "PagingNumber": 1
  }'
```

### 4. Lấy danh sách doanh thu
```bash
curl -X POST "https://vttechsolution.com/api/Revenue/GetList" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "DateFrom": "2025-12-01",
    "DateTo": "2025-12-31",
    "BranchID": 0
  }'
```

---

## 📊 CẤU TRÚC DỮ LIỆU TRẢ VỀ

### Response chung
```json
{
    "TotalPages": 1,
    "TotalDatas": 100,
    "PagingNumber": 1,
    "RowInPage": 100,
    "Data": [...]
}
```

### Customer Data Fields
| Field | Mô tả |
|-------|-------|
| CustomerID | ID khách hàng |
| Name | Tên khách hàng |
| Code | Mã khách hàng |
| Phone | Số điện thoại |
| Email | Email |
| Birthday | Ngày sinh |
| Gender | Giới tính |
| Address | Địa chỉ |
| BranchID | ID chi nhánh |
| CreatedDate | Ngày tạo |
| ModifiedDate | Ngày cập nhật |

### Customer Treatment Data Fields (GetTreat)
| Field | Mô tả |
|-------|-------|
| CustomerID | ID khách hàng |
| Service.ServiceID | ID dịch vụ |
| Service.ServiceName | Tên dịch vụ |
| Service.PriceUnit | Giá đơn vị |
| Service.Quantity | Số lượng |
| Service.Discount | Giảm giá |
| Service.PriceDiscounted | Giá sau giảm |
| Participate.Doctor | ID bác sĩ chính |
| Participate.Assistant | ID trợ lý |
| Percent | % hoàn thành điều trị |
| Content | Nội dung điều trị |
| TreatDateNext | Ngày điều trị tiếp theo |

### Customer Sales Data Fields (GetTab)
| Field | Mô tả |
|-------|-------|
| Service | Thông tin dịch vụ đã mua |
| Card | Thông tin thẻ trả trước |
| PrescriptionMedicine | Thông tin thuốc |
| Participate | Nhân viên liên quan (tư vấn, telesale) |
| IsChoosed | Trạng thái chốt (1: đã chốt, 0: chờ, -1: hủy) |
| ClosingDate | Ngày chốt |
| Type | Loại (service/card/medicine) |

### Appointment Data Fields
| Field | Mô tả |
|-------|-------|
| ID | ID lịch hẹn |
| Code | Mã lịch hẹn |
| CustID | ID khách hàng |
| CustName | Tên khách hàng |
| DateFrom | Ngày hẹn |
| StatusID | Trạng thái (ID) |
| StatusName | Trạng thái (Tên) |
| BranchID | ID chi nhánh |
| DoctorID | ID bác sĩ |
| ConsultID | ID tư vấn viên |
| Content | Nội dung |
| ReasonCancelID | Lý do hủy (nếu có) |

### Revenue Data Fields
| Field | Mô tả |
|-------|-------|
| ID | ID phiếu thu |
| CustID | ID khách hàng |
| Amount | Số tiền |
| PaymentMethod | Phương thức thanh toán |
| BranchID | ID chi nhánh |
| CreatedDate | Ngày tạo |

---

## � KIỂM TRA SUBDOMAIN TMTAZA

### Kết quả kiểm tra TMTaza (https://tmtaza.vttechsolution.com/)

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| Login endpoint | `/api/Author/Login` | **KHÁC** với API Docs (`/api/client/login`) |
| API `/api/Client/Autho` | ❌ 404 Not Found | **KHÔNG TỒN TẠI** trên subdomain |
| API `/api/Branch/GetList` | Response trống | Có thể thiếu quyền hoặc khác cách gọi |
| API `/api/Customer/GetList` | Response trống | Có thể thiếu quyền hoặc khác cách gọi |

### Thông tin đăng nhập TMTaza
```
URL: https://tmtaza.vttechsolution.com/
User: ittest123
Pass: ittest123
Login endpoint: POST /api/Author/Login
```

### Response đăng nhập thành công:
```json
{
  "Token": "eyJhbGciOiJodHRwOi8v...",
  "ID": 324,
  "UserName": "ittest123",
  "FullName": "it test",
  ...
}
```

### ⚠️ KẾT LUẬN QUAN TRỌNG

> **API Documentation tại `vttechsolution.com/api/docs` KHÔNG áp dụng cho các subdomain khách hàng như `tmtaza.vttechsolution.com`**

Các API documented là dành cho **hệ thống trung tâm** với tài khoản API riêng (TMTaza:62EFEB954B5F4D5), KHÔNG phải cho user login thông thường trên subdomain.

### Cách lấy dữ liệu từ TMTaza

**Phương án 1:** Liên hệ VTTech để được cấp tài khoản API riêng cho subdomain TMTaza
- Yêu cầu kích hoạt gói **IsPro = 1**
- Yêu cầu cấp **ApiKey** và **Username** để dùng với `/api/Client/Autho`

**Phương án 2:** Sử dụng web scraping/automation
- Login qua `/api/Author/Login` với user webapp
- Phân tích các API internal mà webapp sử dụng
- Response data có thể bị mã hóa (như đã thấy với `/api/Home/SessionData`)

---

## 📌 CHECKLIST TRIỂN KHAI

- [x] Có API Documentation (vttechsolution.com/api/docs)
- [x] Có thông tin xác thực API docs
- [x] Test login TMTaza subdomain - THÀNH CÔNG
- [x] Kiểm tra API endpoints trên subdomain - **KHÔNG HOẠT ĐỘNG**
- [ ] Liên hệ VTTech để cấp API key cho TMTaza
- [ ] Test API với API key mới
- [ ] Viết script đồng bộ dữ liệu
- [ ] Setup lịch chạy tự động
- [ ] Lưu trữ dữ liệu nội bộ

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **API Docs vs Subdomain:** API documented **KHÔNG** hoạt động trên subdomain khách hàng
2. **Rate Limit:** Mỗi endpoint giới hạn **20 lần/phút**
3. **Date Range:** Khoảng thời gian query không quá **31 ngày**
4. **IsPro = 1:** Các API đều yêu cầu gói Pro/Cao cấp
5. **JWT Token:** Token có thời hạn, cần refresh định kỳ
6. **Pagination:** Với dữ liệu lớn, cần loop qua nhiều trang
7. **Cần API Key riêng:** Subdomain cần được VTTech cấp ApiKey riêng để sử dụng Public API

---

## 📞 HỖ TRỢ

- **Website:** https://vttechsolution.com
- **API Docs:** https://vttechsolution.com/api/docs
- **Biên bản đào tạo:** https://cdnvttimg.vttechsolution.com/ImageDocsys/_Library/biên%20bản%20đào%20tạo%20(02012024)

---

*Cập nhật lần cuối: 23/12/2025*
