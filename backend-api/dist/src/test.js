"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const vttech_api_service_1 = require("./vttech-api.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    vttechApi.setLogCallback(msg => console.log(msg));
    try {
        const customerId = 125349;
        console.log("Testing MainCustomer LoadPaymentInfo...");
        const payInfo = await vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
        console.log("PayInfo:", payInfo);
    }
    catch (e) {
        console.error("Error:", e);
    }
    await app.close();
}
bootstrap();
//# sourceMappingURL=test.js.map