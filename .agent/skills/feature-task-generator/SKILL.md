---
name: feature-task-generator
description: Phân tích tính năng, tạo file đánh giá Markdown và tự động sinh danh sách GitHub Tasks cho 3 vai trò (Designer, Dev, QC). Dùng khi cần lập kế hoạch triển khai tính năng mới hoặc nâng cấp tính năng hiện có.
---

# Feature Analysis & Task Generator Standard

Kỹ năng này được kích hoạt khi người dùng yêu cầu:
- **"Phân tích tính năng [Tên] và tạo task"**
- **"Lập kế hoạch triển khai [Tên Tính Năng]"**
- **"Tạo task cho 3 vai trò từ tính năng [Tên]"**
- **"Feature planning cho [Tên Module]"**

---

## 1. Quy trình Tổng quan (3 Pha)

```
Pha 1: PHÂN TÍCH     → File Analytics Markdown
Pha 2: SINH TASK      → Danh sách Task trong file + GitHub Issues (nếu có gh CLI)
Pha 3: CẬP NHẬT      → Cập nhật file Process tracking tiến độ
```

---

## 2. Pha 1: Phân Tích Tính Năng (Feature Analysis)

### 2.1. Bước Khảo sát Mã nguồn

AI cần quét các khu vực sau để đánh giá hiện trạng:

| Khu vực | Đường dẫn | Mục đích |
| :--- | :--- | :--- |
| Database Schema | `backend/prisma/schema.prisma` | Xác định các Model liên quan |
| Backend Resolvers | `backend/src/**/[feature]*.resolver.ts` | Xác định API đã có |
| Backend Services | `backend/src/**/[feature]*.service.ts` | Logic nghiệp vụ hiện tại |
| Frontend Pages | `frontend/src/app/**/[feature]*/` | Giao diện đã triển khai |
| Frontend Components | `frontend/src/components/**/[feature]*` | Component tái sử dụng |
| Tài liệu hiện có | `docs/**/*[feature]*` | Specs / Reviews đã viết |
| GraphQL Schema | `backend/src/**/*.graphql` | Query/Mutation definitions |

### 2.2. Mẫu File Phân Tích (Analytics Template)

File phải tuân thủ `documentation-standard` với tên: `[STT]-Analytics-[Tên-Tính-Năng]-Task-Plan.md`

```markdown
# Phân Tích & Kế Hoạch Task: [Tên Tính Năng]

> **Thông tin chung**
> - Ngày tạo: [DD/MM/YYYY]
> - Trạng thái: Draft
> - Người thực hiện: [Tên]
> - Module liên quan: [Module Name]

---

## 1. Hiện Trạng (Current State Analysis)

### 1.1 Database & Schema
| Model | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| [ModelName] | ✅ Có / ❌ Chưa có / ⚠️ Cần sửa | [Chi tiết] |

### 1.2 Backend API (GraphQL)
| Query/Mutation | Trạng thái | Multi-tenant | Ghi chú |
| :--- | :--- | :--- | :--- |
| [queryName] | ✅/❌/⚠️ | ✅/❌ | [Chi tiết] |

### 1.3 Frontend UI
| Trang/Route | Trạng thái | Compact Design | Ghi chú |
| :--- | :--- | :--- | :--- |
| [/admin/feature/...] | ✅/❌/⚠️ | ✅/❌ | [Chi tiết] |

### 1.4 Đánh Giá Tổng Thể
- **Mức hoàn thiện hiện tại**: [X]%
- **Rủi ro chính**: [Liệt kê]
- **Thiếu sót nghiêm trọng**: [Liệt kê]

---

## 2. Danh Sách Task (Task Breakdown)

### 🎨 Designer Tasks
| ID | Tiêu đề | Mô tả chi tiết | Ưu tiên | Phụ thuộc |
| :--- | :--- | :--- | :--- | :--- |
| DESIGN-01 | [Tiêu đề] | [Mô tả yêu cầu thiết kế cụ thể] | P0/P1/P2 | Không |
| DESIGN-02 | [Tiêu đề] | [Mô tả] | P1 | DESIGN-01 |

### 🏗️ Dev Tasks (Backend + Frontend)
| ID | Tiêu đề | Loại | Mô tả chi tiết | Ưu tiên | Phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DEV-01 | [Tiêu đề] | Backend | [Mô tả kỹ thuật] | P0 | Không |
| DEV-02 | [Tiêu đề] | Frontend | [Mô tả kỹ thuật] | P0 | DESIGN-01, DEV-01 |

### 🧪 QA / Tester Tasks
| ID | Tiêu đề | Loại Test | Mô tả chi tiết | Ưu tiên | Phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- |
| QA-01 | [Tiêu đề] | RLS / Security | [Mô tả kịch bản test] | P0 | DEV-01 |
| QA-02 | [Tiêu đề] | UI / UX | [Mô tả kịch bản test] | P1 | DEV-02, DESIGN-01 |

---

## 3. Thứ Tự Thực Hiện (Execution Order)

> Hiển thị bằng mermaid gantt hoặc danh sách có đánh số

### Sprint 1 (Nền tảng)
1. `DESIGN-01` → Designer bắt đầu thiết kế
2. `DEV-01` → Dev xây dựng Schema + API (song song với Designer)

### Sprint 2 (Tích hợp)
3. `DEV-02` → Dev triển khai UI (dựa trên handoff từ DESIGN-01 + API từ DEV-01)
4. `QA-01` → QA test bảo mật Multi-tenant

### Sprint 3 (Hoàn thiện)
5. `DESIGN-02` → Designer review UI thực tế
6. `QA-02` → QA test toàn diện
7. Fix bug loop → Merge

---

## 4. Lệnh Tạo GitHub Issues (Auto-Generate)

> Copy-paste block này vào terminal để tạo issues tự động (yêu cầu `gh` CLI đã đăng nhập)

(Phần này được AI sinh tự động dựa trên bảng task ở Mục 2)
```

