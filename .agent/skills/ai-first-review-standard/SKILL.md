# AI-First Review & Analysis Standard (SDLC Focused)

Kỹ năng này được kích hoạt khi người dùng yêu cầu: **"Review, phân tích, đánh giá tính năng [Tên Tính Năng] theo chuẩn AI-First và quy trình phần mềm"**.

## 1. Quy trình Thực hiện (SDLC Workflow)

Khi nhận được yêu cầu, AI phải thực hiện phân tích và trình bày theo đúng thứ tự các giai đoạn phát triển phần mềm:

1.  **Giai đoạn 1: Phân tích Phân hệ & Yêu cầu (Analysis)**: Xác định phạm vi, hiện trạng và mục tiêu AI-First.
2.  **Giai đoạn 2: Thiết kế Kiến trúc & Giải pháp (Architecture)**: Định hình Tech Stack, Database Model, API Endpoints.
3.  **Giai đoạn 3: Đánh giá Chi tiết & Đối chiếu AI-First (Review)**: Bảng so sánh tính năng truyền thống vs AI-First.
4.  **Giai đoạn 4: Thiết kế Giao diện & Trải nghiệm (UI/UX)**: Phân tích Layout và Stitch Prompts cho từng màn hình.
5.  **Giai đoạn 5: Đảm bảo Chất lượng & Kiểm thử (QA/QC)**: Các kịch bản test AI, độ chính xác và hiệu năng.
6.  **Giai đoạn 6: Lộ trình Triển khai & Vận hành (Roadmap)**: Các bước thực hiện và kế hoạch release.

## 2. Cấu trúc Tài liệu Đầu ra (Bắt buộc)

Tài liệu phải bao gồm 6 mục tương ứng với 6 giai đoạn trên:

### Mục 1: Phân tích Phân hệ & Yêu cầu tổng quan
- Tổng quan về tính năng/dự án.
- Các vấn đề tồn đọng của luồng truyền thống.
- Lợi ích kỳ vọng khi chuyển đổi sang AI-First.

### Mục 2: Thiết kế Kiến trúc & Giải pháp Kỹ thuật
- **Tech Stack**: Các công nghệ chính (Next.js, NestJS, Prisma, Tailwind v4...).
- **AI Orchestration**: Lựa chọn Model (Gemini Pro/Flash, GPT-4o...), Logic điều phối RAG/Agent.
- **Database Schema**: Cấu trúc các bảng dữ liệu chính (Prisma syntax).
- **API Endpoints**: Danh sách các API chính (với prefix `/api/v1/`).

### Mục 3: Bảng Đánh giá Chi tiết (AI-First Review Table)
Sử dụng bảng với các cột:
| Tính năng | Route | Hiện trạng | Mức độ AI-First | Đề xuất Nâng cấp (AI-First Logic) | Model tối ưu | Tiến độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### Mục 4: Phân tích UI/UX & Stitch Prompts
- **Route Mapping**: Liệt kê 100% các Route đã nhắc đến ở Mục 3 hoặc đề xuất các Route mới tối ưu cho trải nghiệm AI-First.
- **Screen Inventory**: Phân tích chi tiết từng màn hình dựa trên danh sách Route:
    - **Mục đích (Purpose)**: Giải thích chức năng chính và vai trò của màn hình trong luồng nghiệp vụ AI-First.
    - **Stitch Prompt (Detailed)**: Cung cấp Prompt chi tiết (song ngữ Việt/Anh) để sinh UI qua Stitch MCP, bao gồm mô tả Layout, Components (Shadcn UI), và các tính năng thông minh (Micro-interactions, Conversational UI).

### Mục 5: Chiến lược Đảm bảo Chất lượng (QA/QC)
- **AI Validation Criteria**: Quy trình xác minh độ chính xác (Accuracy), độ trễ (Latency) và tính hợp lệ của dữ liệu đầu ra từ AI (Schema validation).
- **Edge Cases & Error Handling**: Phân tích các tình huống ngoại lệ (Dữ liệu đầu vào mâu thuẫn, Prompt rỗng, Token limit, API Timeout) và cơ chế Fallback.
- **Performance Benchmarks**: Các chỉ số hiệu năng cụ thể cần đạt (Ví dụ: Time to First Token < 800ms, tỷ lệ lỗi AI < 2%).
- **Manual Test Scenarios (Step-by-Step)**: Liệt kê các kịch bản kiểm thử giao diện và luồng AI:
    - **Route & Component**: Chỉ rõ màn hình và thành phần thực hiện test.
    - **Quy trình thực hiện (Steps)**: Các bước thao tác từ phía người dùng.
    - **Kết quả mong đợi (Expected)**: Trạng thái UI thay đổi như thế nào và Logic AI phản hồi ra sao.

### Mục 6: Lộ trình Triển khai & Vận hành
- Chia theo các Phase (Phase 1: Core, Phase 2: AI Integration, Phase 3: Optimize).
- Kế hoạch triển khai (Deployment steps).

## 3. Định hướng Đề xuất (AI-First)
-   **Conversational Logic**: Thay thế form nhập liệu bằng Chat/Voice.
-   **Proactive Insights**: Tự động gợi ý hành động.
-   **Auto-Correction**: Tự động định dạng/sửa lỗi.
-   **RAG/Knowledge Integration**: Kết nối nội dung với hệ thống tri thức.

## 4. Quy tắc đặt tên file
Tuân thủ `documentation-standard`:
- Thư mục: `docs/Corebase/` hoặc `docs/reviews/`.
- Tên file: `[STT]-Analytics-[Tên-Tính-Năng]-AI-First-Review.md`.
