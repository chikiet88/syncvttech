import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const total = await prisma.customer.count();
  const withCrmCreated = await prisma.customer.count({
    where: { crm_created_at: { not: null } }
  });
  const sample = await prisma.customer.findFirst({
    where: { crm_created_at: { not: null } },
    select: { id: true, name: true, phone: true, crm_created_at: true }
  });

  console.log('--- DATABASE STATUS ---');
  console.log(`Total customers: ${total}`);
  console.log(`Customers with crm_created_at set: ${withCrmCreated}`);
  if (sample) {
    console.log(`Sample: ID=${sample.id}, Name=${sample.name}, Phone=${sample.phone}, CRM Created=${sample.crm_created_at}`);
  }
  console.log('-----------------------');

  await app.close();
}

main().catch(console.error);
