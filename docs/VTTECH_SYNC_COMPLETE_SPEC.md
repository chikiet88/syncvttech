# VTTech Synchronization Specification (Complete Review)

Tài liệu này tổng hợp chi tiết các API endpoint từ hệ thống VTTech được sử dụng trong quá trình đồng bộ dữ liệu doanh thu và đồng bộ tổng thể, cùng với các Model Prisma tương ứng.

## 1. Đồng Bộ Doanh Thu (Revenue Sync)
Tập trung vào các giao dịch tài chính và khách hàng phát sinh trong khoảng thời gian được chọn.

| Bước | VTTech Endpoint | Handler | Mô tả | Prisma Model |
| :--- | :--- | :--- | :--- | :--- |
| **Search** | `/Report/Revenue/Branch/AllBranchGrid/` | `Loadata` | Lấy chi tiết các giao dịch doanh thu theo chi nhánh & ngày | `RevenueTransaction` |
| **Customer Check** | `/Customer/ListCustomer/` | `LoadData` | Tìm khách hàng có hoạt động (Type 5: Hồ sơ mới/Giao dịch) | `Customer`, `DailyCustomer` |
| **Sync Details** | *Xem mục 3 bên dưới* | - | Chạy Full Sync chi tiết cho từng khách hàng tìm thấy | - |

---

## 2. Đồng Bộ Tổng Thể (General Sync)
Quy trình đồng bộ toàn diện bao gồm Danh mục, Khách hàng, Lịch hẹn, PBX và Doanh thu.

### A. Master Data (Danh mục dùng chung)
Chạy khi bắt đầu phiên đồng bộ hoặc khi có yêu cầu `forceMaster`.

| Danh mục | VTTech Endpoint | Phương thức | Dữ liệu chính | Prisma Model |
| :--- | :--- | :--- | :--- | :--- |
| **Hệ thống** | `/api/Home/SessionData` | POST (API) | Chi nhánh, Dịch vụ, Nhóm, Nhân viên, User | `Branch`, `Service`, `ServiceGroup`, `Employee`, `User` |
| **Địa lý** | `/api/Home/SessionData` | POST (API) | Tỉnh thành, Quận huyện, Phường xã | `City`, `District`, `Ward` |
| **Phân loại** | `/api/Home/SessionData` | POST (API) | Nguồn khách hàng | `CustomerSource` |
| **Thành viên** | `/Customer/ListCustomer/` | `Initialize` | Hạng thành viên, Quy tắc giảm giá | `Membership` |

### B. Core Loop (Dữ liệu theo ngày/dải ngày)
Duyệt qua từng ngày và từng chi nhánh để thu thập danh sách thực thể cần đồng bộ.

| Chức năng | VTTech Endpoint | Handler | Mô tả | Prisma Model |
| :--- | :--- | :--- | :--- | :--- |
| **Danh sách KH** | `/Customer/ListCustomer/` | `LoadData` | Lấy KH theo Hồ sơ (Type 5), Giao dịch (Type 2), Lịch sử (Type 3) | `Customer`, `DailyCustomer` |
| **Lịch hẹn** | `/Desk/Appointment/AppointmentInDay_Desk_Branch/` | `LoadataAppointmentList` | Lịch hẹn trong ngày theo chi nhánh | `Appointment` |
| **PBX Portal** | `/marketing/call/historycall/` | `LoadData` | Lịch sử cuộc gọi từ Portal VTTech | `PbxCallRecord`, `CustomerCall` |

---

## 3. Chi Tiết Khách Hàng (Full Customer Detail)
Mỗi khách hàng được định danh sẽ kích hoạt chuỗi sync chi tiết để lấy toàn bộ lịch sử (Yêu cầu `syncDetails=true`).

