#!/bin/bash
# Setup cron job cho VTTech Crawler
# Chạy: bash setup_cron.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_CMD="cd $SCRIPT_DIR && /usr/bin/python3 cron_crawler.py >> logs/cron.log 2>&1"
CRON_FULL_CMD="cd $SCRIPT_DIR && /usr/bin/python3 cron_crawler.py --full >> logs/cron.log 2>&1"

echo "=========================================="
echo "VTTech Cron Job Setup"
echo "=========================================="
echo ""
echo "Script directory: $SCRIPT_DIR"
echo ""
echo "Các lệnh cron có thể setup:"
echo ""
echo "1. Lấy doanh thu hàng ngày (6h sáng):"
echo "   0 6 * * * $CRON_CMD"
echo ""
echo "2. Lấy đầy đủ (bao gồm master) vào Chủ nhật hàng tuần:"
echo "   0 6 * * 0 $CRON_FULL_CMD"
echo ""
echo "3. Lấy dữ liệu mỗi 4 giờ:"
echo "   0 */4 * * * $CRON_CMD"
echo ""
echo "=========================================="
echo "Để thêm vào crontab, chạy:"
echo "  crontab -e"
echo ""
echo "Hoặc thêm tự động (cần confirm):"
echo ""

read -p "Bạn muốn thêm cron job tự động? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup crontab hiện tại
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d) 2>/dev/null || true
    
    # Thêm cron jobs
    (crontab -l 2>/dev/null | grep -v "cron_crawler.py"; \
     echo "# VTTech Crawler - Daily (6h sáng)"; \
     echo "0 6 * * * $CRON_CMD"; \
     echo "# VTTech Crawler - Full Weekly (Chủ nhật 6h sáng)"; \
     echo "0 6 * * 0 $CRON_FULL_CMD") | crontab -
    
    echo ""
    echo "✅ Đã thêm cron jobs!"
    echo ""
    echo "Crontab hiện tại:"
    crontab -l | grep -A1 "VTTech"
else
    echo ""
    echo "Để thêm thủ công, copy lệnh trên vào: crontab -e"
fi

echo ""
echo "=========================================="
echo "Test chạy ngay:"
echo "  python3 cron_crawler.py --date $(date -d 'yesterday' +%Y-%m-%d)"
echo "  python3 cron_crawler.py --full"
echo "=========================================="
