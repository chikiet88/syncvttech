---
name: ai-performance-collaboration
description: Chuẩn mực tối ưu hóa hiệu suất khi làm việc giữa AI và Hệ thống - Tránh treo máy, tối ưu RAM/CPU và quy trình kiểm tra lỗi thông minh.
---

# AI Performance & Collaboration Standard

Bộ chuẩn mực này giúp AI Agent hoạt động hiệu quả trên máy của người dùng, tránh tình trạng treo IDE (freeze), lag hệ thống và tối ưu hóa tài nguyên (RAM/CPU/Swap).

## 1. Nhận thức Hệ thống (System Awareness)

AI phải luôn ý thức được giới hạn phần cứng của máy người dùng:
- **RAM/Swap**: Trước khi thực hiện các tác vụ nặng (biên dịch, quét thư mục lớn), AI nên ưu tiên kiểm tra tài nguyên (`free -m`).
- **Phản hồi chậm**: Nếu một lệnh chạy quá 30-45 giây mà không có phản hồi, AI phải chủ động đề xuất **Cancel** hoặc tìm phương án thay thế nhẹ hơn, thay vì tiếp tục chờ đợi vô hạn.

## 2. Kiểm tra TypeScript thông minh (Efficient TS Checking)

Tuyệt đối hạn chế chạy `tsc` (TypeScript Compiler) trực tiếp trên các file đơn lẻ trong dự án lớn vì nó tốn rất nhiều RAM và dễ gây treo máy.

- **Quy tắc 1: Ưu tiên phân tích tĩnh (Static Analysis)**. AI có khả năng đọc code rất tốt, hãy tự kiểm tra logic, import và kiểu dữ liệu bằng "mắt" (đọc nội dung file) trước khi dùng công cụ.
- **Quy tắc 2: Dùng ESLint trước**. Chạy linter thường nhẹ hơn chạy `tsc`.
- **Quy tắc 3: Sử dụng các script tối ưu của dự án**. Luôn kiểm tra `package.json` và menu `bun dev` để dùng các lệnh kiểm tra đã được cấu hình tối ưu sẵn.
    - Ưu tiên: `BC. Check TypeScript Only` hoặc các lệnh có cờ `--incremental`.
- **Quy tắc 4: C Flags quan trọng**. Nếu bắt buộc phải chạy `tsc`, luôn kèm theo các cờ:
    - `--noEmit` (không tạo file output).
    - `--skipLibCheck` (bỏ qua node_modules - TIẾT KIỆM RAM NHẤT).
    - `--incremental` (biên dịch tăng dần).

## 3. Quản lý tác vụ nặng (Heavy Tasks Management)

- **Không chạy song song**: Không khởi chạy nhiều tiến trình biên dịch hoặc quét toàn bộ codebase cùng một lúc khi đang có sẵn các server dev (`bun dev`, Docker) đang chạy.
- **Quản lý tiến trình chạy ngầm (Background Processes)**: Trước khi chạy một script dài (như sync dữ liệu, migrate), AI BẮT BUỘC phải kiểm tra xem có tiến trình nào tương tự đang chạy hay không (`ps aux | grep <tên_script>`). Không được để 2-3 tiến trình cùng thực hiện một nhiệm vụ trùng lặp.
- **Tối ưu hóa ghi dữ liệu (Batch Operations)**: Khi xử lý dữ liệu lớn (>10,000 bản ghi), AI phải dùng cơ chế **Batching** (ví dụ: insert 1000 records mỗi lần) thay vì ghi từng bản ghi để tránh treo DB và chiếm dụng CPU/RAM quá lâu.
- **Quét tệp tin**: Hạn chế dùng `grep` hoặc `find` trên toàn bộ ổ đĩa. Luôn chỉ định thư mục mục tiêu (ví dụ: `src/components`) để giảm I/O và CPU.

## 4. Xử lý khi IDE bị "Đứng" (Handling Freezes)

Khi nhận thấy hệ thống có dấu hiệu quá tải (Swap tăng cao, CPU 100%):
- AI phải dừng ngay các tiến trình ngầm không cần thiết.
- Thông báo cho người dùng biết công cụ nào đang gây nghẽn.
- Đề xuất người dùng chạy các lệnh bảo trì có sẵn trong dự án:
    - **Option 19: Fix File Watchers** (từ menu `bun dev`).
    - **Option 13: Kill All Ports** (để giải phóng tài nguyên bị kẹt).

