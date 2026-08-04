# 🚀 VTTech Engine & Analytics Dashboard

> **Hệ thống Đồng bộ Dữ liệu VTTech CRM & Dashboard Báo cáo Quản trị cho Tazagroup**

---

## 📌 Giới thiệu Tổng quan

Hệ thống thu thập, đồng bộ và phân tích dữ liệu tự động từ CRM VTTech (17 chi nhánh), tổng đài PBX và Google Sheets dành riêng cho Tazagroup.

### Thành phần chính:
1. **`backend-api`**: NestJS Server + Prisma ORM + BullMQ Redis Queue + Cronjob Runner.
2. **`vttech-dashboard`**: Next.js 15 App Router Frontend + Shadcn UI + Recharts.
3. **`HANDOVER_TAZAGROUP.md`**: Tài liệu hướng dẫn bàn giao & vận hành ứng dụng cho Tazagroup.

---

## 🚀 Khởi chạy Nhanh với Docker Compose

```bash
# Khởi động toàn bộ dịch vụ (Postgres, Redis, Backend, Frontend)
docker-compose up -d --build

# Kiểm tra trạng thái
docker-compose ps
```

---

## 🛠️ Phát triển & Bảo trì

- **Backend API (NestJS)**: Lắng nghe tại port `3001`
- **Frontend Dashboard (Next.js 15)**: Lắng nghe tại port `3000`
- **Database**: PostgreSQL
- **Queue**: Redis (BullMQ)

---
© 2026 Development Team. Developed for Tazagroup.
