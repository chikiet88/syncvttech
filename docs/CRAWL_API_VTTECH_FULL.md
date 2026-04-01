# TỔNG HỢP TOÀN BỘ API VÀ CẤU TRÚC DỮ LIỆU HỆ THỐNG VTTECH (TMTAZA)

**Ngày thực hiện:** 31/03/2026
**Tài khoản:** CHIKIET (Admin)
**Hệ thống:** https://tmtaza.vttechsolution.com/

---

## 1. Cơ chế Bảo mật & Xác thực (Security & Auth)

Hệ thống sử dụng cơ chế xác thực đa lớp để bảo vệ API:

| Thành phần | Vị trí | Mô tả |
| :--- | :--- | :--- |
| **ASP.NET_SessionId** | Cookie | Định danh phiên làm việc của trình duyệt. |
| **WebToken** | Cookie / Header | JWT Token chứa thông tin định danh và quyền hạn (Bearer). |
| **secretkey** | Header | Khóa mã hóa tùy chỉnh (Dynamic/Static) dùng để giải mã dữ liệu trả về. |
| **xsrf-token** | Header | Token chống giả mạo yêu cầu (CSRF), bắt buộc cho các request POST. |

> [!IMPORTANT]
> Dữ liệu trả về từ các API `?handler=LoadData` thường được mã hóa hoặc nén (GZip/Base64). Cần dùng `secretkey` để xử lý nếu là định dạng tùy chỉnh của VTTech.

---

## 2. Danh sách API và Cấu trúc Dữ liệu Chi tiết

