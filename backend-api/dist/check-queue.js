"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
async function checkQueue() {
    const queue = new bullmq_1.Queue('sync-queue', {
        connection: {
            host: 'localhost',
            port: 12004,
        }
    });
    try {
        const counts = await queue.getJobCounts();
        console.log('Queue stats:', counts);
        const failed = await queue.getFailed(0, 10);
        console.log('\n--- Recent Failed Jobs ---');
        failed.forEach(job => {
            console.log(`Job ID: ${job.id}, Type: ${job.data?.type}`);
            console.log(`Error: ${job.failedReason}`);
            console.log(`Data: ${JSON.stringify(job.data?.data)}`);
            console.log('---');
        });
        const completed = await queue.getCompleted(0, 5);
        console.log('\n--- Recent Completed Jobs ---');
        completed.forEach(job => {
            console.log(`Job ID: ${job.id}, Type: ${job.data?.type}, Date: ${job.data?.data?.date}, Branch: ${job.data?.data?.branchId}`);
        });
    }
    catch (e) {
        console.log('Error:', e);
    }
}
checkQueue();
//# sourceMappingURL=check-queue.js.map