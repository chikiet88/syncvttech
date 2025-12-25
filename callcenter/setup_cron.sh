#!/bin/bash
# Setup cron jobs for Call Center Sync
# Chạy script này để cài đặt cron jobs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Use virtual environment Python if exists
if [ -f "$PROJECT_DIR/venv/bin/python" ]; then
    PYTHON_PATH="$PROJECT_DIR/venv/bin/python"
elif [ -f "/usr/bin/python3" ]; then
    PYTHON_PATH="/usr/bin/python3"
else
    PYTHON_PATH=$(which python3)
fi

CRON_JOB_SCRIPT="$PROJECT_DIR/callcenter/cron_job.py"

echo "=========================================="
echo "🔧 Call Center Cron Setup"
echo "=========================================="
echo "Project Dir: $PROJECT_DIR"
echo "Python Path: $PYTHON_PATH"
echo "Cron Script: $CRON_JOB_SCRIPT"
echo ""

# Create temp cron file
TEMP_CRON=$(mktemp)

# Get existing crontab (if any)
crontab -l 2>/dev/null | grep -v "callcenter/cron_job.py" > "$TEMP_CRON" || true

# Add Call Center cron jobs
cat >> "$TEMP_CRON" << EOF

# ============================================
# CALL CENTER SYNC JOBS
# ============================================

# Daily Sync - Run at 2:00 AM every day
# Sync CDR records from yesterday
0 2 * * * cd $PROJECT_DIR && $PYTHON_PATH $CRON_JOB_SCRIPT daily >> $PROJECT_DIR/logs/cron_daily.log 2>&1

# Retry Job - Run every 15 minutes
# Retry failed sync jobs
*/15 * * * * cd $PROJECT_DIR && $PYTHON_PATH $CRON_JOB_SCRIPT retry >> $PROJECT_DIR/logs/cron_retry.log 2>&1

# Missing Check - Run at 3:00 AM every day
# Check and sync missing records for last 3 days
0 3 * * * cd $PROJECT_DIR && $PYTHON_PATH $CRON_JOB_SCRIPT missing_check >> $PROJECT_DIR/logs/cron_missing.log 2>&1

EOF

# Install new crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo "✅ Cron jobs installed successfully!"
echo ""
echo "📋 Current crontab:"
echo "=========================================="
crontab -l | grep -A 100 "CALL CENTER"
echo "=========================================="
echo ""
echo "📝 Log files will be saved to: $PROJECT_DIR/logs/"
echo ""
echo "🔧 Commands:"
echo "   View cron logs:  tail -f $PROJECT_DIR/logs/cron_daily.log"
echo "   View all jobs:   crontab -l"
echo "   Edit jobs:       crontab -e"
echo "   Remove jobs:     crontab -r"
echo ""
