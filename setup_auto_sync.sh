#!/bin/bash
# VTTech Auto Sync Cron Setup
# Tự động sync dữ liệu từ VTTech vào database hàng ngày

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="/usr/bin/python3"
SYNC_SCRIPT="$SCRIPT_DIR/sync_to_db.py"
LOG_DIR="$SCRIPT_DIR/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo "🔧 VTTech Auto Sync Cron Setup"
echo "=================================================="
echo ""

# Kiểm tra Python
if [ ! -f "$PYTHON_BIN" ]; then
    PYTHON_BIN=$(which python3)
fi

if [ -z "$PYTHON_BIN" ]; then
    echo -e "${RED}❌ Python3 không tìm thấy${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python: $PYTHON_BIN${NC}"
echo -e "${GREEN}✅ Script: $SYNC_SCRIPT${NC}"
echo -e "${GREEN}✅ Log Dir: $LOG_DIR${NC}"
echo ""

# Tạo thư mục logs
mkdir -p "$LOG_DIR"

# Tạo wrapper script
CRON_SCRIPT="$SCRIPT_DIR/run_daily_sync.sh"

cat > "$CRON_SCRIPT" << 'SCRIPT'
#!/bin/bash
# VTTech Daily Sync Runner
# Được chạy bởi cron

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DATE=$(date +%Y-%m-%d)
LOG_FILE="$SCRIPT_DIR/logs/cron_sync_${DATE}.log"

echo "======================================" >> "$LOG_FILE"
echo "🚀 Starting sync at $(date)" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"

# Sync dữ liệu hôm nay
/usr/bin/python3 "$SCRIPT_DIR/sync_to_db.py" --daily >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "" >> "$LOG_FILE"
echo "Exit code: $EXIT_CODE" >> "$LOG_FILE"
echo "Finished at $(date)" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"

exit $EXIT_CODE
SCRIPT

chmod +x "$CRON_SCRIPT"
echo -e "${GREEN}✅ Created: $CRON_SCRIPT${NC}"

# Hiện cron entries
echo ""
echo "=================================================="
echo "📋 CRON ENTRIES (copy vào crontab -e)"
echo "=================================================="
echo ""

# Sync hàng ngày lúc 6:00 sáng
echo "# VTTech Daily Sync - Chạy lúc 6:00 sáng mỗi ngày"
echo "0 6 * * * $CRON_SCRIPT"
echo ""

# Sync lúc 12:00 trưa (backup)
echo "# VTTech Noon Sync - Backup lúc 12:00 trưa"
echo "0 12 * * * $CRON_SCRIPT"
echo ""

# Sync lúc 22:00 tối (cuối ngày)
echo "# VTTech Night Sync - Cuối ngày lúc 22:00"
echo "0 22 * * * $CRON_SCRIPT"
echo ""

echo "=================================================="
echo "🔧 Hướng dẫn cài đặt:"
echo "=================================================="
echo ""
echo "1. Mở crontab editor:"
echo "   crontab -e"
echo ""
echo "2. Thêm dòng sau (sync lúc 6:00 sáng):"
echo "   0 6 * * * $CRON_SCRIPT"
echo ""
echo "3. Lưu và thoát"
echo ""
echo "4. Kiểm tra cron đã được thêm:"
echo "   crontab -l"
echo ""
echo "5. Chạy thủ công để test:"
echo "   $CRON_SCRIPT"
echo ""

# Hỏi có muốn thêm cron tự động không
echo ""
read -p "🔧 Bạn có muốn thêm cron job tự động? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Thêm cron job
    CRON_ENTRY="0 6 * * * $CRON_SCRIPT"
    
    # Kiểm tra đã có chưa
    if crontab -l 2>/dev/null | grep -q "$CRON_SCRIPT"; then
        echo -e "${YELLOW}⚠️  Cron job đã tồn tại${NC}"
    else
        (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
        echo -e "${GREEN}✅ Đã thêm cron job: 6:00 sáng mỗi ngày${NC}"
    fi
    
    echo ""
    echo "📋 Cron jobs hiện tại:"
    crontab -l | grep -v "^#" | head -5
fi

echo ""
echo -e "${GREEN}✅ Setup hoàn tất!${NC}"
