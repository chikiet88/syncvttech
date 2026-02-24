# VTTech Data Sync - Technical Specification
**Cập nhật:** 24/02/2026
**Mục đích:** Tài liệu này chi tiết hóa các Endpoints, dữ liệu thu thập và quy trình xử lý của hệ thống đồng bộ VTTech.

---

## 🔗 1. Danh sách Endpoints đồng bộ

Hệ thống sử dụng hai loại giao tiếp chính với VTTech: **JSON API** (cho Master Data) và **Razor Page Handlers** (cho nghiệp vụ chi tiết).

### 📦 A. Master Data (Đồng bộ danh mục)
*Gọi qua: `/api/Home/SessionData` (POST)*

| Bảng VTTech | Model Database | Mô tả |
| :--- | :--- | :--- |
| `Table` | `Branch` | Danh sách 17 chi nhánh, địa chỉ, SĐT. |
| `Table2` | `Service` | Danh sách ~1,700 dịch vụ, giá niêm yết, mã DV. |
| `Table3` | `ServiceGroup` | Phân loại nhóm dịch vụ. |
| `Table4` | `Employee` | Danh sách nhân viên, chức vụ, chi nhánh. |
| `Table5` | `User` | Tài khoản đăng nhập hệ thống CRM. |
| `Table6/7/9` | `City/District/Ward` | Dữ liệu địa giới hành chính (Tỉnh, Quận, Phường). |
| `Table10` | `CustomerSource` | Nguồn đến của khách hàng (Facebook, Web, Giới thiệu...). |

---

### 💰 B. Revenue Sync (Đồng bộ doanh thu)
*Gọi qua: `/Report/Revenue/Branch/AllBranchGrid?handler=LoadataDetailByBranch`*

*   **Dữ liệu thu thập:** Chi tiết từng giao dịch phát sinh.
    *   `CustID`, `CustName`, `CustCode`: Thông tin khách hàng.
    *   `Amount`: Giá trị đơn hàng.
    *   `Paid`: Số tiền thực thu.
    *   `IsNew`: Phân loại khách hàng mới (1) hoặc cũ (0).
    *   `Service`: ID dịch vụ tương ứng.
    *   `DocCode`: Mã chứng từ giao dịch.

---

### 👤 C. Full Customer Sync (Đồng bộ 360° Khách hàng)
*Hệ thống duyệt qua danh sách khách hàng được phát hiện từ Discovery và chạy chuỗi ~15 request chi tiết:*

| Module | Handler | Dữ liệu thu thập |
| :--- | :--- | :--- |
| **Hồ sơ** | `GeneralInfo/LoadData` | Giới tính, ngày sinh, địa chỉ chi tiết. |
| **Tài chính** | `MainCustomer/LoadPaymentInfo` | **Quan trọng:** Lấy tổng chi tiêu và nợ hiện tại. |
| **Dịch vụ** | `TabList_Service/LoadataTab` | Các gói dịch vụ khách đã mua và trạng thái sử dụng. |
| **Thẻ TK** | `TabList_Card/LoadataCard` | Thẻ tiền mặt, thẻ liệu trình và log sử dụng trừ tiền. |
| **Thanh toán** | `PaymentList/LoadataPayment` | Lịch sử các hóa đơn đã xuất. |
| **Điều trị** | `TreatmentList/LoadataTreatment` | Nhật ký các lần qua thực hiện dịch vụ/thủ thuật. |
| **CSKH** | `HistoryList_Care/LoadataHistory` | Nhật ký gọi điện, tư vấn, chăm sóc. |
| **Ảnh** | `CustomerImage/LoadImageByFolder` | Danh sách ảnh (trước/sau điều trị) lưu trên Cloud. |
| **Đơn thuốc** | `TabList_Medicine/LoadataPrescription` | Các loại thuốc hoặc mỹ phẩm đã bán cho khách. |
| **Khác** | `Installment`, `Complaint`, `Plan` | Hợp đồng trả góp, khiếu nại, phác đồ dự kiến. |

---

## ⚙️ 2. Quy trình Xử lý Dữ liệu (Processing)

Hệ thống áp dụng các kỹ thuật xử lý dữ liệu phức tạp để đảm bảo tính chính xác:

1.  **Giải mã (Decompression)**: 
    *   VTTech trả về dữ liệu nén: `Base64` -> `GZip/Deflate` -> `UTF-8 JSON`.
    *   Hệ thống có hàm `decompress` tự động thử các giải thuật nén khác nhau.
2.  **Chuẩn hóa cấu trúc (Normalization)**:
    *   Dữ liệu VTTech không nhất quán (lúc là Array, lúc là Object có key số `"0"`, `"1"`).
    *   Hàm `ensureArray` được dùng để ép kiểu về mảng chuẩn trước khi xử lý.
3.  **Xử lý ngày tháng (Date Parsing)**:
    *   Hỗ trợ nhiều định dạng từ VTTech: `DD/MM/YYYY`, `ISO`, `YYYY-MM-DD`.
4.  **Cơ chế Upsert (Insert or Update)**:
    *   Sử dụng ID từ VTTech làm khóa chính (Primary Key).
    *   Dữ liệu luôn được cập nhật mới nhất nếu đã tồn tại, tránh trùng lặp.

---

## 💾 3. Lưu trữ Dữ liệu (Storage Strategy)

*   **Database chính**: `vttech.db` (SQLite).
*   **Chia tách dữ liệu**:
    *   `Master Data`: Cập nhật 1 lần/ngày (Master Sync).
    *   `Discovery Data`: Lưu vào `DailyCustomer` để theo dõi biến động theo ngày.
    *   `Detailed Data`: Lưu vào các bảng quan hệ tương ứng (`CustomerPayment`, `Treatment`, `CustomerCard`...).
    *   `Logs`: Lưu vào bảng `CrawlLog` để giám sát: `crawl_type`, `records_count`, `duration_seconds`, `status`.

---

## 🛡️ 4. Cơ chế Giám sát & An toàn

*   **XSRF Protection**: Tự động parse XSRF token từ trang `ListCustomer` cho mỗi phiên làm việc.
*   **Session Management**: Tự động duy trì Cookie và WebToken của VTTech.
*   **Micro-delays**: Nghỉ 100ms giữa các request chi tiết khách hàng để không bị hệ thống chặn (Rate Limit).
*   **Deduplication**: Trong một phiên đồng bộ, nếu 1 khách hàng xuất hiện nhiều lần (ở nhiều chi nhánh/ngày), chỉ thực hiện Full Sync **duy nhất 1 lần**.
