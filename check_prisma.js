const { PrismaClient } = require("@prisma/client");
try {
    const p = new PrismaClient({ url: "test" });
} catch (e) {
    console.log(e.message);
}
try {
    const p = new PrismaClient({ datasourceUrl: "test" });
} catch (e) {
    console.log(e.message);
}
try {
    const p = new PrismaClient({ datasources: { db: { url: "test" } } });
} catch (e) {
    console.log(e.message);
}
