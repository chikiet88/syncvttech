# VTTech Synchronization Standard (v1.0)

Hướng dẫn chuẩn mực để duy trì, mở rộng và bảo trì hệ thống đồng bộ API VTTech, đảm bảo hiệu suất cao và tránh các lỗi treo hệ thống.

## 1. Cơ chế Đăng nhập & Xác thực (Authentication)

### 1.1 Quy trình 4 bước bắt buộc:
1. **GET Login Page:** Truy cập `/Login/Login` để nhận Cookies cơ bản từ server.
2. **IP Check (AJAX):** Gọi `/api/Author/GetIP` để lấy mã `ip_encry`.
3. **POST Login:** Thực hiện đăng nhập với payload đầy đủ (User, Pass, IP). Nhận JWT Token từ trường `Session`.
4. **Kích hoạt Session (Background):** Truy cập `/Master/Master_Top/` để server khởi tạo bối cảnh người dùng.

### 1.2 Chống đệ quy (Anti-Recursion) - CỰC KỲ QUAN TRỌNG:
* **QUY TẮC VÀNG:** Tuyệt đối KHÔNG sử dụng các hàm wrapper cấp cao (như `callHandler` hoặc `getXsrfToken`) bên trong các hàm khởi tạo đăng nhập. 
* **HẬU QUẢ:** Nếu vi phạm sẽ dẫn đến vòng lặp vô tận, gây lỗi "API calls quota exceeded" và treo toàn bộ hệ thống.
* **GIẢI PHÁP:** Sử dụng các cuộc gọi `axios` trực tiếp trong bước khởi tạo Session chạy nền.

## 2. Quản lý Phiên (Session & XSRF)

* **XSRF Token:** Phải được trích xuất từ trang HTML của từng phân hệ (ví dụ: `/Customer/ListCustomer/`).
* **Session Priming:** Sau khi có JWT, phải gọi thủ tục `NotiItemCount` một lần duy nhất để báo hiệu phiên làm việc đang hoạt động. Bước này nên chạy ở chế độ `Promise.then()` (non-blocking) để không làm treo tiến trình Bootstrap của server.

## 3. Xử lý Dữ liệu & Giải nén (Response Handling)

* VTTech trả về dữ liệu nén ở dạng GZip/Deflate mã hóa Base64.
* **Hàm `decompress` tiêu chuẩn:** Phải hỗ trợ cả giải nén GZip và xử lý JSON thô nếu dữ liệu không nén.
* **Date Parsing:** Lưu ý định dạng ngày tháng tùy theo phân hệ:
    - Báo cáo Doanh thu: `DD-MM-YYYY`
    - Danh sách khách hàng: `YYYY-MM-DD 00:00:00`

## 4. Quản lý Hạn mức (Quota & Limits)

* Hạn mức server hiện tại: **~100 requests / 1 phút**.
* Khi thực hiện đồng bộ lớn, phải chia nhỏ batch hoặc thêm khoảng nghỉ (delay) nếu cần thiết.
* Tránh khởi động lại server quá nhiều lần trong thời gian ngắn (mỗi lần khởi động đều thực hiện đăng nhập mới).

## 5. Cấu trúc Project khuyến nghị

* Toàn bộ logic giao tiếp VTTech tập trung tại `VttechApiService`.
* Không được viết Ad-hoc API call ở các service khác, tất cả phải thông qua `VttechApiService` để đảm bảo quản lý XSRF và Cookie tập trung.
