# VTTECH Portal API Master Specification (Hybrid Auth 2025)

Tài liệu này đặc tả quy trình xác thực Hybrid và cơ chế gọi Handler dữ liệu của Portal VTTech, được tối ưu cho hệ thống KataCore 2025.

## 1. Tổng Quan Quy Trình Xác Thực (Hybrid Auth)

Quy trình xác thực được thiết kế để vượt qua các rào cản bảo mật (JS Redirect, IP Tracking, XSRF) của Portal bằng cách mô phỏng chính xác hành vi của trình duyệt Chrome trên Linux.

### Bảng Danh Sách API Liên Quan

| Thứ tự | Endpoint | Phương thức | Mục đích | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `/Login/Login` | `GET` | Khởi tạo Session ban đầu | Cookies + XSRF Token |
| 2 | `/api/Author/GetIP` | `POST` | Lấy IP Token đã mã hóa | `ip_encry` (Token Base64) |
| 3 | `/api/Author/Login` | `POST` | Đăng nhập AJAX (JWT) | `WebToken` (JWT) + Session Cookie |
| 4 | `/Index/` | `GET` | Kích hoạt Session đầy đủ | Trạng thái `200 OK` (Dashboard) |
| 5 | `[Page]?handler=[Name]` | `POST` | Gọi Handler dữ liệu | JSON nén (Gzip/Deflate) |

---

## 2. Chi Tiết Các Bước Triển Khai

### Bước 1: Khởi tạo Session (Pha 1)
- **URL**: `https://tmtaza.vttechsolution.com/Login/Login?ver=[Timestamp]`
- **Headers**: 
  - `User-Agent`: Mozilla/5.0 (X11; Linux x86_64) ...
- **Mục tiêu**: Nhận các cookie hệ thống (`.AspNetCore.Antiforgery`, `.AspNetCore.Culture`) và trích xuất `__RequestVerificationToken` từ HTML bằng Regex/Cheerio.

### Bước 2: Trích xuất IP Token (Pha Trung Gian)
- **URL**: `https://tmtaza.vttechsolution.com/api/Author/GetIP`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Cookie`: (Dùng cookie từ Bước 1)
- **Payload**: `{}`
- **Kết quả JSON**:
  ```json
  {
    "ip": "111.222.333.444",
    "ip_encry": "JLYxMl2Tcnfvfg10lGR3eFj9RqdxiUv8yqkI1bVUAsg="
  }
  ```
> [!IMPORTANT]
> Giá trị `ip_encry` là bắt buộc cho bước đăng nhập tiếp theo. Nếu thiếu trường này, Portal sẽ trả về `{"RESULT":"error"}`.

### Bước 3: Xác thực AJAX (Pha Chính)
- **URL**: `https://tmtaza.vttechsolution.com/api/Author/Login`
- **Headers**:
  - `Content-Type`: `application/json; charset=UTF-8`
  - `X-Requested-With`: `XMLHttpRequest`
  - `Origin`: `https://tmtaza.vttechsolution.com`
- **Payload (9 trường bắt buộc)**:
  ```json
  {
    "UserName": "...",
    "Password": "...",
    "PasswordEnCrypt": "",
    "IP": "[ip_encry từ Bước 2]",
    "TokenFCM": "",
    "From": "",
    "SSO": "",
    "Lan": "vi",
    "TokenSSO": ""
  }
  ```
- **Kết quả**:
  - Nhận `WebToken` (JWT) trong JSON Body.
  - Nhận `.AspNetCore.Session` trong `Set-Cookie` Header.

### Bước 4: Kích hoạt & Kiểm tra
- **URL**: `https://tmtaza.vttechsolution.com/Index/`
- **Mục tiêu**: Thực hiện một GET request cuối cùng với đầy đủ Cookie để "đánh dấu" session đã hợp lệ trên toàn hệ thống Handler.

---

## 3. Cơ Chế Gọi Handler & Giải Mã Dữ Liệu

Tất cả các Handler dữ liệu (như báo cáo, danh sách khách hàng) trả về dữ liệu nén để tối ưu băng thông.

### Header Bắt Buộc cho Handler
- `xsrf-token`: Token lấy từ trang chứa handler.
- `x-requested-with`: `XMLHttpRequest`.
- `Content-Type`: `application/x-www-form-urlencoded`.

### Giải mã JSON (Gzip/Deflate)
Dữ liệu trả về thường là chuỗi Base64 bọc trong dấu ngoặc kép. Quy trình giải mã:
1. Xóa dấu ngoặc kép đầu/cuối.
2. Decode Base64 sang Buffer.
3. Thử giải nén theo thứ tự: `gunzip` (Gzip) -> `inflate` (Deflate) -> `inflateRaw`.
4. Parse JSON kết quả.

---

## 4. Lưu Ý Quan Trọng
- **Rate Limit**: Portal có giới hạn tần suất truy cập. Nên duy trì delay tối thiểu `1000ms` giữa các yêu cầu đồng bộ.
- **Session Timeout**: Session Cookie có thời hạn. Nếu nhận mã `401` hoặc `Redirect`, hệ thống phải tự động thực hiện lại Quy trình 4 bước từ đầu.
- **Cấu hình**: Thông tin `VTTECH_USERNAME` và `VTTECH_PASSWORD` phải được bảo mật trong file `.env`.

---
*Tài liệu được cập nhật tự động bởi Antigravity AI - KataCore 2025.*
