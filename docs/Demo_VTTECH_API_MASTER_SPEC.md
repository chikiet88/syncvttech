# VTTech API Integration - Master Specification

Tài liệu này tổng hợp đầy đủ các API từ hệ thống VTTech Portal, phục vụ quá trình đồng bộ dữ liệu về hệ thống local.

## 📋 BẢNG DANH SÁCH API CHUẨN

| No | Hạng Mục | API Vttech | Payload (Yêu cầu) | Response (Dữ liệu trả về) | Database dự kiến | Trạng thái |
|:---|:---|:---|:---|:---|:---|:---|
| **1** | **Xác thực** | `/api/Author/Login` | `{"username": "ittest123", "password": "..."}` | `{"Session": "JWT_TOKEN", "UserID": 324, "UserName": "ittest123"}` | - | ✅ |
| **2** | **Xác thực** | `/Login/Login` (GET) | - | XSRF Token, IP Token | - | ✅ |
| **3** | **Xác thực** | `/Login/Login` (POST) | `UserName`, `Password`, `IPToken` | Session Cookie (.AspNetCore) | - | ✅ |
| **4** | **Danh mục** | `/api/Home/SessionData` | `{}` | `{"Table": [Branchx17], "Table2": [Servicex1700], ...}` | `Branch`, `Service`, `Employee`, `User`, `Location` | ✅ |
| **5** | **Danh mục** | `/Customer/ListCustomer/?handler=Initialize` | `__RequestVerificationToken` | Nhóm khách hàng, Nguồn khách hàng | `Membership`, `CustomerSource` | ✅ |
| **6** | **Khách hàng** | `/Customer/ListCustomer/?handler=LoadData` | `dateFrom`, `dateTo`, `branchID`, `page`, `limit` | Danh sách khách hàng phát sinh | `DailyCustomer`, `Discovery` | ✅ |
| **7** | **Thông tin cá nhân** | `/Customer/GeneralInfo/?handler=LoadData` | `CustomerID` | Thông tin cá nhân (Ngày sinh, Giới tính, Địa chỉ) | `Customer` | ✅ |
| **8** | **Tài chính tổng quát** | `/Customer/MainCustomer/?handler=LoadPaymentInfo` | `CustomerID=30056` | `[{"PRICE_DISCOUNTED": 47600000.0, "PAID": 0.0, "DEPOST_LEFT": 0.0}]` | `CustomerPayment` | ✅ |
| **9** | **Dịch vụ đã mua** | `/Customer/Service/TabList/TabList_Service/?handler=LoadataTab` | `CustomerID`, `limit` | Gói dịch vụ đã mua, trạng thái sử dụng | `CustomerServiceTab` | ✅ |
| **10** | **Thẻ tiền mặt/liệu trình** | `/Customer/Service/TabList/TabList_Card/?handler=LoadataCard` | `CustomerID`, `limit` | Thẻ tiền mặt, thẻ liệu trình, log sử dụng | `CustomerCard` | ✅ |
| **11** | **Lịch sử thanh toán** | `/Customer/PaymentList/?handler=LoadataPayment` | `CustomerID`, `limit` | Lịch sử các hóa đơn, chứng từ thanh toán | `PaymentInvoice` | ✅ |
| **12** | **Lịch sử điều trị** | `/Customer/TreatmentList/?handler=LoadataTreatment` | `CustomerID=30056` | `[{"TabID": 8721, "PriceDiscounted": 1600000.0, "PercentComplete": 100}]` | `Treatment` | ✅ |
| **13** | **Lịch sử CSKH (Care)** | `/Customer/HistoryList_Care/?handler=LoadataHistory` | `CustomerID`, `limit` | Nhật ký gọi điện, tư vấn, chăm sóc | `CustomerCareHistory` | ✅ |
| **14** | **Hình ảnh Cloud** | `/CustomerImage/?handler=LoadImageByFolder` | `CustomerID` | Danh sách link ảnh cloud (Trước/Sau) | `CustomerImage` | ✅ |
| **15** | **Đơn thuốc/mỹ phẩm** | `/Customer/Service/TabList/TabList_Medicine/?handler=LoadataPrescription` | `CustomerID`, `limit` | Gói thuốc, mỹ phẩm đã kê đơn | `CustomerPrescription` | ✅ |
| **16** | **Lịch sử trạng thái** | `/Customer/StatusList/?handler=LoadataStatus` | `CustomerID`, `limit` | Lịch sử thay đổi trạng thái khách hàng | `CustomerStatusLog` | ✅ |
| **17** | **Doanh thu** | `/Report/Revenue/Branch/AllBranchGrid/?handler=LoadataDetailByBranch` | `branchID`, `dateFrom`, `dateTo` | Chi tiết giao dịch: Số tiền, Dịch vụ, Nhân viên | `RevenueTransaction` | ✅ |
| **18** | **Điều trị** | `/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadComboMain` | `CustomerID` | Danh sách ServiceTab, ServiceCatTab | `ServiceCategory` | ✅ |
| **19** | **Điều trị** | `/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadDetail` | `CustomerID`, `TabID` | Chi tiết buổi điều trị, bác sĩ thực hiện | `TreatmentDetail` | ✅ |

