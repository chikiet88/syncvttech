"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../.env') });
const connection = {
    host: process.env.REDIS_HOST || '100.111.97.70',
    port: parseInt(process.env.REDIS_PORT || '12004'),
    password: process.env.REDIS_PASSWORD || undefined,
};
async function main() {
    console.log(`Connecting to Redis directly at ${connection.host}:${connection.port}...`);
    const redis = new ioredis_1.default(connection);
    try {
        const keys = await redis.keys('*');
        console.log(`Total keys in Redis: ${keys.length}`);
        console.log('Sample keys (up to 30):');
        for (const key of keys.slice(0, 30)) {
            const type = await redis.type(key);
            console.log(`- ${key} (${type})`);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        redis.disconnect();
    }
}
main();
//# sourceMappingURL=inspect-redis-bullmq.js.map