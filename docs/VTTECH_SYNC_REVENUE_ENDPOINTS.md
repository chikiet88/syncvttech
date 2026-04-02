# Tài liệu Endpoint VTTech - Đồng bộ Doanh thu & Dữ liệu Khách hàng

Tài liệu này liệt kê các endpoint và tham số chi tiết được sử dụng trong quá trình "Đồng bộ doanh thu" từ hệ thống VTTech Portal về cơ sở dữ liệu local.

## 1. Xác thực & Session (Authentication)

Trước khi gọi bất kỳ handler nào, hệ thống thực hiện quy trình đăng nhập 3 bước để thiết lập session cookie đầy đủ (bao gồm `.AspNetCore.Session`, `.AspNetCore.Antiforgery`, và `WebToken`).

| Tính năng | URL | Method | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Lấy IP Token** | `/Login/Login/` | GET | Trích xuất chuỗi IP Token động từ HTML body |
| **Login API** | `/api/Author/Login` | POST | Trả về `Session` (Token) và `SecretKey` |
| **Establish Session** | `/Login/Login` | POST | Gửi form `UserName`, `Password`, `IPToken` để nhận Cookie chính thức |

---

## 2. Đồng bộ Danh mục (Master Data)

Dùng để cập nhật danh sách Chi nhánh, Dịch vụ, Nhân viên, v.v.

### 2.1. Dữ liệu Session chung
- **URL**: `/api/Home/SessionData`
- **Method**: POST
- **Body**: `{}`
- **Dữ liệu nhận về**: 
  - `Table`: Danh sách Chi nhánh (Branch)
  - `Table2`: Danh sách Dịch vụ (Service)
  - `Table3`: Danh sách Nhóm dịch vụ (Service Group)
  - `Table4`: Danh sách Nhân viên (Employee)
  - `Table5`: Danh sách User hệ thống
  - `Table6`, `Table7`, `Table9`: Tỉnh/Thành, Quận/Huyện, Phường/Xã

### 2.2. Dữ liệu Khởi tạo Khách hàng
- **URL**: `/Customer/ListCustomer/`
- **Handler**: `Initialize`
- **Method**: POST
- **Dữ liệu nhận về**: Danh sách Hạng thành viên (Membership), Nguồn khách hàng.

---

## 3. Đồng bộ Doanh thu (Revenue Sync)

Quy trình này gồm 2 phần: Lấy danh sách giao dịch chi tiết và Phát hiện khách hàng mới để đồng bộ hồ sơ.

### 3.1. Chi tiết Doanh thu theo Chi nhánh
Dùng để lấy các giao dịch thanh toán, nạp tiền của từng chi nhánh.

- **URL**: `/Report/Revenue/Branch/AllBranchGrid/`
- **Handler**: `LoadataDetailByBranch`
- **Method**: POST (Form Data)
- **Tham số**:
  - `branchID`: ID chi nhánh (ví dụ: `1`)
  - `dateFrom`: Định dạng `DD-MM-YYYY`
  - `dateTo`: Định dạng `DD-MM-YYYY`
- **Dữ liệu nhận về**: Mảng các giao dịch (ID, CustomerName, Amount, ServiceName, Content, Date, v.v.)

### 3.2. Tìm kiếm Khách hàng theo ngày phát sinh
Dùng để xác định những khách hàng nào có hoạt động trong ngày để thực hiện đồng bộ hồ sơ chi tiết.

- **URL**: `/Customer/ListCustomer/`
- **Handler**: `LoadData`
- **Method**: POST (Form Data)
- **Tham số**:
  - `dateFrom`: `YYYY-MM-DD 00:00:00`
  - `dateTo`: `YYYY-MM-DD 23:59:59`
  - `branchID`: ID chi nhánh hoặc `0` (Tất cả)
  - `type`: `2` (Lọc theo ngày có phát sinh giao dịch/hoạt động)
  - `BeginID`: `0`
  - `BeginCustID`: `'0'`
  - `Limit`: `100` (Số lượng bản ghi mỗi trang)

---

## 4. Đồng bộ Chi tiết Khách hàng (Customer Deep Sync)

Sau khi có `CustomerID` từ bước 3, hệ thống gọi các endpoint sau để lấy toàn bộ hồ sơ.

| Đối tượng | URL | Handler | Tham số chính |
| :--- | :--- | :--- | :--- |
| **Thông tin chung** | `/Customer/GeneralInfo/` | `LoadData` | `CustomerID` |
| **Lịch sử Trạng thái** | `/Customer/StatusList/` | `LoadataStatus` | `CustomerID`, `limit: 100` |
| **Thẻ liệu trình** | `/Customer/Service/TabList/TabList_Card/` | `LoadataCard` | `CustomerID`, `limit: 100` |
| **Dịch vụ đã mua** | `/Customer/Service/TabList/TabList_Service/` | `LoadataService` | `CustomerID`, `limit: 100` |
| **Tiền sử bệnh lý** | `/Customer/Service/TabList/TabList_Anamnesis/` | `LoadataAnamnesis` | `CustomerID`, `limit: 100` |

---

## 5. Quy tắc xử lý dữ liệu chung

1. **Throttling**: Giữa các yêu cầu đồng bộ chi nhánh, hệ thống nghỉ **5-30 giây** để tránh bị khóa bởi Server.
2. **Decompression**: Dữ liệu trả về từ các Handler của VTTech thường được nén bằng `GZip` hoặc `Deflate` và mã hóa `Base64`. Backend thực hiện giải nén trước khi xử lý JSON.
3. **Checksum**: Sử dụng `MD5 hash` của nội dung bản ghi để so sánh với `last_hash` trong DB. Chỉ thực hiện `Upsert` nếu dữ liệu có thay đổi để tối ưu hiệu suất.
4. **XSRF Token**: Mỗi trang portal yêu cầu một Token `__RequestVerificationToken` riêng biệt. Backend tự động parse HTML của trang tương ứng để lấy token này trước khi gọi Handler.
