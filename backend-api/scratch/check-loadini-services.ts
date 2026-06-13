import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  try {
    const result = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadIni', {});
    
    console.log('Keys in LoadIni Data:', Object.keys(result));
    
    // Check if Services key exists (case-sensitive)
    let servicesKey = 'Services';
    if (!result[servicesKey]) {
      servicesKey = Object.keys(result).find(k => k.toLowerCase() === 'services') || 'Services';
    }
    
    const services = result[servicesKey];
    if (Array.isArray(services)) {
      console.log(`\n=== Key: ${servicesKey} (Length: ${services.length}) ===`);
      if (services.length > 0) {
        console.log('Sample service:', JSON.stringify(services[0], null, 2));
        
        const keys = new Set<string>();
        services.forEach((s: any) => {
          Object.keys(s).forEach(k => keys.add(k));
        });
        console.log('All fields in services:', Array.from(keys));
        
        // Check if any services have a Group ID or category name
        console.log('First 5 services:');
        services.slice(0, 5).forEach((s: any) => {
          console.log(`ID: ${s.ID} | Name: ${s.Name} | Code: ${s.Code} | GroupID: ${s.GroupID || s.GroupID_ || s.GroupID1 || s.GroupID2} | Category: ${s.Category || s.CategoryID || s.ServiceCatID}`);
          console.log('Raw service object:', s);
        });
      }
    } else {
      console.log(`Key ${servicesKey} is not an array, type:`, typeof services);
    }
  } catch (e: any) {
    console.error('Failed to call LoadIni:', e.message);
  }

  await app.close();
}

main().catch(console.error);
