---
name: crud-service-resolver-standard
description: Chuẩn mực phát triển Backend và Database cho KataCore - Multi-tenant, Prisma Optimization, GraphQL Best Practices & Security.
---

# CRUD Service & Resolver Standard (KataCore)

Hướng dẫn xây dựng Service và Resolver chuẩn cho NestJS + Prisma + GraphQL.

## 1. Service Pattern (Prisma)

### 1.1. Cấu trúc cơ bản
Service PHẢI sử dụng `CompanyContextService` để đảm bảo Multi-tenant.

```typescript
@Injectable()
export class YourService {
  constructor(
    private prisma: PrismaService,
    private companyContext: CompanyContextService,
  ) {}
  
  // Logic lọc theo công ty
  private get companyId() {
    return this.companyContext.getCompanyId();
  }
}
```

### 1.2. Pagination Pattern
Luôn trả về format `items`, `total`, `page`, `totalPages`.

```typescript
async findAll(filters: PaginationInput) {
  const { skip = 0, take = 50 } = filters;
  const where = { companyId: this.companyId, ...semanticFilters };
  
  const [items, total] = await Promise.all([
    this.prisma.model.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    this.prisma.model.count({ where })
  ]);
  
  return {
    items,
    total,
    page: Math.floor(skip / take) + 1,
    pageSize: take,
    totalPages: Math.ceil(total / take),
  };
}
```

### 1.3. Relation Mapping
Sử dụng `include` trong Prisma hoặc DataLoaders để tránh lỗi N+1. Luôn map các tên trường legacy (nếu có) về chuẩn mới.

## 2. Resolver Pattern (GraphQL)

### 2.1. Query & Mutation Names
- Query: `customers`, `customer(id: ID!)`.
- Mutation: `createCustomer`, `updateCustomer`, `deleteCustomer`.
- Bulk Mutation: `deleteCustomersBulk`, `updateCustomersStatusBulk`.

### 2.2. Return Types
- Luôn sử dụng `@ObjectType` rõ ràng.
- Các API xóa/bulk action nên trả về `MessageResponse` `{ success: boolean, message: string }`.

```typescript
@Mutation(() => MessageResponse)
async deleteItem(@Args('id', { type: () => ID }) id: string) {
  return this.service.delete(id);
}
```

## 3. Data Validation (DTO/Zod)
Sử dụng Pydantic/Zod hoặc NestJS `ValidationPipe` để validate input trước khi vào database.

---
**Lưu ý**: Tuyệt đối không query database mà không có `companyId` trừ các service hệ thống (SuperAdmin).
## 4. Chuẩn mực Statistics & Dashboard Header
Mọi trang quản lý phải có API thống kê nhanh (Quick Stats) cho Header dựa trên tham số lọc.

```typescript
// Query Schema mẫu
@Query(() => StatisticsResponse)
async getStatistics(
  @Args('startDate', { nullable: true }) startDate: Date,
  @Args('endDate', { nullable: true }) endDate: Date,
  @Args('dateField', { defaultValue: 'createdAt' }) dateField: string,
) {
  // Always restrict by companyId
  return this.service.getStats(startDate, endDate, dateField);
}
```

- **Đặc trưng**: Trả về tổng số lượng, doanh số (nếu có) và phân phối theo trạng thái chính (`byStatus`).
- **Phản hồi**: Sử dụng GraphQL object mapping để trả về các cặp `count` và `status`.

## 5. Chuẩn mực Query & Mutation Response (UX Unified)
Mọi Mutation (Create, Update, Delete) PHẢI trả về một structure chuẩn bao gồm `success` và `message` bên cạnh data chính.

```typescript
@ObjectType()
export class BaseActionResult {
  @Field() success: boolean;
  @Field() message: string;
}
```

- Sử dụng `UpdateModelResponse` hoặc `DeleteModelResponse` mở rộng từ `BaseActionResult`.
- Đảm bảo Toast Notification ở Frontend luôn hiển thị đúng thông điệp Tiếng Việt từ Backend trả về.

---
**Keywords**: `Backend Gold Standard`, `Stat Queries`, `Pagination Real-time`, `CRUD Unified Response`.
