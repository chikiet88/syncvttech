# 02-Analytics-Lech-Dong-Lich-Hen-Google-Sheets: Phân Tích Hiện Tượng Dịch Dòng Lịch Hẹn Trên Google Sheets

## Thông tin chung
- **Ngày tạo**: 2026-06-24
- **Trạng thái**: Completed (100%)
- **Người thực hiện**: Antigravity (AI Assistant)

---

## 1. Giới thiệu & Hiện tượng phát sinh

### Hiện tượng
Trong quá trình theo dõi đối soát lịch hẹn của bộ phận Sale Admin trên Google Sheets (Bảng tính đồng bộ tự động từ hệ thống CRM VTTech):
* Ngày **23-06-2026**, lịch hẹn của khách hàng **TRẦN BẠCH THẢO NGUYÊN** (Mã lịch hẹn: `C_T20260618.778444` - hiển thị rút gọn trên cột là `C_T20260618.77844`, SĐT: `0329543815`) nằm ở dòng **5094**.
* Ngày **24-06-2026**, lịch hẹn này bị dịch chuyển xuống dòng **5177**.
* Khoảng lệch dịch dòng: Đúng **83 dòng** xuống phía dưới.

Tài liệu này tổng hợp phân tích kỹ thuật và kiểm tra dữ liệu thực tế từ hệ thống cơ sở dữ liệu để giải thích hiện tượng dịch dòng nêu trên.

---

## 2. Nguyên nhân kỹ thuật (Cơ chế đồng bộ)

### 2.1. Quy trình cập nhật dữ liệu lên Google Sheets
Theo thiết kế của module xuất báo cáo (`excel-export.service.ts`), tính năng đồng bộ tự động đẩy dữ liệu lên Google Sheets chạy vào **22:00** và **23:30** hàng ngày hoạt động theo cơ chế:
1. **Xóa dữ liệu cũ**: Gọi API Google Sheets xóa trắng toàn bộ dữ liệu trong dải cột từ A đến Z của sheet `Taza` (`/values/Taza!A:Z:clear`).
2. **Lọc dữ liệu**: Lấy danh sách lịch hẹn từ database thỏa mãn đồng thời các điều kiện:
   * **Khoảng thời gian**: Từ `2026-01-01` đến ngày hiện tại.
   * **Chi nhánh**: Tên chi nhánh có chứa từ khóa `"Taza"` (không phân biệt hoa thường).
   * **Trạng thái**: Có `status_name` chứa cụm từ `"Ra Về"` (hoặc status tương ứng là `2` hoặc `4` khi không có tên trạng thái chữ).
   * **Loại cuộc hẹn**: Có `type_name` chứa cụm từ `"Tư vấn"` (hoặc tên dịch vụ `service_name` chứa từ khóa `"tư vấn"` khi không có phân loại).
3. **Sắp xếp (`Sort Order`)**: Dữ liệu được truy vấn và sắp xếp theo thứ tự **Tăng dần theo Ngày hẹn** (`orderBy: { appointment_date: 'asc' }`).
4. **Ghi đè dữ liệu**: Ghi toàn bộ danh sách đã sắp xếp bắt đầu từ dòng đầu tiên (dòng 1 là Tiêu đề cột, dòng 2 trở đi là dữ liệu).

### 2.2. Logic dịch chuyển dòng
Do dữ liệu được sắp xếp tăng dần theo `appointment_date` và sheet được xây dựng lại từ đầu:
* Bất kỳ lịch hẹn mới nào được đồng bộ từ CRM VTTech về có ngày hẹn **trước hoặc bằng** ngày `23-06-2026` sẽ được chèn lên phía trên lịch hẹn mục tiêu.
* Bất kỳ lịch hẹn cũ nào đã có sẵn trong database nhưng mới được nhân viên cập nhật thông tin trên CRM (Ví dụ chuyển trạng thái từ *Chưa Đến* sang *Ra Về*, hoặc cập nhật loại lịch sang *Tư Vấn*) cũng sẽ được đưa vào danh sách lọc và chèn lên phía trên lịch hẹn mục tiêu.

---

## 3. Phân tích dữ liệu thực tế từ Database

Qua truy vấn trực tiếp cơ sở dữ liệu PostgreSQL (`db_tazagroup_vttech_sync`) để tìm các lịch hẹn có ngày hẹn trước hoặc bằng ngày `23-06-2026` được thêm mới hoặc cập nhật thông tin trong vòng 36 giờ qua (kể từ sáng ngày 23-06-2026), hệ thống ghi nhận **đúng 83 bản ghi** thay đổi.

