---
name: multi-tenant-context-standard
description: Chuẩn mực xử lý Multi-tenant (Đa doanh nghiệp) cho KataCore. Tự động inject companyId và filter dữ liệu theo Tenant.
---

# Multi-tenant Context Standard (KataCore)

Hệ thống KataCore hoạt động trên mô hình Multi-tenant (mỗi công ty là một tenant). Mọi dữ liệu PHẢI được phân tách theo `companyId`.

## 1. Backend Standard (NestJS & Prisma)

### 1.1. BaseCompanyService
Mọi service nghiệp vụ có liên quan đến dữ liệu công ty PHẢI `extend BaseCompanyService`.

```typescript
import { BaseCompanyService } from '../common/base-company.service';

@Injectable()
export class YourService extends BaseCompanyService {
  // logic...
}
```

### 1.2. Filtering Data (Read)
Luôn sử dụng `this.companyWhere()` hoặc `this.withCompany(where)` để lấy điều kiện lọc.

```typescript
// ✅ Chuẩn: Tự động filter theo companyId từ Request Context
async findAll() {
  return this.prisma.yourModel.findMany({
    where: {
      ...this.companyWhere(),
      status: 'ACTIVE'
    }
  });
}
```

### 1.3. Creating Data (Write)
Luôn sử dụng `this.withCompanyData(data)` để tự động gán `companyId` vào record mới.

```typescript
async create(data: CreateInput) {
  return this.prisma.yourModel.create({
    data: this.withCompanyData(data)
  });
}
```

### 1.4. Security Validation
Khi update hoặc delete bằng ID, phải kiểm tra quyền truy cập công ty.

```typescript
async update(id: string, data: UpdateInput) {
  const item = await this.prisma.yourModel.findUnique({ where: { id } });
  this.validateCompanyAccess(item?.companyId, 'Tên Resource');
  
  return this.prisma.yourModel.update({
    where: { id },
    data
  });
}
```

## 2. Frontend Standard (Next.js)

### 2.1. Lấy thông tin Company hiện tại
Sử dụng hook `useCompany` (hoặc tương đương) để lấy context công ty đang login.

### 2.2. API Calls
Frontend không cần truyền `companyId` thủ công vào payload API (trừ trường hợp đặc biệt). Backend sẽ tự động extract từ Token/Subdomain.

### 2.3. URL Structure
Sử dụng subdomain hoặc path prefix nếu cần phân biệt tenant trên trình duyệt.

## 3. Database Standard (Prisma Schema)

Mọi Model thuộc về tenant PHẢI có trường `companyId`:
```prisma
model YourModel {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  // ... rest of fields
  
  @@index([companyId])
}
```

---
**Lưu ý**: Vi phạm chuẩn Multi-tenant (để lộ dữ liệu cross-company) là lỗi bảo mật mức độ CRITICAL.
