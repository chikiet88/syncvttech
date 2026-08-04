---
name: ui-qa-guide-builder
description: Chuyên gia Testing UI, quay video flow và tạo hướng dẫn sử dụng (User Guide) theo chuẩn VTTech Core.
---

# UI QA & Guide Builder

Kỹ năng này điều phối việc kiểm thử giao diện (UI Testing) và tự động tạo tài liệu hướng dẫn sử dụng có hình ảnh/video minh họa.

## 0. Thông tin đăng nhập (Browser Auth)

Khi sử dụng `browser_subagent` để kiểm thử trên môi trường local (`timona.localhost:3000`), hãy sử dụng tài khoản sau:
- **Tài khoản**: `qa@tazagroup.vn`
- **Mật khẩu**: `12345678`

## 1. Trình tự thực hiện (Workflow)

1.  **Môi trường**: Đảm bảo ứng dụng đang chạy (thường là `bun dev` trên port 3000).
2.  **Khám phá & Test**: 
    *   Sử dụng `browser_subagent` để truy cập các tính năng cần test.
    *   Thực hiện các thao tác người dùng (click, nhập liệu, chuyển trang).
    *   Kiểm tra tính đúng đắn của UI theo `frontend-standard` và `vietnamese-ux-glossary-standard`.
3.  **Ghi hình & Chụp ảnh**:
    *   **Video**: Luôn cung cấp `RecordingName` (ví dụ: `feature_tour_video`) trong `browser_subagent` để hệ thống tự động lưu video recording.
    *   **Ảnh**: Sử dụng công cụ `screenshot` hoặc `browser_subagent` để chụp lại các bước quan trọng trong quy trình (Step-by-step).
4.  **Tài liệu hướng dẫn**:
    *   Tạo file hướng dẫn tại `docs/reviews/` theo chuẩn `documentation-standard`.
    *   Tên file: `[STT]-Userguid-[Tên-Tính-Năng].md`.
    *   Nội dung: Chèn các hình ảnh đã chụp và dẫn link video recording vào tài liệu.
    *   Yêu cầu: Phải có ít nhất 3 ví dụ demo thực tế (Case study).

## 2. Các điểm cần lưu ý (QA Checklist)

*   **Responsive**: Kiểm tra hiển thị trên mobile và desktop (sử dụng `viewport` trong subagent).
*   **Tiếng Việt**: Đảm bảo toàn bộ nhãn UI đã được Việt hóa 100% theo `vietnamese-ux-glossary-standard`.
*   **Lỗi UI**: Nếu phát hiện lỗi (nút bị lệch, màu sai, tràn chữ), phải chụp ảnh và ghi chú rõ trong báo cáo `Analytics`.

## 3. Prompt chuẩn để kích hoạt

Sử dụng cấu trúc ngắn gọn sau:

> "Dùng skill **ui-qa-guide-builder**, hãy test flow [Tên tính năng]. Quay video recording, chụp ảnh từng bước và viết tài liệu Userguid chuẩn vào thư mục docs."
