1. Lấy List Customer
Endpoint: https://tmtaza.vttechsolution.com/Customer/ListCustomer/?handler=LoadData
Formdata: dateFrom=2026-01-06+00%3A00%3A00&dateTo=2026-01-06+00%3A00%3A00&branchID=1&type=1&BeginID=0&Limit=500
Reponse : Demo [
  {
    "NumDate": 20260106084000,
    "CustID": 37363,
    "CustAvatar": "https://cdnvttimg.vttechsolution.com/ImageTMTaza/_AvatarCustomer/screenshot_1683170343(20230504102314).png",
    "CustCode": "PVD0037363",
    "CustOldCode": "",
    "DocCode": "",
    "Phone": "0909046672",
    "SourceID": 93,
    "CustName": "PHAN THá» THANH XUÃN",
    "IsCustNew": 0,
    "SourceName": "KhÃ¡ch VÃ£ng Lai",
    "SourceDetailName": "",
    "Created": "2020-10-21T10:26:25.667",
    "GroupName": "Team 1 - CN Thá»§ Äá»©c - OAZALO",
    "Birth": "1983-08-23T00:00:00",
    "Age": 43,
    "GenderID": 61,
    "Address": "KHÃCH KHÃNG CHO Äá»A CHá»",
    "District": "",
    "City": "",
    "Commune": "",
    "NumLastTreat": 20260106,
    "NumLastCare": 20240113,
    "StaffID": 0,
    "Email1": "",
    "NumFirstPaid": 20201021,
    "CCStaffID": 1094,
    "DocCode1": "",
    "TeleID": 0,
    "TotalRaise": 65705000,
    "TotalPaid": 65705000,
    "CreatedBy": 156,
    "NumLastDateFrom": 20260109
  },...]


2. CustID truyền vào  Payload: { "CustomerID": ID }
cho Customer Detailed Profile (Full Sync)