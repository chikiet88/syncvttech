Lấy Customer Demo : customerID:110362

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

2. Customer GeneralInfo
Endpoint : https://tmtaza.vttechsolution.com/Customer/GeneralInfo/?handler=Loadata
Formdata : CustomerID=110362
Reponse : reponse_GeneralInfo.json

3. Customer StatusList
Endpoint : https://tmtaza.vttechsolution.com/Customer/StatusList/?handler=LoadataStatus
Formdata : customerID=110362&id=0&limit=100&beginID=0&Type=0&TypeParent=0
Reponse : reponse_StatusList.json

4.  Customer Service TabList_Service
Endpoint : https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Service/?handler=LoadataTab
Formdata : CustomerID=110362&Record=0&Plan=0&ViewAll=1
Reponse : reponse_Service.json

5.  Customer Service TabList_Card
Endpoint : https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Card/?handler=LoadataCard
Formdata : CustomerID=110362&id=0&limit=100&beginID=0
Reponse : reponse_Card.json

6.  Customer Service TabList_Medicine
Endpoint : https://tmtaza.vttechsolution.com/Customer/Service/TabList/TabList_Medicine/?handler=LoadataPrescriptionMedicine
Formdata : CustomerID=110362&id=0&limit=100&beginID=0
Reponse : reponse_Medicine.json

7. Customer Treatment TreatmentList_Service
Endpoint : https://tmtaza.vttechsolution.com/Customer/Treatment/TreatmentList/TreatmentList_Service/?handler=LoadataTreatment
Formdata : CustomerID=110362&PatientRecordID=0&TreatmentPlanID=0&ServiceTabID=0&ServiceCatTabID=0&idbegin=0&idbeginless=0&limit=50
Reponse : reponse_Treatment.json

8. Customer Payment PaymentList_Service
Endpoint : https://tmtaza.vttechsolution.com/Customer/Payment/PaymentList/PaymentList_Service/?handler=LoadataPayment
Formdata : CustomerID=110362&CurrentID=0&CurrentType=
Reponse : reponse_Payment.json

9. Customer Payment PaymentList_Card
Endpoint : https://tmtaza.vttechsolution.com/Customer/Payment/PaymentList/PaymentList_Card/?handler=LoadataPaymentCard
Formdata : CustomerID=110362&id=0&limit=100&beginID=0
Reponse : reponse_PaymentCard.json

10. Customer Image LoadAllFolder
Endpoint : https://tmtaza.vttechsolution.com/Customer/CustomerImage/?handler=LoadAllFolder
Formdata : CustomerID=110362
Reponse : reponse_CustomerImage.json

10.1 Customer Image LoadImageByFolder
Endpoint : https://tmtaza.vttechsolution.com/Customer/CustomerImage/?handler=LoadImageByFolder
Formdata : currentFolderID=105889&idetail=0&type=0
Reponse : reponse_CustomerImageByFolder.json

11. Customer History HistoryList_Care
Endpoint : https://tmtaza.vttechsolution.com/Customer/History/HistoryList_Care/?handler=LoadataHistory
Formdata : CustomerID=110362&Type=0&Limit=100&BeginID=0
Reponse : reponse_History.json

12. Customer Schedule ScheduleList_Schedule
Endpoint : https://tmtaza.vttechsolution.com/Customer/ScheduleList_Schedule/?handler=Loadata
Formdata : CustomerID=110362&TicketID=0&Limit=10&BeginID=0&BeginDate=0&IsDelete=0&IsCancel=1&IsTemp=0
Reponse : reponse_Schedule.json

13. Customer Complaint ComplaintList
Endpoint : https://tmtaza.vttechsolution.com/Customer/ComplaintList/?handler=Loadata
Formdata : CustomerID=110362&currentID=0
Reponse : reponse_Complaint.json