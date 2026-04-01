---
name: documentation-standard
description: Chuẩn mực đặt tên và cấu trúc tài liệu đánh giá, báo cáo tiến độ và tổng hợp tính năng cho KataCore.
---

# Documentation & Reporting Standard

Đây là quy chuẩn đặt tên và phân loại tài liệu trong thư mục `docs/reviews` (hoặc các thư mục tài liệu nghiệp vụ khác) nhằm đảm bảo tính hệ thống và dễ tra cứu.

## 1. Quy tắc đặt tên File (Naming Convention)

Tất cả các file tài liệu mới được tạo ra phải tuân thủ cấu trúc:
`[Số Thứ Tự]-[Loại Tài Liệu]-[Tên Tài Liệu].md`

Trong đó, `[Loại Tài Liệu]` phải thuộc một trong ba nhóm sau:

### Nhóm 1: Phân Tích Đánh Giá & Đề Xuất

- **Tiền tố**: `Analytics`
- **Cấu trúc**: `[STT]-Analytics-[Tên].md`
- **Nội dung**: Phân tích hiện trạng, tính năng, đánh giá ưu điểm/khuyết điểm và đưa ra các đề xuất giải pháp/kiến trúc.
- **Ví dụ**: `21-Analytics-Project-Accounting-Review.md`

### Nhóm 2: Tiến Độ & Báo Cáo Thực Hiện

- **Tiền tố**: `Process`
- **Cấu trúc**: `[STT]-Process-[Tên].md`
- **Nội dung**: Báo cáo tiến độ thực hiện công việc, bao gồm tỷ lệ % hoàn thành, các task đã làm và các vấn đề phát sinh.
- **Ví dụ**: `22-Process-Chat-Implementation.md`

### Nhóm 3: Tổng Hợp & Kết Quả Tính Năng

- **Tiền tố**: `Final`
- **Cấu trúc**: `[STT]-Final-[Tên].md`
- **Nội dung**: Tổng hợp lại toàn bộ các tính năng đã hoàn thiện, hướng dẫn sử dụng cuối cùng hoặc bảng tổng kết dự án.
- **Ví dụ**: `23-Final-Financial-Module-Summary.md`

### Nhóm 4: Hướng dẫn sử dụng (Có Route chi tiết)

- **Tiền tố**: `Userguid`
- **Cấu trúc**: `[STT]-Userguid-[Tên].md`
- **Nội dung**: Hướng dẫn chi tiết cách sử dụng tính năng, bao gồm các đường dẫn (Route) chi tiết trong hệ thống và các bước thao tác cụ thể.
- **Yêu cầu bắt buộc**: Phải có ít nhất 3 ví dụ demo thực tế về cách áp dụng tính năng đó trong nghiệp vụ.
- **Ví dụ demo tiêu chuẩn**:
  1.  **Demo 1 (Nghiệp vụ Kế toán)**: Hướng dẫn luồng xử lý "Phê duyệt tạm ứng" với điều kiện rẽ nhánh theo số tiền (Dưới 10tr: Trưởng phòng duyệt; Trên 10tr: Giám đốc duyệt).
  2.  **Demo 2 (Nghiệp vụ Kho)**: Hướng dẫn quy trình "Kiểm kê kho định kỳ" tích hợp quét mã QR và tự động tạo phiếu điều chỉnh tồn kho khi có chênh lệch.
  3.  **Demo 3 (Nghiệp vụ Sales)**: Hướng dẫn luồng "Xử lý đơn hàng Online" từ lúc khách đặt -> Kho xác nhận -> Đơn vị vận chuyển lấy hàng -> Hoàn tất tài chính.

## 2. Quản lý Số Thứ Tự (Order Management)

- **Số Thứ Tự (STT)**: Phải là số liên tiếp tiếp theo của file mới nhất trong thư mục.
- **Kiểm tra trước khi tạo**: Luôn kiểm tra file có số lớn nhất hiện tại để đảm bảo không bị trùng lặp số thứ tự.

## 3. Cấu trúc nội dung chuẩn (Template)

- **Tiêu đề**: Phải có Header 1 (`#`) ở dòng đầu tiên.
- **Meta-data**: Luôn có mục "Thông tin chung" bao gồm: Ngày tạo, Trạng thái (Draft/Final), Người thực hiện.
- **Ngôn ngữ**: Ưu tiên sử dụng Tiếng Việt chuyên ngành rõ ràng, súc tích.
