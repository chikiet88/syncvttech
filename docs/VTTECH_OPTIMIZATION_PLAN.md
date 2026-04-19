# Kế hoạch & Kết quả Tối ưu hóa Đồng bộ Dữ liệu VTTech

Tài liệu này phân tích các ngưỡng giới hạn (Rate Limit) và ghi lại kết quả thực hiện tối ưu hóa hệ thống để đạt tốc độ lấy dữ liệu cao nhất.

## 1. Phân tích Chi tiết Endpoint & Cấp độ (Levels)

| Phân hệ | Endpoint / Handler | Cấp độ (Level) | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Hệ thống** | `/api/Author/Login` | **High** | ✅ Tối ưu | Đã sửa lỗi vòng lặp (Loop) và duy trì Session ổn định |
| **Báo cáo** | `/Report/Revenue/...` | **Medium** | ✅ Đã sửa | Khắc phục lỗi 400 bằng cách chuẩn hóa PascalCase cho tham số |
| **Khách hàng** | `/Customer/ListCustomer/` | **Default** | ✅ Tối ưu | Đã sửa lỗi phân trang (Pagination) BeginID và XSRF |

---

## 2. Các giải pháp đã triển khai (Implemented Strategy)

Hệ thống đã chuyển sang mô hình **"Multi-Tenant Multi-Account Worker"** với các đặc điểm sau:

### 2.1 Bể chứa Tài khoản (Account Pooling) - [ĐÃ XONG]
*   **Cấu hình:** Hỗ trợ biến `VTTECH_ACCOUNTS` trong `.env` dạng `user1:pass1,user2:pass2`.
*   **Cơ chế chọn lọc:** Sử dụng thuật toán **"Coldest Session First"**. Luôn ưu tiên chọn tài khoản Idle (nghỉ) lâu nhất để thực hiện request tiếp theo. Điều này giúp tận dụng tối đa quota của tất cả tài khoản mà không gây nghi ngờ cho server.

### 2.2 Bộ điều tiết thông minh (Smart Rate Limiter) - [ĐÃ XONG]
*   **Per-Account Delay:** Tích hợp trực tiếp vào `VttechApiService`. Mỗi tài khoản tự quản lý thời điểm request cuối cùng.
*   **Ngưỡng an toàn:** Áp dụng delay tối thiểu **1.5 giây** giữa 2 request của cùng một tài khoản. 
*   **Ưu điểm:** Loại bỏ tình trạng 429 (Too Many Requests) trong khi vẫn giữ được tổng throughput cao nhờ pooling.

### 2.3 Phân tách & Song song hóa - [ĐÃ XONG]
*   **Concurrency:** Tăng số lượng Worker xử lý trong BullMQ từ **3 lên 10**.
*   **Loop Optimization:** Gỡ bỏ các hàm `sleep` cứng không cần thiết trong logic đồng bộ, để cho bộ điều tiết Session tự động tối ưu tốc độ.

### 2.4 Khắc phục lỗi Phân trang - [ĐÃ XONG]
*   Fixed bug: Biến `BeginID` đã được liên kết với offset thực tế thay vì bị khóa cứng ở giá trị 0. Giờ đây hệ thống có thể quét sạch hàng vạn khách hàng mà không bị sót hoặc lặp lại.

---

## 3. Hướng dẫn Vận hành & Mở rộng

### 3.1 Thêm tài khoản để tăng tốc
Để tăng tốc độ đồng bộ lên gấp N lần, chỉ cần thêm tài khoản vào `.env`:
`VTTECH_ACCOUNTS="account1:pass1,account2:pass2,account3:pass3,account4:pass4"`

### 3.2 Theo dõi (Monitoring)
*   Kiểm tra log của `VttechApiService` để xem quá trình luân chuyển tài khoản: `✅ Login OK [user1]`, `🔄 Re-login [user2]`.
*   Theo dõi `CrawlLog` trong Database để đánh giá hiệu quả về thời gian đồng bộ sau khi tăng số lượng tài khoản.

---

## 4. Khắc phục lỗi Xác thực & Vòng lặp (Auth & Loop Fix) - [MỚI CẬP NHẬT]

Đã giải quyết triệt để tình trạng hệ thống tự động Logout và đăng nhập lại liên tục (Infinite Loop):

### 4.1 Ưu tiên Token JWT
*   **Vấn đề:** Trước đây hệ thống coi việc thiếu Cookie là mất Session hoàn toàn.
*   **Giải pháp:** Chỉnh sửa logic `hasSession` để ưu tiên JWT. Nếu có JWT hợp lệ, hệ thống sẽ cố gắng khôi phục Cookie thay vì thực hiện quy trình Login mới từ đầu.

### 4.2 Quản lý XSRF & Antiforgery Đa kênh
*   **Trích xuất thông minh:** Tự động tìm `__RequestVerificationToken` từ cả hidden input và thẻ `<meta>` trên Dashboard.
*   **Gửi đa kênh:** Token XSRF được gửi đồng bộ trong cả Headers (`xsrf-token`, `RequestVerificationToken`) và Body của POST request. Điều này giúp vượt qua các bộ lọc bảo mật khắt khe của IIS/ASP.NET.

### 4.3 Chuẩn hóa tham số (PascalCase) cho Báo cáo
*   **Vấn đề:** Lỗi **400 Bad Request** khi gọi các handler báo cáo (ví dụ `LoadataDetailByBranch`). 
*   **Giải pháp:** Chuẩn hóa toàn bộ tham số gửi đi sang dạng **PascalCase** (VD: `DateFrom`, `DateTo`, `BranchID`). Môi trường ASP.NET cũ của Vttech yêu cầu chính xác định dạng này để bind dữ liệu.

### 4.4 Cơ chế Tự phục hồi (Auto-Retry)
*   **Xử lý lỗi 400:** Khi gặp lỗi 400, hệ thống tự động thực hiện "Silent Refresh" - lấy lại XSRF Token mới cho trang báo cáo hiện tại và thử lại ngay lập tức thay vì dừng Job.
*   **Theo dõi 302:** Tự động phát hiện và xử lý việc chuyển hướng (Redirect) về trang Shell loader (`index.html`).

---
**Cập nhật bởi Antigravity AI.**  
*Ngày thực hiện: 17/04/2026 - Phiên bản 2.0 (Ổn định Auth & Sync)*
