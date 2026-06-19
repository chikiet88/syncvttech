/**
 * Export thông tin khách hàng tạo từ 01/01/2019 - 31/12/2022
 * Sắp xếp theo ngày tạo (crm_created_at) tăng dần
 * Xuất ra file CSV tại docs/report/
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function genderLabel(gender: number | null): string {
  switch (gender) {
    case 1: return 'Nam';
    case 2: return 'Nữ';
    default: return '';
  }
}

async function main() {
  console.log('🔄 Đang truy vấn dữ liệu khách hàng...');

  const startDate = new Date('2019-01-01T00:00:00.000Z');
  const endDate = new Date('2023-01-01T00:00:00.000Z');

  // Query with batch to avoid memory issues
  const BATCH_SIZE = 10000;
  let offset = 0;
  let totalExported = 0;

  const headers = [
    'STT',
    'Mã KH (ID)',
    'Mã KH',
    'Tên khách hàng',
    'Số điện thoại',
    'Email',
    'Giới tính',
    'Ngày sinh',
    'Địa chỉ',
    'Tỉnh/Thành phố',
    'Quận/Huyện',
    'Phường/Xã',
    'Chi nhánh',
    'Nguồn khách hàng',
    'Hạng thành viên',
    'Tổng chi tiêu',
    'Tổng công nợ',
    'Điểm tích lũy',
    'Trạng thái',
    'Ngày tạo CRM',
  ];

  const outputPath = path.resolve(__dirname, '../../docs/report/ThongTin_KhachHang_2019-2022.csv');

  // Add BOM for Excel UTF-8 compatibility
  fs.writeFileSync(outputPath, '\uFEFF' + headers.join(',') + '\n', 'utf-8');

  console.log(`📁 File xuất: ${outputPath}`);

  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        crm_created_at: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        branch: { select: { name: true } },
        source: { select: { name: true } },
        membership: { select: { name: true } },
      },
      orderBy: { crm_created_at: 'asc' },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (customers.length === 0) break;

    // Collect city/district/ward IDs for batch lookup
    const cityIds = [...new Set(customers.map(c => c.city_id).filter(Boolean))] as number[];
    const districtIds = [...new Set(customers.map(c => c.district_id).filter(Boolean))] as number[];
    const wardIds = [...new Set(customers.map(c => c.ward_id).filter(Boolean))] as number[];

    const [cities, districts, wards] = await Promise.all([
      cityIds.length > 0
        ? prisma.city.findMany({ where: { id: { in: cityIds } } })
        : Promise.resolve([]),
      districtIds.length > 0
        ? prisma.district.findMany({ where: { id: { in: districtIds } } })
        : Promise.resolve([]),
      wardIds.length > 0
        ? prisma.ward.findMany({ where: { id: { in: wardIds } } })
        : Promise.resolve([]),
    ]);

    const cityMap = new Map(cities.map(c => [c.id, c.name]));
    const districtMap = new Map(districts.map(d => [d.id, d.name]));
    const wardMap = new Map(wards.map(w => [w.id, w.name]));

    const rows = customers.map((c, idx) => {
      const rowNum = totalExported + idx + 1;
      return [
        rowNum,
        c.id,
        escapeCSV(c.code),
        escapeCSV(c.name),
        escapeCSV(c.phone),
        escapeCSV(c.email),
        genderLabel(c.gender),
        formatDate(c.birthday),
        escapeCSV(c.address),
        escapeCSV(c.city_id ? cityMap.get(c.city_id) || '' : ''),
        escapeCSV(c.district_id ? districtMap.get(c.district_id) || '' : ''),
        escapeCSV(c.ward_id ? wardMap.get(c.ward_id) || '' : ''),
        escapeCSV(c.branch?.name || ''),
        escapeCSV(c.source?.name || ''),
        escapeCSV(c.membership?.name || ''),
        c.total_spent || 0,
        c.total_debt || 0,
        c.point || 0,
        c.is_active === 1 ? 'Hoạt động' : 'Không hoạt động',
        formatDateTime(c.crm_created_at),
      ].join(',');
    });

    fs.appendFileSync(outputPath, rows.join('\n') + '\n', 'utf-8');

    totalExported += customers.length;
    console.log(`  ✅ Đã xuất ${totalExported} khách hàng...`);

    if (customers.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`\n🎉 Hoàn tất! Tổng cộng ${totalExported} khách hàng đã được xuất.`);
  console.log(`📄 File: ${outputPath}`);

  // Print summary by year
  const summary = await prisma.$queryRaw<{ year: string; total: string }[]>`
    SELECT EXTRACT(YEAR FROM crm_created_at)::text as year, 
           CAST(COUNT(*) AS TEXT) as total
    FROM customers 
    WHERE crm_created_at >= '2019-01-01' AND crm_created_at < '2023-01-01'
    GROUP BY EXTRACT(YEAR FROM crm_created_at) 
    ORDER BY year
  `;

  console.log('\n📊 Phân bố theo năm:');
  summary.forEach(s => console.log(`   ${s.year}: ${Number(s.total).toLocaleString('vi-VN')} khách hàng`));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Lỗi:', e);
  await prisma.$disconnect();
  process.exit(1);
});
