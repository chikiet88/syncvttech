/**
 * BÁO CÁO TỔNG HỢP & CHI TIẾT LỊCH HẸN THÁNG 4/2026
 * Xuất file Excel gồm 2 sheet:
 *   Sheet 1: TỔNG HỢP TRẠNG THÁI theo Chi nhánh (đầy đủ các trạng thái từ 1 đến 7)
 *   Sheet 2: CHI TIẾT LỊCH HẸN (tất cả lịch hẹn, có phân loại lịch Đã đến hợp lệ)
 */

import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';

const prisma = new PrismaClient();

const STATUS_MAP: Record<number, string> = {
  0: 'Đã lên lịch',
  1: 'Đã xác nhận',
  2: 'Đã đến',
  3: 'Đã hủy',
  4: 'Ra về',
  5: 'Trên phòng',
  6: 'Chuyển bác sĩ',
  7: 'Đang tư vấn',
};

const EXCLUDED_BRANCH_IDS = [7, 24]; // Văn Phòng, Hderma
const TARGET_STATUSES = [2, 4, 5, 6, 7];
const DATE_FROM = new Date('2026-04-01T00:00:00');
const DATE_TO = new Date('2026-04-30T23:59:59.999');

async function main() {
  console.log('📊 Bắt đầu xuất báo cáo Excel nâng cao...');

  // ===== 1. LẤY TẤT CẢ LỊCH HẸN TRONG THÁNG 4/2026 =====
  const appointments = await prisma.appointment.findMany({
    where: {
      appointment_date: { gte: DATE_FROM, lte: DATE_TO },
      branch_id: { notIn: EXCLUDED_BRANCH_IDS },
    },
    orderBy: [{ branch_id: 'asc' }, { appointment_date: 'asc' }],
  });

  console.log(`  📥 Tổng lịch hẹn tìm được trong DB: ${appointments.length}`);

  // ===== 2. LẤY GIAO DỊCH CỌC ONLINE (type=4, payment_method=5) CÙNG NGÀY =====
  // Lấy tất cả giao dịch cọc online trong tháng 4/2026
  const onlineDeposits = await prisma.$queryRaw<{ customer_id: number; date: Date }[]>`
    SELECT DISTINCT customer_id, date::date as date 
    FROM revenue_transactions 
    WHERE date >= ${DATE_FROM} AND date <= ${DATE_TO}
      AND type = 4 AND payment_method = 5
  `;

  const onlineDepositSet = new Set<string>();
  for (const dep of onlineDeposits) {
    if (dep.customer_id && dep.date) {
      const dateStr = new Date(dep.date).toISOString().split('T')[0];
      onlineDepositSet.add(`${dep.customer_id}_${dateStr}`);
    }
  }

  // Phân loại lịch hẹn
  const processedAppts = appointments.map(appt => {
    const isTargetStatus = TARGET_STATUSES.includes(appt.status);
    let isIncluded = false;
    let excludeReason = '';

    if (!isTargetStatus) {
      excludeReason = `Trạng thái ${STATUS_MAP[appt.status] || appt.status}`;
    } else if (appt.customer_id && appt.appointment_date) {
      const apptDateStr = appt.appointment_date.toISOString().split('T')[0];
      const hasOnlineDeposit = onlineDepositSet.has(`${appt.customer_id}_${apptDateStr}`);
      if (hasOnlineDeposit) {
        excludeReason = 'Có cọc online cùng ngày';
      } else {
        isIncluded = true;
      }
    } else {
      isIncluded = true;
    }

    return {
      ...appt,
      isIncluded,
      excludeReason,
    };
  });

  const totalIncluded = processedAppts.filter(a => a.isIncluded).length;
  console.log(`  🔻 Số lịch hẹn thỏa mãn chỉ số Đã đến: ${totalIncluded}/${appointments.length}`);

  // ===== 3. LẤY TÊN CHI NHÁNH =====
  const branches = await prisma.branch.findMany({
    where: { id: { notIn: EXCLUDED_BRANCH_IDS } },
    orderBy: { id: 'asc' },
  });
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  // ===== 4. TẠO WORKBOOK EXCEL =====
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Taza Report System';
  workbook.created = new Date();

  // ----------- SHEET 1: TỔNG HỢP TRẠNG THÁI -----------
  const summarySheet = workbook.addWorksheet('TỔNG HỢP TRẠNG THÁI', {
    properties: { tabColor: { argb: '4472C4' } },
  });

  // Title
  summarySheet.mergeCells('A1:K1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BÁO CÁO TỔNG HỢP TRẠNG THÁI LỊCH HẸN - THÁNG 4/2026';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '1F4E79' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 40;

  // Subtitle
  summarySheet.mergeCells('A2:K2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = `Các chi nhánh Taza + Timona | Thống kê đầy đủ trạng thái lịch hẹn | Cột màu cam biểu thị Nhóm Đã Đến (Chỉ số chính)`;
  subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '666666' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 22;

  // Date info
  summarySheet.mergeCells('A3:K3');
  const dateCell = summarySheet.getCell('A3');
  dateCell.value = `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`;
  dateCell.font = { name: 'Arial', size: 9, color: { argb: '999999' } };
  dateCell.alignment = { horizontal: 'right' };

  // Header row
  const summaryHeaders = [
    'STT', 'Chi nhánh', 
    'Đã xác nhận (1)', 'Đã đến (2)', 'Đã hủy (3)', 
    'Ra về (4)', 'Trên phòng (5)', 'Chuyển BS (6)', 'Đang tư vấn (7)',
    'TỔNG ĐÃ ĐẾN (2,4,5,6,7)', 'TỔNG LỊCH HẸN'
  ];
  const headerRow = summarySheet.addRow(summaryHeaders);
  headerRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    
    // Highlight "TỔNG ĐÃ ĐẾN" column with dark orange, others with dark blue
    if (colNum === 10) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D15B19' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    }
    
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  summarySheet.getRow(4).height = 35;

  // Aggregate data per branch
  interface BranchStat {
    name: string;
    s1: number; s2: number; s3: number; s4: number; s5: number; s6: number; s7: number;
    targetTotal: number;
    total: number;
  }
  const branchStats = new Map<number, BranchStat>();

  // Khởi tạo tất cả chi nhánh để đảm bảo hiển thị đầy đủ, kể cả chi nhánh không có lịch hẹn
  for (const b of branches) {
    branchStats.set(b.id, {
      name: b.name,
      s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0,
      targetTotal: 0,
      total: 0,
    });
  }

  for (const a of processedAppts) {
    if (!a.branch_id || !branchStats.has(a.branch_id)) continue;
    const stats = branchStats.get(a.branch_id)!;
    
    // Đếm tổng thể trạng thái
    if (a.status === 1) stats.s1++;
    else if (a.status === 2) stats.s2++;
    else if (a.status === 3) stats.s3++;
    else if (a.status === 4) stats.s4++;
    else if (a.status === 5) stats.s5++;
    else if (a.status === 6) stats.s6++;
    else if (a.status === 7) stats.s7++;

    if (a.isIncluded) {
      stats.targetTotal++;
    }
    stats.total++;
  }

  // Data rows
  let stt = 1;
  let grandTotal = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0, targetTotal: 0, total: 0 };
  const sortedBranches = [...branchStats.entries()].sort((a, b) => b[1].total - a[1].total);

  for (const [, stats] of sortedBranches) {
    const row = summarySheet.addRow([
      stt, 
      stats.name, 
      stats.s1, stats.s2, stats.s3, stats.s4, stats.s5, stats.s6, stats.s7,
      stats.targetTotal, 
      stats.total
    ]);
    
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: colNum <= 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
        left: { style: 'thin', color: { argb: 'D9D9D9' } },
        right: { style: 'thin', color: { argb: 'D9D9D9' } },
      };
      
      // Highlight row background
      if (stt % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FB' } };
      }

      // Highlight target total column specifically
      if (colNum === 10) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'C55A11' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } };
      }
    });

    grandTotal.s1 += stats.s1;
    grandTotal.s2 += stats.s2;
    grandTotal.s3 += stats.s3;
    grandTotal.s4 += stats.s4;
    grandTotal.s5 += stats.s5;
    grandTotal.s6 += stats.s6;
    grandTotal.s7 += stats.s7;
    grandTotal.targetTotal += stats.targetTotal;
    grandTotal.total += stats.total;
    stt++;
  }

  // Total row
  const totalRow = summarySheet.addRow([
    '', 'TỔNG CỘNG', 
    grandTotal.s1, grandTotal.s2, grandTotal.s3, grandTotal.s4, grandTotal.s5, grandTotal.s6, grandTotal.s7,
    grandTotal.targetTotal, grandTotal.total,
  ]);
  totalRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    if (colNum === 10) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C55A11' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  // Column widths
  summarySheet.columns = [
    { width: 6 }, { width: 32 }, 
    { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 15 },
    { width: 22 }, { width: 15 },
  ];

  // ----------- SHEET 2: CHI TIẾT LỊCH HẸN -----------
  const detailSheet = workbook.addWorksheet('CHI TIẾT LỊCH HẸN', {
    properties: { tabColor: { argb: '70AD47' } },
  });

  // Title
  detailSheet.mergeCells('A1:J1');
  const detailTitle = detailSheet.getCell('A1');
  detailTitle.value = 'DANH SÁCH CHI TIẾT TẤT CẢ LỊCH HẸN - THÁNG 4/2026';
  detailTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: '375623' } };
  detailTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  detailSheet.getRow(1).height = 35;

  // Subtitle
  detailSheet.mergeCells('A2:J2');
  const detailSub = detailSheet.getCell('A2');
  detailSub.value = `Tổng cộng: ${processedAppts.length} lịch hẹn | Thỏa mãn Đã đến: ${totalIncluded} lịch | Loại trừ khác: ${processedAppts.length - totalIncluded} lịch`;
  detailSub.font = { name: 'Arial', size: 10, italic: true, color: { argb: '666666' } };
  detailSub.alignment = { horizontal: 'center' };

  // Headers
  const detailHeaders = [
    'STT', 'Ngày hẹn', 'Giờ hẹn', 'Khách hàng', 'SĐT',
    'Chi nhánh', 'Loại dịch vụ', 'Trạng thái', 'Tính vào Đã đến?', 'Ghi chú / Lý do loại trừ'
  ];
  const detailHeaderRow = detailSheet.addRow(detailHeaders);
  detailHeaderRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  detailSheet.getRow(3).height = 30;

  // Data rows
  let detailStt = 1;
  for (const a of processedAppts) {
    const date = a.appointment_date ? new Date(a.appointment_date) : null;
    const dateStr = date ? date.toLocaleDateString('vi-VN') : '';
    const timeStr = date ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
    const statusLabel = STATUS_MAP[a.status] || `Trạng thái #${a.status}`;
    const branchName = a.branch_name || branchMap.get(a.branch_id || 0) || '';

    const row = detailSheet.addRow([
      detailStt,
      dateStr,
      timeStr,
      a.customer_name || 'Khách lẻ',
      a.phone || '',
      branchName,
      a.service_name || 'Tổng quát',
      statusLabel,
      a.isIncluded ? 'CÓ' : 'KHÔNG',
      a.isIncluded ? (a.note || '') : `Loại do: ${a.excludeReason}. ${a.note || ''}`,
    ]);

    // Format "Tính vào Đã đến?" column
    const checkCell = row.getCell(9);
    if (a.isIncluded) {
      checkCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '375623' } };
      checkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } }; // Green background
    } else {
      checkCell.font = { name: 'Arial', size: 9, color: { argb: '7F7F7F' } };
      checkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }; // Light gray background
    }

    // Status color coding for Column 8
    const statusCell = row.getCell(8);
    const statusColors: Record<number, string> = {
      1: 'DDEBF7', // xanh dương nhạt - Đã xác nhận
      2: 'C9DAF8', // xanh dương vừa - Đã đến
      3: 'FCE4D6', // cam nhạt - Đã hủy
      4: 'E2EFDA', // xanh lá nhạt - Ra về
      5: 'FFF2CC', // vàng nhạt - Trên phòng
      6: 'F8CBAD', // cam - Chuyển BS
      7: 'E4DFEC', // tím nhạt - Đang tư vấn
    };
    statusCell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: statusColors[a.status] || 'FFFFFF' },
    };

    row.eachCell((cell, colNum) => {
      cell.font = cell.font || { name: 'Arial', size: 9 };
      cell.alignment = {
        horizontal: [1, 2, 3, 9].includes(colNum) ? 'center' : 'left',
        vertical: 'middle',
        wrapText: colNum === 10,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      };
      
      if (detailStt % 2 === 0 && colNum !== 8 && colNum !== 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAFA' } };
      }
    });
    detailStt++;
  }

  // Column widths
  detailSheet.columns = [
    { width: 6 }, { width: 14 }, { width: 10 }, { width: 28 }, { width: 15 },
    { width: 30 }, { width: 14 }, { width: 16 }, { width: 18 }, { width: 50 },
  ];

  // Auto filter
  detailSheet.autoFilter = { from: 'A3', to: 'J3' };

  // Freeze header
  detailSheet.views = [{ state: 'frozen', ySplit: 3 }];
  summarySheet.views = [{ state: 'frozen', ySplit: 4 }];

  // ===== 5. LƯU FILE =====
  const outputPath = path.resolve(__dirname, '../../docs/report/BaoCao_LichHen_Thang4_2026.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`\n✅ Cập nhật file thành công: ${outputPath}`);
  console.log(`   📋 Sheet 1: TỔNG HỢP TRẠNG THÁI (${sortedBranches.length} chi nhánh)`);
  console.log(`   📋 Sheet 2: CHI TIẾT LỊCH HẸN (${processedAppts.length} dòng)`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌ Lỗi:', e); prisma.$disconnect(); });
