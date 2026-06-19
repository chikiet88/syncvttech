import axios from 'axios';

const BASE_URL = 'https://apivttech.tazagroup.net';

// The remaining batches to sync
const BATCHES = [
  { from: '2018-04-01', to: '2018-07-01', forceMaster: false },
  { from: '2018-07-01', to: '2018-10-01', forceMaster: false },
  { from: '2018-10-01', to: '2019-01-02', forceMaster: false }
];

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/sync/status`);
    return response.data;
  } catch (error: any) {
    console.error(`[Runner] Error getting sync status: ${error.message}`);
    return null;
  }
}

async function startSync(from: string, to: string, forceMaster: boolean) {
  try {
    const url = `${BASE_URL}/sync?from=${from}&to=${to}&forceMaster=${forceMaster}&syncDetails=true`;
    console.log(`[Runner] Triggering sync: ${url}`);
    const response = await axios.get(url);
    console.log(`[Runner] Sync triggered response:`, response.data);
    return true;
  } catch (error: any) {
    console.error(`[Runner] Error triggering sync: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('==================================================');
  console.log('🚀 CRM SYNC SEQUENCE RUNNER STARTED (PRODUCTION API)');
  console.log('==================================================');

  let currentBatchIndex = 0;

  // Let's check status loop
  while (true) {
    const statusData = await getStatus();
    if (!statusData) {
      console.log('[Runner] Production server might be offline, retrying in 30s...');
      await delay(30000);
      continue;
    }

    const { isSyncing, progress, total, current, message } = statusData;

    console.log(`[${new Date().toLocaleTimeString()}] isSyncing: ${isSyncing} | Progress: ${current}/${total} (${progress}%) | Message: ${message || 'No message'}`);

    if (!isSyncing) {
      if (currentBatchIndex < BATCHES.length) {
        const nextBatch = BATCHES[currentBatchIndex];
        console.log(`\n[Runner] Current sync finished! Starting next batch (${currentBatchIndex + 1}/${BATCHES.length}): ${nextBatch.from} -> ${nextBatch.to}`);
        
        const success = await startSync(nextBatch.from, nextBatch.to, nextBatch.forceMaster);
        if (success) {
          currentBatchIndex++;
          // Give it a moment to start
          await delay(15000);
        } else {
          console.log('[Runner] Failed to start sync, retrying in 30s...');
          await delay(30000);
        }
      } else {
        console.log('\n==================================================');
        console.log('🎉 ALL BATCHES COMPLETED SUCCESSFULLY!');
        console.log('==================================================');
        break;
      }
    } else {
      // Check every 30 seconds
      await delay(30000);
    }
  }
}

main().catch(console.error);
