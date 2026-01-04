import { spawn } from "child_process";
import * as readline from "node:readline/promises";
import fs from "fs";
import path from "path";

const MODELS = [
    "Branch", "Service", "ServiceGroup", "ServiceType", "Employee",
    "EmployeeGroup", "User", "CustomerSource", "Membership", "City",
    "District", "Ward", "DailyRevenue", "Customer", "DailyCustomer",
    "Appointment", "Treatment", "CrawlLog", "CustomerPayment",
    "CustomerInstallment", "CustomerComplaint", "CustomerTreatmentPlan",
    "CustomerServiceTab", "CustomerCareHistory", "MarketingTicketExtension",
    "MarketingTicketGroup"
];

const BACKUP_DIR = "./backups";

async function runCommand(command, args = []) {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { stdio: "inherit", shell: true });
        proc.on("close", (code) => resolve(code));
    });
}

async function backupJson() {
    console.log("\n📦 Starting Backup to JSON...");
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const currentBackupDir = path.join(BACKUP_DIR, `backup-${timestamp}`);
    fs.mkdirSync(currentBackupDir);

    // Since we might not have a working Prisma client for all models easily,
    // we can use a temporary script to dump data.
    // However, it's easier to just use bun's postgres if we had it, 
    // but let's try calling a small bun script that uses the generated client.

    const tempScript = `
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const models = ${JSON.stringify(MODELS)};
const outDir = "${currentBackupDir.replace(/\\/g, "/")}";

async function main() {
  for (const model of models) {
    try {
      console.log(\`  Backing up \${model}...\`);
      const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
      const data = await prisma[modelKey].findMany();
      fs.writeFileSync(path.join(outDir, \`\${model}.json\`), JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(\`  Failed to backup \${model}: \`, e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
`;

    const scriptPath = "temp_backup.js";
    fs.writeFileSync(scriptPath, tempScript);
    await runCommand("bun", [scriptPath]);
    fs.unlinkSync(scriptPath);

    console.log(`\n✅ Backup completed at: ${currentBackupDir}`);
}

async function restoreJson() {
    const backups = fs.readdirSync(BACKUP_DIR).filter(d => d.startsWith("backup-"));
    if (backups.length === 0) {
        console.log("❌ No backups found.");
        return;
    }

    console.log("\n📂 Available Backups:");
    backups.forEach((b, i) => console.log(`${i + 1}. ${b}`));

    process.stdout.write("\nSelect backup to restore (number): ");
    const input = await prompt();
    const choice = parseInt(input) - 1;

    if (choice < 0 || choice >= backups.length) {
        console.log("❌ Invalid choice.");
        return;
    }

    const selectedDir = path.join(BACKUP_DIR, backups[choice]);
    console.log(`\n🚀 Restoring from: ${selectedDir}`);

    const tempScript = `
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const models = ${JSON.stringify(MODELS)};
const inDir = "${selectedDir.replace(/\\/g, "/")}";

async function main() {
  for (const model of models) {
    const filePath = path.join(inDir, \`\${model}.json\`);
    if (!fs.existsSync(filePath)) continue;
    
    try {
      console.log(\`  Restoring \${model}...\`);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.length === 0) continue;

      const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
      await prisma[modelKey].createMany({
        data: data,
        skipDuplicates: true,
      });
    } catch (e) {
      console.error(\`  Failed to restore \${model}: \`, e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
`;

    const scriptPath = "temp_restore.js";
    fs.writeFileSync(scriptPath, tempScript);
    await runCommand("bun", [scriptPath]);
    fs.unlinkSync(scriptPath);

    console.log("\n✅ Restore completed!");
}

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function prompt() {
    try {
        return await rl.question("");
    } catch (e) {
        // If readline was closed, recreate it
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return await rl.question("");
    }
}

async function mainMenu() {
    while (true) {
        console.clear();
        console.log("========================================");
        console.log("   🛠️  VTTech Project Management Menu");
        console.log("========================================");
        console.log("1. Chạy python3 run.py");
        console.log("2. Prisma Studio");
        console.log("3. Prisma Backup JSON");
        console.log("4. Prisma Restore JSON");
        console.log("5. Prisma Reset Data");
        console.log("6. Git Auto Commit (Today)");
        console.log("0. Exit");
        console.log("========================================");
        process.stdout.write("Chọn option: ");

        const choice = await prompt();

        switch (choice) {
            case "1":
                await runCommand("python3", ["run.py"]);
                break;
            case "2":
                await runCommand("bun", ["prisma", "studio"]);
                break;
            case "3":
                await backupJson();
                console.log("\nPress Enter to return to menu...");
                await prompt();
                break;
            case "4":
                await restoreJson();
                console.log("\nPress Enter to return to menu...");
                await prompt();
                break;
            case "5":
                console.log("\n⚠️  WARNING: This will delete all data in the database!");
                process.stdout.write("Are you sure? (y/N): ");
                if ((await prompt()).toLowerCase() === "y") {
                    await runCommand("bun", ["prisma", "migrate", "reset", "--force"]);
                }
                console.log("\nPress Enter to return to menu...");
                await prompt();
                break;
            case "6":
                await runCommand("bash", ["push_to_github.sh"]);
                console.log("\nPress Enter to return to menu...");
                await prompt();
                break;
            case "0":
                process.exit(0);
            default:
                console.log("❌ Invalid option. Try again.");
                await new Promise(r => setTimeout(r, 1000));
        }
    }
}

mainMenu();
