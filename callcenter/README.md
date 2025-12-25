# Call Center Sync Module

Module đồng bộ dữ liệu CDR (Call Detail Records) từ PBX API vào SQLite database.

## 📋 Tính năng

- ✅ Tự động đồng bộ CDR hàng ngày (2:00 AM)
- ✅ Retry tự động khi sync thất bại (mỗi 15 phút)
- ✅ Kiểm tra và bổ sung records bị thiếu (3:00 AM)
- ✅ CLI tool để quản lý sync
- ✅ Logging đầy đủ

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
pip install httpx apscheduler
```

### 2. Cấu hình environment

```bash
# Copy file .env.example
cp callcenter/.env.example .env

# Chỉnh sửa .env với API key của bạn
nano .env
```

### 3. Khởi tạo database

```bash
python -m callcenter.cli init
```

### 4. Setup cron jobs

```bash
chmod +x callcenter/setup_cron.sh
./callcenter/setup_cron.sh
```

## 📖 Sử dụng

### CLI Commands

```bash
# Khởi tạo database
python -m callcenter.cli init

# Sync ngày hôm qua
python -m callcenter.cli sync

# Sync ngày cụ thể
python -m callcenter.cli sync --date 2024-12-20

# Sync khoảng thời gian
python -m callcenter.cli sync --date 2024-12-20 --to-date 2024-12-23

# Retry các sync thất bại
python -m callcenter.cli retry

# Kiểm tra records bị thiếu
python -m callcenter.cli missing-check
python -m callcenter.cli missing-check --days 7

# Xem trạng thái
python -m callcenter.cli status

# Xem sync logs
python -m callcenter.cli logs
python -m callcenter.cli logs --limit 20

# Chạy scheduler daemon
python -m callcenter.cli scheduler
```

### Python API

```python
from callcenter import (
    init_callcenter_database,
    sync_daily,
    sync_manual,
    sync_retry,
    sync_missing_check,
    repo
)
from datetime import date

# Khởi tạo database
init_callcenter_database()

# Sync ngày hôm qua
result = sync_daily()
print(result)

# Sync khoảng thời gian
result = sync_manual(
    date_from=date(2024, 12, 20),
    date_to=date(2024, 12, 23)
)

# Lấy thống kê
stats = repo.get_records_stats()
print(stats)

# Lấy sync logs
logs = repo.get_sync_logs(limit=10)
```

## 📁 Cấu trúc files

```
callcenter/
├── __init__.py           # Module exports
├── config.py             # Cấu hình
├── init_callcenter_db.py # Database schema
├── repository.py         # Database operations
├── api_client.py         # PBX API client
├── sync_jobs.py          # Sync job classes
├── scheduler.py          # APScheduler setup
├── cli.py                # CLI tool
├── cron_job.py           # Cron job script
├── setup_cron.sh         # Cron setup script
├── .env.example          # Example environment
└── README.md             # This file
```

## ⏰ Cron Jobs Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Sync | 2:00 AM | Sync CDR từ ngày hôm qua |
| Retry | Every 15 min | Retry các sync thất bại |
| Missing Check | 3:00 AM | Kiểm tra records bị thiếu 3 ngày |

## 🗄️ Database Schema

### callcenter_records

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| uuid | TEXT | Unique ID từ PBX |
| caller_id | TEXT | Số gọi đến |
| caller_name | TEXT | Tên người gọi |
| destination | TEXT | Số được gọi |
| direction | TEXT | inbound/outbound |
| duration | INTEGER | Tổng thời gian (giây) |
| billsec | INTEGER | Thời gian tính phí |
| start_time | DATETIME | Thời điểm bắt đầu |
| answer_time | DATETIME | Thời điểm trả lời |
| end_time | DATETIME | Thời điểm kết thúc |
| disposition | TEXT | ANSWERED, NO ANSWER, BUSY, FAILED |
| recording_path | TEXT | Path file ghi âm trên PBX |
| raw_data | TEXT | JSON data gốc |

### callcenter_sync_logs

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| sync_type | TEXT | daily, manual, retry, missing_check |
| status | TEXT | running, completed, partial, failed |
| start_time | DATETIME | Thời điểm bắt đầu |
| end_time | DATETIME | Thời điểm kết thúc |
| date_from | DATE | Ngày bắt đầu sync |
| date_to | DATE | Ngày kết thúc sync |
| total_records | INTEGER | Tổng số records |
| success_count | INTEGER | Số records thành công |
| failed_count | INTEGER | Số records thất bại |
| retry_count | INTEGER | Số lần retry |
| error_message | TEXT | Thông báo lỗi |

## 🔧 Troubleshooting

### Sync không chạy

1. Kiểm tra cron đã được setup:
```bash
crontab -l | grep callcenter
```

2. Kiểm tra logs:
```bash
tail -f logs/cron_daily.log
```

3. Kiểm tra env:
```bash
echo $PBX_API_KEY
```

### Kết nối PBX thất bại

```bash
# Test connection
curl -k -H "Authorization: Bearer $PBX_API_KEY" \
  "https://pbx01.onepos.vn:8080/api/v2/cdrs?domain=tazaspa102019&date_from=2024-12-01&date_to=2024-12-01"
```

### Database errors

```bash
# Reset database
python -c "from callcenter.init_callcenter_db import reset_database; reset_database()"
```

## 📝 Logs

Logs được lưu tại `logs/` directory:
- `callcenter_sync_YYYYMMDD.log` - Log chi tiết
- `cron_daily.log` - Log cron daily sync
- `cron_retry.log` - Log cron retry
- `cron_missing.log` - Log cron missing check
