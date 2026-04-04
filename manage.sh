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

# Catch Ctrl+C and exit cleanly instead of looping back to the menu
trap "echo -e '\n${GREEN}Đã thoát! 👋${NC}'; exit 0" SIGINT SIGTERM

# Helper for Prisma commands
run_prisma() {
    if [ ! -f "$PRISMA_DIR/prisma/schema.prisma" ]; then
        echo -e "${RED}❌ Error: file $PRISMA_DIR/prisma/schema.prisma not found. Check your sync!${NC}"
        return 1
    fi

    if [ ! -d "$PRISMA_DIR/node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules is missing. Running bun install...${NC}"
        (cd "$PRISMA_DIR" && bun install)
    fi

    local DB_URL=""
    if ! getent hosts tazagroupnet-db &> /dev/null; then
        DB_URL="postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    fi

    if [ -n "$DB_URL" ]; then
        (cd "$PRISMA_DIR" && export DATABASE_URL="$DB_URL" && bunx prisma@6 "$@")
    else
        (cd "$PRISMA_DIR" && bunx prisma@6 "$@")
    fi
}

backup_json() {
    echo -e "\n${BLUE}📦 Loading Backup to JSON...${NC}"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
    ABS_BACKUP_DIR=$(realpath "$BACKUP_DIR")
    CURRENT_BACKUP_DIR="$ABS_BACKUP_DIR/backup-$TIMESTAMP"
    mkdir -p "$CURRENT_BACKUP_DIR"

    cat <<EOF > temp_backup.js
const { PrismaClient } = require("@prisma/client");
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

    (cd "$PRISMA_DIR" && bun ../temp_backup.js)
    rm temp_backup.js
    echo -e "${GREEN}✅ Backup completed at: $ABS_BACKUP_DIR/backup-$TIMESTAMP${NC}"
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

    SELECTED_DIR=$(realpath "$BACKUP_DIR/${BACKUPS[$IDX]}")
    echo -e "\n${YELLOW}🚀 Restoring from: $SELECTED_DIR${NC}"

    cat <<EOF > temp_restore.js
const { PrismaClient } = require("@prisma/client");
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

    (cd "$PRISMA_DIR" && bun ../temp_restore.js)
    rm temp_restore.js
    echo -e "${GREEN}✅ Restore completed!${NC}"
}

clear_ports() {
    echo -e "\n${RED}💀 Killing processes on ports 5000, 5001, 21100, 21101...${NC}"
    for port in 5000 5001 21100 21101; do
        PID=$(lsof -t -iTCP:$port -sTCP:LISTEN)
        if [ -n "$PID" ]; then
            echo -e "${YELLOW}  Stopping process on port $port (PID: $PID)...${NC}"
            kill -9 $PID 2>/dev/null
        else
            echo -e "  Port $port is already free."
        fi
    done
    echo -e "${GREEN}✅ Check completed.${NC}"
}

kill_ports() {
    clear_ports
    read -p "Press Enter to return..."
}

sync_remote() {
    echo -e "\n${BLUE}📤 Syncing files to 14binhloi-100.111.97.70...${NC}"
    # Using rsync to copy the entire project directory to the remote server
    # Excluding bulky directories: node_modules, .git, .next, dist, .agent
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.next' \
        --exclude '.agent' \
        --exclude 'dist' \
        ./ 14binhloi-100.111.97.70:apivttech
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sync completed successfully!${NC}"
    else
        echo -e "${RED}❌ Sync failed. Check your SSH connection or rsync logs.${NC}"
    fi
}

# Check if argument is passed, if not show menu
if [ -n "$1" ]; then
    OPT=$1
    echo -e "${BLUE}🚀 Running option: $OPT${NC}"
else
    while true; do
        clear
        echo "============================================="
        echo -e "   ${BLUE}🛠️  VTTech Sync Consolidated Menu${NC}"
        echo "============================================="
        echo "1. Prisma Studio (Port 21103)"
        echo "2. Prisma Backup JSON"
        echo "3. Prisma Restore JSON"
        echo "4. Prisma Reset Data"
        echo "5. Prisma DB Push & Generate"
        echo "6. Git Auto Commit (Today)"
        echo "7. [Host] VTTech Dashboard (Port 5000)"
        echo "8. [Host] Backend API (Port 5001)"
        echo "9. 🚀 Full Stack + Sync (Auto Restart)"
        echo "10. 🐳 DOCKER: Start All (Port 21100 & 21101)"
        echo "11. 🐳 DOCKER: Stop All"
        echo "12. 🐳 DOCKER: View Logs"
        echo "13. 💀 Kill Ports (5000, 5001, 21100, 21101)"
        echo "14. 📤 SYNC: Copy Project to Remote Server"
        echo "0. Exit"
        echo "============================================="
        echo -ne "Chọn option: "
        if ! read OPT; then
            echo -e "\nĐã thoát! 👋"
            exit 0
        fi
        
        # Break inner loop then execute option, or stay in loop for menu
        if [[ "$OPT" == "0" ]]; then
            echo "Bye! 👋"
            exit 0
        fi
        
        # Special handling for menu options that keep running
        # We handle the case selection below
        break
    done
fi

case $OPT in
        1)
            run_prisma studio
            ;;
        2)
            backup_json
            read -p "Press Enter to return..."
            ;;
        3)
            restore_json
            read -p "Press Enter to return..."
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
            clear_ports
            echo -e "\n${BLUE}🌐 Starting VTTech Dashboard on Port 5000...${NC}"
            if ! getent hosts tazagroupnet-db &> /dev/null; then
                (cd vttech-dashboard && rm -rf .next && export DATABASE_URL="postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync" && export PORT=5000 && bun dev)
            else
                (cd vttech-dashboard && rm -rf .next && export PORT=5000 && bun dev)
            fi
            ;;
        8)
            clear_ports
            echo -e "\n${BLUE}⚙️  Starting Backend API on Port 5001...${NC}"
            if ! getent hosts tazagroupnet-db &> /dev/null; then
                (cd backend-api && export DATABASE_URL="postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync" && export PORT=5001 && bun run start:dev)
            else
                (cd backend-api && export PORT=5001 && bun run start:dev)
            fi
            ;;
        9)
            clear_ports
            echo -e "\n${BLUE}🚀 Starting Full Stack with Sync...${NC}"
            
            # Sync once before starting
            sync_remote
            
            DB_FALLBACK_VAL=""
            if ! getent hosts tazagroupnet-db &> /dev/null; then
                DB_FALLBACK_VAL="postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
            fi
            
            # Use npx concurrently for stability, and export environment variables
            # Also keep it in a loop if it crashes, but concurrently usually handles its children
            npx concurrently \
                --names "FRONTEND,BACKEND" \
                --prefix-colors "blue,green" \
                "cd vttech-dashboard && rm -rf .next && export DATABASE_URL=\"$DB_FALLBACK_VAL\" && export PORT=5000 && bun dev" \
                "cd backend-api && export DATABASE_URL=\"$DB_FALLBACK_VAL\" && export PORT=5001 && export NODE_ENV=development && bun run start:dev"
            ;;
        10)
            echo -e "\n${BLUE}🐳 Starting Docker Containers (24/7)...${NC}"
            docker compose up -d --build
            echo -e "${GREEN}✅ Services started on ports 21101 (API) and 21100 (Dashboard)${NC}"
            read -p "Press Enter to return..."
            ;;
        11)
            echo -e "\n${YELLOW}🐳 Stopping Docker Containers...${NC}"
            docker compose down
            read -p "Press Enter to return..."
            ;;
        12)
            docker compose logs -f
            ;;
        13)
            kill_ports
            ;;
        14)
            sync_remote
            read -p "Press Enter to return..."
            ;;
        0)
            echo "Bye! 👋"
            exit 0
            ;;
    *)
        echo -e "${RED}❌ Invalid option: $OPT${NC}"
        [ -z "$1" ] && sleep 1
        ;;
esac

# If we were in menu mode (no $1), we might want to restart the script to keep showing menu
# but for options that are long-running (like 9), they won't return until stopped.
if [ -z "$1" ] && [ "$OPT" != "9" ] && [ "$OPT" != "7" ] && [ "$OPT" != "8" ] && [ "$OPT" != "10" ] && [ "$OPT" != "12" ]; then
    exec "$0"
fi