---

## ⚙️ CÁC QUY TẮC KỸ THUẬT QUAN TRỌNG

### 1. Giải mã dữ liệu (Decompression)
Hầu hết API trả về dữ liệu nén. Quy trình giải mã bắt buộc:
**Base64 String** ➔ **GZip/Deflate Decode** ➔ **UTF-8 JSON**.

### 2. Bảo mật (Security)
- **Token**: Cần duy trì đồng thời `WebToken` (JWT) và `.AspNetCore.Session` (Cookie).
- **XSRF**: Phải parse `__RequestVerificationToken` từ HTML của trang tương ứng trước khi gọi POST handler.

### 3. Tối ưu hóa (Optimization)
- **Rate Limit**: Duy trì khoảng nghỉ (delay) từ **100ms - 500ms** giữa các request chi tiết khách hàng.
- **Deduplication**: Kiểm tra `MD5 Hash` nội dung trước khi `Upsert` vào database để tránh ghi đè dữ liệu trùng lặp.

### 4. Database Storage
- Dữ liệu được lưu trữ ưu tiên vào SQLite (`vttech.db`) hoặc PostgreSQL tùy theo cấu hình cell.
- Sử dụng cơ chế `Upsert` dựa trên ID gốc của VTTech.

---

## 🧪 KẾT QUẢ TEST THỰC TẾ (DEMO - 02/04/2026)

### 1. Đồng bộ Danh sách Khách hàng (Hồ sơ)
- **Kịch bản**: Lấy danh sách khách hàng mới tạo hồ sơ tại chi nhánh **Taza Skin Clinic Thủ Đức**.
- **Handler**: `/Customer/ListCustomer/?handler=LoadData`
- **Method**: `POST`
- **Payload thực tế**:
  ```json
  {
    "dateFrom": "2026-04-02 00:00:00",
    "dateTo": "2026-04-02 00:00:00",
    "branchID": "1",
    "type": "5",
    "BeginID": 0,
    "BeginCustID": 0,
    "Limit": 500
  }
  ```
- **Headers bắt buộc**:
  - `secretkey`: `vvjeUfMxJcm2aB0fl2ySxsiqGj5X5X3SY3Dl6Qj2te0SouYCtVRKC7qcp/MiP16aD5iQLEfgAsDk/ERxed+eUbi8eaY7/mraxUcfGqobMu4=`
  - `xsrf-token`: (Lấy động từ trang `/Customer/ListCustomer/`)
  - `Referer`: `https://tmtaza.vttechsolution.com/customer/listcustomer/`
- **Kết quả đối soát**:
  - Tìm thấy **6 hồ sơ** (Khớp hoàn toàn với dashboard).
  - Danh sách mã khách hàng nhận về: `Q_T00193203`, `Q_T00193205`, `Q_T00193206`, `Q_T00193209`, `C_T00193251`, `PVD00193254`.
  - Nguồn khách hàng: **Khách Giới Thiệu**.

### 2. Các chỉ số Dashboard tương ứng (Nhánh Thủ Đức)
- **Hồ sơ**: 6
- **CheckedIn**: 18
- **Doanh số**: 2.900.000
- **Doanh thu**: 1.300.000
