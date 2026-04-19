# Danh Sách API Hệ Thống Vttech TMTaza

Tài liệu này tổng hợp toàn bộ các API đang được sử dụng trong dự án để đồng bộ dữ liệu từ hệ thống Vttech.

---

## ℹ️ Chú thích trạng thái
- ✅ OK: API hoạt động ổn định, dữ liệu trả về chính xác.
- 🔄 Improved: API đã được xử lý thêm logic (fix date, tự động re-login) để đảm bảo tính ổn định.

---

## 🔐 1. Authentication & Session (Xác thực)

| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/api/Author/Login` | POST | ✅ OK | - | Đăng nhập hệ thống bằng username/password để lấy `Session` (JWT Token) và `SecretKey`. |
| `/Customer/ListCustomer/` | GET | ✅ OK | - | Truy cập trang danh sách để trích xuất `__RequestVerificationToken` (XSRF Token) từ HTML. |

---

## 👥 2. Customer Management (Quản lý Khách hàng)

| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/Customer/ListCustomer/` | POST | ✅ OK | `LoadIni` | Lấy dữ liệu danh mục ban đầu (Chi nhánh, Nguồn khách hàng, Nhóm dịch vụ, Danh sách nhân viên). |
| `/Customer/ListCustomer/` | POST | ✅ OK | `LoadData` | Lấy danh sách khách hàng theo bộ lọc (Theo ngày, Chi nhánh, Loại tìm kiếm: Mới, Có giao dịch, Có lịch sử). |
| `/Customer/MainCustomer/` | POST | ✅ OK | `LoadIni` | Lấy thông tin nhân viên (Emp) và Telesale phụ trách cho một khách hàng cụ thể. |
| `/Customer/MainCustomer/` | POST | ✅ OK | `LoadPaymentInfo` | Lấy tổng quan tài chính của khách hàng (Tổng giá trị dịch vụ, Đã thanh toán, Còn nợ). |
| `/Customer/MainCustomer/` | POST | ✅ OK | `LoadStatusExtra` | Lấy các thông tin trạng thái bổ sung và bảng dữ liệu mở rộng của khách hàng. |

---

## 📅 3. Appointments & Scheduling (Lịch hẹn)

| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/Desk/Appointment/AppointmentInDay_Desk_Branch/` | POST | ✅ OK | `LoadataAppointmentList` | Lấy danh sách lịch hẹn trong ngày theo từng chi nhánh, bao gồm trạng thái (Đã đến, Đang chờ, Hủy...). |

---

## 💉 4. Treatment & Services (Điều trị & Dịch vụ)

| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/Customer/Treatment/TreatmentList/TreatmentList_Service/` | POST | ✅ OK | `LoadComboMain` | Lấy danh sách các thẻ dịch vụ và nhóm dịch vụ mà khách hàng đã sử dụng/đăng ký. |
| `/Customer/Treatment/TreatmentList/TreatmentList_Service/` | POST | ✅ OK | `LoadDetail` | Lấy chi tiết từng buổi điều trị (Bác sĩ thực hiện, nội dung điều trị, ngày thực hiện, tiến độ %). |
| `/Customer/CustomerImage/` | POST | 🔄 Improved | `LoadAllFolder` | Lấy danh sách thư mục ảnh của khách hàng. (Đã sửa lỗi định dạng ngày tháng). |
| `/Customer/CustomerImage/` | POST | 🔄 Improved | `LoadImageByFolder` | Lấy chi tiết ảnh trong thư mục. (Đã sửa lỗi định dạng ngày tháng). |

---

## 💰 5. Financials & Revenue (Doanh thu)

| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/Report/Revenue/Branch/AllBranchGrid/` | POST | ✅ OK | `LoadataDetailByBranch` | Lấy chi tiết các giao dịch phát sinh doanh thu theo chi nhánh và khoảng thời gian (Hóa đơn, Phiếu thu). |

---

## 📞 6. PBX & Call Center (Tổng đài)

### Thông qua Portal Vttech
| API Endpoint | Method | Trạng thái | Handler | Mô tả |
|--------------|--------|------------|---------|-------|
| `/marketing/ticketgeneral/` | POST | ✅ OK | `LoadIni` | Lấy danh sách các Extension (số nội bộ) và Nhóm Ticket. |
| `/marketing/call/historycall/` | POST | 🔄 Improved | `LoadData` | Lấy lịch sử cuộc gọi (CDR) từ Portal. (Đã thêm logic tự động re-login khi mất session). |

### Thông qua API trực tiếp (Generic PBX API)
| API Endpoint | Method | Trạng thái | Mô tả |
|--------------|--------|------------|-------|
| `{PBX_API_URL}` | GET | ✅ OK | Gọi trực tiếp đến API của nhà cung cấp tổng đài (VoIP) để lấy dữ liệu CDR thô (Call Detail Records). |

---

## ⚙️ Đặc điểm kỹ thuật chung

1.  **Format Dữ liệu Trả về**: Đa số các API trả về chuỗi Base64 đã được nén (GZip/Brotli). Hệ thống sử dụng phương thức `decompress` để giải mã về JSON.
2.  **XSRF Protection**: Yêu cầu truyền `__RequestVerificationToken` trong Body (Form Data) và các Custom Headers (`xsrf-token`, `RequestVerificationToken`).
3.  **Rate Limiting**: Hệ thống tự động áp dụng delay (mặc định 1.5s) giữa các lần gọi để tránh bị khóa tài khoản (429/403).
4. **Multi-Account Pooling**: Dự án hỗ trợ xoay vòng nhiều tài khoản (`VTTECH_ACCOUNTS`) để tăng tốc độ đồng bộ và giảm tải cho từng User.

---

## 🔄 7. Quy trình gọi API tuần tự (Deployment/Initial Sync)

Khi hệ thống được triển khai (Docker boot) hoặc bắt đầu một phiên đồng bộ toàn diện, các API sẽ được gọi theo thứ tự các lớp sau:

### Giai đoạn 1: Thiết lập Phiên (Authentication Boot)
Các bước này chạy ngay khi ứng dụng khởi chạy (`onModuleInit`) để đảm bảo các tài khoản sẵn sàng:
1.  **`GET /Login/Login`**: Lấy `SecretKey` và `XSRF Token` ban đầu từ mã nguồn trang web.
2.  **`POST /api/Author/Login`**: Gửi thông tin đăng nhập để lấy JWT Token (`Session`).
3.  **`GET /`**: Truy cập trang chủ để xác lập Cookies và Session ID trong bộ nhớ.
4.  **`GET /Customer/ListCustomer/`**: Lấy Token chống giả mạo (XSRF) chính thức để sử dụng cho các Handler POST.

### Giai đoạn 2: Đồng bộ Dữ liệu Danh mục (Master Data)
Chạy một lần mỗi ngày hoặc khi bị thiếu dữ liệu nền:
1.  **`POST /api/Home/SessionData`**: API quan trọng nhất lấy toàn bộ danh sách Chi nhánh, Dịch vụ, Nhân viên, Tỉnh thành.
2.  **`POST /Customer/ListCustomer/?handler=Initialize`**: Lấy danh sách phân hạng thành viên (Membership).

### Giai đoạn 3: Quét dữ liệu Header (Scanning)
Duyệt qua từng Chi nhánh và từng ngày để tìm biến động:
1.  **`POST /Customer/ListCustomer/?handler=LoadData`**: Tìm khách hàng (Type 5: Mới, 2: Giao dịch, 3: Có lịch sử).
2.  **`POST /Desk/Appointment/AppointmentInDay_Desk_Branch/?handler=LoadataAppointmentList`**: Lấy danh sách lịch hẹn.
3.  **`POST /Report/Revenue/Branch/AllBranchGrid/?handler=LoadataDetailByBranch`**: Lấy dữ liệu doanh thu thô.

### Giai đoạn 4: Đồng bộ Chi tiết (Deep Sync - BullMQ Workers)
Sau khi có danh sách ID từ Giai đoạn 3, hệ thống đẩy hàng loạt job vào Worker để gọi song song:
*   **Dữ liệu KH**: `GeneralInfo`, `StatusList`, `MainCustomer` (Ini, PaymentInfo, StatusExtra).
*   **Dịch vụ & Tiền**: `TabList_Service`, `TabList_Card`, `PaymentList_Service`, `PaymentList_Card`.
*   **Lịch sử & Hình ảnh**: `TreatmentList_Service`, `HistoryList_Care`, `ScheduleList_Schedule`, `CustomerImage` (LoadAllFolder).

---

## 🏗️ 7. Môi trường triển khai (Deployment)

| Môi trường | Trạng thái | Ghi chú |
|------------|------------|---------|
| Local (Bun) | ✅ Stable | Hoạt động tốt với đầy đủ cookie và session. |
| Docker (Bun) | ✅ Stable | **[FIXED]** Đã khắc phục lỗi mất session do axios clone object interceptors. Đã thêm cơ chế fallback XSRF và trigger session initialization qua `/api/Home/SessionData`. |

---

