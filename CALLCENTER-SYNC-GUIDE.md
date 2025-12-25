# 📞 Call Center Sync - Hướng dẫn chi tiết

> Tài liệu mô tả chi tiết cách thức hoạt động của hệ thống đồng bộ dữ liệu Call Center từ PBX API.

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Luồng đồng bộ chính](#luồng-đồng-bộ-chính)
4. [Chi tiết các Job](#chi-tiết-các-job)
5. [Cấu hình](#cấu-hình)
6. [Database Schema](#database-schema)
7. [API Integration](#api-integration)
8. [Google Drive Upload](#google-drive-upload)
9. [Error Handling & Retry](#error-handling--retry)
10. [Monitoring & Logging](#monitoring--logging)
11. [Troubleshooting](#troubleshooting)

---

## Tổng quan

Hệ thống Call Center Sync được thiết kế để tự động đồng bộ dữ liệu cuộc gọi (CDR - Call Detail Records) từ tổng đài PBX về database local, đồng thời upload file ghi âm lên Google Drive để lưu trữ dài hạn.

### Các tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| **Auto Sync** | Tự động đồng bộ CDR hàng ngày vào lúc 2:00 AM |
| **Recording Upload** | Upload file ghi âm cuộc gọi lên Google Drive |
| **Retry Mechanism** | Tự động retry khi sync thất bại (tối đa 3 lần) |
| **Missing Check** | Kiểm tra và bổ sung các record bị thiếu |
| **Batch Processing** | Xử lý theo batch để tối ưu performance |

### Công nghệ sử dụng

- **Python 3.11+** - Ngôn ngữ chính
- **APScheduler** - Lập lịch chạy job
- **httpx** - HTTP client async
- **Prisma Python** - ORM database
- **Google Drive API** - Upload file ghi âm

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KATA WORKERS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │  Scheduler   │────▶│   Sync Job   │────▶│  CallCenterRecord │    │
│  │ (APScheduler)│     │              │     │    (Database)     │    │
│  └──────────────┘     └──────┬───────┘     └──────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│                       ┌──────────────┐                              │
│                       │ Google Drive │                              │
│                       │   Upload     │                              │
│                       └──────────────┘                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                        ┌─────────────────┐
│    PBX API      │                        │   PostgreSQL    │
│  (CDR Source)   │                        │   (Database)    │
└─────────────────┘                        └─────────────────┘
```

### Cấu trúc thư mục

```
workers/src/
├── config.py                 # Cấu hình tập trung
├── main.py                   # Entry point
├── database.py               # Database connection
├── jobs/
│   ├── scheduler.py          # APScheduler setup
│   ├── base.py               # Base job class
│   └── callcenter/
│       ├── __init__.py
│       ├── sync_job.py       # Job chính - đồng bộ CDR
│       ├── retry_job.py      # Retry job thất bại
│       └── missing_check_job.py  # Kiểm tra record thiếu
└── services/
    └── google_drive.py       # Google Drive integration
```

---

## Luồng đồng bộ chính

### Sequence Diagram

```
┌────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐     ┌─────────────┐
│Scheduler│     │ SyncJob   │     │ PBX API │     │ Database │     │Google Drive │
└────┬───┘     └─────┬─────┘     └────┬────┘     └────┬─────┘     └──────┬──────┘
     │               │                │               │                  │
     │ trigger       │                │               │                  │
     │──────────────▶│                │               │                  │
     │               │                │               │                  │
     │               │ Create SyncLog │               │                  │
     │               │───────────────────────────────▶│                  │
     │               │                │               │                  │
     │               │ GET /cdrs      │               │                  │
     │               │───────────────▶│               │                  │
     │               │                │               │                  │
     │               │ CDR Records    │               │                  │
     │               │◀───────────────│               │                  │
     │               │                │               │                  │
     │               │ For each record│               │                  │
     │               │────────────────┼───────────────┼──────────────────│
     │               │                │               │                  │
     │               │ Upsert Record  │               │                  │
     │               │───────────────────────────────▶│                  │
     │               │                │               │                  │
     │               │ Upload Recording               │                  │
     │               │──────────────────────────────────────────────────▶│
     │               │                │               │                  │
     │               │ Recording URL  │               │                  │
     │               │◀──────────────────────────────────────────────────│
     │               │                │               │                  │
     │               │ Update Record with URL         │                  │
     │               │───────────────────────────────▶│                  │
     │               │                │               │                  │
     │               │────────────────┼───────────────┼──────────────────│
     │               │                │               │                  │
     │               │ Update SyncLog │               │                  │
     │               │───────────────────────────────▶│                  │
     │               │                │               │                  │
└────┴───┘     └─────┴─────┘     └────┴────┘     └────┴─────┘     └──────┴──────┘
```

### Mô tả chi tiết các bước

#### Bước 1: Scheduler Trigger

```python
# scheduler.py
scheduler.add_job(
    run_daily_sync,
    trigger=CronTrigger(
        hour=settings.callcenter_daily_sync_hour,  # Default: 2
        minute=settings.callcenter_daily_sync_minute,  # Default: 0
        timezone=settings.timezone
    ),
    id="callcenter_daily_sync",
    name="Call Center Daily Sync",
    replace_existing=True
)
```

#### Bước 2: Tạo Sync Log

```python
# sync_job.py
sync_log = await self.db.callcentersynclog.create(
    data={
        "syncType": self.sync_type,
        "status": "running",
        "startTime": datetime.now(tz),
        "dateFrom": date_from,
        "dateTo": date_to,
        "totalRecords": 0,
        "successCount": 0,
        "failedCount": 0,
    }
)
```

#### Bước 3: Fetch CDR từ PBX API

```python
# sync_job.py
async def _fetch_cdr_records(self, date_from: date, date_to: date) -> list[dict]:
    params = {
        "domain": self.settings.pbx_domain,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "limit": self.settings.callcenter_batch_size,
    }
    
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(
            self.settings.pbx_api_url,
            params=params,
            headers={"Authorization": f"Bearer {self.settings.pbx_api_key}"}
        )
        return response.json().get("data", [])
```

#### Bước 4: Xử lý từng Record

```python
# sync_job.py
async def _process_record(self, record: dict) -> bool:
    try:
        # Check existing
        existing = await self.db.callcenterrecord.find_first(
            where={"uuid": record["uuid"]}
        )
        
        if existing:
            return True  # Skip duplicate
        
        # Create record
        db_record = await self.db.callcenterrecord.create(
            data={
                "uuid": record["uuid"],
                "callerId": record.get("caller_id"),
                "callerName": record.get("caller_name"),
                "destination": record.get("destination"),
                "direction": record.get("direction"),
                "duration": record.get("duration", 0),
                "billSec": record.get("billsec", 0),
                "startTime": parse_datetime(record.get("start_time")),
                "answerTime": parse_datetime(record.get("answer_time")),
                "endTime": parse_datetime(record.get("end_time")),
                "disposition": record.get("disposition"),
                "recordingPath": record.get("recording_path"),
                "rawData": record,
            }
        )
        
        # Upload recording if exists
        if record.get("recording_path"):
            await self._upload_recording(db_record, record["recording_path"])
        
        return True
        
    except Exception as e:
        self.logger.error("Failed to process record", uuid=record.get("uuid"), error=str(e))
        return False
```

#### Bước 5: Upload Recording lên Google Drive

```python
# sync_job.py
async def _upload_recording(self, record, recording_path: str):
    if not self.settings.google_drive_enabled:
        return
    
    # Download from PBX
    recording_url = f"{self.settings.pbx_recording_base_url}/{recording_path}"
    
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(recording_url)
        
        if response.status_code == 200:
            # Upload to Google Drive
            file_name = f"{record.uuid}_{record.startTime.strftime('%Y%m%d_%H%M%S')}.wav"
            
            drive_url = await self.google_drive.upload_file(
                file_content=response.content,
                file_name=file_name,
                folder_id=self.settings.google_drive_folder_id,
                mime_type="audio/wav"
            )
            
            # Update record with Drive URL
            await self.db.callcenterrecord.update(
                where={"id": record.id},
                data={"googleDriveUrl": drive_url}
            )
```

#### Bước 6: Cập nhật Sync Log

```python
# sync_job.py
await self.db.callcentersynclog.update(
    where={"id": sync_log.id},
    data={
        "status": "completed" if failed_count == 0 else "partial",
        "endTime": datetime.now(tz),
        "totalRecords": total_records,
        "successCount": success_count,
        "failedCount": failed_count,
        "errorMessage": error_message if failed_count > 0 else None,
    }
)
```

---

## Chi tiết các Job

### 1. Daily Sync Job (`sync_job.py`)

**Mục đích:** Đồng bộ CDR của ngày hôm trước

**Class:** `CallCenterSyncJob`

**Thời gian chạy:** 2:00 AM hàng ngày

**Logic chính:**
```python
async def run(self, date_from: date = None, date_to: date = None):
    # Default: yesterday
    if date_from is None:
        yesterday = date.today() - timedelta(days=1)
        date_from = yesterday
        date_to = yesterday
    
    # Create sync log
    sync_log = await self._create_sync_log(date_from, date_to)
    
    try:
        # Fetch and process records
        records = await self._fetch_cdr_records(date_from, date_to)
        
        for record in records:
            success = await self._process_record(record)
            if success:
                success_count += 1
            else:
                failed_count += 1
                failed_items.append(record)
        
        # Update sync log
        await self._update_sync_log(sync_log, success_count, failed_count)
        
    except Exception as e:
        await self._mark_sync_failed(sync_log, str(e))
        raise
```

### 2. Retry Job (`retry_job.py`)

**Mục đích:** Retry các sync job đã thất bại

**Class:** `CallCenterRetryJob`

**Thời gian chạy:** Mỗi 15 phút

**Logic chính:**
```python
async def run(self):
    # Find failed sync logs that need retry
    failed_logs = await self.db.callcentersynclog.find_many(
        where={
            "status": {"in": ["failed", "partial"]},
            "retryCount": {"lt": self.settings.callcenter_max_retries}
        },
        take=3,  # Max 3 jobs per run
        order_by={"createdAt": "asc"}
    )
    
    for log in failed_logs:
        # Increment retry count
        await self.db.callcentersynclog.update(
            where={"id": log.id},
            data={
                "retryCount": log.retryCount + 1,
                "status": "retrying"
            }
        )
        
        # Re-run sync for this date range
        sync_job = CallCenterSyncJob(self.db, self.settings)
        await sync_job.run(
            date_from=log.dateFrom,
            date_to=log.dateTo
        )
```

### 3. Failed Items Retry Job

**Mục đích:** Retry các record individual bị fail (chủ yếu do upload thất bại)

**Thời gian chạy:** Mỗi giờ

**Logic chính:**
```python
async def run(self):
    # Find records without Google Drive URL but have recording
    failed_records = await self.db.callcenterrecord.find_many(
        where={
            "recordingPath": {"not": None},
            "googleDriveUrl": None,
            "uploadRetryCount": {"lt": 3}
        },
        take=50
    )
    
    for record in failed_records:
        try:
            await self._upload_recording(record, record.recordingPath)
        except Exception as e:
            await self.db.callcenterrecord.update(
                where={"id": record.id},
                data={"uploadRetryCount": record.uploadRetryCount + 1}
            )
```

### 4. Missing Check Job (`missing_check_job.py`)

**Mục đích:** Kiểm tra và bổ sung các record bị thiếu

**Class:** `CallCenterMissingCheckJob`

**Thời gian chạy:** 3:00 AM hàng ngày

**Logic chính:**
```python
async def run(self, days_back: int = 3):
    for day_offset in range(days_back):
        check_date = date.today() - timedelta(days=day_offset + 1)
        
        # Get UUIDs from PBX
        pbx_records = await self._fetch_cdr_records(check_date, check_date)
        pbx_uuids = {r["uuid"] for r in pbx_records}
        
        # Get UUIDs from database
        db_records = await self.db.callcenterrecord.find_many(
            where={
                "startTime": {
                    "gte": datetime.combine(check_date, time.min),
                    "lt": datetime.combine(check_date + timedelta(days=1), time.min)
                }
            },
            select={"uuid": True}
        )
        db_uuids = {r.uuid for r in db_records}
        
        # Find missing
        missing_uuids = pbx_uuids - db_uuids
        
        if missing_uuids:
            self.logger.warning(f"Found {len(missing_uuids)} missing records for {check_date}")
            
            # Sync missing records
            for record in pbx_records:
                if record["uuid"] in missing_uuids:
                    await self._process_record(record)
```

---

## Cấu hình

### Environment Variables

| Variable | Default | Mô tả |
|----------|---------|-------|
| `PBX_API_URL` | `https://pbx01.onepos.vn:8080/api/v2/cdrs` | URL API lấy CDR |
| `PBX_DOMAIN` | `tazaspa102019` | Domain trên PBX |
| `PBX_API_KEY` | - | API key xác thực |
| `PBX_RECORDING_BASE_URL` | `https://pbx01.onepos.vn:8080/recordings` | Base URL file ghi âm |
| `GOOGLE_DRIVE_ENABLED` | `true` | Bật/tắt upload Google Drive |
| `GOOGLE_DRIVE_CREDENTIALS_PATH` | `/app/credentials/google-credentials.json` | Path file credentials |
| `GOOGLE_DRIVE_FOLDER_ID` | - | ID folder lưu file |
| `CALLCENTER_SYNC_ENABLED` | `true` | Bật/tắt sync call center |
| `CALLCENTER_DAILY_SYNC_HOUR` | `2` | Giờ chạy sync hàng ngày |
| `CALLCENTER_DAILY_SYNC_MINUTE` | `0` | Phút chạy sync |
| `CALLCENTER_RETRY_INTERVAL_MINUTES` | `15` | Interval retry job |
| `CALLCENTER_MISSING_CHECK_HOUR` | `3` | Giờ chạy missing check |
| `CALLCENTER_MAX_RETRIES` | `3` | Số lần retry tối đa |
| `CALLCENTER_BATCH_SIZE` | `200` | Số record mỗi batch |
| `CALLCENTER_DEFAULT_DAYS_BACK` | `30` | Số ngày sync lại mặc định |

### File `.env` mẫu

```env
# Call Center PBX
PBX_API_URL=https://pbx01.onepos.vn:8080/api/v2/cdrs
PBX_DOMAIN=tazaspa102019
PBX_API_KEY=your-pbx-api-key
PBX_RECORDING_BASE_URL=https://pbx01.onepos.vn:8080/recordings

# Google Drive
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_CREDENTIALS_PATH=/app/credentials/google-credentials.json
GOOGLE_DRIVE_FOLDER_ID=1sqxPHnJmHCwyVD9vghPe-i8nbKonmjHT

# Scheduler
CALLCENTER_SYNC_ENABLED=true
CALLCENTER_DAILY_SYNC_HOUR=2
CALLCENTER_DAILY_SYNC_MINUTE=0
CALLCENTER_RETRY_INTERVAL_MINUTES=15
CALLCENTER_MISSING_CHECK_HOUR=3
CALLCENTER_MAX_RETRIES=3
CALLCENTER_BATCH_SIZE=200
```

---

## Database Schema

### CallCenterRecord

```prisma
model CallCenterRecord {
  id              String    @id @default(cuid())
  uuid            String    @unique  // UUID từ PBX
  
  // Thông tin cuộc gọi
  callerId        String?   // Số gọi đến
  callerName      String?   // Tên người gọi
  destination     String?   // Số được gọi
  direction       String?   // inbound/outbound
  
  // Thời gian
  duration        Int       @default(0)  // Tổng thời gian (giây)
  billSec         Int       @default(0)  // Thời gian tính phí
  startTime       DateTime? // Thời điểm bắt đầu
  answerTime      DateTime? // Thời điểm trả lời
  endTime         DateTime? // Thời điểm kết thúc
  
  // Trạng thái
  disposition     String?   // ANSWERED, NO ANSWER, BUSY, FAILED
  
  // File ghi âm
  recordingPath   String?   // Path trên PBX
  googleDriveUrl  String?   // URL Google Drive
  uploadRetryCount Int      @default(0)
  
  // Metadata
  rawData         Json?     // Data gốc từ PBX
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([startTime])
  @@index([callerId])
  @@index([destination])
}
```

### CallCenterSyncLog

```prisma
model CallCenterSyncLog {
  id            String    @id @default(cuid())
  
  // Loại sync
  syncType      String    // daily, manual, retry, missing_check
  
  // Trạng thái
  status        String    // running, completed, partial, failed, retrying
  
  // Thời gian
  startTime     DateTime
  endTime       DateTime?
  dateFrom      DateTime  // Ngày bắt đầu sync
  dateTo        DateTime  // Ngày kết thúc sync
  
  // Thống kê
  totalRecords  Int       @default(0)
  successCount  Int       @default(0)
  failedCount   Int       @default(0)
  
  // Retry
  retryCount    Int       @default(0)
  
  // Error
  errorMessage  String?
  failedItems   Json?     // Danh sách record thất bại
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([status])
  @@index([syncType])
  @@index([dateFrom, dateTo])
}
```

---

## API Integration

### PBX API Endpoint

**URL:** `GET https://pbx01.onepos.vn:8080/api/v2/cdrs`

**Headers:**
```
Authorization: Bearer {PBX_API_KEY}
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `domain` | string | Yes | Domain trên PBX |
| `date_from` | date | Yes | Ngày bắt đầu (YYYY-MM-DD) |
| `date_to` | date | Yes | Ngày kết thúc (YYYY-MM-DD) |
| `limit` | int | No | Số record tối đa (default: 1000) |
| `offset` | int | No | Offset cho pagination |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "uuid": "abc123-def456-ghi789",
      "caller_id": "0901234567",
      "caller_name": "Nguyen Van A",
      "destination": "1900123456",
      "direction": "inbound",
      "duration": 120,
      "billsec": 115,
      "start_time": "2024-01-15T10:30:00+07:00",
      "answer_time": "2024-01-15T10:30:05+07:00",
      "end_time": "2024-01-15T10:32:00+07:00",
      "disposition": "ANSWERED",
      "recording_path": "2024/01/15/abc123-def456-ghi789.wav"
    }
  ],
  "total": 150,
  "limit": 200,
  "offset": 0
}
```

### Recording Download

**URL:** `GET https://pbx01.onepos.vn:8080/recordings/{recording_path}`

**Headers:**
```
Authorization: Bearer {PBX_API_KEY}
```

**Response:** Binary audio file (WAV/MP3)

---

## Google Drive Upload

### Setup Credentials

1. Tạo Service Account trên Google Cloud Console
2. Enable Google Drive API
3. Download JSON credentials
4. Chia sẻ folder Drive với email của Service Account

### Upload Flow

```python
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload

class GoogleDriveService:
    def __init__(self, credentials_path: str):
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
        self.service = build('drive', 'v3', credentials=credentials)
    
    async def upload_file(
        self,
        file_content: bytes,
        file_name: str,
        folder_id: str,
        mime_type: str = 'audio/wav'
    ) -> str:
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        media = MediaInMemoryUpload(
            file_content,
            mimetype=mime_type,
            resumable=True
        )
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,webViewLink'
        ).execute()
        
        return file.get('webViewLink')
```

### File Naming Convention

```
{uuid}_{YYYYMMDD_HHMMSS}.wav

Ví dụ: abc123-def456_20240115_103000.wav
```

---

## Error Handling & Retry

### Các loại lỗi và xử lý

| Lỗi | Nguyên nhân | Xử lý |
|-----|-------------|-------|
| `ConnectionError` | Không kết nối được PBX | Retry job sau 15 phút |
| `AuthenticationError` | API key sai/hết hạn | Log error, alert admin |
| `TimeoutError` | Request timeout | Retry với exponential backoff |
| `DriveUploadError` | Upload Drive thất bại | Retry record individual |
| `DuplicateError` | Record đã tồn tại | Skip, log warning |

### Retry Strategy

```
Level 1: Record Level
├── Upload thất bại → Đánh dấu uploadRetryCount++
├── Retry mỗi giờ
└── Max 3 lần

Level 2: Sync Log Level
├── Sync thất bại → Đánh dấu status='failed'
├── Retry mỗi 15 phút
└── Max 3 lần

Level 3: Missing Check
├── Chạy 3:00 AM
├── Check 3 ngày gần nhất
└── Sync record bị thiếu
```

### Error Logging

```python
self.logger.error(
    "Failed to sync record",
    uuid=record["uuid"],
    error=str(e),
    traceback=traceback.format_exc(),
    sync_log_id=sync_log.id
)
```

---

## Monitoring & Logging

### Log Format

```json
{
  "timestamp": "2024-01-15T02:00:00+07:00",
  "level": "INFO",
  "logger": "callcenter.sync",
  "message": "Sync completed",
  "context": {
    "sync_log_id": "clr123abc",
    "date_from": "2024-01-14",
    "date_to": "2024-01-14",
    "total_records": 150,
    "success_count": 148,
    "failed_count": 2,
    "duration_seconds": 45.2
  }
}
```

### Metrics (Prometheus)

```
# Sync metrics
callcenter_sync_total{status="success"} 100
callcenter_sync_total{status="failed"} 5
callcenter_sync_duration_seconds{quantile="0.95"} 60

# Record metrics
callcenter_records_synced_total 15000
callcenter_records_failed_total 50

# Upload metrics
callcenter_upload_total{status="success"} 14000
callcenter_upload_total{status="failed"} 100
callcenter_upload_duration_seconds{quantile="0.95"} 5
```

### Health Check

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "scheduler": scheduler.running,
        "database": await check_database(),
        "google_drive": await check_google_drive(),
        "last_sync": await get_last_sync_status()
    }
```

---

## Troubleshooting

### 1. Sync không chạy

**Kiểm tra:**
```bash
# Check scheduler status
docker logs kata-workers | grep scheduler

# Check cron job
docker exec kata-workers python -c "from src.jobs.scheduler import scheduler; print(scheduler.get_jobs())"
```

**Nguyên nhân có thể:**
- `CALLCENTER_SYNC_ENABLED=false`
- Scheduler chưa start
- Timezone không đúng

### 2. Kết nối PBX thất bại

**Kiểm tra:**
```bash
# Test connection
curl -k -H "Authorization: Bearer $PBX_API_KEY" \
  "https://pbx01.onepos.vn:8080/api/v2/cdrs?domain=tazaspa102019&date_from=2024-01-01&date_to=2024-01-01"
```

**Nguyên nhân có thể:**
- API key sai/hết hạn
- Network/firewall chặn
- PBX server down

### 3. Upload Google Drive thất bại

**Kiểm tra:**
```bash
# Check credentials
cat /app/credentials/google-credentials.json | jq '.client_email'

# Test Drive access
docker exec kata-workers python -c "
from src.services.google_drive import GoogleDriveService
drive = GoogleDriveService('/app/credentials/google-credentials.json')
print(drive.test_connection())
"
```

**Nguyên nhân có thể:**
- Credentials file không tồn tại/sai
- Service account chưa có quyền truy cập folder
- Google Drive API quota exceeded

### 4. Record bị thiếu

**Kiểm tra:**
```sql
-- Check sync log
SELECT * FROM "CallCenterSyncLog" 
WHERE status IN ('failed', 'partial') 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check missing records
SELECT COUNT(*) FROM "CallCenterRecord" 
WHERE DATE("startTime") = '2024-01-14';
```

**Giải pháp:**
```bash
# Manual sync for specific date
docker exec kata-workers python -c "
import asyncio
from src.jobs.callcenter.sync_job import CallCenterSyncJob
from datetime import date

async def manual_sync():
    job = CallCenterSyncJob()
    await job.run(
        date_from=date(2024, 1, 14),
        date_to=date(2024, 1, 14)
    )

asyncio.run(manual_sync())
"
```

### 5. Database connection error

**Kiểm tra:**
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
docker exec kata-workers python -c "
from src.database import get_db
import asyncio

async def test():
    db = await get_db()
    result = await db.callcenterrecord.count()
    print(f'Total records: {result}')

asyncio.run(test())
"
```

---

## Manual Operations

### Sync ngày cụ thể

```bash
docker exec kata-workers python -c "
import asyncio
from datetime import date
from src.jobs.callcenter.sync_job import CallCenterSyncJob

asyncio.run(CallCenterSyncJob().run(
    date_from=date(2024, 1, 10),
    date_to=date(2024, 1, 15)
))
"
```

### Retry failed uploads

```bash
docker exec kata-workers python -c "
import asyncio
from src.jobs.callcenter.sync_job import retry_failed_uploads

asyncio.run(retry_failed_uploads())
"
```

### Force missing check

```bash
docker exec kata-workers python -c "
import asyncio
from src.jobs.callcenter.missing_check_job import CallCenterMissingCheckJob

asyncio.run(CallCenterMissingCheckJob().run(days_back=7))
"
```

---

## Changelog

| Ngày | Phiên bản | Thay đổi |
|------|-----------|----------|
| 2024-01-15 | 1.0.0 | Initial release |
| 2024-02-01 | 1.1.0 | Thêm missing check job |
| 2024-03-01 | 1.2.0 | Optimize batch processing |
| 2024-12-24 | 1.3.0 | Update documentation |

---

> 📝 **Ghi chú:** Tài liệu này được tạo tự động và cập nhật lần cuối vào ngày 24/12/2024.
