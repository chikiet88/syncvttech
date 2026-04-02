# VTTech API Integration - Master Specification

Tài liệu này tổng hợp đầy đủ các API từ hệ thống VTTech Portal, phục vụ quá trình đồng bộ dữ liệu về hệ thống local.

## 📋 BẢNG DANH SÁCH API CHUẨN

| No | Hạng Mục | API Vttech | Payload (Yêu cầu) | Response (Dữ liệu trả về) | Database dự kiến | Trạng thái |
|:---|:---|:---|:---|:---|:---|:---|
| **1** | **Xác thực** | `/api/Author/Login` | `username`, `password` | Session Token, UserID | - | ✅ |
| **2** | **Xác thực** | `/Login/Login` (GET) | - | XSRF Token, IP Token | - | ✅ |
| **3** | **Xác thực** | `/Login/Login` (POST) | `UserName`, `Password`, `IPToken` | Session Cookie (.AspNetCore) | - | ✅ |
| **4** | **Danh mục** | `/api/Home/SessionData` | `{}` | Chi nhánh, Dịch vụ, Nhân viên, Địa giới | `Branch`, `Service`, `Employee`, `User`, `Location` | ✅ |
| **5** | **Danh mục** | `/Customer/ListCustomer/?handler=Initialize` | `__RequestVerificationToken` | Nhóm khách hàng, Nguồn khách hàng | `Membership`, `CustomerSource` | ✅ |
| **6** | **Khách hàng** | `/Customer/ListCustomer/?handler=LoadData` | `dateFrom`, `dateTo`, `branchID`, `page`, `limit` | Danh sách khách hàng phát sinh | `DailyCustomer`, `Discovery` | ✅ |
| **7** | **Thông tin cá nhân** | `/Customer/GeneralInfo/?handler=LoadData` | `CustomerID` | Thông tin cá nhân (Ngày sinh, Giới tính, Địa chỉ) | `Customer` | ✅ |
| **8** | **Tài chính tổng quát** | `/Customer/MainCustomer/?handler=LoadPaymentInfo` | `CustomerID` | Tổng chi tiêu, Đã thanh toán, Còn nợ | `CustomerPayment` | ✅ |
| **9** | **Dịch vụ đã mua** | `/Customer/Service/TabList/TabList_Service/?handler=LoadataTab` | `CustomerID`, `limit` | Gói dịch vụ đã mua, trạng thái sử dụng | `CustomerServiceTab` | ✅ |
| **10** | **Thẻ tiền mặt/liệu trình** | `/Customer/Service/TabList/TabList_Card/?handler=LoadataCard` | `CustomerID`, `limit` | Thẻ tiền mặt, thẻ liệu trình, log sử dụng | `CustomerCard` | ✅ |
| **11** | **Lịch sử thanh toán** | `/Customer/PaymentList/?handler=LoadataPayment` | `CustomerID`, `limit` | Lịch sử các hóa đơn, chứng từ thanh toán | `PaymentInvoice` | ✅ |
| **12** | **Lịch sử điều trị** | `/Customer/TreatmentList/?handler=LoadataTreatment` | `CustomerID`, `limit` | Nhật ký thực hiện dịch vụ, thủ thuật | `Treatment` | ✅ |
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