### 3.1. Nhóm lịch hẹn mới đồng bộ từ VTTech (Newly Created in DB)
Đây là các lịch hẹn thuộc quá khứ (tháng 3/2026) mới được công cụ đồng bộ (Worker) quét và tải về database cục bộ. Do có ngày hẹn nhỏ hơn ngày `23-06-2026`, chúng được xếp lên trên lịch hẹn mục tiêu.

Dưới đây là một số bản ghi tiêu biểu được tạo mới trong DB:

| Mã lịch hẹn | Tên khách hàng | Ngày hẹn | Dịch vụ | Thời điểm tạo trong DB |
| :--- | :--- | :--- | :--- | :--- |
| `NHH20260305.732275` | NGUYỄN MINH THƯ | 05-03-2026 | Triệt lông | 23-06-2026 21:08:29 |
| `NHH20260306.732498` | LÊ HOÀNG THẠCH | 06-03-2026 | Triệt lông | 24-06-2026 00:41:03 |
| `Q_T20260306.732722` | VỸ DẠ | 08-03-2026 | Triệt lông | 23-06-2026 19:19:11 |
| `NHH20260308.733931` | ĐOÀN XUÂN HƯƠNG | 09-03-2026 | Triệt lông | 23-06-2026 19:36:27 |
| `NHH20260307.733274` | NGUYỄN THANH THẢO | 09-03-2026 | Triệt lông | 23-06-2026 20:06:34 |

### 3.2. Nhóm lịch hẹn cũ được cập nhật thông tin (Updated Existing in DB)
Đây là các lịch hẹn đã tồn tại sẵn trong database từ trước nhưng trong ngày qua đã có hoạt động thay đổi trên CRM VTTech (Ví dụ: khách hàng hoàn tất dịch vụ ra về, lễ tân cập nhật trạng thái lịch, v.v.). Hệ thống đã đồng bộ cập nhật lại thông tin, khiến chúng thỏa mãn bộ lọc "Ra Về + Tư Vấn" và xuất hiện trên sheet.

Dưới đây là một số bản ghi tiêu biểu được cập nhật trong DB:

| Mã lịch hẹn | Tên khách hàng | Ngày hẹn | Dịch vụ | Thời điểm cập nhật DB | Trạng thái mới |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NHH20260101.708006` | ĐINH THỊ DIỆU HƯƠNG | 01-01-2026 | Triệt lông | 24-06-2026 00:39:34 | Ra Về / Tư Vấn |
| `H_V20251230.707052` | HUỲNH THỊ LỰU | 01-01-2026 | MỤN 199K | 23-06-2026 22:31:11 | Ra Về / Tư Vấn |
| `TPTZ20251231.707897` | NGUYỄN THỊ THUÝ HẰNG | 01-01-2026 | Triệt lông | 24-06-2026 01:53:09 | Ra Về / Tư Vấn |
| `NHH20260101.708022` | NGUYỄN PHƯƠNG MẠNH QUÂN | 02-01-2026 | CSD cơ bản | 23-06-2026 21:40:51 | Ra Về / Tư Vấn |
| `PVD20260102.708398` | ĐỖ NGUYỄN ĐÔNG PHƯƠNG | 02-01-2026 | Trị thâm IPL | 23-06-2026 19:58:28 | Ra Về / Tư Vấn |

---

## 4. Kết luận & Đánh giá

1. **Tính chính xác của dữ liệu**: Hiện tượng dịch dòng từ dòng **5094** xuống **5177** hoàn toàn **không phải lỗi hệ thống**, mà là kết quả chính xác của việc chèn thêm đúng **83 bản ghi lịch hẹn** hợp lệ vào các ngày trước đó (được đồng bộ mới hoặc cập nhật trạng thái thỏa mãn bộ lọc).
2. **Tính ổn định của vị trí dòng**: Với cơ chế sắp xếp tăng dần theo thời gian (`asc`) và cho phép đồng bộ bù/cập nhật lịch hẹn trong quá khứ, vị trí dòng của một lịch hẹn trên Google Sheets sẽ **không cố định tuyệt đối** cho đến khi toàn bộ dữ liệu của khoảng thời gian phía trước được chốt và không có thêm bất kỳ thay đổi nào từ phía CRM VTTech.
3. **Đề xuất**:
   * Nếu bộ phận Sale Admin yêu cầu một cột định danh không đổi hoặc vị trí dòng không được phép trượt để đánh dấu thủ công trên Google Sheet, hệ thống cần đổi cơ chế sắp xếp sang giảm dần (`desc`) hoặc xuất báo cáo ra file Excel tĩnh thay vì đồng bộ đè trực tiếp lên một Sheet động hàng ngày.
