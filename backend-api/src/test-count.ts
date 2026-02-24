console.log(await (new (require('./backend-api/src/prisma.service').PrismaService)()).revenueTransaction.count())