| No | Tên Chức năng | Mô Tả | API Endpoint | Data trả về (Key chính) | Liên kết với API khác |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Master Data** | Lấy toàn bộ danh mục hệ thống | `/api/Home/SessionData` | `Branches`, `Employees`, `Services`, `Sources`, `Cities` | Là gốc để map ID cho tất cả API khác |
| 2 | **Danh sách Khách hàng** | Hồ sơ khách hàng toàn hệ thống | `/Customer/ListCustomer/?handler=LoadData` | `ID`, `CustCode`, `CustName`, `Phone`, `BranchID`, `SourceID` | `ID` liên kết với Invoice, Treatment, Schedule |
| 3 | **Lịch sử Thu chi** | Nhật ký hóa đơn và thanh toán | `/Account/InvoicePayment/?handler=Loadata` | `ID`, `InvoiceCode`, `CustomerID`, `Amount`, `MethodID`, `BranchID` | `CustomerID` -> Khách hàng; `MethodID` -> SessionData |
| 4 | **Dịch vụ Đang sử dụng** | Các gói/liệu trình khách đã mua | `/Customer/TabList_Service/LoadataTab` | `ID`, `CustomerID`, `ServiceCode`, `Quantity`, `Status` | `ServiceID` -> Master Data; `CustomerID` -> Khách hàng |
| 5 | **Nhật ký Điều trị** | Chi tiết các lần làm dịch vụ | `/Customer/TreatmentList/LoadataTreatment` | `ID`, `CustomerID`, `TabID`, `ServiceID`, `DoctorID`, `Date` | `TabID` -> Service Tab; `DoctorID` -> Employees |
| 6 | **Lịch hẹn** | Quản lý lịch hẹn khách hàng | `/Customer/TabList_Schedule/LoadataSchedule` | `ID`, `CustomerID`, `BranchID`, `Time`, `StatusID` | `StatusID` -> Danh mục trạng thái |
| 7 | **Thẻ Tiền mặt** | Số dư và lịch sử nạp thẻ | `/Customer/TabList_Card/LoadataCard` | `ID`, `CustomerID`, `CardCode`, `Balance`, `TotalAmount` | `CustomerID` -> Khách hàng |
| 8 | **Chăm sóc Khách hàng** | Log tương tác, gọi điện, ghi chú | `/Customer/HistoryList_Care/LoadataHistory` | `ID`, `CustomerID`, `Content`, `EmployeeID`, `Type` | `EmployeeID` -> Nhân viên thực hiện |
| 9 | **Báo cáo Doanh thu** | Tổng hợp doanh thu theo chi nhánh | `/Report/Revenue/Branch/AllBranchGrid` | `BranchID`, `TotalRevenue`, `TotalBill`, `NewCust` | `BranchID` -> Branches |
| 10 | **Kho hàng (Tồn kho)** | Dữ liệu vật tư và sản phẩm | `/Inventory/Stock/LoadData` | `ProductID`, `Quantity`, `WarehouseID`, `Unit` | `ProductID` -> Danh mục sản phẩm |
| 11 | **Đơn thuốc** | Thuốc đã kê cho khách | `/Customer/TabList_Medicine/LoadataPrescription` | `ID`, `CustomerID`, `MedicineName`, `Dosage` | `CustomerID` -> Khách hàng |
| 12 | **Phản hồi/Khiếu nại** | Nhật ký xử lý vấn đề | `/Customer/Complaint/LoadData` | `ID`, `CustomerID`, `Subject`, `Status`, `HandlerID` | `HandlerID` -> Employees |
| 13 | **Lịch sử gọi điện** | Toàn bộ log cuộc gọi & ghi âm | `/Marketing/Call/HistoryCallByPhone` | `CallID`, `Phone`, `Duration`, `LinkAudio`, `Date` | Mapping qua SĐT được mã hóa Base64 |
| 14 | **Tiền sử (Anamnesis)** | Bệnh lý, dị ứng, thói quen | `/Customer/Anamnesis/CustomerAnamnesisList/?handler=LoadataPatientHistory` | `ID`, `CustomerID`, `Content`, `Note` | `CustomerID` -> Khách hàng |
| 15 | **Tư vấn & Trạng thái** | Lịch sử tư vấn, nhu cầu phát sinh | `/Customer/StatusList/?handler=LoadataStatus` | `ID`, `CustomerID`, `ConsultantID`, `Note`, `Status` | `ConsultantID` -> Employees |
| 16 | **Hình ảnh chi tiết** | Album ảnh điều trị (Trước/Sau) | `/Customer/CustomerImage/?handler=LoadImageByFolder` | `ImageID`, `FolderID`, `ImagePath`, `CreatedDate` | `FolderID` lấy từ handler `LoadAllFolder` |
| 17 | **Tương tác SMS/Zalo** | Nhật ký gửi tin nhắn & CSKH | `/Customer/History/HistoryList_Care/?handler=LoadataHistory` | `ID`, `CustomerID`, `Content`, `Type`, `CreatedDate` | `Type` phân loại SMS hoặc Zalo |

---

## 3. Đánh giá và Phân tích Cấu trúc Liên kết (Mapping & Relationships)

Hệ thống được thiết kế theo mô hình **Centralized Customer Database** với các quan hệ sau:
1.  **Customer Central (Gốc):** `CustomerID` (hoặc `ID` trong Customer List) là khóa ngoại (FK) xuất hiện trong ~80% các bảng khác.
2.  **Branch Isolation:** Dữ liệu có thể lọc theo `BranchID`. Khi crawl cần loop qua danh sách Branch thu được từ `SessionData`.
3.  **Master Data Lookup:** Các trường như `SourceID`, `ServiceID`, `MethodID`, `EmployeeID` đều phải tham chiếu ngược về kết quả của `/api/Home/SessionData`.

---

## 4. Đề xuất quy trình Sync & Clone Dữ liệu (Full Migration)

Để đưa toàn bộ dữ liệu về hệ thống công ty một cách đầy đủ và chính xác nhất, tôi đề xuất quy trình sau:

