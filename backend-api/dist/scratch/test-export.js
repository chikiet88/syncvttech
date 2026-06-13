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
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const excel_export_service_1 = require("../src/excel-export.service");
const fs = __importStar(require("fs"));
async function main() {
    console.log('Bootstrapping NestJS application context...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    console.log('Resolving ExcelExportService...');
    const exportService = app.get(excel_export_service_1.ExcelExportService);
    const dateStr = '2026-06-07';
    console.log(`Generating Excel file for appointments on ${dateStr}...`);
    const buffer = await exportService.exportAppointmentsToExcel(dateStr, dateStr);
    const outputPath = '/home/kata/Coding/apivttech/docs/yeucau/test_export_20260607.xlsx';
    console.log(`Saving Excel sheet to ${outputPath}...`);
    fs.writeFileSync(outputPath, buffer);
    console.log('Export successful! Closing context...');
    await app.close();
}
main().catch(err => {
    console.error('Test script failed:', err);
});
//# sourceMappingURL=test-export.js.map