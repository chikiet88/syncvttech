---
description: Tổng quan kiến trúc, phân hệ và chức năng của toàn dự án Katacore V2
---

# Tổng quan Dự án Katacore V2 (RausachCore Starter)

Tài liệu này tóm tắt toàn bộ cấu trúc và chức năng của hệ thống để hỗ trợ việc bảo trì và nâng cấp.

## 1. Tech Stack

- **Frontend:** Next.js 15+ (App Router), TailwindCSS, Apollo Client.
- **Backend:** NestJS, GraphQL, Prisma ORM, PostgreSQL.
- **Cache & Queue:** Redis.
- **Infra:** Docker, Nginx, Bun Runtime, MinIO.

## 2. Các Phân hệ chính (Modules)

### 2.1. Core System

- **Multi-tenancy:** Quản lý đa công ty thông qua Model `Company`.
- **RBAC:** Phân quyền theo Role và Permission.
- **FileManager:** Quản lý tệp tin tích hợp MinIO.

### 2.2. E-commerce & CRM

- **Sản phẩm:** Model `Product`, `ProductVariant`, `Category`.
- **Đơn hàng:** Model `Order`, `OrderItem`, `Payment`.
- **Affiliate:** Hệ thống tiếp thị liên kết (`AffCampaign`, `AffUser`).

### 2.3. Learning Management System (LMS)

- **Course:** `Course`, `Lesson`, `CourseModule`.
- **Assessment:** `Quiz`, `Question`, `Certificate`.

### 2.4. Project & Task Management

- **Agile:** `Project`, `Sprint`, `RoadmapItem`.
- **Tasks:** `Task`, `TaskComment`, `KanbanView`.

### 2.5. AI Capabilities

- **RAG Chatbot:** Huấn luyện AI từ dữ liệu `SourceDocument`.
- **AI Models:** Quản lý `ChatbotModel` và `TrainingData`.

### 2.6. Accounting (Ketoan)

- **Hóa đơn:** `Hoadon`, `HoadonChitiet`.
- **Giao dịch:** `InterCompanyTransaction`.

## 3. Cấu trúc Thư mục quan trọng

- `/frontend/src/app`: Chứa các Route chính của ứng dụng.
- `/backend/src`: Chứa logic nghiệp vụ xử lý GraphQL và REST API.
- `/backend/prisma/schema.prisma`: Định nghĩa toàn bộ cấu trúc Database.
- `.agent/workflows/`: Chứa các hướng dẫn vận hành cho AI agent.

---

_Cập nhật lần cuối: 05/01/2026_
