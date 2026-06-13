import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  const branches = await prisma.branch.findMany();
  console.log(`Checking ${branches.length} branches...`);

  for (const branch of branches) {
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: '2026-06-03',
      BranchID: branch.id.toString(),
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });

    const appointments = Array.isArray(res) ? res : [];
    if (appointments.length > 0) {
      console.log(`Branch ${branch.id} (${branch.name}): ${appointments.length} appointments`);
      const target = appointments.find((a: any) => String(a.Phone || a.Mobile || a.CustPhone).includes('383779095') || a.ID === 771337 || a.ScheduleID === 771337);
      if (target) {
        console.log('Target Appointment Details:', JSON.stringify(target, null, 2));
      }
    }
  }

  await app.close();
}

main().catch(console.error);