| Loại dữ liệu | VTTech Endpoint | Handler | Prisma Model |
| :--- | :--- | :--- | :--- |
| **Thông tin chung** | `/Customer/GeneralInfo/` | `LoadData` | `Customer` |
| **Thông tin tiền** | `/Customer/MainCustomer/` | `LoadPaymentInfo` | `Customer` (Spent/Debt) |
| **Dịch vụ sử dụng** | `/Customer/Service/TabList/TabList_Service/` | `LoadataTab` | `CustomerServiceTab` |
| **Thanh toán dịch vụ** | `/Customer/Payment/PaymentList/PaymentList_Service/` | `LoadataPayment` | `CustomerPayment` |
| **Thanh toán thẻ** | `/Customer/Payment/PaymentList/PaymentList_Card/` | `LoadataPaymentCard` | `CustomerPayment` |
| **Lần điều trị** | `/Customer/Treatment/TreatmentList/TreatmentList_Service/` | `LoadataTreatment` | `Treatment` |
| **Lịch sử chăm sóc** | `/Customer/History/HistoryList_Care/` | `LoadataHistory` | `CustomerCareHistory` |
| **Hợp đồng trả góp** | `/Customer/Installment/InstallmentList/` | `LoadDetail` | `CustomerInstallment` |
| **Khiếu nại** | `/Customer/ComplaintList/` | `Loadata` | `CustomerComplaint` |
| **Phác đồ** | `/Customer/Service/TabList/TabList_Service/` | `LoadataTab_Plan` | `CustomerTreatmentPlan` |
| **Lịch sử thay đổi** | `/Customer/MainCustomer/` | `LoadataTab_History_Change` | `CustomerChangeHistory` |
| **Lịch sử trạng thái** | `/Customer/StatusList/` | `LoadataStatus` | `CustomerStatusHistory` |
| **Thẻ & Lịch sử dùng**| `/Customer/Service/TabList/TabList_Card/` | `LoadataCard` | `CustomerCard`, `CustomerCardLog` |
| **Đơn thuốc/Sản phẩm**| `/Customer/Service/TabList/TabList_Medicine/` | `LoadataPrescriptionMedicine` | `CustomerPrescription` |
| **Album ảnh** | `/Customer/CustomerImage/` | `LoadAllFolder` / `LoadImageByFolder` | `CustomerImageFolder`, `CustomerImage` |
| **Tiền sử bệnh lý** | `/Customer/Anamnesis/CustomerAnamnesisList/` | `LoadataPatientHistory` | `CustomerAnamnesis` |
| **Lịch sử đặt hẹn** | `/Customer/ScheduleList_Schedule/` | `Loadata` | `Appointment` |
| **Ticket Marketing**| `/Marketing/TicketList/` | `Loadata` | `CustomerTicket` |
| **Lịch sử SMS** | `/Marketing/Sms/History/` | `Loadata` | `CustomerSms` |

---

## 4. Cơ Chế Xử Lý & Tối Ưu

### Checksum Logic
Mỗi bản ghi được metadata hóa bằng `last_hash` (MD5). Worker chỉ thực hiện `upsert` vào Database khi nội dung JSON từ API có sự khác biệt so với hash đã lưu, giúp giảm tải IO cho Database đáng kể. Hệ thống đã phủ kín các trường dữ liệu quan trọng bao gồm:
- **Thanh toán**: Đã bao gồm `SignatureData` (chữ ký).
- **Đơn thuốc**: Đã bao gồm `UnitName` (đơn vị) và `Dosage` (liều dùng).
- **Dịch vụ**: Đã bao gồm `Discount` (giảm giá) và `Date` (ngày mua).

### Task Queue (BullMQ)
Các tác vụ được phân mảnh thành các Job nhỏ:
- `sync-customer-detail`: Sync toàn bộ các bảng trong Mục 3 cho 1 khách hàng.
- `sync-revenue-day`: Sync doanh thu Mục 1 cho 1 ngày/1 chi nhánh.
Việc sử dụng Queue giúp hệ thống không bị crash khi API VTTech phản hồi chậm hoặc cần giới hạn Rate-limit.

### Security & Session
1. **Manual Redirect Handling**: Hệ thống tự bắt mã 302 để lưu Cookie thủ công, tránh mất Session khi chuyển trang.
2. **XSRF Injection**: Luôn lấy token `__RequestVerificationToken` mới nhất từ các trang HTML để gán vào header `xsrf-token` cho các request API tiếp theo.