### Bước 1: Khởi tạo Session & Header (Auth Bypass)
Sử dụng công cụ (Python/Nodejs) giả lập trình duyệt để lấy `WebToken`, `secretkey` và `xsrf-token`. Các token này cần được làm mới nếu phiên làm việc hết hạn.

### Bước 2: Đồng bộ Master Data (Base Layers)
- Gọi `/api/Home/SessionData` trước tiên.
- Lưu trữ vào các bảng `branches`, `employees`, `services`, `sources` trong Database cục bộ. Đây là điều kiện cần để đảm bảo tính toàn vẹn dữ liệu (Referential Integrity).

### Bước 3: Đồng bộ Dữ liệu Giao dịch (Transactional Data) theo Chiến lược "Sliding Window"
Do dữ liệu rất lớn, không nên crawl tất cả cùng lúc.
1.  **Crawl Khách hàng:** Chạy theo `BranchID` và `dateFrom/dateTo` (ví dụ: mỗi lần lấy 1 tháng).
2.  **Crawl Hóa đơn & Thanh toán:** Chạy song song với danh sách `BranchID`.
3.  **Crawl Chi tiết (Tabs, Treatments):** Sau khi có `CustomerID`, thực hiện gọi API chi tiết cho từng khách hàng hoặc dùng API danh sách tổng hợp (nếu có handler hỗ trợ).

### Bước 4: Xử lý Giải nén & Upsert
- Vì VTTech trả về dữ liệu nén/mã hóa, cần tích hợp thư viện giải mã (thường là Gzip/Brotli kết hợp xử lý chuỗi Base64 đặc thù của họ).
- Sử dụng lệnh `UPSERT` (Insert on conflict update) trong PostgreSQL để đảm bảo cập nhật dữ liệu cũ và thêm mới mà không bị trùng lặp.

### Bước 5: Kiểm tra và Đối soát (Validation)
- So sánh tổng `Amount` từ API `LoadTotal` của VTTech với tổng tiền trong Database cục bộ.
- Kiểm tra số lượng Record (Count) giữa hai hệ thống.

---

## 5. Phân tích Chuyên sâu Dữ liệu Vệ tinh (Deep Data Mapping)

Để đạt được độ chi tiết "Clone 1:1", cần lưu ý các kỹ thuật đặc thù sau:

### A. Cơ chế mã hóa Số điện thoại (Call History)
API gọi điện không dùng `CustomerID` trực tiếp mà dùng tham số `phone1` đã mã hóa.
- **Công thức:** `Base64(YYYYMMDD + SĐT)`.
- **Ví dụ:** Ngày 31/03/2026, SĐT `0965914929` -> `Base64("202603310965914929")`.
- **Hành động:** Khi sync Call Log, cần loop qua danh sách SĐT khách hàng và generate token này theo ngày.

### B. Cấu trúc Hình ảnh (Medical Images)
Dữ liệu ảnh không nằm chung một chỗ mà phân theo Folder.
- **Quy trình:** Gọi `LoadAllFolder` để lấy danh sách thư mục (Ví dụ: "Trước phẫu thuật", "Sau 7 ngày") -> Lấy `FolderID` -> Gọi `LoadImageByFolder` để lấy URL ảnh thực tế.

### C. Dữ liệu nén (Gzip/Binary JSON)
Nhiều API như **Tiền sử (Anamnesis)** trả về dữ liệu dạng Binary nén.
- **Xử lý:** Cần dùng thư viện `zlib` hoặc `pako` để decompress dữ liệu trước khi parse JSON. Nếu dữ liệu có dạng `bnjHiJ...`, đây là chuỗi Base64 đã mã hóa bởi `secretkey` của hệ thống.

---

**Kết luận:** Hệ thống VTTech hoàn toàn có thể crawl và sync được nhờ các API handler minh bạch. Thách thức lớn nhất nằm ở việc giải mã gói tin `secretkey`, xử lý token SĐT mã hóa và quản lý phiên (Session Management) ổn định.
