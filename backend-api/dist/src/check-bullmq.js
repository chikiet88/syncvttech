"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
async function main() {
    const connection = new ioredis_1.default({
        host: 'localhost',
        port: 12004,
    });
    const queue = new bullmq_1.Queue('sync-queue', { connection });
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    console.log('BullMQ Stats:');
    console.log(`Waiting: ${waiting.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Completed: ${completed.length}`);
    console.log(`Failed: ${failed.length}`);
    if (waiting.length > 0) {
        console.log('Sample waiting job:', waiting[0].id, waiting[0].data.type);
    }
    await connection.quit();
}
main().catch(console.error);
//# sourceMappingURL=check-bullmq.js.map