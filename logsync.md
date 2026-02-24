[01:15:48]   ✅ [LoadataHistory] Nhận được 15 bản ghi
[01:15:49]    ✅ [ID: 185897] Đã đồng bộ 15 Lịch sử chăm sóc
[01:15:49] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:15:49]    🔸 Payload: CustomerID=185897
[01:15:49]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:15:49]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:15:49] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:15:49]    🔸 Payload: CustomerID=185897
[01:15:49]   ✅ [Loadata] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:15:49]    🔸 Payload: CustomerID=185897
[01:15:49]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:15:49]    🔸 Payload: CustomerID=185897
[01:15:49]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:15:49]    🔸 Payload: CustomerID=185897, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:15:49]   ✅ [LoadataStatus] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:15:49]    🔸 Payload: CustomerID=185897, id=0, limit=100, beginID=0
[01:15:49]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:15:49]    🔸 Payload: CustomerID=185897, id=0, limit=100, beginID=0
[01:15:49]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:15:49]    🔸 Payload: CustomerID=185897
[01:15:49]   ✅ [LoadAllFolder] Nhận được 6 bản ghi
[01:15:49] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:49]    🔸 Payload: CustomerID=185897, currentFolderID=214942, idetail=0, type=0
[01:15:49]   ✅ [LoadImageByFolder] Nhận được 0 bản ghi
[01:15:49]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:15:49] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:49]    🔸 Payload: CustomerID=185897, currentFolderID=214943, idetail=0, type=0
[01:15:49]   ✅ [LoadImageByFolder] Nhận được 4 bản ghi
[01:15:49]    ❌ [ID: 185897] Lỗi syncCustomerImages: 
Invalid `this.prisma.customerImage.create()` invocation in
/chikiet/toolhotro/apivttech/backend-api/src/sync.service.ts:828:45

  825 if (!img.CloudID) continue;
  826 const existing = await this.prisma.customerImage.findFirst({ where: { folder_id: folder.id, cloud_id: img.CloudID } });
  827 if (!existing) {
→ 828   await this.prisma.customerImage.create({
          data: {
            folder_id: 263,
            real_name: "img_7867(20251228012809).jpeg",
            feature_image: "img_7867(20251228012809)(fea).jpeg",
            cloud_id: "1ehm_50cUjJdeo63PFhC4EMb8uIj1W8X7",
            created_at: new Date("Invalid Date")
                        ~~~~~~~~~~~~~~~~~~~~~~~~
          }
        })

Invalid value for argument `created_at`: Provided Date object is invalid. Expected Date.
[01:15:49] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:15:49]    🔸 Payload: CustomerID=185897, IsCancel=1
[01:15:49]   ✅ [Loadata] Nhận được 0 bản ghi
[01:15:49] ✅ [ID: 185897] Kết thúc Full Sync.
[01:15:49] 🔍 [ID: 186884] 🚀 Bắt đầu Full Sync chi tiết...
[01:15:49] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:15:49]    🔸 Payload: CustomerID=186884
[01:15:49]   ✅ [LoadData] Nhận được 0 bản ghi
[01:15:49] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:15:49]    🔸 Payload: CustomerID=186884
[01:15:49]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:15:49]    ✅ [ID: 186884] Đã cập nhật Doanh thu & Công nợ
[01:15:49] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:15:49]    🔸 Payload: CustomerID=186884
[01:15:49]   ✅ [LoadataTab] Nhận được 2 bản ghi
[01:15:49]    ✅ [ID: 186884] Đã đồng bộ 2 Dịch vụ đang sử dụng
[01:15:49] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:15:49]    🔸 Payload: CustomerID=186884
[01:15:49]   ✅ [LoadataPayment] Nhận được 1 bản ghi
[01:15:49] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:15:49]    🔸 Payload: CustomerID=186884, id=0, limit=100, beginID=0
[01:15:50]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:15:50]    ✅ [ID: 186884] Đã đồng bộ 1 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:15:50] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:15:50]    🔸 Payload: CustomerID=186884, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:15:50]   ✅ [LoadataTreatment] Nhận được 1 bản ghi
[01:15:50]    ✅ [ID: 186884] Đã đồng bộ 1 Lần điều trị
[01:15:50] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:15:50]    🔸 Payload: CustomerID=186884, Type=0, Limit=100, BeginID=0
[01:15:50]   ✅ [LoadataHistory] Nhận được 10 bản ghi
[01:15:50]    ✅ [ID: 186884] Đã đồng bộ 10 Lịch sử chăm sóc
[01:15:50] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:15:50]    🔸 Payload: CustomerID=186884
[01:15:50]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:15:50]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:15:50] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:15:50]    🔸 Payload: CustomerID=186884
[01:15:50]   ✅ [Loadata] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:15:50]    🔸 Payload: CustomerID=186884
[01:15:50]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:15:50]    🔸 Payload: CustomerID=186884
[01:15:50]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:15:50]    🔸 Payload: CustomerID=186884, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:15:50]   ✅ [LoadataStatus] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:15:50]    🔸 Payload: CustomerID=186884, id=0, limit=100, beginID=0
[01:15:50]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:15:50]    🔸 Payload: CustomerID=186884, id=0, limit=100, beginID=0
[01:15:50]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:15:50] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:15:50]    🔸 Payload: CustomerID=186884
[01:15:50]   ✅ [LoadAllFolder] Nhận được 4 bản ghi
[01:15:50] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:50]    🔸 Payload: CustomerID=186884, currentFolderID=216446, idetail=0, type=0
[01:15:50]   ✅ [LoadImageByFolder] Nhận được 2 bản ghi
[01:15:50] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:50]    🔸 Payload: CustomerID=186884, currentFolderID=216522, idetail=0, type=0
[01:15:50]   ✅ [LoadImageByFolder] Nhận được 1 bản ghi
[01:15:50] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:50]    🔸 Payload: CustomerID=186884, currentFolderID=216523, idetail=0, type=0
[01:15:50]   ✅ [LoadImageByFolder] Nhận được 3 bản ghi
[01:15:50] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:50]    🔸 Payload: CustomerID=186884, currentFolderID=216524, idetail=0, type=0
[01:15:50]   ✅ [LoadImageByFolder] Nhận được 3 bản ghi
[01:15:51]    ✅ [ID: 186884] Đã đồng bộ 4 Thư mục ảnh
[01:15:51] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:15:51]    🔸 Payload: CustomerID=186884, IsCancel=1
[01:15:51]   ✅ [Loadata] Nhận được 0 bản ghi
[01:15:51] ✅ [ID: 186884] Kết thúc Full Sync.
[01:15:51] 🔍 [ID: 37363] 🚀 Bắt đầu Full Sync chi tiết...
[01:15:51] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:15:51]    🔸 Payload: CustomerID=37363
[01:15:51]   ✅ [LoadData] Nhận được 0 bản ghi
[01:15:51] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:15:51]    🔸 Payload: CustomerID=37363
[01:15:51]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:15:51]    ✅ [ID: 37363] Đã cập nhật Doanh thu & Công nợ
[01:15:51] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:15:51]    🔸 Payload: CustomerID=37363
[01:15:51]   ✅ [LoadataTab] Nhận được 5 bản ghi
[01:15:51]    ✅ [ID: 37363] Đã đồng bộ 5 Dịch vụ đang sử dụng
[01:15:51] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:15:51]    🔸 Payload: CustomerID=37363
[01:15:51]   ✅ [LoadataPayment] Nhận được 27 bản ghi
[01:15:52] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:15:52]    🔸 Payload: CustomerID=37363, id=0, limit=100, beginID=0
[01:15:52]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:15:52]    ✅ [ID: 37363] Đã đồng bộ 27 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:15:52] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:15:52]    🔸 Payload: CustomerID=37363, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:15:52]   ✅ [LoadataTreatment] Nhận được 100 bản ghi
[01:15:54]    ✅ [ID: 37363] Đã đồng bộ 100 Lần điều trị
[01:15:54] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:15:54]    🔸 Payload: CustomerID=37363, Type=0, Limit=100, BeginID=0
[01:15:54]   ✅ [LoadataHistory] Nhận được 198 bản ghi
[01:15:57]    ✅ [ID: 37363] Đã đồng bộ 198 Lịch sử chăm sóc
[01:15:57] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:15:57]    🔸 Payload: CustomerID=37363
[01:15:57]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:15:57]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:15:57] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:15:57]    🔸 Payload: CustomerID=37363
[01:15:57]   ✅ [Loadata] Nhận được 1 bản ghi
[01:15:57]    ✅ [ID: 37363] Đã đồng bộ 1 Khiếu nại
[01:15:57] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:15:57]    🔸 Payload: CustomerID=37363
[01:15:57]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:15:57] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:15:57]    🔸 Payload: CustomerID=37363
[01:15:57]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:15:57] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:15:57]    🔸 Payload: CustomerID=37363, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:15:57]   ✅ [LoadataStatus] Nhận được 21 bản ghi
[01:15:57] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:15:57]    🔸 Payload: CustomerID=37363, id=0, limit=100, beginID=0
[01:15:57]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:15:57] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:15:57]    🔸 Payload: CustomerID=37363, id=0, limit=100, beginID=0
[01:15:57]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:15:57] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:15:57]    🔸 Payload: CustomerID=37363
[01:15:58]   ✅ [LoadAllFolder] Nhận được 19 bản ghi
[01:15:58] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:15:58]    🔸 Payload: CustomerID=37363, currentFolderID=8553, idetail=0, type=0
[01:15:58]   ✅ [LoadImageByFolder] Nhận được 159 bản ghi
[01:15:58]    ❌ [ID: 37363] Lỗi syncCustomerImages: 
Invalid `this.prisma.customerImage.create()` invocation in
/chikiet/toolhotro/apivttech/backend-api/src/sync.service.ts:828:45

  825 if (!img.CloudID) continue;
  826 const existing = await this.prisma.customerImage.findFirst({ where: { folder_id: folder.id, cloud_id: img.CloudID } });
  827 if (!existing) {
→ 828   await this.prisma.customerImage.create({
          data: {
            folder_id: 268,
            real_name: "img_7212(20251229110844).jpeg",
            feature_image: "img_7212(20251229110844)(fea).jpeg",
            cloud_id: "1_Vu38cLTS54RPHJYRQXxU30n-7BaUY-d",
            created_at: new Date("Invalid Date")
                        ~~~~~~~~~~~~~~~~~~~~~~~~
          }
        })

Invalid value for argument `created_at`: Provided Date object is invalid. Expected Date.
[01:15:58] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:15:58]    🔸 Payload: CustomerID=37363, IsCancel=1
[01:15:58]   ✅ [Loadata] Nhận được 0 bản ghi
[01:15:58] ✅ [ID: 37363] Kết thúc Full Sync.
[01:15:58] 🔍 [ID: 159188] 🚀 Bắt đầu Full Sync chi tiết...
[01:15:58] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:15:58]    🔸 Payload: CustomerID=159188
[01:15:58]   ✅ [LoadData] Nhận được 0 bản ghi
[01:15:58] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:15:58]    🔸 Payload: CustomerID=159188
[01:15:58]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:15:58]    ✅ [ID: 159188] Đã cập nhật Doanh thu & Công nợ
[01:15:58] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:15:58]    🔸 Payload: CustomerID=159188
[01:15:58]   ✅ [LoadataTab] Nhận được 5 bản ghi
[01:15:58]    ✅ [ID: 159188] Đã đồng bộ 5 Dịch vụ đang sử dụng
[01:15:58] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:15:58]    🔸 Payload: CustomerID=159188
[01:15:58]   ✅ [LoadataPayment] Nhận được 3 bản ghi
[01:15:58] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:15:58]    🔸 Payload: CustomerID=159188, id=0, limit=100, beginID=0
[01:15:58]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:15:58]    ✅ [ID: 159188] Đã đồng bộ 3 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:15:58] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:15:58]    🔸 Payload: CustomerID=159188, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:15:58]   ✅ [LoadataTreatment] Nhận được 46 bản ghi
[01:15:59]    ✅ [ID: 159188] Đã đồng bộ 46 Lần điều trị
[01:15:59] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:15:59]    🔸 Payload: CustomerID=159188, Type=0, Limit=100, BeginID=0
[01:15:59]   ✅ [LoadataHistory] Nhận được 128 bản ghi
[01:16:01]    ✅ [ID: 159188] Đã đồng bộ 128 Lịch sử chăm sóc
[01:16:01] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:16:01]    🔸 Payload: CustomerID=159188
[01:16:01]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:16:01]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:01] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:16:01]    🔸 Payload: CustomerID=159188
[01:16:01]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:01] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:16:01]    🔸 Payload: CustomerID=159188
[01:16:01]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:16:01] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:16:01]    🔸 Payload: CustomerID=159188
[01:16:01]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:16:01] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:16:01]    🔸 Payload: CustomerID=159188, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:16:01]   ✅ [LoadataStatus] Nhận được 6 bản ghi
[01:16:01] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:16:01]    🔸 Payload: CustomerID=159188, id=0, limit=100, beginID=0
[01:16:01]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:16:01] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:16:01]    🔸 Payload: CustomerID=159188, id=0, limit=100, beginID=0
[01:16:02]   ✅ [LoadataPrescriptionMedicine] Nhận được 1 bản ghi
[01:16:02]    ✅ [ID: 159188] Đã đồng bộ 1 Đơn thuốc/Sản phẩm
[01:16:02] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:16:02]    🔸 Payload: CustomerID=159188
[01:16:02]   ✅ [LoadAllFolder] Nhận được 14 bản ghi
[01:16:02] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:02]    🔸 Payload: CustomerID=159188, currentFolderID=174842, idetail=0, type=0
[01:16:02]   ✅ [LoadImageByFolder] Nhận được 4 bản ghi
[01:16:02] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:02]    🔸 Payload: CustomerID=159188, currentFolderID=174857, idetail=0, type=0
[01:16:02]   ✅ [LoadImageByFolder] Nhận được 7 bản ghi
[01:16:02] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:02]    🔸 Payload: CustomerID=159188, currentFolderID=174945, idetail=0, type=0
[01:16:02]   ✅ [LoadImageByFolder] Nhận được 31 bản ghi
[01:16:02]    ❌ [ID: 159188] Lỗi syncCustomerImages: 
Invalid `this.prisma.customerImage.create()` invocation in
/chikiet/toolhotro/apivttech/backend-api/src/sync.service.ts:828:45

  825 if (!img.CloudID) continue;
  826 const existing = await this.prisma.customerImage.findFirst({ where: { folder_id: folder.id, cloud_id: img.CloudID } });
  827 if (!existing) {
→ 828   await this.prisma.customerImage.create({
          data: {
            folder_id: 271,
            real_name: "img_3204(20250820011530).jpeg",
            feature_image: "img_3204(20250820011530)(fea).jpeg",
            cloud_id: "1VuW97UIX8WqfefbJc_9LUUVDjB6vfoAF",
            created_at: new Date("Invalid Date")
                        ~~~~~~~~~~~~~~~~~~~~~~~~
          }
        })

Invalid value for argument `created_at`: Provided Date object is invalid. Expected Date.
[01:16:02] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:16:02]    🔸 Payload: CustomerID=159188, IsCancel=1
[01:16:02]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:02] ✅ [ID: 159188] Kết thúc Full Sync.
[01:16:03] 🔍 [ID: 186995] 🚀 Bắt đầu Full Sync chi tiết...
[01:16:03] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadData] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:16:03]    ✅ [ID: 186995] Đã cập nhật Doanh thu & Công nợ
[01:16:03] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadataTab] Nhận được 2 bản ghi
[01:16:03]    ✅ [ID: 186995] Đã đồng bộ 2 Dịch vụ đang sử dụng
[01:16:03] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadataPayment] Nhận được 1 bản ghi
[01:16:03] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:16:03]    🔸 Payload: CustomerID=186995, id=0, limit=100, beginID=0
[01:16:03]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:16:03]    ✅ [ID: 186995] Đã đồng bộ 1 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:16:03] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:16:03]    🔸 Payload: CustomerID=186995, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:16:03]   ✅ [LoadataTreatment] Nhận được 2 bản ghi
[01:16:03]    ✅ [ID: 186995] Đã đồng bộ 2 Lần điều trị
[01:16:03] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:16:03]    🔸 Payload: CustomerID=186995, Type=0, Limit=100, BeginID=0
[01:16:03]   ✅ [LoadataHistory] Nhận được 2 bản ghi
[01:16:03]    ✅ [ID: 186995] Đã đồng bộ 2 Lịch sử chăm sóc
[01:16:03] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:16:03]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:03] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:16:03]    🔸 Payload: CustomerID=186995, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:16:03]   ✅ [LoadataStatus] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:16:03]    🔸 Payload: CustomerID=186995, id=0, limit=100, beginID=0
[01:16:03]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:16:03]    🔸 Payload: CustomerID=186995, id=0, limit=100, beginID=0
[01:16:03]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:16:03]    🔸 Payload: CustomerID=186995
[01:16:03]   ✅ [LoadAllFolder] Nhận được 0 bản ghi
[01:16:03] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:16:03]    🔸 Payload: CustomerID=186995, IsCancel=1
[01:16:04]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:04] ✅ [ID: 186995] Kết thúc Full Sync.
[01:16:04] 🔍 [ID: 186234] 🚀 Bắt đầu Full Sync chi tiết...
[01:16:04] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadData] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:16:04]    ✅ [ID: 186234] Đã cập nhật Doanh thu & Công nợ
[01:16:04] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadataTab] Nhận được 2 bản ghi
[01:16:04]    ✅ [ID: 186234] Đã đồng bộ 2 Dịch vụ đang sử dụng
[01:16:04] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadataPayment] Nhận được 1 bản ghi
[01:16:04] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:16:04]    🔸 Payload: CustomerID=186234, id=0, limit=100, beginID=0
[01:16:04]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:16:04]    ✅ [ID: 186234] Đã đồng bộ 1 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:16:04] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:16:04]    🔸 Payload: CustomerID=186234, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:16:04]   ✅ [LoadataTreatment] Nhận được 1 bản ghi
[01:16:04]    ✅ [ID: 186234] Đã đồng bộ 1 Lần điều trị
[01:16:04] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:16:04]    🔸 Payload: CustomerID=186234, Type=0, Limit=100, BeginID=0
[01:16:04]   ✅ [LoadataHistory] Nhận được 4 bản ghi
[01:16:04]    ✅ [ID: 186234] Đã đồng bộ 4 Lịch sử chăm sóc
[01:16:04] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:16:04]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:04] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:16:04]    🔸 Payload: CustomerID=186234
[01:16:04]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:16:04]    🔸 Payload: CustomerID=186234, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:16:04]   ✅ [LoadataStatus] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:16:04]    🔸 Payload: CustomerID=186234, id=0, limit=100, beginID=0
[01:16:04]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:16:04] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:16:04]    🔸 Payload: CustomerID=186234, id=0, limit=100, beginID=0
[01:16:05]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:16:05] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:16:05]    🔸 Payload: CustomerID=186234
[01:16:05]   ✅ [LoadAllFolder] Nhận được 2 bản ghi
[01:16:05] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:05]    🔸 Payload: CustomerID=186234, currentFolderID=216644, idetail=0, type=0
[01:16:05]   ✅ [LoadImageByFolder] Nhận được 0 bản ghi
[01:16:05]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:05] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:05]    🔸 Payload: CustomerID=186234, currentFolderID=216645, idetail=0, type=0
[01:16:05]   ✅ [LoadImageByFolder] Nhận được 3 bản ghi
[01:16:05]    ✅ [ID: 186234] Đã đồng bộ 2 Thư mục ảnh
[01:16:05] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:16:05]    🔸 Payload: CustomerID=186234, IsCancel=1
[01:16:05]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:05] ✅ [ID: 186234] Kết thúc Full Sync.
[01:16:05] 🔍 [ID: 186955] 🚀 Bắt đầu Full Sync chi tiết...
[01:16:05] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [LoadData] Nhận được 0 bản ghi
[01:16:05] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:16:05]    ✅ [ID: 186955] Đã cập nhật Doanh thu & Công nợ
[01:16:05] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [LoadataTab] Nhận được 0 bản ghi
[01:16:05]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:05] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [LoadataPayment] Nhận được 0 bản ghi
[01:16:05]    🔸 Cấu trúc JSON: { Table, Table1, Table2 ... }
[01:16:05] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:16:05]    🔸 Payload: CustomerID=186955, id=0, limit=100, beginID=0
[01:16:05]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:16:05] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:16:05]    🔸 Payload: CustomerID=186955, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:16:05]   ✅ [LoadataTreatment] Nhận được 0 bản ghi
[01:16:05]    🔸 Cấu trúc JSON: { DataTotal, Table, Table1 ... }
[01:16:05] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:16:05]    🔸 Payload: CustomerID=186955, Type=0, Limit=100, BeginID=0
[01:16:05]   ✅ [LoadataHistory] Nhận được 2 bản ghi
[01:16:05]    ✅ [ID: 186955] Đã đồng bộ 2 Lịch sử chăm sóc
[01:16:05] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:16:05]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:05] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:05]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:05] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:16:05]    🔸 Payload: CustomerID=186955
[01:16:06]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:16:06]    🔸 Payload: CustomerID=186955
[01:16:06]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:16:06]    🔸 Payload: CustomerID=186955, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:16:06]   ✅ [LoadataStatus] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:16:06]    🔸 Payload: CustomerID=186955, id=0, limit=100, beginID=0
[01:16:06]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:16:06]    🔸 Payload: CustomerID=186955, id=0, limit=100, beginID=0
[01:16:06]   ✅ [LoadataPrescriptionMedicine] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:16:06]    🔸 Payload: CustomerID=186955
[01:16:06]   ✅ [LoadAllFolder] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:16:06]    🔸 Payload: CustomerID=186955, IsCancel=1
[01:16:06]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:06] ✅ [ID: 186955] Kết thúc Full Sync.
[01:16:06] 🔍 [ID: 160481] 🚀 Bắt đầu Full Sync chi tiết...
[01:16:06] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:16:06]    🔸 Payload: CustomerID=160481
[01:16:06]   ✅ [LoadData] Nhận được 0 bản ghi
[01:16:06] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:16:06]    🔸 Payload: CustomerID=160481
[01:16:06]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:16:06]    ✅ [ID: 160481] Đã cập nhật Doanh thu & Công nợ
[01:16:06] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:16:06]    🔸 Payload: CustomerID=160481
[01:16:06]   ✅ [LoadataTab] Nhận được 5 bản ghi
[01:16:06]    ✅ [ID: 160481] Đã đồng bộ 5 Dịch vụ đang sử dụng
[01:16:06] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:16:06]    🔸 Payload: CustomerID=160481
[01:16:06]   ✅ [LoadataPayment] Nhận được 15 bản ghi
[01:16:06] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:16:06]    🔸 Payload: CustomerID=160481, id=0, limit=100, beginID=0
[01:16:06]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:16:06]    ✅ [ID: 160481] Đã đồng bộ 15 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:16:06] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:16:06]    🔸 Payload: CustomerID=160481, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:16:07]   ✅ [LoadataTreatment] Nhận được 19 bản ghi
[01:16:07]    ✅ [ID: 160481] Đã đồng bộ 19 Lần điều trị
[01:16:07] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:16:07]    🔸 Payload: CustomerID=160481, Type=0, Limit=100, BeginID=0
[01:16:07]   ✅ [LoadataHistory] Nhận được 77 bản ghi
[01:16:08]    ✅ [ID: 160481] Đã đồng bộ 77 Lịch sử chăm sóc
[01:16:08] 📡 Calling Handler: LoadDetail on /Customer/Installment/InstallmentList/
[01:16:08]    🔸 Payload: CustomerID=160481
[01:16:08]   ✅ [LoadDetail] Nhận được 0 bản ghi
[01:16:08]    🔸 Cấu trúc JSON: { Table, Table1 ... }
[01:16:08] 📡 Calling Handler: Loadata on /Customer/ComplaintList/
[01:16:08]    🔸 Payload: CustomerID=160481
[01:16:08]   ✅ [Loadata] Nhận được 1 bản ghi
[01:16:08]    ✅ [ID: 160481] Đã đồng bộ 1 Khiếu nại
[01:16:08] 📡 Calling Handler: LoadataTab_Plan on /Customer/Service/TabList/TabList_Service/
[01:16:08]    🔸 Payload: CustomerID=160481
[01:16:08]   ✅ [LoadataTab_Plan] Nhận được 0 bản ghi
[01:16:08] 📡 Calling Handler: LoadataTab_History_Change on /Customer/MainCustomer/
[01:16:08]    🔸 Payload: CustomerID=160481
[01:16:08]   ✅ [LoadataTab_History_Change] Nhận được 0 bản ghi
[01:16:08] 📡 Calling Handler: LoadataStatus on /Customer/StatusList/
[01:16:08]    🔸 Payload: CustomerID=160481, id=0, limit=100, beginID=0, Type=0, TypeParent=0
[01:16:09]   ✅ [LoadataStatus] Nhận được 5 bản ghi
[01:16:09] 📡 Calling Handler: LoadataCard on /Customer/Service/TabList/TabList_Card/
[01:16:09]    🔸 Payload: CustomerID=160481, id=0, limit=100, beginID=0
[01:16:09]   ✅ [LoadataCard] Nhận được 0 bản ghi
[01:16:09] 📡 Calling Handler: LoadataPrescriptionMedicine on /Customer/Service/TabList/TabList_Medicine/
[01:16:09]    🔸 Payload: CustomerID=160481, id=0, limit=100, beginID=0
[01:16:09]   ✅ [LoadataPrescriptionMedicine] Nhận được 1 bản ghi
[01:16:09]    ✅ [ID: 160481] Đã đồng bộ 1 Đơn thuốc/Sản phẩm
[01:16:09] 📡 Calling Handler: LoadAllFolder on /Customer/CustomerImage/
[01:16:09]    🔸 Payload: CustomerID=160481
[01:16:09]   ✅ [LoadAllFolder] Nhận được 9 bản ghi
[01:16:09] 📡 Calling Handler: LoadImageByFolder on /Customer/CustomerImage/
[01:16:09]    🔸 Payload: CustomerID=160481, currentFolderID=177241, idetail=0, type=0
[01:16:09]   ✅ [LoadImageByFolder] Nhận được 5 bản ghi
[01:16:09]    ❌ [ID: 160481] Lỗi syncCustomerImages: 
Invalid `this.prisma.customerImage.create()` invocation in
/chikiet/toolhotro/apivttech/backend-api/src/sync.service.ts:828:45

  825 if (!img.CloudID) continue;
  826 const existing = await this.prisma.customerImage.findFirst({ where: { folder_id: folder.id, cloud_id: img.CloudID } });
  827 if (!existing) {
→ 828   await this.prisma.customerImage.create({
          data: {
            folder_id: 274,
            real_name: "img_6755(20251215155558).jpeg",
            feature_image: "img_6755(20251215155558)(fea).jpeg",
            cloud_id: "1f7OmsSiuaDJ4qOxSspfeWDLGlIvqB5kx",
            created_at: new Date("Invalid Date")
                        ~~~~~~~~~~~~~~~~~~~~~~~~
          }
        })

Invalid value for argument `created_at`: Provided Date object is invalid. Expected Date.
[01:16:09] 📡 Calling Handler: Loadata on /Customer/ScheduleList_Schedule/
[01:16:09]    🔸 Payload: CustomerID=160481, IsCancel=1
[01:16:09]   ✅ [Loadata] Nhận được 0 bản ghi
[01:16:09] ✅ [ID: 160481] Kết thúc Full Sync.
[01:16:09] 🔍 [ID: 169969] 🚀 Bắt đầu Full Sync chi tiết...
[01:16:09] 📡 Calling Handler: LoadData on /Customer/GeneralInfo/
[01:16:09]    🔸 Payload: CustomerID=169969
[01:16:09]   ✅ [LoadData] Nhận được 0 bản ghi
[01:16:09] 📡 Calling Handler: LoadPaymentInfo on /Customer/MainCustomer/
[01:16:09]    🔸 Payload: CustomerID=169969
[01:16:09]   ✅ [LoadPaymentInfo] Nhận được 1 bản ghi
[01:16:09]    ✅ [ID: 169969] Đã cập nhật Doanh thu & Công nợ
[01:16:09] 📡 Calling Handler: LoadataTab on /Customer/Service/TabList/TabList_Service/
[01:16:09]    🔸 Payload: CustomerID=169969
[01:16:10]   ✅ [LoadataTab] Nhận được 5 bản ghi
[01:16:10]    ✅ [ID: 169969] Đã đồng bộ 5 Dịch vụ đang sử dụng
[01:16:10] 📡 Calling Handler: LoadataPayment on /Customer/Payment/PaymentList/PaymentList_Service/
[01:16:10]    🔸 Payload: CustomerID=169969
[01:16:10]   ✅ [LoadataPayment] Nhận được 4 bản ghi
[01:16:10] 📡 Calling Handler: LoadataPaymentCard on /Customer/Payment/PaymentList/PaymentList_Card/
[01:16:10]    🔸 Payload: CustomerID=169969, id=0, limit=100, beginID=0
[01:16:10]   ✅ [LoadataPaymentCard] Nhận được 0 bản ghi
[01:16:10]    ✅ [ID: 169969] Đã đồng bộ 4 Lịch sử thanh toán (Dịch vụ & Thẻ)
[01:16:10] 📡 Calling Handler: LoadataTreatment on /Customer/Treatment/TreatmentList/TreatmentList_Service/
[01:16:10]    🔸 Payload: CustomerID=169969, PatientRecordID=0, TreatmentPlanID=0, ServiceTabID=0, ServiceCatTabID=0, idbegin=0, idbeginless=0, limit=100
[01:16:10]   ✅ [LoadataTreatment] Nhận được 10 bản ghi
[01:16:10]    ✅ [ID: 169969] Đã đồng bộ 10 Lần điều trị
[01:16:10] 📡 Calling Handler: LoadataHistory on /Customer/History/HistoryList_Care/
[01:16:10]    🔸 Payload: CustomerID=169969, Type=0, Limit=100, BeginID=0
[01:16:10]   ✅ [LoadataHistory] Nhận được 26 bản ghi$ nest start --watch
[2J[3J[H[[90m01:27:53[0m] Starting compilation in watch mode...

error: script "start:dev" was terminated by signal SIGTERM (Polite quit request)
