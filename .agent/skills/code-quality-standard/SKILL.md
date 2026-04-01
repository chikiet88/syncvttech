---
name: code-quality-standard
description: Chuẩn mực về chất lượng code, giới hạn độ dài file và quy tắc tổ chức logic cho dự án KataCore.
---

# 💎 Code Quality & Clean Structure Standard (KataCore)

Tài liệu này định nghĩa các giới hạn và quy tắc bắt buộc để giữ cho codebase của KataCore luôn sạch sẽ, hiệu quả và dễ bảo trì.

## 1. Giới hạn độ dài (The Rule of Numbers)

Để tránh hiện tượng code quá rối rắm, mọi file phải tuân thủ các giới hạn sau:

- **Mỗi Hàm (Function/Method)**: Tối đa **30 dòng**. Nếu dài hơn, phải tách nhỏ logic.
- **Mỗi Component (React)**: Tối đa **200 dòng**. Logic phức tạp phải tách ra `useCustomHook`.
- **Mỗi File (Module/Service)**: Tối đa **400 dòng**. Ưu tiên tách file theo nguyên tắc Single Responsibility.
- **Tham số hàm**: Tối đa **3 tham số**. Nếu cần truyền nhiều hơn, hãy sử dụng một `Object`.

## 2. Tổ chức Logic (Separation of Concerns)

- **Backend (NestJS)**: `Controller/Resolver` chỉ điều hướng, `Service` chứa logic nghiệp vụ.
- **Frontend (React)**: 
  - **View (UI)**: Hạn chế tính toán logic trong hàm `return`.
  - **Logic (Hook)**: Chứa mọi logic xử lý dữ liệu và state.

## 3. Quy tắc đặt tên (Naming Convention)

- **Biến/Hàm**: `camelCase` (ví dụ: `getUserData`).
- **Class/Component**: `PascalCase` (ví dụ: `UserCard`).
- **File/Folder**: `kebab-case` (ví dụ: `user-list.tsx`).
- **Boolean**: Phải bắt đầu bằng `is`, `has`, `should`.
- **Ngôn ngữ**: 100% Tiếng Anh cho tên biến, hàm, class.

## 4. Kiểm soát lỗi & Log

- Không để trống khối `catch {}`.
- Log phải có ngữ cảnh rõ ràng.
- Sử dụng các lớp lỗi (Exceptions) chuẩn của dự án.

## 5. Kiểm tra & Refactor (DRY & Boy Scout Rule)

- **DRY**: Không lặp lại code. Nếu dùng 3 lần, hãy tạo hàm chung.
- **Boy Scout Rule**: Luôn để lại code sạch hơn lúc bạn mới mở nó ra.

---
_Lưu ý: Tiêu chuẩn này được áp dụng tự động cho cả AI và Lập trình viên khi làm việc trên KataCore._
