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
