import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  const sessions = (vttechApi as any).sessions;
  const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
  
  console.log(`Checking ${sessions.length} accounts against ${branches.length} branches...`);

  const targetDate = '2026-06-20';

  for (const s of sessions) {
    console.log(`\n==================================================`);
    console.log(`👤 ACCOUNT: ${s.username}`);
    console.log(`==================================================`);
    
    // Login
    try {
      const loggedIn = await vttechApi.login(s);
      if (!loggedIn) {
        console.log(`❌ Login failed`);
        continue;
      }
    } catch (e: any) {
      console.log(`💥 Login failed: ${e.message}`);
      continue;
    }

    const allowedBranchIds: number[] = [];
    const deniedBranchIds: number[] = [];

    for (const b of branches) {
      try {
        const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
          DateFrom: targetDate,
          BranchID: b.id.toString(),
          AppID: '0',
          StatusID: '0',
          DoctorID: '0',
          TypeApp: '1',
        }, s.username);
        
        if (res === null) {
          deniedBranchIds.push(b.id);
        } else {
          allowedBranchIds.push(b.id);
        }
      } catch (err) {
        deniedBranchIds.push(b.id);
      }
    }

    console.log(`✅ Allowed Branch IDs (${allowedBranchIds.length}):`, allowedBranchIds);
    console.log(`❌ Denied/Null Branch IDs (${deniedBranchIds.length}):`, deniedBranchIds);
    if (deniedBranchIds.length > 0) {
      const deniedNames = branches.filter(b => deniedBranchIds.includes(b.id)).map(b => b.name);
      console.log(`   Denied Branch Names:`, deniedNames);
    }
  }

  await app.close();
}

main().catch(console.error);
