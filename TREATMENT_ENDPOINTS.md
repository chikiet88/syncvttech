# TREATMENT ENDPOINTS ANALYSIS

**Ngày phân tích:** 25/12/2024  
**CustomerID Test:** 30056  
**User Test:** ittest123

---

## 1. ENDPOINTS HOẠT ĐỘNG

### 1.1 TreatmentList_Service

| Handler | URL | Method | Response |
|---------|-----|--------|----------|
| `LoadComboMain` | `/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadComboMain&CustomerID={id}` | POST | ServiceTab, ServiceCatTab, PatientRecord, TreatmentPlan |
| `LoadDetail` | `/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadDetail&CustomerID={id}` + `TabID` in body | POST | Treatment details (Table, Table1) |

### 1.2 MainCustomer

| Handler | URL | Method | Response |
|---------|-----|--------|----------|
| `LoadIni` | `/Customer/MainCustomer/?handler=LoadIni&CustomerID={id}` | POST | EmpFull (334), Tele (173) |
| `LoadPaymentInfo` | `/Customer/MainCustomer/?handler=LoadPaymentInfo&CustomerID={id}` | POST | Payment summary |
| `LoadStatusExtra` | `/Customer/MainCustomer/?handler=LoadStatusExtra&CustomerID={id}` | POST | Table, Table1 |

---

## 2. RESPONSE STRUCTURES

### 2.1 LoadComboMain Response
```json
{
  "PatientRecord": [],
  "TreatmentPlan": [],
  "ServiceTab": [
    {"ID": 342205, "Name": "ULTHERAPY VÙNG BẮP TAY"},
    {"ID": 319483, "Name": "Kem massage..."}
  ],
  "ServiceCatTab": [
    {"ID": 47, "Name": "ULTHER"}
  ]
}
```

### 2.2 LoadDetail Response
```json
{
  "Table": [{
    "TabID": 8721,
    "BS1": 0, "BS2": 0, "BS3": 0, "BS4": 0,
    "PT1": 0, "PT2": 0, "PT3": 0, "PT4": 0,
    "Tech1": 0, "Tech2": 0,
    "Created_By": 147,
    "Created": "2020-11-29T10:02:04.807",
    "PercentOfService": 100,
    "PercentComplete": 100,
    "Content": "",
    "Note": "",
    "Symptoms": "",
    "TeethTreat": "",
    "PriceRoot": 0.0,
    "PriceDiscounted": 1600000.0,
    "ServiceID": 467,
    "SerCode": "DV00467",
    "IsFinish": 0
  }],
  "Table1": []
}
```

### 2.3 LoadPaymentInfo Response
```json
[{
  "PRICE_DISCOUNTED": 47600000.0,
  "PAID": 0.0,
  "PRICE_TREAT": 45200000.0,
  "PAID_TREAT": 0.0,
  "DEPOST_LEFT": 0.0,
  "PHONE": "0977272967",
  "TOTALMANUAL": 0.0,
  "VIRTUAL_AMOUNT": 0.0
}]
```

### 2.4 LoadIni Response
```json
{
  "EmpFull": [/* 334 employees */],
  "Tele": [/* 173 tele staff */]
}
```

---

## 3. REQUEST FORMAT

### Required Headers
```
Authorization: Bearer {JWT_TOKEN}
X-Requested-With: XMLHttpRequest
Content-Type: application/x-www-form-urlencoded
```

### Request Body (Form-encoded)
```
__RequestVerificationToken={XSRF_TOKEN}
CustomerID={CUSTOMER_ID}  // Optional in body
TabID={SERVICE_TAB_ID}    // For LoadDetail
```

### Important Notes
- CustomerID có thể truyền trong URL params HOẶC request body
- TabID phải truyền trong request body
- XSRF token lấy từ `/Customer/ListCustomer/` page

---

## 4. CUSTOMER 30056 DATA

### Financial Summary
| Field | Value |
|-------|-------|
| Phone | 0977272967 |
| Giá sau giảm | 47,600,000 VND |
| Đã thanh toán | 0 VND |
| Giá điều trị | 45,200,000 VND |

### Treatment Services (4 services)
| ID | Name | Created | Price | Status |
|----|------|---------|-------|--------|
| 342205 | ULTHERAPY VÙNG BẮP TAY | 2020-11-29 | 1,600,000 | 100% |
| 319483 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |
| 319482 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |
| 243216 | Kem massage H.Derma collagen | 2020-11-29 | 1,600,000 | 100% |

---

## 5. SYNC SCRIPT

Script: `sync_treatment_data.py`

### Usage
```python
from sync_treatment_data import TreatmentSyncer

syncer = TreatmentSyncer()
syncer.login()
syncer.get_xsrf_token()

# Sync single customer
result = syncer.sync_customer_treatment('30056')

# Sync multiple customers
results = syncer.sync_batch(['30056', '30057', '30058'])
```

### Output Files
- `data_sync/treatments/treatment_{customer_id}_{date}.json`
- `data_sync/treatments/customer_{id}_full_{datetime}.json`

---

## 6. NOTES

### Permissions
- User `ittest123` có quyền xem treatment data khi có CustomerID
- CustomerID=30056 có đầy đủ data treatment

### Data Compression
- Response sử dụng Base64 + GZip (wbits=-MAX_WBITS)
- Content-Encoding: br (Brotli) từ server

### Limitations
- Một số handler trả về HTML partial (85580 bytes) thay vì JSON
- PatientRecord và TreatmentPlan thường rỗng
