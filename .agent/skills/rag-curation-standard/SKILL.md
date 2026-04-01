---
name: rag-curation-standard
description: Chuẩn mực quản trị và tối ưu hóa dữ liệu tri thức tri thức cho hệ thống RAG & EAI.
---

# SKILL: RAG Data Curation & Optimization Standard

Skill này cung cấp các hướng dẫn và quy trình chuẩn để chuẩn bị, nạp và tinh chỉnh dữ liệu tri thức nhằm tối đa hóa hiệu suất của hệ thống RAG (Retrieval-Augmented Generation) và tính giải trình của EAI.

## 1. Chuẩn hóa Định dạng Tài liệu (Preparation)

Để AI có thể trích xuất thông tin tốt nhất, tài liệu Markdown (.md) cần tuân thủ:
- **Heading Hierarchy:** Sử dụng # cho tiêu đề chính, ## cho phân mục lớn. Tránh lồng quá 3 tầng.
- **Rule-ID Injection:** Mỗi quy định quan trọng nên có một ID duy nhất gắn kèm (Ví dụ: `[RULE-ORD-001]`).
- **Glossary:** Định nghĩa rõ ràng các thuật ngữ chuyên môn ngay đầu tài liệu.
- **Entity Boldness:** In đậm các thực thể quan trọng (Tên sản phẩm, mã kho, tên nhà cung cấp).

## 2. Quy trình Curation (Human-in-the-loop)

Mọi dữ liệu nạp vào phải trải qua 3 bước kiểm soát:
1. **Extraction Check:** Kiểm tra AI có parse đúng các bảng dữ liệu hoặc danh sách không.
2. **Context Enrichment:** Thêm các ghi chú giải thích ngữ cảnh cho các đoạn văn bản trừu tượng.
3. **Verification:** Người có thẩm quyền (Expert) xác nhận tính đúng đắn trước khi chuyển sang trạng thái `PUBLISHED`.

## 3. Tối ưu hóa Token (Token Efficiency)

- **Semantic Chunking:** Thay vì chia theo độ dài cố định, hãy chia theo ý nghĩa (Paragraph-based).
- **Metadata Striping:** Loại bỏ các metadata không cần thiết khỏi Prompt (Ví dụ: ID nội bộ của file, timestamp hệ thống không liên quan).
- **Abbreviation Mapping:** Sử dụng bảng mã hóa (Abbreviation Map) cho các trường dữ liệu lặp lại nhiều lần.
- **Conversation Summarization:** Tự động nén các lượt hội thoại cũ, chỉ giữ lại các thực thể quan trọng và tóm tắt chủ đề để tiết kiệm 40-60% token cho mỗi Query.

## 4. Kiểm định Chất lượng (Evaluation)

- **RAGAS Metric:** Sử dụng hệ thống đánh giá tính liên quan (Relevance), tính trung thực (Faithfulness) và tính chính xác của câu trả lời.
- **Gold Standard Set:** Duy trì bộ 50 câu hỏi-trả lời mẫu để kiểm tra tính ổn định của hệ thống sau mỗi lần cập nhật dữ liệu.

