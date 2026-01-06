#!/bin/bash

# Configuration and colors
MODELS='["Branch", "Service", "ServiceGroup", "ServiceType", "Employee", "EmployeeGroup", "User", "CustomerSource", "Membership", "City", "District", "Ward", "DailyRevenue", "Customer", "DailyCustomer", "Appointment", "Treatment", "CrawlLog", "CustomerPayment", "CustomerInstallment", "CustomerComplaint", "CustomerTreatmentPlan", "CustomerServiceTab", "CustomerCareHistory", "MarketingTicketExtension", "MarketingTicketGroup", "PbxCallRecord", "PbxEmployee", "PbxExtension", "PbxSyncLog"]'
BACKUP_DIR="./backups"
PRISMA_DIR="./backend-api"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper for Prisma commands
run_prisma() {
    bun prisma "$@" --schema="$PRISMA_DIR/prisma/schema.prisma"
}

backup_json() {
    echo -e "\n${BLUE}📦 Loading Backup to JSON...${NC}"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
    CURRENT_BACKUP_DIR="$BACKUP_DIR/backup-$TIMESTAMP"
    mkdir -p "$CURRENT_BACKUP_DIR"

    cat <<EOF > temp_backup.js
const { PrismaClient } = require("./backend-api/node_modules/@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const models = $MODELS;
const outDir = "$CURRENT_BACKUP_DIR";

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

main().catch(console.error).finally(() => prisma.\$disconnect());
EOF

    bun temp_backup.js
    rm temp_backup.js
    echo -e "${GREEN}✅ Backup completed at: $CURRENT_BACKUP_DIR${NC}"
    read -p "Press Enter to return..."
}

restore_json() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}❌ No backups folder found.${NC}"
        read -p "Press Enter to return..."
        return
    fi

    BACKUPS=($(ls -d $BACKUP_DIR/backup-* 2>/dev/null | xargs -n 1 basename))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}❌ No backups found.${NC}"
        read -p "Press Enter to return..."
        return
    fi

    echo -e "\n${BLUE}📂 Available Backups:${NC}"
    for i in "${!BACKUPS[@]}"; do
        echo "$((i+1)). ${BACKUPS[$i]}"
    done

    echo -ne "\nSelect backup to restore (number): "
    read CHOICE
    IDX=$((CHOICE-1))

    if [ "$IDX" -lt 0 ] || [ "$IDX" -ge "${#BACKUPS[@]}" ]; then
        echo -e "${RED}❌ Invalid choice.${NC}"
        read -p "Press Enter to return..."
        return
    fi

    SELECTED_DIR="$BACKUP_DIR/${BACKUPS[$IDX]}"
    echo -e "\n${YELLOW}🚀 Restoring from: $SELECTED_DIR${NC}"

    cat <<EOF > temp_restore.js
const { PrismaClient } = require("./backend-api/node_modules/@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const models = $MODELS;
const inDir = "$SELECTED_DIR";

async function main() {
  for (const model of models) {
    const filePath = path.join(inDir, \`\${model}.json\`);
    if (!fs.existsSync(filePath)) continue;
    
    try {
      console.log(\`  Restoring \${model}...\`);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.length === 0) continue;

      const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
      
      try {
        await prisma[modelKey].deleteMany({});
      } catch (e) {}

      await prisma[modelKey].createMany({
        data: data,
        skipDuplicates: true,
      });
    } catch (e) {
      console.error(\`  Failed to restore \${model}: \`, e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.\$disconnect());
EOF

    bun temp_restore.js
    rm temp_restore.js
    echo -e "${GREEN}✅ Restore completed!${NC}"
    read -p "Press Enter to return..."
}

while true; do
    clear
    echo "============================================="
    echo -e "   ${BLUE}🛠️  VTTech Sync Consolidated Menu${NC}"
    echo "============================================="
    echo "1. Prisma Studio"
    echo "2. Prisma Backup JSON"
    echo "3. Prisma Restore JSON"
    echo "4. Prisma Reset Data"
    echo "5. Prisma DB Push & Generate"
    echo "6. Git Auto Commit (Today)"
    echo "7. [Next.js] VTTech Dashboard (Dev)"
    echo "8. [NestJS]  Backend API (Sync/Cron)"
    echo "9. 🚀 Chạy Full Stack (Dashboard + API)"
    echo "0. Exit"
    echo "============================================="
    echo -ne "Chọn option: "
    read OPT

    case $OPT in
        1)
            run_prisma studio
            ;;
        2)
            backup_json
            ;;
        3)
            restore_json
            ;;
        4)
            echo -e "${RED}\n⚠️  WARNING: This will delete data in the database!${NC}"
            read -p "Are you sure? (y/N): " CONFIRM
            if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
                run_prisma db push --force-reset
                run_prisma generate
            fi
            read -p "Press Enter to return..."
            ;;
        5)
            echo -e "\n${YELLOW}🚀 Running Prisma DB Push...${NC}"
            run_prisma db push
            run_prisma generate
            read -p "Press Enter to return..."
            ;;
        6)
            bash push_to_github.sh
            read -p "Press Enter to return..."
            ;;
        7)
            echo -e "\n${BLUE}🌐 Starting VTTech Dashboard...${NC}"
            (cd vttech-dashboard && bun dev)
            ;;
        8)
            echo -e "\n${BLUE}⚙️  Starting Backend API...${NC}"
            (cd backend-api && bun run start:dev)
            ;;
        9)
            echo -e "\n${BLUE}🚀 Starting Full Stack...${NC}"
            bunx concurrently "cd vttech-dashboard && bun dev" "cd backend-api && bun run start:dev"
            ;;
        0)
            echo "Bye! 👋"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option.${NC}"
            sleep 1
            ;;
    esac
done
