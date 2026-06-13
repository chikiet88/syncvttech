"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('=== 🔎 CHI TIẾT TẤT CẢ CÁC TASK THẤT BẠI TRONG DB ===');
    const failedTasks = await prisma.syncTask.findMany({
        where: {
            status: 'FAILED'
        },
        orderBy: [
            { date: 'desc' },
            { branch_id: 'asc' }
        ]
    });
    console.log(`Tìm thấy tổng cộng ${failedTasks.length} task thất bại trong toàn bộ DB:`);
    const errorGroups = {};
    const dateGroups = {};
    const branchGroups = {};
    failedTasks.forEach(task => {
        const errorMsg = task.error_message || 'Không có thông báo lỗi';
        let simplifiedError = errorMsg;
        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
            simplifiedError = 'Timeout / Phản hồi chậm từ API VTTech';
        }
        else if (errorMsg.includes('status code 500')) {
            simplifiedError = 'Lỗi Server VTTech (Status Code 500)';
        }
        else if (errorMsg.includes('login') || errorMsg.includes('Login')) {
            simplifiedError = 'Lỗi đăng nhập / Sai tài khoản VTTech';
        }
        else if (errorMsg.includes('Circuit Breaker')) {
            simplifiedError = 'Circuit Breaker (Chặn đăng nhập tài khoản bị lỗi liên tục)';
        }
        else if (errorMsg.includes('Invalid Date')) {
            simplifiedError = 'Lỗi Invalid Date khi phân tích dữ liệu';
        }
        else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
            simplifiedError = 'Bị VTTech chặn / Rate Limit';
        }
        else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
            simplifiedError = 'Lỗi kết nối mạng (Network Error / DNS)';
        }
        else if (errorMsg.includes('LoadData after 3 attempts')) {
            simplifiedError = 'LoadData thất bại sau 3 lần thử';
        }
        errorGroups[simplifiedError] = (errorGroups[simplifiedError] || 0) + 1;
        const dateStr = task.date.toISOString().split('T')[0];
        dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
        const branchName = task.branch_name || `ID: ${task.branch_id}`;
        branchGroups[branchName] = (branchGroups[branchName] || 0) + 1;
    });
    console.log('\n=== 📊 THỐNG KÊ NHÓM LỖI ===');
    for (const [error, count] of Object.entries(errorGroups)) {
        console.log(`- ${error}: ${count} task`);
    }
    console.log('\n=== 📅 THỐNG KÊ LỖI THEO NGÀY (Top 15 ngày bị nhiều nhất) ===');
    const sortedDates = Object.entries(dateGroups).sort((a, b) => b[1] - a[1]);
    sortedDates.slice(0, 15).forEach(([date, count]) => {
        console.log(`- Ngày ${date}: ${count} task thất bại`);
    });
    console.log('\n=== 🏢 THỐNG KÊ LỖI THEO CHI NHÁNH ===');
    const sortedBranches = Object.entries(branchGroups).sort((a, b) => b[1] - a[1]);
    sortedBranches.forEach(([branch, count]) => {
        console.log(`- ${branch}: ${count} task thất bại`);
    });
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=check-sync-failures.js.map