## 5. Tương tác "Cặp đôi" (Pair Programming Strategy)

- **Giải thích trước, làm sau**: AI nên giải thích phương án sửa lỗi trước khi thực hiện thay đổi lớn, để người dùng có thể can thiệp nếu thấy phương án đó quá tốn tài nguyên.
- **Chia nhỏ thay đổi**: Thay vì refactor 10 file cùng lúc, hãy làm từng file một và xác nhận trạng thái sau mỗi bước.

## 6. Lưu ý về Cloudflare Tunnels
- Khi người dùng cung cấp các lệnh `cloudflared tunnel`, AI nên ghi nhớ và hỗ trợ người dùng quản lý chúng trong các file cấu hình môi trường hoặc README, tránh làm mất thông tin token quan trọng.

## 7. Trách nhiệm "End-to-End" (Definition of Done)
- **Kiểm chứng thực tế trước khi báo cáo**: Tuyệt đối không báo cáo "Hoàn thành 100%" hoặc "Đã kiểm chứng (Verified)" khi chỉ mới viết tài liệu hướng dẫn (Guide/Proposal) mà chưa thực sự sinh ra file code (`.ts`, `.tsx`, `.py`, v.v.).
- **Xác thực Route (Route Verification)**: Khi thiết kế hay báo cáo về một hệ thống Frontend/Backend, AI BẮT BUỘC phải dùng công cụ để kiểm tra (ví dụ: `list_dir`) xem file định tuyến (như `page.tsx`, `controller.ts`) đã thực sự tồn tại ở đúng thư mục vật lý hay chưa trước khi kết luận hệ thống hoạt động.
- **Không giả định biên giới công việc**: Nếu người dùng yêu cầu "Hoàn thành toàn bộ dự án" hoặc "Hoàn thành 100%", AI phải chủ động lập trình cả phần Frontend UI (Giao diện) nếu đã làm xong Backend, thay vì chỉ viết tài liệu rồi dừng lại (trừ khi người dùng cấm).
57: 
58: ## 8. Kiểm soát Giới hạn Token (Token Generation Management)
59: 
60: Để tránh lỗi nghiêm trọng **"The model's generation exceeded the maximum output token limit"** (thường xảy ra khi phản hồi vượt quá 16,384 tokens), AI phải tuân thủ các quy tắc sau:
61: 
62: - **Quy tắc 1: Không ghi đè file lớn (No Full Rewrites)**. Tuyệt đối không dùng `write_to_file` để cập nhật các file có dung lượng lớn (>300 dòng). Luôn sử dụng `replace_file_content` hoặc `multi_replace_file_content` để chỉ thay đổi các đoạn code cần thiết.
63: - **Quy tắc 2: Tạm dừng và chia nhỏ (Response Chunking)**. Nếu một yêu cầu đòi hỏi thay đổi logic ở hơn 5 file hoặc viết tài liệu dài (>2000 chữ), AI phải chủ động chia thành 2-3 giai đoạn (turns). Ví dụ: "Tôi sẽ sửa logic Backend trước, sau đó bạn hãy yêu cầu tôi làm tiếp phần Frontend".
64: - **Quy tắc 3: Ưu tiên dùng Artifacts cho tài liệu dài**. Thay vì in hàng ngàn dòng log hoặc tài liệu Review vào cửa sổ chat, hãy ghi chúng vào một file `.md` trong thư mục `docs/` hoặc `artifacts/` và chỉ tóm tắt các điểm chính cho người dùng.
65: - **Quy tắc 4: Xử lý tệp Schema khổng lồ**. Khi làm việc với `schema.prisma` (thường >7000 dòng), AI không được phép view toàn bộ file. Chỉ view các block model liên quan và thực hiện thay đổi cực kỳ tập trung.
66: - **Quy tắc 5: Tự phục hồi sau lỗi (Self-Correction)**. Nếu không may gặp lỗi "Exceeded limit", ở lượt phản hồi tiếp theo, AI phải:
67:     1. Xin lỗi người dùng.
68:     2. Tóm tắt những gì ĐÃ làm được (nếu có công cụ nào đã chạy thành công).
69:     3. Chia nội dung còn lại thành các phần nhỏ hơn để thực hiện tiếp.
70: 
