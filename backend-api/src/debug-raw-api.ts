
import axios from 'axios';

async function checkRaw() {
    const baseUrl = 'http://localhost:21101';
    // 1. Login
    await axios.get(`${baseUrl}/check-login`);
    
    // 2. Trigger sync
    console.log("Triggering sync...");
    await axios.get(`${baseUrl}/sync?from=2026-04-21&to=2026-04-21&syncDetails=1`);
    
    // Wait for it to finish
    console.log("Waiting 30s...");
    await new Promise(r => setTimeout(r, 30000));
    console.log("Done.");
    
    console.log(`Total items: ${items.length}`);
    const branch2 = items.filter(i => i.BranchID == "2" || i.Branch == "2");
    console.log(`Branch 2 items: ${branch2.length}`);
    
    branch2.forEach(item => {
        console.log('---');
        console.log(`Cust: ${item.CustomerName} | Price: ${item.PriceDiscounted} | Paid: ${item.Paid} | Type: ${item.Type} | Doc: ${item.DocCode}`);
        // In toàn bộ keys để tìm trường lạ
        // console.log(JSON.stringify(item));
    });
}

checkRaw().catch(console.error);
