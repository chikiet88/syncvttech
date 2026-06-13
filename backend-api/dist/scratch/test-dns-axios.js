"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function main() {
    console.log('Testing axios request to VTTech...');
    const start = Date.now();
    try {
        const res = await axios_1.default.get('https://tmtaza.vttechsolution.com/Login/Login', {
            timeout: 10000,
        });
        console.log(`Success in ${Date.now() - start}ms! Status: ${res.status}`);
    }
    catch (err) {
        console.error(`Failed after ${Date.now() - start}ms:`, err.message);
    }
}
main();
//# sourceMappingURL=test-dns-axios.js.map