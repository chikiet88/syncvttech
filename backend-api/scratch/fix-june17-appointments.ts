import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import { ExcelExportService } from '../src/excel-export.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);
  const excelExportService = app.get(ExcelExportService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const targetDate = '2026-06-17';
  
  // Lấy tất cả các chi nhánh từ DB
  const branches = await prisma.branch.findMany({
    where: { is_active: 1 },
    select: { id: true, name: true }
  });

  console.log(`Starting scan and fix for appointments on ${targetDate} across ${branches.length} branches...`);
  
  let totalTuVan = 0;
  let totalRaVeTuVan = 0;
  let totalHuyTuVan = 0;
  let totalChuaDenTuVan = 0;

  const summaryByBranch: any[] = [];

  for (const branch of branches) {
    try {
      const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
        DateFrom: targetDate,
        BranchID: branch.id.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      });
      
      const rawAppointments = Array.isArray(res) ? res : [];
      
      // Lọc các cuộc hẹn Tư Vấn
      const tuVanItems = rawAppointments.filter((a: any) => 
        a.TypeName?.toLowerCase().includes('tư vấn') || 
        a.ServiceName?.toLowerCase().includes('tư vấn')
      );

      let branchRaVe = 0;
      let branchHuy = 0;
      let branchChuaDen = 0;

      for (const raw of tuVanItems) {
        const id = parseInt(raw.ID);
        if (!id) continue;

        let nextStatus = 1;
        let nextStatusName = 'Đặt Hẹn';

        const isCancel = parseInt(raw.IsCancel) > 0 || parseInt(raw.ReasonCancel) > 0 || parseInt(raw.State) === 0;
        const isRaVe = parseInt(raw.TypeStatusID) === 3;

        if (isCancel) {
          nextStatus = 3;
          nextStatusName = 'Đã Hủy';
          branchHuy++;
          totalHuyTuVan++;
        } else if (isRaVe) {
          nextStatus = 2;
          nextStatusName = 'Ra Về';
          branchRaVe++;
          totalRaVeTuVan++;
        } else {
          nextStatus = 1;
          nextStatusName = 'Đặt Hẹn';
          branchChuaDen++;
          totalChuaDenTuVan++;
        }

        totalTuVan++;

        // Cập nhật trực tiếp vào DB
        await prisma.appointment.updateMany({
          where: { id },
          data: {
            status: nextStatus,
            status_name: nextStatusName
          }
        });
      }

      if (tuVanItems.length > 0) {
        summaryByBranch.push({
          branchName: branch.name,
          total: tuVanItems.length,
          raVe: branchRaVe,
          huy: branchHuy,
          chuaDen: branchChuaDen
        });
      }

    } catch (e: any) {
      console.error(`Error processing branch ${branch.name} (ID: ${branch.id}): ${e.message}`);
    }
  }

  console.log('\n--- SCAN & UPDATE SUMMARY ---');
  console.log(`Total "Tư Vấn" appointments: ${totalTuVan}`);
  console.log(`Total "Ra Về" (TypeStatusID = 3): ${totalRaVeTuVan}`);
  console.log(`Total "Đã Hủy" (IsCancel/State = 0): ${totalHuyTuVan}`);
  console.log(`Total "Đặt Hẹn": ${totalChuaDenTuVan}`);

  console.log('\n--- DETAIL BY BRANCH ---');
  console.table(summaryByBranch);

  // Trigger push to Google Sheets
  console.log('\nPushing updated data to Google Sheets...');
  try {
    const result = await excelExportService.pushToGoogleSheet(targetDate, targetDate);
    console.log('\n--- GOOGLE SHEET PUSH SUCCESS ---');
    console.log(`Taza row count: ${result.tazaCount}`);
    console.log(`Timona row count: ${result.timonaCount}`);
    console.log(`URL: ${result.url}`);
  } catch (err: any) {
    console.error(`Failed to push to Google Sheets: ${err.message}`);
  }

  await app.close();
}

bootstrap().catch(console.error);