---

## 3. Pha 2: Sinh GitHub Issues Tự Động

### 3.1. Quy tắc tạo Issue

Mỗi task trong bảng Mục 2 được chuyển thành 1 GitHub Issue với format:

```bash
gh issue create \
  --title "[TASK-ID] [Vai trò] Tiêu đề task" \
  --body "## Mô tả
[Mô tả chi tiết từ bảng]

## Checklist
- [ ] Hoàn thành yêu cầu chính
- [ ] Tuân thủ chuẩn mực (multi-tenant / compact-ui / code-quality)
- [ ] Cập nhật trạng thái trên GitHub Project

## Phụ thuộc
[Danh sách task phụ thuộc]

## Vai trò phụ trách
[Designer / Dev / QC]" \
  --label "[label phù hợp]"
```

### 3.2. Label chuẩn

| Vai trò | Label |
| :--- | :--- |
| Designer | `type: design` |
| Dev (Backend) | `type: backend` |
| Dev (Frontend) | `type: frontend` |
| QA / Tester | `type: qa` |
| Ưu tiên cao | `priority: high` |
| Ưu tiên trung bình | `priority: medium` |

### 3.3. Workflow tạo Issue

AI sẽ hỏi người dùng trước khi tạo:
1. **"Tôi đã phân tích xong. Bạn muốn tôi tạo GitHub Issues luôn không?"**
2. Nếu đồng ý → Sinh commands `gh issue create` cho từng task
3. Nếu không → Chỉ xuất file Markdown với danh sách task

---

## 4. Pha 3: Cập Nhật Tiến Độ

Sau khi tạo task, AI tạo thêm file tracking:
- Tên file: `[STT]-Process-[Tên-Tính-Năng]-Progress.md`
- Nội dung: Bảng tiến độ với cột `Trạng thái` (To Do / In Progress / Done)

---

## 5. Quy tắc Phân Loại Task Theo Vai Trò

### 🎨 Designer nhận task khi:
- Cần thiết kế UI mới (Form, Table, Dashboard)
- Cần review UI đã triển khai (so với Compact Design Standard)
- Cần tạo Design System tokens mới

### 🏗️ Dev nhận task khi:
- Cần tạo/sửa Schema Prisma
- Cần viết GraphQL Resolver/Service
- Cần triển khai Frontend Component/Page
- Cần tích hợp API, fix bug

### 🧪 QA nhận task khi:
- Cần test Multi-tenant isolation (RLS)
- Cần test Validation input (số âm, XSS, boundary)
- Cần test Edge-case UI (số quá lớn, overflow, responsive)
- Cần test Performance (export file nặng, timeout)

---

## 6. Prompt Mẫu Cho Người Dùng

### Prompt phân tích tính năng mới:
```
Đọc skill `feature-task-generator`. Phân tích tính năng [TÊN TÍNH NĂNG] trong dự án hiện tại.
Quét schema Prisma, resolver, service, frontend pages liên quan.
Tạo file Analytics markdown với đầy đủ hiện trạng và sinh danh sách task cho 3 vai trò (Designer, Dev, QC).
```

### Prompt tạo task cho tính năng đã phân tích:
```
Đọc file `docs/reviews/[FILE-ANALYTICS].md`. Dựa trên phân tích đó, sinh GitHub Issues cho 3 vai trò
theo chuẩn `feature-task-generator`. Hiển thị lệnh `gh issue create` để tôi review trước khi chạy.
```

### Prompt chỉ tạo task nhanh (không phân tích sâu):
```
Dựa trên mô tả sau, tạo task breakdown cho 3 vai trò (Designer, Dev, QC) theo chuẩn `feature-task-generator`:
[MÔ TẢ TÍNH NĂNG CẦN LÀM]
```
