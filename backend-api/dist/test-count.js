"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log(await (new (require('./backend-api/src/prisma.service').PrismaService)()).revenueTransaction.count());
//# sourceMappingURL=test-count.js.map